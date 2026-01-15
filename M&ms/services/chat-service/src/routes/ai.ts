import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { authenticate, JwtPayload } from '../lib/jwt.js';

const aiRoutes: FastifyPluginAsync = async (fastify) => {
    // Get user's conversations
    fastify.get('/ai/conversations', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;

        const conversations = await prisma.aiConversation.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 1 // Just first message for preview
                }
            }
        });

        return reply.send({
            conversations: conversations.map((conv: typeof conversations[number]) => ({
                id: conv.id,
                title: conv.title,
                created_at: conv.createdAt,
                updated_at: conv.updatedAt,
                first_message: conv.messages[0] ? {
                    role: conv.messages[0].role,
                    content: conv.messages[0].content.substring(0, 100)
                } : null
            }))
        });
    });

    // Get messages in a conversation
    fastify.get('/ai/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const { id } = request.params as { id: string };
        const conversationId = parseInt(id);

        const conversation = await prisma.aiConversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!conversation) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }

        if (conversation.userId !== user.id) {
            return reply.code(403).send({ error: 'Access denied' });
        }

        return reply.send({
            id: conversation.id,
            title: conversation.title,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
            messages: conversation.messages.map((msg: typeof conversation.messages[number]) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                tokens: msg.tokens,
                created_at: msg.createdAt
            }))
        });
    });

    // Create new conversation
    fastify.post('/ai/conversations', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const { title } = request.body as { title?: string };

        const conversation = await prisma.aiConversation.create({
            data: {
                userId: user.id,
                title: title || 'New Conversation'
            }
        });

        return reply.code(201).send({
            id: conversation.id,
            title: conversation.title,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt
        });
    });

    // Update conversation title
    fastify.patch('/ai/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const { id } = request.params as { id: string };
        const { title } = request.body as { title: string };
        const conversationId = parseInt(id);

        const conversation = await prisma.aiConversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }

        if (conversation.userId !== user.id) {
            return reply.code(403).send({ error: 'Access denied' });
        }

        const updated = await prisma.aiConversation.update({
            where: { id: conversationId },
            data: { title }
        });

        return reply.send({
            id: updated.id,
            title: updated.title,
            updated_at: updated.updatedAt
        });
    });

    // Delete conversation
    fastify.delete('/ai/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const { id } = request.params as { id: string };
        const conversationId = parseInt(id);

        const conversation = await prisma.aiConversation.findUnique({
            where: { id: conversationId }
        });

        if (!conversation) {
            return reply.code(404).send({ error: 'Conversation not found' });
        }

        if (conversation.userId !== user.id) {
            return reply.code(403).send({ error: 'Access denied' });
        }

        await prisma.aiConversation.delete({
            where: { id: conversationId }
        });

        return reply.code(204).send();
    });
};

export default aiRoutes;
