import { API_BASE_URL } from '../config';
import { authService } from './auth.service';

export interface UserStats {
    user_id: number;
    wins: number;
    losses: number;
    total_games: number;
    win_rate: string;
    longest_streak: number;
}

export interface GameHistory {
    id: number;
    player1: { id: number; username: string; displayName: string };
    player2: { id: number; username: string; displayName: string } | null;
    player1_score: number;
    player2_score: number;
    winner: { id: number; username: string } | null;
    game_mode: string;
    played_at: string;
}

export interface UserProfile {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    date_of_birth?: string;
    phone?: string;
    is_online: boolean;
    created_at: string;
}

class UserService {
    private getHeaders() {
        const token = authService.getToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async fetchUserProfile(userId: number): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch user profile');
        return response.json();
    }

    async fetchUserStats(userId: number): Promise<UserStats> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch user stats');
        return response.json();
    }

    async fetchMatchHistory(limit: number = 10, userId?: number): Promise<GameHistory[]> {
        let url = `${API_BASE_URL}/game/history?limit=${limit}`;
        if (userId) url += `&userId=${userId}`;

        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch match history');
        const data = await response.json();
        return data.games || [];
    }

    // Fetch leaderboard from game service
    async fetchLeaderboard(limit: number = 10): Promise<Array<{
        rank: number;
        id: number;
        username: string;
        wins: number;
        avatar?: string;
    }>> {
        try {
            const response = await fetch(`${API_BASE_URL}/game/leaderboard?limit=${limit}`, {
                headers: this.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                const leaderboard: any[] = data.leaderboard || [];
                return leaderboard.map((u, i) => ({
                    rank: i + 1,
                    id: u.id,
                    username: u.display_name || u.username,
                    wins: u.wins || 0,
                    avatar: u.avatar_url
                }));
            }
        } catch (e) {
            console.warn("Leaderboard fetch failed", e);
        }
        return [];
    }

    async recordGameResult(data: {
        player2_id?: number;
        player1_score: number;
        player2_score: number;
        winner_id?: number;
        game_mode: string;
    }): Promise<{ id: number }> {
        // First create the game
        const createResponse = await fetch(`${API_BASE_URL}/game/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                player2_id: data.player2_id,
                game_mode: data.game_mode
            })
        });

        if (!createResponse.ok) {
            throw new Error('Failed to create game record');
        }

        const game = await createResponse.json();

        // Then update the score
        const updateResponse = await fetch(`${API_BASE_URL}/game/${game.id}/score`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({
                player1_score: data.player1_score,
                player2_score: data.player2_score,
                winner_id: data.winner_id
            })
        });

        if (!updateResponse.ok) {
            throw new Error('Failed to update game score');
        }

        return { id: game.id };
    }
    async updateProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Failed to update profile');
        return response.json();
    }
}

export const userService = new UserService();
