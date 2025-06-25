// skills.js - Исправленная версия с фиксами skill points и автокликера
import { EventBus } from './eventBus.js';
import { GAME_CONSTANTS } from './config.js';

export const SKILL_CATEGORIES = {
  clicking: 'Clicking Skills',
  combo: 'Combo Skills', 
  resources: 'Resource Skills',
  effects: 'Effect Skills',
  special: 'Special Skills'
};

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
    effect: { type: 'automation', target: 'clicking', value: 1, interval: GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL }
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

export class SkillManager {
  constructor(state) {
    this.state = state;
    this.skills = state.skills || {};
    this.isDestroyed = false; // ИСПРАВЛЕНИЕ 2: Флаг для предотвращения утечек
    
    // ИСПРАВЛЕНИЕ 2: Используем Set для отслеживания интервалов
    this.intervals = new Map();
    this.allTimeouts = new Set();
    this.allIntervals = new Set();
    
    this.initSkills();
    this.startGeneration();
  }

  initSkills() {
    if (!this.state.skills) {
      this.state.skills = {};
      SKILL_DEFS.forEach(def => {
        this.state.skills[def.id] = { level: 0 };
      });
    }
    
    // ИСПРАВЛЕНИЕ 3: Всегда проверяем и округляем skill points
    this.validateAndFixSkillPoints();

    // Инициализируем специальные состояния
    if (!this.state.skillStates) {
      this.state.skillStates = {
        missProtectionCharges: 0,
        autoClickerActive: false
      };
    }

    this.skills = this.state.skills;
  }

  // ИСПРАВЛЕНИЕ 3: Валидация и исправление skill points
  validateAndFixSkillPoints() {
    if (this.state.skillPoints === undefined || this.state.skillPoints === null) {
      this.state.skillPoints = 0;
    } else if (typeof this.state.skillPoints !== 'number' || isNaN(this.state.skillPoints)) {
      console.warn('Invalid skill points detected, resetting to 0');
      this.state.skillPoints = 0;
    } else if (!Number.isInteger(this.state.skillPoints)) {
      console.warn('Non-integer skill points detected, rounding down');
      this.state.skillPoints = Math.floor(this.state.skillPoints);
    } else if (this.state.skillPoints < 0) {
      console.warn('Negative skill points detected, resetting to 0');
      this.state.skillPoints = 0;
    } else if (this.state.skillPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
      console.warn('Skill points exceed maximum, capping');
      this.state.skillPoints = GAME_CONSTANTS.MAX_SKILL_POINTS;
    }
  }

  // ИСПРАВЛЕНИЕ 2: Создание таймаута с отслеживанием
  createTimeout(callback, delay) {
    if (this.isDestroyed) return null;
    
    const timeoutId = setTimeout(() => {
      this.allTimeouts.delete(timeoutId);
      if (!this.isDestroyed) {
        callback();
      }
    }, delay);
    
    this.allTimeouts.add(timeoutId);
    return timeoutId;
  }

  // ИСПРАВЛЕНИЕ 2: Создание интервала с отслеживанием
  createInterval(callback, delay) {
    if (this.isDestroyed) return null;
    
    const intervalId = setInterval(() => {
      if (this.isDestroyed) {
        clearInterval(intervalId);
        this.allIntervals.delete(intervalId);
        return;
      }
      callback();
    }, delay);
    
    this.allIntervals.add(intervalId);
    return intervalId;
  }

  canAfford(skillId) {
    const def = SKILL_DEFS.find(s => s.id === skillId);
    if (!def) return false;
    
    const currentLevel = this.skills[skillId].level;
    if (currentLevel >= def.maxLevel) return false;
    
    const cost = this.calculateCost(def, currentLevel);
    return this.state.skillPoints >= cost;
  }

  calculateCost(def, level) {
    return Math.floor(def.baseCost * Math.pow(def.costMultiplier, level));
  }

  buySkill(skillId) {
    const def = SKILL_DEFS.find(s => s.id === skillId);
    if (!def) return false;

    const currentLevel = this.skills[skillId].level;
    if (currentLevel >= def.maxLevel) return false;

    const cost = this.calculateCost(def, currentLevel);
    if (this.state.skillPoints < cost) return false;

    // ИСПРАВЛЕНИЕ 3: Безопасное списание skill points с валидацией
    this.state.skillPoints = Math.max(0, Math.floor(this.state.skillPoints - cost));
    this.validateAndFixSkillPoints();
    
    // Повышаем уровень навыка
    this.skills[skillId].level++;

    // Применяем специальные эффекты
    this.applySkillEffect(skillId, def);

    EventBus.emit('skillBought', { skillId, level: this.skills[skillId].level });
    EventBus.emit('skillPointsChanged', this.state.skillPoints);
    return true;
  }

  applySkillEffect(skillId, def) {
    if (this.isDestroyed) return;
    
    const level = this.skills[skillId].level;
    
    switch (def.effect.type) {
      case 'charges':
        if (skillId === 'comboProtection') {
          this.state.skillStates.missProtectionCharges += def.effect.value;
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

  startGeneration() {
    SKILL_DEFS.forEach(def => {
      const level = this.skills[def.id].level;
      if (level > 0 && def.effect.type === 'generation') {
        this.applySkillEffect(def.id, def);
      }
    });
    
    // Запускаем автокликер если есть уровни
    const autoClickerLevel = this.skills.autoClicker?.level || 0;
    if (autoClickerLevel > 0) {
      this.startAutoClicker(autoClickerLevel);
    }
  }

  startSkillPointGeneration(skillId, def, level) {
    if (this.isDestroyed) return;
    
    // Очищаем старый интервал если существует
    if (this.intervals.has(skillId)) {
      const oldInterval = this.intervals.get(skillId);
      clearInterval(oldInterval);
      this.allIntervals.delete(oldInterval);
    }
    
    const interval = this.createInterval(() => {
      const amount = def.effect.value * level;
      // ИСПРАВЛЕНИЕ 3: Безопасное добавление skill points с валидацией
      this.addSkillPoints(amount);
    }, def.effect.interval);
    
    if (interval) {
      this.intervals.set(skillId, interval);
    }
  }

  startFaithGeneration(skillId, def, level) {
    if (this.isDestroyed) return;
    
    // Очищаем старый интервал если существует
    if (this.intervals.has(skillId)) {
      const oldInterval = this.intervals.get(skillId);
      clearInterval(oldInterval);
      this.allIntervals.delete(oldInterval);
    }
    
    const interval = this.createInterval(() => {
      const amount = def.effect.value * level;
      this.state.resources.faith += amount;
      EventBus.emit('resourceChanged');
    }, def.effect.interval);
    
    if (interval) {
      this.intervals.set(skillId, interval);
    }
  }

  startAutoClicker(level) {
    if (this.isDestroyed) return;
    
    // Очищаем старый интервал если существует
    if (this.intervals.has('autoClicker')) {
      const oldInterval = this.intervals.get('autoClicker');
      clearInterval(oldInterval);
      this.allIntervals.delete(oldInterval);
    }
    
    this.state.skillStates.autoClickerActive = true;
    
    // ИСПРАВЛЕНИЕ 12: Более точный расчет для автокликера
    const baseInterval = GAME_CONSTANTS.AUTO_CLICKER_BASE_INTERVAL;
    const intervalMs = Math.max(GAME_CONSTANTS.AUTO_CLICKER_MIN_INTERVAL, Math.floor(baseInterval / level));
    
    const interval = this.createInterval(() => {
      try {
        this.performAutoClick();
      } catch (error) {
        console.warn('Auto clicker error:', error);
      }
    }, intervalMs);
    
    if (interval) {
      this.intervals.set('autoClicker', interval);
    }
  }

  // ИСПРАВЛЕНИЕ 12: Улучшенная логика автокликера
  performAutoClick() {
    if (this.isDestroyed) return;
    
    const target = this.state.targetZone;
    const fm = this.state.featureMgr;
    
    // Проверяем что все необходимые компоненты доступны
    if (typeof target !== 'number' || !fm || !fm.zones || !Array.isArray(fm.zones)) {
      console.warn('Auto clicker: invalid game state');
      return;
    }
    
    const zone = fm.zones.find(z => z && z.index === target);
    if (!zone || typeof zone.getStartAngle !== 'function' || typeof zone.getEndAngle !== 'function') {
      console.warn('Auto clicker: invalid target zone');
      return;
    }
    
    // Получаем текущий угол поворота колеса
    const currentRotation = this.state.currentRotation || 0;
    
    // Вычисляем углы зоны
    const startAngle = zone.getStartAngle();
    const endAngle = zone.getEndAngle();
    const zoneSize = endAngle - startAngle;
    
    // Кликаем в центр зоны с небольшим случайным отклонением
    const randomOffset = (Math.random() - 0.5) * zoneSize * 0.3; // 30% от размера зоны
    const targetAngle = startAngle + (zoneSize / 2) + randomOffset;
    
    // Корректируем угол с учетом поворота колеса
    const correctedAngle = targetAngle - currentRotation;
    
    // Нормализуем угол
    const normalizedAngle = ((correctedAngle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Эмитируем клик
    EventBus.emit('click', normalizedAngle);
  }

  getSkillLevel(skillId) {
    return this.skills[skillId]?.level || 0;
  }

  // Получить бонус от навыков
  getSkillBonus(type, target = null) {
    let bonus = 0;
    SKILL_DEFS.forEach(def => {
      const level = this.skills[def.id]?.level || 0;
      if (level > 0 && def.effect.type === type && 
          (target === null || def.effect.target === target)) {
        bonus += def.effect.value * level;
      }
    });
    return bonus;
  }

  // Проверить защиту от промаха
  canUseMissProtection() {
    return this.state.skillStates.missProtectionCharges > 0;
  }

  useMissProtection() {
    if (this.state.skillStates.missProtectionCharges > 0) {
      this.state.skillStates.missProtectionCharges--;
      return true;
    }
    return false;
  }

  getSkillInfo(skillId) {
    const def = SKILL_DEFS.find(s => s.id === skillId);
    const skill = this.skills[skillId];
    
    if (!def || !skill) return null;

    return {
      ...def,
      currentLevel: skill.level,
      nextCost: skill.level < def.maxLevel ? 
        this.calculateCost(def, skill.level) : null,
      canAfford: skill.level < def.maxLevel ? 
        this.canAfford(skillId) : false,
      isMaxLevel: skill.level >= def.maxLevel,
      currentEffect: def.effect.value * skill.level
    };
  }

  getSkillsByCategory() {
    const categories = {};
    Object.keys(SKILL_CATEGORIES).forEach(cat => {
      categories[cat] = SKILL_DEFS
        .filter(def => def.category === cat)
        .map(def => this.getSkillInfo(def.id));
    });
    return categories;
  }

  // ИСПРАВЛЕНИЕ 3: Безопасное добавление skill points
  addSkillPoints(amount) {
    if (this.isDestroyed) return;
    
    // Валидация входного значения
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      console.warn('Invalid skill points amount:', amount);
      return;
    }
    
    // Безопасное добавление с проверкой на переполнение
    const currentPoints = this.state.skillPoints || 0;
    const newPoints = currentPoints + Math.floor(amount);
    
    if (newPoints > GAME_CONSTANTS.MAX_SKILL_POINTS) {
      this.state.skillPoints = GAME_CONSTANTS.MAX_SKILL_POINTS;
    } else {
      this.state.skillPoints = Math.floor(newPoints);
    }
    
    this.validateAndFixSkillPoints();
    EventBus.emit('skillPointsChanged', this.state.skillPoints);
  }

  // ИСПРАВЛЕНИЕ 2: Полная очистка всех интервалов с защитой от утечек
  stopAllGeneration() {
    this.isDestroyed = true;
    
    // Очищаем все интервалы из Map
    for (const [key, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    // ИСПРАВЛЕНИЕ 2: Очищаем все отслеживаемые таймауты и интервалы
    for (const timeoutId of this.allTimeouts) {
      clearTimeout(timeoutId);
    }
    this.allTimeouts.clear();
    
    for (const intervalId of this.allIntervals) {
      clearInterval(intervalId);
    }
    this.allIntervals.clear();
    
    // Сбрасываем состояние автокликера
    this.state.skillStates.autoClickerActive = false;
    
    console.log('🧹 SkillManager полностью очищен');
  }
}