// Public API routes (authenticated via API key)
import { FastifyPluginAsync } from 'fastify';
import { authenticateApiKey } from '../lib/apiKeyAuth.js';
import prisma from '../lib/prisma.js';

const publicApiRoutes: FastifyPluginAsync = async (fastify) => {
    // Apply API key authentication to all routes
    fastify.addHook('preHandler', authenticateApiKey);

    // ==================== USERS ====================

    // GET /api/public/users/:id - Get user profile
    fastify.get('/users/:id', {
        schema: {
            description: 'Get a user profile by ID',
            tags: ['Public API - Users'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'number', description: 'User ID' }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        username: { type: 'string' },
                        display_name: { type: 'string' },
                        avatar_url: { type: 'string', nullable: true },
                        is_online: { type: 'boolean' },
                        created_at: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };

        const user = await prisma.user.findUnique({
            where: { id: Number(id) },
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                createdAt: true
            }
        });

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return reply.send({
            id: user.id,
            username: user.username,
            display_name: user.displayName,
            avatar_url: user.avatarUrl,
            is_online: user.isOnline,
            created_at: user.createdAt.toISOString()
        });
    });

    // GET /api/public/users - List users (paginated)
    fastify.get('/users', {
        schema: {
            description: 'List users with pagination',
            tags: ['Public API - Users'],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', default: 1 },
                    limit: { type: 'number', default: 20, maximum: 100 }
                }
            }
        }
    }, async (request, reply) => {
        const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isOnline: true
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count()
        ]);

        return reply.send({
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                display_name: u.displayName,
                avatar_url: u.avatarUrl,
                is_online: u.isOnline
            })),
            pagination: {
                page,
                limit,
                total,
                total_pages: Math.ceil(total / limit)
            }
        });
    });

    // ==================== LEADERBOARD ====================

    // GET /api/public/leaderboard - Get game leaderboard
    fastify.get('/leaderboard', {
        schema: {
            description: 'Get the game leaderboard',
            tags: ['Public API - Games'],
            querystring: {
                type: 'object',
                properties: {
                    limit: { type: 'number', default: 10, maximum: 100 }
                }
            }
        }
    }, async (request, reply) => {
        const { limit = 10 } = request.query as { limit?: number };

        const leaderboard = await prisma.user.findMany({
            take: limit,
            select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                _count: {
                    select: { gamesWon: true }
                }
            },
            orderBy: {
                gamesWon: { _count: 'desc' }
            }
        });

        return reply.send({
            leaderboard: leaderboard.map((u, index) => ({
                rank: index + 1,
                id: u.id,
                username: u.username,
                display_name: u.displayName,
                avatar_url: u.avatarUrl,
                wins: u._count.gamesWon
            }))
        });
    });

    // ==================== GAMES ====================

    // GET /api/public/games/:id - Get game details
    fastify.get('/games/:id', {
        schema: {
            description: 'Get game details by ID',
            tags: ['Public API - Games'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'number' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };

        const game = await prisma.game.findUnique({
            where: { id: Number(id) },
            include: {
                player1: { select: { id: true, username: true, displayName: true } },
                player2: { select: { id: true, username: true, displayName: true } },
                winner: { select: { id: true, username: true, displayName: true } }
            }
        });

        if (!game) {
            return reply.status(404).send({ error: 'Game not found' });
        }

        return reply.send({
            id: game.id,
            game_mode: game.gameMode,
            player1: {
                id: game.player1.id,
                username: game.player1.username,
                display_name: game.player1.displayName,
                score: game.player1Score
            },
            player2: game.player2 ? {
                id: game.player2.id,
                username: game.player2.username,
                display_name: game.player2.displayName,
                score: game.player2Score
            } : null,
            winner: game.winner ? {
                id: game.winner.id,
                username: game.winner.username,
                display_name: game.winner.displayName
            } : null,
            played_at: game.playedAt.toISOString()
        });
    });

    // GET /api/public/games - List games (paginated)
    fastify.get('/games', {
        schema: {
            description: 'List games with pagination',
            tags: ['Public API - Games'],
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', default: 1 },
                    limit: { type: 'number', default: 20, maximum: 100 },
                    user_id: { type: 'number', description: 'Filter by user ID' }
                }
            }
        }
    }, async (request, reply) => {
        const { page = 1, limit = 20, user_id } = request.query as {
            page?: number;
            limit?: number;
            user_id?: number;
        };
        const skip = (page - 1) * limit;

        const where = user_id ? {
            OR: [
                { player1Id: user_id },
                { player2Id: user_id }
            ]
        } : {};

        const [games, total] = await Promise.all([
            prisma.game.findMany({
                where,
                skip,
                take: limit,
                include: {
                    player1: { select: { id: true, username: true } },
                    player2: { select: { id: true, username: true } },
                    winner: { select: { id: true, username: true } }
                },
                orderBy: { playedAt: 'desc' }
            }),
            prisma.game.count({ where })
        ]);

        return reply.send({
            games: games.map(g => ({
                id: g.id,
                game_mode: g.gameMode,
                player1: { id: g.player1.id, username: g.player1.username, score: g.player1Score },
                player2: g.player2 ? { id: g.player2.id, username: g.player2.username, score: g.player2Score } : null,
                winner_id: g.winnerId,
                played_at: g.playedAt.toISOString()
            })),
            pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
        });
    });

    // POST /api/public/games - Create a game record
    fastify.post('/games', {
        schema: {
            description: 'Create a new game record',
            tags: ['Public API - Games'],
            body: {
                type: 'object',
                required: ['player1_id', 'game_mode'],
                properties: {
                    player1_id: { type: 'number' },
                    player2_id: { type: 'number' },
                    game_mode: { type: 'string', enum: ['pvp', 'ai', 'tournament'] }
                }
            }
        }
    }, async (request, reply) => {
        const { player1_id, player2_id, game_mode } = request.body as {
            player1_id: number;
            player2_id?: number;
            game_mode: string;
        };

        const game = await prisma.game.create({
            data: {
                player1Id: player1_id,
                player2Id: player2_id,
                gameMode: game_mode
            }
        });

        return reply.status(201).send({
            message: 'Game created',
            game: {
                id: game.id,
                game_mode: game.gameMode,
                player1_id: game.player1Id,
                player2_id: game.player2Id
            }
        });
    });

    // PUT /api/public/games/:id - Update game score
    fastify.put('/games/:id', {
        schema: {
            description: 'Update game scores and winner',
            tags: ['Public API - Games'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'number' }
                }
            },
            body: {
                type: 'object',
                properties: {
                    player1_score: { type: 'number' },
                    player2_score: { type: 'number' },
                    winner_id: { type: 'number' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };
        const { player1_score, player2_score, winner_id } = request.body as {
            player1_score?: number;
            player2_score?: number;
            winner_id?: number;
        };

        const game = await prisma.game.findUnique({ where: { id: Number(id) } });
        if (!game) {
            return reply.status(404).send({ error: 'Game not found' });
        }

        const updated = await prisma.game.update({
            where: { id: Number(id) },
            data: {
                ...(typeof player1_score === 'number' && { player1Score: player1_score }),
                ...(typeof player2_score === 'number' && { player2Score: player2_score }),
                ...(winner_id && { winnerId: winner_id })
            }
        });

        return reply.send({
            message: 'Game updated',
            game: {
                id: updated.id,
                player1_score: updated.player1Score,
                player2_score: updated.player2Score,
                winner_id: updated.winnerId
            }
        });
    });

    // DELETE /api/public/games/:id - Delete a game record
    fastify.delete('/games/:id', {
        schema: {
            description: 'Delete a game record',
            tags: ['Public API - Games'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'number' }
                }
            }
        }
    }, async (request, reply) => {
        const { id } = request.params as { id: number };

        const game = await prisma.game.findUnique({ where: { id: Number(id) } });
        if (!game) {
            return reply.status(404).send({ error: 'Game not found' });
        }

        await prisma.game.delete({ where: { id: Number(id) } });

        return reply.send({ message: 'Game deleted successfully' });
    });

    // ==================== STATS ====================

    // GET /api/public/stats - Get overall stats
    fastify.get('/stats', {
        schema: {
            description: 'Get overall platform statistics',
            tags: ['Public API - Stats']
        }
    }, async (request, reply) => {
        const [totalUsers, totalGames, onlineUsers] = await Promise.all([
            prisma.user.count(),
            prisma.game.count(),
            prisma.user.count({ where: { isOnline: true } })
        ]);

        return reply.send({
            total_users: totalUsers,
            total_games: totalGames,
            online_users: onlineUsers,
            timestamp: new Date().toISOString()
        });
    });
};

export default publicApiRoutes;
