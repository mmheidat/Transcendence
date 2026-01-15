import rateLimit from '@fastify/rate-limit';
import { getRedisClient } from './redis.js';
import { JwtPayload } from './jwt.js';
import { FastifyRequest } from 'fastify';

export interface RateLimitConfig {
    max: number;
    timeWindow: number;
}

export function getAiRateLimitConfig() {
    return {
        max: parseInt(process.env.AI_RATE_LIMIT_MAX || '10'),
        timeWindow: parseInt(process.env.AI_RATE_LIMIT_WINDOW || '300000') // 5 minutes
    };
}

export async function createAiRateLimiter() {
    const config = getAiRateLimitConfig();
    const redis = await getRedisClient();

    return {
        max: config.max,
        timeWindow: config.timeWindow,
        redis,
        namespace: 'ai-rate-limit:',
        keyGenerator: (request: FastifyRequest) => {
            // Prefer user ID from JWT for authenticated requests
            const user = (request as any).user as JwtPayload | undefined;
            if (user && user.id) {
                return `user:${user.id}`;
            }
            // Fallback to IP for unauthenticated requests
            return `ip:${request.ip}`;
        },
        errorResponseBuilder: () => {
            return {
                error: 'Too many AI requests. Please wait before trying again.',
                code: 'RATE_LIMITED',
                retryAfter: Math.ceil(config.timeWindow / 1000) // seconds
            };
        },
        skipOnError: true // Don't block on Redis errors
    };
}

export default {
    getAiRateLimitConfig,
    createAiRateLimiter
};
