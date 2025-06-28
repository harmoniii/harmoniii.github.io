// managers/FeatureManager.js - ИСПРАВЛЕННАЯ версия с точным определением попадания
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { ZoneManager } from './ZoneManager.js';
import { AngleManager } from '../utils/AngleManager.js';
import { ZoneEventQueue } from '../core/ZoneEventQueue.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

export class FeatureManager extends CleanupMixin {
  constructor(gameState, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.buffManager = buffManager;
    
    // Инициализация ZoneManager с проверками
    this.zoneManager = null;
    this.initializeZoneManager();
    
    this.comboCheckInterval = null;
    
    // Ограничение на частоту уведомлений об энергии
    this.lastEnergyNotification = 0;
    this.energyNotificationCooldown = 2000;
    
    // Статистика кликов для отладки
    this.clickStats = {
      totalClicks: 0,
      hitClicks: 0,
      missClicks: 0,
      lastClickTime: 0,
      averageAccuracy: 0,
      accuracyHistory: []
    };
    
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized with enhanced hit detection');
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная инициализация ZoneManager
   */
  initializeZoneManager() {
    try {
      console.log('🎯 Initializing ZoneManager...');
      
      this.zoneManager = new ZoneManager(this.gameState);
      this.cleanupManager.registerComponent(this.zoneManager, 'ZoneManager');
      
      console.log('✅ ZoneManager initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize ZoneManager:', error);
      this.zoneManager = null;
      return false;
    }
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

  /**
   * ИСПРАВЛЕНИЕ: Точная обработка кликов с улучшенным определением попадания
   */
  handleClick(angle) {
    if (!this.isActive()) {
      console.warn('⚠️ FeatureManager not active, ignoring click');
      return;
    }
    
    // Валидация угла
    const normalizedAngle = AngleManager.normalize(angle);
    if (!AngleManager.isValidAngle(normalizedAngle)) {
      console.warn('⚠️ Invalid angle provided to handleClick:', angle);
      return;
    }
    
    const now = Date.now();
    
    // Проверяем блокировку (Zone Lock debuff)
    if (now < (this.gameState.blockedUntil || 0)) {
      eventBus.emit(GameEvents.NOTIFICATION, '🔒 Zone is locked!');
      return;
    }

    // Обновляем статистику кликов
    this.updateClickStats(normalizedAngle);
    
    // ИСПРАВЛЕНИЕ: Точное определение зоны с fallback
    const clickResult = this.determineClickZone(normalizedAngle);
    
    if (!clickResult) {
      console.warn('⚠️ Could not determine click zone for angle:', normalizedAngle);
      this.handleClickMiss(normalizedAngle, now);
      return;
    }

    console.log(`🖱️ Click processed: zone ${clickResult.zoneIndex}, target: ${this.gameState.targetZone}, accuracy: ${clickResult.accuracy?.toFixed(3) || 'N/A'}`);
    
    // Обрабатываем клик в зависимости от типа зоны
    this.processZoneClick(clickResult, now);
  }

  /**
   * ИСПРАВЛЕНИЕ: Точное определение зоны клика с множественными методами
   */
  determineClickZone(angle) {
    let clickResult = null;
    
    // Метод 1: Используем ZoneManager если доступен
    if (this.zoneManager && typeof this.zoneManager.findZoneByAngle === 'function') {
      try {
        const foundZone = this.zoneManager.findZoneByAngle(angle);
        if (foundZone) {
          clickResult = this.zoneManager.handleZoneClick(foundZone, angle);
        }
      } catch (error) {
        console.warn('⚠️ Error using ZoneManager for zone detection:', error);
      }
    }
    
    // Метод 2: Fallback с математическим вычислением
    if (!clickResult) {
      console.log('🔄 Using fallback zone detection');
      clickResult = this.calculateZoneFromAngle(angle);
    }
    
    // Метод 3: Аварийный fallback
    if (!clickResult) {
      console.warn('⚠️ All zone detection methods failed, using emergency fallback');
      clickResult = this.createEmergencyClickResult(angle);
    }
    
    return clickResult;
  }

  /**
   * Математическое вычисление зоны по углу
   */
  calculateZoneFromAngle(angle) {
    try {
      const zoneCount = 8; // ZONE_COUNT
      const stepAngle = (2 * Math.PI) / zoneCount;
      
      // Вычисляем индекс зоны
      const zoneIndex = Math.floor(angle / stepAngle) % zoneCount;
      
      // Получаем тип зоны
      const isTarget = zoneIndex === (this.gameState.targetZone || 0);
      let zoneType = { id: 'inactive', effects: { energyCost: 0 } };
      
      if (isTarget) {
        zoneType = { 
          id: 'target', 
          effects: { 
            givesGold: true, 
            givesCombo: true, 
            energyCost: 1 
          } 
        };
      }
      
      // Вычисляем точность
      const zoneStartAngle = zoneIndex * stepAngle;
      const zoneEndAngle = (zoneIndex + 1) * stepAngle;
      const zoneCenterAngle = zoneStartAngle + (stepAngle / 2);
      
      const distanceToCenter = AngleManager.getAngleDistance(angle, zoneCenterAngle);
      const maxDistance = stepAngle / 2;
      const accuracy = Math.max(0, 1 - (distanceToCenter / maxDistance));
      
      return {
        zoneIndex,
        zoneType,
        angle,
        isTarget,
        effects: { ...zoneType.effects },
        accuracy,
        method: 'mathematical'
      };
      
    } catch (error) {
      console.error('❌ Error in mathematical zone calculation:', error);
      return null;
    }
  }

  /**
   * Создание аварийного результата клика
   */
  createEmergencyClickResult(angle) {
    console.warn('🆘 Creating emergency click result');
    
    return {
      zoneIndex: 0,
      zoneType: { id: 'inactive', effects: { energyCost: 0 } },
      angle,
      isTarget: false,
      effects: { energyCost: 0 },
      accuracy: 0.5,
      method: 'emergency'
    };
  }

  /**
   * Обработка промаха
   */
  handleClickMiss(angle, now) {
    console.log(`❌ Click miss at angle ${angle.toFixed(3)}`);
    
    this.clickStats.missClicks++;
    
    // Сбрасываем комбо при промахе
    this.resetCombo('click_miss');
    
    // Эмитируем событие промаха
    eventBus.emit(GameEvents.ZONE_MISS, {
      angle,
      target: this.gameState.targetZone,
      timestamp: now,
      reason: 'no_zone_found'
    });
    
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Click missed!');
  }

  /**
   * Обновление статистики кликов
   */
  updateClickStats(angle) {
    this.clickStats.totalClicks++;
    this.clickStats.lastClickTime = Date.now();
    
    // Ограничиваем историю точности
    if (this.clickStats.accuracyHistory.length > 100) {
      this.clickStats.accuracyHistory.shift();
    }
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка кликов по зонам
   */
  processZoneClick(clickResult, now) {
    // Валидируем входные параметры
    if (!clickResult || typeof clickResult !== 'object') {
      console.warn('⚠️ Invalid click result provided to processZoneClick');
      return;
    }
    
    const { zoneIndex, zoneType, isTarget, effects, accuracy } = clickResult;
    
    // Валидируем обязательные поля
    if (typeof zoneIndex !== 'number' || !zoneType) {
      console.warn('⚠️ Invalid click result structure:', clickResult);
      return;
    }
    
    // Добавляем точность в статистику
    if (typeof accuracy === 'number') {
      this.clickStats.accuracyHistory.push(accuracy);
      this.clickStats.averageAccuracy = this.clickStats.accuracyHistory.reduce((a, b) => a + b, 0) / this.clickStats.accuracyHistory.length;
    }
    
    if (isTarget) {
      // Клик по целевой зоне
      this.handleTargetZoneHit(clickResult, now);
      this.clickStats.hitClicks++;
    } else {
      // Клик по специальной зоне
      this.handleSpecialZoneHit(clickResult, now);
      this.clickStats.missClicks++;
    }
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка попадания в целевую зону
   */
  handleTargetZoneHit(clickResult, now) {
    if (!clickResult || !clickResult.effects) {
      console.warn('⚠️ Invalid click result for target zone hit');
      return;
    }
    
    const { zoneIndex, effects, accuracy = 0.5 } = clickResult;
    
    console.log(`🎯 HIT TARGET ZONE ${zoneIndex}! Accuracy: ${accuracy.toFixed(3)}`);
    
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

    // Обрабатываем комбо с учетом точности
    const effectiveCombo = this.handleCombo(clickResult, now, accuracy);
    
    // Обрабатываем получение золота с бонусом за точность
    this.handleGoldGain(clickResult, effectiveCombo, accuracy);
    
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
      accuracy: accuracy,
      isTarget: true,
      timestamp: now
    });
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка попадания в специальные зоны
   */
  handleSpecialZoneHit(clickResult, now) {
    if (!clickResult || !clickResult.zoneType || !clickResult.effects) {
      console.warn('⚠️ Invalid click result for special zone hit');
      return;
    }
    
    const { zoneIndex, zoneType, effects, accuracy = 0.5 } = clickResult;
    
    console.log(`⚡ HIT SPECIAL ZONE ${zoneIndex} (${zoneType.id}) - Accuracy: ${accuracy.toFixed(3)}`);
    
    try {
      switch (zoneType.id) {
        case 'energy':
          const energyRestore = Math.floor((effects.energyRestore || 3) * (1 + accuracy * 0.5));
          this.handleEnergyRestore(energyRestore, 'energy_zone');
          eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy zone: +${energyRestore} Energy (${(accuracy * 100).toFixed(1)}% accuracy)`);
          
          eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
            amount: energyRestore,
            accuracy: accuracy,
            zoneType: 'energy'
          });
          break;
          
        case 'bonus':
          const energyBonus = Math.floor((effects.energyRestore || 2) * (1 + accuracy * 0.3));
          const resourceBonus = Math.floor((effects.resourceAmount || 2) * (1 + accuracy * 0.5));
          
          this.handleEnergyRestore(energyBonus, 'bonus_zone');
          this.handleBonusResources(resourceBonus);
          eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus zone: +${resourceBonus} resources + ${energyBonus} energy!`);
          break;
          
        case 'inactive':
        default:
          eventBus.emit(GameEvents.NOTIFICATION, '⚫ Inactive zone - no effect');
          this.resetCombo('hit inactive zone');
          break;
      }
    } catch (error) {
      console.error('❌ Error handling special zone hit:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Error processing zone effect');
    }
    
    // Эмитируем событие промаха (попадание в не-целевую зону)
    eventBus.emit(GameEvents.ZONE_MISS, {
      zone: zoneIndex,
      target: this.gameState.targetZone,
      angle: clickResult.angle || 0,
      accuracy: accuracy,
      zoneType: zoneType.id,
      timestamp: now
    });
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасное перемещение целевой зоны с использованием событий
   */
  handleZoneShuffle(clickResult) {
    if (!clickResult || typeof clickResult.zoneIndex !== 'number') {
      console.warn('⚠️ Invalid click result for zone shuffle');
      return;
    }
    
    const { zoneIndex } = clickResult;
    
    if (zoneIndex === this.gameState.targetZone && 
        Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      
      // Reverse Controls debuff
      if (this.gameState.debuffs && this.gameState.debuffs.includes('reverseControls')) {
        const newTarget = (this.gameState.targetZone - 1 + 8) % 8; // 8 = ZONE_COUNT
        
        if (this.zoneManager && typeof this.zoneManager.setTargetZone === 'function') {
          const success = this.zoneManager.setTargetZone(newTarget);
          if (success) {
            eventBus.emit(GameEvents.TEMP_MESSAGE, '🙃 Reverse Controls: Zone moves backward');
          }
        }
      } else {
        // Обычное перемешивание
        if (this.zoneManager && typeof this.zoneManager.shuffleZones === 'function') {
          try {
            this.zoneManager.shuffleZones();
          } catch (error) {
            console.error('❌ Error shuffling zones:', error);
          }
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

  /**
   * ИСПРАВЛЕНИЕ: Безопасная проверка энергии для клика
   */
  checkEnergyForClick(energyCost) {
    const cost = (typeof energyCost === 'number' && !isNaN(energyCost)) ? energyCost : 1;
    
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

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка Heavy Click debuff
   */
  handleHeavyClick(clickResult) {
    if (!clickResult || typeof clickResult.zoneIndex !== 'number') {
      console.warn('⚠️ Invalid click result for heavy click handling');
      return false;
    }
    
    const { zoneIndex } = clickResult;
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const zoneKey = `zone_${zoneIndex}`;
    
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

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка комбо с бонусом за точность
   */
  handleCombo(clickResult, now, accuracy = 0.5) {
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
      
      // Бонус к комбо за высокую точность
      if (accuracy > 0.9) {
        this.gameState.combo.count += 1; // Дополнительный бонус за идеальное попадание
        console.log(`🎯 Perfect accuracy bonus! Combo: ${this.gameState.combo.count}`);
      }
      
      console.log(`✅ TARGET HIT! Combo: ${this.gameState.combo.count} (accuracy: ${(accuracy * 100).toFixed(1)}%)`);
      
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
      accuracy: accuracy,
      reason: 'target_hit'
    });
    
    console.log(`📊 Combo state: ${this.gameState.combo.count} (effective: ${effectiveCombo})`);
    
    return effectiveCombo;
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка получения золота с бонусом за точность
   */
  handleGoldGain(clickResult, effectiveCombo, accuracy = 0.5) {
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
    
    // Бонус за точность (до 50% дополнительного золота за идеальное попадание)
    const accuracyBonus = 1 + (accuracy * 0.5);
    goldGain = Math.floor(goldGain * accuracyBonus);
    
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
    this.handleResourceFinder(effectiveCombo, accuracy);
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED, { 
      resource: 'gold', 
      amount: this.gameState.resources.gold 
    });
    
    // Эмитируем событие получения ресурса для достижений
    eventBus.emit(GameEvents.RESOURCE_GAINED, {
      resource: 'gold',
      amount: goldGain,
      accuracy: accuracy
    });
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка восстановления энергии
   */
  handleEnergyRestore(amount, zoneType) {
    const restoreAmount = (typeof amount === 'number' && !isNaN(amount)) ? Math.max(0, amount) : 0;
    const sourceType = (typeof zoneType === 'string') ? zoneType : 'unknown';
    
    if (this.gameState.energyManager && typeof this.gameState.energyManager.restoreEnergy === 'function') {
      try {
        this.gameState.energyManager.restoreEnergy(restoreAmount, sourceType);
        
        eventBus.emit(GameEvents.ENERGY_ZONE