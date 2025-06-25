// buffs.js - Полная исправленная версия с фиксами memory leaks и правильной очисткой
import { EventBus } from './eventBus.js';
import { RESOURCES, GAME_CONSTANTS } from './config.js';

// Улучшенные определения баффов с константами
export const BUFF_DEFS = [
  { 
    id: 'frenzy', 
    name: '🔥 Frenzy', 
    duration: 15, 
    description: 'Double gold gain from clicks',
    rarity: 'common'
  },
  { 
    id: 'lucky', 
    name: '💎 Lucky Zone', 
    duration: 10, 
    description: 'Increased chance of getting buffs',
    rarity: 'common'
  },
  { 
    id: 'waterfall', 
    name: '⚙️ Resource Waterfall', 
    duration: 10, 
    description: 'Gain random resource every second',
    rarity: 'uncommon'
  },
  { 
    id: 'roll', 
    name: '🎰 Roll', 
    duration: null, 
    description: 'Random resource gambling',
    rarity: 'rare'
  },
  { 
    id: 'mysteryBox', 
    name: '📦 Mystery Box', 
    duration: null, 
    description: 'Choose from 3 random resources',
    rarity: 'rare'
  },
  { 
    id: 'speedBoost', 
    name: '🏃 Speed Boost', 
    duration: 12, 
    description: 'Wheel rotates 50% slower, easier targeting',
    rarity: 'common'
  },
  { 
    id: 'starPower', 
    name: '⭐ Star Power', 
    duration: null, 
    description: 'Next 10 clicks give +5 bonus to any resource',
    rarity: 'uncommon'
  },
  { 
    id: 'doubleTap', 
    name: '🔄 Double Tap', 
    duration: 12, 
    description: 'Each click counts as 2 clicks',
    rarity: 'uncommon'
  },
  { 
    id: 'slotMachine', 
    name: '🎰 Slot Machine', 
    duration: 15, 
    description: 'Each click has 30% chance for random resource',
    rarity: 'uncommon'
  },
  { 
    id: 'shield', 
    name: '🛡️ Shield', 
    duration: null, 
    description: 'Blocks next 3 debuffs',
    rarity: 'rare'
  }
];

export const DEBUFF_DEFS = [
  { 
    id: 'rapid', 
    name: '🐌 Rapid Time', 
    duration: 5, 
    description: 'Wheel spins much faster',
    severity: 'mild'
  },
  { 
    id: 'ghost', 
    name: '👻 Ghost Click', 
    duration: 2, 
    description: 'Clicks sometimes ignored',
    severity: 'mild'
  },
  { 
    id: 'explosion', 
    name: '💣 Explosion', 
    duration: null, 
    description: 'Lose 10% of random resource',
    severity: 'severe'
  },
  { 
    id: 'lock', 
    name: '🔒 Zone Lock', 
    duration: 1, 
    description: 'Cannot click for 1 second',
    severity: 'moderate'
  },
  { 
    id: 'reverseControls', 
    name: '🙃 Reverse Controls', 
    duration: 8, 
    description: 'Target zone moves in opposite direction',
    severity: 'moderate'
  },
  { 
    id: 'freeze', 
    name: '❄️ Freeze', 
    duration: 10, 
    description: 'Combo counter frozen, cannot grow',
    severity: 'moderate'
  },
  { 
    id: 'taxCollector', 
    name: '💸 Tax Collector', 
    duration: 9, 
    description: 'Lose 5% of all resources every 3 seconds',
    severity: 'severe'
  },
  { 
    id: 'heavyClick', 
    name: '⚖️ Heavy Click', 
    duration: 8, 
    description: 'Need to click zone 3 times to register',
    severity: 'moderate'
  }
];

// Конфигурация эффектов с константами
export const EFFECT_CONFIG = {
  roll: {
    outcomes: [
      { chance: 0.25, type: 'big_win', amount: 50 },
      { chance: 0.25, type: 'small_win', amount: 5 },
      { chance: 0.25, type: 'nothing', amount: 0 },
      { chance: 0.25, type: 'loss', amount: -5 }
    ]
  },
  explosion: {
    damagePercent: GAME_CONSTANTS.EXPLOSION_DAMAGE_PERCENT
  },
  waterfall: {
    intervalMs: GAME_CONSTANTS.WATERFALL_INTERVAL,
    amount: GAME_CONSTANTS.WATERFALL_AMOUNT
  },
  speedBoost: {
    speedMultiplier: GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER
  },
  starPower: {
    clicksCount: GAME_CONSTANTS.STAR_POWER_CLICKS,
    bonusAmount: GAME_CONSTANTS.STAR_POWER_BONUS
  },
  slotMachine: {
    chance: GAME_CONSTANTS.SLOT_MACHINE_CHANCE,
    amount: GAME_CONSTANTS.SLOT_MACHINE_AMOUNT
  },
  shield: {
    blocksCount: GAME_CONSTANTS.SHIELD_BLOCKS
  },
  taxCollector: {
    intervalMs: GAME_CONSTANTS.TAX_COLLECTOR_INTERVAL,
    taxPercent: GAME_CONSTANTS.TAX_COLLECTOR_PERCENT
  },
  heavyClick: {
    requiredClicks: GAME_CONSTANTS.HEAVY_CLICK_REQUIRED
  }
};

export class BuffManager {
  constructor(state) {
    this.state = state;
    this.isDestroyed = false; // ИСПРАВЛЕНИЕ 2: Флаг для предотвращения утечек
    
    // ИСПРАВЛЕНИЕ 2: Используем Map для лучшего управления интервалами
    this.buffIntervals = new Map();
    this.debuffIntervals = new Map();
    
    // ИСПРАВЛЕНИЕ 2: Отслеживание всех созданных таймаутов
    this.allTimeouts = new Set();
    this.allIntervals = new Set();
    
    this.initializeEffectStates();
    
    // ИСПРАВЛЕНИЕ 10: НЕ очищаем эффекты при создании менеджера
    // Позволяем им загружаться из сохранения
    console.log('🎭 BuffManager инициализирован');
  }

  // ИСПРАВЛЕНИЕ 10: Более умная инициализация состояний эффектов
  initializeEffectStates() {
    if (!this.state.effectStates) {
      this.state.effectStates = this.getDefaultEffectStates();
    } else {
      // Дополняем отсутствующие поля значениями по умолчанию
      const defaults = this.getDefaultEffectStates();
      Object.keys(defaults).forEach(key => {
        if (this.state.effectStates[key] === undefined) {
          this.state.effectStates[key] = defaults[key];
        }
      });
    }
  }

  getDefaultEffectStates() {
    return {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    };
  }

  getBuff(id) {
    return BUFF_DEFS.find(b => b.id === id);
  }

  // ИСПРАВЛЕНИЕ 8: Исправлена опечатка в getDebuff
  getDebuff(id) {
    return DEBUFF_DEFS.find(d => d.id === id);
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

  applyBuff(def) {
    if (this.isDestroyed) return;
    
    const s = this.state;
    
    // Нормализация события
    const eventData = { id: def.id, name: def.name || def.id };
    EventBus.emit('buffApplied', eventData);

    // Buff Mastery (✨) - увеличение длительности баффов
    const buffDurationBonus = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('duration', 'buffs') : 0;
    const durationMultiplier = 1 + buffDurationBonus;

    switch (def.id) {
      case 'frenzy':
      case 'lucky':
      case 'doubleTap':
      case 'slotMachine':
        this.removeBuff(def.id);
        s.buffs.push(def.id);
        
        const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
        const timeout = this.createTimeout(() => {
          this.removeBuff(def.id);
          EventBus.emit('buffExpired', eventData);
        }, finalDuration);
        
        if (timeout) {
          this.buffIntervals.set(`${def.id}_timeout`, timeout);
        }
        break;

      case 'speedBoost':
        this.removeBuff(def.id);
        s.buffs.push(def.id);
        
        this._oldSpeed = this.state.CONFIG?.rotationSpeed || 0.005;
        if (this.state.CONFIG) {
          this.state.CONFIG.rotationSpeed *= EFFECT_CONFIG.speedBoost.speedMultiplier;
        }
        
        const finalDurationSpeed = Math.floor(def.duration * durationMultiplier * 1000);
        const speedTimeout = this.createTimeout(() => {
          if (this.state.CONFIG) {
            this.state.CONFIG.rotationSpeed = this._oldSpeed || 0.005;
          }
          this.removeBuff(def.id);
          EventBus.emit('buffExpired', eventData);
        }, finalDurationSpeed);
        
        if (speedTimeout) {
          this.buffIntervals.set(`${def.id}_timeout`, speedTimeout);
        }
        break;

      case 'starPower':
        this.removeBuff(def.id);
        s.buffs.push(def.id);
        this.state.effectStates.starPowerClicks = EFFECT_CONFIG.starPower.clicksCount;
        break;

      case 'shield':
        this.removeBuff(def.id);
        s.buffs.push(def.id);
        this.state.effectStates.shieldBlocks = EFFECT_CONFIG.shield.blocksCount;
        break;

      case 'waterfall':
        this.clearBuffInterval('waterfall');
        this.removeBuff(def.id);
        s.buffs.push(def.id);
        
        const intervalMs = EFFECT_CONFIG.waterfall.intervalMs;
        const amount = EFFECT_CONFIG.waterfall.amount;
        
        const waterfallInterval = this.createInterval(() => {
          const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
          const res = pool[Math.floor(Math.random() * pool.length)];
          s.resources[res] += amount;
          EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
        }, intervalMs);
        
        if (waterfallInterval) {
          this.buffIntervals.set('waterfall', waterfallInterval);
        }
        
        const finalDurationWater = Math.floor(def.duration * durationMultiplier * 1000);
        const waterfallTimeout = this.createTimeout(() => {
          this.clearBuffInterval('waterfall');
          this.removeBuff(def.id);
          EventBus.emit('buffExpired', eventData);
        }, finalDurationWater);
        
        if (waterfallTimeout) {
          this.buffIntervals.set('waterfall_timeout', waterfallTimeout);
        }
        break;

      case 'roll':
        const poolR = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
        const outcome = Math.random();
        let message = 'Roll: ';
        
        if (outcome < 0.25) {
          const res1 = poolR[Math.floor(Math.random() * poolR.length)];
          s.resources[res1] += 50;
          message += `+50 ${res1}`;
          EventBus.emit('resourceChanged', { resource: res1, amount: s.resources[res1] });
        } else if (outcome < 0.5) {
          const res2 = poolR[Math.floor(Math.random() * poolR.length)];
          s.resources[res2] += 5;
          message += `+5 ${res2}`;
          EventBus.emit('resourceChanged', { resource: res2, amount: s.resources[res2] });
        } else if (outcome < 0.75) {
          message += 'nothing';
        } else {
          const res3 = poolR[Math.floor(Math.random() * poolR.length)];
          const loss = Math.min(5, s.resources[res3]);
          s.resources[res3] -= loss;
          message += `-${loss} ${res3}`;
          EventBus.emit('resourceChanged', { resource: res3, amount: s.resources[res3] });
        }
        
        EventBus.emit('tempNotification', `${def.name}: ${message}`);
        break;

      case 'mysteryBox':
        // ИСПРАВЛЕНИЕ 19: Валидация ресурсов в Mystery Box
        const poolM = RESOURCES.filter(r => typeof r === 'string' && r.length > 0);
        const opts = [];
        const maxAttempts = poolM.length * 2; // Предотвращение бесконечного цикла
        let attempts = 0;
        
        while (opts.length < 3 && attempts < maxAttempts) {
          const r = poolM[Math.floor(Math.random() * poolM.length)];
          if (!opts.includes(r)) opts.push(r);
          attempts++;
        }
        
        if (opts.length >= 3) {
          EventBus.emit('mysteryBox', opts);
        } else {
          console.warn('Failed to generate mystery box options');
          EventBus.emit('tempNotification', 'Mystery Box failed to generate options');
        }
        break;
    }
  }

  removeBuff(buffId) {
    if (this.isDestroyed) return;
    this.state.buffs = this.state.buffs.filter(id => id !== buffId);
    this.clearBuffInterval(buffId);
    this.clearBuffInterval(`${buffId}_timeout`);
  }

  clearBuffInterval(key) {
    if (this.buffIntervals.has(key)) {
      const interval = this.buffIntervals.get(key);
      clearInterval(interval);
      clearTimeout(interval);
      this.allIntervals.delete(interval);
      this.allTimeouts.delete(interval);
      this.buffIntervals.delete(key);
    }
  }

  clearDebuffInterval(key) {
    if (this.debuffIntervals.has(key)) {
      const interval = this.debuffIntervals.get(key);
      clearInterval(interval);
      clearTimeout(interval);
      this.allIntervals.delete(interval);
      this.allTimeouts.delete(interval);
      this.debuffIntervals.delete(key);
    }
  }

  applyDebuff(def) {
    if (this.isDestroyed) return;
    
    const s = this.state;
    
    // Shield buff блокирует дебаффы
    if (s.buffs.includes('shield') && this.state.effectStates.shieldBlocks > 0) {
      this.state.effectStates.shieldBlocks--;
      EventBus.emit('shieldBlock', { 
        debuff: def.name, 
        remaining: this.state.effectStates.shieldBlocks 
      });
      
      if (this.state.effectStates.shieldBlocks <= 0) {
        this.removeBuff('shield');
        const shieldDef = this.getBuff('shield');
        if (shieldDef) {
          EventBus.emit('buffExpired', { id: 'shield', name: shieldDef.name });
        }
      }
      return;
    }
    
    const eventData = { id: def.id, name: def.name || def.id };
    EventBus.emit('debuffApplied', eventData);

    if (def.id === 'explosion') {
      const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
      const res = pool[Math.floor(Math.random() * pool.length)];
      const old = s.resources[res];
      
      const explosionProtection = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('protection', 'explosion') : 0;
      const baseDamage = EFFECT_CONFIG.explosion.damagePercent;
      const finalDamage = baseDamage * (1 - explosionProtection);
      
      s.resources[res] = Math.max(0, Math.floor(old * (1 - finalDamage)));
      const actualLoss = old - s.resources[res];
      
      const message = explosionProtection > 0 ? 
        `${def.name}: Lost ${actualLoss} ${res} (Protected by ${Math.floor(explosionProtection * 100)}%)` :
        `${def.name}: Lost ${actualLoss} ${res}`;
      
      EventBus.emit('tempNotification', message);
      EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
      return;
    }

    if (!s.debuffs) s.debuffs = [];
    
    this.removeDebuff(def.id);
    s.debuffs.push(def.id);
    
    // Resilience (🛡️) - уменьшение длительности дебаффов
    const debuffReduction = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('reduction', 'debuffs') : 0;
    const finalDuration = Math.max(0.5, def.duration * (1 - debuffReduction));
    
    // Специальные эффекты дебаффов
    if (def.id === 'rapid') {
      this._oldSpeed = this.state.CONFIG?.rotationSpeed || 0.005;
      if (this.state.CONFIG) {
        this.state.CONFIG.rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
      }
    }
    
    if (def.id === 'lock') {
      s.blockedUntil = Date.now() + finalDuration * 1000;
    }
    
    // ИСПРАВЛЕНИЕ 15: Правильная установка freeze дебаффа
    if (def.id === 'freeze') {
      this.state.effectStates.frozenCombo = true;
    }
    
    if (def.id === 'taxCollector') {
      this.startTaxCollector(finalDuration);
    }
    
    const debuffTimeout = this.createTimeout(() => {
      this.removeDebuff(def.id);
      EventBus.emit('debuffExpired', eventData);
      
      if (def.id === 'rapid') {
        if (this.state.CONFIG) {
          this.state.CONFIG.rotationSpeed = this._oldSpeed || 0.005;
        }
      }
      
      if (def.id === 'freeze') {
        this.state.effectStates.frozenCombo = false;
      }
      
      if (def.id === 'taxCollector') {
        this.stopTaxCollector();
      }
      
      if (def.id === 'heavyClick') {
        this.state.effectStates.heavyClickRequired = {};
      }
    }, finalDuration * 1000);
    
    if (debuffTimeout) {
      this.debuffIntervals.set(`${def.id}_timeout`, debuffTimeout);
    }
  }

  removeDebuff(debuffId) {
    if (this.isDestroyed) return;
    this.state.debuffs = this.state.debuffs.filter(id => id !== debuffId);
    this.clearDebuffInterval(debuffId);
    this.clearDebuffInterval(`${debuffId}_timeout`);
  }

  startTaxCollector(duration) {
    this.clearDebuffInterval('taxCollector');
    
    const taxInterval = this.createInterval(() => {
      const taxPercent = EFFECT_CONFIG.taxCollector.taxPercent;
      const resourceKeys = Object.keys(this.state.resources);
      
      resourceKeys.forEach(resource => {
        const currentAmount = this.state.resources[resource];
        const taxAmount = Math.floor(currentAmount * taxPercent);
        this.state.resources[resource] = Math.max(0, currentAmount - taxAmount);
      });
      
      EventBus.emit('taxCollected', { percent: taxPercent * 100 });
      EventBus.emit('resourceChanged');
    }, EFFECT_CONFIG.taxCollector.intervalMs);
    
    if (taxInterval) {
      this.debuffIntervals.set('taxCollector', taxInterval);
    }
  }

  stopTaxCollector() {
    this.clearDebuffInterval('taxCollector');
  }

  // ИСПРАВЛЕНИЕ 2: Полная очистка всех эффектов с защитой от утечек
  stopAllEffects() {
    this.isDestroyed = true;
    
    // Очищаем все интервалы баффов
    for (const [key, interval] of this.buffIntervals) {
      clearInterval(interval);
      clearTimeout(interval);
    }
    this.buffIntervals.clear();
    
    // Очищаем все интервалы дебаффов
    for (const [key, interval] of this.debuffIntervals) {
      clearInterval(interval);
      clearTimeout(interval);
    }
    this.debuffIntervals.clear();
    
    // ИСПРАВЛЕНИЕ 2: Очищаем все отслеживаемые таймауты и интервалы
    for (const timeoutId of this.allTimeouts) {
      clearTimeout(timeoutId);
    }
    this.allTimeouts.clear();
    
    for (const intervalId of this.allIntervals) {
      clearInterval(intervalId);
    }
    this.allIntervals.clear();
    
    // Восстанавливаем скорость вращения если она была изменена
    if (this.state.CONFIG && this._oldSpeed) {
      this.state.CONFIG.rotationSpeed = this._oldSpeed;
    }
    
    // Очищаем временные эффекты
    this.state.buffs = [];
    this.state.debuffs = [];
    this.state.blockedUntil = 0;
    this.state.effectStates = this.getDefaultEffectStates();
    
    console.log('🧹 BuffManager полностью очищен');
  }
}