import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

describe('Chaos Twin Simulation Verification', () => {
    function loadEnvironment() {
        const physicsPath = path.resolve(__dirname, '../js/physics.js');
        const entitiesPath = path.resolve(__dirname, '../js/entities.js');

        const physicsCode = fs.readFileSync(physicsPath, 'utf8');
        const entitiesCode = fs.readFileSync(entitiesPath, 'utf8');

        const sandbox = {
            window: {
                sounds: {
                    playPhaseShift: () => {},
                    playTimeDilation: () => {},
                    init: () => {},
                    resume: () => {},
                    playTetherAttach: () => {},
                    playSlingshotRelease: () => {},
                    playPerfectLaunch: () => {},
                    playBoost: () => {},
                    playCollect: () => {},
                    playWormholeWarp: () => {},
                    playWarningAlarm: () => {},
                    playExplosion: () => {},
                    startTetherHum: () => {},
                    stopTetherHum: () => {}
                }
            },
            Math,
            console,
            Date,
            performance: { now: () => 0 }
        };

        vm.createContext(sandbox);
        vm.runInContext(physicsCode + '\nglobalThis.PhysicsEngine = PhysicsEngine;', sandbox);
        vm.runInContext(entitiesCode + '\nglobalThis.Ship = Ship; globalThis.CelestialBody = CelestialBody;', sandbox);

        return sandbox;
    }

    it('loads PhysicsEngine and Ship into VM context', () => {
        const env = loadEnvironment();
        expect(env.PhysicsEngine).toBeDefined();
        expect(env.Ship).toBeDefined();
        expect(env.CelestialBody).toBeDefined();
    });

    it('asserts that two ships starting 0.000001 apart around a star stay deterministic and record separation', () => {
        function runSimulation() {
            const env = loadEnvironment();
            const physics = new env.PhysicsEngine();
            const star = new env.CelestialBody(400, 0, 'hypergiant');
            const stars = [star];

            const CHAOS_OFFSET = 0.000001;

            // Player ship
            const ship1 = new env.Ship(100, 0, 'vanguard');
            ship1.vx = 320;
            ship1.vy = 40;

            // Chaos twin ship: identical state + CHAOS_OFFSET on x
            const ship2 = new env.Ship(100 + CHAOS_OFFSET, 0, 'vanguard');
            ship2.vx = 320;
            ship2.vy = 40;

            const separations = [];
            const dt = 1 / 120;
            const totalSteps = 120 * 5; // 5 seconds of simulation (600 steps)

            for (let step = 0; step < totalSteps; step++) {
                physics.stepShip(ship1, stars, dt);
                physics.stepShip(ship2, stars, dt);

                const dx = ship1.x - ship2.x;
                const dy = ship1.y - ship2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                separations.push(dist);
            }

            return {
                ship1Final: { x: ship1.x, y: ship1.y, vx: ship1.vx, vy: ship1.vy },
                ship2Final: { x: ship2.x, y: ship2.y, vx: ship2.vx, vy: ship2.vy },
                initialSep: separations[0],
                finalSep: separations[separations.length - 1],
                separations
            };
        }

        const runA = runSimulation();
        const runB = runSimulation();

        // 1. Assert exact determinism across duplicate runs
        expect(runA.ship1Final.x).toBe(runB.ship1Final.x);
        expect(runA.ship1Final.y).toBe(runB.ship1Final.y);
        expect(runA.ship2Final.x).toBe(runB.ship2Final.x);
        expect(runA.ship2Final.y).toBe(runB.ship2Final.y);
        expect(runA.finalSep).toBe(runB.finalSep);

        // 2. Assert separation is recorded and positive
        expect(runA.separations.length).toBe(600);
        expect(runA.initialSep).toBeGreaterThan(0);
        expect(runA.finalSep).toBeGreaterThan(0);
        expect(Number.isFinite(runA.finalSep)).toBe(true);
    });
});
