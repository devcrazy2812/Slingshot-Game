/**
 * @file config.js
 * Central configuration repository containing all tunable physics, rendering,
 * audio parameters, and feature flags. No magic numbers allowed elsewhere.
 */

export const Config = Object.freeze({
  // Simulation Timestep
  sim: {
    dt: 1 / 120, // 120Hz fixed physics step (seconds)
    maxSubSteps: 10,
    timeScale: 1.0,
  },

  // Physics & Gravitation Constants
  physics: {
    eps: 8.0, // Softening length to prevent division by zero
    baseMu: 650000, // Gravitational parameter scale (G * M)
    maxSpeed: 950, // Absolute velocity clamp (px/s)
    minSpeed: 150, // Minimum cruising velocity (px/s)
    tetherRange: 320, // Maximum tether attach distance
    tetherMaxTension: 3500, // Rope tension snap threshold (v_rel^2 / L)
    lMin: 40, // Minimum rope length
    lMax: 340, // Maximum rope length
  },

  // Black Hole Chaser (Hazard)
  hazard: {
    v0: 200, // Initial velocity
    accel: 8, // Acceleration (px/s^2)
    r0: 180, // Initial singularity radius
    growth: 1.2, // Growth rate
    startOffsetX: -1400, // Initial offset behind ship
  },

  // Relativistic Time Dilation (Exaggerated for gameplay)
  dilation: {
    enabled: true,
    kappa: 0.0000015, // Potential scaling constant
    fMin: 0.35, // Minimum time rate near masses
  },

  // Audio Specifications (Strict Web Audio)
  audio: {
    masterGain: 0.3, // Hard ceiling for hearing safety
    enabled: true,
    tempo: 124, // BPM
  },

  // Visuals & Accessibility
  visuals: {
    maxFlashesPerSecond: 3, // WCAG compliance limit
    prefersReducedMotion: false,
    screenShakeEnabled: true,
    flashEffectsEnabled: true,
    spacetimeGridCellSize: 95,
  },

  // Feature Flags
  features: {
    labMode: true,
    truthMode: true,
    timeDilation: true,
    chaosTwin: true,
    dailyGalaxy: true,
  }
});
