/**
 * @file planet-sim.js
 * High-Precision Procedural Planetary Surface & Exoplanetary Physics Simulation Engine
 * Simulates real-time atmospheric, geological, and astrophysical conditions
 * for Solar System planets and exotic Known Exoplanets.
 */

export class PlanetSimulationEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.planet = null;
        this.animFrameId = null;
        this.particles = [];
        this.time = 0;
        this.droneActive = false;
        this.dronePos = { x: 0, y: 0 };
        this.droneTarget = { x: 0, y: 0 };
        this.scanProgress = 0;
    }

    setPlanet(planetData) {
        this.planet = planetData;
        this.time = 0;
        this.droneActive = false;
        this.scanProgress = 0;
        this.initParticles();
    }

    initParticles() {
        this.particles = [];
        const count = 70;
        const w = this.canvas.width || 600;
        const h = this.canvas.height || 360;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 40,
                vy: (Math.random() - 0.5) * 20,
                size: Math.random() * 3 + 1,
                alpha: Math.random() * 0.7 + 0.3,
                life: Math.random() * 5 + 2
            });
        }
    }

    start() {
        this.stop();
        const render = () => {
            this.renderFrame();
            this.animFrameId = requestAnimationFrame(render);
        };
        this.animFrameId = requestAnimationFrame(render);
    }

    stop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    deployDrone() {
        this.droneActive = true;
        this.scanProgress = 0;
        this.dronePos = { x: 50, y: 80 };
        this.droneTarget = { x: this.canvas.width * 0.7, y: this.canvas.height * 0.55 };
    }

    renderFrame() {
        if (!this.planet || !this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.time += 0.016;

        ctx.clearRect(0, 0, w, h);

        if (this.planet.category === 'solar') {
            this.renderSolarSurface(ctx, w, h);
        } else {
            this.renderExoplanetDossier(ctx, w, h);
        }

        // Render Drone if deployed
        if (this.droneActive) {
            this.renderDrone(ctx, w, h);
        }
    }

    renderSolarSurface(ctx, w, h) {
        const id = this.planet.id;
        const t = this.time;

        if (id === 'mars') {
            // Mars Red Planet: Jagged rust crags, dust storm particles, pink salmon sky
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
            skyGrad.addColorStop(0, '#7f1d1d');
            skyGrad.addColorStop(0.55, '#f43f5e');
            skyGrad.addColorStop(1, '#b91c1c');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h);

            // Distant Olympus Mons silhouette
            ctx.fillStyle = 'rgba(153, 27, 27, 0.6)';
            ctx.beginPath();
            ctx.moveTo(w * 0.3, h * 0.7);
            ctx.lineTo(w * 0.55, h * 0.38);
            ctx.lineTo(w * 0.8, h * 0.7);
            ctx.closePath();
            ctx.fill();

            // Midground jagged ridges
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.65);
            for (let x = 0; x <= w; x += 30) {
                const y = h * 0.65 + Math.sin(x * 0.02 + 1) * 20 + Math.cos(x * 0.05) * 8;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Foreground sand dunes & basalt boulders
            ctx.fillStyle = '#7f1d1d';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.78);
            for (let x = 0; x <= w; x += 20) {
                const y = h * 0.78 + Math.sin(x * 0.015) * 15;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Atmospheric rust dust storm particles
            ctx.fillStyle = 'rgba(254, 205, 211, 0.45)';
            for (const p of this.particles) {
                p.x += (p.vx + 65) * 0.016;
                p.y += (Math.sin(t * 3 + p.x * 0.01) * 8) * 0.016;
                if (p.x > w) p.x = 0;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (id === 'venus') {
            // Venus: Heavy sulfuric acid cloud decks, glowing lava veins, heat distortion
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
            skyGrad.addColorStop(0, '#ca8a04');
            skyGrad.addColorStop(0.5, '#ea580c');
            skyGrad.addColorStop(1, '#7c2d12');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h);

            // Roiling sulfuric cloud layer
            ctx.fillStyle = 'rgba(254, 240, 138, 0.25)';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.ellipse(
                    (w * 0.25 * i + t * 25) % (w + 100) - 50,
                    h * 0.2 + Math.sin(t + i) * 12,
                    140, 35, 0, 0, Math.PI * 2
                );
                ctx.fill();
            }

            // Basaltic rocky surface
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.7);
            for (let x = 0; x <= w; x += 25) {
                const y = h * 0.7 + Math.sin(x * 0.03) * 15;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Incandescent lava fissures
            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(w * 0.2, h);
            ctx.lineTo(w * 0.35, h * 0.85);
            ctx.lineTo(w * 0.5, h * 0.88);
            ctx.lineTo(w * 0.7, h * 0.8);
            ctx.lineTo(w * 0.9, h);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else if (id === 'jupiter') {
            // Jupiter: Counter-rotating amber cloud bands, Great Red Spot vortex, lightning
            for (let y = 0; y < h; y += 14) {
                const bandIndex = Math.floor(y / 28);
                const speed = (bandIndex % 2 === 0 ? 1 : -1) * 35;
                const offset = (t * speed) % w;

                const grad = ctx.createLinearGradient(0, y, 0, y + 14);
                if (bandIndex % 3 === 0) {
                    grad.addColorStop(0, '#b45309');
                    grad.addColorStop(1, '#78350f');
                } else if (bandIndex % 3 === 1) {
                    grad.addColorStop(0, '#fde68a');
                    grad.addColorStop(1, '#d97706');
                } else {
                    grad.addColorStop(0, '#d97706');
                    grad.addColorStop(1, '#92400e');
                }
                ctx.fillStyle = grad;
                ctx.fillRect(0, y, w, 14);
            }

            // Great Red Spot Oval Storm Vortex
            ctx.save();
            ctx.translate(w * 0.65, h * 0.55);
            ctx.rotate(t * 0.4);
            const spotGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 75);
            spotGrad.addColorStop(0, '#ef4444');
            spotGrad.addColorStop(0.6, '#b91c1c');
            spotGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');
            ctx.fillStyle = spotGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, 85, 48, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Atmospheric lightning flash
            if (Math.sin(t * 7) > 0.94) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.fillRect(0, 0, w, h);
            }

        } else if (id === 'saturn') {
            // Saturn: Golden cloud deck with giant Ring Arcs cutting across the sky
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
            skyGrad.addColorStop(0, '#1c1917');
            skyGrad.addColorStop(0.5, '#78350f');
            skyGrad.addColorStop(1, '#fde68a');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h);

            // Colossal Ring Arcs arching from horizon to zenith
            ctx.save();
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.4)';
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.ellipse(w * 0.4, h * 0.9, w * 0.65, h * 0.75, -0.3, Math.PI, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.ellipse(w * 0.4, h * 0.9, w * 0.72, h * 0.82, -0.3, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Ammonia cirrus cloud bands below
            ctx.fillStyle = 'rgba(254, 243, 199, 0.6)';
            for (let i = 0; i < 5; i++) {
                const y = h * 0.65 + i * 16;
                ctx.fillRect(0, y, w, 10);
            }

        } else if (id === 'mercury') {
            // Mercury: Airless cratered surface, blinding Sun in pitch-black space
            ctx.fillStyle = '#050508';
            ctx.fillRect(0, 0, w, h);

            // Blinding massive Sun with corona
            const sunX = w * 0.22;
            const sunY = h * 0.28;
            const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 110);
            sunGrad.addColorStop(0, '#ffffff');
            sunGrad.addColorStop(0.2, '#fef08a');
            sunGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.35)');
            sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = sunGrad;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
            ctx.fill();

            // Cratered monochrome basalt surface
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.68);
            for (let x = 0; x <= w; x += 15) {
                const y = h * 0.68 + Math.sin(x * 0.04) * 12 + Math.cos(x * 0.08) * 6;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Caloris Basin crater rims & stark shadows
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.ellipse(w * 0.55, h * 0.82, 60, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.5;
            ctx.stroke();

        } else if (id === 'earth') {
            // Earth: Sapphire blue sky, rolling blue ocean waves, green continent shore
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
            skyGrad.addColorStop(0, '#0284c7');
            skyGrad.addColorStop(0.7, '#38bdf8');
            skyGrad.addColorStop(1, '#bae6fd');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h * 0.6);

            // Emerald landmass horizon
            ctx.fillStyle = '#15803d';
            ctx.beginPath();
            ctx.moveTo(0, h * 0.58);
            for (let x = 0; x <= w; x += 30) {
                const y = h * 0.58 + Math.sin(x * 0.02) * 10;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h * 0.65);
            ctx.lineTo(0, h * 0.65);
            ctx.closePath();
            ctx.fill();

            // Rolling ocean water waves
            const oceanGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
            oceanGrad.addColorStop(0, '#0369a1');
            oceanGrad.addColorStop(1, '#0c4a6e');
            ctx.fillStyle = oceanGrad;
            ctx.beginPath();
            ctx.moveTo(0, h * 0.62);
            for (let x = 0; x <= w; x += 15) {
                const y = h * 0.62 + Math.sin(x * 0.04 + t * 4) * 6;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fill();

            // Fluffy drifting cumulus clouds
            ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            for (let i = 0; i < 3; i++) {
                const cx = (w * 0.35 * i + t * 18) % (w + 140) - 70;
                const cy = h * 0.25 + Math.sin(i) * 15;
                ctx.beginPath();
                ctx.ellipse(cx, cy, 55, 18, 0, 0, Math.PI * 2);
                ctx.fill();
            }

        } else if (id === 'neptune' || id === 'uranus') {
            // Neptune / Uranus: Deep blue/aquamarine supersonic howling winds & methane storms
            const isUranus = (id === 'uranus');
            const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
            skyGrad.addColorStop(0, isUranus ? '#083344' : '#0f172a');
            skyGrad.addColorStop(0.5, isUranus ? '#0e7490' : '#1e3a8a');
            skyGrad.addColorStop(1, isUranus ? '#06b6d4' : '#2563eb');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, w, h);

            // Supersonic horizontal storm streaks
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            for (let y = 30; y < h; y += 28) {
                const speed = 120 + (y % 40) * 3;
                const offset = (t * speed) % (w + 120) - 60;
                ctx.fillRect(offset, y, 90, 3.5);
            }

            // Great Dark Spot Storm vortex for Neptune
            if (!isUranus) {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
                ctx.beginPath();
                ctx.ellipse(w * 0.5, h * 0.5, 75, 35, -0.15, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    }

    renderExoplanetDossier(ctx, w, h) {
        const id = this.planet.id;
        const t = this.time;

        // Deep cosmic void backdrop
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, w, h);

        // Distant alien starfield
        for (let i = 0; i < 40; i++) {
            const sx = (Math.sin(i * 12.3) * 0.5 + 0.5) * w;
            const sy = (Math.cos(i * 34.5) * 0.5 + 0.5) * h;
            ctx.fillStyle = (i % 3 === 0) ? '#38bdf8' : '#ffffff';
            ctx.fillRect(sx, sy, 1.2, 1.2);
        }

        // Central Planet Sphere
        const cx = w * 0.5;
        const cy = h * 0.48;
        const rad = 85;

        if (id === 'wasp-76b') {
            // WASP-76b: Tidally locked day/night terminator with falling liquid iron rain
            const planetGrad = ctx.createLinearGradient(cx - rad, cy, cx + rad, cy);
            planetGrad.addColorStop(0, '#f97316'); // 2,400°C Day-side
            planetGrad.addColorStop(0.5, '#7f1d1d'); // Terminator
            planetGrad.addColorStop(1, '#1e1b4b'); // Night-side
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();

            // Falling molten liquid iron streaks on the nightside
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.6;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8;
            for (let i = 0; i < 25; i++) {
                const rx = cx + (i % 7) * 9 + 10;
                const ry = cy - rad * 0.7 + ((t * 140 + i * 22) % (rad * 1.6));
                if (Math.hypot(rx - cx, ry - cy) < rad - 5) {
                    ctx.beginPath();
                    ctx.moveTo(rx, ry);
                    ctx.lineTo(rx - 3, ry + 12);
                    ctx.stroke();
                }
            }
            ctx.shadowBlur = 0;

        } else if (id === '55-cancri-e') {
            // 55 Cancri e: Molten lava oceans & diamond crystal bedrock
            const planetGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, rad);
            planetGrad.addColorStop(0, '#fbbf24');
            planetGrad.addColorStop(0.5, '#ea580c');
            planetGrad.addColorStop(0.85, '#451a03');
            planetGrad.addColorStop(1, '#000000');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();

            // Glowing lava fractures
            ctx.strokeStyle = '#ffedd5';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#f97316';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, rad * 0.6, t, t + 1.5);
            ctx.stroke();
            ctx.shadowBlur = 0;

        } else if (id === 'hd-189733-b') {
            // HD 189733 b: Deep cobalt blue marble with roaring sideways glass rain
            const planetGrad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, rad);
            planetGrad.addColorStop(0, '#60a5fa');
            planetGrad.addColorStop(0.5, '#1d4ed8');
            planetGrad.addColorStop(1, '#020617');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();

            // Supersonic horizontal glass storm streaks
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 1.4;
            for (let i = 0; i < 20; i++) {
                const py = cy - rad * 0.7 + i * 6;
                const px = cx - rad * 0.8 + ((t * 180 + i * 35) % (rad * 1.6));
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + 18, py);
                ctx.stroke();
            }

        } else if (id === 'gliese-436-b') {
            // Gliese 436 b: Burning ice with 14 million km comet-like hydrogen tail
            ctx.save();
            const tailGrad = ctx.createLinearGradient(cx, cy, cx - rad * 2.8, cy + 20);
            tailGrad.addColorStop(0, 'rgba(6, 182, 212, 0.6)');
            tailGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
            ctx.fillStyle = tailGrad;
            ctx.beginPath();
            ctx.moveTo(cx, cy - rad * 0.8);
            ctx.lineTo(cx - rad * 2.8, cy - 40);
            ctx.lineTo(cx - rad * 2.8, cy + 60);
            ctx.lineTo(cx, cy + rad * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Cyan ice sphere
            const iceGrad = ctx.createRadialGradient(cx - 15, cy - 15, 10, cx, cy, rad);
            iceGrad.addColorStop(0, '#ffffff');
            iceGrad.addColorStop(0.5, '#06b6d4');
            iceGrad.addColorStop(1, '#0e7490');
            ctx.fillStyle = iceGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();

        } else {
            // Standard exotic exoplanet shader
            const planetGrad = ctx.createRadialGradient(cx - 20, cy - 20, 15, cx, cy, rad);
            planetGrad.addColorStop(0, '#ffffff');
            planetGrad.addColorStop(0.4, this.planet.color || '#38bdf8');
            planetGrad.addColorStop(1, '#020617');
            ctx.fillStyle = planetGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, rad, 0, Math.PI * 2);
            ctx.fill();
        }

        // Luminous Atmospheric Rim
        ctx.strokeStyle = this.planet.atmosphereColor || 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(cx, cy, rad + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    renderDrone(ctx, w, h) {
        this.scanProgress = Math.min(1.0, this.scanProgress + 0.015);
        this.dronePos.x += (this.droneTarget.x - this.dronePos.x) * 0.05;
        this.dronePos.y += (this.droneTarget.y - this.dronePos.y) * 0.05;

        const dx = this.dronePos.x;
        const dy = this.dronePos.y;

        ctx.save();
        // Scanning laser cone downward
        const laserGrad = ctx.createLinearGradient(dx, dy, dx, dy + 80);
        laserGrad.addColorStop(0, 'rgba(0, 247, 255, 0.8)');
        laserGrad.addColorStop(1, 'rgba(0, 247, 255, 0)');
        ctx.fillStyle = laserGrad;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - 30, dy + 80);
        ctx.lineTo(dx + 30, dy + 80);
        ctx.closePath();
        ctx.fill();

        // Quadcopter Drone body
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#00f7ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dx, dy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rotors
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(dx - 14, dy - 4);
        ctx.lineTo(dx + 14, dy - 4);
        ctx.stroke();

        // Scan progress bar above drone
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(dx - 30, dy - 20, 60, 6);
        ctx.fillStyle = '#00f7ff';
        ctx.fillRect(dx - 30, dy - 20, 60 * this.scanProgress, 6);

        ctx.restore();
    }
}

if (typeof window !== 'undefined') {
    window.PlanetSimulationEngine = PlanetSimulationEngine;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PlanetSimulationEngine };
}
