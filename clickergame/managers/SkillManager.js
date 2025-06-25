// managers/SkillManager.js - ИСПРАВЛЕННАЯ версия с правильными вызовами clearInterval
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

// Категории навыков
export const SKILL_CATEGORIES = {
  clicking: 'Clicking Skills',
  combo: 'Combo Skills', 
  resources: 'Resource Skills',
  effects: 'Effect Skills',
  special: 'Special Skills'
};

// Определения навыков
export const SKILL_DEFS = [
  // Clicking Skills
  {
    id: 'goldMultiplier',
    name: 'Golden Touch',
    icon: '💰',
    description: 'Increases gold gain per click',
    category: 'clicking',
    maxLevel: 20,
    baseCost: 1,
    costMultiplier: 1.3,
    effect: { type: 'multiplier', target: 'gold', value: 0.1 }
  },
  {
    id: 'criticalHit',
    name: 'Critical Strike',
    icon: '💥',
    description: 'Chance for double rewards',
    category: 'clicking',
    maxLevel: 10,
    baseCost: 2,
    costMultiplier: 1.5,
    effect: { type: 'chance', target: 'critical', value: 0.05 }
  },
  {
    id: 'resourceBonus',
    name: 'Resource Finder',
    icon: '🔍',
    description: 'Chance to gain random resource on click',
    category: 'clicking',
    maxLevel: 15,
    baseCost: 3,
    costMultiplier: 1.4,
    effect: { type: 'chance', target: 'bonus_resource', value: 0.03 }
  },

  // Combo Skills
  {
    id: 'comboProtection',
    name: 'Steady Hand',
    icon: '🎯',
    description: 'Allows missing target without breaking combo',
    category: 'combo',
    maxLevel: 5,
    baseCost: 5,
    costMultiplier: 2.0,
    effect: { type: 'charges', target: 'miss_protection', value: 1 }
  },
  {
    id: 'comboExtension',
    name: 'Time Stretch',
    icon: '⏰',
    description: 'Extends combo timeout duration',
    category: 'combo',
    maxLevel: 10,
    baseCost: 3,
    costMultiplier: 1.6,
    effect: { type: 'duration', target: 'combo_timeout', value: 1000 }
  },
  {
    id: 'comboMultiplier',
    name: 'Combo Master',
    icon: '🔥',
    description: 'Increases combo effectiveness',
    category: 'combo',
    maxLevel: 15,
    baseCost: 4,
    costMultiplier: 1.5,
    effect: { type: 'multiplier', target: 'combo', value: 0.15 }
  },

  // Resource Skills
  {
    id: 'faithGeneration',
    name: 'Meditation',
    icon: '🧘',
    description: 'Slowly generates faith over time',
    category: 'resources',
    maxLevel: 8,
    baseCost: 6,
    costMultiplier: 1.8,
    effect: { type: 'generation', target: 'faith', value: 0.1, interval: 30000 }
  },
  {
    id: 'chaosReduction',
    name: 'Inner Peace',
    icon: '☮️',
    description: 'Reduces chaos accumulation',
    category: 'resources',
    maxLevel: 10,
    baseCost: 4,
    costMultiplier: 1.6,
    effect: { type: 'reduction', target: 'chaos', value: 0.1 }
  },
  {
    id: 'resourceStorage',
    name: 'Efficient Storage',
    icon: '📦',
    description: 'Prevents resource loss from explosions',
    category: 'resources',
    maxLevel: 5,
    baseCost: 8,
    costMultiplier: 2.2,
    effect: { type: 'protection', target: 'explosion', value: 0.2 }
  },

  // Effect Skills
  {
    id: 'buffDuration',
    name: 'Buff Mastery',
    icon: '✨',
    description: 'Increases buff duration',
    category: 'effects',
    maxLevel: 12,
    baseCost: 5,
    costMultiplier: 1.7,
    effect: { type: 'duration', target: 'buffs', value: 0.2 }
  },
  {
    id: 'debuffResistance',
    name: 'Resilience',
    icon: '🛡️',
    description: 'Reduces debuff duration',
    category: 'effects',
    maxLevel: 10,
    baseCost: 6,
    costMultiplier: 1.8,
    effect: { type: 'reduction', target: 'debuffs', value: 0.15 }
  },
  {
    id: 'buffChance',
    name: 'Lucky Charm',
    icon: '🍀',
    description: 'Increases chance of getting buffs',
    category: 'effects',
    maxLevel: 8,
    baseCost: 7,
    costMultiplier: 1.9,
    effect: { type: 'chance', target: 'buff', value: 0.05 }
  },

  // Special Skills
  {
    id: 'autoClicker',
    name: 'Auto Clicker',
    icon: '🤖',
    description: 'Automatically clicks zones',
    category: 'special',
    maxLevel: 3,
    baseCost: 20,
    costMultiplier: 3.0,
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
    description: 'Shows next target zone',
    category: 'special',
    maxLevel: 1,
    baseCost: 15,
    costMultiplier: 1.0,
    effect: { type: 'preview', target: 'zone', value: 1 }
  },
  {
    id: 'skillPointGen',
    name: 'Experience Boost',
    icon: '🎓',
    description: 'Generates skill points over time',
    category: 'special',
    maxLevel: 5,
    baseCost: 25,
    costMultiplier: 2.5,
    effect: { type: 'generation', target: 'skillPoints', value: 0.1, interval: 60000 }
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
    
    console.log('🎯 SkillManager initialized');
  }

  // Инициализация навыков
  initializeSkills() {
    // Создаем объект навыков если его нет
    if (!this.gameState.skills) {
      this.gameState.skills = {};
    }
    
    // Инициализируем все навыки из определений
    SKILL_DEFS.forEach(def => {
      if (!this.gameState.skills[def.id]) {
        this.gameState.skills[def.id] = { level: 0 };
      }
    });
    
    // Валидируем skill points
    this.validateSkillPoints();

    // Инициализируем состояния навыков
    if (!this.gameState.skillStates) {
      this.gameState.skillStates = {
        missProtectionCharges: 0,
        autoClickerActive: false
      };
    }
  }

  // Валидация skill points
  validateSkillPoints() {
    if (this.gameState.skillPoints === undefined || 
        this.gameState.skillPoints === null) {
      this.gameState.skillPoints = 0;
    } else if (typeof this.gameState.skillPoints !== 'number' || 
               isNaN(this.gameState.skillPoints)) {
      console.warn('Invalid skill points detected, resetting to 0');
      this.gameState.skillPoints = 0;
    } else if (!Number.isInteger(this.gameState.skillPoints)) {
      console.warn('Non-integer skill points detected, rounding down');
      this.gameState.skillPoints = Math.floor(this.gameState.skillPoints);
    } else if (this.gameState.skillPoints < 0) {
      console.warn('Negative skill points detected, resetting to 0');
      this.gameState.skillPoints = 0;
    } else if (this.gameState.skillPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
      console.warn('Skill points exceed maximum, capping');
      this.gameState.skillPoints = GAME_CONSTANTS.MAX_SKILL_POINTS;
    }
  }

  // Получить определение навыка
  getSkillDefinition(skillId) {
    return SKILL_DEFS.find(def => def.id === skillId);
  }

  // Проверить, можем ли позволить себе навык
  canAfford(skillId) {
    const def = this.getSkillDefinition(skillId);
    if (!def) return false;
    
    const skill = this.gameState.skills[skillId];
    if (skill.level >= def.maxLevel) return false;
    
    const cost = this.calculateCost(def, skill.level);
    return this.gameState.skillPoints >= cost;
  }

  // Рассчитать стоимость навыка
  calculateCost(def, currentLevel) {
    return Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
  }

  // Купить/улучшить навык
  buySkill(skillId) {
    const def = this.getSkillDefinition(skillId);
    if (!def) {
      console.warn(`Unknown skill: ${skillId}`);
      return false;
    }

    const skill = this.gameState.skills[skillId];
    if (skill.level >= def.maxLevel) {
      console.warn(`Skill ${skillId} is already at max level`);
      return false;
    }

    const cost = this.calculateCost(def, skill.level);
    if (this.gameState.skillPoints < cost) {
      console.warn(`Not enough skill points for ${skillId}`);
      return false;
    }

    // Списываем skill points
    this.gameState.skillPoints = Math.max(0, this.gameState.skillPoints - cost);
    this.validateSkillPoints();
    
    // Повышаем уровень навыка
    skill.level++;

    // Применяем эффекты навыка
    this.applySkillEffect(skillId, def);

    eventBus.emit(GameEvents.SKILL_BOUGHT, { 
      skillId, 
      level: skill.level,
      name: def.name 
    });
    
    eventBus.emit(GameEvents.SKILL_POINTS_CHANGED, this.gameState.skillPoints);
    
    console.log(`Skill ${def.name} upgraded to level ${skill.level}`);
    return true;
  }

  // Применить эффект навыка
  applySkillEffect(skillId, def) {
    const level = this.gameState.skills[skillId].level;
    
    switch (def.effect.type) {
      case 'charges':
        if (skillId === 'comboProtection') {
          this.gameState.skillStates.missProtectionCharges += def.effect.value;
        }
        break;
        
      case 'generation':
        if (def.effect.target === 'skillPoints') {
          this.startSkillPointGeneration(skillId, def, level);
        } else if (def.effect.target === 'faith') {
          this.startFaithGeneration(skillId, def, level);
        }
        break;
        
      case 'automation':
        if (skillId === 'autoClicker') {
          this.startAutoClicker(level);
        }
        break;
    }
  }

  // Запустить генерацию для всех активных навыков
  startGeneration() {
    SKILL_DEFS.forEach(def => {
      const skill = this.gameState.skills[def.id];
      if (skill && skill.level > 0 && def.effect.type === 'generation') {
        this.applySkillEffect(def.id, def);
      }
    });
    
    // Запускаем автокликер если есть уровни
    const autoClickerLevel = this.getSkillLevel('autoClicker');
    if (autoClickerLevel > 0) {
      this.startAutoClicker(autoClickerLevel);
    }
  }

  // Запустить генерацию skill points
  startSkillPointGeneration(skillId, def, level) {
    // Останавливаем предыдущий интервал
    this.stopGeneration(skillId);
    
    const intervalId = this.createInterval(() => {
      const amount = def.effect.value * level;
      this.addSkillPoints(amount);
    }, def.effect.interval, `skill-${skillId}`);
    
    this.generationIntervals.set(skillId, intervalId);
  }

  // Запустить генерацию faith
  startFaithGeneration(skillId, def, level) {
    // Останавливаем предыдущий интервал
    this.stopGeneration(skillId);
    
    const intervalId = this.createInterval(() => {
      const amount = def.effect.value * level;
      this.gameState.addResource('faith', amount);
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }, def.effect.interval, `skill-${skillId}`);
    
    this.generationIntervals.set(skillId, intervalId);
  }

  // Запустить автокликер
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

  // Выполнить автоматический клик
  performAutoClick() {
    if (!this.isActive()) return;
    
    const target = this.gameState.targetZone;
    const featureManager = this.gameState.featureMgr;
    
    // Проверяем доступность компонентов
    if (typeof target !== 'number' || !featureManager || !featureManager.zones) {
      return;
    }
    
    const zone = featureManager.zones.find(z => z && z.index === target);
    if (!zone) return;
    
    // Получаем текущий угол поворота колеса
    const currentRotation = this.gameState.currentRotation || 0;
    
    // Вычисляем углы зоны
    const startAngle = zone.getStartAngle();
    const endAngle = zone.getEndAngle();
    const zoneSize = endAngle - startAngle;
    
    // Кликаем в центр зоны с небольшим случайным отклонением
    const randomOffset = (Math.random() - 0.5) * zoneSize * 0.3;
    const targetAngle = startAngle + (zoneSize / 2) + randomOffset;
    
    // Корректируем угол с учетом поворота колеса
    const correctedAngle = targetAngle - currentRotation;
    
    // Нормализуем угол
    const normalizedAngle = ((correctedAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Эмитируем клик
    eventBus.emit(GameEvents.CLICK, normalizedAngle);
  }

  // ИСПРАВЛЕНИЕ: Остановить автокликер - используем правильный метод
  stopAutoClicker() {
    if (this.autoClickerInterval) {
      this.cleanupManager.clearInterval(this.autoClickerInterval);
      this.autoClickerInterval = null;
    }
    this.gameState.skillStates.autoClickerActive = false;
  }

  // ИСПРАВЛЕНИЕ: Остановить генерацию навыка - используем правильный метод
  stopGeneration(skillId) {
    if (this.generationIntervals.has(skillId)) {
      const intervalId = this.generationIntervals.get(skillId);
      this.cleanupManager.clearInterval(intervalId);
      this.generationIntervals.delete(skillId);
    }
  }

  // Получить уровень навыка
  getSkillLevel(skillId) {
    const skill = this.gameState.skills[skillId];
    return skill ? skill.level : 0;
  }

  // Получить бонус от навыков
  getSkillBonus(type, target = null) {
    let bonus = 0;
    
    SKILL_DEFS.forEach(def => {
      const level = this.getSkillLevel(def.id);
      if (level > 0 && def.effect.type === type && 
          (target === null || def.effect.target === target)) {
        bonus += def.effect.value * level;
      }
    });
    
    return bonus;
  }

  // Проверить защиту от промаха
  canUseMissProtection() {
    return this.gameState.skillStates.missProtectionCharges > 0;
  }

  // Использовать защиту от промаха
  useMissProtection() {
    if (this.gameState.skillStates.missProtectionCharges > 0) {
      this.gameState.skillStates.missProtectionCharges--;
      return true;
    }
    return false;
  }

  // Получить информацию о навыке
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

  // Получить описание эффекта
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
      case 'generation':
        return `${totalValue}/interval ${effect.target}`;
      case 'charges':
        return `${totalValue} charges`;
      case 'protection':
        return `${(totalValue * 100).toFixed(1)}% protection`;
      default:
        return `Level ${level} effect`;
    }
  }

  // Получить навыки по категориям
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

  // Добавить skill points
  addSkillPoints(amount) {
    if (!this.isActive()) return;
    
    // Валидация входного значения
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      console.warn('Invalid skill points amount:', amount);
      return;
    }
    
    // Безопасное добавление с проверкой на переполнение
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

  // Получить статистику навыков
  getSkillStatistics() {
    const stats = {
      totalSkillPoints: this.gameState.skillPoints,
      learnedSkills: 0,
      totalSkillLevels: 0,
      maxLevelSkills: 0,
      activeGenerations: this.generationIntervals.size,
      autoClickerActive: this.gameState.skillStates.autoClickerActive,
      missProtectionCharges: this.gameState.skillStates.missProtectionCharges,
      categories: {}
    };

    Object.keys(SKILL_CATEGORIES).forEach(category => {
      stats.categories[category] = { learned: 0, levels: 0 };
    });

    SKILL_DEFS.forEach(def => {
      const skill = this.gameState.skills[def.id];
      if (skill && skill.level > 0) {
        stats.learnedSkills++;
        stats.totalSkillLevels += skill.level;
        
        if (skill.level >= def.maxLevel) {
          stats.maxLevelSkills++;
        }
        
        const category = def.category;
        if (stats.categories[category]) {
          stats.categories[category].learned++;
          stats.categories[category].levels += skill.level;
        }
      }
    });

    return stats;
  }

  // Получить все активные эффекты навыков
  getActiveEffects() {
    const effects = {};
    
    SKILL_DEFS.forEach(def => {
      const level = this.getSkillLevel(def.id);
      if (level > 0) {
        const effectKey = `${def.effect.type}_${def.effect.target}`;
        if (!effects[effectKey]) {
          effects[effectKey] = { type: def.effect.type, target: def.effect.target, value: 0 };
        }
        effects[effectKey].value += def.effect.value * level;
      }
    });
    
    return effects;
  }

  // Сбросить навык (для отладки или рефакторинга)
  resetSkill(skillId) {
    const skill = this.gameState.skills[skillId];
    if (!skill) return false;
    
    const def = this.getSkillDefinition(skillId);
    if (!def) return false;
    
    // Возвращаем потраченные очки
    let refund = 0;
    for (let i = 0; i < skill.level; i++) {
      refund += this.calculateCost(def, i);
    }
    
    this.addSkillPoints(refund);
    
    // Сбрасываем уровень
    skill.level = 0;
    
    // Останавливаем связанные эффекты
    this.stopGeneration(skillId);
    if (skillId === 'autoClicker') {
      this.stopAutoClicker();
    }
    
    console.log(`Skill ${def.name} reset, refunded ${refund} points`);
    return true;
  }

  // ИСПРАВЛЕНИЕ: Деструктор с правильными методами очистки
  destroy() {
    console.log('🧹 SkillManager cleanup started');

    // Останавливаем все генерации
    this.generationIntervals.forEach((intervalId, skillId) => {
      this.cleanupManager.clearInterval(intervalId);
    });
    this.generationIntervals.clear();

    // Останавливаем автокликер
    this.stopAutoClicker();

    // Вызываем родительский деструктор
    super.destroy();

    console.log('✅ SkillManager destroyed');
  }
}