
import { FastifyInstance } from 'fastify';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { authenticate, authenticatePre2FA, JwtPayload } from '../lib/authMiddleware.js';

const codeSchema = z.object({
    code: z.string().length(6)
});

export default async function twoFactorRoutes(fastify: FastifyInstance) {
    // Generate Secret & QR Code
    fastify.post('/generate', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(user.email, 'Pong42', secret);

        // Store secret temporarily but don't enable yet
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: secret } // Encrypting this would be better practice, but storing plain for now as per "simple" requirement
        });

        try {
            const imageUrl = await QRCode.toDataURL(otpauth);
            return { secret, qrCode: imageUrl };
        } catch (err) {
            request.log.error(err);
            return reply.code(500).send({ error: 'Failed to generate QR code' });
        }
    });

    // Verify and Turn On
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

    // Validate (Login 2FA step)
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

        // Issue full token
        const token = fastify.jwt.sign({
            id: dbUser.id,
            email: dbUser.email,
            username: dbUser.username
        }); // No isPartial flag

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

    // Disable 2FA
    fastify.post('/turn-off', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;

        await prisma.user.update({
            where: { id: user.id },
            data: { isTwoFactorEnabled: false, twoFactorSecret: null }
        });

        return { message: '2FA disabled successfully' };
    });

    // Check status
    fastify.get('/status', { preHandler: [authenticate] }, async (request, reply) => {
        const userToken = request.user as JwtPayload;
        const user = await prisma.user.findUnique({ where: { id: userToken.id } });
        return { enabled: user?.isTwoFactorEnabled || false };
    });
}
