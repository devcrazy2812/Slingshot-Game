/**
 * @file game.js
 * Main Game Controller for Slingshot: Event Horizon
 * Features 1/120s Fixed-Timestep Accumulator, Always-Centered Camera, Optimized Spacetime Fabric, and Directional Navigation Radar.
 */

import { Config } from '../config.js';
import { sounds } from '../audio/engine.js';
import { PhysicsEngine } from '../physics/engine.js';
import { ParticleSystem } from '../render/particles.js';
import { NebulaRenderer } from '../render/nebula.js';
import { Ship, CelestialBody, Wormhole, Asteroid, PhotonCore, EventHorizon } from './entities.js';
import { SOLAR_PLANETS, KNOWN_EXOPLANETS, ALL_PLANETS } from './planets.js';
import { PlanetSimulationEngine } from '../render/planet-sim.js';
import { TaskManager, MISSION_TASKS } from './tasks.js';
import { CAMPAIGN_LEVELS, CampaignManager } from './levels.js';
import { haptics } from '../core/haptics.js';

export const CHAOS_OFFSET = 0.000001;

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.state = 'MENU'; // MENU, PLAYING, PAUSED, GAMEOVER, PLANET_EXPLORATION
        this.score = 0;
        let storedHigh = 0;
        try {
            const rawHigh = (typeof localStorage !== 'undefined') ? localStorage.getItem('slingshot_highscore') : null;
            if (rawHigh) storedHigh = parseInt(rawHigh, 10) || 0;
        } catch (_) {}
        this.highScore = storedHigh;
        this.combo = 1;
        this.comboTimer = 0;

        // Settings & Calibration State
        this.screenShakeIntensity = parseFloat((typeof localStorage !== 'undefined' && localStorage.getItem('slingshot_screenshake')) || '1.0');
        this.cameraLeadEnabled = (typeof localStorage !== 'undefined' ? localStorage.getItem('slingshot_cameralead') : null) !== 'false';

        // Planetary Exploration & Science Codex State
        this.currentPlanet = null;
        this.planetSim = null;
        this.planetSpawnCounter = 0;

        let initialPlanets = [];
        try {
            const rawCodex = (typeof localStorage !== 'undefined') ? localStorage.getItem('slingshot_codex') : null;
            if (rawCodex) {
                const parsed = JSON.parse(rawCodex);
                if (Array.isArray(parsed)) initialPlanets = parsed;
            }
        } catch (e) {
            console.warn('Recovered from corrupted codex storage:', e);
        }
        this.discoveredPlanets = new Set(initialPlanets);
        this.codexActiveTab = 'all';

        // Mission Directives & Tasks Engine
        this.taskManager = new TaskManager(this);
        this.campaign = new CampaignManager();
        this.campaignElapsedTime = 0;
        this.sirenPulseTimer = 0;
        this.tickingSoundTimer = 0;
        this.probesDeployed = 0;
        this.wormholeJumps = 0;
        this.exoplanetExplored = false;
        this.maxSpeed = 0;
        this.perfectSlingshots = 0;
        this.gameOverReason = '';
        this.selectedShipClass = 'vanguard';

        this.physics = new PhysicsEngine();
        this.particles = new ParticleSystem();
        this.nebula = new NebulaRenderer();
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

        // Fixed timestep 1/120s loop from Config
        this.DT = Config.sim.dt || (1 / 120);
        this.accumulator = 0;
        this.lastTime = performance.now();
        this.warningSoundCooldown = 0;

        // Chaos Twin State
        this.chaosOffset = CHAOS_OFFSET;
        this.twin = null;
        this.twinTrail = [];
        this.chaosTime = 0;
        this.chaosLogTimer = 0;

        this.initCanvas();
        this.bindEvents();
        this.bindShipSelector();
        this.updateHUD();
        this.updateHangarPilotStrip();

        requestAnimationFrame((t) => this.loop(t));
    }

    updateHangarPilotStrip() {
        if (!this.taskManager) return;
        const rank = this.taskManager.getRank();
        const compTasks = this.taskManager.getCompletedCount();
        const totalTasks = this.taskManager.getTotalCount();
        const discoveredWorlds = this.discoveredPlanets ? this.discoveredPlanets.size : 0;

        const rankEl = document.getElementById('hangarPilotRank');
        if (rankEl) rankEl.innerText = `${rank.badge} // ${rank.title}`;

        const tasksEl = document.getElementById('hangarDirectivesCount');
        if (tasksEl) tasksEl.innerText = `${compTasks} / ${totalTasks} DIRECTIVES`;

        const codexEl = document.getElementById('hangarCodexCount');
        if (codexEl) codexEl.innerText = `${discoveredWorlds} / ${ALL_PLANETS.length} WORLDS`;

        const highEl = document.getElementById('hangarHighScore');
        if (highEl) highEl.innerText = `${Math.floor(this.highScore).toLocaleString()} PTS`;
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
        let touchSteerStartY = null;
        let isLeftTouchSteering = false;

        window.addEventListener('pointermove', (e) => {
            this.input.mouseX = e.clientX;
            this.input.mouseY = e.clientY;
            this.input.hasPointerMoved = true;

            if (isLeftTouchSteering && touchSteerStartY !== null) {
                const dy = e.clientY - touchSteerStartY;
                if (dy < -20) {
                    this.input.upHeld = true;
                    this.input.downHeld = false;
                } else if (dy > 20) {
                    this.input.downHeld = true;
                    this.input.upHeld = false;
                } else {
                    this.input.upHeld = false;
                    this.input.downHeld = false;
                }
            }
        });

        window.addEventListener('pointerdown', (e) => {
            if (e.target.closest && e.target.closest('.ui-interactive')) return;
            if (this.state === 'PLAYING') {
                // If touching on left 35% of screen on mobile/touch, activate dynamic pitch steering
                if (e.clientX < window.innerWidth * 0.35 && e.pointerType === 'touch') {
                    isLeftTouchSteering = true;
                    touchSteerStartY = e.clientY;
                    return;
                }

                if (e.button === 2) {
                    this.input.boostHeld = true;
                } else {
                    this.input.tetherHeld = true;
                    this.tryAttachTether();
                }
            }
        });

        const stopTouchSteer = () => {
            if (isLeftTouchSteering) {
                isLeftTouchSteering = false;
                touchSteerStartY = null;
                this.input.upHeld = false;
                this.input.downHeld = false;
            }
        };

        window.addEventListener('pointerup', (e) => {
            stopTouchSteer();
            if (e.button === 2) {
                this.input.boostHeld = false;
            } else {
                this.onTetherEnd();
            }
        });

        window.addEventListener('pointercancel', stopTouchSteer);

        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        window.addEventListener('keydown', (e) => {
            if (this.state === 'MENU' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                console.log('🚀 Keyboard start triggered!');
                this.startGame();
                return;
            } else if (e.code === 'Space') {
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
            } else if (e.code === 'KeyO') {
                const codexScreen = document.getElementById('codexScreen');
                if (codexScreen && !codexScreen.classList.contains('hidden')) {
                    this.closeCodex();
                } else {
                    this.openCodex();
                }
            } else if (e.code === 'KeyT') {
                const tasksModal = document.getElementById('tasksModal');
                if (tasksModal && !tasksModal.classList.contains('hidden')) {
                    this.closeTasksModal();
                } else {
                    this.openTasksModal();
                }
            } else if (e.code === 'KeyC') {
                if (this.state === 'PLAYING') {
                    this.toggleChaosTwin();
                }
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

        // Android Hardware Back Button Handler
        document.addEventListener('backbutton', (e) => {
            e.preventDefault();
            this.handleBackButton();
        });

        // Multi-level Background & App Lifecycle Listeners (Android, iOS & Web)
        // 1. Visibility change: minimize, tab hide, screen lock
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this.state === 'PLAYING') {
                    this.togglePause();
                }
                if (typeof sounds !== 'undefined' && sounds && typeof sounds.suspend === 'function') {
                    sounds.suspend();
                }
                if (this.planetSim) this.planetSim.stop();
            } else {
                if (this.state === 'PLAYING') {
                    this.lastTime = performance.now();
                    this.accumulator = 0;
                    if (typeof sounds !== 'undefined' && sounds && typeof sounds.resume === 'function') {
                        sounds.resume();
                    }
                } else if (this.state === 'PLANET_EXPLORATION' && this.planetSim) {
                    this.planetSim.start();
                }
            }
        });

        // 2. Page hide / blur fallback
        window.addEventListener('pagehide', () => {
            if (typeof sounds !== 'undefined' && sounds && typeof sounds.suspend === 'function') {
                sounds.suspend();
            }
        });

        window.addEventListener('blur', () => {
            if (this.state === 'PLAYING') {
                this.togglePause();
            }
        });

        // 3. Native Capacitor App Lifecycle (synchronous background transition on iOS & Android)
        if (typeof window !== 'undefined') {
            import('@capacitor/app').then(({ App }) => {
                App.addListener('appStateChange', ({ isActive }) => {
                    if (!isActive) {
                        if (this.state === 'PLAYING') {
                            this.togglePause();
                        }
                        if (typeof sounds !== 'undefined' && sounds && typeof sounds.suspend === 'function') {
                            sounds.suspend();
                        }
                        if (this.planetSim) this.planetSim.stop();
                    } else {
                        if (this.state === 'PLAYING') {
                            this.lastTime = performance.now();
                            this.accumulator = 0;
                            if (typeof sounds !== 'undefined' && sounds && typeof sounds.resume === 'function') {
                                sounds.resume();
                            }
                        } else if (this.state === 'PLANET_EXPLORATION' && this.planetSim) {
                            this.planetSim.start();
                        }
                    }
                });
            }).catch(() => {});
        }

        const startCampaignBtn = document.getElementById('startCampaignBtn');
        if (startCampaignBtn) startCampaignBtn.addEventListener('click', () => this.openCampaignModal());

        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            let lastStartTrigger = 0;
            const handleStart = (e) => {
                if (e && e.cancelable) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                const now = Date.now();
                if (now - lastStartTrigger < 300) return;
                lastStartTrigger = now;
                console.log('🚀 Launch button triggered! Starting flight...');
                this.startGame();
            };
            startBtn.addEventListener('click', handleStart);
            startBtn.addEventListener('touchend', handleStart, { passive: false });
        }

        const closeCampaignBtn = document.getElementById('closeCampaignBtn');

        const startHowToPlayBtn = document.getElementById('startHowToPlayBtn');
        const howToPlayModal = document.getElementById('howToPlayModal');
        const closeHowToPlayBtn = document.getElementById('closeHowToPlayBtn');
        if (startHowToPlayBtn && howToPlayModal) {
            startHowToPlayBtn.addEventListener('click', () => {
                howToPlayModal.classList.remove('hidden');
            });
        }
        if (closeHowToPlayBtn && howToPlayModal) {
            closeHowToPlayBtn.addEventListener('click', () => {
                howToPlayModal.classList.add('hidden');
            });
        }
        if (closeCampaignBtn) closeCampaignBtn.addEventListener('click', () => this.closeCampaignModal());

        const nextLevelBtn = document.getElementById('nextLevelBtn');
        if (nextLevelBtn) {
            nextLevelBtn.addEventListener('click', () => {
                const modal = document.getElementById('levelCompleteModal');
                if (modal) modal.classList.add('hidden');
                if (this.campaign && this.campaign.currentLevel) {
                    const nextId = this.campaign.currentLevel.id + 1;
                    if (nextId <= CAMPAIGN_LEVELS.length) {
                        this.startGame(nextId);
                    } else {
                        this.openCampaignModal();
                    }
                }
            });
        }

        const campaignMapBtn = document.getElementById('campaignMapBtn');
        if (campaignMapBtn) {
            campaignMapBtn.addEventListener('click', () => {
                const modal = document.getElementById('levelCompleteModal');
                if (modal) modal.classList.add('hidden');
                this.openCampaignModal();
            });
        }

        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) restartBtn.addEventListener('click', () => this.startGame());

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());

        const resumeBtn = document.getElementById('resumeBtn');
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.togglePause());

        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const isMuted = sounds.toggleMute();
                muteBtn.innerText = isMuted ? '🔇' : '🔊';
            });
        }

        const chaosBtn = document.getElementById('chaosBtn');
        if (chaosBtn) {
            chaosBtn.addEventListener('click', () => {
                if (this.state === 'PLAYING') this.toggleChaosTwin();
            });
        }

        const tasksBtn = document.getElementById('tasksBtn');
        if (tasksBtn) {
            tasksBtn.addEventListener('click', () => this.openTasksModal());
        }

        const startTasksBtn = document.getElementById('startTasksBtn');
        if (startTasksBtn) {
            startTasksBtn.addEventListener('click', () => this.openTasksModal());
        }

        const startCodexBtn = document.getElementById('startCodexBtn');
        if (startCodexBtn) {
            startCodexBtn.addEventListener('click', () => this.openCodex());
        }

        const gameOverTasksBtn = document.getElementById('gameOverTasksBtn');
        if (gameOverTasksBtn) {
            gameOverTasksBtn.addEventListener('click', () => this.openTasksModal());
        }

        const pauseTasksBtn = document.getElementById('pauseTasksBtn');
        if (pauseTasksBtn) {
            pauseTasksBtn.addEventListener('click', () => this.openTasksModal());
        }

        const mobileTasksBtn = document.getElementById('mobileTasksBtn');
        if (mobileTasksBtn) {
            mobileTasksBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openTasksModal();
            });
        }

        const closeTasksBtn = document.getElementById('closeTasksBtn');
        if (closeTasksBtn) {
            closeTasksBtn.addEventListener('click', () => this.closeTasksModal());
        }

        const codexBtn = document.getElementById('codexBtn');
        if (codexBtn) {
            codexBtn.addEventListener('click', () => this.openCodex());
        }

        const closeCodexBtn = document.getElementById('closeCodexBtn');
        if (closeCodexBtn) {
            closeCodexBtn.addEventListener('click', () => this.closeCodex());
        }

        const openCodexFromPlanetBtn = document.getElementById('openCodexFromPlanetBtn');
        if (openCodexFromPlanetBtn) {
            openCodexFromPlanetBtn.addEventListener('click', () => this.openCodex());
        }

        const relaunchBtn = document.getElementById('relaunchBtn');
        if (relaunchBtn) {
            relaunchBtn.addEventListener('click', () => this.relaunchFromPlanet());
        }

        const deployDroneBtn = document.getElementById('deployDroneBtn');
        if (deployDroneBtn) {
            deployDroneBtn.addEventListener('click', () => this.deployProbeScan());
        }

        // Codex filter tab buttons
        const codexTabs = ['tabAll', 'tabSolar', 'tabExo'];
        codexTabs.forEach(tabId => {
            const tabBtn = document.getElementById(tabId);
            if (tabBtn) {
                tabBtn.addEventListener('click', () => {
                    codexTabs.forEach(id => {
                        const b = document.getElementById(id);
                        if (b) b.classList.remove('active');
                    });
                    tabBtn.classList.add('active');
                    const filter = tabBtn.getAttribute('data-tab') || 'all';
                    this.renderCodexGrid(filter);
                });
            }
        });

        const mobileChaosBtn = document.getElementById('mobileChaosBtn');
        if (mobileChaosBtn) {
            mobileChaosBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state === 'PLAYING') this.toggleChaosTwin();
            });
        }

        const chaosSlider = document.getElementById('chaosOffsetSlider');
        const chaosLabel = document.getElementById('chaosOffsetLabel');
        if (chaosSlider && chaosLabel) {
            chaosSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.chaosOffset = val;
                chaosLabel.innerText = `starting difference: ${val < 0.00001 ? val.toExponential(1) : val.toFixed(6)} px`;
            });
        }

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
                    haptics.phaseShift();
                    this.addFloatingText('QUANTUM PHASE SHIFT!', this.ship.x, this.ship.y - 25, '#00f7ff');
                }
            });
        }

        const mobileDilation = document.getElementById('mobileDilationBtn');
        if (mobileDilation) {
            mobileDilation.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.ship.triggerTimeDilation()) {
                    haptics.timeDilation();
                    this.addFloatingText('TIME DILATION [SLOW-MO]!', this.ship.x, this.ship.y - 25, '#a855f7');
                    this.triggerScreenShake(3);
                }
            });
        }

        const mobileCodex = document.getElementById('mobileCodexBtn');
        if (mobileCodex) {
            mobileCodex.addEventListener('click', (e) => {
                e.stopPropagation();
                haptics.buttonTap();
                this.openCodex();
            });
        }

        const mobilePitchUp = document.getElementById('mobilePitchUpBtn');
        if (mobilePitchUp) {
            const startUp = (e) => { e.preventDefault(); e.stopPropagation(); this.input.upHeld = true; haptics.buttonTap(); };
            const stopUp = (e) => { e.preventDefault(); e.stopPropagation(); this.input.upHeld = false; };
            mobilePitchUp.addEventListener('pointerdown', startUp);
            mobilePitchUp.addEventListener('pointerup', stopUp);
            mobilePitchUp.addEventListener('pointerleave', stopUp);
            mobilePitchUp.addEventListener('pointercancel', stopUp);
        }

        const mobilePitchDown = document.getElementById('mobilePitchDownBtn');
        if (mobilePitchDown) {
            const startDown = (e) => { e.preventDefault(); e.stopPropagation(); this.input.downHeld = true; haptics.buttonTap(); };
            const stopDown = (e) => { e.preventDefault(); e.stopPropagation(); this.input.downHeld = false; };
            mobilePitchDown.addEventListener('pointerdown', startDown);
            mobilePitchDown.addEventListener('pointerup', stopDown);
            mobilePitchDown.addEventListener('pointerleave', stopDown);
            mobilePitchDown.addEventListener('pointercancel', stopDown);
        }

        // Settings Modal Wiring
        const settingsBtns = ['settingsBtn', 'startSettingsBtn', 'gameOverSettingsBtn', 'pauseSettingsBtn'];
        settingsBtns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.addEventListener('click', () => { haptics.buttonTap(); this.openSettingsModal(); });
        });

        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => { haptics.buttonTap(); this.closeSettingsModal(); });
        }

        const masterVol = document.getElementById('masterVolSlider');
        const masterVal = document.getElementById('masterVolVal');
        if (masterVol) {
            masterVol.value = sounds.masterVolume;
            if (masterVal) masterVal.innerText = `${Math.round(sounds.masterVolume * 100)}%`;
            masterVol.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                sounds.setMasterVolume(val);
                if (masterVal) masterVal.innerText = `${Math.round(val * 100)}%`;
            });
        }

        const musicVol = document.getElementById('musicVolSlider');
        const musicVal = document.getElementById('musicVolVal');
        if (musicVol) {
            musicVol.value = sounds.musicVolume;
            if (musicVal) musicVal.innerText = `${Math.round(sounds.musicVolume * 100)}%`;
            musicVol.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                sounds.setMusicVolume(val);
                if (musicVal) musicVal.innerText = `${Math.round(val * 100)}%`;
            });
        }

        const sfxVol = document.getElementById('sfxVolSlider');
        const sfxVal = document.getElementById('sfxVolVal');
        if (sfxVol) {
            sfxVol.value = sounds.sfxVolume;
            if (sfxVal) sfxVal.innerText = `${Math.round(sounds.sfxVolume * 100)}%`;
            sfxVol.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                sounds.setSfxVolume(val);
                if (sfxVal) sfxVal.innerText = `${Math.round(val * 100)}%`;
            });
        }

        const hapticsToggle = document.getElementById('hapticsToggle');
        if (hapticsToggle) {
            hapticsToggle.checked = haptics.enabled;
            hapticsToggle.addEventListener('change', (e) => {
                haptics.setEnabled(e.target.checked);
                if (e.target.checked) haptics.buttonTap();
            });
        }

        const shakeSlider = document.getElementById('screenShakeSlider');
        const shakeVal = document.getElementById('screenShakeVal');
        if (shakeSlider) {
            shakeSlider.value = this.screenShakeIntensity;
            if (shakeVal) shakeVal.innerText = `${Math.round(this.screenShakeIntensity * 100)}%`;
            shakeSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.screenShakeIntensity = val;
                if (typeof localStorage !== 'undefined') localStorage.setItem('slingshot_screenshake', val.toString());
                if (shakeVal) shakeVal.innerText = `${Math.round(val * 100)}%`;
            });
        }

        const cameraLeadToggle = document.getElementById('cameraLeadToggle');
        if (cameraLeadToggle) {
            cameraLeadToggle.checked = this.cameraLeadEnabled;
            cameraLeadToggle.addEventListener('change', (e) => {
                this.cameraLeadEnabled = e.target.checked;
                if (typeof localStorage !== 'undefined') localStorage.setItem('slingshot_cameralead', e.target.checked ? 'true' : 'false');
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
        sounds.init();

        const bestStar = this.findTargetableStar();
        if (bestStar) {
            const dist = PhysicsEngine.dist(this.ship.x, this.ship.y, bestStar.x, bestStar.y);
            this.ship.isTethered = true;
            this.ship.tetherStar = bestStar;
            this.ship.tetherLength = dist;
            this.ship.lastTetherAngle = Math.atan2(this.ship.y - bestStar.y, this.ship.x - bestStar.x);
            this.ship.orbitRotationAccumulator = 0;

            if (this.twin) {
                this.twin.isTethered = true;
                this.twin.tetherStar = bestStar;
                this.twin.tetherLength = dist;
                this.twin.lastTetherAngle = Math.atan2(this.twin.y - bestStar.y, this.twin.x - bestStar.x);
                this.twin.orbitRotationAccumulator = 0;
            }

            sounds.playTetherAttach();
            haptics.tetherAttach();
            this.triggerScreenShake(3);

            if (bestStar.isBinary) {
                this.addFloatingText('BINARY ORBIT CAPTURE!', bestStar.x, bestStar.y - 40, '#38bdf8');
            }
        }
    }

    onTetherEnd() {
        this.input.tetherHeld = false;

        // Mirror tether release onto twin (pure ghost: no scoring or sounds)
        if (this.twin && this.twin.isTethered && this.twin.tetherStar) {
            this.physics.evaluateRelease(this.twin, this.twin.tetherStar);
            this.twin.isTethered = false;
            this.twin.tetherStar = null;
        }

        if (this.ship.isTethered && this.ship.tetherStar) {
            const star = this.ship.tetherStar;
            const result = this.physics.evaluateRelease(this.ship, star);
            sounds.playSlingshotRelease(result.multiplier);

            if (result.isPerfect) {
                this.combo++;
                this.comboTimer = 7.0;
                this.perfectSlingshots++;
                if (this.taskManager) {
                    this.taskManager.checkAll();
                }
                const bonus = 300 * this.combo;
                this.score += bonus;
                sounds.playPerfectLaunch();
                haptics.perfectLaunch();

                const tag = star.isBinary ? 'BINARY SLINGSHOT! +' : 'PERFECT SLINGSHOT! +';
                this.addFloatingText(`${tag}${bonus}`, this.ship.x, this.ship.y - 20, '#00ffff');
                this.triggerScreenShake(8);
                this.particles.emitShockwave(this.ship.x, this.ship.y, 240, '#00f7ff', 0.55);
                this.particles.emitExplosion(this.ship.x, this.ship.y, '#00ffff', 35);
            } else {
                haptics.slingshotRelease(result.multiplier);
                this.score += 50 * this.combo;
                this.comboTimer = 5.0;
            }

            this.ship.isTethered = false;
            this.ship.tetherStar = null;
        }
    }

    startGame(levelId = null) {
        console.log('startGame() called with levelId:', levelId);

        // Immediate visual UI transition: guarantee menus close and HUD opens
        this.state = 'PLAYING';
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.classList.add('hidden');

        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.classList.add('hidden');

        const pauseScreen = document.getElementById('pauseScreen');
        if (pauseScreen) pauseScreen.classList.add('hidden');

        const planetExplorationScreen = document.getElementById('planetExplorationScreen');
        if (planetExplorationScreen) planetExplorationScreen.classList.add('hidden');

        const codexScreen = document.getElementById('codexScreen');
        if (codexScreen) codexScreen.classList.add('hidden');

        const tasksModal = document.getElementById('tasksModal');
        if (tasksModal) tasksModal.classList.add('hidden');

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) settingsModal.classList.add('hidden');

        const campaignScreen = document.getElementById('campaignScreen');
        if (campaignScreen) campaignScreen.classList.add('hidden');

        const levelCompleteModal = document.getElementById('levelCompleteModal');
        if (levelCompleteModal) levelCompleteModal.classList.add('hidden');

        const warningOverlay = document.getElementById('horizonWarningOverlay');
        if (warningOverlay) warningOverlay.classList.add('hidden');

        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('hidden');

        try {
            if (this.probeScanTimeout) {
                clearTimeout(this.probeScanTimeout);
                this.probeScanTimeout = null;
            }
            if (typeof sounds !== 'undefined' && sounds) {
                try {
                    sounds.stopTetherHum();
                    sounds.init();
                    sounds.resume();
                } catch (audioErr) {
                    console.warn('Audio initialization notice:', audioErr);
                }
            }
            if (this.twin) {
                this.removeChaosTwin();
            }
            if (this.planetSim) {
                this.planetSim.stop();
            }

            this.score = 0;
            this.combo = 1;
            this.comboTimer = 6.0;
            this.maxSpeed = 0;
            this.perfectSlingshots = 0;
            this.worldGenX = 50;
            this.planetSpawnCounter = 0;
            this.campaignElapsedTime = 0;
            this.sirenPulseTimer = 0;
            this.tickingSoundTimer = 0;

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

            // Configure Expedition Mode or Endless Run
            let activeLevel = null;
            if (levelId !== null && this.campaign) {
                activeLevel = this.campaign.startLevel(levelId);
            } else if (this.campaign) {
                this.campaign.startEndlessMode();
            }

            const campaignHudPanel = document.getElementById('campaignHudPanel');
            if (campaignHudPanel) {
                if (activeLevel) {
                    campaignHudPanel.classList.remove('hidden');
                    const lvlTitle = document.getElementById('campaignHudLevel');
                    if (lvlTitle) lvlTitle.innerText = `EXPEDITION ${activeLevel.id < 10 ? '0' + activeLevel.id : activeLevel.id} // ${activeLevel.title}`;
                } else {
                    campaignHudPanel.classList.add('hidden');
                }
            }

            if (activeLevel) {
                const pId = activeLevel.primaryPlanetId;
                const primaryPlanet = (typeof ALL_PLANETS !== 'undefined' ? ALL_PLANETS : SOLAR_PLANETS).find(p => p.id === pId) || SOLAR_PLANETS[0];
                const st1 = activeLevel.starTypes[0] || 'hypergiant';
                const st2 = activeLevel.starTypes[1] || 'pulsar';

                this.stars.push(new CelestialBody(420, 30, st1));
                this.stars.push(new CelestialBody(780, -40, 'planet', primaryPlanet));
                this.stars.push(new CelestialBody(1140, 50, st2));

                if (activeLevel.targetPlanetId) {
                    const targetP = (typeof ALL_PLANETS !== 'undefined' ? ALL_PLANETS : SOLAR_PLANETS).find(p => p.id === activeLevel.targetPlanetId);
                    if (targetP) {
                        this.stars.push(new CelestialBody(1500, -60, 'planet', targetP));
                    }
                }

                this.collectibles.push(new PhotonCore(250, 10));
                this.collectibles.push(new PhotonCore(600, -10));
                this.collectibles.push(new PhotonCore(950, 20));
                this.worldGenX = 1500;
            } else {
                // Guaranteed welcoming starter constellation right ahead of player
                this.stars.push(new CelestialBody(420, 30, 'hypergiant'));
                this.stars.push(new CelestialBody(740, -40, 'pulsar'));

                // Starter Mars planet within reach for immediate exploration or slingshot
                const starterMars = SOLAR_PLANETS.find(p => p.id === 'mars') || SOLAR_PLANETS[0];
                this.stars.push(new CelestialBody(1060, -60, 'planet', starterMars));

                this.stars.push(new CelestialBody(1380, 50, 'binary'));
                this.collectibles.push(new PhotonCore(250, 10));
                this.collectibles.push(new PhotonCore(560, -10));
                this.collectibles.push(new PhotonCore(880, 20));

                this.worldGenX = 1380;
            }
            this.generateWorld(3000);

            // Center camera immediately on the ship
            this.camera.x = this.ship.x + 140;
            this.camera.y = this.ship.y;

            this.updateHangarPilotStrip();
        } catch (err) {
            console.error('CRITICAL: Error during startGame, state preserved at PLAYING:', err);
        }
    }

    togglePause() {
        const pauseScreen = document.getElementById('pauseScreen');
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            if (pauseScreen) pauseScreen.classList.remove('hidden');
            if (typeof sounds !== 'undefined' && sounds) {
                sounds.stopTetherHum();
                sounds.suspend();
            }
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            this.lastTime = performance.now();
            this.accumulator = 0;
            if (pauseScreen) pauseScreen.classList.add('hidden');
            if (typeof sounds !== 'undefined' && sounds) {
                sounds.resume();
            }
        }
    }

    triggerScreenShake(intensity) {
        const mult = (this.screenShakeIntensity !== undefined) ? this.screenShakeIntensity : 1.0;
        this.camera.shake = Math.max(this.camera.shake, intensity * mult);
    }

    generateWorld(targetX) {
        const types = ['hypergiant', 'hypergiant', 'redgiant', 'pulsar', 'whitedwarf', 'binary', 'supernova'];

        while (this.worldGenX < targetX) {
            this.worldGenX += 280 + Math.random() * 180;
            // Adaptive star placement: Generates stars along the ship's current Y corridor
            const laneY = this.ship ? this.ship.y * 0.4 : 0;
            const starY = laneY + (Math.random() - 0.5) * 450;
            const type = types[Math.floor(Math.random() * types.length)];

            this.planetSpawnCounter++;
            const isPlanetSpawn = (this.planetSpawnCounter % 3 === 0);

            if (isPlanetSpawn) {
                // Alternate between Solar System planets and exotic Known Exoplanets
                const list = (this.planetSpawnCounter % 6 === 0) ? KNOWN_EXOPLANETS : SOLAR_PLANETS;
                const pData = list[Math.floor(Math.random() * list.length)];
                this.stars.push(new CelestialBody(this.worldGenX, starY, 'planet', pData));
            } else {
                this.stars.push(new CelestialBody(this.worldGenX, starY, type));
            }

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

    // Planetary Exploration & Science Codex Methods
    startPlanetaryExploration(planetData, planetBody) {
        if (!planetData) return;
        this.state = 'PLANET_EXPLORATION';
        this.currentPlanet = planetData;
        if (planetData.category === 'exoplanet') {
            this.exoplanetExplored = true;
        }
        sounds.stopTetherHum();

        // Release tether if ship was currently hooked
        if (this.ship.isTethered) {
            this.ship.isTethered = false;
            this.ship.tetherStar = null;
        }

        // Add to persistent codex
        const isNewDiscovery = !this.discoveredPlanets.has(planetData.id);
        this.discoveredPlanets.add(planetData.id);
        localStorage.setItem('slingshot_codex', JSON.stringify([...this.discoveredPlanets]));

        if (this.taskManager) {
            this.taskManager.checkAll();
        }

        // Discovery Bonus
        const bonusPts = isNewDiscovery ? 600 : 300;
        this.score += bonusPts;
        sounds.playCollect();
        haptics.planetTouchdown();

        // Populate Modal Telemetry
        const nameEl = document.getElementById('planetName');
        if (nameEl) nameEl.innerText = planetData.name.toUpperCase();

        const catPill = document.getElementById('planetCategoryPill');
        const catLabel = document.getElementById('planetCategoryLabel');
        const statDot = document.getElementById('planetStatusDot');
        if (catLabel) {
            if (planetData.category === 'solar') {
                catLabel.innerText = 'SOLAR SYSTEM EXPLORATION // SOL PROTOCOL';
                if (catPill) {
                    catPill.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                    catPill.style.color = '#38bdf8';
                }
                if (statDot) statDot.style.background = '#38bdf8';
            } else {
                catLabel.innerText = 'DEEP SPACE EXOPLANET DOSSIER // KNOWN ALIEN WORLD';
                if (catPill) {
                    catPill.style.borderColor = 'rgba(192, 132, 252, 0.4)';
                    catPill.style.color = '#c084fc';
                }
                if (statDot) statDot.style.background = '#c084fc';
            }
        }

        const tagEl = document.getElementById('planetTagline');
        if (tagEl) tagEl.innerText = planetData.tagline;

        const typeBadge = document.getElementById('planetTypeBadge');
        if (typeBadge) typeBadge.innerText = (planetData.category === 'solar' ? 'SOLAR SYSTEM' : 'EXOPLANET');

        const gravBadge = document.getElementById('planetGravityBadge');
        if (gravBadge) gravBadge.innerText = planetData.gravityG || '1.0g';

        const telGrav = document.getElementById('telGravity');
        if (telGrav) telGrav.innerText = planetData.gravityMss ? `${planetData.gravityMss} m/s² (${planetData.gravityG})` : (planetData.gravityG || 'N/A');

        const telPress = document.getElementById('telPressure');
        if (telPress) telPress.innerText = planetData.pressure || 'Vacuum / Unknown';

        const telTemp = document.getElementById('telTemp');
        if (telTemp) telTemp.innerText = planetData.temperature || 'N/A';

        const telDist = document.getElementById('telDistance');
        if (telDist) telDist.innerText = planetData.distanceFromSun || planetData.distanceFromHostStar || 'N/A';

        const telDay = document.getElementById('telDay');
        if (telDay) telDay.innerText = planetData.dayLength || 'N/A';

        const telYear = document.getElementById('telYear');
        if (telYear) telYear.innerText = planetData.yearLength || 'N/A';

        const telAtmo = document.getElementById('telAtmosphere');
        if (telAtmo) telAtmo.innerText = planetData.atmosphere || 'Trace';

        const factHeading = document.getElementById('dossierFactHeading');
        const factVal = document.getElementById('telMissionFact');
        if (factHeading && factVal) {
            if (planetData.category === 'solar') {
                factHeading.innerText = 'HISTORIC EXPLORATION MISSION:';
                factVal.innerText = planetData.missionFact;
            } else {
                factHeading.innerText = 'AUTHENTIC EXOPLANET ASTROPHYSICS:';
                factVal.innerText = planetData.exoplanetFact;
            }
        }

        const expHeading = document.getElementById('dossierExpHeading');
        const expVal = document.getElementById('telExperience');
        if (expHeading && expVal) {
            expHeading.innerText = planetData.category === 'solar' ? 'SURFACE LANDING SIMULATION:' : 'EXOPLANETARY ENVIRONMENT:';
            expVal.innerText = planetData.experienceText;
        }

        const scanTag = document.getElementById('planetScanTag');
        if (scanTag) scanTag.innerText = 'ATMOSPHERIC TELEMETRY: ACTIVE';
        const scanStatus = document.getElementById('planetScanStatus');
        if (scanStatus) scanStatus.innerText = 'ORBITAL TOUCHDOWN CONFIRMED';

        const droneBtn = document.getElementById('deployDroneBtn');
        if (droneBtn) {
            droneBtn.innerText = 'DEPLOY SURFACE PROBE SCAN';
            droneBtn.disabled = false;
            droneBtn.style.opacity = '1.0';
        }

        // Start Surface Simulation Canvas
        const simCanvas = document.getElementById('planetSimCanvas');
        if (simCanvas) {
            if (!this.planetSim) {
                this.planetSim = new PlanetSimulationEngine(simCanvas);
            }
            this.planetSim.setPlanet(planetData);
            this.planetSim.start();
        }

        const explorationModal = document.getElementById('planetExplorationScreen');
        if (explorationModal) explorationModal.classList.remove('hidden');

        const hud = document.getElementById('hud');
        if (hud) hud.classList.add('hidden');
    }

    deployProbeScan() {
        if (!this.planetSim || !this.currentPlanet) return;
        this.probesDeployed = (this.probesDeployed || 0) + 1;
        if (this.taskManager) {
            this.taskManager.checkAll();
        }
        this.planetSim.deployDrone();
        sounds.playTetherAttach();
        haptics.buttonTap();

        const scanTag = document.getElementById('planetScanTag');
        if (scanTag) scanTag.innerText = 'SURFACE PROBE: SCANNING BIOSPHERE...';

        const scanStatus = document.getElementById('planetScanStatus');
        if (scanStatus) scanStatus.innerText = 'QUADCOPTER PROBE DEPLOYED';

        const droneBtn = document.getElementById('deployDroneBtn');
        if (droneBtn) {
            droneBtn.innerText = 'PROBE TELEMETRY TRANSMITTING...';
            droneBtn.disabled = true;
            droneBtn.style.opacity = '0.6';
            this.probeScanTimeout = setTimeout(() => {
                this.probeScanTimeout = null;
                if (droneBtn) {
                    droneBtn.innerText = 'SURFACE SCAN COMPLETE (+250 PTS)';
                    droneBtn.disabled = false;
                    droneBtn.style.opacity = '1.0';
                }
                if (scanTag) scanTag.innerText = 'SURFACE TELEMETRY: HARVESTED';
                if (scanStatus) scanStatus.innerText = 'SPECTROMETRIC MAPPING VERIFIED';
                this.score += 250;
                sounds.playCollect();
                this.addFloatingText('PROBE DATA +250 PTS', this.ship.x, this.ship.y - 20, '#00f7ff');
            }, 1800);
        }
    }

    relaunchFromPlanet() {
        if (this.probeScanTimeout) {
            clearTimeout(this.probeScanTimeout);
            this.probeScanTimeout = null;
        }
        if (this.planetSim) {
            this.planetSim.stop();
        }

        const explorationModal = document.getElementById('planetExplorationScreen');
        if (explorationModal) explorationModal.classList.add('hidden');

        const hud = document.getElementById('hud');
        if (hud) hud.classList.remove('hidden');

        // Restore vessel systems fully
        this.ship.shield = this.ship.maxShield;
        this.ship.fuel = this.ship.maxFuel;
        this.ship.invulnerableTimer = 2.2;

        // Position vessel forward and grant massive escape velocity slingshot boost
        this.ship.x += 160;
        this.ship.vx = Math.max(540, this.ship.vx + 280);
        this.ship.vy = (Math.random() - 0.5) * 60;

        // Push event horizon back to grant safe runway
        this.horizon.x = Math.min(this.horizon.x, this.ship.x - 700);

        // Score reward
        const bonus = 800;
        this.score += bonus;
        sounds.playSlingshotRelease(2.5);
        haptics.perfectLaunch();
        this.triggerScreenShake(12);
        this.particles.emitShockwave(this.ship.x, this.ship.y, 220, '#00f7ff', 0.65);
        this.particles.emitExplosion(this.ship.x, this.ship.y, '#ffffff', 45);
        this.addFloatingText(`RELAUNCH BOOST! +${bonus}`, this.ship.x, this.ship.y - 30, '#00f7ff');
        this.addFloatingText('SHIELDS & REACTOR 100%', this.ship.x, this.ship.y - 10, '#22c55e');
        this.updateHangarPilotStrip();

        this.state = 'PLAYING';
        this.lastTime = performance.now();
        this.accumulator = 0;
    }

    openCodex(filter = 'all') {
        const codexScreen = document.getElementById('codexScreen');
        if (codexScreen) codexScreen.classList.remove('hidden');
        this.renderCodexGrid(filter);
    }

    closeCodex() {
        const codexScreen = document.getElementById('codexScreen');
        if (codexScreen) codexScreen.classList.add('hidden');
    }

    renderCodexGrid(filter = 'all') {
        this.codexActiveTab = filter;
        const grid = document.getElementById('codexGrid');
        if (!grid) return;
        grid.innerHTML = '';

        let planetsToDisplay = ALL_PLANETS;
        if (filter === 'solar') {
            planetsToDisplay = SOLAR_PLANETS;
        } else if (filter === 'exoplanet') {
            planetsToDisplay = KNOWN_EXOPLANETS;
        }

        // Update counts
        const allDiscovered = ALL_PLANETS.filter(p => this.discoveredPlanets.has(p.id)).length;
        const solarDiscovered = SOLAR_PLANETS.filter(p => this.discoveredPlanets.has(p.id)).length;
        const exoDiscovered = KNOWN_EXOPLANETS.filter(p => this.discoveredPlanets.has(p.id)).length;

        const countAll = document.getElementById('countAll');
        if (countAll) countAll.innerText = `${allDiscovered}/${ALL_PLANETS.length}`;
        const countSolar = document.getElementById('countSolar');
        if (countSolar) countSolar.innerText = `${solarDiscovered}/${SOLAR_PLANETS.length}`;
        const countExo = document.getElementById('countExo');
        if (countExo) countExo.innerText = `${exoDiscovered}/${KNOWN_EXOPLANETS.length}`;

        planetsToDisplay.forEach(p => {
            const isDiscovered = this.discoveredPlanets.has(p.id);
            const card = document.createElement('div');
            card.className = `codex-card ${isDiscovered ? 'codex-card-discovered' : 'undiscovered'}`;

            const iconHtml = `<span class="codex-card-planet-icon" style="background: ${isDiscovered ? p.color : '#334155'}; box-shadow: 0 0 8px ${isDiscovered ? p.color : 'transparent'};"></span>`;
            const badgeText = p.category === 'solar' ? 'SOL' : 'EXO';
            const badgeStyle = p.category === 'solar' ? 'color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);' : 'color: #c084fc; border-color: rgba(192, 132, 252, 0.4);';

            card.innerHTML = `
                <div class="codex-card-header">
                    ${iconHtml}
                    <span class="spec-pill" style="${badgeStyle}">${isDiscovered ? badgeText : 'LOCKED'}</span>
                </div>
                <div class="codex-card-name">${isDiscovered ? p.name : 'Unknown Planet'}</div>
                <div class="codex-card-tagline">${isDiscovered ? p.tagline : 'Explore deep space to make contact and log planetary telemetry.'}</div>
                <div class="codex-card-stats">
                    <span>${isDiscovered ? (p.gravityG || '1.0g') : '?.??g'}</span> &bull; 
                    <span>${isDiscovered ? (p.temperature.split('[')[0].trim()) : '??? K'}</span>
                </div>
            `;

            if (isDiscovered) {
                card.addEventListener('click', () => {
                    this.closeCodex();
                    this.startPlanetaryExploration(p, null);
                });
            }

            grid.appendChild(card);
        });
    }

    openTasksModal() {
        const tasksModal = document.getElementById('tasksModal');
        if (tasksModal) {
            tasksModal.classList.remove('hidden');
            this.renderTasksGrid();
        }
    }

    closeTasksModal() {
        const tasksModal = document.getElementById('tasksModal');
        if (tasksModal) {
            tasksModal.classList.add('hidden');
        }
    }

    renderTasksGrid() {
        if (!this.taskManager) return;
        const grid = document.getElementById('tasksGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const completedCount = this.taskManager.getCompletedCount();
        const totalCount = this.taskManager.getTotalCount();
        const rank = this.taskManager.getRank();

        const rankBadge = document.getElementById('pilotRankBadge');
        if (rankBadge) {
            rankBadge.innerText = `${rank.badge} // ${rank.title}`;
        }

        const subtitle = document.getElementById('tasksOverviewSubtitle');
        if (subtitle) {
            subtitle.innerText = `FLIGHT OBJECTIVES \u2022 ${completedCount}/${totalCount} COMPLETED`;
        }

        for (const task of MISSION_TASKS) {
            const isCompleted = this.taskManager.completedTaskIds.has(task.id);
            const status = task.check(this);
            const pct = isCompleted ? 100 : Math.floor(Math.min(1.0, status.progress) * 100);

            const card = document.createElement('div');
            card.className = `task-card ${isCompleted ? 'task-card-completed' : ''}`;
            card.innerHTML = `
                <div class="task-header-row">
                    <div class="task-title-group">
                        <span class="task-icon">${task.icon}</span>
                        <div class="task-title">${task.title}</div>
                    </div>
                    <span class="task-reward-pill">+${task.reward} PTS</span>
                </div>
                <div class="task-desc">${task.description}</div>
                <div class="task-progress-box">
                    <div class="task-progress-meta">
                        <span>${isCompleted ? 'COMPLETED' : `${status.current} / ${status.target} ${task.unit}`}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="task-bar-track">
                        <div class="task-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        }
    }

    openSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
        }
    }

    closeSettingsModal() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.classList.add('hidden');
        }
    }

    handleBackButton() {
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && !settingsModal.classList.contains('hidden')) {
            this.closeSettingsModal();
            return;
        }

        const tasksModal = document.getElementById('tasksModal');
        if (tasksModal && !tasksModal.classList.contains('hidden')) {
            this.closeTasksModal();
            return;
        }

        const codexScreen = document.getElementById('codexScreen');
        if (codexScreen && !codexScreen.classList.contains('hidden')) {
            this.closeCodex();
            return;
        }

        const planetExplorationScreen = document.getElementById('planetExplorationScreen');
        if (planetExplorationScreen && !planetExplorationScreen.classList.contains('hidden')) {
            this.relaunchFromPlanet();
            return;
        }

        if (this.state === 'PLAYING') {
            this.togglePause();
            return;
        }

        if (this.state === 'PAUSED') {
            this.togglePause();
            return;
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
        if (this.twin) {
            this.removeChaosTwin();
        }
        if (typeof sounds !== 'undefined' && sounds) {
            sounds.stopTetherHum();
            sounds.stopMusic();
            sounds.playExplosion();
        } else {
            sounds.playExplosion();
        }
        haptics.hullDamage();
        this.triggerScreenShake(20);
        this.particles.emitExplosion(this.ship.x, this.ship.y, '#ff0055', 70);
        this.updateHangarPilotStrip();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('slingshot_highscore', this.highScore.toString());
        }

        const maxC = (this.maxSpeed / 600).toFixed(2);
        const deathReasonEl = document.getElementById('deathReason');
        if (deathReasonEl) deathReasonEl.innerText = reason;

        const finalScoreEl = document.getElementById('finalScore');
        if (finalScoreEl) finalScoreEl.innerText = Math.floor(this.score).toLocaleString();

        const finalDistEl = document.getElementById('finalDistance');
        if (finalDistEl) finalDistEl.innerText = Math.floor(this.ship.x / 100).toLocaleString() + ' LY';

        const finalMaxSpeedEl = document.getElementById('finalMaxSpeed');
        if (finalMaxSpeedEl) finalMaxSpeedEl.innerText = `${maxC} c`;

        const finalSlingshotsEl = document.getElementById('finalSlingshots');
        if (finalSlingshotsEl) finalSlingshotsEl.innerText = this.perfectSlingshots;

        const finalHighScoreEl = document.getElementById('finalHighScore');
        if (finalHighScoreEl) finalHighScoreEl.innerText = Math.floor(this.highScore).toLocaleString();

        const gameOverScreen = document.getElementById('gameOverScreen');
        if (gameOverScreen) gameOverScreen.classList.remove('hidden');
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

    // Chaos Twin Methods
    cloneShip(source, offsetX = CHAOS_OFFSET) {
        const twin = new Ship(source.x + offsetX, source.y, source.shipClass);
        twin.vx = source.vx;
        twin.vy = source.vy;
        twin.angle = source.angle;
        twin.radius = source.radius;
        twin.fuel = source.fuel;
        twin.shield = source.shield;
        twin.isTethered = source.isTethered;
        twin.tetherStar = source.tetherStar;
        twin.tetherLength = source.tetherLength;
        twin.orbitRotationAccumulator = source.orbitRotationAccumulator;
        if (source.isTethered && source.tetherStar) {
            twin.lastTetherAngle = Math.atan2(twin.y - source.tetherStar.y, twin.x - source.tetherStar.x);
        } else {
            twin.lastTetherAngle = source.lastTetherAngle;
        }
        twin.isBoosting = source.isBoosting;
        twin.invulnerableTimer = source.invulnerableTimer;
        twin.phaseShiftActive = source.phaseShiftActive;
        twin.phaseShiftTimer = source.phaseShiftTimer;
        twin.phaseShiftCooldown = source.phaseShiftCooldown;
        twin.timeDilationActive = source.timeDilationActive;
        twin.timeDilationTimer = source.timeDilationTimer;
        twin.timeDilationCooldown = source.timeDilationCooldown;
        return twin;
    }

    toggleChaosTwin() {
        if (this.state !== 'PLAYING') return;
        if (this.twin) {
            this.removeChaosTwin();
            this.addFloatingText('CHAOS TWIN REMOVED', this.ship.x, this.ship.y - 30, '#94a3b8');
        } else {
            this.spawnChaosTwin();
            this.addFloatingText('CHAOS TWIN SPAWNED!', this.ship.x, this.ship.y - 30, '#00f7ff');
        }
    }

    spawnChaosTwin() {
        this.twin = this.cloneShip(this.ship, this.chaosOffset);
        this.twinTrail = [{ x: this.twin.x, y: this.twin.y }];
        this.chaosTime = 0;
        this.chaosLogTimer = 0;
        console.log(`[Chaos Twin] Spawned. Starting difference: ${this.chaosOffset} px`);
        const panel = document.getElementById('chaosPanel');
        if (panel) panel.classList.remove('hidden');
        const mobBtn = document.getElementById('mobileChaosBtn');
        if (mobBtn) mobBtn.classList.add('active');
        this.updateChaosHUD(this.chaosOffset);
    }

    removeChaosTwin() {
        this.twin = null;
        this.twinTrail = [];
        this.chaosTime = 0;
        this.chaosLogTimer = 0;
        const panel = document.getElementById('chaosPanel');
        if (panel) panel.classList.add('hidden');
        const mobBtn = document.getElementById('mobileChaosBtn');
        if (mobBtn) mobBtn.classList.remove('active');
        console.log('[Chaos Twin] Removed.');
    }

    updateChaosHUD(separation) {
        const sepEl = document.getElementById('chaosSeparation');
        if (sepEl) {
            sepEl.innerText = separation.toExponential(3) + ' px';
        }
        const timeEl = document.getElementById('chaosTime');
        if (timeEl) {
            timeEl.innerText = this.chaosTime.toFixed(1) + ' s';
        }
    }

    // Step physics at fixed dt (1/120s)
    update(dt) {
        if (this.state !== 'PLAYING') return;

        // 1. Check Campaign Expedition Mission Completion
        if (this.campaign && this.campaign.isCampaignMode && this.campaign.currentLevel) {
            this.campaignElapsedTime += dt;
            const completion = this.campaign.checkLevelCompletion(this, this.campaignElapsedTime);
            if (completion && completion.completed) {
                this.triggerLevelComplete(completion);
                return;
            }
        }

        // 2. Interstellar Relativistic Time Dilation & Ticking Pulse
        const hudTimeDilation = document.getElementById('hudTimeDilation');
        if (this.ship.timeDilationActive) {
            this.tickingSoundTimer -= dt;
            if (this.tickingSoundTimer <= 0) {
                sounds.playTickingPulse();
                this.tickingSoundTimer = 0.65;
            }
            if (hudTimeDilation) {
                hudTimeDilation.innerText = '0.40x [DILATED]';
                hudTimeDilation.style.color = '#c084fc';
            }
        } else {
            if (hudTimeDilation) {
                hudTimeDilation.innerText = '1.00x';
                hudTimeDilation.style.color = '#94a3b8';
            }
        }

        // 3. Singularity Event Horizon Proximity Warning Overlay
        const horizonGap = this.ship.x - this.horizon.x;
        const warningOverlay = document.getElementById('horizonWarningOverlay');
        if (horizonGap < 480) {
            if (warningOverlay) warningOverlay.classList.remove('hidden');
            this.sirenPulseTimer -= dt;
            if (this.sirenPulseTimer <= 0) {
                sounds.playWarningPulse();
                this.sirenPulseTimer = 0.55;
            }
        } else {
            if (warningOverlay) warningOverlay.classList.add('hidden');
        }

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
            sounds.startTetherHum(180 + (currentSpeed / 4));
        } else {
            sounds.stopTetherHum();
        }

        this.ship.update(dt);

        // Chaos Twin Update & Input Mirroring
        if (this.twin) {
            this.chaosTime += dt;
            this.chaosLogTimer += dt;

            // Mirror attitude inputs
            if (this.input.upHeld) {
                this.twin.vy -= 300 * dt;
            }
            if (this.input.downHeld) {
                this.twin.vy += 300 * dt;
            }
            if (this.input.leftHeld) {
                this.twin.vx = Math.max(220, this.twin.vx - 180 * dt);
            }
            if (this.input.rightHeld) {
                this.twin.vx += 220 * dt;
            }

            // Mirror drift stabilization
            if (!this.twin.isTethered) {
                this.twin.vy *= 0.993;
                if (Math.abs(this.twin.y) > 420) {
                    this.twin.vy -= Math.sign(this.twin.y) * 90 * dt;
                }
                if (this.twin.vx < 260) {
                    this.twin.vx += 160 * dt;
                }
            }

            // Mirror boost & quantum abilities
            this.twin.isBoosting = this.ship.isBoosting;
            this.twin.phaseShiftActive = this.ship.phaseShiftActive;
            this.twin.timeDilationActive = this.ship.timeDilationActive;

            // Tether sync
            if (this.ship.isTethered && !this.twin.isTethered && this.ship.tetherStar) {
                this.twin.isTethered = true;
                this.twin.tetherStar = this.ship.tetherStar;
                this.twin.tetherLength = this.ship.tetherLength;
                this.twin.lastTetherAngle = Math.atan2(this.twin.y - this.ship.tetherStar.y, this.twin.x - this.ship.tetherStar.x);
                this.twin.orbitRotationAccumulator = 0;
            } else if (!this.ship.isTethered && this.twin.isTethered) {
                if (this.twin.tetherStar) {
                    this.physics.evaluateRelease(this.twin, this.twin.tetherStar);
                }
                this.twin.isTethered = false;
                this.twin.tetherStar = null;
            }

            // Step twin physics with the same PhysicsEngine.stepShip and same stars array
            this.physics.stepShip(this.twin, this.stars, dt, timeScale);
            this.twin.update(dt);

            // Record twin trail
            this.twinTrail.push({ x: this.twin.x, y: this.twin.y });
            if (this.twinTrail.length > 35) {
                this.twinTrail.shift();
            }

            // Measure live separation
            const dx = this.ship.x - this.twin.x;
            const dy = this.ship.y - this.twin.y;
            const separation = Math.sqrt(dx * dx + dy * dy);

            // Honesty check: log to console every second
            if (this.chaosLogTimer >= 1.0) {
                this.chaosLogTimer -= 1.0;
                console.log(`[Chaos Twin] t=${this.chaosTime.toFixed(1)}s | Separation: ${separation.toExponential(4)} px`);
            }

            this.updateChaosHUD(separation);
        }

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
                sounds.playWarningAlarm();
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

        // Collisions: Check planets first (triggers exploration instead of gameover!)
        for (const star of this.stars) {
            const checkNodes = star.isBinary && star.twin ? [star, star.twin] : [star];
            for (const node of checkNodes) {
                if (!node) continue;
                const d = PhysicsEngine.dist(this.ship.x, this.ship.y, node.x, node.y);
                if (d < node.radius + this.ship.radius) {
                    if (node.isPlanet || star.isPlanet) {
                        const pData = node.planetData || star.planetData;
                        this.startPlanetaryExploration(pData, node);
                        return;
                    } else if (!this.ship.phaseShiftActive) {
                        this.triggerGameOver(`Incinerated by the extreme core of a ${star.name}`);
                        return;
                    }
                }
            }
        }

        // Asteroid Debris Collisions (intangible during Quantum Phase Shift)
        if (!this.ship.phaseShiftActive) {
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
                            sounds.playExplosion();
                            haptics.hullDamage();
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
                sounds.playCollect();
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
                sounds.playWormholeWarp();
                haptics.wormholeWarp();
                this.triggerScreenShake(14);
                this.particles.emitExplosion(w.x, w.y, '#00f7ff', 40);
                this.ship.x += w.teleportDistance;
                this.ship.vx = Math.max(550, this.ship.vx * 1.4);
                this.wormholeJumps = (this.wormholeJumps || 0) + 1;
                this.score += 1500;
                if (this.taskManager) {
                    this.taskManager.checkAll();
                }
                this.addFloatingText('HYPERSPACE WARP! +1500', this.ship.x, this.ship.y - 25, '#9900ff');
                break;
            }
        }

        if (this.taskManager) {
            this.taskManager.checkAll();
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

        const hudSpeed = document.getElementById('hudSpeed');
        if (hudSpeed) hudSpeed.innerText = `${speedFraction} c`;

        const hudDistance = document.getElementById('hudDistance');
        if (hudDistance) hudDistance.innerText = `${distanceLY.toLocaleString()} LY`;

        const hudScore = document.getElementById('hudScore');
        if (hudScore) hudScore.innerText = Math.floor(this.score).toLocaleString();

        const hudCombo = document.getElementById('hudCombo');
        if (hudCombo) hudCombo.innerText = `${this.combo}x`;

        const hudHorizonGap = document.getElementById('hudHorizonGap');
        if (hudHorizonGap) hudHorizonGap.innerText = `${horizonGap} AU`;

        const fuelBar = document.getElementById('fuelBar');
        if (fuelBar) fuelBar.style.width = `${(this.ship.fuel / this.ship.maxFuel) * 100}%`;

        const shieldBar = document.getElementById('shieldBar');
        if (shieldBar) shieldBar.style.width = `${(this.ship.shield / this.ship.maxShield) * 100}%`;

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

        // Campaign Mission HUD Bar & Goal Tracker
        if (this.campaign && this.campaign.isCampaignMode && this.campaign.currentLevel) {
            const lvl = this.campaign.currentLevel;
            const curDist = Math.max(0, Math.floor(this.ship.x));
            const pct = Math.min(100, Math.floor((curDist / lvl.targetDistance) * 100));

            const hudGoal = document.getElementById('campaignHudGoal');
            if (hudGoal) hudGoal.innerText = `DIST: ${Math.floor(this.ship.x / 100)} / ${Math.floor(lvl.targetDistance / 100)} LY`;

            const hudPct = document.getElementById('campaignHudPct');
            if (hudPct) hudPct.innerText = `${pct}%`;

            const barFill = document.getElementById('campaignBarFill');
            if (barFill) barFill.style.width = `${pct}%`;

            const hudSlingshots = document.getElementById('campaignHudSlingshots');
            if (hudSlingshots) hudSlingshots.innerText = `PERFECT SLINGSHOTS: ${this.perfectSlingshots} / ${lvl.requiredPerfectSlingshots}`;
        }
    }

    // High-performance Glowing Spacetime Fabric Trampoline & Equipotential Contours
    drawSpacetimeFabric(ctx, viewLeft, viewRight, viewTop, viewBottom) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const cellSize = Config.visuals.spacetimeGridCellSize || 95;
        const startX = Math.floor(viewLeft / cellSize) * cellSize;
        const endX = Math.ceil(viewRight / cellSize) * cellSize;
        const startY = Math.floor(viewTop / cellSize) * cellSize;
        const endY = Math.ceil(viewBottom / cellSize) * cellSize;

        // Pre-filter nearby stars to keep frame rate locked at 120 fps
        const nearbyStars = this.stars.filter(s => s.x > viewLeft - 300 && s.x < viewRight + 300);

        // 1. Equipotential Gravity Well Contours around stars
        for (const s of nearbyStars) {
            const numContours = 3;
            for (let k = 1; k <= numContours; k++) {
                const cRadius = s.radius * (1.2 + k * 1.1);
                ctx.strokeStyle = `rgba(0, 247, 255, ${0.28 / k})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(s.x, s.y, cRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        const warpPoint = (x, y) => {
            let wx = x;
            let wy = y;
            for (const s of nearbyStars) {
                const dx = s.x - x;
                const dy = s.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < s.gravityRadius && dist > 1) {
                    const pull = Math.min(32, (s.radius * 35) / (dist + 40));
                    wx += (dx / dist) * pull;
                    wy += (dy / dist) * pull;
                }
            }
            return { x: wx, y: wy };
        };

        ctx.strokeStyle = 'rgba(0, 180, 255, 0.22)';
        ctx.lineWidth = 1;

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

        // Always center camera directly on the ship with dynamic look-ahead lead
        const currentSpeed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        const leadDist = this.cameraLeadEnabled ? Math.min(260, 130 + currentSpeed * 0.28) : 130;
        const leadY = this.cameraLeadEnabled ? this.ship.vy * 0.18 : 0;
        const targetCamX = this.ship.x + leadDist;
        const targetCamY = this.ship.y + leadY;
        this.camera.x += (targetCamX - this.camera.x) * 0.12;
        this.camera.y += (targetCamY - this.camera.y) * 0.12;

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

        // Draw Deep Space Volumetric Nebula & Starfield
        this.nebula.draw(this.ctx, this.camera.x, this.camera.y, viewLeft, viewRight, viewTop, viewBottom, performance.now() * 0.001);

        // Draw Spacetime Fabric Rubber Sheet Grid
        this.drawSpacetimeFabric(this.ctx, viewLeft, viewRight, viewTop, viewBottom);

        // Draw Color-Coded Trajectory Prediction Arc
        if (this.state === 'PLAYING') {
            const traj = this.physics.calculateTrajectory(this.ship, this.stars, this.asteroids);
            if (traj.points.length > 1) {
                this.ctx.save();
                if (traj.status === 'hazard') {
                    this.ctx.strokeStyle = 'rgba(255, 50, 70, 0.85)';
                    this.ctx.lineWidth = 2.2;
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.shadowColor = '#ff0055';
                    this.ctx.shadowBlur = 10;
                } else if (traj.status === 'perfect') {
                    this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
                    this.ctx.lineWidth = 2.8;
                    this.ctx.setLineDash([8, 4]);
                    this.ctx.shadowColor = '#ffd700';
                    this.ctx.shadowBlur = 14;
                } else {
                    this.ctx.strokeStyle = this.ship.isTethered ? 'rgba(0, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.35)';
                    this.ctx.lineWidth = 1.8;
                    this.ctx.setLineDash([6, 8]);
                }

                this.ctx.beginPath();
                this.ctx.moveTo(this.ship.x, this.ship.y);
                for (const pt of traj.points) {
                    this.ctx.lineTo(pt.x, pt.y);
                }
                this.ctx.stroke();

                // Traveling energetic laser pulse nodes along trajectory
                const pulseTime = Date.now() * 0.003;
                const pulseNodes = 3;
                for (let k = 0; k < pulseNodes; k++) {
                    const pIdx = Math.floor(((pulseTime + k / pulseNodes) % 1.0) * (traj.points.length - 1));
                    const pt = traj.points[pIdx];
                    if (pt) {
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.shadowColor = (traj.status === 'perfect') ? '#ffd700' : '#00f7ff';
                        this.ctx.shadowBlur = 12;
                        this.ctx.beginPath();
                        this.ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }

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

        // Draw Chaos Twin (translucent cyan ghost with trail & connecting line)
        if (this.twin && this.state !== 'GAMEOVER') {
            // Dotted connecting line between player and twin
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(0, 247, 255, 0.45)';
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([3, 4]);
            this.ctx.beginPath();
            this.ctx.moveTo(this.ship.x, this.ship.y);
            this.ctx.lineTo(this.twin.x, this.twin.y);
            this.ctx.stroke();
            this.ctx.restore();

            // Twin trail
            if (this.twinTrail.length > 1) {
                this.ctx.save();
                for (let i = 0; i < this.twinTrail.length - 1; i++) {
                    const p1 = this.twinTrail[i];
                    const p2 = this.twinTrail[i + 1];
                    const alpha = ((i + 1) / this.twinTrail.length) * 0.5;
                    this.ctx.strokeStyle = `rgba(0, 247, 255, ${alpha})`;
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.stroke();
                }
                this.ctx.restore();
            }

            // Ghost tether line to star if tethered
            if (this.twin.isTethered && this.twin.tetherStar) {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(0, 247, 255, 0.35)';
                this.ctx.lineWidth = 1.2;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.twin.x, this.twin.y);
                this.ctx.lineTo(this.twin.tetherStar.x, this.twin.tetherStar.y);
                this.ctx.stroke();
                this.ctx.restore();
            }

            // Translucent cyan ghost ship
            this.ctx.save();
            this.ctx.translate(this.twin.x, this.twin.y);
            this.ctx.rotate(this.twin.angle);
            this.ctx.globalAlpha = 0.55;
            this.ctx.fillStyle = 'rgba(0, 247, 255, 0.2)';
            this.ctx.strokeStyle = '#00f7ff';
            this.ctx.lineWidth = 1.8;
            this.ctx.shadowColor = '#00f7ff';
            this.ctx.shadowBlur = 10;

            this.ctx.beginPath();
            this.ctx.moveTo(17, 0);
            this.ctx.lineTo(-12, -10);
            this.ctx.lineTo(-7, 0);
            this.ctx.lineTo(-12, 10);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();

            this.ctx.fillStyle = '#00f7ff';
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        // Draw Floating In-Game Texts
        for (const ft of this.floatingTexts) {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.life);
            this.ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
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

        // Interstellar Ranger Cockpit HUD Overlays in Screen Space
        this.drawCockpitHorizon();
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

    // =========================================================================
    // INTERSTELLAR EXPEDITION CAMPAIGN & RANGER COCKPIT METHODS
    // =========================================================================

    openCampaignModal() {
        this.renderCampaignGrid();
        const screen = document.getElementById('campaignScreen');
        if (screen) screen.classList.remove('hidden');
    }

    closeCampaignModal() {
        const screen = document.getElementById('campaignScreen');
        if (screen) screen.classList.add('hidden');
    }

    renderCampaignGrid() {
        const grid = document.getElementById('campaignGrid');
        const levelsList = typeof CAMPAIGN_LEVELS !== 'undefined' ? CAMPAIGN_LEVELS : [];
        if (!grid || !this.campaign || !levelsList.length) return;
        grid.innerHTML = '';

        levelsList.forEach(lvl => {
            const isUnlocked = lvl.id <= this.campaign.unlockedLevel;
            const stars = this.campaign.levelStars[lvl.id] || 0;
            const highScore = this.campaign.levelHighScores[lvl.id] || 0;
            const isCompleted = stars > 0;

            const card = document.createElement('div');
            card.className = `campaign-card ${isUnlocked ? (isCompleted ? 'completed' : '') : 'locked'}`;

            let starsHtml = '';
            for (let s = 1; s <= 3; s++) {
                starsHtml += `<span class="${s <= stars ? 'star-filled' : 'star-empty'}">★</span>`;
            }

            card.innerHTML = `
                <div class="campaign-card-header">
                    <span class="card-pill gold-pill" style="font-size: 9px; padding: 2px 7px;">EXPEDITION ${lvl.id < 10 ? '0' + lvl.id : lvl.id}</span>
                    <div class="campaign-stars">${starsHtml}</div>
                </div>
                <div class="campaign-card-title">${lvl.title}</div>
                <div style="font-family: var(--font-mono); font-size: 10px; color: #f59e0b; margin-bottom: 4px;">// ${lvl.subtitle}</div>
                <div class="campaign-card-desc">${lvl.briefing}</div>
                <div class="campaign-card-meta">
                    <span class="campaign-meta-badge">TARGET: ${Math.floor(lvl.targetDistance / 100)} LY</span>
                    <span class="campaign-meta-badge">REQ SLINGSHOTS: ${lvl.requiredPerfectSlingshots}</span>
                    <span class="campaign-meta-badge">3★ TIME: &lt;${lvl.starTimes.threeStar}s</span>
                </div>
                <div class="campaign-card-footer">
                    <span style="font-family: var(--font-mono); font-size: 10px; color: var(--color-fg-dim);">
                        ${highScore > 0 ? 'BEST: <span class="gold-text">' + Math.floor(highScore).toLocaleString() + ' PTS</span>' : (isUnlocked ? 'READY FOR FLIGHT' : 'CLASSIFIED')}
                    </span>
                    ${isUnlocked ? `<button class="campaign-launch-btn" data-level="${lvl.id}">ENGAGE ▶</button>` : `<span style="font-family: var(--font-mono); font-size: 10px; color: #64748b;">🔒 LOCKED</span>`}
                </div>
            `;

            if (isUnlocked) {
                const btn = card.querySelector('.campaign-launch-btn');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.closeCampaignModal();
                        this.startGame(lvl.id);
                    });
                }
            }

            grid.appendChild(card);
        });
    }

    triggerLevelComplete(completion) {
        this.state = 'PAUSED';
        if (typeof sounds !== 'undefined') {
            sounds.stopTetherHum();
            if (sounds.playVictoryFanfare) sounds.playVictoryFanfare();
        }
        if (typeof haptics !== 'undefined' && haptics.wormholeWarp) {
            haptics.wormholeWarp();
        }

        const warningOverlay = document.getElementById('horizonWarningOverlay');
        if (warningOverlay) warningOverlay.classList.add('hidden');

        const modal = document.getElementById('levelCompleteModal');
        if (!modal) return;

        const titleEl = document.getElementById('levelCompleteTitle');
        if (titleEl) titleEl.innerText = `EXPEDITION ${completion.level.id < 10 ? '0' + completion.level.id : completion.level.id}: ${completion.level.title}`;

        const starsEl = document.getElementById('levelCompleteStars');
        if (starsEl) {
            starsEl.innerHTML = '';
            for (let i = 1; i <= 3; i++) {
                const star = document.createElement('span');
                star.className = `star-icon ${i <= completion.stars ? 'awarded' : ''}`;
                star.innerText = '★';
                starsEl.appendChild(star);
            }
        }

        const timeEl = document.getElementById('levelCompleteTime');
        if (timeEl) timeEl.innerText = `${completion.time.toFixed(1)}s`;

        const speedEl = document.getElementById('levelCompleteSpeed');
        if (speedEl) speedEl.innerText = `${(this.maxSpeed / 600).toFixed(2)} c`;

        const slingshotsEl = document.getElementById('levelCompleteSlingshots');
        if (slingshotsEl) slingshotsEl.innerText = `${this.perfectSlingshots}`;

        const scoreEl = document.getElementById('levelCompleteScore');
        if (scoreEl) scoreEl.innerText = `${Math.floor(completion.score).toLocaleString()} PTS`;

        const nextBtn = document.getElementById('nextLevelBtn');
        if (nextBtn) {
            if (completion.isFinalLevel) {
                nextBtn.innerText = 'TRANSCENDENCE ACHIEVED ★';
            } else {
                nextBtn.innerText = `NEXT: EXPEDITION ${completion.level.id + 1} ▶`;
            }
        }

        modal.classList.remove('hidden');
    }

    drawCockpitHorizon() {
        if (this.state !== 'PLAYING') return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();

        // 1. Relativistic Velocity Vector Reticle (Flight Path Marker)
        const speed = Math.sqrt(this.ship.vx * this.ship.vx + this.ship.vy * this.ship.vy);
        const headingAngle = Math.atan2(this.ship.vy, this.ship.vx);
        const reticleDist = Math.min(80, speed * 0.08);
        const rx = cx + Math.cos(headingAngle) * reticleDist;
        const ry = cy + Math.sin(headingAngle) * reticleDist;

        ctx.strokeStyle = 'rgba(0, 247, 255, 0.45)';
        ctx.lineWidth = 1.5;

        // Reticle ring
        ctx.beginPath();
        ctx.arc(rx, ry, 12, 0, Math.PI * 2);
        ctx.stroke();

        // Reticle crosshair wings
        ctx.beginPath();
        ctx.moveTo(rx - 22, ry);
        ctx.lineTo(rx - 12, ry);
        ctx.moveTo(rx + 12, ry);
        ctx.lineTo(rx + 22, ry);
        ctx.moveTo(rx, ry - 22);
        ctx.lineTo(rx, ry - 12);
        ctx.stroke();

        // Reticle center dot
        ctx.fillStyle = '#00f7ff';
        ctx.beginPath();
        ctx.arc(rx, ry, 2, 0, Math.PI * 2);
        ctx.fill();

        // 2. Ranger Pitch Ladder / Attitude Horizon
        const pitchAngle = this.ship.rotation || 0;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(pitchAngle * 0.4);

        ctx.strokeStyle = 'rgba(0, 247, 255, 0.22)';
        ctx.lineWidth = 1.2;

        const barOffsets = [-40, 0, 40];
        for (const bo of barOffsets) {
            const barW = bo === 0 ? 80 : 45;
            ctx.beginPath();
            ctx.moveTo(-barW, bo);
            ctx.lineTo(-20, bo);
            if (bo !== 0) ctx.lineTo(-20, bo + (bo > 0 ? -6 : 6));
            ctx.moveTo(20, bo);
            ctx.lineTo(barW, bo);
            if (bo !== 0) ctx.lineTo(20, bo + (bo > 0 ? -6 : 6));
            ctx.stroke();
        }
        ctx.restore();

        // 3. Singularity Proximity Warning Vector (Interstellar Gargantua Alert)
        const horizonDist = this.ship.x - this.horizon.x;
        if (horizonDist < 750) {
            const urgency = Math.min(1, Math.max(0, 1 - (horizonDist / 750)));
            ctx.fillStyle = `rgba(239, 68, 68, ${0.45 + urgency * 0.55})`;
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`CRITICAL HORIZON VECTOR: ${Math.floor(horizonDist / 10)} AU`, 28, h - 36);
        }

        ctx.restore();
    }
}
