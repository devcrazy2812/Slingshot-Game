/**
 * @file particles.js
 * Particle Engine for visual feedback: thruster trails, stellar corona, accretion disk, speed streaks, and impact sparks.
 */

export class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxSize = size;
        this.life = life; // 0 to 1
        this.decay = decay;
        this.type = type;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.alpha = Math.max(0, this.life);
        if (this.type === 'shrink') {
            this.size = this.maxSize * this.alpha;
        } else if (this.type === 'grow') {
            this.size = this.maxSize * (2 - this.alpha);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.streaks = [];
    }

    reset() {
        this.particles = [];
        this.streaks = [];
    }

    // Plasma thruster trail behind ship
    emitThruster(x, y, angle, speed, isBoosting = false) {
        const count = isBoosting ? 4 : 2;
        const spread = isBoosting ? 0.45 : 0.25;
        const baseSpeed = isBoosting ? 8 : 4;
        const color = isBoosting ? '#00f7ff' : (Math.random() > 0.5 ? '#ff9d00' : '#ff3366');

        for (let i = 0; i < count; i++) {
            const pAngle = angle + Math.PI + (Math.random() - 0.5) * spread;
            const pSpeed = (Math.random() * 0.5 + 0.8) * baseSpeed;
            const vx = Math.cos(pAngle) * pSpeed;
            const vy = Math.sin(pAngle) * pSpeed;
            const size = isBoosting ? Math.random() * 3.5 + 2 : Math.random() * 2 + 1;
            const decay = isBoosting ? 0.03 : 0.04;
            this.particles.push(new Particle(x, y, vx, vy, color, size, 1.0, decay, 'shrink'));
        }
    }

    // Stellar solar flares / corona particles
    emitStarCorona(starX, starY, starRadius, color) {
        if (this.particles.length > 600) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = starRadius * (0.8 + Math.random() * 0.4);
        const x = starX + Math.cos(angle) * dist;
        const y = starY + Math.sin(angle) * dist;
        const speed = Math.random() * 1.5 + 0.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 3 + 1, 0.8, 0.02, 'grow'));
    }

    // Accretion disk matter sucked into black hole
    emitAccretionMatter(horizonX, viewportHeight, centerY) {
        if (this.particles.length > 700) return;
        const y = centerY + (Math.random() - 0.5) * viewportHeight * 1.5;
        const x = horizonX + Math.random() * 150 + 20;
        // Inward pull toward horizon
        const vx = -(Math.random() * 3 + 2);
        const vy = (Math.random() - 0.5) * 2;
        const colors = ['#ff3300', '#ff0055', '#7b00ff', '#00ffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 2.5 + 1, 1.0, 0.025, 'shrink'));
    }

    // Explosion / shatter debris
    emitExplosion(x, y, color = '#ffaa00', count = 35) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 9 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 3.5 + 1.5;
            const decay = Math.random() * 0.025 + 0.015;
            this.particles.push(new Particle(x, y, vx, vy, color, size, 1.0, decay, 'shrink'));
        }
    }

    // Speed streaks for relativistic travel (v > 0.6c)
    emitSpeedStreak(viewLeft, viewRight, viewTop, viewBottom, shipVx, shipVy) {
        if (this.streaks.length > 50) return;
        const angle = Math.atan2(shipVy, shipVx);
        const x = viewRight + Math.random() * 200;
        const y = viewTop + Math.random() * (viewBottom - viewTop);
        const len = Math.random() * 120 + 60;
        const speed = Math.sqrt(shipVx * shipVx + shipVy * shipVy) * 1.5;

        this.streaks.push({
            x: x,
            y: y,
            vx: -Math.cos(angle) * speed,
            vy: -Math.sin(angle) * speed,
            length: len,
            angle: angle,
            alpha: Math.random() * 0.5 + 0.3
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update();
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const s = this.streaks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.alpha -= 0.03;
            if (s.alpha <= 0) {
                this.streaks.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        // Draw speed streaks
        if (this.streaks.length > 0) {
            ctx.save();
            for (const s of this.streaks) {
                ctx.strokeStyle = `rgba(180, 240, 255, ${s.alpha})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw particles
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }
}
