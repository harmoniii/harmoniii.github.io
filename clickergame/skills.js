// skills.js - Исправленная версия с фиксами багов
import { EventBus } from './eventBus.js';

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
    effect: { type: 'automation', target: 'clicking', value: 1, interval: 10000 }
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
    this.intervals = new Map(); // ИСПРАВЛЕНИЕ: используем Map для лучшего управления
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
    
    // ИСПРАВЛЕНИЕ: Всегда округляем skill points до целого числа
    if (this.state.skillPoints === undefined) {
      this.state.skillPoints = 0;
    } else {
      this.state.skillPoints = Math.floor(this.state.skillPoints);
    }

    // Инициализируем специальные состояния
    if (!this.state.skillStates) {
      this.state.skillStates = {
        missProtectionCharges: 0,
        autoClickerActive: false
      };
    }

    this.skills = this.state.skills;
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

    // ИСПРАВЛЕНИЕ: Всегда округляем skill points при списании
    this.state.skillPoints = Math.floor(this.state.skillPoints - cost);
    
    // Повышаем уровень навыка
    this.skills[skillId].level++;

    // Применяем специальные эффекты
    this.applySkillEffect(skillId, def);

    EventBus.emit('skillBought', { skillId, level: this.skills[skillId].level });
    EventBus.emit('skillPointsChanged', this.state.skillPoints);
    return true;
  }

  applySkillEffect(skillId, def) {
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
    // ИСПРАВЛЕНИЕ: Очищаем старый интервал если существует
    if (this.intervals.has(skillId)) {
      clearInterval(this.intervals.get(skillId));
    }
    
    const interval = setInterval(() => {
      const amount = def.effect.value * level;
      // ИСПРАВЛЕНИЕ: Всегда округляем skill points до целого числа
      this.state.skillPoints = Math.floor((this.state.skillPoints || 0) + amount);
      EventBus.emit('skillPointsChanged', this.state.skillPoints);
    }, def.effect.interval);
    
    this.intervals.set(skillId, interval);
  }

  startFaithGeneration(skillId, def, level) {
    // ИСПРАВЛЕНИЕ: Очищаем старый интервал если существует
    if (this.intervals.has(skillId)) {
      clearInterval(this.intervals.get(skillId));
    }
    
    const interval = setInterval(() => {
      const amount = def.effect.value * level;
      this.state.resources.faith += amount;
      EventBus.emit('resourceChanged');
    }, def.effect.interval);
    
    this.intervals.set(skillId, interval);
  }

  startAutoClicker(level) {
    // ИСПРАВЛЕНИЕ: Очищаем старый интервал если существует
    if (this.intervals.has('autoClicker')) {
      clearInterval(this.intervals.get('autoClicker'));
    }
    
    this.state.skillStates.autoClickerActive = true;
    
    const interval = setInterval(() => {
      try {
        const target = this.state.targetZone;
        const fm = this.state.featureMgr;
        if (typeof target === 'number' && fm && fm.zones) {
          const zone = fm.zones.find(z => z.index === target);
          if (zone) {
            // ИСПРАВЛЕНИЕ: Получаем текущий угол поворота колеса
            const currentRotation = this.state.currentRotation || 0;
            
            // Вычисляем угол клика относительно текущего поворота
            const start = zone.getStartAngle();
            const end = zone.getEndAngle();
            const zoneClickAngle = start + Math.random() * (end - start);
            
            // Корректируем угол с учетом поворота колеса
            const correctedAngle = zoneClickAngle - currentRotation;
            
            EventBus.emit('click', correctedAngle);
          }
        }
      } catch (error) {
        console.warn('Auto clicker error:', error);
      }
    }, Math.max(1000, 10000 / level));
    
    this.intervals.set('autoClicker', interval);
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

  // ИСПРАВЛЕНИЕ: Всегда добавляем skill points как целое число
  addSkillPoints(amount) {
    this.state.skillPoints = Math.floor((this.state.skillPoints || 0) + Math.floor(amount));
    EventBus.emit('skillPointsChanged', this.state.skillPoints);
  }

  // ИСПРАВЛЕНИЕ: Полная очистка всех интервалов
  stopAllGeneration() {
    // Очищаем все интервалы из Map
    for (const [key, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    // Дополнительная очистка на случай если что-то осталось
    this.state.skillStates.autoClickerActive = false;
  }
}