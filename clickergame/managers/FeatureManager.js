// managers/FeatureManager.js - УПРОЩЕННАЯ версия с базовой механикой зон
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { Zone } from '../utils/Zone.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

// УПРОЩЕННЫЕ типы зон
const SIMPLE_ZONE_TYPES = {
  TARGET: 'target',    // Красная целевая зона
  ENERGY: 'energy',    // Зеленая энергетическая зона  
  BONUS: 'bonus',      // Золотая бонусная зона
  INACTIVE: 'inactive' // Серая неактивная зона
};

export class FeatureManager extends CleanupMixin {
  constructor(gameState, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.buffManager = buffManager;
    this.zones = [];
    
    this.comboCheckInterval = null;
    
    // Ограничение на частоту уведомлений об энергии
    this.lastEnergyNotification = 0;
    this.energyNotificationCooldown = 2000;
    
    this.initializeZones();
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized with simplified zone system');
  }

  // УПРОЩЕННАЯ инициализация зон
  initializeZones() {
    // Проверяем целевую зону
    if (typeof this.gameState.targetZone !== 'number' || 
        this.gameState.targetZone < 0 || 
        this.gameState.targetZone >= ZONE_COUNT) {
      this.gameState.targetZone = 0;
      console.log('🎯 Reset target zone to 0');
    }
    
    if (typeof this.gameState.previousTargetZone !== 'number') {
      this.gameState.previousTargetZone = this.gameState.targetZone;
    }
    
    // Создаем простые зоны
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
      return new Zone({ type: SIMPLE_ZONE_TYPES.INACTIVE }, i, ZONE_COUNT);
    });
    
    console.log(`🎯 Zones initialized - Target: ${this.gameState.targetZone}`);
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

  // УПРОЩЕННЫЙ обработчик кликов
  handleClick(angle) {
    if (!this.isActive()) return;
    
    const now = Date.now();
    
    // Проверяем блокировку (Zone Lock debuff)
    if (now < (this.gameState.blockedUntil || 0)) {
      eventBus.emit(GameEvents.NOTIFICATION, '🔒 Zone is locked!');
      return;
    }

    // Нормализуем угол и находим зону
    const normalizedAngle = this.normalizeAngle(angle);
    const clickedZone = this.findZoneByAngle(normalizedAngle);
    
    if (!clickedZone) {
      console.warn('No zone found for angle:', normalizedAngle);
      return;
    }

    console.log(`🖱️ Click on zone ${clickedZone.index}, target: ${this.gameState.targetZone}`);
    
    // УПРОЩЕННАЯ ЛОГИКА: Проверяем попадание в целевую зону
    if (clickedZone.index === this.gameState.targetZone) {
      this.handleTargetZoneHit(clickedZone, normalizedAngle, now);
    } else {
      this.handleNonTargetZoneHit(clickedZone, normalizedAngle, now);
    }
  }

  // Обработка попадания в целевую зону
  handleTargetZoneHit(clickedZone, normalizedAngle, now) {
    console.log(`🎯 HIT TARGET ZONE ${clickedZone.index}!`);
    
    // Проверяем энергию
    if (!this.checkEnergyForClick(1)) {
      return;
    }

    // Проверяем дебаффы
    if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      eventBus.emit(GameEvents.GHOST_CLICK);
      return;
    }

    if (this.isHeavyClickActive()) {
      if (!this.handleHeavyClick(clickedZone)) {
        return;
      }
    }

    // Обрабатываем комбо
    const effectiveCombo = this.handleCombo(clickedZone, normalizedAngle, now);
    
    // Обрабатываем получение золота
    this.handleGoldGain(clickedZone, effectiveCombo);
    
    // Тратим энергию
    this.handleEnergyConsumption(1);
    
    // Перемещаем целевую зону
    this.handleZoneShuffle(clickedZone);
    
    // Обрабатываем появление баффов/дебаффов
    this.handleEffectChance();
    
    // Эмитируем событие попадания
    eventBus.emit(GameEvents.ZONE_HIT, {
      zone: clickedZone.index,
      combo: effectiveCombo,
      angle: normalizedAngle,
      isTarget: true
    });
  }

  // Обработка попадания в НЕ целевые зоны
  handleNonTargetZoneHit(clickedZone, normalizedAngle, now) {
    console.log(`❌ HIT NON-TARGET ZONE ${clickedZone.index}`);
    
    // УПРОЩЕННАЯ ЛОГИКА: Случайно определяем тип зоны
    const random = Math.random();
    
    if (random < 0.2) {
      // Зеленая зона - восстанавливает энергию
      this.handleEnergyRestore(3, 'energy_zone');
      eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy zone: +3 Energy`);
      
      eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
        amount: 3,
        zoneType: 'energy'
      });
      return;
    } else if (random < 0.35) {
      // Золотая зона - дает ресурсы и энергию
      this.handleEnergyRestore(2, 'bonus_zone');
      this.handleBonusResources(2);
      eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus zone: resources + energy!`);
      return;
    }
    
    // Серая зона - сбрасывает комбо
    eventBus.emit(GameEvents.NOTIFICATION, '⚫ Inactive zone - no effect');
    this.resetCombo('missed target');
    
    // Эмитируем событие промаха
    eventBus.emit(GameEvents.ZONE_MISS, {
      zone: clickedZone.index,
      target: this.gameState.targetZone,
      angle: normalizedAngle
    });
  }

  // Перемещение целевой зоны
  handleZoneShuffle(zone) {
    if (zone.index === this.gameState.targetZone && 
        Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      
      // Сохраняем текущую целевую зону как предыдущую
      this.gameState.previousTargetZone = this.gameState.targetZone;
      
      // Выбираем новую целевую зону
      let newTarget;
      let attempts = 0;
      const maxAttempts = ZONE_COUNT * 2;
      
      do {
        newTarget = Math.floor(Math.random() * ZONE_COUNT);
        attempts++;
      } while (newTarget === this.gameState.targetZone && 
               ZONE_COUNT > 1 && 
               attempts < maxAttempts);
      
      // Reverse Controls debuff
      if (this.gameState.debuffs && this.gameState.debuffs.includes('reverseControls')) {
        newTarget = (this.gameState.targetZone - 1 + ZONE_COUNT) % ZONE_COUNT;
        eventBus.emit(GameEvents.TEMP_MESSAGE, '🙃 Reverse Controls: Zone moves backward');
      }
      
      console.log(`🎯 Zone shuffle: ${this.gameState.targetZone} -> ${newTarget}`);
      
      // Обновляем целевую зону
      this.gameState.targetZone = newTarget;
      
      // Эмитируем событие с новой целевой зоной
      eventBus.emit(GameEvents.ZONES_SHUFFLED, newTarget);
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

  checkEnergyForClick(energyCost) {
    if (!this.gameState.energyManager) return true;
    
    if (!this.gameState.energyManager.canClick()) {
      const energyInfo = this.gameState.energyManager.getEnergyInfo();
      eventBus.emit(GameEvents.NOTIFICATION, 
        `⚡ Not enough energy! Need ${energyInfo.clickCost}, have ${energyInfo.current}`);
      return false;
    }
    
    return true;
  }

  // Нормализация угла
  normalizeAngle(angle) {
    if (typeof angle !== 'number' || isNaN(angle)) {
      return 0;
    }
    return ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  }

  // Поиск зоны по углу
  findZoneByAngle(angle) {
    return this.zones.find(zone => zone.contains(angle));
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

  // Обработка Heavy Click debuff
  handleHeavyClick(zone) {
    const required = GAME_CONSTANTS.HEAVY_CLICK_REQUIRED;
    const zoneKey = `zone_${zone.index}`;
    
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
        zone: zone.index
      });
      return false;
    } else {
      this.gameState.effectStates.heavyClickRequired[zoneKey] = 0;
      return true;
    }
  }

  // Обработка комбо
  handleCombo(zone, normalizedAngle, now) {
    // Сохраняем угол для отладки
    this.gameState.combo.lastAngle = normalizedAngle;
    
    // Time Stretch skill - увеличение времени комбо
    const extraTime = this.getSkillBonus('duration', 'combo_timeout');
    const comboTimeout = GAME_CONSTANTS.COMBO_TIMEOUT + extraTime;
    
    // Проверяем заморозку комбо (Freeze debuff)
    const isComboFrozen = this.gameState.debuffs && 
                         this.gameState.debuffs.includes('freeze');
    
    const safeNow = Math.max(now, 0);
    const currentDeadline = this.gameState.combo.deadline || 0;
    
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
    this.gameState.combo.lastZone = zone.index;
    
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
      zone: zone.index,
      target: this.gameState.targetZone,
      deadline: this.gameState.combo.deadline,
      timeLeft: Math.max(0, this.gameState.combo.deadline - safeNow),
      reason: 'target_hit'
    });
    
    console.log(`📊 Combo state: ${this.gameState.combo.count} (effective: ${effectiveCombo})`);
    
    return effectiveCombo;
  }

  handleGoldGain(zone, effectiveCombo) {
    let clickMultiplier = 1;
    
    // Double Tap buff
    if (this.gameState.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let goldGain = effectiveCombo * clickMultiplier;
    
    // Golden Touch skill
    const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
    goldGain = Math.floor(goldGain * goldMultiplier);
    
    // Frenzy buff
    if (this.gameState.buffs.includes('frenzy')) {
      goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
    }
    
    // Golden Touch buff (эпический)
    if (this.gameState.buffs.includes('goldenTouch')) {
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

  // Обработка восстановления энергии
  handleEnergyRestore(amount, zoneType) {
    if (this.gameState.energyManager) {
      const now = Date.now();
      
      // Используем правильные методы восстановления энергии
      this.gameState.energyManager.restoreEnergy(amount, zoneType);
      
      // Эмитируем событие без дополнительных уведомлений
      eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
        amount: amount,
        zoneType: zoneType
      });
    }
  }

  handleBonusResources(amount) {
    const resourcePool = getResourcesInGroup('TRADEABLE');
    const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
    
    this.addResource(randomResource, amount);
    eventBus.emit(GameEvents.RESOURCE_GAINED, {
      resource: randomResource,
      amount: amount
    });
  }

  handleEnergyConsumption(cost) {
    if (this.gameState.energyManager) {
      this.gameState.energyManager.consumeEnergy(cost);
    }
  }

  // Star Power buff
  handleStarPower() {
    if (this.gameState.buffs.includes('starPower') && 
        this.gameState.effectStates.starPowerClicks > 0) {
      
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
        this.removeBuff('starPower');
      }
    }
  }

  // Slot Machine buff
  handleSlotMachine() {
    if (this.gameState.buffs.includes('slotMachine') && 
        Math.random() < GAME_CONSTANTS.SLOT_MACHINE_CHANCE) {
      
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = GAME_CONSTANTS.SLOT_MACHINE_AMOUNT;
      
      this.addResource(randomResource, bonusAmount);
      
      eventBus.emit(GameEvents.SLOT_MACHINE_WIN, {
        resource: randomResource,
        amount: bonusAmount
      });
    }
  }

  // Resource Finder skill
  handleResourceFinder(effectiveCombo) {
    const bonusChance = this.getSkillBonus('chance', 'bonus_resource');
    
    if (Math.random() < bonusChance) {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const bonusAmount = Math.max(1, Math.floor(effectiveCombo * 0.5));
      
      this.addResource(randomResource, bonusAmount);
      
      eventBus.emit(GameEvents.BONUS_RESOURCE_FOUND, {
        resource: randomResource,
        amount: bonusAmount
      });
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
      const luckyBonus = this.gameState.buffs.includes('lucky') ? 
                        GAME_CONSTANTS.LUCKY_BUFF_BONUS : 0;
      
      // Inner Peace skill
      const chaosReduction = this.getSkillBonus('reduction', 'chaos');
      const effectiveChaos = Math.max(0, this.gameState.resources.chaos * (1 - chaosReduction));
      
      // Curse debuff
      const curseReduction = this.gameState.debuffs.includes('curse') ? 50 : 0;
      
      let buffChance = GAME_CONSTANTS.BASE_EFFECT_CHANCE + 
                      (this.gameState.resources.faith - effectiveChaos) + 
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

  // Вызвать случайный бафф
  triggerRandomBuff() {
    if (this.buffManager && typeof this.buffManager.applyRandomBuff === 'function') {
      this.buffManager.applyRandomBuff();
    }
  }

  // Вызвать случайный дебафф
  triggerRandomDebuff() {
    if (this.buffManager && typeof this.buffManager.applyRandomDebuff === 'function') {
      this.buffManager.applyRandomDebuff();
    }
  }

  // ===== УТИЛИТЫ =====

  // Получить бонус от навыков
  getSkillBonus(type, target = null) {
    if (this.gameState.skillManager && 
        typeof this.gameState.skillManager.getSkillBonus === 'function') {
      return this.gameState.skillManager.getSkillBonus(type, target);
    }
    return 0;
  }

  // Добавить ресурс безопасно
  addResource(resourceName, amount) {
    if (this.gameState.addResource) {
      return this.gameState.addResource(resourceName, amount);
    } else {
      const currentAmount = this.gameState.resources[resourceName] || 0;
      const newAmount = Math.min(
        currentAmount + amount,
        GAME_CONSTANTS.MAX_SAFE_RESOURCE_VALUE
      );
      this.gameState.resources[resourceName] = newAmount;
      return true;
    }
  }

  // Удалить бафф
  removeBuff(buffId) {
    if (this.gameState.buffs) {
      this.gameState.buffs = this.gameState.buffs.filter(id => id !== buffId);
    }
  }

  // Принудительный сброс комбо (для отладки)
  forceResetCombo() {
    console.log('🔄 Force resetting combo...');
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
  }

  // Получить отладочную информацию о зонах
  getZonesDebugInfo() {
    return {
      targetZone: this.gameState.targetZone,
      previousTargetZone: this.gameState.previousTargetZone,
      totalZones: ZONE_COUNT,
      zoneTypes: 'simplified'
    };
  }

  // Получить время до истечения комбо
  getComboTimeLeft() {
    if (!this.gameState.combo || this.gameState.combo.count === 0) {
      return 0;
    }
    
    const now = Date.now();
    const deadline = this.gameState.combo.deadline || 0;
    return Math.max(0, deadline - now);
  }

  // Получить информацию о зонах
  getZoneInfo() {
    return {
      totalZones: this.zones.length,
      targetZone: this.gameState.targetZone,
      previousTargetZone: this.gameState.previousTargetZone,
      zones: this.zones.map(zone => ({
        index: zone.index,
        isTarget: zone.index === this.gameState.targetZone,
        angle: {
          start: zone.getStartAngle(),
          end: zone.getEndAngle(),
          center: zone.getCenterAngle()
        }
      }))
    };
  }

  // Получить статистику кликов
  getClickStats() {
    return {
      currentCombo: this.gameState.combo.count,
      comboDeadline: this.gameState.combo.deadline,
      comboTimeLeft: this.getComboTimeLeft(),
      lastClickedZone: this.gameState.combo.lastZone,
      blockedUntil: this.gameState.blockedUntil,
      activeEffects: {
        buffs: this.gameState.buffs.length,
        debuffs: this.gameState.debuffs.length
      }
    };
  }

  // Установить целевую зону (для отладки)
  setTargetZone(zoneIndex) {
    if (zoneIndex >= 0 && zoneIndex < ZONE_COUNT) {
      this.gameState.previousTargetZone = this.gameState.targetZone;
      this.gameState.targetZone = zoneIndex;
      
      eventBus.emit(GameEvents.ZONES_SHUFFLED, this.gameState.targetZone);
      return true;
    }
    return false;
  }

  // Получить статистику зон
  getZoneStatistics() {
    return {
      total: ZONE_COUNT,
      target: this.gameState.targetZone,
      previous: this.gameState.previousTargetZone
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