import { FastifyPluginAsync } from 'fastify';
import { subscribeToChannel } from '../lib/redis.js';
import { generateContentStream, GeminiError } from '../lib/gemini.js';
import prisma from '../lib/prisma.js';
import { createAiRateLimiter } from '../lib/rateLimiter.js';

// Connected clients by user ID
const clients = new Map<number, Set<WebSocket>>();

// Active AI streams by user ID
const activeStreams = new Map<string, AbortController>();

// Rate limiter state
const rateLimitState = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: number): { allowed: boolean; retryAfter?: number } {
    const key = `user:${userId}`;
    const now = Date.now();
    const maxRequests = parseInt(process.env.AI_RATE_LIMIT_MAX || '10');
    const windowMs = parseInt(process.env.AI_RATE_LIMIT_WINDOW || '300000');

    const state = rateLimitState.get(key);

    if (!state || now > state.resetAt) {
        rateLimitState.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
    }

    if (state.count >= maxRequests) {
        return { allowed: false, retryAfter: Math.ceil((state.resetAt - now) / 1000) };
    }

    state.count++;
    return { allowed: true };
}

const wsHandler: FastifyPluginAsync = async (fastify) => {
    // WebSocket endpoint
    fastify.get('/ws', { websocket: true }, async (connection, request) => {
        const token = (request.query as { token?: string }).token;

        if (!token) {
            connection.close(4001, 'No token provided');
            return;
        }

        let userId: number;
        try {
            const decoded = fastify.jwt.verify(token) as { id: number };
            userId = decoded.id;
        } catch {
            connection.close(4002, 'Invalid token');
            return;
        }

        // console.log(`WebSocket connected: user ${userId}`);

        // Update DB status to online
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { isOnline: true, lastSeen: new Date() }
            });
        } catch (e) {
            console.error(`Failed to update user ${userId} status to online`, e);
        }

        // Register client - use connection.socket for the underlying WebSocket
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId)!.add(connection.socket as WebSocket);

        // Handle messages - SocketStream uses 'data' event, not 'message'
        connection.socket.on('message', async (data: Buffer) => {
            // console.log(`📨 Raw message received from user ${userId}:`, data.toString());
            try {
                const message = JSON.parse(data.toString());
                // console.log(`✅ Parsed message from ${userId}:`, JSON.stringify(message, null, 2));

                switch (message.type) {
                    case 'aiPrompt':
                        // console.log(`🤖 Processing aiPrompt for user ${userId}`);
                        try {
                            await handleAiPrompt(connection.socket as WebSocket, userId, message);
                        } catch (err) {
                            console.error('❌ Error handling aiPrompt:', err);
                            sendWsError(
                                connection.socket as WebSocket,
                                message.conversationId,
                                'Failed to process AI request',
                                'INTERNAL_ERROR'
                            );
                        }
                        break;
                    case 'aiCancel':
                        // console.log(`🛑 Processing aiCancel for user ${userId}`);
                        try {
                            await handleAiCancel(userId, message);
                        } catch (err) {
                            console.error('❌ Error handling aiCancel:', err);
                        }
                        break;
                    case 'game_invite':
                        // console.log(`🎮 Processing game_invite from user ${userId} to ${message.to_user_id}`);
                        handleGameInvite(connection.socket as WebSocket, userId, message);
                        break;
                    case 'game_invite_accept':
                        // console.log(`🎮 Processing game_invite_accept from user ${userId}`);
                        handleGameInviteAccept(connection.socket as WebSocket, userId, message);
                        break;
                    case 'game_invite_decline':
                        // console.log(`🎮 Processing game_invite_decline from user ${userId}`);
                        handleGameInviteDecline(connection.socket as WebSocket, userId, message);
                        break;
                    case 'game_paddle_update':
                        handleGamePaddleUpdate(userId, message, connection.socket as WebSocket);
                        break;
                    case 'game_state':
                        handleGameState(userId, message);
                        break;
                    case 'game_end':
                        handleGameEnd(userId, message);
                        break;
                    case 'game_pause':
                        handleGamePause(userId, message);
                        break;
                    case 'game_resume':
                        handleGameResume(userId, message);
                        break;
                    case 'game_leave':
                        handleGameLeave(userId, message);
                        break;
                    case 'ping':
                        // Silent ping/pong for keepalive
                        connection.socket.send(JSON.stringify({ type: 'pong' }));
                        break;
                    default:
                    // console.log('⚠️ Unknown message type:', message.type);
                }
            } catch (err) {
                console.error('❌ Invalid message format:', err);
            }
        });

        // Handle disconnect
        connection.socket.on('close', async () => {
            // console.log(`WebSocket disconnected: user ${userId}`);
            // Cancel any active AI streams
            const streamKey = `${userId}`;
            const controller = activeStreams.get(streamKey);
            if (controller) {
                controller.abort();
                activeStreams.delete(streamKey);
            }

            clients.get(userId)?.delete(connection.socket as WebSocket);
            if (clients.get(userId)?.size === 0) {
                clients.delete(userId);

                // Update DB status to offline since no connections remain
                try {
                    await prisma.user.update({
                        where: { id: userId },
                        data: { isOnline: false, lastSeen: new Date() }
                    });
                } catch (e) {
                    console.error(`Failed to update user ${userId} status to offline`, e);
                }
            }

            // Check if this specific socket was in an active game and forfeit it
            for (const [gameId, game] of activeGames.entries()) {
                if ((game.player1 === userId && game.p1Socket === (connection.socket as WebSocket)) ||
                    (game.player2 === userId && game.p2Socket === (connection.socket as WebSocket))) {
                    // console.log(`User ${userId} disconnected from game ${gameId} (socket mismatch or closed) - triggering forfeit`);
                    handleGameForfeit(userId, gameId, game);
                }
            }
        });
    });
};

// AI Prompt Handler
async function handleAiPrompt(connection: WebSocket, userId: number, message: any) {
    const { conversationId, prompt } = message;

    try {
        // Validate prompt
        if (!prompt || typeof prompt !== 'string') {
            sendWsError(connection, conversationId, 'Prompt is required', 'INVALID_REQUEST');
            return;
        }

        const maxInputChars = parseInt(process.env.AI_MAX_INPUT_CHARS || '4000');
        if (prompt.length > maxInputChars) {
            sendWsError(connection, conversationId, `Prompt too long (max ${maxInputChars} characters)`, 'INVALID_REQUEST');
            return;
        }

        // Check rate limit
        const rateLimitCheck = checkRateLimit(userId);
        if (!rateLimitCheck.allowed) {
            sendWsError(
                connection,
                conversationId,
                'Too many AI requests. Please wait before trying again.',
                'RATE_LIMITED',
                rateLimitCheck.retryAfter
            );
            return;
        }

        // Load or create conversation
        let conversation;
        if (conversationId) {
            conversation = await prisma.aiConversation.findUnique({
                where: { id: parseInt(conversationId) },
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 10 // Last 10 messages for faster context loading
                    }
                }
            });

            // Verify ownership
            if (!conversation || conversation.userId !== userId) {
                sendWsError(connection, conversationId, 'Conversation not found or access denied', 'FORBIDDEN');
                return;
            }
        } else {
            // Create new conversation
            conversation = await prisma.aiConversation.create({
                data: {
                    userId,
                    title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
                },
                include: { messages: true }
            });
        }

        // Prepare conversation history (reverse since we fetched DESC)
        const history = conversation.messages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Save user message asynchronously (don't wait for it)
        const userMessagePromise = prisma.aiMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: prompt
            }
        });

        // Stream AI response immediately (don't wait for user message to save)
        const streamKey = `${userId}`;
        const controller = new AbortController();
        activeStreams.set(streamKey, controller);

        let fullResponse = '';
        let chunkCount = 0;
        // console.log('🚀 Starting AI stream...');
        try {
            for await (const chunk of generateContentStream(prompt, history)) {
                if (controller.signal.aborted) {
                    // console.log(`Stream cancelled for user ${userId}`);
                    break;
                }

                if (!chunk.done && chunk.text) {
                    chunkCount++;
                    fullResponse += chunk.text;
                    // console.log(`📤 Chunk ${chunkCount}: ${chunk.text.length} chars`);

                    // Send full chunks immediately for faster streaming
                    connection.send(JSON.stringify({
                        type: 'aiDelta',
                        conversationId: conversation.id,
                        delta: chunk.text
                    }));
                }

                if (chunk.done) {
                    // console.log(`✅ Stream complete! Total chunks: ${chunkCount}, Total length: ${fullResponse.length}`);

                    // Wait for user message to be saved before saving assistant message
                    await userMessagePromise;

                    // Save assistant message
                    const assistantMessage = await prisma.aiMessage.create({
                        data: {
                            conversationId: conversation.id,
                            role: 'assistant',
                            content: fullResponse
                        }
                    });

                    // Update conversation timestamp
                    await prisma.aiConversation.update({
                        where: { id: conversation.id },
                        data: { updatedAt: new Date() }
                    });

                    // Send done
                    // console.log('📨 Sending aiDone message');
                    connection.send(JSON.stringify({
                        type: 'aiDone',
                        conversationId: conversation.id,
                        messageId: assistantMessage.id,
                        totalTokens: null // Gemini doesn't provide token count in stream
                    }));
                }
            }
        } catch (error: any) {
            console.error('AI streaming error:', error);

            if (error instanceof GeminiError) {
                sendWsError(connection, conversation.id, error.userMessage, error.code);
            } else {
                sendWsError(connection, conversation.id, 'An unexpected error occurred', 'INTERNAL_ERROR');
            }
        } finally {
            activeStreams.delete(streamKey);
        }
    } catch (error: any) {
        console.error('Failed to handle AI prompt:', error);
        sendWsError(connection, conversationId, 'Failed to process request', 'INTERNAL_ERROR');
    }
}

// AI Cancel Handler
async function handleAiCancel(userId: number, message: any) {
    const streamKey = `${userId}`;
    const controller = activeStreams.get(streamKey);

    if (controller) {
        controller.abort();
        activeStreams.delete(streamKey);
        // console.log(`AI stream cancelled for user ${userId}`);
    }
}

// Send error to WebSocket client
function sendWsError(
    connection: WebSocket,
    conversationId: any,
    error: string,
    code: string,
    retryAfter?: number
) {
    connection.send(JSON.stringify({
        type: 'aiError',
        conversationId,
        error,
        code,
        retryAfter
    }));
}

// Store pending game invites
const pendingInvites = new Map<string, { fromUserId: number; toUserId: number; fromUsername: string; createdAt: Date }>();

// Game Invite Handler - send invite to target user
async function handleGameInvite(connection: WebSocket, fromUserId: number, message: any) {
    const { to_user_id } = message;

    if (!to_user_id) {
        connection.send(JSON.stringify({
            type: 'game_invite_error',
            error: 'No target user specified'
        }));
        return;
    }

    // Get sender's username
    const sender = await prisma.user.findUnique({
        where: { id: fromUserId },
        select: { username: true, displayName: true }
    });

    const fromUsername = sender?.displayName || sender?.username || 'Unknown';

    // Generate unique invite ID
    const inviteId = `invite_${fromUserId}_${to_user_id}_${Date.now()}`;

    // Store invite
    pendingInvites.set(inviteId, {
        fromUserId,
        toUserId: to_user_id,
        fromUsername,
        createdAt: new Date()
    });

    // Expire invite after 60 seconds
    setTimeout(() => {
        if (pendingInvites.has(inviteId)) {
            pendingInvites.delete(inviteId);
            // Notify sender that invite expired
            const senderConnections = clients.get(fromUserId);
            if (senderConnections) {
                for (const client of senderConnections) {
                    client.send(JSON.stringify({ type: 'game_invite_expired', invite_id: inviteId }));
                }
            }
        }
    }, 60000);

    // Send to target user if they're connected
    const targetConnections = clients.get(to_user_id);
    if (targetConnections && targetConnections.size > 0) {
        for (const client of targetConnections) {
            client.send(JSON.stringify({
                type: 'game_invite',
                invite: {
                    id: inviteId,
                    from_user_id: fromUserId,
                    from_username: fromUsername,
                    to_user_id,
                    created_at: new Date().toISOString()
                }
            }));
        }
        // Confirm to sender
        connection.send(JSON.stringify({ type: 'game_invite_sent', invite_id: inviteId }));
        // console.log(`🎮 Game invite sent from ${fromUserId} to ${to_user_id}`);
    } else {
        connection.send(JSON.stringify({
            type: 'game_invite_error',
            error: 'User is not online'
        }));
    }
}

// Game Invite Accept Handler
async function handleGameInviteAccept(connection: WebSocket, userId: number, message: any) {
    const { invite_id } = message;

    const invite = pendingInvites.get(invite_id);
    if (!invite) {
        connection.send(JSON.stringify({ type: 'game_invite_error', error: 'Invite not found or expired' }));
        return;
    }

    // Verify this user is the target
    if (invite.toUserId !== userId) {
        connection.send(JSON.stringify({ type: 'game_invite_error', error: 'Invalid invite' }));
        return;
    }

    // Fetch user details for names
    const [inviter, accepter] = await Promise.all([
        prisma.user.findUnique({ where: { id: invite.fromUserId }, select: { username: true, displayName: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { username: true, displayName: true } })
    ]);

    const player1Name = inviter?.displayName || inviter?.username || 'Player 1';
    const player2Name = accepter?.displayName || accepter?.username || 'Player 2';

    // Remove the invite
    pendingInvites.delete(invite_id);

    // Generate game ID
    const gameId = `game_${invite.fromUserId}_${userId}_${Date.now()}`;

    // Create game record in DB
    const dbGame = await prisma.game.create({
        data: {
            player1Id: invite.fromUserId,
            player2Id: userId,
            gameMode: 'online'
        }
    });

    // Notify both users
    const gameStartMessage = {
        type: 'game_invite_accepted',
        game_id: gameId,
        db_game_id: dbGame.id,
        opponent_id: 0, // Will be set per-user below
        is_host: false,
        player1_name: player1Name,
        player2_name: player2Name
    };

    // Notify original inviter (they are host)
    const inviterConnections = clients.get(invite.fromUserId);
    if (inviterConnections) {
        for (const client of inviterConnections) {
            client.send(JSON.stringify({
                ...gameStartMessage,
                opponent_id: userId,
                is_host: true
            }));
        }
    }

    // Notify accepter (they are guest)
    connection.send(JSON.stringify({
        ...gameStartMessage,
        opponent_id: invite.fromUserId,
        is_host: false
    }));

    // Register as active game with DB ID
    registerActiveGame(gameId, invite.fromUserId, userId, dbGame.id);

    // console.log(`🎮 Game started: ${invite.fromUserId} vs ${userId} (DB ID: ${dbGame.id})`);
}

// Game Invite Decline Handler
function handleGameInviteDecline(connection: WebSocket, userId: number, message: any) {
    const { invite_id } = message;

    const invite = pendingInvites.get(invite_id);
    if (!invite) {
        return; // Silently ignore if invite not found
    }

    // Verify this user is the target
    if (invite.toUserId !== userId) {
        return;
    }

    // Remove the invite
    pendingInvites.delete(invite_id);

    // Notify the original inviter
    const inviterConnections = clients.get(invite.fromUserId);
    if (inviterConnections) {
        for (const client of inviterConnections) {
            client.send(JSON.stringify({ type: 'game_invite_declined', invite_id }));
        }
    }

    // console.log(`🎮 Game invite ${invite_id} declined by user ${userId}`);
}

// Active games: gameId -> { player1: userId, player2: userId, dbGameId: number, p1Socket?: WebSocket, p2Socket?: WebSocket }
const activeGames = new Map<string, { player1: number; player2: number; dbGameId: number; p1Socket?: WebSocket; p2Socket?: WebSocket }>();

// Helper to get opponent in a game
function getOpponentId(gameId: string, userId: number): number | null {
    const game = activeGames.get(gameId);
    if (!game) return null;
    if (game.player1 === userId) return game.player2;
    if (game.player2 === userId) return game.player1;
    return null;
}

// Helper to send to opponent
function sendToOpponent(gameId: string, userId: number, message: object): void {
    const opponentId = getOpponentId(gameId, userId);
    if (!opponentId) return;

    const opponentConnections = clients.get(opponentId);
    if (opponentConnections) {
        for (const client of opponentConnections) {
            client.send(JSON.stringify(message));
        }
    }
}

// Register a new active game
function registerActiveGame(gameId: string, player1: number, player2: number, dbGameId?: number): void {
    activeGames.set(gameId, { player1, player2, dbGameId: dbGameId || 0 });
    // console.log(`🎮 Active game registered: ${gameId} (${player1} vs ${player2}, DB ID: ${dbGameId || 'unknown'})`);
}

// Game Paddle Update Handler - forward paddle position to opponent
function handleGamePaddleUpdate(userId: number, message: any, socket: WebSocket): void {
    const { game_id, paddle_y } = message;
    if (!game_id) return;

    // If game not registered yet, try to register it from the game_id
    if (!activeGames.has(game_id)) {
        // Parse game ID: game_{player1}_{player2}_{timestamp}
        const parts = game_id.split('_');
        if (parts.length >= 3) {
            const player1 = parseInt(parts[1]);
            const player2 = parseInt(parts[2]);
            if (!isNaN(player1) && !isNaN(player2)) {
                registerActiveGame(game_id, player1, player2);
            }
        }
    }

    const game = activeGames.get(game_id);
    if (game) {
        // Bind socket if missing
        if (game.player1 === userId && game.p1Socket !== socket) {
            game.p1Socket = socket;
        } else if (game.player2 === userId && game.p2Socket !== socket) {
            game.p2Socket = socket;
        }
    }

    sendToOpponent(game_id, userId, {
        type: 'game_paddle_update',
        game_id,
        paddle_y
    });
}

// Game State Handler - forward full game state to opponent (host -> guest)
function handleGameState(userId: number, message: any): void {
    const { game_id, state } = message;
    if (!game_id || !state) return;

    // If game not registered yet, try to register it from the game_id
    if (!activeGames.has(game_id)) {
        const parts = game_id.split('_');
        if (parts.length >= 3) {
            const player1 = parseInt(parts[1]);
            const player2 = parseInt(parts[2]);
            if (!isNaN(player1) && !isNaN(player2)) {
                registerActiveGame(game_id, player1, player2);
            }
        }
    }

    sendToOpponent(game_id, userId, {
        type: 'game_state',
        game_id,
        state
    });
}

// Game End Handler - forward game end notification and update DB
async function handleGameEnd(userId: number, message: any): Promise<void> {
    const { game_id, winner_id, winner_side, left_score, right_score } = message;
    if (!game_id) return;

    const game = activeGames.get(game_id);
    if (!game) return;

    // Determine winner ID if only side is provided
    let finalWinnerId = winner_id;
    if (!finalWinnerId && winner_side) {
        if (winner_side === 'left') finalWinnerId = game.player1;
        else if (winner_side === 'right') finalWinnerId = game.player2;
    }

    // Notify opponent
    sendToOpponent(game_id, userId, {
        type: 'game_ended',
        game_id,
        winner_id: finalWinnerId,
        left_score,
        right_score
    });

    // Update database with scores and winner
    if (game.dbGameId) {
        try {
            await prisma.game.update({
                where: { id: game.dbGameId },
                data: {
                    player1Score: left_score,
                    player2Score: right_score,
                    winnerId: winner_id
                }
            });
            // console.log(`🎮 Game ${game_id} (DB: ${game.dbGameId}) updated: ${left_score}-${right_score}, Winner: ${winner_id}`);
        } catch (err) {
            console.error(`❌ Failed to update game ${game.dbGameId} in DB:`, err);
        }
    }

    activeGames.delete(game_id);
    // console.log(`🎮 Game ${game_id} ended.`);
}

// Game Pause Handler
function handleGamePause(userId: number, message: any): void {
    const { game_id } = message;
    if (!game_id) return;
    sendToOpponent(game_id, userId, { type: 'game_paused', game_id });
}

// Game Resume Handler
function handleGameResume(userId: number, message: any): void {
    const { game_id } = message;
    if (!game_id) return;
    sendToOpponent(game_id, userId, { type: 'game_resumed', game_id });
}

// Handle explicit game leave
async function handleGameLeave(userId: number, message: any): Promise<void> {
    const { game_id } = message;
    if (!game_id) return;

    // console.log(`Received game_leave from ${userId} for game ${game_id}`);

    const game = activeGames.get(game_id);
    if (!game) {
        console.warn(`handleGameLeave: Game ${game_id} not found.`);
        return;
    }

    await handleGameForfeit(userId, game_id, game);
}

// Centralized forfeit logic (used for explicit leave and disconnection)
async function handleGameForfeit(leaverId: number, gameId: string, game: { player1: number; player2: number; dbGameId: number }): Promise<void> {
    const winnerId = game.player1 === leaverId ? game.player2 : game.player1;

    // Determine scores (Leaver gets 0, Winner gets 11)
    const player1Score = game.player1 === leaverId ? 0 : 11;
    const player2Score = game.player2 === leaverId ? 0 : 11;

    // Notify opponent
    sendToOpponent(gameId, leaverId, {
        type: 'game_opponent_left',
        game_id: gameId,
        winner_id: winnerId
    });

    // Update DB
    if (game.dbGameId) {
        try {
            await prisma.game.update({
                where: { id: game.dbGameId },
                data: {
                    player1Score: player1Score,
                    player2Score: player2Score,
                    winnerId: winnerId
                }
            });
            // console.log(`🎮 Game ${gameId} forfeited by ${leaverId}. Winner: ${winnerId}`);
        } catch (err) {
            console.error(`❌ Failed to update game ${game.dbGameId} forfeit:`, err);
        }
    }

    // Close game
    activeGames.delete(gameId);
}

// Subscribe to Redis for chat messages
subscribeToChannel('chat:message', (message) => {
    try {
        const data = JSON.parse(message);
        const targetClients = clients.get(data.to);

        if (targetClients) {
            for (const client of targetClients) {
                client.send(JSON.stringify({
                    type: 'new_message',
                    from: data.from,
                    content: data.content,
                    messageId: data.messageId
                }));
            }
        }
    } catch (err) {
        console.error('Failed to process chat message:', err);
    }
}).catch(console.error);

export default wsHandler;
