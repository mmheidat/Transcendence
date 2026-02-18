import { FastifyInstance } from 'fastify';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authenticatePre2FA, JwtPayload } from '../lib/authMiddleware.js';

const codeSchema = z.object({
    code: z.string().length(6)
});

// twoFactorRoutes: 2FA endpoints (setup/enable/verify/disable/status).
// 1) Exposes routes to generate TOTP secret + QR, enable 2FA, and verify 2FA during login.
// 2) Uses Prisma to store the TOTP secret and 2FA enabled flag.
// 3) Uses authenticate for fully-authenticated actions and authenticatePre2FA for the login 2FA step.
// 4) Issues a full JWT after successful 2FA verification.
export default async function twoFactorRoutes(fastify: FastifyInstance) {
    // POST /generate: generate TOTP secret and QR code for the authenticator app.
    // 1) Requires full JWT via authenticate.
    // 2) Generates a new TOTP secret and otpauth URI for the user.
    // 3) Stores the secret in DB (setup initiated, not enabled yet).
    // 4) Returns the secret and a QR code (data URL) for scanning.
    fastify.post('/generate', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'Pong42', secret);

        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: secret }
        });

        try {
            const imageUrl = await QRCode.toDataURL(otpauth);
            return { secret, qrCode: imageUrl };
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ error: 'Failed to generate QR code' });
        }
    });

    // POST /turn-on: verify code and enable 2FA.
    // 1) Requires full JWT via authenticate.
    // 2) Validates request body format (6-digit code).
    // 3) Loads user + stored secret and verifies the provided TOTP code.
    // 4) If valid, sets isTwoFactorEnabled=true in DB and returns success.
    fastify.post('/turn-on', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const body = codeSchema.safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid code format' });
        }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!dbUser || !dbUser.twoFactorSecret) {
            return reply.code(400).send({ error: '2FA setup not initiated' });
        }

        const isValid = authenticator.check(body.data.code, dbUser.twoFactorSecret);
        if (!isValid) {
            return reply.code(400).send({ error: 'Invalid code' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { isTwoFactorEnabled: true }
        });

        return { message: '2FA enabled successfully' };
    });

    // POST /authenticate: verify 2FA code during login and issue full JWT.
    // 1) Requires JWT via authenticatePre2FA (allows isPartial tokens).
    // 2) Validates request body format (6-digit code).
    // 3) Ensures 2FA is enabled + secret exists, then verifies the provided TOTP code.
    // 4) If valid, signs and returns a full JWT without isPartial.
    fastify.post('/authenticate', { preHandler: [authenticatePre2FA] }, async (request, reply) => {
        const userToken = request.user as JwtPayload;
        const body = codeSchema.safeParse(request.body);

        if (!body.success) {
            return reply.code(400).send({ error: 'Invalid code format' });
        }

        const dbUser = await prisma.user.findUnique({ where: { id: userToken.id } });
        if (!dbUser || !dbUser.isTwoFactorEnabled || !dbUser.twoFactorSecret) {
            return reply.code(400).send({ error: '2FA not enabled for this user' });
        }

        const isValid = authenticator.check(body.data.code, dbUser.twoFactorSecret);
        if (!isValid) {
            return reply.code(401).send({ error: 'Invalid code' });
        }

        const token = fastify.jwt.sign({
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username
        });

        return {
            token,
            user: {
                id: dbUser.id,
                username: dbUser.username,
                email: dbUser.email,
                is_two_factor_enabled: true
            }
        };
    });

    // POST /turn-off: disable 2FA and clear secret.
    // 1) Requires full JWT via authenticate.
    // 2) Reads user id from request.user.
    // 3) Sets isTwoFactorEnabled=false and removes stored secret in DB.
    // 4) Returns success message.
    fastify.post('/turn-off', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;

        await prisma.user.update({
            where: { id: user.id },
            data: { isTwoFactorEnabled: false, twoFactorSecret: null }
        });

        return { message: '2FA disabled successfully' };
    });

    // GET /status: return whether 2FA is enabled for current user.
    // 1) Requires full JWT via authenticate.
    // 2) Loads user record from DB by token user id.
    // 3) Returns { enabled: boolean } based on isTwoFactorEnabled.
    // 4) Defaults to false if user is missing.
    fastify.get('/status', { preHandler: [authenticate] }, async (request, reply) => {
        const userToken = request.user as JwtPayload;
        const user = await prisma.user.findUnique({ where: { id: userToken.id } });
        return { enabled: user?.isTwoFactorEnabled || false };
    });
}