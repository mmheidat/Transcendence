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

// Route registration.
// 1) Registers authRoutes under /api/auth (register/login/oauth/me/logout/verify).
// 2) Registers twoFactorRoutes under /api/auth/2fa (2FA setup/enable/verify/disable/status).
// 3) Uses prefixes to keep endpoints namespaced per service.
// 4) Must be registered after JWT/plugin setup to use preHandlers.
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(twoFactorRoutes, { prefix: '/api/auth/2fa' });

// GET /health: service liveness probe.
// 1) Returns service name for identification.
// 2) Returns static status='ok' for basic liveness.
// 3) Includes ISO timestamp for quick diagnostics.
// 4) Used by orchestrators/load balancers for health checks.
fastify.get('/health', async () => ({
    service: SERVICE_NAME,
    status: 'ok',
    timestamp: new Date().toISOString()
}));

// start: boot the HTTP server.
// 1) Starts Fastify listening on 0.0.0.0:PORT (container-friendly).
// 2) Logs a success message with service name and port.
// 3) On failure, logs error and exits with code 1.
// 4) Intended to be called once during startup.
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

// SIGINT handler: graceful shutdown.
// 1) Disconnects Prisma to close DB connections.
// 2) Closes Fastify to stop accepting new requests.
// 3) Exits the process with code 0.
// 4) Ensures clean shutdown on Ctrl+C / container stop.
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    await fastify.close();
    process.exit(0);
});

start();