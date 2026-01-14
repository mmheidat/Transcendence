// Profile controller for profile stats and match history

import { AuthService } from '../services/AuthService.js';
import { ProfileService } from '../services/ProfileService.js';

export class ProfileController {
    private authService: AuthService;
    private profileService: ProfileService;

    constructor() {
        this.authService = AuthService.getInstance();
        this.profileService = ProfileService.getInstance();
    }

    async loadProfileData(): Promise<void> {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        try {
            const [userProfile, stats, matchHistory] = await Promise.all([
                this.profileService.fetchUserProfile(user.id),
                this.profileService.fetchUserStats(user.id),
                this.profileService.fetchMatchHistory(10)
            ]);

            this.updateProfileHeader(userProfile);
            this.updateStats(stats);
            this.updateMatchHistory(matchHistory, user.id);
        } catch (error) {
            console.error('Failed to load profile data:', error);
            this.handleProfileLoadError();
        }
    }

    private updateProfileHeader(userProfile: any): void {
        const profilePlayerName = document.getElementById('profilePlayerName');
        const profileAvatar = document.getElementById('profileAvatar');
        const profileMemberSince = document.getElementById('profileMemberSince');

        if (profilePlayerName) {
            profilePlayerName.textContent = userProfile.display_name || userProfile.username;
        }

        if (profileAvatar) {
            if (userProfile.avatar_url) {
                profileAvatar.innerHTML = `<img src="${userProfile.avatar_url}" class="w-full h-full object-cover rounded-full" alt="Avatar">`;
            } else {
                const initials = (userProfile.display_name || userProfile.username).substring(0, 2).toUpperCase();
                profileAvatar.innerHTML = `<span id="profileAvatarInitials">${initials}</span>`;
            }
        }

        if (profileMemberSince && userProfile.created_at) {
            profileMemberSince.textContent = this.profileService.formatMemberSince(userProfile.created_at);
        } else if (profileMemberSince) {
            profileMemberSince.textContent = 'Recently joined';
        }
    }

    private updateStats(stats: any): void {
        const profileWinRate = document.getElementById('profileWinRate');
        const profileWinsLosses = document.getElementById('profileWinsLosses');
        const profileTotalGames = document.getElementById('profileTotalGames');
        const profileLongestStreak = document.getElementById('profileLongestStreak');

        if (profileWinRate) profileWinRate.textContent = `${stats.win_rate}%`;
        if (profileWinsLosses) profileWinsLosses.textContent = `${stats.wins}W - ${stats.losses}L`;
        if (profileTotalGames) profileTotalGames.textContent = stats.total_games.toString();
        if (profileLongestStreak) profileLongestStreak.textContent = stats.longest_streak.toString();
    }

    private updateMatchHistory(matchHistory: any[], userId: number): void {
        const profileMatchHistory = document.getElementById('profileMatchHistory');
        if (!profileMatchHistory) return;

        if (matchHistory.length === 0) {
            profileMatchHistory.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>No games played yet</p>
                </div>
            `;
            return;
        }

        profileMatchHistory.innerHTML = matchHistory.map(game => {
            const isWin = game.winner && game.winner.id === userId;

            let opponent: string;
            if (game.game_mode?.startsWith('ai_')) {
                opponent = 'AI';
            } else if (game.player2) {
                opponent = game.player1.id === userId
                    ? (game.player2.displayName || game.player2.username)
                    : (game.player1.displayName || game.player1.username);
            } else {
                opponent = 'Local Player';
            }

            const myScore = game.player1.id === userId ? game.player1_score : game.player2_score;
            const theirScore = game.player1.id === userId ? game.player2_score : game.player1_score;

            const bgClass = isWin ? 'bg-green-900 bg-opacity-30 border-green-500' : 'bg-red-900 bg-opacity-30 border-red-500';
            const textClass = isWin ? 'text-green-400' : 'text-red-400';
            const result = isWin ? 'W' : 'L';

            return `
                <div class="${bgClass} border rounded-lg p-4 flex items-center justify-between">
                    <div class="flex items-center space-x-4">
                        <span class="${textClass} font-bold text-xl">${result}</span>
                        <div>
                            <p class="text-white font-semibold">vs ${opponent}</p>
                            <p class="text-gray-400 text-sm">${this.profileService.formatMatchDate(game.played_at)}</p>
                        </div>
                    </div>
                    <span class="text-white font-bold text-xl">${myScore} - ${theirScore}</span>
                </div>
            `;
        }).join('');
    }

    private handleProfileLoadError(): void {
        const user = this.authService.getCurrentUser();
        const profilePlayerName = document.getElementById('profilePlayerName');
        const profileMemberSince = document.getElementById('profileMemberSince');
        const profileAvatar = document.getElementById('profileAvatar');

        if (profilePlayerName && user) {
            profilePlayerName.textContent = user.display_name || user.username;
        }

        if (profileMemberSince) {
            if (user?.created_at) {
                profileMemberSince.textContent = this.profileService.formatMemberSince(user.created_at);
            } else {
                profileMemberSince.textContent = 'N/A';
            }
        }

        if (profileAvatar && user) {
            if (user.avatar_url) {
                profileAvatar.innerHTML = `<img src="${user.avatar_url}" class="w-full h-full object-cover rounded-full" alt="Avatar">`;
            } else {
                const initials = (user.display_name || user.username).substring(0, 2).toUpperCase();
                profileAvatar.innerHTML = `<span>${initials}</span>`;
            }
        }

        // Set stats to defaults
        const profileWinRate = document.getElementById('profileWinRate');
        const profileWinsLosses = document.getElementById('profileWinsLosses');
        const profileTotalGames = document.getElementById('profileTotalGames');
        const profileLongestStreak = document.getElementById('profileLongestStreak');
        const profileMatchHistory = document.getElementById('profileMatchHistory');

        if (profileWinRate) profileWinRate.textContent = '0%';
        if (profileWinsLosses) profileWinsLosses.textContent = '0W - 0L';
        if (profileTotalGames) profileTotalGames.textContent = '0';
        if (profileLongestStreak) profileLongestStreak.textContent = '0';
        if (profileMatchHistory) {
            profileMatchHistory.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>Unable to load match history</p>
                </div>
            `;
        }
    }
}
