// Tournament controller for bracket management and match progression

import Game from '../game.js';

export interface TournamentState {
    players: string[];
    currentMatch: number;
    semi1Winner: string | null;
    semi2Winner: string | null;
    champion: string | null;
    active: boolean;
}

export class TournamentController {
    private tournament: TournamentState = {
        players: [],
        currentMatch: 0,
        semi1Winner: null,
        semi2Winner: null,
        champion: null,
        active: false
    };

    private currentGame: Game | null = null;

    // DOM elements
    private tournamentSetup: HTMLElement | null;
    private tournamentBracket: HTMLElement | null;
    private actualGameCanvas: HTMLElement | null;
    private gameModeSelection: HTMLElement | null;
    private gameMode: HTMLElement | null;
    private gameDifficulty: HTMLElement | null;

    constructor() {
        this.tournamentSetup = document.getElementById('tournamentSetup');
        this.tournamentBracket = document.getElementById('tournamentBracket');
        this.actualGameCanvas = document.getElementById('actualGameCanvas');
        this.gameModeSelection = document.getElementById('gameModeSelection');
        this.gameMode = document.getElementById('gameMode');
        this.gameDifficulty = document.getElementById('gameDifficulty');
    }

    setupEventListeners(): void {
        const selectTournamentMode = document.getElementById('selectTournamentMode');
        const backFromTournamentSetup = document.getElementById('backFromTournamentSetup');
        const startTournamentBtn = document.getElementById('startTournament');
        const playTournamentMatchBtn = document.getElementById('playTournamentMatch');
        const exitTournamentBtn = document.getElementById('exitTournament');

        selectTournamentMode?.addEventListener('click', () => {
            this.gameModeSelection?.classList.add('hidden');
            this.tournamentSetup?.classList.remove('hidden');
        });

        backFromTournamentSetup?.addEventListener('click', () => {
            this.tournamentSetup?.classList.add('hidden');
            this.gameModeSelection?.classList.remove('hidden');
        });

        startTournamentBtn?.addEventListener('click', () => {
            const p1 = (document.getElementById('tournamentPlayer1') as HTMLInputElement)?.value.trim() || 'Player 1';
            const p2 = (document.getElementById('tournamentPlayer2') as HTMLInputElement)?.value.trim() || 'Player 2';
            const p3 = (document.getElementById('tournamentPlayer3') as HTMLInputElement)?.value.trim() || 'Player 3';
            const p4 = (document.getElementById('tournamentPlayer4') as HTMLInputElement)?.value.trim() || 'Player 4';
            this.startTournament([p1, p2, p3, p4]);
        });

        playTournamentMatchBtn?.addEventListener('click', () => {
            this.playCurrentTournamentMatch();
        });

        exitTournamentBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to exit the tournament?')) {
                this.exitTournament();
            }
        });
    }

    startTournament(players: string[]): void {
        this.tournament = {
            players: players,
            currentMatch: 0,
            semi1Winner: null,
            semi2Winner: null,
            champion: null,
            active: true
        };

        this.updateBracketDisplay();
        this.tournamentSetup?.classList.add('hidden');
        this.tournamentBracket?.classList.remove('hidden');
        this.updateCurrentMatchDisplay();
    }

    private updateBracketDisplay(): void {
        const semi1P1 = document.getElementById('semi1Player1');
        const semi1P2 = document.getElementById('semi1Player2');
        const semi2P1 = document.getElementById('semi2Player1');
        const semi2P2 = document.getElementById('semi2Player2');
        const finalP1 = document.getElementById('finalPlayer1');
        const finalP2 = document.getElementById('finalPlayer2');
        const championEl = document.getElementById('tournamentChampion');

        if (semi1P1) semi1P1.textContent = this.tournament.players[0] || '-';
        if (semi1P2) semi1P2.textContent = this.tournament.players[1] || '-';
        if (semi2P1) semi2P1.textContent = this.tournament.players[2] || '-';
        if (semi2P2) semi2P2.textContent = this.tournament.players[3] || '-';
        if (finalP1) finalP1.textContent = this.tournament.semi1Winner || 'TBD';
        if (finalP2) finalP2.textContent = this.tournament.semi2Winner || 'TBD';
        if (championEl) championEl.textContent = this.tournament.champion || 'TBD';
    }

    private updateCurrentMatchDisplay(): void {
        const display = document.getElementById('currentMatchDisplay');
        const playBtn = document.getElementById('playTournamentMatch') as HTMLButtonElement;

        if (!display) return;

        if (this.tournament.currentMatch === 0) {
            display.textContent = `${this.tournament.players[0]} vs ${this.tournament.players[1]}`;
        } else if (this.tournament.currentMatch === 1) {
            display.textContent = `${this.tournament.players[2]} vs ${this.tournament.players[3]}`;
        } else if (this.tournament.currentMatch === 2) {
            display.textContent = `🏆 FINAL: ${this.tournament.semi1Winner} vs ${this.tournament.semi2Winner}`;
        } else {
            display.textContent = `👑 Champion: ${this.tournament.champion}!`;
            if (playBtn) playBtn.classList.add('hidden');
        }
    }

    playCurrentTournamentMatch(): void {
        if (!this.tournament.active) return;

        let player1Name: string, player2Name: string;

        if (this.tournament.currentMatch === 0) {
            player1Name = this.tournament.players[0];
            player2Name = this.tournament.players[1];
        } else if (this.tournament.currentMatch === 1) {
            player1Name = this.tournament.players[2];
            player2Name = this.tournament.players[3];
        } else if (this.tournament.currentMatch === 2) {
            player1Name = this.tournament.semi1Winner!;
            player2Name = this.tournament.semi2Winner!;
        } else {
            return;
        }

        this.tournamentBracket?.classList.add('hidden');
        this.actualGameCanvas?.classList.remove('hidden');

        if (this.currentGame) {
            this.currentGame.stop();
        }

        if (this.gameMode) this.gameMode.textContent = `Tournament Match ${this.tournament.currentMatch + 1}`;
        if (this.gameDifficulty) this.gameDifficulty.textContent = `${player1Name} vs ${player2Name}`;

        this.currentGame = new Game('gameCanvas', '1v1', 'medium', (winner) => {
            this.onTournamentMatchEnd(winner, player1Name, player2Name);
        });
        this.currentGame.start();
    }

    private onTournamentMatchEnd(winner: 'left' | 'right', player1Name: string, player2Name: string): void {
        const winnerName = winner === 'left' ? player1Name : player2Name;

        if (this.tournament.currentMatch === 0) {
            this.tournament.semi1Winner = winnerName;
            this.tournament.currentMatch = 1;
        } else if (this.tournament.currentMatch === 1) {
            this.tournament.semi2Winner = winnerName;
            this.tournament.currentMatch = 2;
        } else if (this.tournament.currentMatch === 2) {
            this.tournament.champion = winnerName;
            this.tournament.currentMatch = 3;
            this.tournament.active = false;
        }

        setTimeout(() => {
            this.actualGameCanvas?.classList.add('hidden');
            this.tournamentBracket?.classList.remove('hidden');
            this.updateBracketDisplay();
            this.updateCurrentMatchDisplay();

            if (this.tournament.champion) {
                alert(`🏆 ${this.tournament.champion} is the Tournament Champion! 🏆`);
            }
        }, 2000);
    }

    exitTournament(): void {
        this.tournament = {
            players: [],
            currentMatch: 0,
            semi1Winner: null,
            semi2Winner: null,
            champion: null,
            active: false
        };

        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }

        this.tournamentBracket?.classList.add('hidden');
        this.tournamentSetup?.classList.add('hidden');
        this.actualGameCanvas?.classList.add('hidden');
        this.gameModeSelection?.classList.remove('hidden');
    }

    isActive(): boolean {
        return this.tournament.active;
    }

    stopCurrentGame(): void {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
    }
}
