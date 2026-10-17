/**
 * @file entities.js
 * Entities: Ship, Celestial Bodies (with Keplerian Binaries), Event Horizon, Asteroids, and Photon Cores.
 */

import { PhysicsEngine } from '../physics/engine.js';
import { sounds } from '../audio/engine.js';

export class Ship {
    constructor(x, y, shipClass = 'vanguard') {
        this.x = x;
        this.y = y;
        this.vx = 320; // px/sec
        this.vy = 0;
        this.angle = 0;
        this.radius = 14;

        this.setShipClass(shipClass);

        this.fuel = this.maxFuel;
        this.shield = this.maxShield;

        this.isTethered = false;
        this.tetherStar = null;
        this.tetherLength = 0;
        this.orbitRotationAccumulator = 0;
        this.lastTetherAngle = 0;

        this.isBoosting = false;
        this.invulnerableTimer = 0;

        // Quantum Abilities
        this.phaseShiftActive = false;
        this.phaseShiftTimer = 0;
        this.phaseShiftCooldown = 0;
        this.maxPhaseShiftCooldown = 12.0;

        this.timeDilationActive = false;
        this.timeDilationTimer = 0;
        this.timeDilationCooldown = 0;
        this.maxTimeDilationCooldown = 16.0;
    }

    setShipClass(shipClass) {
        this.shipClass = shipClass;
        switch (shipClass) {
            case 'phantom':
                this.name = 'Void Phantom';
                this.maxFuel = 120;
                this.maxShield = 80;
                this.topSpeedMultiplier = 1.25;
                this.slingshotEfficiency = 1.25;
                this.reachMultiplier = 1.25;
                this.perfectBonusMultiplier = 1.25;
                this.magneticReach = 90;
                break;
            case 'dreadnought':
                this.name = 'Titan Dreadnought';
                this.maxFuel = 85;
                this.maxShield = 180;
                this.topSpeedMultiplier = 0.95;
                this.slingshotEfficiency = 0.95;
                this.reachMultiplier = 0.95;
                this.perfectBonusMultiplier = 1.0;
                this.magneticReach = 220; // Massive magnetic pull
                break;
            case 'vanguard':
            default:
                this.name = 'Vanguard-IX';
                this.maxFuel = 100;
                this.maxShield = 100;
                this.topSpeedMultiplier = 1.0;
                this.slingshotEfficiency = 1.0;
                this.reachMultiplier = 1.0;
                this.perfectBonusMultiplier = 1.0;
                this.magneticReach = 110;
                break;
        }
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 320;
        this.vy = 0;
        this.angle = 0;
        this.fuel = this.maxFuel;
        this.shield = this.maxShield;
        this.isTethered = false;
        this.tetherStar = null;
        this.isBoosting = false;
        this.invulnerableTimer = 0;
        this.phaseShiftActive = false;
        this.phaseShiftTimer = 0;
        this.phaseShiftCooldown = 0;
        this.timeDilationActive = false;
        this.timeDilationTimer = 0;
        this.timeDilationCooldown = 0;
    }

    triggerPhaseShift() {
        if (this.phaseShiftCooldown <= 0 && !this.phaseShiftActive) {
            this.phaseShiftActive = true;
            this.phaseShiftTimer = 3.2;
            this.phaseShiftCooldown = this.maxPhaseShiftCooldown;
            if (sounds) sounds.playPhaseShift();
            return true;
        }
        return false;
    }

    triggerTimeDilation() {
        if (this.timeDilationCooldown <= 0 && !this.timeDilationActive) {
            this.timeDilationActive = true;
            this.timeDilationTimer = 3.5;
            this.timeDilationCooldown = this.maxTimeDilationCooldown;
            if (sounds) sounds.playTimeDilation();
            return true;
        }
        return false;
    }

    update(dt) {
        // Smooth ship rotation pointing toward velocity
        if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
            const moveAngle = Math.atan2(this.vy, this.vx);
            let diff = PhysicsEngine.normalizeAngle(moveAngle - this.angle);
            this.angle += diff * Math.min(1.0, 16 * dt);
        }

        // Ability timers
        if (this.phaseShiftActive) {
            this.phaseShiftTimer -= dt;
            if (this.phaseShiftTimer <= 0) {
                this.phaseShiftActive = false;
            }
        }
        if (this.phaseShiftCooldown > 0) {
            this.phaseShiftCooldown = Math.max(0, this.phaseShiftCooldown - dt);
        }

        if (this.timeDilationActive) {
            this.timeDilationTimer -= dt;
            if (this.timeDilationTimer <= 0) {
                this.timeDilationActive = false;
            }
        }
        if (this.timeDilationCooldown > 0) {
            this.timeDilationCooldown = Math.max(0, this.timeDilationCooldown - dt);
        }

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer -= dt;
        }
    }

    draw(ctx, particleSystem) {
        if (this.isTethered && this.tetherStar) {
            this.drawTether(ctx);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Phase Shift Hologram
        if (this.phaseShiftActive) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.25;
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 18;
        } else if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Deflector Shield Bubble
        if (this.shield > 20 && !this.phaseShiftActive) {
            const shieldAlpha = Math.min(0.35, (this.shield / this.maxShield) * 0.35);
            ctx.save();
            ctx.strokeStyle = `rgba(0, 240, 255, ${shieldAlpha + 0.3})`;
            ctx.fillStyle = `rgba(0, 240, 255, ${shieldAlpha * 0.35})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Hull Rendering by Class
        if (this.shipClass === 'phantom') {
            ctx.fillStyle = '#0f172a';
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(6, -8);
            ctx.lineTo(-14, -14);
            ctx.lineTo(-8, -4);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-8, 4);
            ctx.lineTo(-14, 14);
            ctx.lineTo(6, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = this.isBoosting ? '#ffffff' : '#c084fc';
            ctx.beginPath();
            ctx.arc(-10, -8, 2.5, 0, Math.PI * 2);
            ctx.arc(-10, 8, 2.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.shipClass === 'dreadnought') {
            ctx.fillStyle = '#1e293b';
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ctx.moveTo(15, -4);
            ctx.lineTo(15, 4);
            ctx.lineTo(4, 12);
            ctx.lineTo(-12, 12);
            ctx.lineTo(-8, 4);
            ctx.lineTo(-8, -4);
            ctx.lineTo(-12, -12);
            ctx.lineTo(4, -12);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 12, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = this.isBoosting ? '#ffffff' : '#ea580c';
            ctx.fillRect(-12, -7, 4, 14);

        } else {
            ctx.fillStyle = '#e2e8f0';
            ctx.strokeStyle = '#00f7ff';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(17, 0);
            ctx.lineTo(-12, -10);
            ctx.lineTo(-7, 0);
            ctx.lineTo(-12, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#00f7ff';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(-2, -3);
            ctx.lineTo(-2, 3);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = this.isBoosting ? '#ffffff' : '#ff9900';
            ctx.beginPath();
            ctx.arc(-8, 0, this.isBoosting ? 4 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Emit thruster particles
        particleSystem.emitThruster(
            this.x - Math.cos(this.angle) * 10,
            this.y - Math.sin(this.angle) * 10,
            this.angle,
            Math.sqrt(this.vx * this.vx + this.vy * this.vy) / 40,
            this.isBoosting
        );
    }

    drawTether(ctx) {
        const star = this.tetherStar;
        const time = Date.now() * 0.008;

        ctx.save();
        ctx.strokeStyle = (this.shipClass === 'phantom') ? 'rgba(168, 85, 247, 0.35)' : 'rgba(0, 255, 255, 0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(star.x, star.y);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(star.x, star.y);
        ctx.stroke();

        const nodeCount = 4;
        for (let i = 0; i < nodeCount; i++) {
            const progress = ((time + i / nodeCount) % 1);
            const nx = this.x + (star.x - this.x) * progress;
            const ny = this.y + (star.y - this.y) * progress;

            ctx.fillStyle = (this.shipClass === 'phantom') ? '#c084fc' : '#00ffff';
            ctx.beginPath();
            ctx.arc(nx, ny, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export class CelestialBody {
    constructor(x, y, type = 'hypergiant') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.type = type;
        this.pulseTime = Math.random() * 100;
        this.isBinary = (type === 'binary');

        switch (type) {
            case 'hypergiant':
                this.radius = 42;
                this.gravityRadius = 290;
                this.mu = 900000;
                this.slingshotPower = 28;
                this.color = '#00f7ff';
                this.glowColor = 'rgba(0, 247, 255, 0.25)';
                this.name = 'Blue Hypergiant';
                break;
            case 'pulsar':
                this.radius = 24;
                this.gravityRadius = 240;
                this.mu = 1200000;
                this.slingshotPower = 38;
                this.color = '#ff00aa';
                this.glowColor = 'rgba(255, 0, 170, 0.3)';
                this.name = 'Magnetar Pulsar';
                this.beamAngle = 0;
                break;
            case 'whitedwarf':
                this.radius = 18;
                this.gravityRadius = 210;
                this.mu = 1450000;
                this.slingshotPower = 46;
                this.color = '#ffffff';
                this.glowColor = 'rgba(255, 255, 255, 0.4)';
                this.name = 'Dense White Dwarf';
                break;
            case 'binary':
                this.radius = 28;
                this.gravityRadius = 320;
                this.mu = 800000;
                this.slingshotPower = 30;
                this.color = '#38bdf8';
                this.glowColor = 'rgba(56, 189, 248, 0.3)';
                this.name = 'Binary Star System';
                this.barycenter = { x: x, y: y };
                this.binaryDist = 65;
                this.binaryAngle = 0;
                this.omega = 1.4;

                this.twin = {
                    x: x + this.binaryDist,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: 22,
                    gravityRadius: 320,
                    mu: 700000,
                    color: '#f43f5e',
                    glowColor: 'rgba(244, 63, 94, 0.3)'
                };
                break;
            case 'supernova':
                this.radius = 48;
                this.gravityRadius = 340;
                this.mu = 1350000;
                this.slingshotPower = 40;
                this.color = '#fbbf24';
                this.glowColor = 'rgba(251, 191, 36, 0.35)';
                this.name = 'Unstable Supernova';
                this.instability = 0;
                break;
            case 'redgiant':
            default:
                this.radius = 54;
                this.gravityRadius = 330;
                this.mu = 700000;
                this.slingshotPower = 20;
                this.color = '#ff4400';
                this.glowColor = 'rgba(255, 68, 0, 0.22)';
                this.name = 'Red Supergiant';
                break;
        }
    }

    update(dt) {
        this.pulseTime += dt * 2;

        if (this.type === 'pulsar') {
            this.beamAngle += dt * 4.5;
        } else if (this.isBinary && this.twin) {
            this.binaryAngle += dt * this.omega;
            const cos = Math.cos(this.binaryAngle);
            const sin = Math.sin(this.binaryAngle);

            // Primary star position and orbital velocity (Keplerian rail)
            this.x = this.barycenter.x + cos * this.binaryDist;
            this.y = this.barycenter.y + sin * this.binaryDist;
            this.vx = -sin * this.binaryDist * this.omega;
            this.vy = cos * this.binaryDist * this.omega;

            // Twin star
            this.twin.x = this.barycenter.x - cos * this.binaryDist;
            this.twin.y = this.barycenter.y - sin * this.binaryDist;
            this.twin.vx = sin * this.binaryDist * this.omega;
            this.twin.vy = -cos * this.binaryDist * this.omega;
        } else if (this.type === 'supernova') {
            this.instability += dt * 0.5;
        }
    }

    draw(ctx, particleSystem) {
        ctx.save();

        // Gravitational perimeter
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravityRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Binary Orbit Circle
        if (this.isBinary && this.twin) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.arc(this.barycenter.x, this.barycenter.y, this.binaryDist, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw Twin star
            const twinGrad = ctx.createRadialGradient(this.twin.x, this.twin.y, this.twin.radius * 0.5, this.twin.x, this.twin.y, this.twin.radius * 2);
            twinGrad.addColorStop(0, this.twin.color);
            twinGrad.addColorStop(0.5, this.twin.glowColor);
            twinGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = twinGrad;
            ctx.beginPath();
            ctx.arc(this.twin.x, this.twin.y, this.twin.radius * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.twin.x, this.twin.y, this.twin.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pulsar beams
        if (this.type === 'pulsar') {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.beamAngle);

            const beamLength = this.gravityRadius * 1.35;
            const beamGrad = ctx.createLinearGradient(0, -beamLength, 0, beamLength);
            beamGrad.addColorStop(0, 'rgba(255, 0, 170, 0)');
            beamGrad.addColorStop(0.45, 'rgba(255, 0, 200, 0.6)');
            beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.9)');
            beamGrad.addColorStop(0.55, 'rgba(255, 0, 200, 0.6)');
            beamGrad.addColorStop(1, 'rgba(255, 0, 170, 0)');

            ctx.fillStyle = beamGrad;
            ctx.fillRect(-6, -beamLength, 12, beamLength * 2);
            ctx.restore();
        }

        // Stellar corona glow
        const glowRadius = this.radius * (1.8 + Math.sin(this.pulseTime) * 0.12);
        const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.6, this.x, this.y, glowRadius);
        grad.addColorStop(0, this.color);
        grad.addColorStop(0.5, this.glowColor);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (Math.random() < 0.3 && particleSystem) {
            particleSystem.emitStarCorona(this.x, this.y, this.radius, this.color);
        }
    }
}

export class Wormhole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 32;
        this.rotation = 0;
        this.teleportDistance = 1400;
    }

    update(dt) {
        this.rotation += dt * 3.5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        for (let r = this.radius; r > 6; r -= 6) {
            ctx.strokeStyle = (r % 12 === 0) ? '#00f7ff' : '#9900ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 1.5);
            ctx.stroke();
        }

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

export class Asteroid {
    constructor(x, y, radius = 18) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = (Math.random() - 0.5) * 40; // px/sec
        this.vy = (Math.random() - 0.5) * 40;
        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 1.5;

        this.vertices = [];
        const numPoints = 8;
        for (let i = 0; i < numPoints; i++) {
            const a = (i / numPoints) * Math.PI * 2;
            const dist = this.radius * (0.75 + Math.random() * 0.4);
            this.vertices.push({ x: Math.cos(a) * dist, y: Math.sin(a) * dist });
        }
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.angle += this.spinSpeed * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

export class PhotonCore {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 9;
        this.pulse = Math.random() * 10;
    }

    update(dt, ship = null) {
        this.pulse += dt * 4;

        if (ship) {
            const d = PhysicsEngine.dist(this.x, this.y, ship.x, ship.y);
            const reach = ship.magneticReach || 110;
            if (d < reach) {
                const pullAngle = PhysicsEngine.angle(this.x, this.y, ship.x, ship.y);
                const speed = 400 * (1 - d / reach);
                this.x += Math.cos(pullAngle) * speed * dt;
                this.y += Math.sin(pullAngle) * speed * dt;
            }
        }
    }

    draw(ctx) {
        const glow = this.radius + Math.sin(this.pulse) * 4;
        ctx.save();

        const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, glow * 2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, '#ffd700');
        grad.addColorStop(1, 'rgba(255, 215, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glow * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

export class EventHorizon {
    constructor() {
        this.x = -1200; // Far behind start position
        this.baseSpeed = 220; // px/sec
        this.speed = 220;
        this.waveOffset = 0;
    }

    reset() {
        this.x = -1200;
        this.speed = this.baseSpeed;
        this.waveOffset = 0;
    }

    update(dt, shipX) {
        this.speed = this.baseSpeed + Math.min(260, Math.max(0, shipX / 6000) * 40);
        this.x += this.speed * dt;
        this.waveOffset += dt * 3;
    }

    draw(ctx, viewportTop, viewportBottom, centerY, height, particleSystem) {
        ctx.save();

        const horizonWidth = 1400;
        const leftEdge = this.x - horizonWidth;

        const grad = ctx.createLinearGradient(this.x - 300, 0, this.x + 80, 0);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
        grad.addColorStop(0.5, 'rgba(15, 0, 30, 0.95)');
        grad.addColorStop(0.75, 'rgba(180, 0, 60, 0.75)');
        grad.addColorStop(0.92, 'rgba(255, 80, 0, 0.85)');
        grad.addColorStop(1, 'rgba(255, 200, 0, 0)');

        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(leftEdge, viewportTop - 100);
        ctx.lineTo(this.x, viewportTop - 100);

        const steps = 24;
        const stepHeight = (viewportBottom - viewportTop + 200) / steps;
        for (let i = 0; i <= steps; i++) {
            const py = viewportTop - 100 + i * stepHeight;
            const wave = Math.sin(this.waveOffset + i * 0.4) * 35 + Math.cos(this.waveOffset * 1.5 + i * 0.2) * 15;
            ctx.lineTo(this.x + wave, py);
        }

        ctx.lineTo(leftEdge, viewportBottom + 100);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        if (particleSystem) {
            particleSystem.emitAccretionMatter(this.x, height, centerY);
        }
    }
}
