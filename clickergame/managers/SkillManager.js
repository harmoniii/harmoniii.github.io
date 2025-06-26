// managers/SkillManager.js - ИСПРАВЛЕННАЯ версия с рабочим автокликером
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

// Категории навыков
export const SKILL_CATEGORIES = {
  clicking: 'Clicking Skills',
  combo: 'Combo Skills', 
  resources: 'Resource Skills',
  effects: 'Effect Skills',
  special: 'Special Skills',
  energy: 'Energy Skills'
};

export const ENERGY_SKILL_DEFS = [
  {
    id: 'energyEfficiency',
    name: 'Energy Efficiency',
    icon: '💡',
    description: 'Advanced techniques for reducing energy consumption during precise interactions with the reconstruction mechanisms.',
    category: 'energy',
    maxLevel: 3,
    baseCost: 5,
    costMultiplier: 2.0,
    effect: { type: 'reduction', target: 'energy_cost', value: 0.25 }
  },
  {
    id: 'energyMastery',
    name: 'Energy Mastery',
    icon: '⚡',
    description: 'Deep understanding of energy flow patterns, allowing for accelerated recovery and optimization.',
    category: 'energy',
    maxLevel: 5,
    baseCost: 8,
    costMultiplier: 1.8,
    effect: { type: 'multiplier', target: 'energy_regen', value: 1.0 }
  },
  {
    id: 'powerStorage',
    name: 'Power Storage',
    icon: '🔋',
    description: 'Enhanced capacity for storing and managing energy reserves through technological improvements.',
    category: 'energy',
    maxLevel: 4,
    baseCost: 10,
    costMultiplier: 2.2,
    effect: { type: 'bonus', target: 'max_energy', value: 50 }
  }
];
// Определения навыков
export const SKILL_DEFS = [
  // Clicking Skills
  {
    id: 'goldMultiplier',
    name: 'Golden Touch',
    icon: '💰',
    description: 'A technique rediscovered from the economic archives of the old world, allowing survivors to extract maximum value from each precious interaction.',
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
    description: 'A combat technique developed by survivors, enabling precise and devastating interactions that maximize resource extraction.',
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
    description: 'An intuitive skill born from the desperation of survivors, teaching them to recognize hidden resources in the most unexpected places.',
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
    description: 'A mental technique that allows survivors to maintain focus and composure even when opportunities seem to slip away.',
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
    description: 'A skill that manipulates the perception of time, allowing survivors to maximize their critical moments of productivity.',
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
    description: 'A technique of rhythmic efficiency, teaching survivors how to chain actions into increasingly powerful sequences.',
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
    description: 'A spiritual practice that helps survivors generate faith and inner strength in a world torn apart by chaos.',
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
    description: 'A mental discipline developed to resist the corrupting influence of chaos, allowing survivors to maintain clarity and purpose.',
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
    description: 'A survival technique that minimizes resource loss, developed through hard-learned lessons of the post-catastrophe world.',
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
    description: 'A skill that allows survivors to extend and maximize the beneficial energy flows in their reconstructed world.',
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
    description: 'A mental and physical training that helps survivors reduce the impact of negative influences and maintain their reconstruction efforts.',
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
    description: 'A probabilistic skill that increases the chances of receiving positive energy in a world of uncertain survival.',
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
    description: 'A technological skill recovered from pre-catastrophe archives, allowing automated interaction with the world\'s reconstruction mechanisms.',
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
    description: 'A rare ability that allows glimpses of potential future zones, developed by survivors with enhanced perceptive capabilities.',
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
    description: 'A meta-learning technique that accelerates the acquisition of knowledge and skills in the challenging post-apocalyptic environment.',
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
    
    // ИСПРАВЛЕНИЕ: Добавляем отладочную информацию для автокликера
    this.autoClickerDebug = {
      enabled: false,
      lastClick: 0,
      totalClicks: 0,
      errors: 0
    };
    
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

  // ИСПРАВЛЕНИЕ: Запустить автокликер с правильной логикой
  startAutoClicker(level) {
    this.stopAutoClicker();
    
    console.log(`🤖 Starting auto clicker at level ${level}`);
    
    this.gameState.skillStates.autoClickerActive = true;
    
    const baseInterval = GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL;
    const intervalMs = Math.max(
      GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL, 
      Math.floor(baseInterval / level)
    );
    
    console.log(`🤖 Auto clicker interval: ${intervalMs}ms`);
    
    this.autoClickerInterval = this.createInterval(() => {
      this.performAutoClick();
    }, intervalMs, 'auto-clicker');
    
    // ИСПРАВЛЕНИЕ: Включаем отладку автокликера
    this.autoClickerDebug.enabled = true;
    this.autoClickerDebug.totalClicks = 0;
    this.autoClickerDebug.errors = 0;
  }

  // ИСПРАВЛЕНИЕ: Выполнить автоматический клик с правильной логикой
  performAutoClick() {
    if (!this.isActive()) {
      this.autoClickerDebug.errors++;
      return;
    }
    
    try {
      // ИСПРАВЛЕНИЕ: Получаем доступ к FeatureManager через gameState
      const featureManager = this.gameState.managers?.feature || 
                           this.gameState.featureManager || 
                           this.gameState.featureMgr;
      
      if (!featureManager) {
        console.warn('🤖 Auto clicker: FeatureManager not found');
        this.autoClickerDebug.errors++;
        return;
      }
      
      const targetZone = this.gameState.targetZone;
      if (typeof targetZone !== 'number' || targetZone < 0) {
        console.warn('🤖 Auto clicker: Invalid target zone:', targetZone);
        this.autoClickerDebug.errors++;
        return;
      }
      
      const zones = featureManager.zones;
      if (!zones || !Array.isArray(zones) || zones.length === 0) {
        console.warn('🤖 Auto clicker: No zones available');
        this.autoClickerDebug.errors++;
        return;
      }
      
      // Находим целевую зону
      const zone = zones.find(z => z && z.index === targetZone);
      if (!zone) {
        console.warn(`🤖 Auto clicker: Target zone ${targetZone} not found`);
        this.autoClickerDebug.errors++;
        return;
      }
      
      // ИСПРАВЛЕНИЕ: Получаем правильный угол для клика
      let clickAngle;
      
      if (typeof zone.getCenterAngle === 'function') {
        // Используем центральный угол зоны
        clickAngle = zone.getCenterAngle();
        
        // Добавляем небольшую случайность для реалистичности
        const zoneSize = zone.getSize ? zone.getSize() : (2 * Math.PI / zones.length);
        const randomOffset = (Math.random() - 0.5) * zoneSize * 0.2;
        clickAngle += randomOffset;
        
      } else {
        // Fallback: рассчитываем угол вручную
        const zoneCount = zones.length;
        const stepAngle = (2 * Math.PI) / zoneCount;
        const centerAngle = stepAngle * targetZone + (stepAngle / 2);
        
        // Добавляем случайность
        const randomOffset = (Math.random() - 0.5) * stepAngle * 0.2;
        clickAngle = centerAngle + randomOffset;
      }
      
      // ИСПРАВЛЕНИЕ: Нормализуем угол
      clickAngle = this.normalizeAngle(clickAngle);
      
      // Эмитируем клик
      eventBus.emit(GameEvents.CLICK, clickAngle);
      
      // Обновляем статистику
      this.autoClickerDebug.lastClick = Date.now();
      this.autoClickerDebug.totalClicks++;
      
      if (this.autoClickerDebug.enabled && this.autoClickerDebug.totalClicks % 10 === 0) {
        console.log(`🤖 Auto clicker: ${this.autoClickerDebug.totalClicks} clicks, ${this.autoClickerDebug.errors} errors`);
      }
      
    } catch (error) {
      console.error('🤖 Auto clicker error:', error);
      this.autoClickerDebug.errors++;
      
      // Если слишком много ошибок, останавливаем автокликер
      if (this.autoClickerDebug.errors > 10) {
        console.error('🤖 Too many auto clicker errors, stopping...');
        this.stopAutoClicker();
      }
    }
  }

  // ИСПРАВЛЕНИЕ: Добавляем нормализацию угла
  normalizeAngle(angle) {
    if (typeof angle !== 'number' || isNaN(angle)) {
      return 0;
    }
    
    const twoPi = 2 * Math.PI;
    let normalized = angle % twoPi;
    
    if (normalized < 0) {
      normalized += twoPi;
    }
    
    return normalized;
  }

  // Остановить автокликер
  stopAutoClicker() {
    if (this.autoClickerInterval) {
      this.cleanupManager.clearInterval(this.autoClickerInterval);
      this.autoClickerInterval = null;
    }
    this.gameState.skillStates.autoClickerActive = false;
    this.autoClickerDebug.enabled = false;
    
    console.log('🤖 Auto clicker stopped');
  }

  // Остановить генерацию навыка
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
      case 'automation':
        return `Level ${level} automation`;
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

  // ИСПРАВЛЕНИЕ: Получить статистику автокликера
  getAutoClickerStats() {
    return {
      active: this.gameState.skillStates.autoClickerActive,
      level: this.getSkillLevel('autoClicker'),
      interval: this.autoClickerInterval ? 
        Math.max(GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL, 
                 Math.floor(GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL / this.getSkillLevel('autoClicker'))) : 0,
      debug: { ...this.autoClickerDebug }
    };
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

  // ИСПРАВЛЕНИЕ: Остановить все процессы генерации навыков
  stopAllGeneration() {
    console.log('🛑 Stopping all skill generation...');
    
    // Останавливаем все интервалы генерации
    this.generationIntervals.forEach((intervalId, skillId) => {
      this.cleanupManager.clearInterval(intervalId);
      console.log(`Stopped generation for ${skillId}`);
    });
    this.generationIntervals.clear();
    
    // Останавливаем автокликер
    this.stopAutoClicker();
    
    console.log('✅ All skill generation stopped');
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

  // ИСПРАВЛЕНИЕ: Принудительная перезагрузка автокликера
  reloadAutoClicker() {
    const level = this.getSkillLevel('autoClicker');
    if (level > 0) {
      console.log('🔄 Reloading auto clicker...');
      this.stopAutoClicker();
      
      // Небольшая задержка перед перезапуском
      this.createTimeout(() => {
        this.startAutoClicker(level);
      }, 100);
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 SkillManager cleanup started');

    // Останавливаем все генерации
    this.stopAllGeneration();

    // Вызываем родительский деструктор
    super.destroy();

    console.log('✅ SkillManager destroyed');
  }
}