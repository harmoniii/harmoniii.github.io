// featureManager.js - исправленная версия с работающими навыками
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

      const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      const z = this.zones.find(z => z.contains(normalizedAngle));
      if (!z) return;

      // COMBO LOGIC с поддержкой навыков
      this.state.combo.lastAngle = normalizedAngle;
      
      // Time Stretch (⏰) - увеличение времени комбо
      const extraTime = this.state.skillManager.getSkillBonus('duration', 'combo_timeout');
      const comboTimeout = CONFIG.comboTimeout + extraTime;
      
      if (z.index === this.state.targetZone && now < this.state.combo.deadline) {
        this.state.combo.count++;
      } else {
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

      // GOLD CALCULATION с навыками
      let gain = effectiveCombo;
      
      // Golden Touch (💰) - множитель золота
      const goldMultiplier = 1 + this.state.skillManager.getSkillBonus('multiplier', 'gold');
      gain = Math.floor(gain * goldMultiplier);
      
      // Frenzy buff
      if (this.state.buffs.includes('frenzy')) gain *= 2;
      
      // Critical Strike (💥) - шанс критического удара
      const critChance = this.state.skillManager.getSkillBonus('chance', 'critical');
      if (Math.random() < critChance) {
        gain *= 2;
        EventBus.emit('criticalHit', { damage: gain });
      }
      
      this.state.resources.gold += gain;
      
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

      // ZONE SHUFFLE
      if (z.index === this.state.targetZone && Math.random() * 100 < CONFIG.zoneShuffleChance) {
        this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
        EventBus.emit('zonesShuffled', this.state.targetZone);
      }

      // BUFF / DEBUFF CHANCE с навыками
      const { baseChance, chanceRange } = CONFIG;
      if (Math.random() * 100 < baseChance) {
        const minVar     = -chanceRange.min;
        const maxVar     =  chanceRange.max;
        const variation  = Math.random() * (maxVar - minVar) + minVar;
        
        // Lucky Charm (🍀) - увеличение шанса баффов
        const buffChanceBonus = this.state.skillManager.getSkillBonus('chance', 'buff') * 100;
        
        // Inner Peace (☮️) - снижение влияния хаоса
        const chaosReduction = this.state.skillManager.getSkillBonus('reduction', 'chaos');
        const effectiveChaos = Math.max(0, this.state.resources.chaos * (1 - chaosReduction));
        
        let buffChance = baseChance + (this.state.resources.faith - effectiveChaos) + variation + buffChanceBonus;
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
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          const finalDuration = Math.floor(def.duration * durationMultiplier * 1000);
          setTimeout(() => {
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
          }, finalDuration);
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
      
      if (def.id === 'rapid') {
        this._oldSpeed     = CONFIG.rotationSpeed;
        CONFIG.rotationSpeed *= 5;
      }
      if (def.id === 'lock') {
        s.blockedUntil = Date.now() + finalDuration * 1000;
      }
      
      setTimeout(() => {
        s.debuffs = s.debuffs.filter(id => id !== def.id);
        EventBus.emit('debuffExpired', def.id);
        if (def.id === 'rapid') {
          CONFIG.rotationSpeed = this._oldSpeed || 0.005;
        }
      }, finalDuration * 1000);
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