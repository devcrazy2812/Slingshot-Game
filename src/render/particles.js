/**
 * @file particles.js
 * Beast-Level Particle & Visual FX Engine:
 * - Plasma thruster blooms & multi-stage Mach shock diamonds
 * - Volumetric shockwave blast rings with chromatic fringe
 * - Continuous dual ribbon plasma trails for vessel wingtips
 * - Accretion disk matter ingestion streams & relativistic hyperspace streaks
 * - High-energy electric arc discharges & micro-dust motes
 */

export class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'normal', glow = true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxSize = size;
        this.life = life;
        this.decay = decay;
        this.type = type;
        this.glow = glow;
        this.alpha = 1;
        this.rotation = Math.random() * Math.PI * 2;
        this.vRot = (Math.random() - 0.5) * 6;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.vRot * 0.016;
        this.life -= this.decay;
        this.alpha = Math.max(0, this.life);

        if (this.type === 'shrink') {
            this.size = this.maxSize * Math.pow(this.alpha, 0.8);
        } else if (this.type === 'grow') {
            this.size = this.maxSize * (1 + (1 - this.alpha) * 1.5);
        } else if (this.type === 'spark') {
            this.size = this.maxSize * this.alpha;
            this.vx *= 0.94;
            this.vy *= 0.94;
        }
    }

    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;

        if (this.type === 'spark') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.fillRect(-this.size, -this.size * 0.3, this.size * 2, this.size * 0.6);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.6, this.size), 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

export class ShockwaveRing {
    constructor(x, y, maxRadius, color = '#00f7ff', duration = 0.6, lineWidth = 4) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.maxRadius = maxRadius;
        this.color = color;
        this.life = 1.0;
        this.duration = duration;
        this.decay = 1.0 / (duration * 60);
        this.lineWidth = lineWidth;
    }

    update() {
        this.life -= this.decay;
        const progress = 1.0 - Math.max(0, this.life);
        // Fast expansion curve
        this.radius = this.maxRadius * (1 - Math.pow(1 - progress, 3));
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.pow(Math.max(0, this.life), 1.5);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth * this.life;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
        ctx.stroke();

        // Inner chromatic second ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, this.lineWidth * 0.4 * this.life);
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, this.radius * 0.95), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.streaks = [];
        this.shockwaves = [];
        this.ribbonHistory = [];
        this.maxRibbonLength = 32;
    }

    reset() {
        this.particles = [];
        this.streaks = [];
        this.shockwaves = [];
        this.ribbonHistory = [];
    }

    // Records ship position for continuous glowing ribbon trail
    recordShipRibbon(x, y, angle, speed, isBoosting, shipClass) {
        this.ribbonHistory.unshift({
            x,
            y,
            angle,
            speed,
            isBoosting,
            shipClass,
            time: performance.now()
        });

        if (this.ribbonHistory.length > this.maxRibbonLength) {
            this.ribbonHistory.pop();
        }
    }

    // Plasma thruster trail with multi-stage Mach shock diamonds
    emitThruster(x, y, angle, speed, isBoosting = false, shipClass = 'vanguard') {
        const count = isBoosting ? 5 : 2;
        const spread = isBoosting ? 0.35 : 0.2;
        const baseSpeed = isBoosting ? 9 : 4.5;

        let primaryColor = '#00f7ff';
        let accentColor = '#38bdf8';
        if (shipClass === 'phantom') {
            primaryColor = '#c084fc';
            accentColor = '#f43f5e';
        } else if (shipClass === 'dreadnought') {
            primaryColor = '#fbbf24';
            accentColor = '#ea580c';
        }

        if (isBoosting) {
            primaryColor = '#ffffff';
        }

        for (let i = 0; i < count; i++) {
            const pAngle = angle + Math.PI + (Math.random() - 0.5) * spread;
            const pSpeed = (Math.random() * 0.6 + 0.8) * baseSpeed;
            const vx = Math.cos(pAngle) * pSpeed;
            const vy = Math.sin(pAngle) * pSpeed;
            const size = isBoosting ? Math.random() * 4.5 + 2.5 : Math.random() * 2.8 + 1.2;
            const decay = isBoosting ? 0.035 : 0.045;
            const color = Math.random() > 0.4 ? primaryColor : accentColor;

            this.particles.push(new Particle(x, y, vx, vy, color, size, 1.0, decay, 'shrink', true));
        }

        // Emit shock diamonds along exhaust center
        if (isBoosting && Math.random() < 0.4) {
            const diamondDist = 12 + Math.random() * 15;
            const dx = x - Math.cos(angle) * diamondDist;
            const dy = y - Math.sin(angle) * diamondDist;
            this.particles.push(new Particle(dx, dy, 0, 0, '#ffffff', 2.5, 0.4, 0.08, 'shrink', true));
        }
    }

    // Stellar flares & prominence particles
    emitStarCorona(starX, starY, starRadius, color) {
        if (this.particles.length > 800) return;
        const angle = Math.random() * Math.PI * 2;
        const dist = starRadius * (0.85 + Math.random() * 0.35);
        const x = starX + Math.cos(angle) * dist;
        const y = starY + Math.sin(angle) * dist;
        const speed = Math.random() * 2.0 + 0.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 4 + 1.5, 0.85, 0.018, 'grow', true));
    }

    // Accretion disk matter ingestion streams
    emitAccretionMatter(horizonX, viewportHeight, centerY) {
        if (this.particles.length > 180) return;
        const y = centerY + (Math.random() - 0.5) * viewportHeight * 1.6;
        const x = horizonX + Math.random() * 180 + 20;
        const vx = -(Math.random() * 4.5 + 3.0);
        const vy = (Math.random() - 0.5) * 3;
        const colors = ['#ff0055', '#ff3300', '#7b00ff', '#00f7ff', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 3.2 + 1, 1.0, 0.02, 'shrink', true));
    }

    // Expanding shockwave ring
    emitShockwave(x, y, maxRadius = 160, color = '#00f7ff', duration = 0.5) {
        this.shockwaves.push(new ShockwaveRing(x, y, maxRadius, color, duration));
    }

    // High-energy explosion debris & sparks
    emitExplosion(x, y, color = '#ff0055', count = 45) {
        this.emitShockwave(x, y, 140, color, 0.45);

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 12 + 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 4.5 + 1.5;
            const decay = Math.random() * 0.028 + 0.014;
            const isSpark = Math.random() < 0.35;
            this.particles.push(new Particle(
                x, y, vx, vy,
                color, size, 1.0, decay,
                isSpark ? 'spark' : 'shrink',
                true
            ));
        }
    }

    // Relativistic warp speed streak lines
    emitSpeedStreak(viewLeft, viewRight, viewTop, viewBottom, shipVx, shipVy) {
        if (this.streaks.length > 65) return;
        const angle = Math.atan2(shipVy, shipVx);
        const x = viewRight + Math.random() * 260;
        const y = viewTop + Math.random() * (viewBottom - viewTop);
        const len = Math.random() * 160 + 80;
        const speed = Math.sqrt(shipVx * shipVx + shipVy * shipVy) * 1.8;

        const colors = ['rgba(0, 247, 255, ', 'rgba(255, 255, 255, ', 'rgba(168, 85, 247, '];
        const colPrefix = colors[Math.floor(Math.random() * colors.length)];

        this.streaks.push({
            x: x,
            y: y,
            vx: -Math.cos(angle) * speed,
            vy: -Math.sin(angle) * speed,
            length: len,
            angle: angle,
            colorPrefix: colPrefix,
            alpha: Math.random() * 0.6 + 0.4
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

        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.update();
            if (sw.life <= 0) {
                this.shockwaves.splice(i, 1);
            }
        }

        for (let i = this.streaks.length - 1; i >= 0; i--) {
            const s = this.streaks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.alpha -= 0.035;
            if (s.alpha <= 0) {
                this.streaks.splice(i, 1);
            }
        }
    }

    // Draws continuous glowing ship ribbon trail
    drawRibbonTrail(ctx) {
        if (this.ribbonHistory.length < 3) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const len = this.ribbonHistory.length;
        for (let side of [-7, 7]) { // Dual wingtip trails
            ctx.beginPath();
            for (let i = 0; i < len; i++) {
                const pt = this.ribbonHistory[i];
                const nx = Math.cos(pt.angle + Math.PI / 2) * side;
                const ny = Math.sin(pt.angle + Math.PI / 2) * side;
                const rx = pt.x + nx;
                const ry = pt.y + ny;

                if (i === 0) {
                    ctx.moveTo(rx, ry);
                } else {
                    ctx.lineTo(rx, ry);
                }
            }

            const latest = this.ribbonHistory[0];
            let trailColor = latest.isBoosting ? 'rgba(0, 247, 255, 0.65)' : 'rgba(0, 200, 255, 0.35)';
            if (latest.shipClass === 'phantom') {
                trailColor = latest.isBoosting ? 'rgba(192, 132, 252, 0.75)' : 'rgba(168, 85, 247, 0.35)';
            } else if (latest.shipClass === 'dreadnought') {
                trailColor = latest.isBoosting ? 'rgba(251, 191, 36, 0.75)' : 'rgba(245, 158, 11, 0.35)';
            }

            ctx.strokeStyle = trailColor;
            ctx.lineWidth = latest.isBoosting ? 3.5 : 2.0;
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // Draw Speed Streaks
        if (this.streaks.length > 0) {
            for (const s of this.streaks) {
                ctx.strokeStyle = `${s.colorPrefix}${s.alpha})`;
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - Math.cos(s.angle) * s.length, s.y - Math.sin(s.angle) * s.length);
                ctx.stroke();
            }
        }

        // Draw Shockwave Blast Rings
        for (const sw of this.shockwaves) {
            sw.draw(ctx);
        }

        // Draw Ribbon Trails
        this.drawRibbonTrail(ctx);

        // Draw Particles
        for (const p of this.particles) {
            p.draw(ctx);
        }

        ctx.restore();
    }
}
