/**
 * @file orbs.js
 * Procedural Canvas/Shader Orbs inspired by https://github.com/zzzzshawn/orbkit
 * Provides real-time rendering of Hydrogen (shdr-11), Dispersion (shdr-01), and Corona (shdr-31) orbs.
 */

export class OrbRenderer {
  /**
   * Renders Hydrogen Orbital Orb (shdr-11 style)
   * Quantum wave interference pattern with rotating precession and chromatic rim.
   */
  static renderHydrogenOrb(ctx, width, height, time, state = 'idle') {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;

    const excitement = state === 'speaking' ? 1.0 : (state === 'thinking' ? 0.6 : 0.2);
    const rotSpeed = 0.8 + excitement * 0.8;
    const animTime = time * rotSpeed;

    ctx.save();

    // 1. Outer chromatic rim / caustic halo
    const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.25);
    rimGrad.addColorStop(0, 'rgba(0, 247, 255, 0.0)');
    rimGrad.addColorStop(0.7, 'rgba(0, 247, 255, 0.25)');
    rimGrad.addColorStop(0.9, 'rgba(168, 85, 247, 0.35)');
    rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Dark Sphere Shell
    const baseGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
    baseGrad.addColorStop(0, '#131b2e');
    baseGrad.addColorStop(0.7, '#070a14');
    baseGrad.addColorStop(1, '#020408');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Clipped Quantum Wave Interference Layers
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Swirling nodal wave filaments
    const rings = 6;
    for (let i = 0; i < rings; i++) {
      const ringFrac = (i + 1) / rings;
      const waveRadius = radius * (0.2 + ringFrac * 0.75);
      const wobble = Math.sin(animTime * 1.8 + i * 1.2) * (6 + excitement * 10);
      const angleOffset = animTime * 0.7 + i * (Math.PI / 3);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleOffset);
      ctx.scale(1.0, 0.55 + Math.sin(animTime + i) * 0.2);

      const color = i % 2 === 0 ? 'rgba(0, 247, 255, 0.45)' : 'rgba(236, 72, 153, 0.4)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 + excitement * 1.5;
      ctx.beginPath();
      ctx.arc(0, wobble, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Specular highlight on dome
    const specGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.38, 1, cx - radius * 0.35, cy - radius * 0.38, radius * 0.45);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    specGrad.addColorStop(0.3, 'rgba(0, 247, 255, 0.4)');
    specGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.arc(cx - radius * 0.35, cy - radius * 0.38, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end clip

    // 4. Knife-sharp rim stroke
    ctx.strokeStyle = 'rgba(0, 247, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders Dispersion Cut-Glass Orb (shdr-01 style)
   * Prismatic rainbow striations and grazing edge glow.
   */
  static renderDispersionOrb(ctx, width, height, time, state = 'idle') {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;

    const animTime = time * 1.2;
    ctx.save();

    // 1. Prismatic caustic aura
    const caustic = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 1.35);
    caustic.addColorStop(0, 'rgba(168, 85, 247, 0.1)');
    caustic.addColorStop(0.6, 'rgba(59, 130, 246, 0.25)');
    caustic.addColorStop(0.85, 'rgba(244, 63, 94, 0.3)');
    caustic.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = caustic;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // 2. Core Body
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    coreGrad.addColorStop(0, '#1e113a');
    coreGrad.addColorStop(0.65, '#0b0517');
    coreGrad.addColorStop(1, '#020005');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Clipped Internal Rainbow Facets
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const facets = 8;
    for (let i = 0; i < facets; i++) {
      const a = animTime * 0.6 + (i * Math.PI) / facets;
      const x1 = cx + Math.cos(a) * radius * 1.1;
      const y1 = cy + Math.sin(a) * radius * 1.1;
      const x2 = cx - Math.cos(a) * radius * 1.1;
      const y2 = cy - Math.sin(a) * radius * 1.1;

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, 'rgba(255, 0, 128, 0.35)');
      grad.addColorStop(0.35, 'rgba(0, 255, 255, 0.4)');
      grad.addColorStop(0.7, 'rgba(255, 215, 0, 0.35)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0.4)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx + Math.sin(animTime + i) * 20, cy + Math.cos(animTime + i) * 20, x2, y2);
      ctx.stroke();
    }

    ctx.restore();

    // Knife edge
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Renders Corona / Solar Raymarched Orb (shdr-31 style)
   * Dense amber/gold godrays and solar flare filaments.
   */
  static renderCoronaOrb(ctx, width, height, time, state = 'idle') {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.42;

    const animTime = time * 1.1;
    ctx.save();

    // 1. Volumetric Godrays
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const a = (i / rayCount) * Math.PI * 2 + animTime * 0.3;
      const len = radius * (1.15 + Math.sin(animTime * 2 + i * 1.5) * 0.22);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      const rayGrad = ctx.createLinearGradient(0, 0, len, 0);
      rayGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
      rayGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.2)');
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Base Core
    const baseGrad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
    baseGrad.addColorStop(0, '#fffbeb');
    baseGrad.addColorStop(0.2, '#fef08a');
    baseGrad.addColorStop(0.55, '#f59e0b');
    baseGrad.addColorStop(0.85, '#b45309');
    baseGrad.addColorStop(1, '#451a03');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Corona Rim
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
