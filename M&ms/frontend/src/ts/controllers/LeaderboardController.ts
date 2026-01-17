// Leaderboard controller for rankings display

import { API_BASE_URL } from '../config.js';

interface LeaderboardPlayer {
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    wins: number;
    total_games: number;
    win_rate: string;
}

export class LeaderboardController {
    async loadLeaderboard(): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/game/leaderboard?limit=10`);

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            const leaderboard: LeaderboardPlayer[] = data.leaderboard || [];

            this.updatePodium(leaderboard);
            this.updateOtherRankings(leaderboard);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.handleLoadError();
        }
    }

    private updatePodium(leaderboard: LeaderboardPlayer[]): void {
        const name1st = document.getElementById('leaderboard1stName');
        const wins1st = document.getElementById('leaderboard1stWins');
        const name2nd = document.getElementById('leaderboard2ndName');
        const wins2nd = document.getElementById('leaderboard2ndWins');
        const name3rd = document.getElementById('leaderboard3rdName');
        const wins3rd = document.getElementById('leaderboard3rdWins');

        if (leaderboard[0]) {
            if (name1st) name1st.textContent = leaderboard[0].display_name || leaderboard[0].username;
            if (wins1st) wins1st.textContent = leaderboard[0].wins.toString();
        }

        if (leaderboard[1]) {
            if (name2nd) name2nd.textContent = leaderboard[1].display_name || leaderboard[1].username;
            if (wins2nd) wins2nd.textContent = leaderboard[1].wins.toString();
        }

        if (leaderboard[2]) {
            if (name3rd) name3rd.textContent = leaderboard[2].display_name || leaderboard[2].username;
            if (wins3rd) wins3rd.textContent = leaderboard[2].wins.toString();
        }
    }

    private updateOtherRankings(leaderboard: LeaderboardPlayer[]): void {
        const otherRankings = document.getElementById('leaderboardOtherRankings');
        if (!otherRankings) return;

        if (leaderboard.length > 3) {
            const othersHtml = leaderboard.slice(3).map((player, index) => `
                <div class="flex items-center justify-between bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition duration-300">
                    <div class="flex items-center space-x-4">
                        <span class="text-gray-400 font-bold text-lg w-8">${index + 4}</span>
                        <span class="text-white font-semibold">${player.display_name || player.username}</span>
                    </div>
                    <span class="text-indigo-400 font-bold">${player.wins} wins</span>
                </div>
            `).join('');
            otherRankings.innerHTML = othersHtml;
        } else if (leaderboard.length === 0) {
            otherRankings.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>No players yet. Play some games to rank up!</p>
                </div>
            `;
        } else {
            otherRankings.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>Play more games to fill the rankings!</p>
                </div>
            `;
        }
    }

    private handleLoadError(): void {
        const otherRankings = document.getElementById('leaderboardOtherRankings');
        if (otherRankings) {
            otherRankings.innerHTML = `
                <div class="text-gray-400 text-center py-4">
                    <p>Unable to load rankings</p>
                </div>
            `;
        }
    }
}
