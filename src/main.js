/**
 * @file main.js
 * Slingshot: Event Horizon - Application Entry Point
 * Initializes configuration, audio systems, and boots the Game engine.
 */

import { Config } from './config.js';
import { Game } from './game/game.js';

console.log('🌌 Slingshot: Event Horizon bootstrapping...', {
  dt: Config.sim.dt,
  features: Config.features,
  physicsEps: Config.physics.eps
});

function boot() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas #gameCanvas not found in document!');
    return;
  }
  window.game = new Game();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
