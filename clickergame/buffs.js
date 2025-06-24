// buffs.js - Модуль управления баффами и дебаффами
import { EventBus } from './eventBus.js';
import { RESOURCES } from './config.js';

// Улучшенные определения баффов с балансом
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
  // НОВЫЕ БАФФЫ
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
  // НОВЫЕ ДЕБАФФЫ
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

// Конфигурация эффектов
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
    damagePercent: 0.1 // 10% урон
  },
  waterfall: {
    intervalMs: 1000,
    amount: 1
  },
  // НОВЫЕ ЭФФЕКТЫ
  speedBoost: {
    speedMultiplier: 0.5 // 50% от обычной скорости
  },
  starPower: {
    clicksCount: 10,
    bonusAmount: 5
  },
  slotMachine: {
    chance: 0.3, // 30% шанс
    amount: 3
  },
  shield: {
    blocksCount: 3
  },
  taxCollector: {
    intervalMs: 3000,
    taxPercent: 0.05 // 5%
  },
  heavyClick: {
    requiredClicks: 3
  }
};

export class BuffManager {
  constructor(state) {
    this.state = state;
    this.buffIntervals = {};
    this.debuffIntervals = {};
    
    // Инициализация состояний для новых эффектов
    if (!this.state.effectStates) {
      this.state.effectStates = {
        starPowerClicks: 0,
        shieldBlocks: 0,
        heavyClickRequired: {},
        reverseDirection: 1,
        frozenCombo: false
      };
    }
  }

  getBuff(id) {
    return BUFF_DEFS.find(b => b.id === id);
  }

  getDebuff(id) {
    return DEBUFF_DEFS.find(d => d.id === id);
  }

  applyBuff(def) {
    const s = this.state;
    
    // ИСПРАВЛЕНО: всегда используем def.name для уведомлений
    EventBus.emit('buffApplied', { id: def.id, name: def.name });

    // Buff Mastery (✨) - увеличение длительности баффов
    const buffDurationBonus = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('duration', 'buffs') : 0;
    const durationMultiplier = 1 + buffDurationBonus;

    switch (def.id) {
      case 'frenzy':
      case 'lucky':
      case 'doubleTap':
      case 'slotMachine':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
          setTimeout(() => {
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', { id: def.id, name: def.name });
          }, finalDuration);
        }
        break;

      case 'speedBoost':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          this._oldSpeed = this.state.CONFIG?.rotationSpeed || 0.005;
          if (this.state.CONFIG) {
            this.state.CONFIG.rotationSpeed *= EFFECT_CONFIG.speedBoost.speedMultiplier;
          }
          
          const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
          setTimeout(() => {
            if (this.state.CONFIG) {
              this.state.CONFIG.rotationSpeed = this._oldSpeed || 0.005;
            }
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', { id: def.id, name: def.name });
          }, finalDuration);
        }
        break;

      case 'starPower':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          this.state.effectStates.starPowerClicks = EFFECT_CONFIG.starPower.clicksCount;
          // Этот бафф не имеет таймера, он истекает после использования всех кликов
        }
        break;

      case 'shield':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          this.state.effectStates.shieldBlocks = EFFECT_CONFIG.shield.blocksCount;
          // Этот бафф не имеет таймера, он истекает после блокировки дебаффов
        }
        break;

      case 'waterfall':
        if (this.buffIntervals.waterfall) {
          clearInterval(this.buffIntervals.waterfall);
        }
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          const intervalMs = EFFECT_CONFIG.waterfall.intervalMs;
          const amount     = EFFECT_CONFIG.waterfall.amount;
          this.buffIntervals.waterfall = setInterval(() => {
            const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
            const res  = pool[Math.floor(Math.random() * pool.length)];
            s.resources[res] += amount;
            EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
          }, intervalMs);
          
          const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
          setTimeout(() => {
            clearInterval(this.buffIntervals.waterfall);
            delete this.buffIntervals.waterfall;
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', { id: def.id, name: def.name });
          }, finalDuration);
        }
        break;

      case 'roll':
        const poolR  = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
        const outcome = Math.random();
        let   message = 'Roll: ';
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
        // ИСПРАВЛЕНО: используем правильное имя для уведомления
        EventBus.emit('tempNotification', `${def.name}: ${message}`);
        break;

      case 'mysteryBox':
        const poolM = RESOURCES;
        const opts  = [];
        while (opts.length < 3) {
          const r = poolM[Math.floor(Math.random() * poolM.length)];
          if (!opts.includes(r)) opts.push(r);
        }
        EventBus.emit('mysteryBox', opts);
        break;
    }
  }

  applyDebuff(def) {
    const s = this.state;
    
    // Shield buff блокирует дебаффы
    if (s.buffs.includes('shield') && this.state.effectStates.shieldBlocks > 0) {
      this.state.effectStates.shieldBlocks--;
      EventBus.emit('shieldBlock', { 
        debuff: def.name, // Используем name вместо id
        remaining: this.state.effectStates.shieldBlocks 
      });
      
      if (this.state.effectStates.shieldBlocks <= 0) {
        s.buffs = s.buffs.filter(id => id !== 'shield');
        const shieldDef = this.getBuff('shield');
        EventBus.emit('buffExpired', { id: 'shield', name: shieldDef.name });
      }
      return;
    }
    
    // ИСПРАВЛЕНО: всегда используем def.name для уведомлений
    EventBus.emit('debuffApplied', { id: def.id, name: def.name });

    if (def.id === 'explosion') {
      const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
      const res  = pool[Math.floor(Math.random() * pool.length)];
      const old = s.resources[res];
      
      // Efficient Storage (📦) - защита от взрывов
      const explosionProtection = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('protection', 'explosion') : 0;
      const baseDamage = EFFECT_CONFIG.explosion.damagePercent;
      const finalDamage = baseDamage * (1 - explosionProtection);
      
      s.resources[res] = Math.max(0, Math.floor(old * (1 - finalDamage)));
      const actualLoss = old - s.resources[res];
      
      if (explosionProtection > 0) {
        EventBus.emit('tempNotification', 
          `${def.name}: Lost ${actualLoss} ${res} (Protected by ${Math.floor(explosionProtection * 100)}%)`);
      } else {
        EventBus.emit('tempNotification', `${def.name}: Lost ${actualLoss} ${res}`);
      }
      
      EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
      return;
    }

    if (!s.debuffs) s.debuffs = [];
    if (!s.debuffs.includes(def.id)) {
      s.debuffs.push(def.id);
      
      // Resilience (🛡️) - уменьшение длительности дебаффов
      const debuffReduction = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('reduction', 'debuffs') : 0;
      const finalDuration = Math.max(0.5, def.duration * (1 - debuffReduction));
      
      // Специальные эффекты дебаффов
      if (def.id === 'rapid') {
        this._oldSpeed = this.state.CONFIG?.rotationSpeed || 0.005;
        if (this.state.CONFIG) {
          this.state.CONFIG.rotationSpeed *= 5;
        }
      }
      
      if (def.id === 'lock') {
        s.blockedUntil = Date.now() + finalDuration * 1000;
      }
      
      if (def.id === 'taxCollector') {
        this.startTaxCollector(finalDuration);
      }
      
      setTimeout(() => {
        s.debuffs = s.debuffs.filter(id => id !== def.id);
        EventBus.emit('debuffExpired', { id: def.id, name: def.name });
        
        if (def.id === 'rapid') {
          if (this.state.CONFIG) {
            this.state.CONFIG.rotationSpeed = this._oldSpeed || 0.005;
          }
        }
        
        if (def.id === 'taxCollector') {
          this.stopTaxCollector();
        }
        
        if (def.id === 'heavyClick') {
          // Очищаем состояние heavy click
          this.state.effectStates.heavyClickRequired = {};
        }
      }, finalDuration * 1000);
    }
  }

  startTaxCollector(duration) {
    if (this.debuffIntervals.taxCollector) {
      clearInterval(this.debuffIntervals.taxCollector);
    }
    
    this.debuffIntervals.taxCollector = setInterval(() => {
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
  }

  stopTaxCollector() {
    if (this.debuffIntervals.taxCollector) {
      clearInterval(this.debuffIntervals.taxCollector);
      delete this.debuffIntervals.taxCollector;
    }
  }

  stopAllEffects() {
    // Останавливаем все интервалы баффов
    Object.values(this.buffIntervals).forEach(interval => clearInterval(interval));
    this.buffIntervals = {};
    
    // Останавливаем все интервалы дебаффов
    Object.values(this.debuffIntervals).forEach(interval => clearInterval(interval));
    this.debuffIntervals = {};
  }
}