// managers/GridFeatureManager.js - ОБНОВЛЕНО: поддержка новых эффектов
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

export class GridFeatureManager extends CleanupMixin {
  constructor(gameState, gridManager, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.gridManager = gridManager;
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
    
    console.log('🎯 GridFeatureManager initialized with new effects support');
  }

  bindEvents() {
    eventBus.subscribe(GameEvents.CLICK, (data) => {
      this.handleClick(data);
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

  // Основная обработка кликов для сетки
  handleClick(clickData) {
    if (!this.isActive() || !this.gridManager?.isManagerReady()) {
      console.warn('⚠️ GridFeatureManager or GridManager not ready');
      return;
    }
    
    const { x, y, canvasWidth, canvasHeight } = clickData;
    const now = Date.now();
    
    console.log(`🖱️ Processing grid click at: ${x.toFixed(1)}, ${y.toFixed(1)}`);
    
    // Проверяем блокировку
    if (now < (this.gameState.blockedUntil || 0)) {
      eventBus.emit(GameEvents.NOTIFICATION, '🔒 Grid is locked!');
      return;
    }

    // НОВОЕ: Проверяем Absolute Zero - блокирует все действия
    if (this.gameState.effectStates?.absoluteZeroActive) {
      eventBus.emit(GameEvents.NOTIFICATION, '❄️ Everything is frozen!');
      return;
    }

    // Обновляем статистику
    this.updateClickStats();
    
    // Используем GridManager для обработки клика
    const clickResult = this.gridManager.handleCellClick(x, y, canvasWidth, canvasHeight);
    
    if (!clickResult) {
      console.warn('⚠️ No cell found for click');
      this.handleClickMiss(x, y);
      return;
    }

    console.log(`🖱️ Click: cell ${clickResult.cellIndex}, target: ${this.gridManager.getTargetCell()}, accuracy: ${clickResult.accuracy?.toFixed(3)}`);
    
    // Обрабатываем результат и ВСЕГДА перемешиваем после любого успешного клика
    if (clickResult.isTarget) {
      this.handleTargetCellHit(clickResult, now);
    } else {
      this.handleSpecialCellHit(clickResult, now);
    }
    
    // Перемешиваем сетку после ЛЮБОГО попадания в клетку
    this.handleCellShuffle();
  }

  // Обработка промаха
  handleClickMiss(x, y) {
    this.clickStats.missClicks++;
    this.resetCombo('miss');
    
    eventBus.emit(GameEvents.ZONE_MISS, {
      x, y,
      target: this.gridManager.getTargetCell(),
      timestamp: Date.now()
    });
    
    eventBus.emit(GameEvents.NOTIFICATION, '❌ No cell hit!');
  }

  // Обработка попадания в целевую клетку
  handleTargetCellHit(clickResult, now) {
    const { cellIndex, effects, accuracy } = clickResult;
    
    console.log(`🎯 TARGET HIT! Cell ${cellIndex}, accuracy: ${accuracy.toFixed(3)}`);
    
    // ОБНОВЛЕНО: Проверяем энергию с учетом новых эффектов
    const energyCost = this.calculateEnergyCost(effects.energyCost || 1);
    if (!this.checkEnergyForClick(energyCost)) {
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
    
    // ОБНОВЛЕНО: Обрабатываем получение золота с новыми эффектами
    this.handleGoldGain(clickResult, effectiveCombo, accuracy);
    
    // ОБНОВЛЕНО: Тратим энергию с учетом новых эффектов
    this.handleEnergyConsumption(energyCost);
    
    // ОБНОВЛЕНО: Обрабатываем появление эффектов с новой логикой
    this.handleEffectChance();
    
    // Обновляем статистику
    this.clickStats.hitClicks++;
    
    eventBus.emit(GameEvents.ZONE_HIT, {
      cell: cellIndex,
      combo: effectiveCombo,
      x: clickResult.x,
      y: clickResult.y,
      accuracy: accuracy,
      isTarget: true,
      timestamp: now
    });
  }

  // НОВОЕ: Рассчитать стоимость энергии с учетом эффектов
  calculateEnergyCost(baseCost) {
    let finalCost = baseCost;

    // Prismatic Glow - бесплатные клики по цели
    if (this.gameState.effectStates?.prismaticGlowActive) {
      return 0;
    }

    // Energy Parasite - двойная стоимость
    if (this.gameState.effectStates?.energyParasiteActive) {
      finalCost *= 2;
    }

    // Energy Efficiency skill
    const efficiencyLevel = this.getSkillBonus('reduction', 'energy_cost');
    finalCost *= (1 - efficiencyLevel);

    return Math.max(0.1, finalCost);
  }

  // Обработка попадания в специальные клетки
  handleSpecialCellHit(clickResult, now) {
    const { cellIndex, cellType, effects, accuracy } = clickResult;
    
    console.log(`⚡ SPECIAL CELL HIT: ${cellIndex} (${cellType.id}), accuracy: ${accuracy.toFixed(3)}`);
    
    try {
      switch (cellType.id) {
        case 'energy':
          const energyRestore = Math.floor((effects.energyRestore || 3) * (1 + accuracy * 0.5));
          this.handleEnergyRestore(energyRestore, 'energy_cell');
          eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy cell: +${energyRestore} Energy`);
          
          eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
            amount: energyRestore,
            accuracy: accuracy,
            cellType: 'energy'
          });
          break;
          
        case 'bonus':
          const energyBonus = Math.floor((effects.energyRestore || 2) * (1 + accuracy * 0.3));
          const resourceBonus = Math.floor(2 * (1 + accuracy * 0.5));
          
          this.handleEnergyRestore(energyBonus, 'bonus_cell');
          this.handleBonusResources(resourceBonus);
          eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus cell: +${resourceBonus} resources + ${energyBonus} energy!`);
          break;
          
        default:
          eventBus.emit(GameEvents.NOTIFICATION, '⚫ Empty cell');
          this.resetCombo('hit empty cell');
          break;
      }
    } catch (error) {
      console.error('❌ Error handling special cell:', error);
    }
    
    // Это промах относительно цели
    this.clickStats.missClicks++;
    
    eventBus.emit(GameEvents.ZONE_MISS, {
      cell: cellIndex,
      target: this.gridManager.getTargetCell(),
      accuracy: accuracy,
      cellType: cellType.id,
      timestamp: now
    });
  }

  // Перемешивание клеток
  handleCellShuffle() {
    if (Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      if (this.gridManager) {
        this.gridManager.shuffleCells();
        console.log('🔄 Grid shuffled after click');
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
        cell: null,
        target: this.gridManager?.getTargetCell(),
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
      // ОБНОВЛЕНО: Используем модифицированную стоимость энергии
      const currentEnergy = this.gameState.energy?.current || 0;
      if (currentEnergy < energyCost) {
        const energyInfo = this.gameState.energyManager.getEnergyInfo();
        eventBus.emit(GameEvents.NOTIFICATION, 
          `⚡ Not enough energy! Need ${energyCost.toFixed(1)}, have ${energyInfo.current}`);
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
    const { cellIndex } = clickResult;
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const cellKey = `cell_${cellIndex}`;
    
    if (!this.gameState.effectStates) {
      this.gameState.effectStates = {};
    }
    
    if (!this.gameState.effectStates.heavyClickRequired) {
      this.gameState.effectStates.heavyClickRequired = {};
    }
    
    // Сбрасываем счетчики для других клеток
    Object.keys(this.gameState.effectStates.heavyClickRequired).forEach(key => {
      if (key !== cellKey) {
        this.gameState.effectStates.heavyClickRequired[key] = 0;
      }
    });
    
    // Увеличиваем счетчик для текущей клетки
    const currentCount = this.gameState.effectStates.heavyClickRequired[cellKey] || 0;
    this.gameState.effectStates.heavyClickRequired[cellKey] = currentCount + 1;
    
    if (this.gameState.effectStates.heavyClickRequired[cellKey] < required) {
      eventBus.emit(GameEvents.HEAVY_CLICK_PROGRESS, {
        current: this.gameState.effectStates.heavyClickRequired[cellKey],
        required: required,
        cell: cellIndex
      });
      return false;
    } else {
      this.gameState.effectStates.heavyClickRequired[cellKey] = 0;
      return true;
    }
  }

  // Обработка комбо
handleCombo(clickResult, now, accuracy = 0.5) {
  const { cellIndex } = clickResult;
  
  // Time Stretch skill с убывающей отдачей
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
    
    this.gameState.combo.deadline = now + comboTimeout;
  }
  
  this.gameState.combo.lastZone = cellIndex;
  this.gameState.combo.count = Math.min(this.gameState.combo.count, GAME_CONSTANTS.MAX_COMBO_COUNT);
  
  // Combo Master skill с ограничением
  const comboMultiplierBonus = this.getSkillBonus('multiplier', 'combo');
  const comboMultiplier = 1 + Math.min(0.5, comboMultiplierBonus); // максимум 50% бонус
  
  let effectiveCombo = Math.floor(this.gameState.combo.count * comboMultiplier);
  
  // НОВОЕ: Экспоненциальное затухание комбо-бонуса
  if (GAME_CONSTANTS.LINEAR_SCALING_ENABLED && effectiveCombo > 20) {
    const excess = effectiveCombo - 20;
    effectiveCombo = 20 + Math.floor(excess * 0.5); // 50% эффективность после 20
  }
  
  eventBus.emit(GameEvents.COMBO_CHANGED, {
    count: this.gameState.combo.count,
    effective: effectiveCombo,
    cell: cellIndex,
    target: this.gridManager?.getTargetCell(),
    deadline: this.gameState.combo.deadline,
    timeLeft: Math.max(0, this.gameState.combo.deadline - now),
    accuracy: accuracy,
    reason: 'target_hit'
  });
  
  return effectiveCombo;
}

  // ОБНОВЛЕНО: Обработка получения золота с новыми эффектами
  handleGoldGain(clickResult, effectiveCombo, accuracy = 0.5) {
  let clickMultiplier = 1;
  
  // Double Tap buff - уменьшен
  if (this.gameState.buffs && this.gameState.buffs.includes('doubleTap')) {
    clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER; // теперь 1.5 вместо 2
  }
  
  // ЛИНЕЙНОЕ ОГРАНИЧЕНИЕ КОМБО
  let comboBonus = effectiveCombo;
  if (GAME_CONSTANTS.LINEAR_SCALING_ENABLED) {
    // Комбо дает уменьшающийся бонус после определенного порога
    if (effectiveCombo > GAME_CONSTANTS.COMBO_BENEFIT_CAP) {
      comboBonus = GAME_CONSTANTS.COMBO_BENEFIT_CAP + 
        Math.log(effectiveCombo - GAME_CONSTANTS.COMBO_BENEFIT_CAP + 1) * 5;
    }
    // Максимальный бонус от комбо
    comboBonus = Math.min(comboBonus, GAME_CONSTANTS.MAX_COMBO_BENEFIT);
  }
  
  let goldGain = Math.max(1, comboBonus * clickMultiplier);
  
  // Бонус за точность - ограничен
  const accuracyBonus = 1 + (accuracy * 0.3); // было 0.5
  goldGain = Math.floor(goldGain * accuracyBonus);
  
  // Golden Touch skill - с убывающей отдачей
  const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
  goldGain = Math.floor(goldGain * goldMultiplier);
  
  // Frenzy buff - уменьшен
  if (this.gameState.buffs && this.gameState.buffs.includes('frenzy')) {
    goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER; // теперь 1.5x вместо 2x
  }
  
  // Golden Touch buff - ограничен
  if (this.gameState.buffs && this.gameState.buffs.includes('goldenTouch')) {
    goldGain *= 2; // было 3x, теперь 2x
  }
  
  // Критические удары с ограничением частоты
  let isCritical = false;
  if (this.gameState.effectStates?.crystalFocusActive) {
    isCritical = true;
  } else {
    const critChance = Math.min(0.25, this.getSkillBonus('chance', 'critical')); // макс 25%
    isCritical = Math.random() < critChance;
  }
  
  if (isCritical) {
    goldGain *= 1.5; // было 2x, теперь 1.5x
    eventBus.emit(GameEvents.CRITICAL_HIT, { damage: goldGain });
  }
  
  // ОГРАНИЧЕНИЕ МАКСИМАЛЬНОГО ЗАРАБОТКА ЗА КЛИК
  if (GAME_CONSTANTS.LINEAR_SCALING_ENABLED) {
    const maxGoldPerClick = 100 + (this.gameState.skillPoints || 0) * 2;
    goldGain = Math.min(goldGain, maxGoldPerClick);
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
    // НОВОЕ: Absolute Zero блокирует восстановление энергии
    if (this.gameState.effectStates?.absoluteZeroActive) {
      eventBus.emit(GameEvents.NOTIFICATION, '❄️ Energy restore blocked by Absolute Zero!');
      return;
    }

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

  // ОБНОВЛЕНО: Потребление энергии с учетом новых эффектов
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

  // ОБНОВЛЕНО: Обработка появления эффектов с новой логикой
  handleEffectChance() {
    const faithAmount = this.gameState.resources.faith || 0;
    const chaosAmount = this.gameState.resources.chaos || 0;
    
    let baseBuffChance = GAME_CONSTANTS.BASE_EFFECT_CHANCE;
    let baseDebuffChance = GAME_CONSTANTS.BASE_EFFECT_CHANCE;

    // НОВОЕ: Модифицируем шансы через BuffManager
    if (this.buffManager && typeof this.buffManager.modifyEffectChances === 'function') {
      const modifiedChances = this.buffManager.modifyEffectChances(baseBuffChance, baseDebuffChance);
      baseBuffChance = modifiedChances.buffChance;
      baseDebuffChance = modifiedChances.debuffChance;
    } else {
      // Fallback - старая логика
      // Lucky Zone buff
      if (this.gameState.buffs && this.gameState.buffs.includes('lucky')) {
        baseBuffChance += GAME_CONSTANTS.LUCKY_BUFF_BONUS;
      }

      // Curse debuff
      if (this.gameState.debuffs && this.gameState.debuffs.includes('curse')) {
        baseBuffChance *= 0.5;
      }

      // НОВЫЕ ЭФФЕКТЫ
      // Chaos Clown
      if (this.gameState.effectStates?.chaosClownActive) {
        baseBuffChance = 100;
        baseDebuffChance = 0;
      }

      // Unlucky Curse
      if (this.gameState.effectStates?.unluckyCurseActive) {
        baseBuffChance = 0;
        baseDebuffChance = 100;
      }
    }
    
    // Lucky Charm skill
    const luckyCharmBonus = this.getSkillBonus('chance', 'luck');
    baseBuffChance += luckyCharmBonus;
    
    const effectRoll = Math.random() * 100;
    
    if (effectRoll < Math.max(baseBuffChance, baseDebuffChance)) {
      const totalInfluence = faithAmount + chaosAmount;
      
      // Определяем тип эффекта
      let shouldApplyBuff = false;
      
      if (baseBuffChance > 0 && baseDebuffChance > 0) {
        // Обычная логика faith/chaos
        if (totalInfluence === 0) {
          shouldApplyBuff = Math.random() < 0.5;
        } else {
          const faithRatio = faithAmount / totalInfluence;
          shouldApplyBuff = Math.random() < faithRatio;
        }
      } else if (baseBuffChance > 0) {
        shouldApplyBuff = true;
      } else if (baseDebuffChance > 0) {
        shouldApplyBuff = false;
      }
      
      // Применяем эффект
      if (shouldApplyBuff) {
        this.buffManager?.applyRandomBuff();
      } else {
        this.buffManager?.applyRandomDebuff();
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
      hasGridManager: !!this.gridManager,
      gridManagerReady: this.gridManager?.isManagerReady(),
      hasBuffManager: !!this.buffManager,
      clickStats: this.getClickStats(),
      lastEnergyNotification: this.lastEnergyNotification,
      gameStateReady: !!(this.gameState && !this.gameState.isDestroyed),
      newEffectStates: {
        crystalFocusActive: this.gameState.effectStates?.crystalFocusActive,
        prismaticGlowActive: this.gameState.effectStates?.prismaticGlowActive,
        chaosClownActive: this.gameState.effectStates?.chaosClownActive,
        taxBoomActive: this.gameState.effectStates?.taxBoomActive,
        absoluteZeroActive: this.gameState.effectStates?.absoluteZeroActive,
        energyParasiteActive: this.gameState.effectStates?.energyParasiteActive,
        unluckyCurseActive: this.gameState.effectStates?.unluckyCurseActive
      }
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 GridFeatureManager cleanup started');
    
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
      this.comboCheckInterval = null;
    }
    
    super.destroy();
    
    console.log('✅ GridFeatureManager destroyed');
  }
}