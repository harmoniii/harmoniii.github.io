// managers/FeatureManager.js - Упрощенная версия БЕЗ управления зонами
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { AngleManager } from '../utils/AngleManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

export class FeatureManager extends CleanupMixin {
  constructor(gameState, zoneManager, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.zoneManager = zoneManager; // Получаем готовый ZoneManager
    this.buffManager = buffManager;
    
    this.comboCheckInterval = null;
    this.lastEnergyNotification = 0;
    this.energyNotificationCooldown = 2000;
    
    // Статистика кликов
    this.clickStats = {
      totalClicks: 0,
      hitClicks: 0,
      missClicks: 0,
      averageAccuracy: 0
    };
    
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized (zones managed externally)');
  }

  bindEvents() {
    eventBus.subscribe(GameEvents.CLICK, (data) => {
      this.handleClick(data.data || data);
    });
  }

  startComboTimer() {
    this.comboCheckInterval = this.createInterval(() => {
      this.checkComboTimeout();
    }, 1000, 'combo-timeout-check');
  }

  checkComboTimeout() {
    if (!this.gameState.combo || this.gameState.combo.count === 0) return;
    
    const now = Date.now();
    const deadline = this.gameState.combo.deadline || 0;
    
    if (now > deadline && this.gameState.combo.count > 0) {
      console.log(`⏰ Combo timeout! Was ${this.gameState.combo.count}, resetting to 0`);
      
      const oldCombo = this.gameState.combo.count;
      this.resetCombo('timeout');
      
      eventBus.emit(GameEvents.NOTIFICATION, `⏰ Combo expired! (was ${oldCombo})`);
    }
  }

  // Основная обработка кликов
  handleClick(angle) {
    if (!this.isActive() || !this.zoneManager?.isManagerReady()) {
      console.warn('⚠️ FeatureManager or ZoneManager not ready');
      return;
    }
    
    const normalizedAngle = AngleManager.normalize(angle);
    const now = Date.now();
    
    // Проверяем блокировку
    if (now < (this.gameState.blockedUntil || 0)) {
      eventBus.emit(GameEvents.NOTIFICATION, '🔒 Zone is locked!');
      return;
    }

    // Обновляем статистику
    this.updateClickStats();
    
    // Используем ZoneManager для обработки клика
    const clickResult = this.zoneManager.handleZoneClick(normalizedAngle);
    
    if (!clickResult) {
      console.warn('⚠️ No zone found for click');
      this.handleClickMiss(normalizedAngle);
      return;
    }

    console.log(`🖱️ Click: zone ${clickResult.zoneIndex}, target: ${this.zoneManager.getTargetZone()}, accuracy: ${clickResult.accuracy?.toFixed(3)}`);
    
    // Обрабатываем результат клика
    if (clickResult.isTarget) {
      this.handleTargetZoneHit(clickResult, now);
    } else {
      this.handleSpecialZoneHit(clickResult, now);
    }
  }

  // Обработка промаха
  handleClickMiss(angle) {
    this.clickStats.missClicks++;
    this.resetCombo('miss');
    
    eventBus.emit(GameEvents.ZONE_MISS, {
      angle,
      target: this.zoneManager.getTargetZone(),
      timestamp: Date.now()
    });
    
    eventBus.emit(GameEvents.NOTIFICATION, '❌ No zone hit!');
  }

  // Обработка попадания в целевую зону
  handleTargetZoneHit(clickResult, now) {
    const { zoneIndex, effects, accuracy } = clickResult;
    
    console.log(`🎯 TARGET HIT! Zone ${zoneIndex}, accuracy: ${accuracy.toFixed(3)}`);
    
    // Проверяем энергию
    if (!this.checkEnergyForClick(effects.energyCost || 1)) {
      return;
    }

    // Проверяем дебаффы
    if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      eventBus.emit(GameEvents.GHOST_CLICK);
      return;
    }

    if (this.isHeavyClickActive() && !this.handleHeavyClick(clickResult)) {
      return;
    }

    // Обрабатываем комбо
    const effectiveCombo = this.handleCombo(clickResult, now, accuracy);
    
    // Обрабатываем получение золота
    this.handleGoldGain(clickResult, effectiveCombo, accuracy);
    
    // Тратим энергию
    this.handleEnergyConsumption(effects.energyCost || 1);
    
    // Перемещаем целевую зону
    this.handleZoneShuffle();
    
    // Обрабатываем появление эффектов
    this.handleEffectChance();
    
    // Обновляем статистику
    this.clickStats.hitClicks++;
    
    eventBus.emit(GameEvents.ZONE_HIT, {
      zone: zoneIndex,
      combo: effectiveCombo,
      angle: clickResult.angle,
      accuracy: accuracy,
      isTarget: true,
      timestamp: now
    });
  }

  // Обработка попадания в специальные зоны
  handleSpecialZoneHit(clickResult, now) {
    const { zoneIndex, zoneType, effects, accuracy } = clickResult;
    
    console.log(`⚡ SPECIAL ZONE HIT: ${zoneIndex} (${zoneType.id}), accuracy: ${accuracy.toFixed(3)}`);
    
    try {
      switch (zoneType.id) {
        case 'energy':
          const energyRestore = Math.floor((effects.energyRestore || 3) * (1 + accuracy * 0.5));
          this.handleEnergyRestore(energyRestore, 'energy_zone');
          eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy zone: +${energyRestore} Energy`);
          
          eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
            amount: energyRestore,
            accuracy: accuracy,
            zoneType: 'energy'
          });
          break;
          
        case 'bonus':
          const energyBonus = Math.floor((effects.energyRestore || 2) * (1 + accuracy * 0.3));
          const resourceBonus = Math.floor(2 * (1 + accuracy * 0.5));
          
          this.handleEnergyRestore(energyBonus, 'bonus_zone');
          this.handleBonusResources(resourceBonus);
          eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus zone: +${resourceBonus} resources + ${energyBonus} energy!`);
          break;
          
        default:
          eventBus.emit(GameEvents.NOTIFICATION, '⚫ Inactive zone');
          this.resetCombo('hit inactive zone');
          break;
      }
    } catch (error) {
      console.error('❌ Error handling special zone:', error);
    }
    
    // Это промах относительно цели
    this.clickStats.missClicks++;
    
    eventBus.emit(GameEvents.ZONE_MISS, {
      zone: zoneIndex,
      target: this.zoneManager.getTargetZone(),
      angle: clickResult.angle,
      accuracy: accuracy,
      zoneType: zoneType.id,
      timestamp: now
    });
  }

  // Перемешивание зон
  handleZoneShuffle() {
    if (Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      // Обычное перемешивание
      if (this.zoneManager) {
        this.zoneManager.shuffleZones();
      }
    }
  }

  // Сброс комбо
  resetCombo(reason = 'unknown') {
    if (this.gameState.combo && this.gameState.combo.count > 0) {
      console.log(`💥 Combo reset: ${reason} (was ${this.gameState.combo.count})`);
      
      const oldCombo = this.gameState.combo.count;
      this.gameState.combo.count = 0;
      this.gameState.combo.deadline = 0;
      this.gameState.combo.lastZone = null;
      this.gameState.combo.lastAngle = null;
      
      eventBus.emit(GameEvents.COMBO_CHANGED, {
        count: 0,
        effective: 0,
        zone: null,
        target: this.zoneManager?.getTargetZone(),
        deadline: 0,
        reason: reason,
        previousCount: oldCombo
      });
    }
  }

  // Проверка энергии
  checkEnergyForClick(energyCost) {
    if (!this.gameState.energyManager) {
      return true;
    }
    
    try {
      if (!this.gameState.energyManager.canClick()) {
        const energyInfo = this.gameState.energyManager.getEnergyInfo();
        eventBus.emit(GameEvents.NOTIFICATION, 
          `⚡ Not enough energy! Need ${energyInfo.clickCost}, have ${energyInfo.current}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking energy:', error);
      return true;
    }
    
    return true;
  }

  // Проверки дебаффов
  isGhostClickActive() {
    return this.gameState.debuffs && this.gameState.debuffs.includes('ghost');
  }

  isHeavyClickActive() {
    return this.gameState.debuffs && this.gameState.debuffs.includes('heavyClick');
  }

  // Обработка Heavy Click
  handleHeavyClick(clickResult) {
    const { zoneIndex } = clickResult;
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const zoneKey = `zone_${zoneIndex}`;
    
    if (!this.gameState.effectStates) {
      this.gameState.effectStates = {};
    }
    
    if (!this.gameState.effectStates.heavyClickRequired) {
      this.gameState.effectStates.heavyClickRequired = {};
    }
    
    // Сбрасываем счетчики для других зон
    Object.keys(this.gameState.effectStates.heavyClickRequired).forEach(key => {
      if (key !== zoneKey) {
        this.gameState.effectStates.heavyClickRequired[key] = 0;
      }
    });
    
    // Увеличиваем счетчик для текущей зоны
    const currentCount = this.gameState.effectStates.heavyClickRequired[zoneKey] || 0;
    this.gameState.effectStates.heavyClickRequired[zoneKey] = currentCount + 1;
    
    if (this.gameState.effectStates.heavyClickRequired[zoneKey] < required) {
      eventBus.emit(GameEvents.HEAVY_CLICK_PROGRESS, {
        current: this.gameState.effectStates.heavyClickRequired[zoneKey],
        required: required,
        zone: zoneIndex
      });
      return false;
    } else {
      this.gameState.effectStates.heavyClickRequired[zoneKey] = 0;
      return true;
    }
  }

  // Обработка комбо
  handleCombo(clickResult, now, accuracy = 0.5) {
    const { zoneIndex, angle } = clickResult;
    
    // Сохраняем угол
    if (this.gameState.combo) {
      this.gameState.combo.lastAngle = angle || 0;
    }
    
    // Time Stretch skill
    const extraTime = this.getSkillBonus('duration', 'combo_timeout');
    const comboTimeout = GAME_CONSTANTS.COMBO_TIMEOUT + extraTime;
    
    // Проверяем заморозку комбо
    const isComboFrozen = this.gameState.debuffs && this.gameState.debuffs.includes('freeze');
    
    if (!isComboFrozen) {
      const currentDeadline = this.gameState.combo?.deadline || 0;
      const comboExpired = this.gameState.combo.count > 0 && now > currentDeadline;
      
      if (comboExpired) {
        this.gameState.combo.count = 1;
      } else {
        this.gameState.combo.count++;
      }
      
      // Бонус за точность
      if (accuracy > 0.9) {
        this.gameState.combo.count += 1;
      }
      
      this.gameState.combo.deadline = now + comboTimeout;
    }
    
    this.gameState.combo.lastZone = zoneIndex;
    this.gameState.combo.count = Math.min(this.gameState.combo.count, GAME_CONSTANTS.MAX_COMBO_COUNT);
    
    // Combo Master skill
    const comboMultiplier = 1 + this.getSkillBonus('multiplier', 'combo');
    const effectiveCombo = Math.floor(this.gameState.combo.count * comboMultiplier);
    
    eventBus.emit(GameEvents.COMBO_CHANGED, {
      count: this.gameState.combo.count,
      effective: effectiveCombo,
      zone: zoneIndex,
      target: this.zoneManager?.getTargetZone(),
      deadline: this.gameState.combo.deadline,
      timeLeft: Math.max(0, this.gameState.combo.deadline - now),
      accuracy: accuracy,
      reason: 'target_hit'
    });
    
    return effectiveCombo;
  }

  // Обработка получения золота
  handleGoldGain(clickResult, effectiveCombo, accuracy = 0.5) {
    let clickMultiplier = 1;
    
    // Double Tap buff
    if (this.gameState.buffs && this.gameState.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let goldGain = Math.max(1, effectiveCombo * clickMultiplier);
    
    // Бонус за точность
    const accuracyBonus = 1 + (accuracy * 0.5);
    goldGain = Math.floor(goldGain * accuracyBonus);
    
    // Golden Touch skill
    const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
    goldGain = Math.floor(goldGain * goldMultiplier);
    
    // Frenzy buff
    if (this.gameState.buffs && this.gameState.buffs.includes('frenzy')) {
      goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
    }
    
    // Golden Touch buff
    if (this.gameState.buffs && this.gameState.buffs.includes('goldenTouch')) {
      goldGain *= 3;
    }
    
    // Critical Strike skill
    const critChance = this.getSkillBonus('chance', 'critical');
    if (Math.random() < critChance) {
      goldGain *= 2;
      eventBus.emit(GameEvents.CRITICAL_HIT, { damage: goldGain });
    }
    
    // Добавляем золото
    this.addResource('gold', goldGain);
    
    // Обрабатываем специальные эффекты
    this.handleStarPower();
    this.handleSlotMachine();
    this.handleResourceFinder(effectiveCombo, accuracy);
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED, { 
      resource: 'gold', 
      amount: this.gameState.resources.gold 
    });
    
    eventBus.emit(GameEvents.RESOURCE_GAINED, {
      resource: 'gold',
      amount: goldGain,
      accuracy: accuracy
    });
  }

  // Восстановление энергии
  handleEnergyRestore(amount, source) {
    if (this.gameState.energyManager) {
      try {
        this.gameState.energyManager.restoreEnergy(amount, source);
        
        eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
          amount: amount,
          source: source,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('❌ Error restoring energy:', error);
      }
    }
  }

  // Потребление энергии
  handleEnergyConsumption(cost) {
    if (this.gameState.energyManager) {
      try {
        this.gameState.energyManager.consumeEnergy(cost);
      } catch (error) {
        console.error('❌ Error consuming energy:', error);
      }
    }
  }

  // Обработка бонусных ресурсов
  handleBonusResources(amount) {
    const resourcePool = getResourcesInGroup('TRADEABLE');
    if (resourcePool.length === 0) return;
    
    const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
    this.addResource(randomResource, amount);
    
    eventBus.emit(GameEvents.BONUS_RESOURCE_FOUND, {
      resource: randomResource,
      amount: amount
    });
  }

  // Добавление ресурса
  addResource(resourceName, amount) {
    if (!resourceName || typeof amount !== 'number' || amount <= 0) return false;
    
    try {
      if (typeof this.gameState.addResource === 'function') {
        this.gameState.addResource(resourceName, amount);
      } else if (this.gameState.resources && this.gameState.resources.hasOwnProperty(resourceName)) {
        this.gameState.resources[resourceName] = (this.gameState.resources[resourceName] || 0) + amount;
      }
      return true;
    } catch (error) {
      console.error('❌ Error adding resource:', error);
      return false;
    }
  }

  // Star Power эффект
  handleStarPower() {
    if (!this.gameState.buffs || !this.gameState.buffs.includes('starPower')) return;
    
    if (this.gameState.effectStates.starPowerClicks > 0) {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = GAME_CONSTANTS.STAR_POWER_BONUS;
      
      this.addResource(randomResource, bonusAmount);
      this.gameState.effectStates.starPowerClicks--;
      
      eventBus.emit(GameEvents.STAR_POWER_USED, {
        resource: randomResource,
        amount: bonusAmount,
        remaining: this.gameState.effectStates.starPowerClicks
      });
      
      if (this.gameState.effectStates.starPowerClicks <= 0) {
        this.gameState.buffs = this.gameState.buffs.filter(id => id !== 'starPower');
      }
    }
  }

  // Slot Machine эффект
  handleSlotMachine() {
    if (!this.gameState.buffs || !this.gameState.buffs.includes('slotMachine')) return;
    
    if (Math.random() < GAME_CONSTANTS.SLOT_MACHINE_CHANCE) {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const amount = GAME_CONSTANTS.SLOT_MACHINE_AMOUNT;
      
      this.addResource(randomResource, amount);
      
      eventBus.emit(GameEvents.SLOT_MACHINE_WIN, {
        resource: randomResource,
        amount: amount
      });
    }
  }

  // Resource Finder навык
  handleResourceFinder(effectiveCombo, accuracy = 0.5) {
    const baseChance = this.getSkillBonus('chance', 'bonus_resource');
    if (baseChance <= 0) return;
    
    const comboBonus = Math.min(effectiveCombo * 0.01, 0.1);
    const accuracyBonus = accuracy * 0.05;
    const finalChance = baseChance + comboBonus + accuracyBonus;
    
    if (Math.random() < finalChance) {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      
      const baseAmount = 1;
      const finalAmount = Math.floor(baseAmount * (1 + effectiveCombo * 0.1) * (1 + accuracy * 0.5));
      
      this.addResource(randomResource, finalAmount);
      
      eventBus.emit(GameEvents.BONUS_RESOURCE_FOUND, {
        resource: randomResource,
        amount: finalAmount,
        accuracy: accuracy,
        combo: effectiveCombo
      });
    }
  }

  // Обработка появления эффектов
  handleEffectChance() {
    const faithAmount = this.gameState.resources.faith || 0;
    const chaosAmount = this.gameState.resources.chaos || 0;
    
    let baseChance = GAME_CONSTANTS.BASE_EFFECT_CHANCE;
    
    // Lucky Zone buff
    if (this.gameState.buffs && this.gameState.buffs.includes('lucky')) {
      baseChance += GAME_CONSTANTS.LUCKY_BUFF_BONUS;
    }
    
    // Curse debuff
    if (this.gameState.debuffs && this.gameState.debuffs.includes('curse')) {
      baseChance *= 0.5;
    }
    
    // Lucky Charm skill
    const luckyCharmBonus = this.getSkillBonus('chance', 'luck');
    baseChance += luckyCharmBonus;
    
    const effectRoll = Math.random() * 100;
    
    if (effectRoll < baseChance) {
      const totalInfluence = faithAmount + chaosAmount;
      
      if (totalInfluence === 0) {
        if (Math.random() < 0.5) {
          this.buffManager?.applyRandomBuff();
        } else {
          this.buffManager?.applyRandomDebuff();
        }
      } else {
        const faithRatio = faithAmount / totalInfluence;
        
        if (Math.random() < faithRatio) {
          this.buffManager?.applyRandomBuff();
        } else {
          this.buffManager?.applyRandomDebuff();
        }
      }
    }
  }

  // Получить бонус от навыков
  getSkillBonus(type, target) {
    if (this.gameState.skillManager && 
        typeof this.gameState.skillManager.getSkillBonus === 'function') {
      return this.gameState.skillManager.getSkillBonus(type, target);
    }
    return 0;
  }

  // Обновить статистику кликов
  updateClickStats() {
    this.clickStats.totalClicks++;
  }

  // Получить статистику кликов
  getClickStats() {
    return {
      totalClicks: this.clickStats.totalClicks,
      hitClicks: this.clickStats.hitClicks,
      missClicks: this.clickStats.missClicks,
      accuracy: this.clickStats.totalClicks > 0 ? 
        (this.clickStats.hitClicks / this.clickStats.totalClicks * 100).toFixed(1) + '%' : '0%'
    };
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      isActive: this.isActive(),
      hasZoneManager: !!this.zoneManager,
      zoneManagerReady: this.zoneManager?.isManagerReady(),
      hasBuffManager: !!this.buffManager,
      clickStats: this.getClickStats(),
      lastEnergyNotification: this.lastEnergyNotification,
      gameStateReady: !!(this.gameState && !this.gameState.isDestroyed)
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 FeatureManager cleanup started');
    
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
      this.comboCheckInterval = null;
    }
    
    super.destroy();
    
    console.log('✅ FeatureManager destroyed');
  }
}