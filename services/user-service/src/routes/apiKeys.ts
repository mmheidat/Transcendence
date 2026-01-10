// API Key management routes (requires JWT auth)
import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';
import crypto from 'crypto';

const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
    // Generate a new API key (requires JWT auth)
    fastify.post('/', {
        preHandler: [authenticate],
        schema: {
            description: 'Generate a new API key',
            tags: ['API Keys'],
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string', description: 'A name to identify this API key' }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        apiKey: { type: 'string' },
                        name: { type: 'string' },
                        warning: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { sub: userId } = request.user as { sub: number };
        const { name } = request.body as { name: string };

        // Generate a secure random API key
        const apiKey = `pk_${crypto.randomBytes(32).toString('hex')}`;

        await prisma.apiKey.create({
            data: {
                key: apiKey,
                name,
                userId
            }
        });

        return reply.status(201).send({
            message: 'API key created successfully',
            apiKey,
            name,
            warning: 'Store this key securely. It will not be shown again.'
        });
    });

    // List all API keys for current user
    fastify.get('/', {
        preHandler: [authenticate],
        schema: {
            description: 'List all API keys for the authenticated user',
            tags: ['API Keys'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        keys: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number' },
                                    name: { type: 'string' },
                                    keyPreview: { type: 'string' },
                                    createdAt: { type: 'string' },
                                    lastUsed: { type: 'string', nullable: true },
                                    isActive: { type: 'boolean' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { sub: userId } = request.user as { sub: number };

        const keys = await prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                key: true,
                createdAt: true,
                lastUsed: true,
                isActive: true
            },
            orderBy: { createdAt: 'desc' }
        });

        return reply.send({
            keys: keys.map(k => ({
                id: k.id,
                name: k.name,
                keyPreview: `${k.key.substring(0, 10)}...${k.key.substring(k.key.length - 4)}`,
                createdAt: k.createdAt.toISOString(),
                lastUsed: k.lastUsed?.toISOString() || null,
                isActive: k.isActive
            }))
        });
    });

    // Revoke an API key
    fastify.delete('/:keyId', {
        preHandler: [authenticate],
        schema: {
            description: 'Revoke (deactivate) an API key',
            tags: ['API Keys'],
            params: {
                type: 'object',
                required: ['keyId'],
                properties: {
                    keyId: { type: 'number' }
                }
            }
        }
    }, async (request, reply) => {
        const { sub: userId } = request.user as { sub: number };
        const { keyId } = request.params as { keyId: number };

        const key = await prisma.apiKey.findFirst({
            where: { id: keyId, userId }
        });

        if (!key) {
            return reply.status(404).send({ error: 'API key not found' });
        }

        await prisma.apiKey.update({
            where: { id: keyId },
            data: { isActive: false }
        });

        return reply.send({ message: 'API key revoked successfully' });
    });
};

export default apiKeyRoutes;
