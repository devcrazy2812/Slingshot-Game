import { describe, it, expect, beforeEach } from 'vitest';
import { MISSION_TASKS, TaskManager } from '../src/game/tasks.js';

describe('Mission Tasks & Directives Engine', () => {
    let mockGame;

    beforeEach(() => {
        // Clear local storage
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }

        mockGame = {
            score: 0,
            maxSpeed: 0,
            perfectSlingshots: 0,
            discoveredPlanets: new Set(),
            probesDeployed: 0,
            wormholeJumps: 0,
            combo: 1,
            ship: { x: 0, y: 0 },
            exoplanetExplored: false,
            particles: {
                emitShockwave: () => {},
                emitExplosion: () => {}
            },
            addFloatingText: () => {}
        };
    });

    it('defines 8 distinct flight, navigation, and exploration directives', () => {
        expect(MISSION_TASKS.length).toBe(8);

        const taskIds = MISSION_TASKS.map(t => t.id);
        expect(taskIds).toContain('task_speed');
        expect(taskIds).toContain('task_slingshot');
        expect(taskIds).toContain('task_explore');
        expect(taskIds).toContain('task_probe');
        expect(taskIds).toContain('task_wormhole');
        expect(taskIds).toContain('task_combo');
        expect(taskIds).toContain('task_distance');
        expect(taskIds).toContain('task_exoplanet');

        MISSION_TASKS.forEach(t => {
            expect(t.title).toBeDefined();
            expect(t.description).toBeDefined();
            expect(t.category).toBeDefined();
            expect(t.reward).toBeGreaterThan(0);
            expect(typeof t.check).toBe('function');
        });
    });

    it('correctly assesses individual task progression and completion', () => {
        const speedTask = MISSION_TASKS.find(t => t.id === 'task_speed');
        mockGame.maxSpeed = 300; // 0.50 c
        expect(speedTask.check(mockGame).completed).toBe(false);
        mockGame.maxSpeed = 480; // 0.80 c
        expect(speedTask.check(mockGame).completed).toBe(true);

        const slingTask = MISSION_TASKS.find(t => t.id === 'task_slingshot');
        mockGame.perfectSlingshots = 2;
        expect(slingTask.check(mockGame).completed).toBe(false);
        mockGame.perfectSlingshots = 3;
        expect(slingTask.check(mockGame).completed).toBe(true);

        const distTask = MISSION_TASKS.find(t => t.id === 'task_distance');
        mockGame.ship.x = 100000; // 1000 LY
        expect(distTask.check(mockGame).completed).toBe(false);
        mockGame.ship.x = 150000; // 1500 LY
        expect(distTask.check(mockGame).completed).toBe(true);

        const exoTask = MISSION_TASKS.find(t => t.id === 'task_exoplanet');
        expect(exoTask.check(mockGame).completed).toBe(false);
        mockGame.exoplanetExplored = true;
        expect(exoTask.check(mockGame).completed).toBe(true);
    });

    it('manages task completion, awards points, and calculates pilot rank', () => {
        const manager = new TaskManager(mockGame);
        expect(manager.getCompletedCount()).toBe(0);
        expect(manager.getRank().title).toBe('CADET PILOT');

        // Satisfy speed and slingshot
        mockGame.maxSpeed = 500;
        mockGame.perfectSlingshots = 3;
        manager.checkAll();

        expect(manager.getCompletedCount()).toBe(2);
        expect(mockGame.score).toBe(1100); // 500 + 600
        expect(manager.getRank().title).toBe('COSMIC SPECIALIST');

        // Satisfy all tasks
        mockGame.discoveredPlanets.add('mars');
        mockGame.probesDeployed = 1;
        mockGame.wormholeJumps = 1;
        mockGame.combo = 3;
        mockGame.ship.x = 160000;
        mockGame.exoplanetExplored = true;
        manager.checkAll();

        expect(manager.getCompletedCount()).toBe(8);
        expect(manager.getRank().title).toBe('EVENT HORIZON VANGUARD');
    });
});
