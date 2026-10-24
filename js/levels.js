/**
 * @file levels.js
 * Comprehensive 10-Level Sci-Fi Expedition Campaign System (Vanilla JS Mirror)
 */

const CAMPAIGN_LEVELS = [
    {
        id: 1,
        title: "SOL SYSTEM DEPARTURE",
        subtitle: "LUNAR GRAVITATIONAL ASSIST",
        targetSystem: "Sol / Earth-Moon Orbit",
        briefing: "Initiate departure from Earth orbit. Establish orbital capture around the Moon to perform a gravity assist slingshot into the outer solar corridor.",
        targetDistance: 1600,
        requiredSpeed: 420,
        requiredPerfectSlingshots: 1,
        asteroidDensity: 0.2,
        starTypes: ['hypergiant', 'redgiant'],
        primaryPlanetId: 'earth',
        targetPlanetId: 'moon',
        starTimes: { threeStar: 20, twoStar: 35 },
        theme: {
            nebulaHue: 205, // Sol blue
            ambientColor: 'rgba(0, 247, 255, 0.08)',
            lensingIntensity: 0.1
        }
    },
    {
        id: 2,
        title: "THE RED SANDS OF ARES",
        subtitle: "MARTIAN DEBRIS AEROBRAKE",
        targetSystem: "Mars / Phobos-Deimos Belt",
        briefing: "Traverse the Martian orbital plain. Navigate through the Phobos asteroid fragmentation field and achieve orbital touchdown on Mars.",
        targetDistance: 2200,
        requiredSpeed: 460,
        requiredPerfectSlingshots: 2,
        asteroidDensity: 0.5,
        starTypes: ['redgiant', 'whitedwarf'],
        primaryPlanetId: 'mars',
        targetPlanetId: 'mars',
        starTimes: { threeStar: 28, twoStar: 45 },
        theme: {
            nebulaHue: 12, // Mars rust red
            ambientColor: 'rgba(239, 68, 68, 0.09)',
            lensingIntensity: 0.15
        }
    },
    {
        id: 3,
        title: "JOVIAN RADIATION BELT",
        subtitle: "MASSIVE GAS GIANT SLINGSHOT",
        targetSystem: "Jupiter / Galilean Corridor",
        briefing: "Engage the colossal gravitational well of Jupiter. The intense radiation corridor demands two precision slingshots to slingshot past Europa.",
        targetDistance: 2800,
        requiredSpeed: 520,
        requiredPerfectSlingshots: 2,
        asteroidDensity: 0.6,
        starTypes: ['hypergiant', 'binary'],
        primaryPlanetId: 'jupiter',
        targetPlanetId: 'jupiter',
        starTimes: { threeStar: 35, twoStar: 55 },
        theme: {
            nebulaHue: 35, // Jovian amber-gold
            ambientColor: 'rgba(245, 158, 11, 0.1)',
            lensingIntensity: 0.25
        }
    },
    {
        id: 4,
        title: "RINGS OF CHRONOS",
        subtitle: "CASSINI GAP INFILTRATION",
        targetSystem: "Saturnian Ring Plane",
        briefing: "Thread the needle through the dense ice asteroids of Saturn's rings. Maintain high attitude control and rendezvous with Titan's dense atmosphere.",
        targetDistance: 3400,
        requiredSpeed: 550,
        requiredPerfectSlingshots: 2,
        asteroidDensity: 0.9,
        starTypes: ['whitedwarf', 'pulsar'],
        primaryPlanetId: 'saturn',
        targetPlanetId: 'saturn',
        starTimes: { threeStar: 40, twoStar: 65 },
        theme: {
            nebulaHue: 48, // Saturn golden ice
            ambientColor: 'rgba(251, 191, 36, 0.1)',
            lensingIntensity: 0.2
        }
    },
    {
        id: 5,
        title: "KUIPER BELT OUTPOST",
        subtitle: "PLUTO-CHARON BINARY DANCE",
        targetSystem: "Kuiper Belt Frontier",
        briefing: "Enter the freezing twilight at the fringe of the solar system. Execute a binary slingshot between Pluto and its synchronous moon Charon.",
        targetDistance: 4000,
        requiredSpeed: 580,
        requiredPerfectSlingshots: 3,
        asteroidDensity: 0.4,
        starTypes: ['binary', 'whitedwarf'],
        primaryPlanetId: 'pluto',
        targetPlanetId: 'pluto',
        starTimes: { threeStar: 48, twoStar: 75 },
        theme: {
            nebulaHue: 240, // Deep freezing indigo
            ambientColor: 'rgba(99, 102, 241, 0.1)',
            lensingIntensity: 0.2
        }
    },
    {
        id: 6,
        title: "SOLAR FLARE STORM",
        subtitle: "PROXIMA CENTAURI APPROACH",
        targetSystem: "Alpha Centauri Trinary",
        briefing: "Arrival at the nearest star system. Proxima Centauri is erupting with super-flares. Deploy Quantum Phase Shields to survive extreme stellar flares.",
        targetDistance: 4600,
        requiredSpeed: 620,
        requiredPerfectSlingshots: 3,
        asteroidDensity: 0.5,
        starTypes: ['redgiant', 'supernova'],
        primaryPlanetId: 'proxima-b',
        targetPlanetId: 'proxima-b',
        starTimes: { threeStar: 55, twoStar: 85 },
        theme: {
            nebulaHue: 345, // Blazing crimson
            ambientColor: 'rgba(244, 63, 94, 0.12)',
            lensingIntensity: 0.3
        }
    },
    {
        id: 7,
        title: "OORT CLOUD ABYSS",
        subtitle: "DARK MATTER ROGUE SECTOR",
        targetSystem: "Deep Interstellar Void",
        briefing: "Deep void navigation between star clusters. Zero natural starlight. Rely on scanner radar and long-distance probes to navigate dark interstellar rogues.",
        targetDistance: 5200,
        requiredSpeed: 660,
        requiredPerfectSlingshots: 3,
        asteroidDensity: 0.7,
        starTypes: ['whitedwarf', 'pulsar'],
        primaryPlanetId: 'kepler-452b',
        targetPlanetId: 'kepler-452b',
        starTimes: { threeStar: 60, twoStar: 95 },
        theme: {
            nebulaHue: 270, // Dark violet void
            ambientColor: 'rgba(168, 85, 247, 0.08)',
            lensingIntensity: 0.35
        }
    },
    {
        id: 8,
        title: "GARGANTUA SINGULARITY",
        subtitle: "RELATIVISTIC TIME DILATION",
        targetSystem: "Gargantua Supermassive Black Hole",
        briefing: "Miller's Planet orbit. 1 hour on this trajectory equals 7 years on Earth. Extreme gravitational lensing bends space. Escape before tidal forces capture the ship.",
        targetDistance: 5800,
        requiredSpeed: 700,
        requiredPerfectSlingshots: 4,
        asteroidDensity: 0.6,
        starTypes: ['supernova', 'binary'],
        primaryPlanetId: 'wasp-76b',
        targetPlanetId: 'wasp-76b',
        starTimes: { threeStar: 65, twoStar: 105 },
        theme: {
            nebulaHue: 30, // Golden accretion disk
            ambientColor: 'rgba(251, 146, 60, 0.15)',
            lensingIntensity: 0.85
        }
    },
    {
        id: 9,
        title: "EINSTEIN-ROSEN BRIDGE",
        subtitle: "EXOTIC HYPERSPACE NEXUS",
        targetSystem: "Folded Spacetime Sector",
        briefing: "Wormhole nexus discovered. Chain multiple hyperspace wormhole transitions across folded space to cross three cosmic sectors simultaneously.",
        targetDistance: 6500,
        requiredSpeed: 750,
        requiredPerfectSlingshots: 4,
        asteroidDensity: 0.5,
        starTypes: ['pulsar', 'binary'],
        primaryPlanetId: 'hd-189733b',
        targetPlanetId: 'hd-189733b',
        starTimes: { threeStar: 70, twoStar: 115 },
        theme: {
            nebulaHue: 185, // Quantum cyan & magenta
            ambientColor: 'rgba(6, 182, 212, 0.14)',
            lensingIntensity: 0.65
        }
    },
    {
        id: 10,
        title: "EVENT HORIZON: FINAL ODYSSEY",
        subtitle: "THE INFINITE SINGULARITY ESCAPE",
        targetSystem: "Cosmic Event Horizon Core",
        briefing: "The ultimate trial. The universe's primary Event Horizon is collapsing. Thread dual neutron pulsars at relativistic velocity > 0.85c to transcend into infinity.",
        targetDistance: 7500,
        requiredSpeed: 820,
        requiredPerfectSlingshots: 5,
        asteroidDensity: 0.8,
        starTypes: ['pulsar', 'supernova', 'binary'],
        primaryPlanetId: '55-cancri-e',
        targetPlanetId: '55-cancri-e',
        starTimes: { threeStar: 80, twoStar: 130 },
        theme: {
            nebulaHue: 285, // Transcendent cosmic violet/white
            ambientColor: 'rgba(192, 132, 252, 0.18)',
            lensingIntensity: 1.0
        }
    }
];

class CampaignManager {
    constructor() {
        this.unlockedLevel = 1;
        this.levelStars = {}; // { levelId: stars (1-3) }
        this.levelHighScores = {}; // { levelId: score }
        this.currentLevel = null;
        this.isCampaignMode = false;
        this.loadProgress();
    }

    loadProgress() {
        try {
            if (typeof localStorage !== 'undefined') {
                const storedUnlocked = localStorage.getItem('slingshot_campaign_unlocked');
                if (storedUnlocked) this.unlockedLevel = Math.max(1, parseInt(storedUnlocked, 10) || 1);

                const storedStars = localStorage.getItem('slingshot_campaign_stars');
                if (storedStars) this.levelStars = JSON.parse(storedStars) || {};

                const storedScores = localStorage.getItem('slingshot_campaign_scores');
                if (storedScores) this.levelHighScores = JSON.parse(storedScores) || {};
            }
        } catch (e) {
            console.warn('Failed to load campaign progress, starting fresh:', e);
        }
    }

    saveProgress() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('slingshot_campaign_unlocked', this.unlockedLevel.toString());
                localStorage.setItem('slingshot_campaign_stars', JSON.stringify(this.levelStars));
                localStorage.setItem('slingshot_campaign_scores', JSON.stringify(this.levelHighScores));
            }
        } catch (_) {}
    }

    getLevel(levelId) {
        return CAMPAIGN_LEVELS.find(l => l.id === levelId) || CAMPAIGN_LEVELS[0];
    }

    startLevel(levelId) {
        const lvl = this.getLevel(levelId);
        this.currentLevel = lvl;
        this.isCampaignMode = true;
        return lvl;
    }

    startEndlessMode() {
        this.currentLevel = null;
        this.isCampaignMode = false;
    }

    checkLevelCompletion(game, elapsedTime) {
        if (!this.isCampaignMode || !this.currentLevel) return null;

        const lvl = this.currentLevel;
        const reachedDist = game.ship.x >= lvl.targetDistance;
        const reachedSlingshots = game.perfectSlingshots >= lvl.requiredPerfectSlingshots;
        const reachedSpeed = game.maxSpeed >= lvl.requiredSpeed;

        if (reachedDist && reachedSlingshots) {
            let stars = 1;
            if (elapsedTime <= lvl.starTimes.twoStar && game.ship.shield > 40) {
                stars = 2;
            }
            if (elapsedTime <= lvl.starTimes.threeStar && game.ship.shield >= 80) {
                stars = 3;
            }

            const prevStars = this.levelStars[lvl.id] || 0;
            if (stars > prevStars) {
                this.levelStars[lvl.id] = stars;
            }

            const prevScore = this.levelHighScores[lvl.id] || 0;
            if (game.score > prevScore) {
                this.levelHighScores[lvl.id] = game.score;
            }

            if (lvl.id >= this.unlockedLevel && lvl.id < CAMPAIGN_LEVELS.length) {
                this.unlockedLevel = lvl.id + 1;
            }

            this.saveProgress();

            return {
                completed: true,
                stars,
                level: lvl,
                time: elapsedTime,
                score: game.score,
                isFinalLevel: lvl.id === 10
            };
        }

        return null;
    }
}

if (typeof window !== 'undefined') {
    window.CAMPAIGN_LEVELS = CAMPAIGN_LEVELS;
    window.CampaignManager = CampaignManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CAMPAIGN_LEVELS, CampaignManager };
}
