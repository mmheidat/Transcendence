import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

// Prisma client singleton.
// 1) Reuses an existing PrismaClient from globalThis if it exists (prevents multiple instances). Otherwise creates a new PrismaClient with environment-based logging.
// 2) Exports the singleton instance for use across the app.
// 3) Helps avoid connection exhaustion during dev hot-reload.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Cache Prisma client in globalThis in non-production.
// 1) Stores the created PrismaClient on globalThis in development.
// 2) Ensures the same instance is reused across module reloads.
// 3) Skips caching in production to avoid unexpected shared state.
// 4) Prevents creating extra DB connections on reload.
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;