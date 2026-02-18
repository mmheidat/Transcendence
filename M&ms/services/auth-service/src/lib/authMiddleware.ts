import { FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
	id: number;
	email: string;
	username: string;
	isPartial?: boolean; // indicates a “partial” auth state
}


// Full access GUARD for protected routes.
// 1) Verifies the JWT
// 2) Reads the authenticated user payload
// 3) If user.isPartial is true -> access is denied.
// 4) On any error, responds with 401 Unauthorized.

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


// JWT-only GUARD for endpoints that are allowed before completing 2FA.
// 1) Verifies the JWT
// 2) Does NOT check user.isPartial (so partially authenticated users can pass).
// 3) On any error, responds with 401 Unauthorized.

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