// managers/SkillManager.js - Упрощенная версия с рабочим автокликером
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export const SKILL_CATEGORIES = {
    clicking: 'Clicking Skills',
    combo: 'Combo Skills', 
    resources: 'Resource Skills',
    effects: 'Effect Skills',
    special: 'Special Skills',
    energy: 'Energy Skills'
};

export const LINEAR_SKILL_DEFS = [
  // Clicking Skills - с убывающей отдачей
  {
    id: 'goldMultiplier',
    name: 'Golden Touch',
    icon: '💰',
    description: 'Increase gold gain from clicks',
    category: 'clicking',
    maxLevel: 20,
    baseCost: 1,
    costMultiplier: 1.2, // было 1.3
    effect: { 
      type: 'multiplier', 
      target: 'gold', 
      value: 0.05, // было 0.1
      diminishing: true, // новое поле
      diminishingFactor: 0.8 // каждый уровень дает 80% от предыдущего
    }
  },
  {
    id: 'criticalHit',
    name: 'Critical Strike',
    icon: '💥',
    description: 'Chance for double damage on clicks',
    category: 'clicking',
    maxLevel: 10,
    baseCost: 2,
    costMultiplier: 1.3, // было 1.5
    effect: { 
      type: 'chance', 
      target: 'critical', 
      value: 0.03, // было 0.05
      cap: 0.25 // максимум 25% шанс крита
    }
  },
  {
    id: 'resourceBonus',
    name: 'Resource Finder',
    icon: '🔍',
    description: 'Chance to find bonus resources when clicking',
    category: 'clicking',
    maxLevel: 15,
    baseCost: 3,
    costMultiplier: 1.25, // было 1.4
    effect: { 
      type: 'chance', 
      target: 'bonus_resource', 
      value: 0.02, // было 0.03
      cap: 0.2 // максимум 20% шанс
    }
  },

  // Combo Skills - с ограничениями
  {
    id: 'comboProtection',
    name: 'Steady Hand',
    icon: '🎯',
    description: 'Protection against combo breaks',
    category: 'combo',
    maxLevel: 3, // было 5
    baseCost: 8, // было 5
    costMultiplier: 2.5, // было 2.0
    effect: { type: 'charges', target: 'miss_protection', value: 1 }
  },
  {
    id: 'comboExtension',
    name: 'Time Stretch',
    icon: '⏰',
    description: 'Extend combo timeout duration',
    category: 'combo',
    maxLevel: 8, // было 10
    baseCost: 4, // было 3
    costMultiplier: 1.4, // было 1.6
    effect: { 
      type: 'duration', 
      target: 'combo_timeout', 
      value: 800, // было 1000
      diminishing: true,
      diminishingFactor: 0.7 // сильно убывающая отдача
    }
  },
  {
    id: 'comboMultiplier',
    name: 'Combo Master',
    icon: '🔥',
    description: 'Increase effectiveness of combos',
    category: 'combo',
    maxLevel: 10, // было 15
    baseCost: 6, // было 4
    costMultiplier: 1.6, // было 1.5
    effect: { 
      type: 'multiplier', 
      target: 'combo', 
      value: 0.08, // было 0.15
      cap: 0.5 // максимум 50% бонус к комбо
    }
  },

  // Energy Skills - сбалансированные
  {
    id: 'energyEfficiency',
    name: 'Energy Efficiency',
    icon: '💡',
    description: 'Reduce energy consumption',
    category: 'energy',
    maxLevel: 3,
    baseCost: 8, // было 5
    costMultiplier: 2.5, // было 2.0
    effect: { 
      type: 'reduction', 
      target: 'energy_cost', 
      value: 0.15, // было 0.25
      cap: 0.4 // максимум 40% снижение
    }
  },
  {
    id: 'energyMastery',
    name: 'Energy Mastery',
    icon: '⚡',
    description: 'Increase energy regeneration rate',
    category: 'energy',
    maxLevel: 5,
    baseCost: 10, // было 8
    costMultiplier: 2.0, // было 1.8
    effect: { 
      type: 'multiplier', 
      target: 'energy_regen', 
      value: 0.4, // было 1.0
      diminishing: true,
      diminishingFactor: 0.75
    }
  },
  {
    id: 'powerStorage',
    name: 'Power Storage',
    icon: '🔋',
    description: 'Increase maximum energy capacity',
    category: 'energy',
    maxLevel: 4,
    baseCost: 12, // было 10
    costMultiplier: 2.0, // было 2.2
    effect: { 
      type: 'bonus', 
      target: 'max_energy', 
      value: 25, // было 50
      diminishing: true,
      diminishingFactor: 0.8
    }
  },

  // Special Skills - дорогие и ограниченные
  {
    id: 'autoClicker',
    name: 'Auto Clicker',
    icon: '🤖',
    description: 'Automatically click the target zone',
    category: 'special',
    maxLevel: 3,
    baseCost: 30, // было 20
    costMultiplier: 4.0, // было 3.0
    effect: { 
      type: 'automation', 
      target: 'clicking', 
      value: 1, 
      interval: GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL 
    }
  },
  {
    id: 'zonePreview',
    name: 'Future Sight',
    icon: '👁️',
    description: 'Preview the next target zone',
    category: 'special',
    maxLevel: 1,
    baseCost: 25, // было 15
    costMultiplier: 1.0,
    effect: { type: 'preview', target: 'zone', value: 1 }
  }
];

export class SkillManager extends CleanupMixin {
    constructor(gameState) {
        super();
        
        this.gameState = gameState;
        this.generationIntervals = new Map();
        this.autoClickerInterval = null;
        
        this.initializeSkills();
        this.startGeneration();
    }

    initializeSkills() {
        if (!this.gameState.skills) {
            this.gameState.skills = {};
        }
        
        SKILL_DEFS.forEach(def => {
            if (!this.gameState.skills[def.id]) {
                this.gameState.skills[def.id] = { level: 0 };
            }
        });
        
        this.validateSkillPoints();

        if (!this.gameState.skillStates) {
            this.gameState.skillStates = {
                missProtectionCharges: 0,
                autoClickerActive: false
            };
        }
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
        return SKILL_DEFS.find(def => def.id === skillId);
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
            this.startAutoClicker(autoClickerLevel);
        }
    }

    startAutoClicker(level) {
        this.stopAutoClicker();
        
        this.gameState.skillStates.autoClickerActive = true;
        
        const baseInterval = GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL;
        const intervalMs = Math.max(
            GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL, 
            Math.floor(baseInterval / level)
        );
        
        this.autoClickerInterval = this.createInterval(() => {
            this.performAutoClick();
        }, intervalMs, 'auto-clicker');
    }

    performAutoClick() {
        if (!this.isActive()) return;
        
        try {
            const featureManager = this.gameState.managers?.feature || 
                                 this.gameState.featureManager;
            
            if (!featureManager) return;
            
            const targetZone = this.gameState.targetZone;
            if (typeof targetZone !== 'number' || targetZone < 0) return;
            
            const zones = featureManager.zones;
            if (!zones || !Array.isArray(zones) || zones.length === 0) return;
            
            const zone = zones.find(z => z && z.index === targetZone);
            if (!zone) return;
            
            let clickAngle;
            
            if (typeof zone.getCenterAngle === 'function') {
                clickAngle = zone.getCenterAngle();
                const zoneSize = zone.getSize ? zone.getSize() : (2 * Math.PI / zones.length);
                const randomOffset = (Math.random() - 0.5) * zoneSize * 0.2;
                clickAngle += randomOffset;
            } else {
                const zoneCount = zones.length;
                const stepAngle = (2 * Math.PI) / zoneCount;
                const centerAngle = stepAngle * targetZone + (stepAngle / 2);
                const randomOffset = (Math.random() - 0.5) * stepAngle * 0.2;
                clickAngle = centerAngle + randomOffset;
            }
            
            clickAngle = this.normalizeAngle(clickAngle);
            
            eventBus.emit(GameEvents.CLICK, clickAngle);
            
        } catch (error) {
            console.error('Auto clicker error:', error);
        }
    }

    normalizeAngle(angle) {
        if (typeof angle !== 'number' || isNaN(angle)) return 0;
        
        const twoPi = 2 * Math.PI;
        let normalized = angle % twoPi;
        
        if (normalized < 0) {
            normalized += twoPi;
        }
        
        return normalized;
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
  
  const skillDefs = GAME_CONSTANTS.SKILL_DIMINISHING_RETURNS ? 
    LINEAR_SKILL_DEFS : SKILL_DEFS;
  
  skillDefs.forEach(def => {
    const level = this.getSkillLevel(def.id);
    if (level > 0 && def.effect.type === type && 
        (target === null || def.effect.target === target)) {
      
      let skillBonus = 0;
      
      if (def.effect.diminishing && GAME_CONSTANTS.SKILL_DIMINISHING_RETURNS) {
        // Убывающая отдача: каждый уровень дает меньше
        const factor = def.effect.diminishingFactor || 0.8;
        for (let i = 1; i <= level; i++) {
          skillBonus += def.effect.value * Math.pow(factor, i - 1);
        }
      } else {
        // Линейный бонус
        skillBonus = def.effect.value * level;
      }
      
      // Применяем кап если есть
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
        
        Object.keys(SKILL_CATEGORIES).forEach(category => {
            categories[category] = SKILL_DEFS
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
        return {
            active: this.gameState.skillStates.autoClickerActive,
            level: this.getSkillLevel('autoClicker'),
            interval: this.autoClickerInterval ? 
                Math.max(GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL, 
                         Math.floor(GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL / this.getSkillLevel('autoClicker'))) : 0
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

        SKILL_DEFS.forEach(def => {
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
                this.startAutoClicker(level);
            }, 100);
        }
    }

    destroy() {
        this.stopAllGeneration();
        super.destroy();
    }
}