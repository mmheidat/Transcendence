import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
    id: number;
    email: string;
    username: string;
    isPartial?: boolean;
}

export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        await request.jwtVerify();
        const user = request.user as JwtPayload;
        if (user.isPartial) {
            throw new Error('2FA required');
        }
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
}

export async function authenticatePre2FA(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.code(401).send({ error: 'Unauthorized' });
    }
}
