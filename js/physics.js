// Pure Physics & Orbital Mechanics Engine
// Implements Softened Inverse-Square Gravity, Symplectic Leapfrog Integration,
// and Analytic Tether Constraints as specified in docs/PHYSICS.md

class PhysicsEngine {
    constructor() {
        this.eps = 8; // Softening parameter to prevent division by zero
        this.maxSpeed = 950; // px/sec
        this.minSpeed = 150; // px/sec
        this.baseMu = 650000; // Gravitational parameter (G * M)
        this.trajectorySteps = 60;
        this.trajectoryDt = 1 / 30; // 30Hz trajectory preview sampling
    }

    static dist(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    static normalizeAngle(a) {
        while (a > Math.PI) a -= Math.PI * 2;
        while (a < -Math.PI) a += Math.PI * 2;
        return a;
    }

    // Calculate total gravitational acceleration at point (x, y)
    getAcceleration(x, y, stars) {
        let ax = 0;
        let ay = 0;
        const epsSq = this.eps * this.eps;

        for (const star of stars) {
            const nodes = star.isBinary && star.twin ? [star, star.twin] : [star];
            for (const node of nodes) {
                const dx = node.x - x;
                const dy = node.y - y;
                const dSq = dx * dx + dy * dy;

                // Softened inverse-square law: a = mu * d / (d^2 + eps^2)^(3/2)
                const denom = Math.pow(dSq + epsSq, 1.5);
                const mu = node.mu || (this.baseMu * (node.mass || 3.0));
                const factor = mu / denom;

                ax += dx * factor;
                ay += dy * factor;
            }
        }

        return { ax, ay };
    }

    // Step ship forward by dt using Leapfrog kick-drift-kick integration
    stepShip(ship, stars, dt, timeScale = 1.0) {
        const effectiveDt = dt * timeScale;

        // 1. First half-kick from gravity
        const a1 = this.getAcceleration(ship.x, ship.y, stars);
        ship.vx += a1.ax * effectiveDt * 0.5;
        ship.vy += a1.ay * effectiveDt * 0.5;

        // Apply ion thruster boost if active
        if (ship.isBoosting && ship.fuel > 0) {
            const boostAcc = 750 * (ship.slingshotEfficiency || 1.0);
            ship.vx += Math.cos(ship.angle) * boostAcc * effectiveDt;
            ship.vy += Math.sin(ship.angle) * boostAcc * effectiveDt;
            ship.fuel = Math.max(0, ship.fuel - 28 * dt);
        } else {
            ship.isBoosting = false;
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + 10 * dt);
        }

        // 2. Drift (position update)
        ship.x += ship.vx * effectiveDt;
        ship.y += ship.vy * effectiveDt;

        // 3. Tether Constraint: Enforce fixed rope length & tangent velocity projection
        if (ship.isTethered && ship.tetherStar) {
            const star = ship.tetherStar;
            const dx = ship.x - star.x;
            const dy = ship.y - star.y;
            const currentDist = Math.sqrt(dx * dx + dy * dy);

            if (currentDist > 0.001) {
                const nx = dx / currentDist;
                const ny = dy / currentDist;

                // Enforce exact rope length without rubber-band jitter
                ship.x = star.x + nx * ship.tetherLength;
                ship.y = star.y + ny * ship.tetherLength;

                // Relative velocity to star
                const relVx = ship.vx - (star.vx || 0);
                const relVy = ship.vy - (star.vy || 0);

                // Project velocity to circle tangent (remove radial stretching component)
                const radialVelocity = relVx * nx + relVy * ny;
                let tanVx = relVx - radialVelocity * nx;
                let tanVy = relVy - radialVelocity * ny;

                // Calculate angular tension: T = v^2 / L
                let speed = Math.sqrt(tanVx * tanVx + tanVy * tanVy);

                // Slingshot acceleration while in orbit
                const accelRate = (star.slingshotPower || 24) * 22 * (ship.slingshotEfficiency || 1.0);
                const maxAllowed = this.maxSpeed * (ship.topSpeedMultiplier || 1.0);
                speed = Math.min(maxAllowed, speed + accelRate * effectiveDt);

                if (speed > 1.0) {
                    const normFactor = speed / Math.sqrt(tanVx * tanVx + tanVy * tanVy);
                    tanVx *= normFactor;
                    tanVy *= normFactor;
                }

                ship.vx = (star.vx || 0) + tanVx;
                ship.vy = (star.vy || 0) + tanVy;

                // Track orbit rotation for combo bonuses
                const currentAngle = Math.atan2(ny, nx);
                if (ship.lastTetherAngle !== undefined) {
                    const dAngle = Math.abs(PhysicsEngine.normalizeAngle(currentAngle - ship.lastTetherAngle));
                    ship.orbitRotationAccumulator = (ship.orbitRotationAccumulator || 0) + dAngle;
                }
                ship.lastTetherAngle = currentAngle;
            }
        }

        // 4. Second half-kick from gravity at new position
        const a2 = this.getAcceleration(ship.x, ship.y, stars);
        ship.vx += a2.ax * effectiveDt * 0.5;
        ship.vy += a2.ay * effectiveDt * 0.5;

        // Speed clamping & numerical sanity guard
        if (isNaN(ship.x) || isNaN(ship.y) || isNaN(ship.vx) || isNaN(ship.vy)) {
            console.warn("Recovered from NaN in physics integration");
            ship.vx = 350;
            ship.vy = 0;
        }

        const maxAllowed = this.maxSpeed * (ship.topSpeedMultiplier || 1.0);
        const currentSpeed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (currentSpeed > maxAllowed) {
            const factor = maxAllowed / currentSpeed;
            ship.vx *= factor;
            ship.vy *= factor;
        }
    }

    // Evaluate slingshot launch angle
    evaluateRelease(ship, star) {
        const velocityAngle = Math.atan2(ship.vy, ship.vx);
        const forwardAlignment = Math.cos(velocityAngle); // 1 = directly right/forward

        let multiplier = 1.0;
        let isPerfect = false;
        const bonusScaling = ship.perfectBonusMultiplier || 1.0;

        if (forwardAlignment > 0.82) {
            isPerfect = true;
            multiplier = 1.35 * bonusScaling;
            ship.vx *= multiplier;
            ship.vy *= 0.8;
        } else if (forwardAlignment > 0.4) {
            multiplier = 1.15;
            ship.vx *= multiplier;
        }

        const maxAllowed = this.maxSpeed * (ship.topSpeedMultiplier || 1.0);
        const speed = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
        if (speed > maxAllowed) {
            const factor = maxAllowed / speed;
            ship.vx *= factor;
            ship.vy *= factor;
        }

        return {
            isPerfect,
            multiplier,
            rotations: Math.floor((ship.orbitRotationAccumulator || 0) / (Math.PI * 2))
        };
    }

    // Predict forward trajectory path by running the exact same stepShip function
    calculateTrajectory(ship, stars, asteroids = []) {
        const points = [];
        const simShip = {
            x: ship.x,
            y: ship.y,
            vx: ship.vx,
            vy: ship.vy,
            angle: ship.angle,
            isBoosting: false,
            isTethered: false, // evaluate flight if released
            tetherStar: null,
            slingshotEfficiency: ship.slingshotEfficiency,
            topSpeedMultiplier: ship.topSpeedMultiplier
        };

        let status = 'safe';
        const forwardAlignment = Math.cos(Math.atan2(ship.vy, ship.vx));
        if (forwardAlignment > 0.82) {
            status = 'perfect';
        }

        for (let i = 0; i < this.trajectorySteps; i++) {
            this.stepShip(simShip, stars, this.trajectoryDt);

            // Collision check with star cores
            for (const star of stars) {
                const nodes = star.isBinary && star.twin ? [star, star.twin] : [star];
                for (const node of nodes) {
                    const d = PhysicsEngine.dist(simShip.x, simShip.y, node.x, node.y);
                    if (d <= node.radius + 14) {
                        status = 'hazard';
                    }
                }
            }

            // Collision check with asteroids
            for (const ast of asteroids) {
                const dAst = PhysicsEngine.dist(simShip.x, simShip.y, ast.x, ast.y);
                if (dAst <= ast.radius + 14) {
                    status = 'hazard';
                }
            }

            points.push({ x: simShip.x, y: simShip.y });
        }

        return { points, status };
    }
}
