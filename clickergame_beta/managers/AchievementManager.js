// managers/AchievementManager.js - Упрощенная система достижений
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export const ACHIEVEMENT_DEFS = [
    // Достижения за клики
    {
        id: 'clicks_100',
        name: '🖱️ First Clicks',
        description: 'Click 100 times',
        category: 'clicks',
        target: 100,
        reward: { skillPoints: 2 }
    },
    {
        id: 'clicks_1000',
        name: '🖱️ Click Champion',
        description: 'Click 1000 times',
        category: 'clicks',
        target: 1000,
        reward: { skillPoints: 10 }
    },

    // Достижения за комбо
    {
        id: 'combo_10',
        name: '🔥 Combo Starter',
        description: 'Reach a combo of 10',
        category: 'combo',
        target: 10,
        reward: { skillPoints: 1 }
    },
    {
        id: 'combo_50',
        name: '🔥 Combo Master',
        description: 'Reach a combo of 50',
        category: 'combo',
        target: 50,
        reward: { skillPoints: 8 }
    },

    // Достижения за ресурсы
    {
        id: 'total_resources_1000',
        name: '💰 Resource Collector',
        description: 'Collect 1000 total resources',
        category: 'total_resources',
        target: 1000,
        reward: { skillPoints: 5 }
    },
    {
        id: 'total_resources_10000',
        name: '💰 Resource Tycoon',
        description: 'Collect 10000 total resources',
        category: 'total_resources',
        target: 10000,
        reward: { skillPoints: 35 }
    },

    // Достижения за энергию
    {
        id: 'energy_zones_10',
        name: '⚡ Energy Seeker',
        description: 'Hit 10 energy zones',
        category: 'energy_zones',
        target: 10,
        reward: { skillPoints: 2 }
    },
    {
        id: 'energy_zones_50',
        name: '⚡ Energy Master',
        description: 'Hit 50 energy zones',
        category: 'energy_zones',
        target: 50,
        reward: { skillPoints: 5 }
    }
];

export class AchievementManager extends CleanupMixin {
    constructor(gameState) {
        super();
        
        this.gameState = gameState;
        this.statistics = {
            totalClicks: 0,
            maxCombo: 0,
            resourcesCollected: {},
            totalResourcesCollected: 0,
            energyZonesHit: 0
        };
        
        this.initializeAchievements();
        this.bindEvents();
    }

    initializeAchievements() {
        if (!this.gameState.achievements) {
            this.gameState.achievements = {
                completed: new Set(),
                statistics: { ...this.statistics }
            };
        }
        
        if (this.gameState.achievements.statistics) {
            this.statistics = { ...this.gameState.achievements.statistics };
            if (this.statistics.energyZonesHit === undefined) {
                this.statistics.energyZonesHit = 0;
            }
        }
        
        if (Array.isArray(this.gameState.achievements.completed)) {
            this.gameState.achievements.completed = new Set(this.gameState.achievements.completed);
        }
    }

    bindEvents() {
        eventBus.subscribe(GameEvents.CLICK, () => {
            this.statistics.totalClicks++;
            this.checkAchievements('clicks');
        });

        eventBus.subscribe(GameEvents.COMBO_CHANGED, (data) => {
            const comboCount = data.count || 0;
            if (comboCount > this.statistics.maxCombo) {
                this.statistics.maxCombo = comboCount;
                this.checkAchievements('combo');
            }
        });

        eventBus.subscribe(GameEvents.RESOURCE_GAINED, (data) => {
            if (data.resource && data.amount) {
                this.addResourceStatistic(data.resource, data.amount);
                this.checkAchievements('total_resources');
            }
        });

        eventBus.subscribe(GameEvents.ENERGY_ZONE_HIT, (data) => {
            if (data.zoneType === 'energy') {
                this.statistics.energyZonesHit++;
                this.checkAchievements('energy_zones');
            }
        });
    }

    addResourceStatistic(resourceName, amount) {
        if (!this.statistics.resourcesCollected[resourceName]) {
            this.statistics.resourcesCollected[resourceName] = 0;
        }
        
        this.statistics.resourcesCollected[resourceName] += amount;
        this.statistics.totalResourcesCollected += amount;
    }

    checkAchievements(category) {
        const relevantAchievements = ACHIEVEMENT_DEFS.filter(achievement => 
            achievement.category === category && 
            !this.gameState.achievements.completed.has(achievement.id)
        );

        relevantAchievements.forEach(achievement => {
            const currentValue = this.getCurrentValue(achievement.category);
            
            if (currentValue >= achievement.target) {
                this.completeAchievement(achievement);
            }
        });

        this.saveStatistics();
    }

    getCurrentValue(category) {
        switch (category) {
            case 'clicks':
                return this.statistics.totalClicks;
            case 'combo':
                return this.statistics.maxCombo;
            case 'total_resources':
                return this.statistics.totalResourcesCollected;
            case 'energy_zones':
                return this.statistics.energyZonesHit;
            default:
                return this.statistics.resourcesCollected[category] || 0;
        }
    }

    completeAchievement(achievement) {
        this.gameState.achievements.completed.add(achievement.id);
        this.giveRewards(achievement.reward);
        
        eventBus.emit(GameEvents.ACHIEVEMENT_UNLOCKED, {
            achievement: achievement,
            reward: achievement.reward
        });
        
        eventBus.emit(GameEvents.SKILL_NOTIFICATION, {
            title: `🏆 Achievement Unlocked!`,
            description: `${achievement.name}: ${achievement.description}\nReward: ${this.formatReward(achievement.reward)}`
        });
    }

    giveRewards(reward) {
        if (reward.skillPoints && this.gameState.skillManager) {
            this.gameState.skillManager.addSkillPoints(reward.skillPoints);
            eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
        }
        
        if (reward.resources) {
            Object.entries(reward.resources).forEach(([resource, amount]) => {
                this.gameState.addResource(resource, amount);
            });
            eventBus.emit(GameEvents.RESOURCE_CHANGED);
        }
    }

    formatReward(reward) {
        const parts = [];
        
        if (reward.skillPoints) {
            parts.push(`+${reward.skillPoints} ✨ Skill Points`);
        }
        
        if (reward.resources) {
            Object.entries(reward.resources).forEach(([resource, amount]) => {
                parts.push(`+${amount} ${resource}`);
            });
        }
        
        return parts.join(', ') || 'Experience';
    }

    forceCheckAllAchievements() {
        const categories = [...new Set(ACHIEVEMENT_DEFS.map(a => a.category))];
        
        categories.forEach(category => {
            this.checkAchievements(category);
        });
    }

    saveStatistics() {
        this.gameState.achievements.statistics = { ...this.statistics };
    }

    getAllAchievements() {
        return ACHIEVEMENT_DEFS.map(achievement => ({
            ...achievement,
            completed: this.gameState.achievements.completed.has(achievement.id),
            progress: this.getCurrentValue(achievement.category),
            progressPercent: Math.min(100, (this.getCurrentValue(achievement.category) / achievement.target) * 100)
        }));
    }

    getCompletedAchievements() {
        return this.getAllAchievements().filter(achievement => achievement.completed);
    }

    getAchievementStats() {
        const allAchievements = this.getAllAchievements();
        const completed = allAchievements.filter(a => a.completed);
        
        return {
            total: allAchievements.length,
            completed: completed.length,
            completionPercent: (completed.length / allAchievements.length) * 100,
            totalSkillPointsEarned: completed.reduce((sum, a) => sum + (a.reward.skillPoints || 0), 0),
            statistics: { ...this.statistics }
        };
    }

    getSaveData() {
        return {
            completed: Array.from(this.gameState.achievements.completed),
            statistics: { ...this.statistics }
        };
    }

    loadSaveData(data) {
        if (data && typeof data === 'object') {
            this.gameState.achievements = {
                completed: new Set(data.completed || []),
                statistics: data.statistics || this.statistics
            };
            
            this.statistics = { ...this.gameState.achievements.statistics };
            
            if (this.statistics.energyZonesHit === undefined) {
                this.statistics.energyZonesHit = 0;
            }
            
            this.createTimeout(() => {
                this.forceCheckAllAchievements();
            }, 1000);
        }
    }

    destroy() {
        this.saveStatistics();
        super.destroy();
    }
}