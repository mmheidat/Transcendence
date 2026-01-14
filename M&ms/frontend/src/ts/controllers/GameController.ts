// Game controller for game mode selection and game start/stop

import Game from '../game.js';
import { AuthService } from '../services/AuthService.js';
import { ProfileService } from '../services/ProfileService.js';
import { GameSocketService } from '../services/GameSocketService.js';
import { showNotification } from '../utils/NotificationUtils.js';

export class GameController {
    private authService: AuthService;
    private profileService: ProfileService;
    private gameSocketService: GameSocketService;
    private currentGame: Game | null = null;

    // DOM elements
    private gameModeSelection: HTMLElement | null;
    private aiDifficultySelection: HTMLElement | null;
    private actualGameCanvas: HTMLElement | null;
    private gameMode: HTMLElement | null;
    private gameDifficulty: HTMLElement | null;

    // Callbacks
    private onShowGameModeSelection: (() => void) | null = null;

    constructor() {
        this.authService = AuthService.getInstance();
        this.profileService = ProfileService.getInstance();
        this.gameSocketService = GameSocketService.getInstance();

        this.gameModeSelection = document.getElementById('gameModeSelection');
        this.aiDifficultySelection = document.getElementById('aiDifficultySelection');
        this.actualGameCanvas = document.getElementById('actualGameCanvas');
        this.gameMode = document.getElementById('gameMode');
        this.gameDifficulty = document.getElementById('gameDifficulty');
    }

    setOnShowGameModeSelection(callback: () => void): void {
        this.onShowGameModeSelection = callback;
    }

    getCurrentGame(): Game | null {
        return this.currentGame;
    }

    stopCurrentGame(): void {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
    }

    setupEventListeners(): void {
        const selectAIMode = document.getElementById('selectAIMode');
        const selectMultiplayerMode = document.getElementById('selectMultiplayerMode');
        const select2v2Mode = document.getElementById('select2v2Mode');
        const backToMenu = document.getElementById('backToMenu');
        const backToGameMode = document.getElementById('backToGameMode');
        const quitGame = document.getElementById('quitGame');
        const startAIGameBtns = document.querySelectorAll('.start-ai-game');

        selectAIMode?.addEventListener('click', () => {
            this.gameModeSelection?.classList.add('hidden');
            this.aiDifficultySelection?.classList.remove('hidden');
        });

        selectMultiplayerMode?.addEventListener('click', () => {
            this.gameModeSelection?.classList.add('hidden');
            this.startLocalGame('1v1');
        });

        select2v2Mode?.addEventListener('click', () => {
            this.gameModeSelection?.classList.add('hidden');
            this.startLocalGame('2v2');
        });

        backToMenu?.addEventListener('click', () => {
            window.history.back();
        });

        backToGameMode?.addEventListener('click', () => {
            this.aiDifficultySelection?.classList.add('hidden');
            this.gameModeSelection?.classList.remove('hidden');
        });

        startAIGameBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const difficulty = target.getAttribute('data-difficulty');
                if (difficulty) this.startAIGame(difficulty);
            });
        });

        quitGame?.addEventListener('click', async () => {
            await this.handleQuitGame();
        });
    }

    private async handleQuitGame(): Promise<void> {
        if (this.currentGame && this.currentGame.gameRunning) {
            const confirmExit = confirm(
                '⚠️ Warning: Leaving now will count as a LOSS!\n\n' +
                'This match will be recorded in your match history as a loss (Leaver).\n\n' +
                'Are you sure you want to quit?'
            );

            if (!confirmExit) return;

            const user = this.authService.getCurrentUser();
            if (user) {
                try {
                    const leftScore = this.currentGame.leftScore;
                    const rightScore = Math.max(this.currentGame.rightScore, 3);
                    const isAI = this.currentGame.isAIGame;

                    await this.profileService.recordGameResult({
                        player2_id: undefined,
                        player1_score: leftScore,
                        player2_score: rightScore,
                        winner_id: undefined,
                        game_mode: isAI ? 'ai_forfeit' : 'pvp_forfeit'
                    });
                    console.log('Game recorded as forfeit/loss');
                } catch (error) {
                    console.error('Failed to record game forfeit:', error);
                }
            }
        }

        this.stopCurrentGame();
        this.actualGameCanvas?.classList.add('hidden');
        this.gameModeSelection?.classList.remove('hidden');

        const player1Score = document.getElementById('player1Score');
        const player2Score = document.getElementById('player2Score');
        if (player1Score) player1Score.textContent = '0';
        if (player2Score) player2Score.textContent = '0';
    }

    startAIGame(difficulty: string): void {
        this.aiDifficultySelection?.classList.add('hidden');
        this.actualGameCanvas?.classList.remove('hidden');

        if (this.gameMode) this.gameMode.textContent = `VS AI - ${difficulty.toUpperCase()}`;
        if (this.gameDifficulty) this.gameDifficulty.textContent = `Difficulty: ${difficulty}`;

        try {
            this.currentGame = new Game('gameCanvas', 'ai', difficulty as 'easy' | 'medium' | 'hard', async (winner) => {
                const user = this.authService.getCurrentUser();
                console.log('🎮 Game ended, winner side:', winner, 'user:', user?.id);

                if (user && this.currentGame) {
                    const finalLeftScore = this.currentGame.leftScore;
                    const finalRightScore = this.currentGame.rightScore;
                    const player1Won = winner === 'left';

                    try {
                        await this.profileService.recordGameResult({
                            player2_id: undefined,
                            player1_score: finalLeftScore,
                            player2_score: finalRightScore,
                            winner_id: player1Won ? user.id : undefined,
                            game_mode: `ai_${difficulty}`
                        });
                        console.log('✅ AI game recorded successfully');
                    } catch (error) {
                        console.error('❌ Failed to record AI game:', error);
                    }
                }
            });
            this.currentGame.start();
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start game. Please try again.');
            this.actualGameCanvas?.classList.add('hidden');
            this.gameModeSelection?.classList.remove('hidden');
        }
    }

    startLocalGame(mode: '1v1' | '2v2'): void {
        this.actualGameCanvas?.classList.remove('hidden');

        if (mode === '1v1') {
            if (this.gameMode) this.gameMode.textContent = '1v1 Local Match';
            if (this.gameDifficulty) this.gameDifficulty.textContent = 'P1: W/S | P2: ↑/↓';
        } else {
            if (this.gameMode) this.gameMode.textContent = '2v2 Team Match';
            if (this.gameDifficulty) this.gameDifficulty.textContent = 'Left: W/S, Q/A | Right: ↑/↓, O/L';
        }

        try {
            this.currentGame = new Game('gameCanvas', mode, 'medium', async (winner) => {
                const user = this.authService.getCurrentUser();
                if (user && this.currentGame) {
                    try {
                        const player1Won = winner === 'left';
                        await this.profileService.recordGameResult({
                            player2_id: undefined,
                            player1_score: this.currentGame.leftScore,
                            player2_score: this.currentGame.rightScore,
                            winner_id: player1Won ? user.id : undefined,
                            game_mode: mode
                        });
                        console.log(`${mode} game recorded successfully`);
                    } catch (error) {
                        console.error(`Failed to record ${mode} game:`, error);
                    }
                }
            });
            this.currentGame.start();
        } catch (error) {
            console.error('Failed to start game:', error);
            alert('Failed to start game. Please try again.');
            this.actualGameCanvas?.classList.add('hidden');
            this.gameModeSelection?.classList.remove('hidden');
        }
    }

    startOnlineGame(opponentId: number, isHost: boolean, dbGameId: number, onShowSection: (section: string) => void): void {
        onShowSection('game');
        this.gameModeSelection?.classList.add('hidden');
        this.actualGameCanvas?.classList.remove('hidden');

        const user = this.authService.getCurrentUser();
        if (this.gameMode) this.gameMode.textContent = 'Online Match';
        if (this.gameDifficulty) this.gameDifficulty.textContent = isHost ? 'You are hosting (Left)' : 'You are guest (Right)';

        try {
            this.currentGame = new Game('gameCanvas', 'online', 'medium', async (winner) => {
                if (user && this.currentGame) {
                    const player1Won = winner === 'left';
                    const winnerId = isHost
                        ? (player1Won ? user.id : opponentId)
                        : (player1Won ? opponentId : user.id);

                    this.gameSocketService.sendGameEnd(
                        winnerId,
                        this.currentGame.leftScore,
                        this.currentGame.rightScore
                    );

                    this.gameSocketService.endCurrentGame();
                    showNotification(
                        winnerId === user.id ? '🎉 You won!' : '😔 You lost!',
                        winnerId === user.id ? 'success' : 'info'
                    );
                }
            });

            if (isHost) {
                this.currentGame.setOnlineStateCallback((state) => {
                    this.gameSocketService.sendGameState(state);
                });
            } else {
                this.gameSocketService.on('game_state', (message) => {
                    if (this.currentGame && message.state) {
                        this.currentGame.applyOnlineState(message.state);
                    }
                });
            }

            this.currentGame.setOnlinePaddleCallback((paddleY) => {
                this.gameSocketService.sendPaddleUpdate(paddleY);
            });

            this.gameSocketService.on('game_paddle_update', (message) => {
                if (this.currentGame) {
                    this.currentGame.setOpponentPaddle(message.paddle_y, isHost);
                }
            });

            this.gameSocketService.on('game_ended', (message) => {
                if (this.currentGame) {
                    this.currentGame.stop();
                    const wonGame = message.winner_id === user?.id;
                    showNotification(
                        wonGame ? '🎉 You won!' : '😔 You lost!',
                        wonGame ? 'success' : 'info'
                    );
                    this.gameSocketService.endCurrentGame();
                }
            });

            this.currentGame.setIsHost(isHost);
            this.currentGame.start();
            console.log(`🎮 Online game started, isHost: ${isHost}, dbGameId: ${dbGameId}`);
        } catch (error) {
            console.error('Failed to start online game:', error);
            showNotification('Failed to start online game', 'error');
            this.actualGameCanvas?.classList.add('hidden');
            this.gameModeSelection?.classList.remove('hidden');
        }
    }

    showGameModeSelection(): void {
        this.gameModeSelection?.classList.remove('hidden');
        this.aiDifficultySelection?.classList.add('hidden');
        this.actualGameCanvas?.classList.add('hidden');
    }
}
