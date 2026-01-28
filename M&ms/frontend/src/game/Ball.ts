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

    constructor(x: number, y: number, radius: number, speedX: number = 200, speedY: number = 200) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.speedX = speedX;
        this.speedY = speedY;
    }

    move(deltaTime: number): void {
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
        this.speedX = -this.speedX;
        // Clear fire particles on reset
        this.fireParticles = [];
    }

    detectCollision(paddle: Paddle): void {
        // Check if ball is within paddle's x range
        const ballLeft = this.x - this.radius;
        const ballRight = this.x + this.radius;
        const ballTop = this.y - this.radius;
        const ballBottom = this.y + this.radius;

        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + paddle.width;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + paddle.height;

        // Check for collision
        if (ballRight > paddleLeft &&
            ballLeft < paddleRight &&
            ballBottom > paddleTop &&
            ballTop < paddleBottom) {

            // Calculate where on the paddle the ball hit (0 = top, 1 = bottom)
            const hitPosition = (this.y - paddleTop) / paddle.height;

            // Calculate angle based on hit position (-1 to 1, where 0 is center)
            const relativeIntersectY = (hitPosition - 0.5) * 2;

            // Maximum bounce angle (in radians, ~60 degrees)
            const maxBounceAngle = Math.PI / 3;

            // Calculate bounce angle
            const bounceAngle = relativeIntersectY * maxBounceAngle;

            // Calculate speed magnitude
            const speed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);

            // Set new velocities based on angle
            const direction = paddle.x < this.x ? 1 : -1; // Right paddle: positive, left paddle: negative
            this.speedX = direction * speed * Math.cos(bounceAngle);
            this.speedY = speed * Math.sin(bounceAngle);

            // Prevent ball from getting stuck in paddle
            if (direction > 0) {
                this.x = paddleRight + this.radius;
            } else {
                this.x = paddleLeft - this.radius;
            }

            // Optional: Increase speed slightly with each hit (up to a maximum)
            const maxSpeed = 1200; // Increased for time-based speed
            const speedIncrease = 1.05;
            const newSpeed = Math.min(speed * speedIncrease, maxSpeed);
            const currentSpeed = Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY);

            if (currentSpeed > 0) {
                this.speedX = (this.speedX / currentSpeed) * newSpeed;
                this.speedY = (this.speedY / currentSpeed) * newSpeed;
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
