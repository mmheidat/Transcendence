// API Key authentication middleware
import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from './prisma.js';

export async function authenticateApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
        return reply.status(401).send({
            error: 'API key required',
            message: 'Please provide an API key in the X-API-Key header'
        });
    }

    try {
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey },
            include: { user: true }
        });

        if (!keyRecord || !keyRecord.isActive) {
            return reply.status(401).send({
                error: 'Invalid API key',
                message: 'The provided API key is invalid or has been revoked'
            });
        }

        // Update last used timestamp
        await prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsed: new Date() }
        });

        // Attach user info to request
        (request as any).apiKeyUser = {
            id: keyRecord.user.id,
            username: keyRecord.user.username,
            keyId: keyRecord.id,
            keyName: keyRecord.name
        };
    } catch (error) {
        console.error('API key authentication error:', error);
        return reply.status(500).send({ error: 'Authentication failed' });
    }
}
