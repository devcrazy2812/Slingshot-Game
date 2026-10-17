// Main Game Controller for Slingshot: Event Horizon
// Features 1/120s Fixed-Timestep Accumulator, Always-Centered Camera, Optimized Spacetime Fabric, and Directional Navigation Radar

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('slingshot_highscore') || '0', 10);
        this.combo = 1;
        this.comboTimer = 0;
        this.maxSpeed = 0;
        this.perfectSlingshots = 0;
        this.gameOverReason = '';
        this.selectedShipClass = 'vanguard';

        this.physics = new PhysicsEngine();
        this.particles = new ParticleSystem();
        this.ship = new Ship(100, 0, this.selectedShipClass);
        this.horizon = new EventHorizon();

        this.stars = [];
        this.asteroids = [];
        this.wormholes = [];
        this.collectibles = [];
        this.floatingTexts = [];

        this.worldGenX = 0;
        this.camera = { x: 100, y: 0, targetZoom: 1.0, zoom: 1.0, shake: 0 };

        this.input = {
            tetherHeld: false,
            boostHeld: false,
            upHeld: false,
            downHeld: false,
            leftHeld: false,
            rightHeld: false,
            mouseX: 0,
            mouseY: 0,
            hasPointerMoved: false
        };

        // Fixed timestep 1/120s loop
        this.DT = 1 / 120;
        this.accumulator = 0;
        this.lastTime = performance.now();
        this.warningSoundCooldown = 0;

        this.initCanvas();
        this.bindEvents();
        this.bindShipSelector();
        this.updateHUD();

        requestAnimationFrame((t) => this.loop(t));
    }

    initCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    screenToWorld(screenX, screenY) {
        const halfW = this.canvas.width / 2;
        const halfH = this.canvas.height / 2;
        return {
            x: this.camera.x + (screenX - halfW) / this.camera.zoom,
            y: this.camera.y + (screenY - halfH) / this.camera.zoom
        };
    }

    bindShipSelector() {
        const shipCards = document.querySelectorAll('.ship-select-card');
        shipCards.forEach(card => {
            card.addEventListener('click', () => {
                shipCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                const shipClass = card.getAttribute('data-ship');
                this.selectedShipClass = shipClass;
                this.ship.setShipClass(shipClass);
            });
        });
    }

    bindEvents() {
        window.addEventListener('pointermove', (e) => {
            this.input.mouseX = e.clientX;
            this.input.mouseY = e.clientY;
            this.input.hasPointerMoved = true;
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.ui-interactive')) return;
            if (this.state === 'PLAYING') {
                if (e.button === 2) {
                    this.input.boostHeld = true;
                } else {
                    this.input.tetherHeld = true;
                    this.tryAttachTether();
                }
            }
        });

        window.addEventListener('pointerup', (e) => {
            if (e.button === 2) {
                this.input.boostHeld = false;
            } else {
                this.onTetherEnd();
            }
        });

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === 'PLAYING' && !this.input.tetherHeld) {
                    this.input.tetherHeld = true;
                    this.tryAttachTether();
                }
            } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.input.upHeld = true;
            } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
                this.input.downHeld = true;
            } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                this.input.leftHeld = true;
            } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                this.input.rightHeld = true;
                this.input.boostHeld = true;
            } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
                if (this.state === 'PLAYING') {
                    if (this.ship.triggerPhaseShift()) {
                        this.addFloatingText('QUANTUM PHASE SHIFT!', this.ship.x, this.ship.y - 25, '#00f7ff');
                        this.triggerScreenShake(4);
                    }
                }
            } else if (e.code === 'KeyF' || e.code === 'KeyQ') {
                if (this.state === 'PLAYING') {
                    if (this.ship.triggerTimeDilation()) {
                        this.addFloatingText('TIME DILATION [SLOW-MO]!', this.ship.x, this.ship.y - 25, '#a855f7');
                        this.triggerScreenShake(3);
                    }
                }
            } else if (e.code === 'KeyP') {
                this.togglePause();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                if (this.state === 'PLAYING') {
                    this.onTetherEnd();
                }
            } else if (e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.input.upHeld = false;
            } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
                this.input.downHeld = false;
            } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                this.input.leftHeld = false;
            } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                this.input.rightHeld = false;
                this.input.boostHeld = false;
            }
        });

        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('restartBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('muteBtn').addEventListener('click', () => {
            const isMuted = window.sounds.toggleMute();
            document.getElementById('muteBtn').innerText = isMuted ? '🔇' : '🔊';
        });

        const mobileBoost = document.getElementById('mobileBoostBtn');
        if (mobileBoost) {
            mobileBoost.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this.input.boostHeld = true;
            });
            mobileBoost.addEventListener('pointerup', (e) => {
                e.stopPropagation();
                this.input.boostHeld = false;
            });
        }

        const mobilePhase = document.getElementById('mobilePhaseBtn');
        if (mobilePhase) {
            mobilePhase.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.ship.triggerPhaseShift()) {
                    this.addFloatingText('QUANTUM PHASE SHIFT!', this.ship.x, this.ship.y - 25, '#00f7ff');
                }
            });
        }
    }

    findTargetableStar() {
        let bestStar = null;
        let minScore = Infinity;

        let targetPos = { x: this.ship.x + this.ship.vx * 0.35, y: this.ship.y };
        if (this.input.hasPointerMoved && this.input.mouseX) {
            targetPos = this.screenToWorld(this.input.mouseX, this.input.mouseY);
        }

        const reach = (this.ship.reachMultiplier || 1.0);

        for (const star of this.stars) {
            const dShip = PhysicsEngine.dist(this.ship.x, this.ship.y, star.x, star.y);
            const dCursor = PhysicsEngine.dist(targetPos.x, targetPos.y, star.x, star.y);

            // Generous latching reach
            if (dShip < star.gravityRadius * 1.45 * reach && dShip > star.radius + 15) {
                const score = dShip * 0.35 + dCursor * 0.65;
                if (score < minScore) {
                    minScore = score;
                    bestStar = star;
                }
            }
        }
        return bestStar;
    }

    tryAttachTether() {
        if (this.ship.isTethered) return;
        window.sounds.init();

        const bestStar = this.findTargetableStar();
        if (bestStar) {
            const dist = PhysicsEngine.dist(this.ship.x, this.ship.y, bestStar.x, bestStar.y);
            this.ship.isTethered = true;
            this.ship.tetherStar = bestStar;
            this.ship.tetherLength = dist;
            this.ship.lastTetherAngle = Math.atan2(this.ship.y - bestStar.y, this.ship.x - bestStar.x);
            this.ship.orbitRotationAccumulator = 0;

            window.sounds.playTetherAttach();
            this.triggerScreenShake(3);

            if (bestStar.isBinary) {
                this.addFloatingText('BINARY ORBIT CAPTURE!', bestStar.x, bestStar.y - 40, '#38bdf8');
            }
        }
    }

    onTetherEnd() {
        this.input.tetherHeld = false;

        if (this.ship.isTethered && this.ship.tetherStar) {
            const star = this.ship.tetherStar;
            const result = this.physics.evaluateRelease(this.ship, star);
            window.sounds.playSlingshotRelease(result.multiplier);

            if (result.isPerfect) {
                this.combo++;
                this.comboTimer = 7.0;
                this.perfectSlingshots++;
                const bonus = 300 * this.combo;
                this.score += bonus;
                window.sounds.playPerfectLaunch();

                const tag = star.isBinary ? 'BINARY SLINGSHOT! +' : 'PERFECT SLINGSHOT! +';
                this.addFloatingText(`${tag}${bonus}`, this.ship.x, this.ship.y - 20, '#00ffff');
                this.triggerScreenShake(6);
                this.particles.emitExplosion(this.ship.x, this.ship.y, '#00ffff', 25);
            } else {
                this.score += 50 * this.combo;
                this.comboTimer = 5.0;
            }

            this.ship.isTethered = false;
            this.ship.tetherStar = null;
        }
    }

    startGame() {
        window.sounds.init();
        this.state = 'PLAYING';
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 6.0;
        this.maxSpeed = 0;
        this.perfectSlingshots = 0;
        this.worldGenX = 50;

        this.stars = [];
        this.asteroids = [];
        this.wormholes = [];
        this.collectibles = [];
        this.floatingTexts = [];
        this.particles.reset();

        this.ship.setShipClass(this.selectedShipClass);
        this.ship.reset(100, 0);
        this.ship.vx = 340; // Forward velocity
        this.ship.vy = 0;
        this.horizon.reset();

        // Guaranteed welcoming starter constellation right ahead of player
        this.stars.push(new CelestialBody(420, 30, 'hypergiant'));
        this.stars.push(new CelestialBody(780, -40, 'pulsar'));
        this.stars.push(new CelestialBody(1140, 50, 'binary'));
        this.collectibles.push(new PhotonCore(250, 10));
        this.collectibles.push(new PhotonCore(560, -10));
        this.collectibles.push(new PhotonCore(940, 20));

        this.worldGenX = 1140;
        this.generateWorld(3000);

        // Center camera immediately on the ship
        this.camera.x = this.ship.x + 140;
        this.camera.y = this.ship.y;

        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('pauseScreen').classList.add('hidden');
        document.getElementById('hud').classList.remove('hidden');
    }

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pauseScreen').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.lastTime = performance.now();
            this.accumulator = 0;
            document.getElementById('pauseScreen').classList.add('hidden');
        }
    }

    triggerScreenShake(intensity) {
        this.camera.shake = Math.max(this.camera.shake, intensity);
    }

    generateWorld(targetX) {
        const types = ['hypergiant', 'hypergiant', 'redgiant', 'pulsar', 'whitedwarf', 'binary', 'supernova'];

        while (this.worldGenX < targetX) {
            this.worldGenX += 280 + Math.random() * 180;
            // Adaptive star placement: Generates stars along the ship's current Y corridor!
            const laneY = this.ship ? this.ship.y * 0.4 : 0;
            const starY = laneY + (Math.random() - 0.5) * 450;
            const type = types[Math.floor(Math.random() * types.length)];

            this.stars.push(new CelestialBody(this.worldGenX, starY, type));

            // Occasionally spawn a wormhole
            if (Math.random() < 0.12 && this.worldGenX > 900) {
                this.wormholes.push(new Wormhole(this.worldGenX + 160, starY + (Math.random() - 0.5) * 180));
            }

            // Scatter energy orbs
            const orbCount = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < orbCount; i++) {
                this.collectibles.push(new PhotonCore(
                    this.worldGenX - 90 + Math.random() * 180,
                    starY + (Math.random() - 0.5) * 220
                ));
            }

            // Scatter asteroid fields
            if (Math.random() < 0.35 && this.worldGenX > 700) {
                const astCount = Math.floor(Math.random() * 3) + 2;
                for (let k = 0; k < astCount; k++) {
                    this.asteroids.push(new Asteroid(
                        this.worldGenX + 90 + (Math.random() - 0.5) * 120,
                        starY + (Math.random() - 0.5) * 260,
                        Math.random() * 12 + 12
                    ));
                }
            }
        }
    }

    cullWorld() {
        const cleanupThreshold = this.horizon.x - 500;
        this.stars = this.stars.filter(s => s.x > cleanupThreshold);
        this.asteroids = this.asteroids.filter(a => a.x > cleanupThreshold);
        this.wormholes = this.wormholes.filter(w => w.x > cleanupThreshold);
        this.collectibles = this.collectibles.filter(c => c.x > cleanupThreshold);
    }

    triggerGameOver(reason) {
        this.state = 'GAMEOVER';
        this.gameOverReason = reason;
        window.sounds.playExplosion();
        this.triggerScreenShake(20);
        this.particles.emitExplosion(this.ship.x, this.ship.y, '#ff0055', 70);

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('slingshot_highscore', this.highScore.toString());
        }

        const maxC = (this.maxSpeed / 600).toFixed(2);
        document.getElementById('deathReason').innerText = reason;
        document.getElementById('finalScore').innerText = Math.floor(this.score).toLocaleString();
        document.getElementById('finalDistance').innerText = Math.floor(this.ship.x / 100).toLocaleString() + ' LY';
        document.getElementById('finalMaxSpeed').innerText = `${maxC} c`;
        document.getElementById('finalSlingshots').innerText = this.perfectSlingshots;
        document.getElementById('finalHighScore').innerText = Math.floor(this.highScore).toLocaleString();

        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    addFloatingText(text, x, y, color = '#ffffff') {
        this.floatingTexts.push({
            text,
            x,
            y,
            color,
            life: 1.0
        });
    }

    // Step physics at fixed dt (1/120s)
    update(dt) {
        if (this.state !== 'PLAYING') return;

        const timeScale = this.ship.timeDilationActive ? 0.4 : 1.0;

        // Active attitude steering
        if (this.input.upHeld) {
            this.ship.vy -= 300 * dt;
        }
        if (this.input.downHeld) {
            this.ship.vy += 300 * dt;
        }
        if (this.input.leftHeld) {
            this.ship.vx = Math.max(220, this.ship.vx - 180 * dt);
        }
        if (this.input.rightHeld) {
            this.ship.vx += 220 * dt;
        }

        // Auto-tether if player is holding button down
        if (this.input.tetherHeld && !this.ship.isTethered) {
            this.tryAttachTether();
        }

        // Free flight drift stabilization
        if (!this.ship.isTethered) {
            this.ship.vy *= 0.993; // Dampen steep vertical drift
            if (Math.abs(this.ship.y) > 420) {
                this.ship.vy -= Math.sign(this.ship.y) * 90 * dt; // Soft lane guidance
            }
            if (this.ship.vx < 260) {
                this.ship.vx += 160 * dt; // Minimum forward cruise
            }
        }

        // Run Leapfrog step on ship
        this.physics.stepShip(this.ship, this.stars, dt, timeScale);

        if (this.ship.isTethered) {
            const currentSpeed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
            window.sounds.startTetherHum(180 + (currentSpeed / 4));
        } else {
            window.sounds.stopTetherHum();
        }

        this.ship.update(dt);

        // Combo timer
        if (this.combo > 1) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) {
                this.combo = 1;
            }
        }

        // Track max speed
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        if (speed > this.maxSpeed) {
            this.maxSpeed = speed;
        }

        // Relativistic speed streaks
        if (speed > 550) {
            const viewHalfW = (this.canvas.width / 2) / this.camera.zoom;
            const viewHalfH = (this.canvas.height / 2) / this.camera.zoom;
            this.particles.emitSpeedStreak(
                this.camera.x - viewHalfW,
                this.camera.x + viewHalfW,
                this.camera.y - viewHalfH,
                this.camera.y + viewHalfH,
                this.ship.vx / 35,
                this.ship.vy / 35
            );
        }

        // Distance score
        this.score += (this.ship.vx * 0.003) * this.combo;

        // Update Event Horizon
        this.horizon.update(dt * timeScale, this.ship.x);

        // Danger warning if Event Horizon is closing in
        const horizonDist = this.ship.x - this.horizon.x;
        if (horizonDist < 600) {
            this.warningSoundCooldown -= dt;
            if (this.warningSoundCooldown <= 0) {
                window.sounds.playWarningAlarm();
                this.warningSoundCooldown = 0.45;
            }
        }

        // Check Event Horizon Consumed Game Over
        if (this.ship.x <= this.horizon.x + 20) {
            this.triggerGameOver('Swallowed by the Singularity Event Horizon');
            return;
        }

        // Update entities
        this.stars.forEach(s => s.update(dt * timeScale));
        this.asteroids.forEach(a => a.update(dt * timeScale));
        this.wormholes.forEach(w => w.update(dt * timeScale));
        this.collectibles.forEach(c => c.update(dt * timeScale, this.ship));
        this.particles.update();

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 40 * dt;
            ft.life -= 1.0 * dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Collisions: If Quantum Phase Shift is active, ship is intangible!
        if (!this.ship.phaseShiftActive) {
            for (const star of this.stars) {
                const checkNodes = star.isBinary && star.twin ? [star, star.twin] : [star];
                for (const node of checkNodes) {
                    if (!node) continue;
                    const d = PhysicsEngine.dist(this.ship.x, this.ship.y, node.x, node.y);
                    if (d < node.radius + this.ship.radius) {
                        this.triggerGameOver(`Incinerated by the extreme core of a ${star.name}`);
                        return;
                    }
                }
            }

            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const ast = this.asteroids[i];
                const d = PhysicsEngine.dist(this.ship.x, this.ship.y, ast.x, ast.y);
                if (d < ast.radius + this.ship.radius) {
                    if (this.ship.invulnerableTimer <= 0) {
                        if (this.ship.shield > 25) {
                            this.ship.shield -= 45;
                            this.ship.invulnerableTimer = 0.8;
                            this.combo = 1;
                            this.triggerScreenShake(8);
                            window.sounds.playExplosion();
                            this.particles.emitExplosion(ast.x, ast.y, '#64748b', 15);
                            this.asteroids.splice(i, 1);
                            this.addFloatingText('SHIELD DAMAGED!', this.ship.x, this.ship.y - 20, '#ffaa00');
                        } else {
                            this.triggerGameOver('Hull shattered by high-velocity Asteroid collision');
                            return;
                        }
                    }
                }
            }
        }

        // Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const c = this.collectibles[i];
            const d = PhysicsEngine.dist(this.ship.x, this.ship.y, c.x, c.y);
            if (d < c.radius + this.ship.radius + 15) {
                window.sounds.playCollect();
                this.ship.fuel = Math.min(this.ship.maxFuel, this.ship.fuel + 40);
                this.ship.shield = Math.min(this.ship.maxShield, this.ship.shield + 20);
                const bonus = 100 * this.combo;
                this.score += bonus;
                this.particles.emitExplosion(c.x, c.y, '#ffd700', 14);
                this.collectibles.splice(i, 1);
                this.addFloatingText(`+${bonus}`, c.x, c.y - 10, '#ffd700');
            }
        }

        // Wormholes
        for (const w of this.wormholes) {
            const d = PhysicsEngine.dist(this.ship.x, this.ship.y, w.x, w.y);
            if (d < w.radius + this.ship.radius) {
                window.sounds.playWormholeWarp();
                this.triggerScreenShake(14);
                this.particles.emitExplosion(w.x, w.y, '#00f7ff', 40);
                this.ship.x += w.teleportDistance;
                this.ship.vx = Math.max(550, this.ship.vx * 1.4);
                this.score += 1500;
                this.addFloatingText('HYPERSPACE WARP! +1500', this.ship.x, this.ship.y - 25, '#9900ff');
                break;
            }
        }

        this.generateWorld(this.ship.x + 2800);
        this.cullWorld();

        this.updateHUD();
    }

    updateHUD() {
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        const speedFraction = (speed / 600).toFixed(2);
        const distanceLY = Math.floor(this.ship.x / 100);
        const horizonGap = Math.max(0, Math.floor((this.ship.x - this.horizon.x) / 10));

        document.getElementById('hudSpeed').innerText = `${speedFraction} c`;
        document.getElementById('hudDistance').innerText = `${distanceLY.toLocaleString()} LY`;
        document.getElementById('hudScore').innerText = Math.floor(this.score).toLocaleString();
        document.getElementById('hudCombo').innerText = `${this.combo}x`;
        document.getElementById('hudHorizonGap').innerText = `${horizonGap} AU`;

        document.getElementById('fuelBar').style.width = `${(this.ship.fuel / this.ship.maxFuel) * 100}%`;
        document.getElementById('shieldBar').style.width = `${(this.ship.shield / this.ship.maxShield) * 100}%`;

        const phaseCooldownEl = document.getElementById('phaseCooldown');
        if (phaseCooldownEl) {
            if (this.ship.phaseShiftActive) {
                phaseCooldownEl.innerText = `ACTIVE (${this.ship.phaseShiftTimer.toFixed(1)}s)`;
                phaseCooldownEl.style.color = '#00f7ff';
            } else if (this.ship.phaseShiftCooldown > 0) {
                phaseCooldownEl.innerText = `${Math.ceil(this.ship.phaseShiftCooldown)}s`;
                phaseCooldownEl.style.color = '#94a3b8';
            } else {
                phaseCooldownEl.innerText = 'READY [SHIFT]';
                phaseCooldownEl.style.color = '#22c55e';
            }
        }

        const dilationCooldownEl = document.getElementById('dilationCooldown');
        if (dilationCooldownEl) {
            if (this.ship.timeDilationActive) {
                dilationCooldownEl.innerText = `ACTIVE (${this.ship.timeDilationTimer.toFixed(1)}s)`;
                dilationCooldownEl.style.color = '#a855f7';
            } else if (this.ship.timeDilationCooldown > 0) {
                dilationCooldownEl.innerText = `${Math.ceil(this.ship.timeDilationCooldown)}s`;
                dilationCooldownEl.style.color = '#94a3b8';
            } else {
                dilationCooldownEl.innerText = 'READY [F]';
                dilationCooldownEl.style.color = '#22c55e';
            }
        }

        const horizonMeter = document.getElementById('horizonProximityMeter');
        if (horizonMeter) {
            const dangerRatio = Math.max(0, Math.min(1, 1 - (horizonGap / 60)));
            horizonMeter.style.opacity = (dangerRatio > 0.4 ? dangerRatio : 0.2).toString();
            horizonMeter.style.boxShadow = dangerRatio > 0.6 ? '0 0 15px #ff0055' : 'none';
        }
    }

    // High-performance Spacetime Fabric Grid
    drawSpacetimeFabric(ctx, viewLeft, viewRight, viewTop, viewBottom) {
        ctx.save();
        ctx.strokeStyle = 'rgba(42, 50, 112, 0.28)';
        ctx.lineWidth = 1;

        const cellSize = 100;
        const startX = Math.floor(viewLeft / cellSize) * cellSize;
        const endX = Math.ceil(viewRight / cellSize) * cellSize;
        const startY = Math.floor(viewTop / cellSize) * cellSize;
        const endY = Math.ceil(viewBottom / cellSize) * cellSize;

        // Pre-filter nearby stars to keep frame rate locked at 60/120 fps
        const nearbyStars = this.stars.filter(s => s.x > viewLeft - 250 && s.x < viewRight + 250);

        const warpPoint = (x, y) => {
            let wx = x;
            let wy = y;
            for (const s of nearbyStars) {
                const dx = s.x - x;
                const dy = s.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < s.gravityRadius && dist > 1) {
                    const pull = Math.min(26, (s.radius * 30) / (dist + 50));
                    wx += (dx / dist) * pull;
                    wy += (dy / dist) * pull;
                }
            }
            return { x: wx, y: wy };
        };

        for (let y = startY; y <= endY; y += cellSize) {
            ctx.beginPath();
            let first = true;
            for (let x = startX; x <= endX; x += cellSize) {
                const wp = warpPoint(x, y);
                if (first) {
                    ctx.moveTo(wp.x, wp.y);
                    first = false;
                } else {
                    ctx.lineTo(wp.x, wp.y);
                }
            }
            ctx.stroke();
        }

        for (let x = startX; x <= endX; x += cellSize) {
            ctx.beginPath();
            let first = true;
            for (let y = startY; y <= endY; y += cellSize) {
                const wp = warpPoint(x, y);
                if (first) {
                    ctx.moveTo(wp.x, wp.y);
                    first = false;
                } else {
                    ctx.lineTo(wp.x, wp.y);
                }
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    drawParallaxStarfield(ctx, viewLeft, viewRight, viewTop, viewBottom) {
        const layers = [
            { speed: 0.1, size: 1.0, color: 'rgba(255, 255, 255, 0.4)' },
            { speed: 0.3, size: 1.5, color: 'rgba(0, 240, 255, 0.6)' },
            { speed: 0.6, size: 2.2, color: 'rgba(255, 200, 255, 0.8)' }
        ];

        for (const layer of layers) {
            ctx.fillStyle = layer.color;
            const offsetX = this.camera.x * layer.speed;
            const offsetY = this.camera.y * layer.speed;

            const cellW = 320;
            const cellH = 320;
            const startCol = Math.floor((viewLeft + offsetX) / cellW);
            const endCol = Math.ceil((viewRight + offsetX) / cellW);
            const startRow = Math.floor((viewTop + offsetY) / cellH);
            const endRow = Math.ceil((viewBottom + offsetY) / cellH);

            for (let c = startCol; c <= endCol; c++) {
                for (let r = startRow; r <= endRow; r++) {
                    const pseudoHash = Math.sin(c * 91.34 + r * 47.19) * 43758.5453;
                    const randX = (pseudoHash - Math.floor(pseudoHash)) * cellW;
                    const pseudoHash2 = Math.sin(c * 17.51 + r * 83.77) * 23421.631;
                    const randY = (pseudoHash2 - Math.floor(pseudoHash2)) * cellH;

                    const sx = c * cellW + randX - offsetX;
                    const sy = r * cellH + randY - offsetY;

                    ctx.fillRect(sx, sy, layer.size, layer.size);
                }
            }
        }
    }

    drawTargetReticle(ctx, star) {
        const time = Date.now() * 0.003;
        const radius = star.radius + 18;

        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.rotate(time);

        ctx.strokeStyle = '#00f7ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // Directional Navigation Indicator to the next star ahead
    drawNavigationRadar(ctx, viewLeft, viewRight, viewTop, viewBottom) {
        // Find closest star ahead of ship
        let closestAheadStar = null;
        let minDist = Infinity;

        for (const s of this.stars) {
            if (s.x > this.ship.x + 30) {
                const d = PhysicsEngine.dist(this.ship.x, this.ship.y, s.x, s.y);
                if (d < minDist) {
                    minDist = d;
                    closestAheadStar = s;
                }
            }
        }

        if (closestAheadStar) {
            const angle = Math.atan2(closestAheadStar.y - this.ship.y, closestAheadStar.x - this.ship.x);
            const radarDist = 160;
            const rx = this.ship.x + Math.cos(angle) * radarDist;
            const ry = this.ship.y + Math.sin(angle) * radarDist;

            ctx.save();
            ctx.translate(rx, ry);
            ctx.rotate(angle);

            // Glowing chevron arrow pointing toward next anchor
            ctx.fillStyle = '#00f7ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(14, 0);
            ctx.lineTo(-8, -8);
            ctx.lineTo(-4, 0);
            ctx.lineTo(-8, 8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Always center camera directly on the ship with smooth sub-pixel lerp
        const targetCamX = this.ship.x + 130;
        const targetCamY = this.ship.y; // EXACTLY CENTERED
        this.camera.x += (targetCamX - this.camera.x) * 0.12;
        this.camera.y += (targetCamY - this.camera.y) * 0.12;

        const currentSpeed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        this.camera.targetZoom = Math.max(0.72, 1.0 - (currentSpeed / 1400) * 0.28);
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.05;

        if (this.camera.shake > 0) {
            this.camera.shake *= 0.9;
            if (this.camera.shake < 0.1) this.camera.shake = 0;
        }

        this.ctx.save();

        const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
        const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;
        this.ctx.translate(this.canvas.width / 2 + shakeX, this.canvas.height / 2 + shakeY);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        const halfW = (this.canvas.width / 2) / this.camera.zoom;
        const halfH = (this.canvas.height / 2) / this.camera.zoom;
        const viewLeft = this.camera.x - halfW;
        const viewRight = this.camera.x + halfW;
        const viewTop = this.camera.y - halfH;
        const viewBottom = this.camera.y + halfH;

        // Draw Spacetime Fabric Rubber Sheet Grid
        this.drawSpacetimeFabric(this.ctx, viewLeft, viewRight, viewTop, viewBottom);

        // Draw Parallax Stars
        this.drawParallaxStarfield(this.ctx, viewLeft, viewRight, viewTop, viewBottom);

        // Draw Color-Coded Trajectory Prediction Arc
        if (this.state === 'PLAYING') {
            const traj = this.physics.calculateTrajectory(this.ship, this.stars, this.asteroids);
            if (traj.points.length > 1) {
                this.ctx.save();
                if (traj.status === 'hazard') {
                    this.ctx.strokeStyle = 'rgba(255, 50, 70, 0.8)';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([4, 4]);
                } else if (traj.status === 'perfect') {
                    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
                    this.ctx.lineWidth = 2.5;
                    this.ctx.setLineDash([8, 4]);
                } else {
                    this.ctx.strokeStyle = this.ship.isTethered ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.35)';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.setLineDash([6, 8]);
                }

                this.ctx.beginPath();
                this.ctx.moveTo(this.ship.x, this.ship.y);
                for (const pt of traj.points) {
                    this.ctx.lineTo(pt.x, pt.y);
                }
                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        // Draw Targetable Star Reticle
        if (this.state === 'PLAYING' && !this.ship.isTethered) {
            const targetableStar = this.findTargetableStar();
            if (targetableStar) {
                this.drawTargetReticle(this.ctx, targetableStar);
            }
        }

        // Draw Directional Navigation Indicator toward next star
        if (this.state === 'PLAYING' && !this.ship.isTethered) {
            this.drawNavigationRadar(this.ctx, viewLeft, viewRight, viewTop, viewBottom);
        }

        // Draw Entities
        this.stars.forEach(s => s.draw(this.ctx, this.particles));
        this.wormholes.forEach(w => w.draw(this.ctx));
        this.asteroids.forEach(a => a.draw(this.ctx));
        this.collectibles.forEach(c => c.draw(this.ctx));

        // Draw Particles
        this.particles.draw(this.ctx);

        // Draw Ship (ALWAYS VISIBLE)
        if (this.state !== 'GAMEOVER') {
            this.ship.draw(this.ctx, this.particles);
        }

        // Draw Floating In-Game Texts
        for (const ft of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.life);
            this.ctx.font = 'bold 18px "Orbitron", sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = ft.color;
            this.ctx.shadowColor = ft.color;
            this.ctx.shadowBlur = 12;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        }

        // Draw Event Horizon on Left
        this.horizon.draw(this.ctx, viewTop, viewBottom, this.camera.y, this.canvas.height / this.camera.zoom, this.particles);

        this.ctx.restore();
    }

    loop(currentTime) {
        const elapsed = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        this.accumulator += elapsed;

        while (this.accumulator >= this.DT) {
            this.update(this.DT);
            this.accumulator -= this.DT;
        }

        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
