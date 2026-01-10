import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';

import { registerJwt } from './lib/jwt.js';
import prisma from './lib/prisma.js';
import userRoutes from './routes/users.js';
import friendRoutes from './routes/friends.js';
import apiKeyRoutes from './routes/apiKeys.js';
import publicApiRoutes from './routes/publicApi.js';

dotenv.config();

const SERVICE_NAME = 'user-service';
const PORT = parseInt(process.env.PORT || '3002');

console.log(`🚀 Starting ${SERVICE_NAME}...`);

const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
        }
    }
});

async function start(): Promise<void> {
    try {
        await prisma.$connect();
        console.log('✅ Database connected');

        // CORS
        await fastify.register(cors, {
            origin: process.env.FRONTEND_URL || 'https://localhost:8443',
            credentials: true
        });

        // Rate Limiting - 100 requests per minute per IP
        await fastify.register(rateLimit, {
            max: 100,
            timeWindow: '1 minute',
            errorResponseBuilder: (request, context) => ({
                error: 'Rate limit exceeded',
                message: `You have exceeded the rate limit of ${context.max} requests per ${context.after}. Please try again later.`,
                statusCode: 429
            })
        });

        // Swagger Documentation
        await fastify.register(swagger, {
            openapi: {
                info: {
                    title: 'Pong Game Public API',
                    description: 'Public API for the Pong game platform. Authenticate using an API key in the X-API-Key header.',
                    version: '1.0.0',
                    contact: {
                        name: 'API Support'
                    }
                },
                servers: [
                    { url: 'https://localhost:8443', description: 'Development server' }
                ],
                components: {
                    securitySchemes: {
                        ApiKeyAuth: {
                            type: 'apiKey',
                            in: 'header',
                            name: 'X-API-Key',
                            description: 'API key for authentication'
                        }
                    }
                },
                security: [{ ApiKeyAuth: [] }],
                tags: [
                    { name: 'API Keys', description: 'Manage your API keys (requires JWT auth)' },
                    { name: 'Public API - Users', description: 'User endpoints' },
                    { name: 'Public API - Games', description: 'Game endpoints' },
                    { name: 'Public API - Stats', description: 'Platform statistics' }
                ]
            }
        });

        await fastify.register(swaggerUi, {
            routePrefix: '/api/docs',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: false
            }
        });

        // JWT for internal routes
        await registerJwt(fastify);

        // Internal routes (JWT auth)
        await fastify.register(userRoutes, { prefix: '/api/users' });
        await fastify.register(friendRoutes, { prefix: '/api/users/friends' });
        await fastify.register(apiKeyRoutes, { prefix: '/api/keys' });

        // Public API routes (API key auth)
        await fastify.register(publicApiRoutes, { prefix: '/api/public' });

        // Health check
        fastify.get('/health', async () => ({
            service: SERVICE_NAME,
            status: 'ok',
            timestamp: new Date().toISOString()
        }));

        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`✅ ${SERVICE_NAME} running on port ${PORT}`);
        console.log(`📚 API Documentation available at http://localhost:${PORT}/api/docs`);
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await fastify.close();
    process.exit(0);
});

start();
