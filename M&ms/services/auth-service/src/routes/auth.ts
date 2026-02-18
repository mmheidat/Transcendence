import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import axios from 'axios';
import prisma from '../lib/prisma.js';
import { authenticate, JwtPayload } from '../lib/authMiddleware.js';
import { publishEvent } from '../lib/redis.js';

const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(8),
    display_name: z.string().min(3).max(30).optional()
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});

// getRequestOrigin: derive frontend origin for OAuth redirects.
// 1) Extracts origin from GOOGLE_REDIRECT_URI env variable if available.
// 2) Falls back to X-Forwarded headers from the proxy.
// 3) Docker maps external 8443→internal 443, so nginx loses the external port
//    in forwarded headers — using the env variable is more reliable.
function getRequestOrigin(request: any): string {
    // Prefer the origin from GOOGLE_REDIRECT_URI since proxy headers lose the external port
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (redirectUri) {
        try {
            const url = new URL(redirectUri);
            return url.origin;
        } catch (_) { }
    }
    const proto = request.headers['x-forwarded-proto'] || 'https';
    const host = request.headers['x-forwarded-host'] || request.headers['host'] || 'localhost:8443';
    return `${proto}://${host}`;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    picture: string;
}

// authRoutes: Fastify auth module (register/login/oauth/me/logout/verify).
// 1) Optionally registers Google OAuth if env credentials exist.
// 2) Exposes auth endpoints for credentials + Google OAuth.
// 3) Uses Prisma for persistence, bcrypt for password checks, JWT for sessions.
// 4) Publishes user events to Redis for other services (created/login/logout).
const authRoutes: FastifyPluginAsync = async (fastify) => {
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        console.log('✅ Google OAuth configured (manual flow)');
    }

    // POST /register: create a local account and issue JWT.
    // 1) Validates request body via Zod.
    // 2) Rejects if email/username already exists.
    // 3) Hashes password and creates user in DB.
    // 4) Signs JWT + publishes user:created event + returns user payload.
    fastify.post('/register', async (request, reply) => {
        try {
            const body = registerSchema.parse(request.body);

            const existing = await prisma.user.findFirst({
                where: { OR: [{ email: body.email }, { username: body.username }] }
            });

            if (existing) {
                return reply.code(409).send({ error: 'User already exists' });
            }

            const hashedPassword = await bcrypt.hash(body.password, 10);
            const user = await prisma.user.create({
                data: {
                    username: body.username,
                    email: body.email,
                    passwordHash: hashedPassword,
                    displayName: body.display_name || body.username,
                }
            });

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            await publishEvent('user:created', { userId: user.id, username: user.username });

            return reply.code(201).send({
                message: 'User registered successfully',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.displayName,
                    avatar_url: user.avatarUrl
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation failed', details: error.errors });
            }
            console.error('Register error:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // POST /login: verify credentials, handle optional 2FA, issue JWT.
    // 1) Validates request body via Zod.
    // 2) Finds user by email and verifies password with bcrypt.
    // 3) If OAuth-only account, instructs to sign in via provider.
    // 4) Updates online status, signs JWT (partial if 2FA enabled), publishes user:login.
    fastify.post('/login', async (request, reply) => {
        try {
            const body = loginSchema.parse(request.body);

            const user = await prisma.user.findUnique({ where: { email: body.email } });
            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            if (user.oauthProvider && !user.passwordHash) {
                return reply.code(400).send({ error: `Please sign in with ${user.oauthProvider}` });
            }

            const valid = await bcrypt.compare(body.password, user.passwordHash);
            if (!valid) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { isOnline: true, lastSeen: new Date() }
            });

            if (user.isTwoFactorEnabled) {
                const token = fastify.jwt.sign({
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    isPartial: true
                });

                return reply.send({
                    message: '2FA required',
                    requires2fa: true,
                    token
                });
            }

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            await publishEvent('user:login', { userId: user.id });

            return reply.send({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    display_name: user.displayName,
                    avatar_url: user.avatarUrl,
                    is_online: user.isOnline
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return reply.code(400).send({ error: 'Validation failed' });
            }
            console.error('Login error:', error);
            return reply.code(500).send({ error: 'Internal server error' });
        }
    });

    // Google OAuth start — dynamically builds the redirect_uri from the request origin
    fastify.get('/google', async (request, reply) => {
        try {
            const origin = getRequestOrigin(request);
            const redirectUri = `${origin}/api/auth/google/callback`;

            // Encode the origin in the state so the callback knows where to redirect
            const state = Buffer.from(JSON.stringify({ origin })).toString('base64url');

            const params = new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                redirect_uri: redirectUri,
                response_type: 'code',
                scope: 'email profile',
                state,
                access_type: 'online',
                prompt: 'select_account'
            });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            console.log(`🔑 OAuth redirect_uri: ${redirectUri}`);
            return reply.redirect(authUrl);
        } catch (error) {
            console.error('OAuth init error:', error);
            return reply.code(500).send({ error: 'Failed to initiate OAuth' });
        }
    });

    // Google OAuth callback — extracts origin from state to redirect correctly
    fastify.get('/google/callback', async (request, reply) => {
        try {
            const query = request.query as { code?: string; state?: string; error?: string };

            // Parse origin from state parameter
            let origin = process.env.FRONTEND_URL || 'https://localhost:8443';
            if (query.state) {
                try {
                    const stateData = JSON.parse(Buffer.from(query.state, 'base64url').toString());
                    if (stateData.origin) {
                        origin = stateData.origin;
                    }
                } catch (e) {
                    console.warn('Failed to parse OAuth state, using default origin');
                }
            }

            if (query.error || !query.code) {
                return reply.redirect(`${origin}?message=${query.error || 'OAuth failed'}`);
            }

            // Build the same redirect_uri that was used in the authorization request
            const redirectUri = `${origin}/api/auth/google/callback`;

            // Exchange authorization code for access token
            const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
                code: query.code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            });

            const accessToken = tokenResponse.data?.access_token;
            if (!accessToken) {
                return reply.redirect(`${origin}?message=Failed to get access token`);
            }

            const { data: googleUser } = await axios.get<GoogleUserInfo>(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!googleUser.verified_email) {
                return reply.redirect(`${origin}?message=Email not verified`);
            }

            let user = await prisma.user.findFirst({
                where: { oauthProvider: 'google', oauthId: googleUser.id }
            });

            if (!user) {
                user = await prisma.user.findUnique({ where: { email: googleUser.email } });

                if (user) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { oauthProvider: 'google', oauthId: googleUser.id, avatarUrl: googleUser.picture }
                    });
                } else {
                    const username = googleUser.email.split('@')[0] + '_' + Date.now().toString().slice(-4);
                    user = await prisma.user.create({
                        data: {
                            email: googleUser.email,
                            username,
                            displayName: googleUser.name,
                            avatarUrl: googleUser.picture,
                            oauthProvider: 'google',
                            oauthId: googleUser.id,
                            passwordHash: ''
                        }
                    });
                    await publishEvent('user:created', { userId: user.id, username: user.username });
                }
            } else {
                // Only update avatar if user doesn't have a custom one already
                const currentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { avatarUrl: true } });
                if (!currentUser?.avatarUrl) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { avatarUrl: googleUser.picture }
                    });
                }
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { isOnline: true, lastSeen: new Date() }
            });

            // Check if user has 2FA enabled — if so, issue a partial token and redirect to 2FA
            if (user.isTwoFactorEnabled) {
                const partialToken = fastify.jwt.sign({
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    isPartial: true
                });
                return reply.redirect(`${origin}/login?requires2fa=true&token=${partialToken}`);
            }

            const token = fastify.jwt.sign({ id: user.id, email: user.email, username: user.username });

            return reply.redirect(`${origin}?token=${token}`);

        } catch (error) {
            console.error('OAuth callback error:', error);
            // Try to extract origin from state even on error
            let origin = process.env.FRONTEND_URL || 'https://localhost:8443';
            try {
                const query = request.query as { state?: string };
                if (query.state) {
                    const stateData = JSON.parse(Buffer.from(query.state, 'base64url').toString());
                    if (stateData.origin) origin = stateData.origin;
                }
            } catch (_) { }
            return reply.redirect(`${origin}?message=Authentication failed`);
        }
    });

    // POST /logout: mark user offline.
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) Reads user id from request.user.
    // 3) Updates DB to set isOnline=false and lastSeen=now.
    // 4) Publishes user:logout event and returns success message.
    fastify.post('/logout', { preHandler: [authenticate] }, async (request, reply) => {
        const user = request.user as JwtPayload;
        await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: false, lastSeen: new Date() }
        });
        await publishEvent('user:logout', { userId: user.id });
        return reply.send({ message: 'Logged out successfully' });
    });

    // GET /me: return current authenticated user profile.
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) Loads full user record from DB by token user id.
    // 3) Returns 404 if user no longer exists.
    // 4) Returns user fields used by the frontend profile.
    fastify.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
        const tokenUser = request.user as JwtPayload;
        const user = await prisma.user.findUnique({ where: { id: tokenUser.id } });

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return reply.send({
            id: user.id,
            username: user.username,
            email: user.email,
            display_name: user.displayName,
            avatar_url: user.avatarUrl,
            nationality: user.nationality,
            date_of_birth: user.dateOfBirth,
            phone: user.phone,
            gender: user.gender,
            is_online: user.isOnline,
            oauth_provider: user.oauthProvider,
            created_at: user.createdAt
        });
    });

    // GET /verify: simple token validity endpoint (internal use).
    // 1) Requires valid JWT via authenticate preHandler.
    // 2) If request reaches handler, token is valid.
    // 3) Returns { valid: true } plus decoded user payload.
    // 4) Useful for internal services to validate inter-service JWT calls.
    fastify.get('/verify', { preHandler: [authenticate] }, async (request, reply) => {
        return reply.send({ valid: true, user: request.user });
    });
};

export default authRoutes;