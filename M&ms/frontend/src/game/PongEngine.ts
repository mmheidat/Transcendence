import { Paddle } from './Paddle';
import { Ball } from './Ball';

export type GameMode = 'ai' | '1v1' | '2v2' | 'online' | 'tournament';

export class PongEngine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    leftPaddle: Paddle | null = null;
    rightPaddle: Paddle | null = null;
    leftPaddle2: Paddle | null = null;  // For 2v2 mode
    rightPaddle2: Paddle | null = null; // For 2v2 mode
    ball: Ball | null = null;
    leftScore: number = 0;
    rightScore: number = 0;

    // Key state passed from outside
    keys: { [key: string]: boolean } = {};

    aiDifficulty: 'easy' | 'medium' | 'hard' | null = null;
    isAIGame: boolean = false;
    gameMode: GameMode = '1v1';
    maxScore: number = 3;

    // Event callbacks
    onScoreUpdate?: (left: number, right: number) => void;
    onGameEnd?: (winner: 'left' | 'right', winnerName: string) => void;

    // Online game properties
    isOnlineGame: boolean = false;
    isHost: boolean = false;
    onlineStateCallback: ((state: any) => void) | null = null;
    onlinePaddleCallback: ((paddleY: number) => void) | null = null;
    lastPaddleSent: number = 0;

    constructor(
        canvas: HTMLCanvasElement,
        mode: GameMode = '1v1',
        difficulty: 'easy' | 'medium' | 'hard' = 'medium'
    ) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get 2D context');
        this.ctx = ctx;

        this.gameMode = mode;
        this.isAIGame = mode === 'ai';
        this.aiDifficulty = difficulty;

        this.resizeCanvas();
    }

    resizeCanvas(): void {
        const maxWidth = Math.min(800, window.innerWidth - 40);
        const aspectRatio = 800 / 400;
        this.canvas.width = maxWidth;
        this.canvas.height = maxWidth / aspectRatio;

        // Reposition paddles based on new width
        const paddleWidth = 10;
        const paddleOffset = 10;
        const paddleHeight = 80;

        // Determine Y position if paddles exist, otherwise keep default center or calculated
        // Actually, better to just update X, keeping Y relative or same. 
        // Since height changes, we should scale Y too or centering might break?
        // Let's just re-anchor X for now as that's the reported bug.

        if (this.rightPaddle) {
            this.rightPaddle.x = this.canvas.width - paddleOffset - paddleWidth;
        }

        // 2v2 Mode - Right side paddles
        if (this.gameMode === '2v2') {
            if (this.rightPaddle2) {
                this.rightPaddle2.x = this.canvas.width - paddleOffset - paddleWidth;
            }
        }
    }

    handleAI(deltaTime: number): void {
        if (!this.isAIGame || !this.rightPaddle || !this.ball) return;

        const paddleCenter = this.rightPaddle.y + this.rightPaddle.height / 2;
        const ballY = this.ball.y;
        const diff = ballY - paddleCenter;

        // AI speed based on difficulty (scaled for pixels/second)
        let aiSpeed = this.rightPaddle.speed;
        if (this.aiDifficulty === 'easy') {
            aiSpeed = 150; // Slower than default 400
            // Add randomness - 30% chance to not move (per frame, might need adjustment for time-based, but ok for now)
            if (Math.random() < 0.3) return;
        } else if (this.aiDifficulty === 'medium') {
            aiSpeed = 300;
        } else if (this.aiDifficulty === 'hard') {
            aiSpeed = 450; // Faster than player
        }

        const originalSpeed = this.rightPaddle.speed;
        this.rightPaddle.speed = aiSpeed;

        if (Math.abs(diff) > 10) {
            if (diff > 0) {
                this.rightPaddle.move(false, this.canvas.height, deltaTime);
            } else {
                this.rightPaddle.move(true, this.canvas.height, deltaTime);
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
                300, // Faster initial speed for 2v2 (pixels/sec)
                300
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

        // Enable fire effect for tournament mode
        if (this.ball && this.gameMode === 'tournament') {
            this.ball.isTournament = true;
        }
    }

    handlePaddleMovement(deltaTime: number): void {
        if (!this.leftPaddle || !this.rightPaddle) return;

        if (this.gameMode === '2v2') {
            // 2v2 mode controls
            // Player 1 (left-top): W/S keys
            if (this.keys['w'] || this.keys['W']) {
                this.leftPaddle.move(true, this.canvas.height, deltaTime);
            }
            if (this.keys['s'] || this.keys['S']) {
                this.leftPaddle.move(false, this.canvas.height, deltaTime);
            }

            // Player 2 (left-bottom): Q/A keys
            if (this.leftPaddle2) {
                if (this.keys['q'] || this.keys['Q']) {
                    this.leftPaddle2.move(true, this.canvas.height, deltaTime);
                }
                if (this.keys['a'] || this.keys['A']) {
                    this.leftPaddle2.move(false, this.canvas.height, deltaTime);
                }
            }

            // Player 3 (right-top): Arrow Up/Down
            if (this.keys['ArrowUp']) {
                this.rightPaddle.move(true, this.canvas.height, deltaTime);
            }
            if (this.keys['ArrowDown']) {
                this.rightPaddle.move(false, this.canvas.height, deltaTime);
            }

            // Player 4 (right-bottom): O/L keys
            if (this.rightPaddle2) {
                if (this.keys['o'] || this.keys['O']) {
                    this.rightPaddle2.move(true, this.canvas.height, deltaTime);
                }
                if (this.keys['l'] || this.keys['L']) {
                    this.rightPaddle2.move(false, this.canvas.height, deltaTime);
                }
            }
        } else if (this.isOnlineGame) {
            // Online Mode Restrictions
            if (this.isHost) {
                // Host controls Left Paddle (Player 1)
                // Allow WASD or Arrows for their own paddle for better UX
                if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) {
                    this.leftPaddle.move(true, this.canvas.height, deltaTime);
                }
                if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) {
                    this.leftPaddle.move(false, this.canvas.height, deltaTime);
                }
            } else {
                // Guest controls Right Paddle (Player 2)
                // Allow WASD or Arrows for their own paddle
                if (this.keys['w'] || this.keys['W'] || this.keys['ArrowUp']) {
                    this.rightPaddle.move(true, this.canvas.height, deltaTime);
                }
                if (this.keys['s'] || this.keys['S'] || this.keys['ArrowDown']) {
                    this.rightPaddle.move(false, this.canvas.height, deltaTime);
                }
            }
        } else {
            // Local 1v1 or AI mode controls
            // Left paddle controls (W/S)
            if (this.keys['w'] || this.keys['W']) {
                this.leftPaddle.move(true, this.canvas.height, deltaTime);
            }
            if (this.keys['s'] || this.keys['S']) {
                this.leftPaddle.move(false, this.canvas.height, deltaTime);
            }

            // Right paddle controls (Arrow Up/Down) - only in non-AI mode
            if (!this.isAIGame) {
                if (this.keys['ArrowUp']) {
                    this.rightPaddle.move(true, this.canvas.height, deltaTime);
                }
                if (this.keys['ArrowDown']) {
                    this.rightPaddle.move(false, this.canvas.height, deltaTime);
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
    }

    update(deltaTime: number): void {
        if (!this.ball || !this.leftPaddle || !this.rightPaddle) return;

        this.handlePaddleMovement(deltaTime);

        // In online mode, only host runs ball physics
        // Guest just receives state updates via applyOnlineState
        if (!this.isOnlineGame || this.isHost) {
            this.ball.move(deltaTime);

            // Collision detection
            this.ball.detectCollision(this.leftPaddle);
            this.ball.detectCollision(this.rightPaddle);

            // Additional collision for 2v2 mode
            if (this.gameMode === '2v2') {
                if (this.leftPaddle2) this.ball.detectCollision(this.leftPaddle2);
                if (this.rightPaddle2) this.ball.detectCollision(this.rightPaddle2);
            }

            if (this.isAIGame) {
                this.handleAI(deltaTime);
            }

            // Ball collision with top/bottom walls
            if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > this.canvas.height) {
                this.ball.speedY = -this.ball.speedY;
            }

            // Scoring
            if (this.ball.x < 0) {
                this.rightScore++;
                this.onScoreUpdate?.(this.leftScore, this.rightScore);
                this.checkWinner();
                this.resetBall();
            } else if (this.ball.x > this.canvas.width) {
                this.leftScore++;
                this.onScoreUpdate?.(this.leftScore, this.rightScore);
                this.checkWinner();
                this.resetBall();
            }
        }

        // Send online updates if in online mode
        this.sendOnlineUpdates();
    }

    checkWinner(): void {
        let winnerName: string | null = null;
        let winnerSide: 'left' | 'right' | null = null;

        if (this.leftScore >= this.maxScore) {
            winnerSide = 'left';
            if (this.gameMode === '2v2') {
                winnerName = 'Team Left (P1 & P2)';
            } else {
                winnerName = 'Player 1';
            }
        } else if (this.rightScore >= this.maxScore) {
            winnerSide = 'right';
            if (this.gameMode === '2v2') {
                winnerName = 'Team Right (P3 & P4)';
            } else {
                winnerName = this.isAIGame ? 'AI' : 'Player 2';
            }
        }

        if (winnerSide && winnerName) {
            this.onGameEnd?.(winnerSide, winnerName);
        }
    }

    resetBall(): void {
        if (this.ball) {
            this.ball.resetPosition(this.canvas.width, this.canvas.height);
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
        this.onScoreUpdate?.(this.leftScore, this.rightScore);
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
