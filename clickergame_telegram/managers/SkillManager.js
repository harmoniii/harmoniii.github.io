import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { dataLoader } from '../utils/DataLoader.js';

export const SKILL_CATEGORIES = {
    clicking: 'Clicking Skills',
    combo: 'Combo Skills',
    resources: 'Resource Skills',
    effects: 'Effect Skills',
    special: 'Special Skills',
    energy: 'Energy Skills'
};

export class SkillManager extends CleanupMixin {
    constructor(gameState) {
        super();
        this.gameState = gameState;
        this.generationIntervals = new Map();
        this.autoClickerInterval = null;
        this.skillDefs = [];
        this.skillCategories = {};
        this.isDataLoaded = false;
        this.initializeSkills();
    }

    async initializeSkills() {
        try {
            await this.loadSkillData();
            this.setupGameStateSkills();
            this.validateSkillPoints();
            this.startGeneration();
            console.log(`✅ SkillManager: Loaded ${this.skillDefs.length} skill definitions`);
        } catch (error) {
            console.error('❌ SkillManager initialization failed:', error);
            this.setupFallbackSkills();
        }
    }

    async loadSkillData() {
        try {
            const data = await dataLoader.loadSkillsData();
            if (dataLoader.validateSkillsData(data)) {
                this.skillDefs = data.skills;
                this.skillCategories = data.categories;
                this.isDataLoaded = true;
                console.log('✅ Skill data loaded and validated');
            } else {
                throw new Error('Skill data validation failed');
            }
        } catch (error) {
            console.error('❌ Failed to load skill data:', error);
            throw error;
        }
    }

    setupFallbackSkills() {
        console.warn('⚠️ Using fallback skill definitions');
        this.skillDefs = [
            {
                id: 'goldMultiplier',
                name: 'Golden Touch',
                icon: '💰',
                description: 'Increase gold gain from clicks',
                category: 'clicking',
                maxLevel: 20,
                baseCost: 1,
                costMultiplier: 1.2,
                effect: {
                    type: 'multiplier',
                    target: 'gold',
                    value: 0.05,
                    diminishing: true,
                    diminishingFactor: 0.8
                }
            }
        ];
        this.skillCategories = { clicking: 'Clicking Skills' };
        this.isDataLoaded = true;
        this.setupGameStateSkills();
        this.startGeneration();
    }

    setupGameStateSkills() {
        if (!this.gameState.skills) {
            this.gameState.skills = {};
        }

        this.skillDefs.forEach(def => {
            if (!this.gameState.skills[def.id]) {
                this.gameState.skills[def.id] = { level: 0 };
            }
        });

        this.validateSkillPoints();

        if (!this.gameState.skillStates) {
            this.gameState.skillStates = {
                missProtectionCharges: 0,
                autoClickerActive: false,
                autoClickerPendingStart: false
            };
        }

        if (!this.gameState.skillStates.comboShieldCharges) {
            this.gameState.skillStates.comboShieldCharges = 0;
        }
    }

    getComboShieldCharges() {
        return this.gameState.skillStates.comboShieldCharges || 0;
    }

    useComboShieldCharge() {
        if (this.gameState.skillStates.comboShieldCharges > 0) {
            this.gameState.skillStates.comboShieldCharges--;
            return true;
        }
        return false;
    }

    resetComboShield() {
        const comboShieldLevel = this.getSkillLevel('comboShield');
        this.gameState.skillStates.comboShieldCharges = comboShieldLevel;
    }

    validateSkillPoints() {
        if (this.gameState.skillPoints === undefined ||
            this.gameState.skillPoints === null) {
            this.gameState.skillPoints = 0;
        } else if (typeof this.gameState.skillPoints !== 'number' ||
                   isNaN(this.gameState.skillPoints)) {
            this.gameState.skillPoints = 0;
        } else if (!Number.isInteger(this.gameState.skillPoints)) {
            this.gameState.skillPoints = Math.floor(this.gameState.skillPoints);
        } else if (this.gameState.skillPoints < 0) {
            this.gameState.skillPoints = 0;
        } else if (this.gameState.skillPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
            this.gameState.skillPoints = GAME_CONSTANTS.MAX_SKILL_POINTS;
        }
    }

    getSkillDefinition(skillId) {
        return this.skillDefs.find(def => def.id === skillId);
    }

    canAfford(skillId) {
        const def = this.getSkillDefinition(skillId);
        if (!def) return false;
        
        const skill = this.gameState.skills[skillId];
        if (skill.level >= def.maxLevel) return false;
        
        const cost = this.calculateCost(def, skill.level);
        return this.gameState.skillPoints >= cost;
    }

    calculateCost(def, currentLevel) {
        return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
    }

    buySkill(skillId) {
        const def = this.getSkillDefinition(skillId);
        if (!def) return false;
        
        const skill = this.gameState.skills[skillId];
        if (skill.level >= def.maxLevel) return false;
        
        const cost = this.calculateCost(def, skill.level);
        if (this.gameState.skillPoints < cost) return false;

        this.gameState.skillPoints = Math.max(0, this.gameState.skillPoints - cost);
        this.validateSkillPoints();
        skill.level++;

        this.applySkillEffect(skillId, def);

        eventBus.emit(GameEvents.SKILL_BOUGHT, {
            skillId,
            level: skill.level,
            name: def.name
        });
        eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);

        return true;
    }

    applySkillEffect(skillId, def) {
        const level = this.gameState.skills[skillId].level;
        
        switch (def.effect.type) {
            case 'charges':
                if (skillId === 'comboProtection') {
                    this.gameState.skillStates.missProtectionCharges += def.effect.value;
                } else if (skillId === 'comboShield') {
                    this.gameState.skillStates.comboShieldCharges += def.effect.value;
                }
                break;
            case 'automation':
                if (skillId === 'autoClicker') {
                    this.startAutoClicker(level);
                }
                break;
        }
    }

    startGeneration() {
        const autoClickerLevel = this.getSkillLevel('autoClicker');
        if (autoClickerLevel > 0) {
            if (!this.isRaidInProgress()) {
                this.startAutoClicker(autoClickerLevel);
            } else {
                console.log('🤖 Auto clicker start delayed: raid in progress');
                this.gameState.skillStates.autoClickerPendingStart = true;
            }
        }
    }

    startAutoClicker(level) {
        if (this.isRaidInProgress()) {
            console.log('🤖 Auto clicker start blocked: raid in progress');
            this.gameState.skillStates.autoClickerPendingStart = true;
            return;
        }

        this.stopAutoClicker();
        this.gameState.skillStates.autoClickerActive = true;
        this.gameState.skillStates.autoClickerPendingStart = false;

        const baseInterval = GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL;
        const intervalMs = Math.max(
            GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL,
            Math.floor(baseInterval / level)
        );

        this.autoClickerInterval = this.createInterval(() => {
            this.performAutoClick();
        }, intervalMs, 'auto-clicker');

        console.log(`🤖 Auto clicker started: level ${level}, interval ${intervalMs}ms`);
    }

    isRaidInProgress() {
        return this.gameState.raidManager?.isRaidInProgress || false;
    }

    performAutoClick() {
        if (!this.isActive()) return;
        
        if (this.isRaidInProgress()) {
            console.log('🤖 Auto clicker blocked: raid in progress');
            return;
        }

        try {
            const gridManager = this.gameState.gridManager;
            if (!gridManager || !gridManager.isManagerReady()) {
                console.log('GridManager not ready for auto-click');
                return;
            }

            const targetCell = gridManager.getTargetCell();
            if (typeof targetCell !== 'number' || targetCell < 0) {
                console.log('Invalid target cell for auto-click');
                return;
            }

            const gridSize = 3;
            const cellSize = 400 / gridSize;
            const row = Math.floor(targetCell / gridSize);
            const col = targetCell % gridSize;
            
            const centerX = col * cellSize + cellSize / 2;
            const centerY = row * cellSize + cellSize / 2;
            
            const offsetX = (Math.random() - 0.5) * cellSize * 0.3;
            const offsetY = (Math.random() - 0.5) * cellSize * 0.3;
            
            const clickX = centerX + offsetX;
            const clickY = centerY + offsetY;

            console.log(`🤖 Auto-click: cell ${targetCell} at (${clickX.toFixed(1)}, ${clickY.toFixed(1)})`);

            eventBus.emit(GameEvents.CLICK, {
                x: clickX,
                y: clickY,
                canvasWidth: 400,
                canvasHeight: 400
            });
        } catch (error) {
            console.error('Auto clicker error:', error);
        }
    }

    stopAutoClickerForRaid() {
        if (this.autoClickerInterval) {
            console.log('🤖 Stopping auto clicker for raid');
            this.cleanupManager.clearInterval(this.autoClickerInterval);
            this.autoClickerInterval = null;
            this.gameState.skillStates.autoClickerActive = false;
            this.gameState.skillStates.autoClickerPendingStart = true;
        }
    }

    restoreAutoClickerAfterRaid() {
        if (this.gameState.skillStates.autoClickerPendingStart) {
            const level = this.getSkillLevel('autoClicker');
            if (level > 0) {
                console.log('🤖 Restoring auto clicker after raid');
                this.startAutoClicker(level);
            }
            this.gameState.skillStates.autoClickerPendingStart = false;
        }
    }

    stopAutoClicker() {
        if (this.autoClickerInterval) {
            this.cleanupManager.clearInterval(this.autoClickerInterval);
            this.autoClickerInterval = null;
        }
        this.gameState.skillStates.autoClickerActive = false;
    }

    getSkillLevel(skillId) {
        const skill = this.gameState.skills[skillId];
        return skill ? skill.level : 0;
    }

    getSkillBonus(type, target = null) {
        let bonus = 0;
        
        this.skillDefs.forEach(def => {
            const level = this.getSkillLevel(def.id);
            if (level > 0 && def.effect.type === type &&
                (target === null || def.effect.target === target)) {
                
                let skillBonus = 0;
                if (def.effect.diminishing && GAME_CONSTANTS.SKILL_DIMINISHING_RETURNS) {
                    const factor = def.effect.diminishingFactor || 0.8;
                    for (let i = 1; i <= level; i++) {
                        skillBonus += def.effect.value * Math.pow(factor, i - 1);
                    }
                } else {
                    skillBonus = def.effect.value * level;
                }
                
                if (def.effect.cap) {
                    skillBonus = Math.min(skillBonus, def.effect.cap);
                }
                
                bonus += skillBonus;
            }
        });
        
        return bonus;
    }

    canUseMissProtection() {
        return this.gameState.skillStates.missProtectionCharges > 0;
    }

    useMissProtection() {
        if (this.gameState.skillStates.missProtectionCharges > 0) {
            this.gameState.skillStates.missProtectionCharges--;
            return true;
        }
        return false;
    }

    getSkillInfo(skillId) {
        const def = this.getSkillDefinition(skillId);
        const skill = this.gameState.skills[skillId];
        if (!def || !skill) return null;

        const nextCost = skill.level < def.maxLevel ?
            this.calculateCost(def, skill.level) : null;

        return {
            ...def,
            currentLevel: skill.level,
            nextCost,
            canAfford: skill.level < def.maxLevel ? this.canAfford(skillId) : false,
            isMaxLevel: skill.level >= def.maxLevel,
            currentEffect: def.effect.value * skill.level,
            effectDescription: this.getEffectDescription(def.effect, skill.level)
        };
    }

    getEffectDescription(effect, level) {
        const totalValue = effect.value * level;
        
        switch (effect.type) {
            case 'multiplier':
                return `+${(totalValue * 100).toFixed(1)}% ${effect.target}`;
            case 'chance':
                return `${(totalValue * 100).toFixed(1)}% chance`;
            case 'duration':
                return `+${totalValue}ms duration`;
            case 'reduction':
                return `-${(totalValue * 100).toFixed(1)}% ${effect.target}`;
            case 'charges':
                return `${totalValue} charges`;
            case 'automation':
                return `Level ${level} automation`;
            case 'bonus':
                return `+${totalValue} ${effect.target}`;
            default:
                return `Level ${level} effect`;
        }
    }

    getSkillsByCategory() {
        const categories = {};
        
        Object.keys(this.skillCategories).forEach(category => {
            categories[category] = this.skillDefs
                .filter(def => def.category === category)
                .map(def => this.getSkillInfo(def.id))
                .filter(Boolean);
        });
        
        return categories;
    }

    addSkillPoints(amount) {
        if (!this.isActive()) return;
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) return;

        const currentPoints = this.gameState.skillPoints || 0;
        const newPoints = currentPoints + Math.floor(amount);

        if (newPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
            this.gameState.skillPoints = GAME_CONSTANTS.MAX_SKILL_POINTS;
        } else {
            this.gameState.skillPoints = Math.floor(newPoints);
        }

        this.validateSkillPoints();
        eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
    }

    getAutoClickerStats() {
        const level = this.getSkillLevel('autoClicker');
        const isRaidBlocking = this.isRaidInProgress();
        const isPending = this.gameState.skillStates.autoClickerPendingStart || false;

        return {
            level: level,
            active: this.gameState.skillStates.autoClickerActive && !isRaidBlocking,
            blocked: isRaidBlocking,
            pending: isPending,
            interval: this.autoClickerInterval ?
                Math.max(GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL,
                         Math.floor(GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL / level)) : 0,
            status: isRaidBlocking ?
                (isPending ? 'Paused for raid (will resume)' : 'Blocked by raid') :
                (this.gameState.skillStates.autoClickerActive ? 'Active' : 'Inactive')
        };
    }

    getSkillStatistics() {
        const stats = {
            totalSkillPoints: this.gameState.skillPoints,
            learnedSkills: 0,
            totalSkillLevels: 0,
            maxLevelSkills: 0,
            autoClickerActive: this.gameState.skillStates.autoClickerActive,
            missProtectionCharges: this.gameState.skillStates.missProtectionCharges
        };

        this.skillDefs.forEach(def => {
            const skill = this.gameState.skills[def.id];
            if (skill && skill.level > 0) {
                stats.learnedSkills++;
                stats.totalSkillLevels += skill.level;
                if (skill.level >= def.maxLevel) {
                    stats.maxLevelSkills++;
                }
            }
        });

        return stats;
    }

    stopAllGeneration() {
        this.generationIntervals.forEach((intervalId, skillId) => {
            this.cleanupManager.clearInterval(intervalId);
        });
        this.generationIntervals.clear();
        this.stopAutoClicker();
    }

    reloadAutoClicker() {
        const level = this.getSkillLevel('autoClicker');
        if (level > 0) {
            this.stopAutoClicker();
            this.createTimeout(() => {
                if (!this.isRaidInProgress()) {
                    this.startAutoClicker(level);
                } else {
                    console.log('🤖 Auto clicker reload delayed: raid in progress');
                    this.gameState.skillStates.autoClickerPendingStart = true;
                }
            }, 100);
        }
    }

    getDebugInfo() {
        return {
            isDataLoaded: this.isDataLoaded,
            skillDefsCount: this.skillDefs.length,
            categoriesCount: Object.keys(this.skillCategories).length,
            autoClickerActive: this.gameState.skillStates.autoClickerActive,
            autoClickerLevel: this.getSkillLevel('autoClicker'),
            gameStateSkillsCount: Object.keys(this.gameState.skills || {}).length,
            skillPoints: this.gameState.skillPoints
        };
    }

    // Method to reload skill data (useful for hot-reloading during development)
    async reloadSkillData() {
        try {
            console.log('🔄 Reloading skill data...');
            dataLoader.clearCache();
            await this.loadSkillData();
            this.validateSkillPoints();
            console.log('✅ Skill data reloaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to reload skill data:', error);
            return false;
        }
    }

    destroy() {
        this.stopAllGeneration();
        super.destroy();
    }
}

// Export for fallback compatibility
export const SKILL_DEFS = [];