/**
 * @file main.js
 * Application entry point: initializes canvas and boot sequences.
 */

import { Config } from './config.js';

console.log('Slingshot: Event Horizon initialized', {
  timestep: Config.sim.dt,
  features: Config.features
});

const canvas = document.getElementById('gameCanvas');
if (canvas) {
  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  // Initial peaceful void clear
  ctx.fillStyle = '#070914';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
