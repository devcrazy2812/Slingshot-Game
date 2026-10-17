import { describe, it, expect } from 'vitest';
import { Config } from '../src/config.js';

describe('Milestone M0 Scaffold Verification', () => {
  it('loads configuration constants correctly', () => {
    expect(Config).toBeDefined();
    expect(Config.sim.dt).toBeCloseTo(1 / 120, 5);
    expect(Config.physics.eps).toBe(8.0);
    expect(Config.audio.masterGain).toBeLessThanOrEqual(0.3);
  });

  it('verifies all required feature flags exist', () => {
    expect(Config.features.labMode).toBe(true);
    expect(Config.features.truthMode).toBe(true);
    expect(Config.features.timeDilation).toBe(true);
  });
});
