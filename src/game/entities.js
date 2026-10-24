/**
 * @file entities.js
 * Beast-Level Celestial & Vessel Entities:
 * - Ship: Holographic RGB phase-glitch, Mach shock diamonds, wingtip strobe LEDs, geodesic shields
 * - Plasma Electric Tether: Dynamic jagged lightning arc with traveling energy nodes
 * - CelestialBody: Convective plasma granulation, solar prominences, 3D pulsar jets, Roche-lobe binary bridges
 * - Event Horizon: Relativistic Gargantua singularity with Doppler-beamed accretion disk & gravitational lensing
 * - Wormhole: Multi-tier hyperspace Einstein-Rosen vortex
 * - Asteroid: 3D relief-shaded cratered planetoid
 * - PhotonCore: Crystalline octahedral quantum power core with orbiting electron sparks
 */

import { PhysicsEngine } from '../physics/engine.js';
import { sounds } from '../audio/engine.js';
import { SOLAR_PLANETS, KNOWN_EXOPLANETS, ALL_PLANETS, getPlanetById } from './planets.js';

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

        this.strobeTimer = 0;
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
                this.themeColor = '#c084fc';
                break;
            case 'dreadnought':
                this.name = 'Titan Dreadnought';
                this.maxFuel = 85;
                this.maxShield = 180;
                this.topSpeedMultiplier = 0.95;
                this.slingshotEfficiency = 0.95;
                this.reachMultiplier = 0.95;
                this.perfectBonusMultiplier = 1.0;
                this.magneticReach = 220;
                this.themeColor = '#fbbf24';
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
                this.themeColor = '#00f7ff';
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
        if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
            const moveAngle = Math.atan2(this.vy, this.vx);
            let diff = PhysicsEngine.normalizeAngle(moveAngle - this.angle);
            this.angle += diff * Math.min(1.0, 16 * dt);
        }

        this.strobeTimer = (this.strobeTimer + dt * 2.5) % 1.0;

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
            this.drawPlasmaTether(ctx);
        }

        // Record for continuous ribbon trail
        if (particleSystem) {
            particleSystem.recordShipRibbon(
                this.x,
                this.y,
                this.angle,
                Math.sqrt(this.vx * this.vx + this.vy * this.vy),
                this.isBoosting,
                this.shipClass
            );
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 1. Quantum Phase Shift Holographic Glitch (RGB Chromatic Split)
        if (this.phaseShiftActive) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const glitchOffset = Math.sin(Date.now() * 0.05) * 4;

            // Red channel shifted
            ctx.save();
            ctx.translate(glitchOffset, 0);
            ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)';
            ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
            this.drawHullGeometry(ctx);
            ctx.restore();

            // Cyan channel shifted
            ctx.save();
            ctx.translate(-glitchOffset, 0);
            ctx.strokeStyle = 'rgba(0, 247, 255, 0.7)';
            ctx.fillStyle = 'rgba(0, 247, 255, 0.2)';
            this.drawHullGeometry(ctx);
            ctx.restore();

            ctx.restore();
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.3;
        } else if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // 2. Geodesic Deflector Shield
        if (this.shield > 20 && !this.phaseShiftActive) {
            this.drawGeodesicShield(ctx);
        }

        // 3. Draw Hull Geometry
        this.drawHullGeometry(ctx);

        // 4. Strobe Navigation Lights (Aviation Port / Starboard)
        const strobeLit = this.strobeTimer < 0.2;
        if (strobeLit) {
            ctx.save();
            // Port wingtip: Red
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(-8, -12, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Starboard wingtip: Green
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(-8, 12, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // 5. Emit Plasma Thruster Particles & Mach Shock Diamonds
        if (particleSystem) {
            particleSystem.emitThruster(
                this.x - Math.cos(this.angle) * 12,
                this.y - Math.sin(this.angle) * 12,
                this.angle,
                Math.sqrt(this.vx * this.vx + this.vy * this.vy) / 35,
                this.isBoosting,
                this.shipClass
            );
        }
    }

    drawGeodesicShield(ctx) {
        const shieldFrac = this.shield / this.maxShield;
        const shieldAlpha = Math.min(0.5, shieldFrac * 0.5);
        const shieldRadius = this.radius + 9;
        const time = Date.now() * 0.003;

        ctx.save();
        ctx.strokeStyle = `rgba(0, 247, 255, ${shieldAlpha + 0.25})`;
        ctx.fillStyle = `rgba(0, 247, 255, ${shieldAlpha * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Hexagonal mesh facets
        ctx.strokeStyle = `rgba(255, 255, 255, ${shieldAlpha * 0.5})`;
        ctx.lineWidth = 1;
        const sides = 6;
        for (let i = 0; i < sides; i++) {
            const a1 = (i / sides) * Math.PI * 2 + time;
            const a2 = ((i + 1) / sides) * Math.PI * 2 + time;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * shieldRadius, Math.sin(a1) * shieldRadius);
            ctx.lineTo(0, 0);
            ctx.lineTo(Math.cos(a2) * shieldRadius, Math.sin(a2) * shieldRadius);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawHullGeometry(ctx) {
        if (this.shipClass === 'phantom') {
            // Recon Skiff
            ctx.fillStyle = '#090d16';
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.2;
            ctx.shadowColor = '#c084fc';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.moveTo(20, 0);
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

            // Neon energy core
            ctx.fillStyle = this.isBoosting ? '#ffffff' : '#c084fc';
            ctx.beginPath();
            ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.shipClass === 'dreadnought') {
            // Heavy Armored Cruiser
            ctx.fillStyle = '#141416';
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 14;

            ctx.beginPath();
            ctx.moveTo(18, -4);
            ctx.lineTo(18, 4);
            ctx.lineTo(5, 13);
            ctx.lineTo(-14, 13);
            ctx.lineTo(-9, 5);
            ctx.lineTo(-9, -5);
            ctx.lineTo(-14, -13);
            ctx.lineTo(5, -13);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Armored heavy bow plating
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(8, -2, 6, 4);

        } else {
            // Vanguard Balanced Interceptor
            ctx.fillStyle = '#f1f5f9';
            ctx.strokeStyle = '#00f7ff';
            ctx.lineWidth = 2.2;
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 14;

            ctx.beginPath();
            ctx.moveTo(19, 0);
            ctx.lineTo(-13, -11);
            ctx.lineTo(-7, 0);
            ctx.lineTo(-13, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Cockpit Canopy
            ctx.fillStyle = '#00f7ff';
            ctx.beginPath();
            ctx.moveTo(7, 0);
            ctx.lineTo(-2, -3.5);
            ctx.lineTo(-2, 3.5);
            ctx.closePath();
            ctx.fill();

            // Thruster exhaust chamber
            ctx.fillStyle = this.isBoosting ? '#ffffff' : '#f59e0b';
            ctx.beginPath();
            ctx.arc(-8, 0, this.isBoosting ? 4.5 : 3.0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // High-Energy Plasma Lightning Tether with Harmonic Vibrations
    drawPlasmaTether(ctx) {
        const star = this.tetherStar;
        const time = Date.now() * 0.008;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const dx = star.x - this.x;
        const dy = star.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(6, Math.floor(dist / 18));
        const perpX = -dy / dist;
        const perpY = dx / dist;

        // 1. Broad outer glowing arc
        ctx.strokeStyle = (this.shipClass === 'phantom') ? 'rgba(192, 132, 252, 0.45)' : 'rgba(0, 247, 255, 0.45)';
        ctx.lineWidth = 5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);

        for (let i = 1; i < steps; i++) {
            const frac = i / steps;
            const jitter = Math.sin(time * 3 + i * 1.5) * 8 * Math.sin(frac * Math.PI);
            const px = this.x + dx * frac + perpX * jitter;
            const py = this.y + dy * frac + perpY * jitter;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(star.x, star.y);
        ctx.stroke();

        // 2. Inner intense white lightning filament
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        for (let i = 1; i < steps; i++) {
            const frac = i / steps;
            const fastJitter = (Math.random() - 0.5) * 6 * Math.sin(frac * Math.PI);
            const px = this.x + dx * frac + perpX * fastJitter;
            const py = this.y + dy * frac + perpY * fastJitter;
            ctx.lineTo(px, py);
        }
        ctx.lineTo(star.x, star.y);
        ctx.stroke();

        // 3. Energy quantum packets streaming into ship
        const packetCount = 4;
        for (let k = 0; k < packetCount; k++) {
            const flowProgress = (time * 1.2 + k / packetCount) % 1.0;
            const px = star.x - dx * flowProgress;
            const py = star.y - dy * flowProgress;

            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00f7ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

export class CelestialBody {
    constructor(x, y, type = 'hypergiant', planetData = null) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.type = type;
        this.pulseTime = Math.random() * 100;
        this.isBinary = (type === 'binary');
        this.isPlanet = (type === 'planet' || !!planetData);
        this.planetData = planetData;
        this.rotationAngle = Math.random() * Math.PI * 2;

        if (this.isPlanet && planetData) {
            this.radius = planetData.radius || 42;
            this.gravityRadius = planetData.gravityRadius || 280;
            this.mu = planetData.mu || 850000;
            this.slingshotPower = 32;
            this.color = planetData.color || '#38bdf8';
            this.glowColor = planetData.atmosphereColor || 'rgba(56, 189, 248, 0.4)';
            this.coreColor = planetData.color;
            this.name = planetData.name;
            this.hasRings = !!planetData.hasRings;
            this.ringRadius = planetData.ringRadius || (this.radius * 1.8);
            this.ringColor = planetData.ringColor || 'rgba(252, 211, 77, 0.6)';
        } else {
            switch (type) {
            case 'hypergiant':
                this.radius = 44;
                this.gravityRadius = 290;
                this.mu = 900000;
                this.slingshotPower = 28;
                this.color = '#00f7ff';
                this.glowColor = 'rgba(0, 247, 255, 0.35)';
                this.coreColor = '#e0f2fe';
                this.name = 'Blue Hypergiant';
                break;
            case 'pulsar':
                this.radius = 26;
                this.gravityRadius = 240;
                this.mu = 1200000;
                this.slingshotPower = 38;
                this.color = '#ec4899';
                this.glowColor = 'rgba(236, 72, 153, 0.4)';
                this.coreColor = '#fdf2f8';
                this.name = 'Magnetar Pulsar';
                this.beamAngle = 0;
                break;
            case 'whitedwarf':
                this.radius = 20;
                this.gravityRadius = 210;
                this.mu = 1450000;
                this.slingshotPower = 46;
                this.color = '#ffffff';
                this.glowColor = 'rgba(255, 255, 255, 0.5)';
                this.coreColor = '#ffffff';
                this.name = 'Dense White Dwarf';
                break;
            case 'binary':
                this.radius = 30;
                this.gravityRadius = 320;
                this.mu = 800000;
                this.slingshotPower = 30;
                this.color = '#38bdf8';
                this.glowColor = 'rgba(56, 189, 248, 0.4)';
                this.name = 'Binary Star System';
                this.barycenter = { x: x, y: y };
                this.binaryDist = 68;
                this.binaryAngle = 0;
                this.omega = 1.4;

                this.twin = {
                    x: x + this.binaryDist,
                    y: y,
                    vx: 0,
                    vy: 0,
                    radius: 24,
                    gravityRadius: 320,
                    mu: 700000,
                    color: '#f43f5e',
                    glowColor: 'rgba(244, 63, 94, 0.4)'
                };
                break;
            case 'supernova':
                this.radius = 50;
                this.gravityRadius = 340;
                this.mu = 1350000;
                this.slingshotPower = 40;
                this.color = '#fbbf24';
                this.glowColor = 'rgba(251, 191, 36, 0.45)';
                this.name = 'Unstable Supernova';
                this.instability = 0;
                break;
            case 'redgiant':
            default:
                this.radius = 56;
                this.gravityRadius = 330;
                this.mu = 700000;
                this.slingshotPower = 20;
                this.color = '#ff4400';
                this.glowColor = 'rgba(255, 68, 0, 0.3)';
                this.name = 'Red Supergiant';
                break;
            }
        }
    }

    update(dt) {
        this.pulseTime += dt * 2.2;

        if (this.isPlanet) {
            this.rotationAngle += dt * 0.2;
            return;
        }

        if (this.type === 'pulsar') {
            this.beamAngle += dt * 4.8;
        } else if (this.isBinary && this.twin) {
            this.binaryAngle += dt * this.omega;
            const cos = Math.cos(this.binaryAngle);
            const sin = Math.sin(this.binaryAngle);

            this.x = this.barycenter.x + cos * this.binaryDist;
            this.y = this.barycenter.y + sin * this.binaryDist;
            this.vx = -sin * this.binaryDist * this.omega;
            this.vy = cos * this.binaryDist * this.omega;

            this.twin.x = this.barycenter.x - cos * this.binaryDist;
            this.twin.y = this.barycenter.y - sin * this.binaryDist;
            this.twin.vx = sin * this.binaryDist * this.omega;
            this.twin.vy = -cos * this.binaryDist * this.omega;
        } else if (this.type === 'supernova') {
            this.instability += dt * 0.6;
        }
    }

    drawPlanet(ctx) {
        const pd = this.planetData || {};

        // 1. Gravity Orbit Perimeter Ring
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravityRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Back Rings (if ringed planet like Saturn / Uranus)
        if (this.hasRings) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(0.35);
            ctx.strokeStyle = this.ringColor;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.ringRadius, this.ringRadius * 0.28, 0, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3. Luminous Atmospheric Glow
        const atmoRad = this.radius * 1.35;
        const atmoGrad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.8, this.x, this.y, atmoRad);
        atmoGrad.addColorStop(0, this.color);
        atmoGrad.addColorStop(0.6, this.glowColor);
        atmoGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = atmoGrad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, atmoRad, 0, Math.PI * 2);
        ctx.fill();

        // 4. Planetary Sphere with 3D Sphere Shading
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.clip();

        const sphereGrad = ctx.createRadialGradient(
            this.x - this.radius * 0.35,
            this.y - this.radius * 0.35,
            this.radius * 0.1,
            this.x,
            this.y,
            this.radius
        );
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.25, this.color);
        sphereGrad.addColorStop(0.85, this.color);
        sphereGrad.addColorStop(1, '#050508');
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Surface details by planet type
        if (pd.id === 'jupiter' || pd.id === 'saturn') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            for (let i = -this.radius; i < this.radius; i += 10) {
                if (Math.abs(i) % 20 < 10) {
                    ctx.fillRect(this.x - this.radius, this.y + i, this.radius * 2, 5);
                }
            }
            if (pd.id === 'jupiter') {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.ellipse(this.x + this.radius * 0.3, this.y + this.radius * 0.2, 12, 7, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (pd.id === 'earth' || pd.id === 'trappist-1e') {
            ctx.fillStyle = (pd.id === 'earth') ? '#15803d' : '#0f766e';
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.2, this.y - this.radius * 0.1, this.radius * 0.45, 0, Math.PI * 2);
            ctx.arc(this.x + this.radius * 0.25, this.y + this.radius * 0.2, this.radius * 0.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.65, 0.2, 2.2);
            ctx.stroke();
        } else if (pd.id === 'mars') {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.radius * 0.75, this.radius * 0.25, 0, Math.PI);
            ctx.fill();
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.arc(this.x + this.radius * 0.1, this.y, this.radius * 0.2, 0, Math.PI * 2);
            ctx.fill();
        } else if (pd.id === '55-cancri-e') {
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, 3.0);
            ctx.stroke();
        }

        ctx.restore();

        // 5. Front Rings (cutting across front of planet)
        if (this.hasRings) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(0.35);
            ctx.strokeStyle = this.ringColor;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.ringRadius, this.ringRadius * 0.28, 0, 0, Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        // 6. Name Label Badge
        ctx.save();
        ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        const icon = pd.category === 'solar' ? '🪐' : '✨';
        ctx.fillText(`${icon} ${this.name.toUpperCase()}`, this.x, this.y + this.radius + 18);
        ctx.restore();
    }

    draw(ctx, particleSystem) {
        ctx.save();

        if (this.isPlanet) {
            this.drawPlanet(ctx);
            ctx.restore();
            return;
        }

        // 1. Equipotential Gravity Perimeter Ring
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 1.2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.gravityRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. Binary Stars: Roche Lobe Mass Transfer Bridge!
        if (this.isBinary && this.twin) {
            this.drawRocheLobeBridge(ctx);
        }

        // 3. Relativistic Synchrotron Beams for Pulsars
        if (this.type === 'pulsar') {
            this.drawPulsarBeams(ctx);
        }

        // 4. Volumetric Multi-Layered Stellar Corona & Granulation
        ctx.globalCompositeOperation = 'screen';

        const glowRadius = this.radius * (2.2 + Math.sin(this.pulseTime) * 0.18);
        const grad = ctx.createRadialGradient(this.x, this.y, this.radius * 0.4, this.x, this.y, glowRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(0.7, this.glowColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Convective plasma granulation & prominence loops
        this.drawSolarProminences(ctx);

        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Anamorphic 4-point diffraction cross flare
        ctx.strokeStyle = this.glowColor;
        ctx.lineWidth = 2.0;
        const spikeLen = this.radius * 2.8;
        ctx.beginPath();
        ctx.moveTo(this.x - spikeLen, this.y);
        ctx.lineTo(this.x + spikeLen, this.y);
        ctx.moveTo(this.x, this.y - spikeLen);
        ctx.lineTo(this.x, this.y + spikeLen);
        ctx.stroke();

        ctx.restore();

        if (Math.random() < 0.4 && particleSystem) {
            particleSystem.emitStarCorona(this.x, this.y, this.radius, this.color);
        }
    }

    drawRocheLobeBridge(ctx) {
        // Accretion gas stream siphoning between binary stars
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const midX = (this.x + this.twin.x) / 2;
        const midY = (this.y + this.twin.y) / 2;
        const time = Date.now() * 0.004;

        const bridgeGrad = ctx.createLinearGradient(this.x, this.y, this.twin.x, this.twin.y);
        bridgeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
        bridgeGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
        bridgeGrad.addColorStop(1, 'rgba(244, 63, 94, 0.7)');

        ctx.strokeStyle = bridgeGrad;
        ctx.lineWidth = 8 + Math.sin(time) * 3;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.quadraticCurveTo(midX + Math.sin(time * 2) * 12, midY + Math.cos(time * 2) * 12, this.twin.x, this.twin.y);
        ctx.stroke();

        // Draw Twin star
        const twinGlow = this.twin.radius * (2.0 + Math.sin(this.pulseTime) * 0.15);
        const twinGrad = ctx.createRadialGradient(this.twin.x, this.twin.y, this.twin.radius * 0.3, this.twin.x, this.twin.y, twinGlow);
        twinGrad.addColorStop(0, '#ffffff');
        twinGrad.addColorStop(0.3, this.twin.color);
        twinGrad.addColorStop(0.7, this.twin.glowColor);
        twinGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = twinGrad;
        ctx.beginPath();
        ctx.arc(this.twin.x, this.twin.y, twinGlow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.twin.x, this.twin.y, this.twin.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawPulsarBeams(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.beamAngle);
        ctx.globalCompositeOperation = 'screen';

        const beamLength = this.gravityRadius * 1.5;
        const beamWidth = 24;

        for (let dir of [-1, 1]) {
            const grad = ctx.createLinearGradient(0, 0, 0, dir * beamLength);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.2, 'rgba(236, 72, 153, 0.8)');
            grad.addColorStop(0.7, 'rgba(168, 85, 247, 0.4)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(-beamWidth / 2, 0);
            ctx.lineTo(beamWidth / 2, 0);
            ctx.lineTo(beamWidth * 1.8, dir * beamLength);
            ctx.lineTo(-beamWidth * 1.8, dir * beamLength);
            ctx.closePath();
            ctx.fill();

            // Helical magnetic field lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const helixSteps = 12;
            for (let i = 0; i <= helixSteps; i++) {
                const frac = i / helixSteps;
                const hx = Math.sin(this.pulseTime * 4 + i * 0.8) * (beamWidth * (0.5 + frac * 1.2));
                const hy = dir * beamLength * frac;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    drawSolarProminences(ctx) {
        const time = Date.now() * 0.002;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;

        for (let i = 0; i < 4; i++) {
            const baseAngle = (i / 4) * Math.PI * 2 + time * 0.4;
            const loopHeight = this.radius * (0.35 + Math.sin(time * 3 + i) * 0.15);

            const x1 = this.x + Math.cos(baseAngle - 0.25) * this.radius;
            const y1 = this.y + Math.sin(baseAngle - 0.25) * this.radius;
            const x2 = this.x + Math.cos(baseAngle + 0.25) * this.radius;
            const y2 = this.y + Math.sin(baseAngle + 0.25) * this.radius;
            const cx = this.x + Math.cos(baseAngle) * (this.radius + loopHeight);
            const cy = this.y + Math.sin(baseAngle) * (this.radius + loopHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(cx, cy, x2, y2);
            ctx.stroke();
        }
    }
}

export class Wormhole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 34;
        this.rotation = 0;
        this.teleportDistance = 1400;
    }

    update(dt) {
        this.rotation += dt * 3.8;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalCompositeOperation = 'screen';

        // Multi-tier rotating spiral arms
        for (let r = this.radius; r > 8; r -= 5) {
            ctx.strokeStyle = (r % 10 === 0) ? '#00f7ff' : '#a855f7';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 1.6);
            ctx.stroke();
        }

        // Void core
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }
}

export class Asteroid {
    constructor(x, y, radius = 18) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.vx = (Math.random() - 0.5) * 40;
        this.vy = (Math.random() - 0.5) * 40;
        this.angle = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() - 0.5) * 1.5;

        this.vertices = [];
        const numPoints = 10;
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

        // 3D Relief Crater Shading
        const grad = ctx.createLinearGradient(-this.radius, -this.radius, this.radius, this.radius);
        grad.addColorStop(0, '#64748b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#0f172a');

        ctx.fillStyle = grad;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
        for (let i = 1; i < this.vertices.length; i++) {
            ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Impact crater
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(this.radius * 0.25, -this.radius * 0.2, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.stroke();

        ctx.restore();
    }
}

export class PhotonCore {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.pulse = Math.random() * 10;
    }

    update(dt, ship = null) {
        this.pulse += dt * 4.5;

        if (ship) {
            const d = PhysicsEngine.dist(this.x, this.y, ship.x, ship.y);
            const reach = ship.magneticReach || 110;
            if (d < reach) {
                const pullAngle = PhysicsEngine.angle(this.x, this.y, ship.x, ship.y);
                const speed = 420 * (1 - d / reach);
                this.x += Math.cos(pullAngle) * speed * dt;
                this.y += Math.sin(pullAngle) * speed * dt;
            }
        }
    }

    draw(ctx) {
        const glow = this.radius + Math.sin(this.pulse) * 5;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, glow * 2.2);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, '#fbbf24');
        grad.addColorStop(0.7, 'rgba(251, 191, 36, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glow * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Octahedral faceted diamond crystal
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.pulse * 0.8);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.85, 0);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius * 0.85, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.restore();
    }
}

export class EventHorizon {
    constructor() {
        this.x = -1200;
        this.baseSpeed = 220;
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
        this.waveOffset += dt * 3.5;
    }

    // Beast-Level Gargantua Relativistic Singularity & Doppler Accretion Disk
    draw(ctx, viewportTop, viewportBottom, centerY, height, particleSystem) {
        ctx.save();

        const horizonWidth = 1600;
        const leftEdge = this.x - horizonWidth;
        const top = viewportTop - 150;
        const bottom = viewportBottom + 150;

        // 1. Accretion Disk Relativistic Gradient with Doppler Beaming
        const grad = ctx.createLinearGradient(this.x - 450, 0, this.x + 120, 0);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.35, 'rgba(10, 0, 20, 0.98)');
        grad.addColorStop(0.65, 'rgba(180, 0, 50, 0.85)');
        grad.addColorStop(0.85, 'rgba(255, 80, 0, 0.95)');
        grad.addColorStop(0.95, 'rgba(255, 220, 0, 0.9)');
        grad.addColorStop(1, 'rgba(0, 247, 255, 0)');

        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(leftEdge, top);
        ctx.lineTo(this.x, top);

        const steps = 32;
        const stepHeight = (bottom - top) / steps;
        for (let i = 0; i <= steps; i++) {
            const py = top + i * stepHeight;
            const wave = Math.sin(this.waveOffset + i * 0.35) * 45 + Math.cos(this.waveOffset * 1.6 + i * 0.18) * 22;
            ctx.lineTo(this.x + wave, py);
        }

        ctx.lineTo(leftEdge, bottom);
        ctx.closePath();
        ctx.fill();

        // 2. Gravitational Lensing Halo (Photon Ring)
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.7)';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const py = top + i * stepHeight;
            const wave = Math.sin(this.waveOffset + i * 0.35) * 45 + Math.cos(this.waveOffset * 1.6 + i * 0.18) * 22;
            if (i === 0) ctx.moveTo(this.x + wave, py);
            else ctx.lineTo(this.x + wave, py);
        }
        ctx.stroke();

        ctx.restore();

        if (particleSystem) {
            particleSystem.emitAccretionMatter(this.x, height, centerY);
        }
    }
}
