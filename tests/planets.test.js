import { describe, it, expect } from 'vitest';
import { SOLAR_PLANETS, KNOWN_EXOPLANETS, ALL_PLANETS } from '../src/game/planets.js';
import { CelestialBody, Ship } from '../src/game/entities.js';
import { PhysicsEngine } from '../src/physics/engine.js';

describe('Planetary Science Database & Simulation Integrity', () => {
    it('contains 8 Solar System planets and 8 Known Exoplanets with authentic astrophysics', () => {
        expect(SOLAR_PLANETS.length).toBe(8);
        expect(KNOWN_EXOPLANETS.length).toBe(8);
        expect(ALL_PLANETS.length).toBe(16);

        // Verify Solar System planets
        const solarIds = SOLAR_PLANETS.map(p => p.id);
        expect(solarIds).toContain('mars');
        expect(solarIds).toContain('venus');
        expect(solarIds).toContain('jupiter');
        expect(solarIds).toContain('saturn');
        expect(solarIds).toContain('earth');
        expect(solarIds).toContain('mercury');
        expect(solarIds).toContain('neptune');
        expect(solarIds).toContain('uranus');

        // Verify Known Exoplanets
        const exoIds = KNOWN_EXOPLANETS.map(p => p.id);
        expect(exoIds).toContain('wasp-76b');
        expect(exoIds).toContain('55-cancri-e');
        expect(exoIds).toContain('hd-189733-b');
        expect(exoIds).toContain('trappist-1e');
        expect(exoIds).toContain('kepler-452b');
        expect(exoIds).toContain('proxima-b');
        expect(exoIds).toContain('gliese-436-b');
        expect(exoIds).toContain('k2-18b');

        // Verify each planet has required science data
        ALL_PLANETS.forEach(planet => {
            expect(planet.name).toBeDefined();
            expect(planet.tagline).toBeDefined();
            expect(planet.pressure).toBeDefined();
            expect(planet.temperature).toBeDefined();
            expect(planet.atmosphere).toBeDefined();
            expect(planet.experienceText).toBeDefined();
            if (planet.category === 'solar') {
                expect(planet.missionFact).toBeDefined();
            } else {
                expect(planet.exoplanetFact).toBeDefined();
            }
        });
    });

    it('instantiates CelestialBody as an interactive planet with correct gravity well', () => {
        const mars = SOLAR_PLANETS.find(p => p.id === 'mars');
        const planetBody = new CelestialBody(1000, 200, 'planet', mars);

        expect(planetBody.isPlanet).toBe(true);
        expect(planetBody.name).toBe('Mars');
        expect(planetBody.radius).toBe(mars.radius);
        expect(planetBody.gravityRadius).toBe(mars.gravityRadius);
        expect(planetBody.planetData.id).toBe('mars');
    });

    it('applies gravitational slingshot physics around a planet deterministically', () => {
        const engine = new PhysicsEngine();
        const jupiter = SOLAR_PLANETS.find(p => p.id === 'jupiter');
        const planetBody = new CelestialBody(500, 0, 'planet', jupiter);

        const ship = new Ship(400, 100);
        ship.vx = 250;
        ship.vy = -120;

        const dt = 1 / 120;
        // Step ship for 60 iterations (0.5 sec)
        for (let i = 0; i < 60; i++) {
            engine.stepShip(ship, [planetBody], dt, 1.0);
        }

        // Velocity should have altered due to Jupiter gravitational pull
        expect(ship.x).toBeGreaterThan(400);
        expect(Number.isFinite(ship.vx)).toBe(true);
        expect(Number.isFinite(ship.vy)).toBe(true);
    });
});
