// Force reload
// plugin for jwt (plugin = feature)
import jwt from '@fastify/jwt';
<<<<<<< HEAD
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'; //configuration
=======
import { FastifyInstance } from 'fastify';
>>>>>>> sogno_di_volare

// Register JWT plugin for Fastify.
// 1) Registers @fastify/jwt so request.jwtVerify() / fastify.jwt.sign() become available
// 2) Sets the JWT secret used to verify tokens
// 3) Configures the default token expiration for signing
// 4) Must be called during app bootstrap before routes that rely on JWT
export async function registerJwt(fastify: FastifyInstance): Promise<void> {
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
    });
}