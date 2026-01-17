import Paddle from './paddle';
import Ball from './ball';

type GameMode = 'ai' | '1v1' | '2v2' | 'online';

class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    leftPaddle: Paddle | null = null;
    rightPaddle: Paddle | null = null;
    leftPaddle2: Paddle | null = null;  // For 2v2 mode
    rightPaddle2: Paddle | null = null; // For 2v2 mode
    ball: Ball | null = null;
    leftScore: number = 0;
    rightScore: number = 0;
    gameRunning: boolean = true;
    keys: { [key: string]: boolean } = {};
    aiDifficulty: 'easy' | 'medium' | 'hard' | null = null;
    isAIGame: boolean = false;
    gameMode: GameMode = '1v1';
    animationId: number | null = null;
    maxScore: number = 3; // First to 3 wins
    winnerName: string | null = null;
    isPaused: boolean = false;
    onGameEnd: ((winner: 'left' | 'right') => void) | null = null;

    // Online game properties
    private isOnlineGame: boolean = false;
    private isHost: boolean = false;
    private onlineStateCallback: ((state: any) => void) | null = null;
    private onlinePaddleCallback: ((paddleY: number) => void) | null = null;
    private lastPaddleSent: number = 0;

    private handleResize = () => {
        this.resizeCanvas();
    };

    constructor(canvasId: string, mode: GameMode = '1v1', difficulty: 'easy' | 'medium' | 'hard' = 'medium', onGameEnd?: (winner: 'left' | 'right') => void) {
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found`);
        }
        this.gameMode = mode;
        this.isAIGame = mode === 'ai';
        this.aiDifficulty = difficulty;
        this.canvas = canvas;
        this.onGameEnd = onGameEnd || null;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context');
        }
        this.ctx = ctx;

        // Responsive canvas sizing
        this.resizeCanvas();
        window.addEventListener('resize', this.handleResize);
        this.setupControls();
    }

    resizeCanvas(): void {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = 800 / 400;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth / aspectRatio;
    }



    handleAI(): void {
        if (!this.isAIGame || !this.rightPaddle || !this.ball) return;

        const paddleCenter = this.rightPaddle.y + this.rightPaddle.height / 2;
        const ballY = this.ball.y;
        const diff = ballY - paddleCenter;

        // AI speed based on difficulty
        let aiSpeed = this.rightPaddle.speed;
        if (this.aiDifficulty === 'easy') {
            aiSpeed = 2;
            // Add randomness - 30% chance to not move
            if (Math.random() < 0.3) return;
        } else if (this.aiDifficulty === 'medium') {
            aiSpeed = 4;
        } else if (this.aiDifficulty === 'hard') {
            aiSpeed = 6;
        }

        const originalSpeed = this.rightPaddle.speed;
        this.rightPaddle.speed = aiSpeed;

        if (Math.abs(diff) > 10) {
            if (diff > 0) {
                this.rightPaddle.move(false, this.canvas.height);
            } else {
                this.rightPaddle.move(true, this.canvas.height);
            }
        }

        // Restore original speed
        this.rightPaddle.speed = originalSpeed;
    }

    setup(): void {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const paddleOffset = 10;

        if (this.gameMode === '2v2') {
            // 2v2 mode: 4 paddles, 2 on each side
            const quarterHeight = this.canvas.height / 4;

            // Left side - Player 1 (top) and Player 2 (bottom)
            this.leftPaddle = new Paddle(
                paddleOffset,
                quarterHeight - paddleHeight / 2,
                paddleWidth,
                paddleHeight,
                '#a855f7' // Purple for P1
            );
            this.leftPaddle2 = new Paddle(
                paddleOffset,
                quarterHeight * 3 - paddleHeight / 2,
                paddleWidth,
                paddleHeight,
                '#ec4899' // Pink for P2
            );

            // Right side - Player 3 (top) and Player 4 (bottom)
            this.rightPaddle = new Paddle(
                this.canvas.width - paddleOffset - paddleWidth,
                quarterHeight - paddleHeight / 2,
                paddleWidth,
                paddleHeight,
                '#3b82f6' // Blue for P3
            );
            this.rightPaddle2 = new Paddle(
                this.canvas.width - paddleOffset - paddleWidth,
                quarterHeight * 3 - paddleHeight / 2,
                paddleWidth,
                paddleHeight,
                '#22c55e' // Green for P4
            );

            // Faster ball for 2v2
            this.ball = new Ball(
                this.canvas.width / 2,
                this.canvas.height / 2,
                10,
                5, // Faster initial speed
                5
            );
        } else {
            // 1v1 or AI mode: 2 paddles
            this.leftPaddle = new Paddle(
                paddleOffset,
                this.canvas.height / 2 - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );

            this.rightPaddle = new Paddle(
                this.canvas.width - paddleOffset - paddleWidth,
                this.canvas.height / 2 - paddleHeight / 2,
                paddleWidth,
                paddleHeight
            );

            this.ball = new Ball(
                this.canvas.width / 2,
                this.canvas.height / 2,
                10
            );
        }
    }

    handlePaddleMovement(): void {
        if (!this.leftPaddle || !this.rightPaddle) return;

        if (this.gameMode === '2v2') {
            // 2v2 mode controls
            // Player 1 (left-top): W/S keys
            if (this.keys['w'] || this.keys['W']) {
                this.leftPaddle.move(true, this.canvas.height);
            }
            if (this.keys['s'] || this.keys['S']) {
                this.leftPaddle.move(false, this.canvas.height);
            }

            // Player 2 (left-bottom): Q/A keys
            if (this.leftPaddle2) {
                if (this.keys['q'] || this.keys['Q']) {
                    this.leftPaddle2.move(true, this.canvas.height);
                }
                if (this.keys['a'] || this.keys['A']) {
                    this.leftPaddle2.move(false, this.canvas.height);
                }
            }

            // Player 3 (right-top): Arrow Up/Down
            if (this.keys['ArrowUp']) {
                this.rightPaddle.move(true, this.canvas.height);
            }
            if (this.keys['ArrowDown']) {
                this.rightPaddle.move(false, this.canvas.height);
            }

            // Player 4 (right-bottom): O/L keys
            if (this.rightPaddle2) {
                if (this.keys['o'] || this.keys['O']) {
                    this.rightPaddle2.move(true, this.canvas.height);
                }
                if (this.keys['l'] || this.keys['L']) {
                    this.rightPaddle2.move(false, this.canvas.height);
                }
            }
        } else {
            // 1v1 or AI mode controls
            // Left paddle controls (W/S)
            if (this.keys['w'] || this.keys['W']) {
                this.leftPaddle.move(true, this.canvas.height);
            }
            if (this.keys['s'] || this.keys['S']) {
                this.leftPaddle.move(false, this.canvas.height);
            }

            // Right paddle controls (Arrow Up/Down) - only in non-AI mode
            if (!this.isAIGame) {
                if (this.keys['ArrowUp']) {
                    this.rightPaddle.move(true, this.canvas.height);
                }
                if (this.keys['ArrowDown']) {
                    this.rightPaddle.move(false, this.canvas.height);
                }
            }
        }
    }

    draw(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = 'white';
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw paddles
        if (this.leftPaddle) this.leftPaddle.render(this.ctx);
        if (this.rightPaddle) this.rightPaddle.render(this.ctx);

        // Draw additional paddles for 2v2
        if (this.gameMode === '2v2') {
            if (this.leftPaddle2) this.leftPaddle2.render(this.ctx);
            if (this.rightPaddle2) this.rightPaddle2.render(this.ctx);
        }

        if (this.ball) this.ball.draw(this.ctx);

        // Update scores on screen (with null checks)
        this.updateScoreDisplay();
    }

    private updateScoreDisplay(): void {
        const player1ScoreElement = document.getElementById('player1Score');
        const player2ScoreElement = document.getElementById('player2Score');
        if (player1ScoreElement) player1ScoreElement.textContent = this.leftScore.toString();
        if (player2ScoreElement) player2ScoreElement.textContent = this.rightScore.toString();
    }

    update(): void {
        if (!this.gameRunning || !this.ball || !this.leftPaddle || !this.rightPaddle) return;

        // Check pause BEFORE any updates
        if (this.isPaused) return;

        this.handlePaddleMovement();

        // In online mode, only host runs ball physics
        // Guest just receives state updates via applyOnlineState
        if (!this.isOnlineGame || this.isHost) {
            this.ball.move();

            // Collision detection
            this.ball.detectCollision(this.leftPaddle);
            this.ball.detectCollision(this.rightPaddle);

            // Additional collision for 2v2 mode
            if (this.gameMode === '2v2') {
                if (this.leftPaddle2) this.ball.detectCollision(this.leftPaddle2);
                if (this.rightPaddle2) this.ball.detectCollision(this.rightPaddle2);
            }

            if (this.isAIGame) {
                this.handleAI();
            }

            // Ball collision with top/bottom walls
            if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.canvas.height) {
                this.ball.speedY = -this.ball.speedY;
            }

            // Scoring
            if (this.ball.x < 0) {
                this.rightScore++;
                this.checkWinner();
                if (!this.gameRunning) return;
                this.resetBall();
            } else if (this.ball.x > this.canvas.width) {
                this.leftScore++;
                this.checkWinner();
                if (!this.gameRunning) return;
                this.resetBall();
            }
        }

        // Send online updates if in online mode
        this.sendOnlineUpdates();
    }

    checkWinner(): void {
        if (!this.gameRunning) return; // Prevent multiple winner checks

        if (this.leftScore >= this.maxScore) {
            if (this.gameMode === '2v2') {
                this.winnerName = 'Team Left (P1 & P2)';
            } else {
                this.winnerName = 'Player 1';
            }
            this.endGame();
        } else if (this.rightScore >= this.maxScore) {
            if (this.gameMode === '2v2') {
                this.winnerName = 'Team Right (P3 & P4)';
            } else {
                this.winnerName = this.isAIGame ? 'AI' : 'Player 2';
            }
            this.endGame();
        }
    }

    endGame(): void {
        this.gameRunning = false;

        // Determine winner side
        const winnerSide: 'left' | 'right' = this.leftScore > this.rightScore ? 'left' : 'right';

        // Call the game end callback for recording (if provided)
        // This is called for both tournament and regular games
        if (this.onGameEnd) {
            this.onGameEnd(winnerSide);
            // For tournament mode, skip the modal (tournament handles UI)
            // Check if this is a tournament game by looking at the callback context
            // Tournament games don't need the modal since tournament UI handles it
            if (this.gameMode !== 'ai' && this.gameMode !== '1v1' && this.gameMode !== '2v2') {
                return;
            }
        }

        // Clean up any existing game over modal first
        const existingModal = document.querySelector('#actualGameCanvas > .absolute.inset-0');
        existingModal?.remove();

        // Show game over modal
        const gameOverDiv = document.createElement('div');
        gameOverDiv.className = 'game-over-modal absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50';
        gameOverDiv.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 text-center">
                <h2 class="text-4xl font-bold text-white mb-4">Game Over!</h2>
                <p class="text-2xl text-indigo-400 mb-6">${this.winnerName} Wins! 🎉</p>
                <p class="text-white text-xl mb-8">Final Score: ${this.leftScore} - ${this.rightScore}</p>
                <button id="playAgainBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 mr-4">
                    Play Again
                </button>
                <button id="exitGameBtn" class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                    Exit to Menu
                </button>
            </div>
        `;

        document.getElementById('actualGameCanvas')?.appendChild(gameOverDiv);

        // Use one-time event listeners to prevent memory leaks
        const playAgainBtn = document.getElementById('playAgainBtn');
        const exitGameBtn = document.getElementById('exitGameBtn');

        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                gameOverDiv.remove();
                this.restart();
            }, { once: true });
        }

        if (exitGameBtn) {
            exitGameBtn.addEventListener('click', () => {
                gameOverDiv.remove();
                document.getElementById('quitGame')?.click();
            }, { once: true });
        }
    }

    restart(): void {
        this.leftScore = 0;
        this.rightScore = 0;
        this.gameRunning = true;
        this.winnerName = null;
        this.isPaused = false;
        this.keys = {}; // Clear key states
        document.getElementById('pauseOverlay')?.remove();
        this.updateScoreDisplay(); // Update UI immediately
        this.setup();
        this.gameLoop(); // CRITICAL: Must restart animation loop
    }

    resetBall(): void {
        if (this.ball) {
            this.ball.resetPosition(this.canvas.width, this.canvas.height);
        }
    }

    gameLoop = (): void => {
        this.draw();
        this.update();
        if (this.gameRunning) {
            this.animationId = requestAnimationFrame(this.gameLoop);
        }
    }

    start(): void {
        this.setup();
        this.gameRunning = true;
        this.gameLoop();
    }

    stop(): void {
        this.gameRunning = false;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up ALL overlays
        document.getElementById('pauseOverlay')?.remove();
        // Remove game over modal (uses class selector since it doesn't have an ID)
        const gameOverModal = document.querySelector('#actualGameCanvas > .absolute.inset-0.flex.items-center.justify-center.bg-black.bg-opacity-75.z-50');
        gameOverModal?.remove();

        this.isPaused = false;

        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('resize', this.handleResize);
    }

    private handleKeyUp = (e: KeyboardEvent) => {
        this.keys[e.key] = false;
    };

    setupControls(): void {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    // Add pause on ESC key
    private handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            this.togglePause();
        }
        this.keys[e.key] = true;
    };

    togglePause(): void {
        if (!this.gameRunning) return; // Don't allow pause if game is over

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            // Remove existing overlay first (safety check)
            document.getElementById('pauseOverlay')?.remove();

            // Show pause overlay
            const pauseOverlay = document.createElement('div');
            pauseOverlay.id = 'pauseOverlay';
            pauseOverlay.className = 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-40';
            pauseOverlay.innerHTML = `
                <div class="text-center">
                    <h2 class="text-4xl font-bold text-white mb-4">PAUSED</h2>
                    <p class="text-gray-400">Press ESC to resume</p>
                </div>
            `;
            document.getElementById('actualGameCanvas')?.appendChild(pauseOverlay);
        } else {
            // Remove pause overlay
            document.getElementById('pauseOverlay')?.remove();
        }
    }

    // ============================================================================
    // ONLINE GAME METHODS
    // ============================================================================

    setIsHost(isHost: boolean): void {
        this.isHost = isHost;
        this.isOnlineGame = true;
    }

    setOnlineStateCallback(callback: (state: any) => void): void {
        this.onlineStateCallback = callback;
    }

    setOnlinePaddleCallback(callback: (paddleY: number) => void): void {
        this.onlinePaddleCallback = callback;
    }

    // Apply game state received from host (for guest)
    applyOnlineState(state: {
        ball_x: number;
        ball_y: number;
        ball_dx: number;
        ball_dy: number;
        left_paddle_y: number;
        right_paddle_y: number;
        left_score: number;
        right_score: number;
    }): void {
        if (!this.isOnlineGame || this.isHost) return;

        if (this.ball) {
            this.ball.x = state.ball_x;
            this.ball.y = state.ball_y;
            this.ball.speedX = state.ball_dx;
            this.ball.speedY = state.ball_dy;
        }

        if (this.leftPaddle) {
            this.leftPaddle.y = state.left_paddle_y;
        }

        this.leftScore = state.left_score;
        this.rightScore = state.right_score;
        this.updateScoreDisplay();
    }

    // Set opponent's paddle position
    setOpponentPaddle(paddleY: number, isHost: boolean): void {
        if (!this.isOnlineGame) return;

        // Host controls left paddle, so opponent is right
        // Guest controls right paddle, so opponent is left
        const targetPaddle = isHost ? this.rightPaddle : this.leftPaddle;
        if (targetPaddle) {
            targetPaddle.y = paddleY;
        }
    }

    // Get current game state for sending to opponent (host only)
    getGameState(): any {
        return {
            ball_x: this.ball?.x || 0,
            ball_y: this.ball?.y || 0,
            ball_dx: this.ball?.speedX || 0,
            ball_dy: this.ball?.speedY || 0,
            left_paddle_y: this.leftPaddle?.y || 0,
            right_paddle_y: this.rightPaddle?.y || 0,
            left_score: this.leftScore,
            right_score: this.rightScore
        };
    }

    // Send game state updates (called from game loop for host)
    private sendOnlineUpdates(): void {
        if (!this.isOnlineGame) return;

        const now = Date.now();

        // Send paddle position at 30fps
        if (this.onlinePaddleCallback && now - this.lastPaddleSent > 33) {
            const myPaddle = this.isHost ? this.leftPaddle : this.rightPaddle;
            if (myPaddle) {
                this.onlinePaddleCallback(myPaddle.y);
                this.lastPaddleSent = now;
            }
        }

        // Host sends full game state at 30fps
        if (this.isHost && this.onlineStateCallback) {
            this.onlineStateCallback(this.getGameState());
        }
    }
}

export default Game;