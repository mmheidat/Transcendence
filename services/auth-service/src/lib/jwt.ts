// Force reload
import jwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export async function registerJwt(fastify: FastifyInstance): Promise<void> {
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    });
}

// Auth middleware moved to authMiddleware.ts
