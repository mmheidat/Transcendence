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

        console.log(`WebSocket connected: user ${userId}`);

        // Register client - use connection.socket for the underlying WebSocket
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId)!.add(connection.socket as WebSocket);

        // Handle messages - SocketStream uses 'data' event, not 'message'
        connection.socket.on('message', async (data: Buffer) => {
            console.log(`📨 Raw message received from user ${userId}:`, data.toString());
            try {
                const message = JSON.parse(data.toString());
                console.log(`✅ Parsed message from ${userId}:`, JSON.stringify(message, null, 2));

                switch (message.type) {
                    case 'aiPrompt':
                        console.log(`🤖 Processing aiPrompt for user ${userId}`);
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
                        console.log(`🛑 Processing aiCancel for user ${userId}`);
                        try {
                            await handleAiCancel(userId, message);
                        } catch (err) {
                            console.error('❌ Error handling aiCancel:', err);
                        }
                        break;
                    default:
                        console.log('⚠️ Unknown message type:', message.type);
                }
            } catch (err) {
                console.error('❌ Invalid message format:', err);
            }
        });

        // Handle disconnect
        connection.socket.on('close', () => {
            console.log(`WebSocket disconnected: user ${userId}`);
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
        const history = conversation.messages.reverse().map(msg  => ({
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
        console.log('🚀 Starting AI stream...');
        try {
            for await (const chunk of generateContentStream(prompt, history)) {
                if (controller.signal.aborted) {
                    console.log(`Stream cancelled for user ${userId}`);
                    break;
                }

                if (!chunk.done && chunk.text) {
                    chunkCount++;
                    fullResponse += chunk.text;
                    console.log(`📤 Chunk ${chunkCount}: ${chunk.text.length} chars`);
                    
                    // Send full chunks immediately for faster streaming
                    connection.send(JSON.stringify({
                        type: 'aiDelta',
                        conversationId: conversation.id,
                        delta: chunk.text
                    }));
                }

                if (chunk.done) {
                    console.log(`✅ Stream complete! Total chunks: ${chunkCount}, Total length: ${fullResponse.length}`);
                    
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
                    console.log('📨 Sending aiDone message');
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
        console.log(`AI stream cancelled for user ${userId}`);
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
