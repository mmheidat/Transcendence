import { API_BASE_URL } from '../config.js';

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
    nationality?: string;
    date_of_birth?: string;
    phone?: string;
    gender?: string;
    is_online: boolean;
    created_at: string;
}

export class ProfileService {
    private static instance: ProfileService;

    private constructor() { }

    static getInstance(): ProfileService {
        if (!ProfileService.instance) {
            ProfileService.instance = new ProfileService();
        }
        return ProfileService.instance;
    }

    private getAuthHeaders(): HeadersInit {
        const token = localStorage.getItem('auth_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    // Fetch user profile by ID
    async fetchUserProfile(userId: number): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        return response.json();
    }

    // Update user profile
    async updateProfile(userId: number, data: {
        display_name?: string;
        nationality?: string;
        date_of_birth?: string;
        phone?: string;
        gender?: string;
    }): Promise<UserProfile> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update profile');
        }

        return response.json();
    }

    // Fetch user stats (wins, losses, total games, win rate)
    async fetchUserStats(userId: number): Promise<UserStats> {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/stats`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user stats');
        }

        return response.json();
    }

    // Fetch match history
    async fetchMatchHistory(limit: number = 10): Promise<GameHistory[]> {
        const response = await fetch(`${API_BASE_URL}/game/history?limit=${limit}`, {
            headers: this.getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch match history');
        }

        const data = await response.json();
        return data.games || [];
    }

    // Record a game result
    async recordGameResult(data: {
        player2_id?: number;
        player1_score: number;
        player2_score: number;
        winner_id?: number;
        game_mode: string;
    }): Promise<{ id: number }> {
        console.log('📊 ProfileService: Creating game record...', data);

        // First create the game
        const createResponse = await fetch(`${API_BASE_URL}/game/`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                player2_id: data.player2_id,
                game_mode: data.game_mode
            })
        });

        console.log('📊 ProfileService: Create game response status:', createResponse.status);

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error('📊 ProfileService: Create game failed:', errorText);
            throw new Error('Failed to create game record');
        }

        const game = await createResponse.json();
        console.log('📊 ProfileService: Game created with ID:', game.id);

        // Then update the score
        console.log('📊 ProfileService: Updating game score...');
        const updateResponse = await fetch(`${API_BASE_URL}/game/${game.id}/score`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({
                player1_score: data.player1_score,
                player2_score: data.player2_score,
                winner_id: data.winner_id
            })
        });

        console.log('📊 ProfileService: Update score response status:', updateResponse.status);

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('📊 ProfileService: Update score failed:', errorText);
            throw new Error('Failed to update game score');
        }

        console.log('📊 ProfileService: Game recorded successfully!');
        return { id: game.id };
    }

    // Calculate longest win streak from game history
    calculateLongestStreak(games: GameHistory[], userId: number): number {
        if (!games || games.length === 0) return 0;

        // Sort games by date (oldest first)
        const sortedGames = [...games].sort((a, b) =>
            new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
        );

        let longestStreak = 0;
        let currentStreak = 0;

        for (const game of sortedGames) {
            if (game.winner && game.winner.id === userId) {
                currentStreak++;
                longestStreak = Math.max(longestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }

        return longestStreak;
    }

    // Format date for "Member since" display
    formatMemberSince(dateString: string): string {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'long'
        };
        return date.toLocaleDateString('en-US', options);
    }

    // Format date for match history (relative time)
    formatMatchDate(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString();
    }
}
