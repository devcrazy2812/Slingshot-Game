import { describe, it, expect, beforeEach } from 'vitest';
import { CAMPAIGN_LEVELS, CampaignManager } from '../src/game/levels.js';

describe('Campaign 10-Level System', () => {
    let campaign;

    beforeEach(() => {
        if (typeof localStorage !== 'undefined') {
            localStorage.clear();
        }
        campaign = new CampaignManager();
    });

    it('defines exactly 10 distinct sci-fi expeditions', () => {
        expect(CAMPAIGN_LEVELS).toHaveLength(10);
        CAMPAIGN_LEVELS.forEach((lvl, i) => {
            expect(lvl.id).toBe(i + 1);
            expect(lvl.title).toBeDefined();
            expect(lvl.targetDistance).toBeGreaterThan(1000);
            expect(lvl.requiredPerfectSlingshots).toBeGreaterThanOrEqual(1);
        });
    });

    it('starts with Level 1 unlocked and defaults to endless mode', () => {
        expect(campaign.unlockedLevel).toBe(1);
        expect(campaign.isCampaignMode).toBe(false);
    });

    it('evaluates level completion, calculates stars, and unlocks Level 2', () => {
        const lvl = campaign.startLevel(1);
        expect(campaign.isCampaignMode).toBe(true);
        expect(lvl.id).toBe(1);

        const mockGame = {
            ship: { x: 1700, shield: 100 },
            perfectSlingshots: 2,
            maxSpeed: 450,
            score: 1200
        };

        const result = campaign.checkLevelCompletion(mockGame, 15);
        expect(result).not.toBeNull();
        expect(result.completed).toBe(true);
        expect(result.stars).toBe(3); // Under 20s and shield >= 80%
        expect(campaign.unlockedLevel).toBe(2);
        expect(campaign.levelStars[1]).toBe(3);
    });
});
