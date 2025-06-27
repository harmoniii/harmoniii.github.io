// managers/FeatureManager.js - ИСПРАВЛЕННАЯ версия с проверками null
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { ZoneManager } from './ZoneManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

export class FeatureManager extends CleanupMixin {
  constructor(gameState, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.buffManager = buffManager;
    
    // ИСПРАВЛЕНИЕ: Безопасная инициализация ZoneManager
    try {
      this.zoneManager = new ZoneManager(gameState);
      this.cleanupManager.registerComponent(this.zoneManager, 'ZoneManager');
      console.log('✅ ZoneManager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ZoneManager:', error);
      this.zoneManager = null;
    }
    
    this.comboCheckInterval = null;
    
    // Ограничение на частоту уведомлений об энергии
    this.lastEnergyNotification = 0;
    this.energyNotificationCooldown = 2000;
    
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized with ZoneManager integration');
  }

  // Запуск таймера проверки комбо
  startComboTimer() {
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
    }
    
    this.comboCheckInterval = this.createInterval(() => {
      this.checkComboTimeout();
    }, 1000, 'combo-timeout-check');
    
    console.log('⏰ Combo timeout checker started');
  }

  // Проверка таймаута комбо
  checkComboTimeout() {
    if (!this.gameState.combo || this.gameState.combo.count === 0) {
      return;
    }
    
    const now = Date.now();
    const deadline = this.gameState.combo.deadline || 0;
    
    if (now > deadline && this.gameState.combo.count > 0) {
      console.log(`⏰ Combo timeout detected! Count was ${this.gameState.combo.count}, resetting to 0`);
      
      const oldCombo = this.gameState.combo.count;
      
      this.gameState.combo.count = 0;
      this.gameState.combo.deadline = 0;
      this.gameState.combo.lastZone = null;
      this.gameState.combo.lastAngle = null;
      
      eventBus.emit(GameEvents.COMBO_CHANGED, {
        count: 0,
        effective: 0,
        zone: null,
        target: this.gameState.targetZone,
        deadline: 0,
        reason: 'timeout',
        previousCount: oldCombo
      });
      
      eventBus.emit(GameEvents.NOTIFICATION, `⏰ Combo expired! (was ${oldCombo})`);
    }
  }

  // Привязка событий
  bindEvents() {
    eventBus.subscribe(GameEvents.CLICK, (data) => {
      this.handleClick(data.data || data);
    });
    
    console.log('🎯 Event handlers bound');
  }

  // ИСПРАВЛЕНИЕ: Безопасный обработчик кликов с проверками null
  handleClick(angle) {
    if (!this.isActive()) {
      console.warn('⚠️ FeatureManager not active, ignoring click');
      return;
    }
    
    // ИСПРАВЛЕНИЕ: Проверяем наличие ZoneManager
    if (!this.zoneManager) {
      console.error('❌ ZoneManager not available, cannot process click');
      return;
    }
    
    const now = Date.now();
    
    // Проверяем блокировку (Zone Lock debuff)
    if (now < (this.gameState.blockedUntil || 0)) {
      eventBus.emit(GameEvents.NOTIFICATION, '🔒 Zone is locked!');
      return;
    }

    // ИСПРАВЛЕНИЕ: Безопасная нормализация угла
    const normalizedAngle = this.normalizeAngle(angle);
    if (normalizedAngle === null) {
      console.warn('⚠️ Invalid angle provided to handleClick:', angle);
      return;
    }
    
    // ИСПРАВЛЕНИЕ: Безопасное использование ZoneManager для поиска зоны
    let clickedZone = null;
    try {
      clickedZone = this.zoneManager.findZoneByAngle(normalizedAngle);
    } catch (error) {
      console.error('❌ Error finding zone by angle:', error);
      return;
    }
    
    // ИСПРАВЛЕНИЕ: Проверяем результат поиска зоны
    if (!clickedZone) {
      console.warn('⚠️ No zone found for angle:', normalizedAngle);
      return;
    }

    console.log(`🖱️ Click on zone ${clickedZone.index}, target: ${this.gameState.targetZone}`);
    
    // ИСПРАВЛЕНИЕ: Безопасное получение типа зоны и обработка клика
    let zoneType = null;
    let clickResult = null;
    
    try {
      zoneType = this.zoneManager.getZoneType(clickedZone.index);
      clickResult = this.zoneManager.handleZoneClick(clickedZone, normalizedAngle);
    } catch (error) {
      console.error('❌ Error processing zone click:', error);
      return;
    }
    
    // ИСПРАВЛЕНИЕ: Проверяем результат обработки клика
    if (!clickResult) {
      console.warn('⚠️ Zone click processing returned null result');
      return;
    }
    
    // Обрабатываем клик в зависимости от типа зоны
    this.processZoneClick(clickResult, now);
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка кликов по зонам
  processZoneClick(clickResult, now) {
    // ИСПРАВЛЕНИЕ: Валидируем входные параметры
    if (!clickResult || typeof clickResult !== 'object') {
      console.warn('⚠️ Invalid click result provided to processZoneClick');
      return;
    }
    
    const { zoneIndex, zoneType, isTarget, effects } = clickResult;
    
    // ИСПРАВЛЕНИЕ: Проверяем обязательные поля
    if (typeof zoneIndex !== 'number' || !zoneType) {
      console.warn('⚠️ Invalid click result structure:', clickResult);
      return;
    }
    
    if (isTarget) {
      // Клик по целевой зоне
      this.handleTargetZoneHit(clickResult, now);
    } else {
      // Клик по специальной зоне
      this.handleSpecialZoneHit(clickResult, now);
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка попадания в целевую зону
  handleTargetZoneHit(clickResult, now) {
    // ИСПРАВЛЕНИЕ: Валидируем clickResult
    if (!clickResult || !clickResult.effects) {
      console.warn('⚠️ Invalid click result for target zone hit');
      return;
    }
    
    const { zoneIndex, effects } = clickResult;
    
    console.log(`🎯 HIT TARGET ZONE ${zoneIndex}!`);
    
    // Проверяем энергию
    if (!this.checkEnergyForClick(effects.energyCost || 1)) {
      return;
    }

    // Проверяем дебаффы
    if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      eventBus.emit(GameEvents.GHOST_CLICK);
      return;
    }

    if (this.isHeavyClickActive()) {
      if (!this.handleHeavyClick(clickResult)) {
        return;
      }
    }

    // Обрабатываем комбо
    const effectiveCombo = this.handleCombo(clickResult, now);
    
    // Обрабатываем получение золота
    this.handleGoldGain(clickResult, effectiveCombo);
    
    // Тратим энергию
    this.handleEnergyConsumption(effects.energyCost || 1);
    
    // Перемещаем целевую зону
    this.handleZoneShuffle(clickResult);
    
    // Обрабатываем появление баффов/дебаффов
    this.handleEffectChance();
    
    // Эмитируем событие попадания
    eventBus.emit(GameEvents.ZONE_HIT, {
      zone: zoneIndex,
      combo: effectiveCombo,
      angle: clickResult.angle,
      isTarget: true
    });
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка попадания в специальные зоны
  handleSpecialZoneHit(clickResult, now) {
    // ИСПРАВЛЕНИЕ: Валидируем clickResult
    if (!clickResult || !clickResult.zoneType || !clickResult.effects) {
      console.warn('⚠️ Invalid click result for special zone hit');
      return;
    }
    
    const { zoneIndex, zoneType, effects } = clickResult;
    
    console.log(`⚡ HIT SPECIAL ZONE ${zoneIndex} (${zoneType.id})`);
    
    // ИСПРАВЛЕНИЕ: Безопасная обработка различных типов зон
    try {
      switch (zoneType.id) {
        case 'energy':
          this.handleEnergyRestore(effects.energyRestore || 3, 'energy_zone');
          eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy zone: +${effects.energyRestore || 3} Energy`);
          
          eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
            amount: effects.energyRestore || 3,
            zoneType: 'energy'
          });
          break;
          
        case 'bonus':
          this.handleEnergyRestore(effects.energyRestore || 2, 'bonus_zone');
          this.handleBonusResources(effects.resourceAmount || 2);
          eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus zone: resources + energy!`);
          break;
          
        case 'inactive':
        default:
          eventBus.emit(GameEvents.NOTIFICATION, '⚫ Inactive zone - no effect');
          this.resetCombo('missed target');
          break;
      }
    } catch (error) {
      console.error('❌ Error handling special zone hit:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Error processing zone effect');
    }
    
    // Эмитируем событие промаха
    eventBus.emit(GameEvents.ZONE_MISS, {
      zone: zoneIndex,
      target: this.gameState.targetZone,
      angle: clickResult.angle || 0
    });
  }

  // ИСПРАВЛЕНИЕ: Безопасное перемещение целевой зоны
  handleZoneShuffle(clickResult) {
    // ИСПРАВЛЕНИЕ: Валидируем входные данные
    if (!clickResult || typeof clickResult.zoneIndex !== 'number') {
      console.warn('⚠️ Invalid click result for zone shuffle');
      return;
    }
    
    const { zoneIndex } = clickResult;
    
    if (zoneIndex === this.gameState.targetZone && 
        Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      
      // Reverse Controls debuff
      if (this.gameState.debuffs && this.gameState.debuffs.includes('reverseControls')) {
        // ИСПРАВЛЕНИЕ: Безопасное вычисление нового таргета для обратного направления
        const newTarget = (this.gameState.targetZone - 1 + 8) % 8; // 8 = ZONE_COUNT
        
        // ИСПРАВЛЕНИЕ: Проверяем наличие ZoneManager перед вызовом
        if (this.zoneManager && typeof this.zoneManager.setTargetZone === 'function') {
          this.zoneManager.setTargetZone(newTarget);
        } else {
          console.warn('⚠️ ZoneManager not available for reverse controls');
        }
        
        eventBus.emit(GameEvents.TEMP_MESSAGE, '🙃 Reverse Controls: Zone moves backward');
      } else {
        // ИСПРАВЛЕНИЕ: Безопасное использование ZoneManager для перемешивания
        if (this.zoneManager && typeof this.zoneManager.shuffleZones === 'function') {
          try {
            this.zoneManager.shuffleZones();
          } catch (error) {
            console.error('❌ Error shuffling zones:', error);
          }
        } else {
          console.warn('⚠️ ZoneManager not available for zone shuffling');
        }
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
        target: this.gameState.targetZone,
        deadline: 0,
        reason: reason,
        previousCount: oldCombo
      });
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная проверка энергии для клика
  checkEnergyForClick(energyCost) {
    // ИСПРАВЛЕНИЕ: Валидируем energyCost
    const cost = (typeof energyCost === 'number' && !isNaN(energyCost)) ? energyCost : 1;
    
    // ИСПРАВЛЕНИЕ: Безопасная проверка наличия energyManager
    if (!this.gameState.energyManager) {
      console.warn('⚠️ Energy manager not available, allowing click');
      return true;
    }
    
    try {
      if (!this.gameState.energyManager.canClick()) {
        const energyInfo = this.gameState.energyManager.getEnergyInfo();
        if (energyInfo) {
          eventBus.emit(GameEvents.NOTIFICATION, 
            `⚡ Not enough energy! Need ${energyInfo.clickCost}, have ${energyInfo.current}`);
        } else {
          eventBus.emit(GameEvents.NOTIFICATION, '⚡ Not enough energy!');
        }
        return false;
      }
    } catch (error) {
      console.error('❌ Error checking energy for click:', error);
      return true; // Разрешаем клик в случае ошибки
    }
    
    return true;
  }

  // ИСПРАВЛЕНИЕ: Безопасная нормализация угла
  normalizeAngle(angle) {
    // ИСПРАВЛЕНИЕ: Валидируем входной параметр
    if (typeof angle !== 'number' || isNaN(angle)) {
      console.warn('⚠️ Invalid angle provided:', angle);
      return null;
    }
    
    try {
      return ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    } catch (error) {
      console.error('❌ Error normalizing angle:', error);
      return null;
    }
  }

  // Проверка активности Ghost Click
  isGhostClickActive() {
    return this.gameState.debuffs && 
           this.gameState.debuffs.includes('ghost');
  }

  // Проверка активности Heavy Click
  isHeavyClickActive() {
    return this.gameState.debuffs && 
           this.gameState.debuffs.includes('heavyClick');
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка Heavy Click debuff
  handleHeavyClick(clickResult) {
    // ИСПРАВЛЕНИЕ: Валидируем clickResult
    if (!clickResult || typeof clickResult.zoneIndex !== 'number') {
      console.warn('⚠️ Invalid click result for heavy click handling');
      return false;
    }
    
    const { zoneIndex } = clickResult;
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const zoneKey = `zone_${zoneIndex}`;
    
    // ИСПРАВЛЕНИЕ: Безопасная инициализация состояний эффектов
    if (!this.gameState.effectStates) {
      this.gameState.effectStates = {};
    }
    
    if (!this.gameState.effectStates.heavyClickRequired) {
      this.gameState.effectStates.heavyClickRequired = {};
    }
    
    // Сбрасываем счетчики для всех остальных зон
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

  // ИСПРАВЛЕНИЕ: Безопасная обработка комбо
  handleCombo(clickResult, now) {
    // ИСПРАВЛЕНИЕ: Валидируем входные параметры
    if (!clickResult || typeof now !== 'number') {
      console.warn('⚠️ Invalid parameters for combo handling');
      return 0;
    }
    
    const { zoneIndex, angle } = clickResult;
    
    // Сохраняем угол для отладки
    if (this.gameState.combo) {
      this.gameState.combo.lastAngle = angle || 0;
    }
    
    // Time Stretch skill - увеличение времени комбо
    const extraTime = this.getSkillBonus('duration', 'combo_timeout');
    const comboTimeout = GAME_CONSTANTS.COMBO_TIMEOUT + extraTime;
    
    // Проверяем заморозку комбо (Freeze debuff)
    const isComboFrozen = this.gameState.debuffs && 
                         this.gameState.debuffs.includes('freeze');
    
    const safeNow = Math.max(now, 0);
    const currentDeadline = this.gameState.combo?.deadline || 0;
    
    if (!isComboFrozen) {
      // Проверяем истечение комбо
      const comboExpired = this.gameState.combo.count > 0 && safeNow > currentDeadline;
      
      if (comboExpired) {
        console.log(`⏰ Combo expired on hit (was ${this.gameState.combo.count}), starting new combo`);
        this.gameState.combo.count = 1;
      } else {
        this.gameState.combo.count++;
      }
      
      console.log(`✅ TARGET HIT! Combo: ${this.gameState.combo.count}`);
      
      // Обновляем deadline
      this.gameState.combo.deadline = safeNow + comboTimeout;
      
    } else {
      console.log(`❄️ Combo frozen at ${this.gameState.combo.count}`);
    }
    
    // Обновляем последнюю зону
    this.gameState.combo.lastZone = zoneIndex;
    
    // Ограничиваем комбо максимальным значением
    this.gameState.combo.count = Math.min(
      Math.max(0, this.gameState.combo.count),
      GAME_CONSTANTS.MAX_COMBO_COUNT
    );
    
    // Combo Master skill - увеличение эффективности комбо
    const comboMultiplier = 1 + this.getSkillBonus('multiplier', 'combo');
    const effectiveCombo = Math.floor(this.gameState.combo.count * comboMultiplier);
    
    // Эмитируем событие изменения комбо
    eventBus.emit(GameEvents.COMBO_CHANGED, {
      count: this.gameState.combo.count,
      effective: effectiveCombo,
      zone: zoneIndex,
      target: this.gameState.targetZone,
      deadline: this.gameState.combo.deadline,
      timeLeft: Math.max(0, this.gameState.combo.deadline - safeNow),
      reason: 'target_hit'
    });
    
    console.log(`📊 Combo state: ${this.gameState.combo.count} (effective: ${effectiveCombo})`);
    
    return effectiveCombo;
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка получения золота
  handleGoldGain(clickResult, effectiveCombo) {
    // ИСПРАВЛЕНИЕ: Валидируем входные параметры
    if (typeof effectiveCombo !== 'number' || isNaN(effectiveCombo)) {
      console.warn('⚠️ Invalid effective combo for gold gain');
      effectiveCombo = 1;
    }
    
    let clickMultiplier = 1;
    
    // Double Tap buff
    if (this.gameState.buffs && this.gameState.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let goldGain = Math.max(1, effectiveCombo * clickMultiplier);
    
    // Golden Touch skill
    const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
    goldGain = Math.floor(goldGain * goldMultiplier);
    
    // Frenzy buff
    if (this.gameState.buffs && this.gameState.buffs.includes('frenzy')) {
      goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
    }
    
    // Golden Touch buff (эпический)
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
    this.handleResourceFinder(effectiveCombo);
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED, { 
      resource: 'gold', 
      amount: this.gameState.resources.gold 
    });
    
    // Эмитируем событие получения ресурса для достижений
    eventBus.emit(GameEvents.RESOURCE_GAINED, {
      resource: 'gold',
      amount: goldGain
    });
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка восстановления энергии
  handleEnergyRestore(amount, zoneType) {
    // ИСПРАВЛЕНИЕ: Валидируем параметры
    const restoreAmount = (typeof amount === 'number' && !isNaN(amount)) ? Math.max(0, amount) : 0;
    const sourceType = (typeof zoneType === 'string') ? zoneType : 'unknown';
    
    if (this.gameState.energyManager && typeof this.gameState.energyManager.restoreEnergy === 'function') {
      try {
        const now = Date.now();
        
        // Используем правильные методы восстановления энергии
        this.gameState.energyManager.restoreEnergy(restoreAmount, sourceType);
        
        // Эмитируем событие без дополнительных уведомлений
        eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
          amount: restoreAmount,
          zoneType: sourceType
        });
      } catch (error) {
        console.error('❌ Error restoring energy:', error);
      }
    } else {
      console.warn('⚠️ Energy manager not available for energy restore');
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка бонусных ресурсов
  handleBonusResources(amount) {
    // ИСПРАВЛЕНИЕ: Валидируем количество
    const bonusAmount = (typeof amount === 'number' && !isNaN(amount)) ? Math.max(1, amount) : 2;
    
    try {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      if (!resourcePool || resourcePool.length === 0) {
        console.warn('⚠️ No tradeable resources available for bonus');
        return;
      }
      
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      
      this.addResource(randomResource, bonusAmount);
      eventBus.emit(GameEvents.RESOURCE_GAINED, {
        resource: randomResource,
        amount: bonusAmount
      });
    } catch (error) {
      console.error('❌ Error handling bonus resources:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка потребления энергии
  handleEnergyConsumption(cost) {
    // ИСПРАВЛЕНИЕ: Валидируем стоимость
    const energyCost = (typeof cost === 'number' && !isNaN(cost)) ? Math.max(0, cost) : 1;
    
    if (this.gameState.energyManager && typeof this.gameState.energyManager.consumeEnergy === 'function') {
      try {
        this.gameState.energyManager.consumeEnergy(energyCost);
      } catch (error) {
        console.error('❌ Error consuming energy:', error);
      }
    } else {
      console.warn('⚠️ Energy manager not available for energy consumption');
    }
  }

  // Star Power buff
  handleStarPower() {
    if (this.gameState.buffs && this.gameState.buffs.includes('starPower') && 
        this.gameState.effectStates && this.gameState.effectStates.starPowerClicks > 0) {
      
      try {
        const resourcePool = getResourcesInGroup('TRADEABLE');
        if (!resourcePool || resourcePool.length === 0) {
          console.warn('⚠️ No tradeable resources for star power');
          return;
        }
        
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
          this.removeBuff('starPower');
        }
      } catch (error) {
        console.error('❌ Error handling star power:', error);
      }
    }
  }

  // Slot Machine buff
  handleSlotMachine() {
    if (this.gameState.buffs && this.gameState.buffs.includes('slotMachine') && 
        Math.random() < GAME_CONSTANTS.SLOT_MACHINE_CHANCE) {
      
      try {
        const resourcePool = getResourcesInGroup('TRADEABLE');
        if (!resourcePool || resourcePool.length === 0) {
          console.warn('⚠️ No tradeable resources for slot machine');
          return;
        }
        
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = GAME_CONSTANTS.SLOT_MACHINE_AMOUNT;
        
        this.addResource(randomResource, bonusAmount);
        
        eventBus.emit(GameEvents.SLOT_MACHINE_WIN, {
          resource: randomResource,
          amount: bonusAmount
        });
      } catch (error) {
        console.error('❌ Error handling slot machine:', error);
      }
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная Resource Finder skill
  handleResourceFinder(effectiveCombo) {
    // ИСПРАВЛЕНИЕ: Валидируем effectiveCombo
    const safeCombo = (typeof effectiveCombo === 'number' && !isNaN(effectiveCombo)) ? 
                     Math.max(1, effectiveCombo) : 1;
    
    try {
      const bonusChance = this.getSkillBonus('chance', 'bonus_resource');
      
      if (Math.random() < bonusChance) {
        const resourcePool = getResourcesInGroup('TRADEABLE');
        if (!resourcePool || resourcePool.length === 0) {
          console.warn('⚠️ No tradeable resources for resource finder');
          return;
        }
        
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        const bonusAmount = Math.max(1, Math.floor(safeCombo * 0.5));
        
        this.addResource(randomResource, bonusAmount);
        
        eventBus.emit(GameEvents.BONUS_RESOURCE_FOUND, {
          resource: randomResource,
          amount: bonusAmount
        });
      }
    } catch (error) {
      console.error('❌ Error handling resource finder:', error);
    }
  }

  // Обработка шанса появления эффектов
  handleEffectChance() {
    if (Math.random() * 100 < GAME_CONSTANTS.BASE_EFFECT_CHANCE) {
      const variation = (Math.random() - 0.5) * 
                       (GAME_CONSTANTS.EFFECT_CHANCE_RANGE.max - GAME_CONSTANTS.EFFECT_CHANCE_RANGE.min);
      
      // Lucky Charm skill
      const buffChanceBonus = this.getSkillBonus('chance', 'buff') * 100;
      
      // Lucky Zone buff
      const luckyBonus = (this.gameState.buffs && this.gameState.buffs.includes('lucky')) ? 
                        GAME_CONSTANTS.LUCKY_BUFF_BONUS : 0;
      
      // Inner Peace skill
      const chaosReduction = this.getSkillBonus('reduction', 'chaos');
      const effectiveChaos = Math.max(0, (this.gameState.resources.chaos || 0) * (1 - chaosReduction));
      
      // Curse debuff
      const curseReduction = (this.gameState.debuffs && this.gameState.debuffs.includes('curse')) ? 50 : 0;
      
      let buffChance = GAME_CONSTANTS.BASE_EFFECT_CHANCE + 
                      ((this.gameState.resources.faith || 0) - effectiveChaos) + 
                      variation + 
                      buffChanceBonus + 
                      luckyBonus - 
                      curseReduction;
      
      buffChance = Math.max(0, Math.min(100, buffChance));

      if (Math.random() * 100 < buffChance) {
        this.triggerRandomBuff();
      } else {
        this.triggerRandomDebuff();
      }
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасный вызов случайного баффа
  triggerRandomBuff() {
    if (this.buffManager && typeof this.buffManager.applyRandomBuff === 'function') {
      try {
        this.buffManager.applyRandomBuff();
      } catch (error) {
        console.error('❌ Error triggering random buff:', error);
      }
    } else {
      console.warn('⚠️ BuffManager not available for triggering buff');
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасный вызов случайного дебаффа
  triggerRandomDebuff() {
    if (this.buffManager && typeof this.buffManager.applyRandomDebuff === 'function') {
      try {
        this.buffManager.applyRandomDebuff();
      } catch (error) {
        console.error('❌ Error triggering random debuff:', error);
      }
    } else {
      console.warn('⚠️ BuffManager not available for triggering debuff');
    }
  }

  // ===== УТИЛИТЫ =====

  // ИСПРАВЛЕНИЕ: Безопасное получение бонуса от навыков
  getSkillBonus(type, target = null) {
    try {
      if (this.gameState.skillManager && 
          typeof this.gameState.skillManager.getSkillBonus === 'function') {
        return this.gameState.skillManager.getSkillBonus(type, target);
      }
    } catch (error) {
      console.error('❌ Error getting skill bonus:', error);
    }
    return 0;
  }

  // ИСПРАВЛЕНИЕ: Безопасное добавление ресурса
  addResource(resourceName, amount) {
    // ИСПРАВЛЕНИЕ: Валидируем параметры
    if (typeof resourceName !== 'string' || !resourceName.trim()) {
      console.warn('⚠️ Invalid resource name for addResource:', resourceName);
      return false;
    }
    
    const safeAmount = (typeof amount === 'number' && !isNaN(amount)) ? Math.max(0, amount) : 0;
    
    try {
      if (this.gameState.addResource && typeof this.gameState.addResource === 'function') {
        return this.gameState.addResource(resourceName, safeAmount);
      } else {
        // Fallback method
        if (!this.gameState.resources) {
          this.gameState.resources = {};
        }
        
        const currentAmount = this.gameState.resources[resourceName] || 0;
        const newAmount = Math.min(
          currentAmount + safeAmount,
          GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
        );
        this.gameState.resources[resourceName] = newAmount;
        return true;
      }
    } catch (error) {
      console.error('❌ Error adding resource:', error);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасное удаление баффа
  removeBuff(buffId) {
    try {
      if (this.gameState.buffs && Array.isArray(this.gameState.buffs)) {
        this.gameState.buffs = this.gameState.buffs.filter(id => id !== buffId);
      }
    } catch (error) {
      console.error('❌ Error removing buff:', error);
    }
  }

  // ИСПРАВЛЕНИЕ: Методы для совместимости с ZoneManager с проверками
  
  // Получить зоны для рендеринга (для GameLoop)
  getZonesForRendering() {
    if (this.zoneManager && typeof this.zoneManager.getZonesForRendering === 'function') {
      try {
        return this.zoneManager.getZonesForRendering();
      } catch (error) {
        console.error('❌ Error getting zones for rendering:', error);
        return [];
      }
    } else {
      console.warn('⚠️ ZoneManager not available for getZonesForRendering');
      return [];
    }
  }

  // Получить информацию о зонах
  getZoneInfo() {
    if (this.zoneManager && typeof this.zoneManager.getDebugInfo === 'function') {
      try {
        return this.zoneManager.getDebugInfo();
      } catch (error) {
        console.error('❌ Error getting zone info:', error);
        return { error: error.message };
      }
    } else {
      console.warn('⚠️ ZoneManager not available for getZoneInfo');
      return { error: 'ZoneManager not available' };
    }
  }

  // Получить отладочную информацию о зонах
  getZonesDebugInfo() {
    return this.getZoneInfo();
  }

  // ИСПРАВЛЕНИЕ: Безопасный принудительный сброс зон
  forceZoneReset() {
    console.log('🔄 Force resetting zones...');
    
    if (this.zoneManager && typeof this.zoneManager.reset === 'function') {
      try {
        this.zoneManager.reset();
        console.log('✅ Zones reset successfully');
      } catch (error) {
        console.error('❌ Error resetting zones:', error);
      }
    } else {
      console.warn('⚠️ ZoneManager not available for force reset');
    }
  }

  // Принудительный сброс комбо (для отладки)
  forceResetCombo() {
    console.log('🔄 Force resetting combo...');
    
    try {
      if (!this.gameState.combo) {
        this.gameState.combo = {};
      }
      
      this.gameState.combo.count = 0;
      this.gameState.combo.deadline = 0;
      this.gameState.combo.lastZone = null;
      this.gameState.combo.lastAngle = null;
      
      eventBus.emit(GameEvents.COMBO_CHANGED, {
        count: 0,
        effective: 0,
        zone: null,
        target: this.gameState.targetZone,
        deadline: 0,
        reason: 'force_reset'
      });
      
      console.log('✅ Combo reset successfully');
    } catch (error) {
      console.error('❌ Error resetting combo:', error);
    }
  }

  // Получить время до истечения комбо
  getComboTimeLeft() {
    try {
      if (!this.gameState.combo || this.gameState.combo.count === 0) {
        return 0;
      }
      
      const now = Date.now();
      const deadline = this.gameState.combo.deadline || 0;
      return Math.max(0, deadline - now);
    } catch (error) {
      console.error('❌ Error getting combo time left:', error);
      return 0;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная статистика кликов
  getClickStats() {
    try {
      return {
        currentCombo: this.gameState.combo?.count || 0,
        comboDeadline: this.gameState.combo?.deadline || 0,
        comboTimeLeft: this.getComboTimeLeft(),
        lastClickedZone: this.gameState.combo?.lastZone,
        blockedUntil: this.gameState.blockedUntil || 0,
        activeEffects: {
          buffs: this.gameState.buffs?.length || 0,
          debuffs: this.gameState.debuffs?.length || 0
        },
        zoneStatistics: this.getZoneStatistics(),
        zoneManagerAvailable: !!this.zoneManager
      };
    } catch (error) {
      console.error('❌ Error getting click stats:', error);
      return {
        currentCombo: 0,
        error: error.message
      };
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная установка целевой зоны
  setTargetZone(zoneIndex) {
    if (this.zoneManager && typeof this.zoneManager.setTargetZone === 'function') {
      try {
        return this.zoneManager.setTargetZone(zoneIndex);
      } catch (error) {
        console.error('❌ Error setting target zone:', error);
        return false;
      }
    } else {
      console.warn('⚠️ ZoneManager not available for setTargetZone');
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная статистика зон
  getZoneStatistics() {
    if (this.zoneManager && typeof this.zoneManager.getZoneStatistics === 'function') {
      try {
        return this.zoneManager.getZoneStatistics();
      } catch (error) {
        console.error('❌ Error getting zone statistics:', error);
        return { error: error.message };
      }
    } else {
      console.warn('⚠️ ZoneManager not available for getZoneStatistics');
      return { error: 'ZoneManager not available' };
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная проверка состояния ZoneManager
  isZoneManagerReady() {
    return !!(this.zoneManager && 
             typeof this.zoneManager.getZonesForRendering === 'function' &&
             typeof this.zoneManager.findZoneByAngle === 'function');
  }

  // ИСПРАВЛЕНИЕ: Получить отладочную информацию о FeatureManager
  getFeatureManagerDebugInfo() {
    return {
      zoneManagerAvailable: !!this.zoneManager,
      zoneManagerReady: this.isZoneManagerReady(),
      buffManagerAvailable: !!this.buffManager,
      gameStateReady: !!(this.gameState && this.gameState.combo),
      comboCheckInterval: !!this.comboCheckInterval,
      lastEnergyNotification: this.lastEnergyNotification,
      currentCombo: this.gameState.combo?.count || 0,
      targetZone: this.gameState.targetZone || 0,
      activeBuffs: this.gameState.buffs?.length || 0,
      activeDebuffs: this.gameState.debuffs?.length || 0,
      isActive: this.isActive()
    };
  }

  // ИСПРАВЛЕНИЕ: Безопасная валидация состояния
  validateState() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Проверяем основные компоненты
    if (!this.gameState) {
      validation.errors.push('GameState is null');
      validation.isValid = false;
    }

    if (!this.zoneManager) {
      validation.errors.push('ZoneManager is null');
      validation.isValid = false;
    }

    if (!this.buffManager) {
      validation.warnings.push('BuffManager is null');
    }

    // Проверяем состояние комбо
    if (this.gameState && !this.gameState.combo) {
      validation.warnings.push('Combo state not initialized');
    }

    // Проверяем состояние эффектов
    if (this.gameState && !this.gameState.effectStates) {
      validation.warnings.push('Effect states not initialized');
    }

    // Проверяем ZoneManager готовность
    if (this.zoneManager && !this.isZoneManagerReady()) {
      validation.errors.push('ZoneManager not ready');
      validation.isValid = false;
    }

    return validation;
  }

  // ИСПРАВЛЕНИЕ: Безопасная инициализация состояний
  initializeStates() {
    console.log('🔧 Initializing FeatureManager states...');

    try {
      // Инициализируем состояние комбо
      if (!this.gameState.combo) {
        this.gameState.combo = {
          count: 0,
          deadline: 0,
          lastZone: null,
          lastAngle: null
        };
      }

      // Инициализируем состояния эффектов
      if (!this.gameState.effectStates) {
        this.gameState.effectStates = {
          starPowerClicks: 0,
          shieldBlocks: 0,
          heavyClickRequired: {},
          reverseDirection: 1,
          frozenCombo: false
        };
      }

      // Инициализируем массивы эффектов
      if (!this.gameState.buffs) {
        this.gameState.buffs = [];
      }

      if (!this.gameState.debuffs) {
        this.gameState.debuffs = [];
      }

      // Проверяем ZoneManager
      if (!this.zoneManager) {
        console.warn('⚠️ ZoneManager not available, attempting to recreate...');
        try {
          this.zoneManager = new ZoneManager(this.gameState);
          this.cleanupManager.registerComponent(this.zoneManager, 'ZoneManager');
          console.log('✅ ZoneManager recreated successfully');
        } catch (error) {
          console.error('❌ Failed to recreate ZoneManager:', error);
        }
      }

      console.log('✅ FeatureManager states initialized');
      return true;

    } catch (error) {
      console.error('❌ Error initializing FeatureManager states:', error);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасное принудительное обновление
  forceUpdate() {
    console.log('🔄 Force updating FeatureManager...');

    try {
      // Валидируем состояние
      const validation = this.validateState();
      if (!validation.isValid) {
        console.log('🔧 State validation failed, reinitializing...');
        this.initializeStates();
      }

      // Обновляем ZoneManager если доступен
      if (this.zoneManager && typeof this.zoneManager.forceUpdate === 'function') {
        this.zoneManager.forceUpdate();
      }

      // Сбрасываем комбо до безопасного состояния
      this.forceResetCombo();

      console.log('✅ FeatureManager force update completed');
      return true;

    } catch (error) {
      console.error('❌ Error during FeatureManager force update:', error);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасное восстановление после ошибки
  recoverFromError(error) {
    console.log('🔧 Attempting to recover FeatureManager from error:', error.message);

    try {
      // Останавливаем все таймеры
      if (this.comboCheckInterval) {
        this.cleanupManager.clearInterval(this.comboCheckInterval);
        this.comboCheckInterval = null;
      }

      // Переинициализируем состояния
      this.initializeStates();

      // Перезапускаем таймеры
      this.startComboTimer();

      // Принудительно обновляем все
      this.forceUpdate();

      console.log('✅ FeatureManager recovery completed');
      return true;

    } catch (recoveryError) {
      console.error('❌ Failed to recover FeatureManager:', recoveryError);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная очистка и сброс
  resetToDefaults() {
    console.log('🔄 Resetting FeatureManager to defaults...');

    try {
      // Сбрасываем состояние комбо
      this.gameState.combo = {
        count: 0,
        deadline: 0,
        lastZone: null,
        lastAngle: null
      };

      // Сбрасываем эффекты
      this.gameState.buffs = [];
      this.gameState.debuffs = [];
      this.gameState.effectStates = {
        starPowerClicks: 0,
        shieldBlocks: 0,
        heavyClickRequired: {},
        reverseDirection: 1,
        frozenCombo: false
      };

      // Сбрасываем блокировки
      this.gameState.blockedUntil = 0;

      // Сбрасываем целевую зону
      this.gameState.targetZone = 0;
      this.gameState.previousTargetZone = 0;

      // Сбрасываем ZoneManager
      if (this.zoneManager && typeof this.zoneManager.reset === 'function') {
        this.zoneManager.reset();
      }

      // Эмитируем события обновления
      eventBus.emit(GameEvents.COMBO_CHANGED, {
        count: 0,
        effective: 0,
        zone: null,
        target: 0,
        deadline: 0,
        reason: 'reset'
      });

      console.log('✅ FeatureManager reset to defaults completed');
      return true;

    } catch (error) {
      console.error('❌ Error resetting FeatureManager:', error);
      return false;
    }
  }

  // Деструктор
  destroy() {
    console.log('🧹 FeatureManager cleanup started');
    
    // Останавливаем таймеры
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
      this.comboCheckInterval = null;
    }
    
    // Очищаем ссылки
    this.zoneManager = null;
    this.buffManager = null;
    
    super.destroy();
    
    console.log('✅ FeatureManager destroyed');
  }
}