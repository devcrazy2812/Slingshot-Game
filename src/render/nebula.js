/**
 * @file nebula.js
 * Beast-Level Deep Space Volumetric Nebula & Atmospheric Starfield Engine
 * Uses pre-cached offscreen canvas cloud buffers for high-performance 120 FPS rendering.
 */

export class NebulaRenderer {
    constructor() {
        this.cloudCanvases = [];
        this.numClouds = 5;
        this.initCloudBuffers();

        // Fixed seed stars for smooth consistent background starfield
        this.deepStars = this.generateStarfield(120, 1.2, 0.08);
        this.midStars = this.generateStarfield(80, 2.0, 0.25);
        this.brightStars = this.generateStarfield(30, 3.2, 0.55);
    }

    initCloudBuffers() {
        const sizes = [512, 640, 480, 560, 512];
        const colors = [
            { r: 0, g: 247, b: 255, a: 0.12 },   // Ion cyan
            { r: 168, g: 85, b: 247, a: 0.14 }, // Cosmic violet
            { r: 244, g: 63, b: 94, a: 0.10 },  // Hydrogen alpha crimson
            { r: 59, g: 130, b: 246, a: 0.11 },  // Cobalt blue
            { r: 251, g: 191, b: 36, a: 0.09 }   // Stellar amber
        ];

        for (let i = 0; i < this.numClouds; i++) {
            const size = sizes[i];
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const col = colors[i];

            const cx = size / 2;
            const cy = size / 2;
            const grad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.48);
            grad.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a * 1.8})`);
            grad.addColorStop(0.4, `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a})`);
            grad.addColorStop(0.75, `rgba(${col.r}, ${col.g}, ${col.b}, ${col.a * 0.3})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
            ctx.fill();

            this.cloudCanvases.push(canvas);
        }
    }

    generateStarfield(count, maxSize, parallaxSpeed) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                relX: Math.random() * 3200,
                relY: (Math.random() - 0.5) * 2400,
                size: Math.random() * maxSize + 0.6,
                baseAlpha: Math.random() * 0.6 + 0.4,
                twinkleSpeed: Math.random() * 3.0 + 1.0,
                twinklePhase: Math.random() * Math.PI * 2,
                hasSpikes: Math.random() < 0.25,
                color: Math.random() > 0.6 ? '#00f7ff' : (Math.random() > 0.5 ? '#fbcfe8' : '#ffffff')
            });
        }
        stars.parallaxSpeed = parallaxSpeed;
        return stars;
    }

    draw(ctx, camX, camY, viewLeft, viewRight, viewTop, viewBottom, time) {
        ctx.save();

        // 1. Draw Deep Volumetric Gaseous Emission Nebula Clouds
        ctx.globalCompositeOperation = 'screen';
        const cloudGridW = 1800;
        const cloudGridH = 1400;
        const cloudParallax = 0.05;

        const startCol = Math.floor((camX * cloudParallax - 900) / cloudGridW);
        const endCol = Math.ceil((camX * cloudParallax + 1600) / cloudGridW);

        for (let c = startCol; c <= endCol; c++) {
            const cloudIdx = Math.abs(c) % this.numClouds;
            const img = this.cloudCanvases[cloudIdx];
            const px = (c * cloudGridW) / cloudParallax;
            const py = (Math.sin(c * 1.7) * 400);

            if (px + img.width > viewLeft - 300 && px - img.width < viewRight + 300) {
                ctx.drawImage(img, px - img.width / 2, py - img.height / 2);
            }
        }

        // 2. Draw Multi-Layer Parallax Starfield with Twinkle & Diffraction Spikes
        const starLayers = [this.deepStars, this.midStars, this.brightStars];

        for (const layer of starLayers) {
            const pSpeed = layer.parallaxSpeed;
            const cellW = 3200;
            const cellH = 2400;

            const minCellX = Math.floor((camX * pSpeed) / cellW);
            const maxCellX = Math.ceil((camX * pSpeed + (viewRight - viewLeft)) / cellW);

            for (let cx = minCellX - 1; cx <= maxCellX; cx++) {
                const offsetX = cx * cellW / pSpeed;

                for (const s of layer) {
                    const sx = s.relX / pSpeed + offsetX - (camX * (1 - pSpeed) / pSpeed);
                    const sy = s.relY;

                    if (sx >= viewLeft - 50 && sx <= viewRight + 50 && sy >= viewTop - 50 && sy <= viewBottom + 50) {
                        const twinkle = Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.35 + 0.65;
                        ctx.globalAlpha = s.baseAlpha * twinkle;
                        ctx.fillStyle = s.color;

                        if (s.size <= 1.6) {
                            ctx.fillRect(sx - s.size * 0.5, sy - s.size * 0.5, s.size, s.size);
                        } else {
                            ctx.beginPath();
                            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
                            ctx.fill();

                            // Anamorphic 4-point starburst spikes on prominent stars
                            if (s.hasSpikes && s.size > 2.0) {
                                ctx.strokeStyle = s.color;
                                ctx.lineWidth = 1;
                                const spikeLen = s.size * 3.5;
                                ctx.beginPath();
                                ctx.moveTo(sx - spikeLen, sy);
                                ctx.lineTo(sx + spikeLen, sy);
                                ctx.moveTo(sx, sy - spikeLen);
                                ctx.lineTo(sx, sy + spikeLen);
                                ctx.stroke();
                            }
                        }
                    }
                }
            }
        }

        ctx.restore();
    }
}
