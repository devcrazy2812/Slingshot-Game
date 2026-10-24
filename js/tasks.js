// Mission Directives & Objectives Engine for Slingshot: Event Horizon
// Vanilla JS Globals & ES Module export

const MISSION_TASKS = [
    {
        id: 'task_speed',
        title: 'Relativistic Velocity',
        category: 'flight',
        description: 'Reach a relativistic flight velocity of 0.80 c or higher.',
        target: 0.80,
        unit: 'c',
        reward: 500,
        icon: '⚡',
        check: (game) => {
            const currentC = (game.maxSpeed / 600);
            return {
                progress: Math.min(1.0, currentC / 0.80),
                current: currentC.toFixed(2),
                target: '0.80',
                completed: currentC >= 0.80
            };
        }
    },
    {
        id: 'task_slingshot',
        title: 'Gravitational Slingshot Ace',
        category: 'navigation',
        description: 'Execute 3 Perfect Slingshots by releasing on the golden trajectory arc.',
        target: 3,
        unit: 'launches',
        reward: 600,
        icon: '🌌',
        check: (game) => {
            return {
                progress: Math.min(1.0, game.perfectSlingshots / 3),
                current: game.perfectSlingshots,
                target: 3,
                completed: game.perfectSlingshots >= 3
            };
        }
    },
    {
        id: 'task_explore',
        title: 'First Planetary Contact',
        category: 'exploration',
        description: 'Initiate touchdown and surface exploration on any celestial planet.',
        target: 1,
        unit: 'worlds',
        reward: 800,
        icon: '🪐',
        check: (game) => {
            const count = game.discoveredPlanets ? game.discoveredPlanets.size : 0;
            return {
                progress: count >= 1 ? 1.0 : 0.0,
                current: count,
                target: 1,
                completed: count >= 1
            };
        }
    },
    {
        id: 'task_probe',
        title: 'Atmospheric Surface Survey',
        category: 'exploration',
        description: 'Deploy an automated science probe to scan an explored planet.',
        target: 1,
        unit: 'scans',
        reward: 500,
        icon: '📡',
        check: (game) => {
            const completed = !!game.probesDeployed && game.probesDeployed >= 1;
            return {
                progress: completed ? 1.0 : 0.0,
                current: completed ? 1 : 0,
                target: 1,
                completed
            };
        }
    },
    {
        id: 'task_wormhole',
        title: 'Hyperspace Fold',
        category: 'navigation',
        description: 'Navigate through a rotating cosmic wormhole to warp 1,500 Light-Years.',
        target: 1,
        unit: 'jumps',
        reward: 1000,
        icon: '🌀',
        check: (game) => {
            const completed = !!game.wormholeJumps && game.wormholeJumps >= 1;
            return {
                progress: completed ? 1.0 : 0.0,
                current: completed ? 1 : 0,
                target: 1,
                completed
            };
        }
    },
    {
        id: 'task_combo',
        title: 'Singularity Surge',
        category: 'flight',
        description: 'Build up continuous momentum to reach a 3x Combo multiplier.',
        target: 3,
        unit: 'x',
        reward: 700,
        icon: '🔥',
        check: (game) => {
            return {
                progress: Math.min(1.0, game.combo / 3),
                current: game.combo,
                target: 3,
                completed: game.combo >= 3
            };
        }
    },
    {
        id: 'task_distance',
        title: 'Interstellar Pioneer',
        category: 'flight',
        description: 'Traverse 1,500 Light-Years of displacement away from the event horizon.',
        target: 1500,
        unit: 'LY',
        reward: 800,
        icon: '🚀',
        check: (game) => {
            const ly = Math.floor(game.ship.x / 100);
            return {
                progress: Math.min(1.0, ly / 1500),
                current: ly,
                target: 1500,
                completed: ly >= 1500
            };
        }
    },
    {
        id: 'task_exoplanet',
        title: 'Deep Space Cartographer',
        category: 'exploration',
        description: 'Touch down on an exotic alien Exoplanet outside our Solar System.',
        target: 1,
        unit: 'exoplanets',
        reward: 1200,
        icon: '✨',
        check: (game) => {
            const completed = !!game.exoplanetExplored;
            return {
                progress: completed ? 1.0 : 0.0,
                current: completed ? 1 : 0,
                target: 1,
                completed
            };
        }
    }
];

class TaskManager {
    constructor(game) {
        this.game = game;
        let initialTaskIds = [];
        try {
            const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('slingshot_completed_tasks') : null;
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) initialTaskIds = parsed;
            }
        } catch (e) {
            console.warn('Recovered from corrupted task storage:', e);
        }
        this.completedTaskIds = new Set(initialTaskIds);
        this.recentlyCompleted = null;
        this.notificationTimer = 0;
    }

    checkAll() {
        for (const task of MISSION_TASKS) {
            if (this.completedTaskIds.has(task.id)) continue;
            const res = task.check(this.game);
            if (res.completed) {
                this.completeTask(task);
            }
        }
    }

    completeTask(task) {
        this.completedTaskIds.add(task.id);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('slingshot_completed_tasks', JSON.stringify([...this.completedTaskIds]));
        }

        this.game.score += task.reward;
        this.recentlyCompleted = task;
        this.notificationTimer = 4.0;

        if (this.game.particles) {
            this.game.particles.emitShockwave(this.game.ship.x, this.game.ship.y, 200, '#ffd700', 0.8);
            this.game.particles.emitExplosion(this.game.ship.x, this.game.ship.y, '#ffd700', 35);
        }

        this.game.addFloatingText(`DIRECTIVE COMPLETE! +${task.reward} PTS`, this.game.ship.x, this.game.ship.y - 45, '#ffd700');
        if (typeof window !== 'undefined' && window.haptics) {
            window.haptics.directiveComplete();
        }
        if (this.game && typeof this.game.updateHangarPilotStrip === 'function') {
            this.game.updateHangarPilotStrip();
        }
        this.showBanner(task);
    }

    showBanner(task) {
        if (typeof document === 'undefined') return;
        const banner = document.getElementById('taskCompleteBanner');
        const nameEl = document.getElementById('taskBannerName');
        const rewardEl = document.getElementById('taskBannerReward');
        if (banner && nameEl && rewardEl) {
            nameEl.innerText = `${task.icon} ${task.title}`;
            rewardEl.innerText = `+${task.reward} PTS AWARDED`;
            banner.classList.remove('hidden');
            banner.classList.add('task-banner-animate');
            setTimeout(() => {
                banner.classList.add('hidden');
                banner.classList.remove('task-banner-animate');
            }, 3500);
        }
    }

    getCompletedCount() {
        return this.completedTaskIds.size;
    }

    getTotalCount() {
        return MISSION_TASKS.length;
    }

    getRank() {
        const count = this.completedTaskIds.size;
        if (count >= 8) return { title: 'EVENT HORIZON VANGUARD', badge: 'RANK V // SUPREME' };
        if (count >= 6) return { title: 'DEEP SPACE PATHFINDER', badge: 'RANK IV // MASTER' };
        if (count >= 4) return { title: 'ORBITAL COMMANDER', badge: 'RANK III // VETERAN' };
        if (count >= 2) return { title: 'COSMIC SPECIALIST', badge: 'RANK II // OPERATOR' };
        return { title: 'CADET PILOT', badge: 'RANK I // NOVICE' };
    }
}

if (typeof window !== 'undefined') {
    window.MISSION_TASKS = MISSION_TASKS;
    window.TaskManager = TaskManager;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MISSION_TASKS, TaskManager };
}
