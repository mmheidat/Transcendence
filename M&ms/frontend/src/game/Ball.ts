import { Paddle } from './Paddle';

interface FireParticle {
    x: number;
    y: number;
    size: number;
    alpha: number;
    color: string;
}

export class Ball {
    x: number;
    y: number;
    radius: number;
    speedX: number;
    speedY: number;
    maxSpeed: number = 800; // pixels per second
    isTournament: boolean = false;

    // Fire effect properties
    private fireParticles: FireParticle[] = [];
    private fireColors: string[] = ['#ff4500', '#ff6b35', '#ff8c00', '#ffa500', '#ffcc00', '#fff200'];

    // Previous position for CCD
    prevX: number;
    prevY: number;

    constructor(x: number, y: number, radius: number, speedX: number = 200, speedY: number = 200) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.radius = radius;
        this.speedX = speedX;
        this.speedY = speedY;
    }

    move(deltaTime: number): void {
        this.prevX = this.x;
        this.prevY = this.y;

        // Add fire particles when moving in tournament mode
        if (this.isTournament) {
            this.addFireParticles();
            this.updateFireParticles();
        }

        this.x += this.speedX * deltaTime;
        this.y += this.speedY * deltaTime;
    }

    private addFireParticles(): void {
        // Add multiple particles per frame for a dense trail
        for (let i = 0; i < 3; i++) {
            const angle = Math.atan2(-this.speedY, -this.speedX);
            const spread = (Math.random() - 0.5) * 0.8;
            const distance = Math.random() * this.radius * 0.5;

            this.fireParticles.push({
                x: this.x + Math.cos(angle + spread) * distance,
                y: this.y + Math.sin(angle + spread) * distance,
                size: this.radius * (0.3 + Math.random() * 0.7),
                alpha: 0.8 + Math.random() * 0.2,
                color: this.fireColors[Math.floor(Math.random() * this.fireColors.length)]
            });
        }
    }

    private updateFireParticles(): void {
        // Update and fade particles
        for (let i = this.fireParticles.length - 1; i >= 0; i--) {
            const particle = this.fireParticles[i];
            particle.alpha -= 0.05;
            particle.size *= 0.92;

            // Remove faded particles
            if (particle.alpha <= 0 || particle.size < 0.5) {
                this.fireParticles.splice(i, 1);
            }
        }

        // Limit total particles for performance
        if (this.fireParticles.length > 50) {
            this.fireParticles.splice(0, this.fireParticles.length - 50);
        }
    }

    resetPosition(canvasWidth: number, canvasHeight: number): void {
        this.x = canvasWidth / 2;
        this.y = canvasHeight / 2;
        this.prevX = this.x;
        this.prevY = this.y;
        this.speedX = -this.speedX;
        // Clear fire particles on reset
        this.fireParticles = [];
    }

    detectCollision(paddle: Paddle): void {
        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + paddle.width;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + paddle.height;

        // Determine collision direction based on velocity
        // If moving right, we check collision with left face of paddle
        // If moving left, we check collision with right face of paddle
        const movingRight = this.speedX > 0;

        // Check temporal overlap (CCD)
        // Check if we crossed the paddle horizontally
        let crossedX = false;

        if (movingRight) {
            // Moving right: Check if we crossed paddle's left edge
            crossedX = this.prevX - this.radius <= paddleLeft && this.x + this.radius >= paddleLeft;
        } else {
            // Moving left: Check if we crossed paddle's right edge
            crossedX = this.prevX + this.radius >= paddleRight && this.x - this.radius <= paddleRight;
        }

        // Standard AABB overlap check as fallback (for low speeds)
        const overlaps = (
            this.x + this.radius >= paddleLeft &&
            this.x - this.radius <= paddleRight &&
            this.y + this.radius >= paddleTop &&
            this.y - this.radius <= paddleBottom
        );

        if (crossedX || overlaps) {
            // Precise vertical check for crossing:
            // Interpolate Y at the X intersection point to see if it was within paddle height
            // Simple approach: Check if Y range overlaps paddle Y range
            const ballTop = Math.min(this.prevY, this.y) - this.radius;
            const ballBottom = Math.max(this.prevY, this.y) + this.radius;

            if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
                // COLLISION CONFIRMED

                // Calculate where on the paddle the ball hit (0 = top, 1 = bottom)
                // Use current Y for simplicity as it's close enough usually, or clamp to paddle bounds
                const clampY = Math.max(paddleTop, Math.min(paddleBottom, this.y));
                const hitPosition = (clampY - paddleTop) / paddle.height;

                // Calculate angle based on hit position (-1 to 1, where 0 is center)
                const relativeIntersectY = (hitPosition - 0.5) * 2;

                // Maximum bounce angle (in radians, ~60 degrees)
                const maxBounceAngle = Math.PI / 3;

                // Calculate bounce angle
                const bounceAngle = relativeIntersectY * maxBounceAngle;

                // Calculate speed magnitude
                const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);

                // FORCE direction away from the paddle
                // If we hit a paddle on the left (paddle.x < center), we bounce RIGHT (1)
                // If we hit a paddle on the right, we bounce LEFT (-1)
                // BUT determining which paddle is tricky if we just have 'paddle'.
                // Heuristic: If we were moving right, we must reflect left. If moving left, reflect right.
                const newDirection = movingRight ? -1 : 1;

                this.speedX = newDirection * speed * Math.cos(bounceAngle);
                this.speedY = speed * Math.sin(bounceAngle);

                // Teleport ball out of paddle to prevent sticking
                if (newDirection > 0) {
                    // Bouncing RIGHT -> Place at paddle Right edge
                    this.x = paddleRight + this.radius + 1;
                } else {
                    // Bouncing LEFT -> Place at paddle Left edge
                    this.x = paddleLeft - this.radius - 1;
                }

                // Optional: Increase speed slightly
                const maxSpeed = 1200;
                const speedIncrease = 1.05;
                const newSpeed = Math.min(speed * speedIncrease, maxSpeed);
                const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);

                if (currentSpeed > 0) {
                    this.speedX = (this.speedX / currentSpeed) * newSpeed;
                    this.speedY = (this.speedY / currentSpeed) * newSpeed;
                }
            }
        }
    }

    draw(context: CanvasRenderingContext2D): void {
        if (this.isTournament) {
            this.drawFireBall(context);
        } else {
            // Regular ball
            context.fillStyle = 'white';
            context.beginPath();
            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            context.fill();
            context.closePath();
        }
    }

    private drawFireBall(context: CanvasRenderingContext2D): void {
        context.save();

        // Draw fire trail particles (behind the ball)
        for (const particle of this.fireParticles) {
            context.globalAlpha = particle.alpha;
            context.fillStyle = particle.color;
            context.beginPath();
            context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            context.fill();
        }

        context.globalAlpha = 1;

        // Outer fire glow
        const outerGlow = context.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 2.5
        );
        outerGlow.addColorStop(0, 'rgba(255, 200, 0, 0.4)');
        outerGlow.addColorStop(0.4, 'rgba(255, 100, 0, 0.2)');
        outerGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');

        context.fillStyle = outerGlow;
        context.beginPath();
        context.arc(this.x, this.y, this.radius * 2.5, 0, Math.PI * 2);
        context.fill();

        // Main fire ball with animated gradient
        const time = Date.now() / 100;
        const fireGradient = context.createRadialGradient(
            this.x + Math.sin(time) * 2,
            this.y + Math.cos(time) * 2,
            0,
            this.x, this.y, this.radius * 1.2
        );
        fireGradient.addColorStop(0, '#ffffff');
        fireGradient.addColorStop(0.2, '#ffff00');
        fireGradient.addColorStop(0.4, '#ffa500');
        fireGradient.addColorStop(0.7, '#ff4500');
        fireGradient.addColorStop(1, '#ff0000');

        context.fillStyle = fireGradient;
        context.beginPath();
        context.arc(this.x, this.y, this.radius * 1.2, 0, Math.PI * 2);
        context.fill();

        // Inner hot core
        const coreGradient = context.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * 0.6
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.5, '#ffffaa');
        coreGradient.addColorStop(1, '#ffcc00');

        context.fillStyle = coreGradient;
        context.beginPath();
        context.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        context.fill();

        context.restore();
    }
}
