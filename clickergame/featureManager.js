// featureManager.js - исправленная версия с работающими баффами и новыми эффектами
import { EventBus } from './eventBus.js';
import { Zone }      from './zones.js';
import {
  CONFIG,
  ZONE_COUNT,
  BUFF_DEFS,
  DEBUFF_DEFS,
  RESOURCES,
  EFFECT_CONFIG
} from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    if (typeof this.state.targetZone !== 'number') {
      this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
    }
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
    
    this.initZones();
  }

  initZones() {
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click || [])
        .filter(h => h !== this.clickHandler);
    }

    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => {
      const now = Date.now();
      if (now < this.state.blockedUntil) return;

      // Ghost Click debuff - 50% шанс игнорировать клик
      if (this.state.debuffs && this.state.debuffs.includes('ghost') && Math.random() < 0.5) {
        EventBus.emit('ghostClick');
        return;
      }

      const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      const z = this.zones.find(z => z.contains(normalizedAngle));
      if (!z) return;

      // Heavy Click debuff - требуется несколько кликов
      if (this.state.debuffs && this.state.debuffs.includes('heavyClick')) {
        const required = EFFECT_CONFIG.heavyClick.requiredClicks;
        const zoneKey = `zone_${z.index}`;
        this.state.effectStates.heavyClickRequired[zoneKey] = 
          (this.state.effectStates.heavyClickRequired[zoneKey] || 0) + 1;
        
        if (this.state.effectStates.heavyClickRequired[zoneKey] < required) {
          EventBus.emit('heavyClickProgress', {
            current: this.state.effectStates.heavyClickRequired[zoneKey],
            required: required
          });
          return;
        } else {
          // Сбрасываем счетчик после успешного клика
          this.state.effectStates.heavyClickRequired[zoneKey] = 0;
        }
      }

      // COMBO LOGIC с поддержкой навыков и заморозки
      this.state.combo.lastAngle = normalizedAngle;
      
      // Time Stretch (⏰) - увеличение времени комбо
      const extraTime = this.state.skillManager.getSkillBonus('duration', 'combo_timeout');
      const comboTimeout = CONFIG.comboTimeout + extraTime;
      
      // Freeze debuff - комбо не растет
      const isComboFrozen = this.state.debuffs && this.state.debuffs.includes('freeze');
      
      if (z.index === this.state.targetZone && now < this.state.combo.deadline && !isComboFrozen) {
        this.state.combo.count++;
      } else if (!isComboFrozen) {
        // Steady Hand (🎯) - защита от промаха
        if (z.index !== this.state.targetZone && this.state.skillManager.canUseMissProtection()) {
          this.state.skillManager.useMissProtection();
          // Комбо не сбрасывается благодаря навыку
          EventBus.emit('missProtectionUsed');
        } else {
          this.state.combo.count = 1;
        }
      }
      
      this.state.combo.lastZone   = z.index;
      this.state.combo.deadline   = now + comboTimeout;
      
      // Combo Master (🔥) - увеличение эффективности комбо
      const comboMultiplier = 1 + this.state.skillManager.getSkillBonus('multiplier', 'combo');
      const effectiveCombo = Math.floor(this.state.combo.count * comboMultiplier);
      
      EventBus.emit('comboChanged', this.state.combo.count);

      // GOLD CALCULATION с навыками и баффами
      let clickMultiplier = 1;
      
      // Double Tap buff - каждый клик считается как 2
      if (this.state.buffs.includes('doubleTap')) {
        clickMultiplier = 2;
      }
      
      let gain = effectiveCombo * clickMultiplier;
      
      // Golden Touch (💰) - множитель золота
      const goldMultiplier = 1 + this.state.skillManager.getSkillBonus('multiplier', 'gold');
      gain = Math.floor(gain * goldMultiplier);
      
      // ИСПРАВЛЕНО: Frenzy buff - удваивает золото
      if (this.state.buffs.includes('frenzy')) {
        gain *= 2;
      }
      
      // Critical Strike (💥) - шанс критического удара
      const critChance = this.state.skillManager.getSkillBonus('chance', 'critical');
      if (Math.random() < critChance) {
        gain *= 2;
        EventBus.emit('criticalHit', { damage: gain });
      }
      
      this.state.resources.gold += gain;
      
      // Star Power buff - бонус к случайному ресурсу
      if (this.state.buffs.includes('starPower') && this.state.effectStates.starPowerClicks > 0) {
        const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = EFFECT_CONFIG.starPower.bonusAmount;
        this.state.resources[randomResource] += bonusAmount;
        this.state.effectStates.starPowerClicks--;
        
        EventBus.emit('starPowerUsed', { 
          resource: randomResource, 
          amount: bonusAmount,
          remaining: this.state.effectStates.starPowerClicks
        });
        
        // Если заряды закончились, удаляем бафф
        if (this.state.effectStates.starPowerClicks <= 0) {
          this.state.buffs = this.state.buffs.filter(id => id !== 'starPower');
          EventBus.emit('buffExpired', 'starPower');
        }
      }
      
      // Slot Machine buff - шанс получить случайный ресурс
      if (this.state.buffs.includes('slotMachine') && Math.random() < EFFECT_CONFIG.slotMachine.chance) {
        const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = EFFECT_CONFIG.slotMachine.amount;
        this.state.resources[randomResource] += bonusAmount;
        EventBus.emit('slotMachineWin', { resource: randomResource, amount: bonusAmount });
      }
      
      // Resource Finder (🔍) - шанс получить случайный ресурс
      const bonusChance = this.state.skillManager.getSkillBonus('chance', 'bonus_resource');
      if (Math.random() < bonusChance) {
        const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = Math.max(1, Math.floor(effectiveCombo * 0.5));
        this.state.resources[randomResource] += bonusAmount;
        EventBus.emit('bonusResourceFound', { resource: randomResource, amount: bonusAmount });
      }
      
      EventBus.emit('resourceChanged', { resource: 'gold', amount: this.state.resources.gold });

      // ZONE SHUFFLE с учетом Reverse Controls
      if (z.index === this.state.targetZone && Math.random() * 100 < CONFIG.zoneShuffleChance) {
        // Reverse Controls debuff меняет направление движения зоны
        if (this.state.debuffs && this.state.debuffs.includes('reverseControls')) {
          // Двигаемся в обратном направлении
          this.state.targetZone = (this.state.targetZone - 1 + ZONE_COUNT) % ZONE_COUNT;
        } else {
          // Обычное случайное движение
          this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
        }
        EventBus.emit('zonesShuffled', this.state.targetZone);
      }

      // BUFF / DEBUFF CHANCE с навыками и исправленным Lucky баффом
      const { baseChance, chanceRange } = CONFIG;
      if (Math.random() * 100 < baseChance) {
        const minVar     = -chanceRange.min;
        const maxVar     =  chanceRange.max;
        const variation  = Math.random() * (maxVar - minVar) + minVar;
        
        // Lucky Charm (🍀) - увеличение шанса баффов
        const buffChanceBonus = this.state.skillManager.getSkillBonus('chance', 'buff') * 100;
        
        // ИСПРАВЛЕНО: Lucky buff увеличивает шанс баффов
        const luckyBonus = this.state.buffs.includes('lucky') ? 25 : 0;
        
        // Inner Peace (☮️) - снижение влияния хаоса
        const chaosReduction = this.state.skillManager.getSkillBonus('reduction', 'chaos');
        const effectiveChaos = Math.max(0, this.state.resources.chaos * (1 - chaosReduction));
        
        let buffChance = baseChance + (this.state.resources.faith - effectiveChaos) + variation + buffChanceBonus + luckyBonus;
        buffChance = Math.max(0, Math.min(100, buffChance));

        if (Math.random() * 100 < buffChance) {
          const def = BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)];
          this.applyBuff(def);
        } else {
          const def = DEBUFF_DEFS[Math.floor(Math.random() * DEBUFF_DEFS.length)];
          this.applyDebuff(def);
        }
      }
    };

    EventBus.subscribe('click', this.clickHandler);
  }

  applyBuff(def) {
    const s = this.state;
    EventBus.emit('buffApplied', def.id);

    // Buff Mastery (✨) - увеличение длительности баффов
    const buffDurationBonus = this.state.skillManager.getSkillBonus('duration', 'buffs');
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
            EventBus.emit('buffExpired', def.id);
          }, finalDuration);
        }
        break;

      case 'speedBoost':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          this._oldSpeed = CONFIG.rotationSpeed;
          CONFIG.rotationSpeed *= EFFECT_CONFIG.speedBoost.speedMultiplier;
          
          const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
          setTimeout(() => {
            CONFIG.rotationSpeed = this._oldSpeed || 0.005;
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
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
            EventBus.emit('buffExpired', def.id);
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
        this.showTempNotification(message);
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
      EventBus.emit('shieldBlock', { debuff: def.id, remaining: this.state.effectStates.shieldBlocks });
      
      if (this.state.effectStates.shieldBlocks <= 0) {
        s.buffs = s.buffs.filter(id => id !== 'shield');
        EventBus.emit('buffExpired', 'shield');
      }
      return;
    }
    
    EventBus.emit('debuffApplied', def.id);

    if (def.id === 'explosion') {
      const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
      const res  = pool[Math.floor(Math.random() * pool.length)];
      const old = s.resources[res];
      
      // Efficient Storage (📦) - защита от взрывов
      const explosionProtection = this.state.skillManager.getSkillBonus('protection', 'explosion');
      const baseDamage = EFFECT_CONFIG.explosion.damagePercent;
      const finalDamage = baseDamage * (1 - explosionProtection);
      
      s.resources[res] = Math.max(0, Math.floor(old * (1 - finalDamage)));
      const actualLoss = old - s.resources[res];
      
      if (explosionProtection > 0) {
        this.showTempNotification(`💣 Lost ${actualLoss} ${res} (Protected by ${Math.floor(explosionProtection * 100)}%)`);
      } else {
        this.showTempNotification(`💣 Lost ${actualLoss} ${res}`);
      }
      
      EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
      return;
    }

    if (!s.debuffs) s.debuffs = [];
    if (!s.debuffs.includes(def.id)) {
      s.debuffs.push(def.id);
      
      // Resilience (🛡️) - уменьшение длительности дебаффов
      const debuffReduction = this.state.skillManager.getSkillBonus('reduction', 'debuffs');
      const finalDuration = Math.max(0.5, def.duration * (1 - debuffReduction));
      
      // Специальные эффекты дебаффов
      if (def.id === 'rapid') {
        this._oldSpeed = CONFIG.rotationSpeed;
        CONFIG.rotationSpeed *= 5;
      }
      
      if (def.id === 'lock') {
        s.blockedUntil = Date.now() + finalDuration * 1000;
      }
      
      if (def.id === 'taxCollector') {
        this.startTaxCollector(finalDuration);
      }
      
      setTimeout(() => {
        s.debuffs = s.debuffs.filter(id => id !== def.id);
        EventBus.emit('debuffExpired', def.id);
        
        if (def.id === 'rapid') {
          CONFIG.rotationSpeed = this._oldSpeed || 0.005;
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

  shuffleZones() {
    const arr = this.zones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
      arr[i].index = i;
      arr[j].index = j;
    }
  }

  showTempNotification(msg) {
    EventBus.emit('buffApplied', msg);
  }
}