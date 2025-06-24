// featureManager.js - Обновленная версия с BuffManager
import { EventBus } from './eventBus.js';
import { Zone } from './zones.js';
import { BuffManager, BUFF_DEFS, DEBUFF_DEFS } from './buffs.js';
import {
  CONFIG,
  ZONE_COUNT,
  RESOURCES
} from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    if (typeof this.state.targetZone !== 'number') {
      this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
    }
    
    // Создаем BuffManager
    this.buffManager = new BuffManager(state);
    
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
        const required = 3; // EFFECT_CONFIG.heavyClick.requiredClicks
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
      const extraTime = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('duration', 'combo_timeout') : 0;
      const comboTimeout = CONFIG.comboTimeout + extraTime;
      
      // Freeze debuff - комбо не растет
      const isComboFrozen = this.state.debuffs && this.state.debuffs.includes('freeze');
      
      if (z.index === this.state.targetZone && now < this.state.combo.deadline && !isComboFrozen) {
        this.state.combo.count++;
      } else if (!isComboFrozen) {
        // Steady Hand (🎯) - защита от промаха
        if (z.index !== this.state.targetZone && this.state.skillManager && 
            this.state.skillManager.canUseMissProtection()) {
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
      const comboMultiplier = this.state.skillManager ? 
        1 + this.state.skillManager.getSkillBonus('multiplier', 'combo') : 1;
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
      const goldMultiplier = this.state.skillManager ? 
        1 + this.state.skillManager.getSkillBonus('multiplier', 'gold') : 1;
      gain = Math.floor(gain * goldMultiplier);
      
      // ИСПРАВЛЕНО: Frenzy buff - удваивает золото
      if (this.state.buffs.includes('frenzy')) {
        gain *= 2;
      }
      
      // Critical Strike (💥) - шанс критического удара
      const critChance = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('chance', 'critical') : 0;
      if (Math.random() < critChance) {
        gain *= 2;
        EventBus.emit('criticalHit', { damage: gain });
      }
      
      this.state.resources.gold += gain;
      
      // Star Power buff - бонус к случайному ресурсу
      if (this.state.buffs.includes('starPower') && this.state.effectStates.starPowerClicks > 0) {
        const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = 5; // EFFECT_CONFIG.starPower.bonusAmount
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
          const starPowerDef = this.buffManager.getBuff('starPower');
          EventBus.emit('buffExpired', { id: 'starPower', name: starPowerDef.name });
        }
      }
      
      // Slot Machine buff - шанс получить случайный ресурс
      if (this.state.buffs.includes('slotMachine') && Math.random() < 0.3) {
        const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = 3; // EFFECT_CONFIG.slotMachine.amount
        this.state.resources[randomResource] += bonusAmount;
        EventBus.emit('slotMachineWin', { resource: randomResource, amount: bonusAmount });
      }
      
      // Resource Finder (🔍) - шанс получить случайный ресурс
      const bonusChance = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('chance', 'bonus_resource') : 0;
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
        const buffChanceBonus = this.state.skillManager ? 
          this.state.skillManager.getSkillBonus('chance', 'buff') * 100 : 0;
        
        // ИСПРАВЛЕНО: Lucky buff увеличивает шанс баффов
        const luckyBonus = this.state.buffs.includes('lucky') ? 25 : 0;
        
        // Inner Peace (☮️) - снижение влияния хаоса
        const chaosReduction = this.state.skillManager ? 
          this.state.skillManager.getSkillBonus('reduction', 'chaos') : 0;
        const effectiveChaos = Math.max(0, this.state.resources.chaos * (1 - chaosReduction));
        
        let buffChance = baseChance + (this.state.resources.faith - effectiveChaos) + variation + buffChanceBonus + luckyBonus;
        buffChance = Math.max(0, Math.min(100, buffChance));

        if (Math.random() * 100 < buffChance) {
          const def = BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)];
          this.buffManager.applyBuff(def);
        } else {
          const def = DEBUFF_DEFS[Math.floor(Math.random() * DEBUFF_DEFS.length)];
          this.buffManager.applyDebuff(def);
        }
      }
    };

    EventBus.subscribe('click', this.clickHandler);
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

  stopAllEffects() {
    if (this.buffManager) {
      this.buffManager.stopAllEffects();
    }
  }
}