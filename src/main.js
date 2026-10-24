/**
 * @file main.js
 * Slingshot: Event Horizon - Application Entry Point
 * Initializes configuration, audio systems, boots the Game engine,
 * and runs the Orbkit-style procedural preview orb animators.
 */

import { Config } from './config.js';
import { Game } from './game/game.js';
import { OrbRenderer } from './render/orbs.js';

console.log('🌌 Slingshot: Event Horizon bootstrapping with Orbkit UI/UX...', {
  dt: Config.sim.dt,
  features: Config.features,
  physicsEps: Config.physics.eps
});

function initOrbPreviews() {
  const cVanguard = document.getElementById('orbCanvasVanguard');
  const cPhantom = document.getElementById('orbCanvasPhantom');
  const cDreadnought = document.getElementById('orbCanvasDreadnought');

  const ctxVanguard = cVanguard?.getContext('2d');
  const ctxPhantom = cPhantom?.getContext('2d');
  const ctxDreadnought = cDreadnought?.getContext('2d');

  function renderOrbs(t) {
    const time = t * 0.0015;

    if (ctxVanguard && cVanguard) {
      OrbRenderer.renderHydrogenOrb(ctxVanguard, cVanguard.width, cVanguard.height, time, 'speaking');
    }
    if (ctxPhantom && cPhantom) {
      OrbRenderer.renderDispersionOrb(ctxPhantom, cPhantom.width, cPhantom.height, time, 'thinking');
    }
    if (ctxDreadnought && cDreadnought) {
      OrbRenderer.renderCoronaOrb(ctxDreadnought, cDreadnought.width, cDreadnought.height, time, 'idle');
    }

    requestAnimationFrame(renderOrbs);
  }

  requestAnimationFrame(renderOrbs);
}

function boot() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas #gameCanvas not found in document!');
    return;
  }
  window.game = new Game();
  initOrbPreviews();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Request landscape orientation lock when supported
if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
  screen.orientation.lock('landscape').catch(() => {});
}

// iOS WebKit & Android user interaction audio unlock
const unlockAudio = () => {
  if (window.sounds && typeof window.sounds.resume === 'function') {
    window.sounds.resume();
  }
};
if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });
}
