// featureManager.js - Исправленная версия с фиксами всех основных проблем
import { EventBus } from './eventBus.js';
import { Zone } from './zones.js';
import { BuffManager, BUFF_DEFS, DEBUFF_DEFS } from './buffs.js';
import { CONFIG, ZONE_COUNT, RESOURCES, GAME_CONSTANTS } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.isDestroyed = false; // ИСПРАВЛЕНИЕ 2: Флаг для предотвращения утечек
    this.clickHandler = null; // ИСПРАВЛЕНИЕ 11: Отслеживание обработчика
    
    // Инициализация зон
    if (typeof this.state.targetZone !== 'number') {
      this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
    }
    
    // ИСПРАВЛЕНИЕ 4: Правильная инициализация для Reverse Controls
    if (typeof this.state.previousTargetZone !== 'number') {
      this.state.previousTargetZone = this.state.targetZone;
    }
    
    // ИСПРАВЛЕНИЕ 9: Проверяем состояние перед созданием BuffManager
    if (!this.state.buffManager && !this.isDestroyed) {
      this.buffManager = new BuffManager(state);
      this.state.buffManager = this.buffManager;
    } else if (this.state.buffManager) {
      this.buffManager = this.state.buffManager;
    }
    
    this.initZones();
  }

  initZones() {
    if (this.isDestroyed) return;
    
    // ИСПРАВЛЕНИЕ 11: Правильная очистка старых обработчиков
    if (this.clickHandler) {
      EventBus.unsubscribe('click', this.clickHandler);
      this.clickHandler = null;
    }

    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => this.handleClick(angle);
    EventBus.subscribe('click', this.clickHandler);
  }

  handleClick(angle) {
    if (this.isDestroyed) return;
    
    const now = Date.now();
    if (now < (this.state.blockedUntil || 0)) return;

    // Ghost Click debuff - 50% шанс игнорировать клик
    if (this.state.debuffs && this.state.debuffs.includes('ghost') && 
        Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      EventBus.emit('ghostClick');
      return;
    }

    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const z = this.zones.find(z => z.contains(normalizedAngle));
    if (!z) return;

    // ИСПРАВЛЕНИЕ 6, 8: Правильная обработка Heavy Click с очисткой
    if (this.state.debuffs && this.state.debuffs.includes('heavyClick')) {
      if (!this.handleHeavyClick(z)) {
        return; // Клик не засчитан
      }
    }

    // ИСПРАВЛЕНИЕ 14, 15: Правильная обработка комбо с учетом freeze
    this.handleCombo(z, normalizedAngle, now);

    // Расчет золота и эффектов
    this.handleGoldAndEffects(z, now);

    // ИСПРАВЛЕНИЕ 4: Улучшенная логика ZONE SHUFFLE с правильным Reverse Controls
    this.handleZoneShuffle(z);

    // Обработка баффов/дебаффов
    this.handleBuffDebuffChance();
  }

  // ИСПРАВЛЕНИЕ 6, 8: Исправленная логика Heavy Click
  handleHeavyClick(zone) {
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const zoneKey = `zone_${zone.index}`;
    
    // Инициализируем объект если его нет
    if (!this.state.effectStates.heavyClickRequired) {
      this.state.effectStates.heavyClickRequired = {};
    }
    
    // ИСПРАВЛЕНИЕ 8: Сбрасываем счетчики для всех остальных зон при клике по новой зоне
    Object.keys(this.state.effectStates.heavyClickRequired).forEach(key => {
      if (key !== zoneKey) {
        this.state.effectStates.heavyClickRequired[key] = 0;
      }
    });
    
    // Увеличиваем счетчик для текущей зоны
    const currentCount = this.state.effectStates.heavyClickRequired[zoneKey] || 0;
    this.state.effectStates.heavyClickRequired[zoneKey] = currentCount + 1;
    
    if (this.state.effectStates.heavyClickRequired[zoneKey] < required) {
      EventBus.emit('heavyClickProgress', {
        current: this.state.effectStates.heavyClickRequired[zoneKey],
        required: required,
        zone: zone.index
      });
      return false; // Клик не засчитан
    } else {
      // ИСПРАВЛЕНИЕ 8: Сбрасываем счетчик после успешного клика
      this.state.effectStates.heavyClickRequired[zoneKey] = 0;
      return true; // Клик засчитан
    }
  }

  // ИСПРАВЛЕНИЕ 14, 15: Правильная обработка комбо
  handleCombo(zone, normalizedAngle, now) {
    this.state.combo.lastAngle = normalizedAngle;
    
    // Time Stretch (⏰) - увеличение времени комбо
    const extraTime = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('duration', 'combo_timeout') : 0;
    const comboTimeout = CONFIG.comboTimeout + extraTime;
    
    // ИСПРАВЛЕНИЕ 15: Правильная проверка заморозки комбо
    const isComboFrozen = this.state.debuffs && this.state.debuffs.includes('freeze');
    
    // ИСПРАВЛЕНИЕ 14: Защита от проблем с таймингом
    const safeNow = Math.max(now, this.state.combo.deadline || 0);
    
    if (zone.index === this.state.targetZone && safeNow < (this.state.combo.deadline || 0) && !isComboFrozen) {
      this.state.combo.count++;
    } else if (!isComboFrozen) {
      // Steady Hand (🎯) - защита от промаха
      if (zone.index !== this.state.targetZone && this.state.skillManager && 
          this.state.skillManager.canUseMissProtection()) {
        this.state.skillManager.useMissProtection();
        EventBus.emit('missProtectionUsed');
      } else {
        this.state.combo.count = 1;
      }
    }
    
    this.state.combo.lastZone = zone.index;
    this.state.combo.deadline = safeNow + comboTimeout;
    
    // Ограничиваем комбо максимальным значением
    this.state.combo.count = Math.min(this.state.combo.count, GAME_CONSTANTS.MAX_COMBO_COUNT);
    
    // Combo Master (🔥) - увеличение эффективности комбо
    const comboMultiplier = this.state.skillManager ? 
      1 + this.state.skillManager.getSkillBonus('multiplier', 'combo') : 1;
    const effectiveCombo = Math.floor(this.state.combo.count * comboMultiplier);
    
    EventBus.emit('comboChanged', this.state.combo.count);
    return effectiveCombo;
  }

  handleGoldAndEffects(zone, now) {
    // Получаем эффективное комбо
    const effectiveCombo = this.handleCombo(zone, 0, now);
    
    let clickMultiplier = 1;
    
    // Double Tap buff - каждый клик считается как 2
    if (this.state.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let gain = effectiveCombo * clickMultiplier;
    
    // Golden Touch (💰) - множитель золота
    const goldMultiplier = this.state.skillManager ? 
      1 + this.state.skillManager.getSkillBonus('multiplier', 'gold') : 1;
    gain = Math.floor(gain * goldMultiplier);
    
    // ИСПРАВЛЕНИЕ 13: Правильная работа Frenzy buff
    if (this.state.buffs.includes('frenzy')) {
      gain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
    }
    
    // Critical Strike (💥) - шанс критического удара
    const critChance = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('chance', 'critical') : 0;
    if (Math.random() < critChance) {
      gain *= 2;
      EventBus.emit('criticalHit', { damage: gain });
    }
    
    // Проверяем на переполнение ресурсов
    const newGoldAmount = Math.min(
      this.state.resources.gold + gain, 
      GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
    );
    this.state.resources.gold = newGoldAmount;
    
    // Star Power buff - бонус к случайному ресурсу
    this.handleStarPower();
    
    // Slot Machine buff - шанс получить случайный ресурс
    this.handleSlotMachine();
    
    // Resource Finder (🔍) - шанс получить случайный ресурс
    this.handleResourceFinder(effectiveCombo);
    
    EventBus.emit('resourceChanged', { resource: 'gold', amount: this.state.resources.gold });
  }

  handleStarPower() {
    if (this.state.buffs.includes('starPower') && this.state.effectStates.starPowerClicks > 0) {
      const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = GAME_CONSTANTS.STAR_POWER_BONUS;
      
      const newAmount = Math.min(
        this.state.resources[randomResource] + bonusAmount,
        GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
      );
      this.state.resources[randomResource] = newAmount;
      
      this.state.effectStates.starPowerClicks--;
      
      EventBus.emit('starPowerUsed', { 
        resource: randomResource, 
        amount: bonusAmount,
        remaining: this.state.effectStates.starPowerClicks
      });
      
      // Если заряды закончились, удаляем бафф
      if (this.state.effectStates.starPowerClicks <= 0) {
        this.state.buffs = this.state.buffs.filter(id => id !== 'starPower');
        const starPowerDef = this.buffManager?.getBuff('starPower');
        if (starPowerDef) {
          EventBus.emit('buffExpired', { id: 'starPower', name: starPowerDef.name });
        }
      }
    }
  }

  handleSlotMachine() {
    if (this.state.buffs.includes('slotMachine') && Math.random() < GAME_CONSTANTS.SLOT_MACHINE_CHANCE) {
      const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = GAME_CONSTANTS.SLOT_MACHINE_AMOUNT;
      
      const newAmount = Math.min(
        this.state.resources[randomResource] + bonusAmount,
        GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
      );
      this.state.resources[randomResource] = newAmount;
      
      EventBus.emit('slotMachineWin', { resource: randomResource, amount: bonusAmount });
    }
  }

  handleResourceFinder(effectiveCombo) {
    const bonusChance = this.state.skillManager ? 
      this.state.skillManager.getSkillBonus('chance', 'bonus_resource') : 0;
    
    if (Math.random() < bonusChance) {
      const resourcePool = RESOURCES.filter(r => r !== 'gold' && r !== 'faith' && r !== 'chaos');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = Math.max(1, Math.floor(effectiveCombo * 0.5));
      
      const newAmount = Math.min(
        this.state.resources[randomResource] + bonusAmount,
        GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
      );
      this.state.resources[randomResource] = newAmount;
      
      EventBus.emit('bonusResourceFound', { resource: randomResource, amount: bonusAmount });
    }
  }

  // ИСПРАВЛЕНИЕ 4: Исправленная логика ZONE SHUFFLE с правильным Reverse Controls
  handleZoneShuffle(zone) {
    if (zone.index === this.state.targetZone && Math.random() * 100 < CONFIG.zoneShuffleChance) {
      // Сохраняем текущую целевую зону как предыдущую
      this.state.previousTargetZone = this.state.targetZone;
      
      // ИСПРАВЛЕНИЕ 4: Правильная работа Reverse Controls
      if (this.state.debuffs && this.state.debuffs.includes('reverseControls')) {
        // Движемся последовательно в обратном направлении
        this.state.targetZone = (this.state.targetZone - 1 + ZONE_COUNT) % ZONE_COUNT;
        EventBus.emit('zonesShuffled', this.state.targetZone);
        EventBus.emit('tempNotification', '🙃 Reverse Controls: Zone moves backward');
      } else {
        // Обычное случайное движение (исключаем текущую зону для разнообразия)
        let newTarget;
        let attempts = 0;
        const maxAttempts = ZONE_COUNT * 2;
        
        do {
          newTarget = Math.floor(Math.random() * ZONE_COUNT);
          attempts++;
        } while (newTarget === this.state.targetZone && ZONE_COUNT > 1 && attempts < maxAttempts);
        
        this.state.targetZone = newTarget;
        EventBus.emit('zonesShuffled', this.state.targetZone);
      }
    }
  }

  handleBuffDebuffChance() {
    const { baseChance, chanceRange } = CONFIG;
    if (Math.random() * 100 < baseChance) {
      const minVar = -chanceRange.min;
      const maxVar = chanceRange.max;
      const variation = Math.random() * (maxVar - minVar) + minVar;
      
      // Lucky Charm (🍀) - увеличение шанса баффов
      const buffChanceBonus = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('chance', 'buff') * 100 : 0;
      
      // ИСПРАВЛЕНИЕ 13: Правильная работа Lucky buff
      const luckyBonus = this.state.buffs.includes('lucky') ? GAME_CONSTANTS.LUCKY_BUFF_BONUS : 0;
      
      // Inner Peace (☮️) - снижение влияния хаоса
      const chaosReduction = this.state.skillManager ? 
        this.state.skillManager.getSkillBonus('reduction', 'chaos') : 0;
      const effectiveChaos = Math.max(0, this.state.resources.chaos * (1 - chaosReduction));
      
      let buffChance = baseChance + (this.state.resources.faith - effectiveChaos) + variation + buffChanceBonus + luckyBonus;
      buffChance = Math.max(0, Math.min(100, buffChance));

      if (Math.random() * 100 < buffChance) {
        const def = BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)];
        if (this.buffManager) {
          this.buffManager.applyBuff(def);
        }
      } else {
        const def = DEBUFF_DEFS[Math.floor(Math.random() * DEBUFF_DEFS.length)];
        if (this.buffManager) {
          this.buffManager.applyDebuff(def);
        }
      }
    }
  }

  shuffleZones() {
    if (this.isDestroyed) return;
    
    const arr = this.zones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
      arr[i].index = i;
      arr[j].index = j;
    }
  }

  // ИСПРАВЛЕНИЕ 2, 11: Полная очистка с правильным удалением обработчиков
  stopAllEffects() {
    this.isDestroyed = true;
    
    // Удаляем обработчик событий
    if (this.clickHandler) {
      EventBus.unsubscribe('click', this.clickHandler);
      this.clickHandler = null;
    }
    
    // Останавливаем BuffManager
    if (this.buffManager && typeof this.buffManager.stopAllEffects === 'function') {
      this.buffManager.stopAllEffects();
    }
    
    console.log('🧹 FeatureManager полностью очищен');
  }
}