//Loading environment variables
//Creating the Fastify server
//Registering security plugins (CORS, Cookies, JWT)
//Registering authentication routes
//Starting the server
//Handling graceful shutdown
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import dotenv from 'dotenv';

import { registerJwt } from './lib/jwt.js';
import prisma from './lib/prisma.js';
import authRoutes from './routes/auth.js';
import twoFactorRoutes from './routes/twoFactor.js';

dotenv.config();

const SERVICE_NAME = 'auth-service';
const PORT = parseInt(process.env.PORT || '3001');

const fastify = Fastify({
    logger: true
});
//plugin for cros
await fastify.register(cors, {
    origin: true,
    credentials: true
});

//plugin for cookie
await fastify.register(cookie);

await registerJwt(fastify);

// Register routes
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(twoFactorRoutes, { prefix: '/api/auth/2fa' });

// Health check
fastify.get('/health', async () => ({
    service: SERVICE_NAME,
    status: 'ok',
    timestamp: new Date().toISOString()
}));

const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`✅ ${SERVICE_NAME} running on port ${PORT}`);
    } catch (err) {
        console.error('❌ Failed to start:', err);
        process.exit(1);
    }
}
start();

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await fastify.close();
    process.exit(0);
});

start();
