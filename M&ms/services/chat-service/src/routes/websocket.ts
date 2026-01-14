import { FastifyPluginAsync } from 'fastify';
import { subscribeToChannel, publishEvent } from '../lib/redis.js';
import prisma from '../lib/prisma.js';

// Connected clients by user ID
const clients = new Map<number, Set<WebSocket>>();

// Active game invites (inviteId -> invite data)
const activeInvites = new Map<string, {
    id: string;
    fromUserId: number;
    fromUsername: string;
    toUserId: number;
    createdAt: Date;
}>();

// Active games (gameId -> game data)
const activeGames = new Map<string, {
    id: string;
    hostId: number;
    guestId: number;
    dbGameId?: number;
}>();

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function sendToUser(userId: number, message: object): void {
    const userClients = clients.get(userId);
    if (userClients) {
        const messageStr = JSON.stringify(message);
        for (const client of userClients) {
            client.send(messageStr);
        }
    }
}

const wsHandler: FastifyPluginAsync = async (fastify) => {
    // WebSocket endpoint
    fastify.get('/ws', { websocket: true }, async (connection, request) => {
        const token = (request.query as { token?: string }).token;

        if (!token) {
            connection.socket.close(4001, 'No token provided');
            return;
        }

        let userId: number;
        let username: string;
        try {
            const decoded = fastify.jwt.verify(token) as { id: number; username: string };
            userId = decoded.id;
            username = decoded.username || `User${decoded.id}`;
        } catch {
            connection.socket.close(4002, 'Invalid token');
            return;
        }

        console.log(`WebSocket connected: user ${userId}`);

        // Get the actual socket for sending messages
        const socket = connection.socket;

        // Register client
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId)!.add(socket as unknown as WebSocket);

        // Handle messages
        socket.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`Received from ${userId}:`, message);

                switch (message.type) {
                    case 'ping':
                        // Respond to ping with pong to keep connection alive
                        socket.send(JSON.stringify({ type: 'pong' }));
                        break;
                    case 'game_invite':
                        await handleGameInvite(userId, username, message.to_user_id);
                        break;
                    case 'game_invite_accept':
                        await handleInviteAccept(userId, message.invite_id);
                        break;
                    case 'game_invite_decline':
                        handleInviteDecline(userId, message.invite_id);
                        break;
                    case 'game_paddle_update':
                        relayPaddleUpdate(userId, message.game_id, message.paddle_y);
                        break;
                    case 'game_state':
                        relayGameState(userId, message.game_id, message.state);
                        break;
                    case 'game_end':
                        await handleGameEnd(userId, message.game_id, message.winner_id, message.left_score, message.right_score);
                        break;
                }
            } catch (err) {
                console.error('Invalid message format:', err);
            }
        });

        // Handle disconnect
        socket.on('close', () => {
            console.log(`WebSocket disconnected: user ${userId}`);
            const userClients = clients.get(userId);
            if (userClients) {
                userClients.delete(socket as unknown as WebSocket);
                if (userClients.size === 0) {
                    clients.delete(userId);
                }
            }
        });
    });
};

async function handleGameInvite(fromUserId: number, fromUsername: string, toUserId: number): Promise<void> {
    // Check if target user is online
    if (!clients.has(toUserId)) {
        sendToUser(fromUserId, {
            type: 'game_invite_error',
            error: 'User is not online'
        });
        return;
    }

    const inviteId = generateId();
    const invite = {
        id: inviteId,
        fromUserId,
        fromUsername,
        toUserId,
        createdAt: new Date()
    };
    activeInvites.set(inviteId, invite);

    // Send invite to target user
    sendToUser(toUserId, {
        type: 'game_invite',
        invite: {
            id: inviteId,
            from_user_id: fromUserId,
            from_username: fromUsername,
            created_at: invite.createdAt.toISOString()
        }
    });

    // Confirm to sender
    sendToUser(fromUserId, {
        type: 'game_invite_sent',
        invite_id: inviteId,
        to_user_id: toUserId
    });

    // Auto-expire invite after 60 seconds
    setTimeout(() => {
        if (activeInvites.has(inviteId)) {
            activeInvites.delete(inviteId);
            sendToUser(fromUserId, {
                type: 'game_invite_expired',
                invite_id: inviteId
            });
        }
    }, 60000);
}

async function handleInviteAccept(acceptingUserId: number, inviteId: string): Promise<void> {
    const invite = activeInvites.get(inviteId);
    if (!invite || invite.toUserId !== acceptingUserId) {
        sendToUser(acceptingUserId, {
            type: 'game_invite_error',
            error: 'Invite not found or expired'
        });
        return;
    }

    activeInvites.delete(inviteId);

    // Create game in database
    const dbGame = await prisma.game.create({
        data: {
            player1Id: invite.fromUserId,
            player2Id: acceptingUserId,
            gameMode: 'online'
        }
    });

    const gameId = generateId();
    activeGames.set(gameId, {
        id: gameId,
        hostId: invite.fromUserId,
        guestId: acceptingUserId,
        dbGameId: dbGame.id
    });

    // Notify both players
    sendToUser(invite.fromUserId, {
        type: 'game_invite_accepted',
        game_id: gameId,
        db_game_id: dbGame.id,
        opponent_id: acceptingUserId,
        is_host: true
    });

    sendToUser(acceptingUserId, {
        type: 'game_invite_accepted',
        game_id: gameId,
        db_game_id: dbGame.id,
        opponent_id: invite.fromUserId,
        is_host: false
    });
}

function handleInviteDecline(decliningUserId: number, inviteId: string): void {
    const invite = activeInvites.get(inviteId);
    if (!invite || invite.toUserId !== decliningUserId) return;

    activeInvites.delete(inviteId);

    sendToUser(invite.fromUserId, {
        type: 'game_invite_declined',
        invite_id: inviteId
    });
}

function relayPaddleUpdate(fromUserId: number, gameId: string, paddleY: number): void {
    const game = activeGames.get(gameId);
    if (!game) return;

    // Send to the other player
    const targetUserId = game.hostId === fromUserId ? game.guestId : game.hostId;
    sendToUser(targetUserId, {
        type: 'game_paddle_update',
        game_id: gameId,
        paddle_y: paddleY
    });
}

function relayGameState(fromUserId: number, gameId: string, state: object): void {
    const game = activeGames.get(gameId);
    if (!game || game.hostId !== fromUserId) return; // Only host can send game state

    sendToUser(game.guestId, {
        type: 'game_state',
        game_id: gameId,
        state: state
    });
}

async function handleGameEnd(fromUserId: number, gameId: string, winnerId: number, leftScore: number, rightScore: number): Promise<void> {
    const game = activeGames.get(gameId);
    if (!game) return;

    // Update database
    if (game.dbGameId) {
        await prisma.game.update({
            where: { id: game.dbGameId },
            data: {
                player1Score: leftScore,
                player2Score: rightScore,
                winnerId: winnerId
            }
        });
    }

    // Notify both players
    const endMessage = {
        type: 'game_ended',
        game_id: gameId,
        winner_id: winnerId,
        left_score: leftScore,
        right_score: rightScore
    };

    sendToUser(game.hostId, endMessage);
    sendToUser(game.guestId, endMessage);

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
