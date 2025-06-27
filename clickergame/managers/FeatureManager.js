// managers/FeatureManager.js - ИСПРАВЛЕННАЯ версия с правильной синхронизацией зон
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { Zone } from '../utils/Zone.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS, UI_CONFIG } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';
import { ZONE_TYPES, ZoneTypeManager } from '../config/ZoneTypes.js';

export class FeatureManager extends CleanupMixin {
  constructor(gameState, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.buffManager = buffManager;
    this.zones = [];
    this.zoneTypes = []; // КРИТИЧНО: Массив типов зон, синхронизированный с GameLoop
    
    this.comboCheckInterval = null;
    
    // Ограничение на частоту уведомлений об энергии
    this.lastEnergyNotification = 0;
    this.energyNotificationCooldown = 2000;
    
    this.initializeZones();
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized with synchronized zone system');
  }

  // ИСПРАВЛЕНИЕ: Инициализация зон с правильной синхронизацией
  initializeZones() {
    // Проверяем целевую зону
    if (typeof this.gameState.targetZone !== 'number' || 
        this.gameState.targetZone < 0 || 
        this.gameState.targetZone >= ZONE_COUNT) {
      this.gameState.targetZone = 0;
    }
    
    if (typeof this.gameState.previousTargetZone !== 'number') {
      this.gameState.previousTargetZone = this.gameState.targetZone;
    }
    
    // КРИТИЧЕСКИ ВАЖНО: Сначала создаем правильные типы зон
    this.createCorrectZoneTypes();
    
    // Затем создаем зоны с типами
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
      const zoneType = this.zoneTypes[i] || ZONE_TYPES.INACTIVE;
      return new Zone({ type: zoneType.id, zoneType: zoneType }, i, ZONE_COUNT);
    });
    
    console.log(`🎯 Zones initialized - Target: ${this.gameState.targetZone}, Types:`, 
      this.zoneTypes.map((zt, i) => `${i}:${zt.id}`).join(', '));
  }

  // НОВЫЙ МЕТОД: Создание правильных типов зон
  createCorrectZoneTypes() {
    const targetZone = this.gameState.targetZone || 0;
    
    // Инициализируем массив типов зон
    this.zoneTypes = new Array(ZONE_COUNT);
    
    // ШАГИ:
    // 1. Все зоны делаем серыми (неактивными)
    for (let i = 0; i < ZONE_COUNT; i++) {
      this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
    }
    
    // 2. Целевую зону делаем красной (gold)
    this.zoneTypes[targetZone] = { ...ZONE_TYPES.GOLD };
    
    // 3. Добавляем специальные зоны (energy, bonus) случайным образом
    this.addSpecialZones(targetZone);
    
    console.log(`🔧 Created zone types - Target: ${targetZone} is GOLD, others are varied`);
  }

  // НОВЫЙ МЕТОД: Добавление специальных зон
  addSpecialZones(excludeTargetZone) {
    const availableIndices = [];
    
    // Собираем доступные индексы (кроме целевой зоны)
    for (let i = 0; i < ZONE_COUNT; i++) {
      if (i !== excludeTargetZone) {
        availableIndices.push(i);
      }
    }
    
    // Получаем процент энергии для адаптивной генерации
    const energyPercentage = this.calculateEnergyZonePercentage();
    
    // Определяем количество специальных зон
    const maxSpecialZones = availableIndices.length;
    const energyZoneCount = Math.min(
      maxSpecialZones,
      Math.floor(maxSpecialZones * 0.25 * energyPercentage) // 25% базовый шанс * energyPercentage
    );
    const bonusZoneCount = Math.min(
      maxSpecialZones - energyZoneCount,
      Math.floor(maxSpecialZones * 0.15) // 15% шанс для бонусных зон
    );
    
    // Добавляем энергетические зоны
    for (let i = 0; i < energyZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.ENERGY };
    }
    
    // Добавляем бонусные зоны
    for (let i = 0; i < bonusZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.BONUS };
    }
    
    console.log(`🔧 Added special zones: ${energyZoneCount} energy, ${bonusZoneCount} bonus`);
  }

  calculateEnergyZonePercentage() {
    let energyPercentage = 1.0; // Базовый процент
    
    // Увеличиваем процент если энергии мало
    if (this.gameState.energyManager) {
      const energyPerc = this.gameState.energyManager.getEnergyPercentage();
      
      if (energyPerc < 10) {
        energyPercentage = 3.0; // 300% при критической энергии
      } else if (energyPerc < 30) {
        energyPercentage = 2.0; // 200% при низкой энергии
      } else if (energyPerc < 50) {
        energyPercentage = 1.5; // 150% при средней энергии
      }
    }
    
    return energyPercentage;
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

  // ИСПРАВЛЕНИЕ: Главный обработчик кликов с правильной логикой зон
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

    // КРИТИЧНО: Получаем тип зоны из нашего синхронизированного массива
    const zoneType = this.zoneTypes[clickedZone.index] || ZONE_TYPES.INACTIVE;
    
    // ИСПРАВЛЕНИЕ: Логика обработки разных типов зон
    if (clickedZone.index === this.gameState.targetZone) {
      // ПОПАДАНИЕ В КРАСНУЮ (ЦЕЛЕВУЮ) ЗОНУ
      this.handleTargetZoneHit(clickedZone, zoneType, normalizedAngle, now);
    } else {
      // ПОПАДАНИЕ В ДРУГИЕ ЗОНЫ
      this.handleNonTargetZoneHit(clickedZone, zoneType, normalizedAngle, now);
    }
  }

  // ИСПРАВЛЕНИЕ: Обработка попадания в целевую (красную) зону
  handleTargetZoneHit(clickedZone, zoneType, normalizedAngle, now) {
    console.log(`🎯 HIT TARGET ZONE ${clickedZone.index}! Current target: ${this.gameState.targetZone}`);
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: Убеждаемся что мы действительно попали в правильную зону
    if (clickedZone.index !== this.gameState.targetZone) {
      console.warn(`⚠️ Zone mismatch! Clicked: ${clickedZone.index}, Target: ${this.gameState.targetZone}`);
      return;
    }
    
    // Проверяем энергию для целевой зоны
    if (zoneType.effects && zoneType.effects.energyCost > 0) {
      if (!this.checkEnergyForClick(zoneType.effects.energyCost)) {
        return;
      }
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

    // Обрабатываем комбо (только для целевой зоны)
    const effectiveCombo = this.handleCombo(clickedZone, normalizedAngle, now);
    
    // Обрабатываем получение золота
    this.handleGoldGain(clickedZone, effectiveCombo, zoneType);
    
    // Тратим энергию
    if (zoneType.effects && zoneType.effects.energyCost > 0) {
      this.handleEnergyConsumption(zoneType.effects.energyCost);
    }
    
    // ИСПРАВЛЕНИЕ: Перемещаем целевую зону и СИНХРОНИЗИРУЕМ типы
    this.handleZoneShuffle(clickedZone);
    
    // Обрабатываем появление баффов/дебаффов
    this.handleEffectChance();
    
    // Эмитируем событие попадания
    eventBus.emit(GameEvents.ZONE_HIT, {
      zone: clickedZone.index,
      zoneType: zoneType.id,
      combo: effectiveCombo,
      angle: normalizedAngle,
      isTarget: true
    });
  }

  // ИСПРАВЛЕНИЕ: Обработка попадания в НЕ целевые зоны
  handleNonTargetZoneHit(clickedZone, zoneType, normalizedAngle, now) {
    console.log(`❌ HIT NON-TARGET ZONE ${clickedZone.index} (type: ${zoneType.id})`);
    
    // Серые зоны - ничего не делают
    if (zoneType.id === 'inactive') {
      eventBus.emit(GameEvents.NOTIFICATION, '⚫ Inactive zone - no effect');
      
      // Сбрасываем комбо при попадании в серую зону
      this.resetCombo('missed target');
      return;
    }
    
    // Зеленые зоны - восстанавливают энергию
    if (zoneType.id === 'energy') {
      this.handleEnergyRestore(zoneType.effects.energyRestore, zoneType.id);
      eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy zone: +${zoneType.effects.energyRestore} Energy`);
      
      // Зеленые зоны не сбрасывают комбо, но и не увеличивают его
      eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
        amount: zoneType.effects.energyRestore,
        zoneType: zoneType.id
      });
      return;
    }
    
    // Золотые зоны - дают ресурсы и энергию
    if (zoneType.id === 'bonus') {
      this.handleEnergyRestore(zoneType.effects.energyRestore, zoneType.id);
      this.handleBonusResources(zoneType.effects.resourceAmount || 2);
      eventBus.emit(GameEvents.NOTIFICATION, `💰 Bonus zone: resources + energy!`);
      
      // Бонусные зоны тоже не сбрасывают комбо
      return;
    }
    
    // Для всех остальных типов зон - сбрасываем комбо
    this.resetCombo('hit non-target zone');
    
    // Эмитируем событие промаха
    eventBus.emit(GameEvents.ZONE_MISS, {
      zone: clickedZone.index,
      zoneType: zoneType.id,
      target: this.gameState.targetZone,
      angle: normalizedAngle
    });
  }

  // КРИТИЧЕСКИ ВАЖНО: Перемещение целевой зоны с СИНХРОНИЗАЦИЕЙ типов
  handleZoneShuffle(zone) {
    // Перемещаем целевую зону только если попали в неё
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
      
      // КРИТИЧЕСКИ ВАЖНО: Синхронизируем типы зон после перемещения
      this.synchronizeZoneTypesAfterShuffle(newTarget);
      
      // Эмитируем событие с новой целевой зоной
      eventBus.emit(GameEvents.ZONES_SHUFFLED, newTarget);
    }
  }

  // НОВЫЙ МЕТОД: Синхронизация типов зон после перемещения
  synchronizeZoneTypesAfterShuffle(newTargetZone) {
    console.log(`🔄 Synchronizing zone types for new target: ${newTargetZone}`);
    
    // ШАГИ:
    // 1. Старую целевую зону делаем серой
    const oldTarget = this.gameState.previousTargetZone;
    if (oldTarget >= 0 && oldTarget < ZONE_COUNT) {
      this.zoneTypes[oldTarget] = { ...ZONE_TYPES.INACTIVE };
    }
    
    // 2. Новую целевую зону делаем красной
    this.zoneTypes[newTargetZone] = { ...ZONE_TYPES.GOLD };
    
    // 3. Обновляем специальные зоны (кроме новой целевой)
    this.refreshSpecialZones(newTargetZone);
    
    // 4. Обновляем типы в существующих зонах
    this.zones.forEach((zone, index) => {
      if (zone && this.zoneTypes[index]) {
        zone.definition.zoneType = this.zoneTypes[index];
        zone.definition.type = this.zoneTypes[index].id;
      }
    });
    
    console.log(`✅ Zone types synchronized. Target: ${newTargetZone}, Types:`, 
      this.zoneTypes.map((zt, i) => `${i}:${zt.id}`).join(', '));
  }

  // НОВЫЙ МЕТОД: Обновление специальных зон
  refreshSpecialZones(excludeTargetZone) {
    const availableIndices = [];
    
    // Собираем индексы зон, которые можно изменить (кроме целевой)
    for (let i = 0; i < ZONE_COUNT; i++) {
      if (i !== excludeTargetZone) {
        availableIndices.push(i);
      }
    }
    
    // Сначала все неиспользуемые зоны делаем серыми
    availableIndices.forEach(index => {
      this.zoneTypes[index] = { ...ZONE_TYPES.INACTIVE };
    });
    
    // Затем добавляем специальные зоны
    this.addSpecialZones(excludeTargetZone);
  }

  // Остальные методы без изменений...
  
  // ИСПРАВЛЕНИЕ: Сброс комбо
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

  // ИСПРАВЛЕНИЕ: Обработка комбо только для целевой зоны
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

  handleGoldGain(zone, effectiveCombo, zoneType) {
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

  // Обработка восстановления энергии с ограниченными уведомлениями
  handleEnergyRestore(amount, zoneType) {
    if (this.gameState.energyManager) {
      const now = Date.now();
      
      // Используем правильные методы восстановления энергии
      if (zoneType === 'energy') {
        this.gameState.energyManager.restoreEnergy(amount, 'energy_zone');
      } else if (zoneType === 'bonus') {
        this.gameState.energyManager.restoreEnergy(amount, 'bonus_zone');
      }
      
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

  // Проверить возможность использования защиты от промаха
  canUseMissProtection() {
    return this.gameState.skillManager && 
           typeof this.gameState.skillManager.canUseMissProtection === 'function' &&
           this.gameState.skillManager.canUseMissProtection();
  }

  // Использовать защиту от промаха
  useMissProtection() {
    if (this.gameState.skillManager && 
        typeof this.gameState.skillManager.useMissProtection === 'function') {
      return this.gameState.skillManager.useMissProtection();
    }
    return false;
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

  // Принудительная синхронизация зон (для отладки)
  forceZoneSync() {
    console.log('🔄 Force syncing zones...');
    
    const currentTarget = this.gameState.targetZone || 0;
    this.synchronizeZoneTypesAfterShuffle(currentTarget);
    
    eventBus.emit(GameEvents.ZONES_SHUFFLED, currentTarget);
  }

  // Получить отладочную информацию о зонах
  getZonesDebugInfo() {
    return {
      targetZone: this.gameState.targetZone,
      previousTargetZone: this.gameState.previousTargetZone,
      zoneTypes: this.zoneTypes ? this.zoneTypes.map((zt, i) => ({
        index: i,
        id: zt.id,
        isTarget: i === this.gameState.targetZone
      })) : 'not initialized',
      totalZones: ZONE_COUNT
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
        zoneType: this.zoneTypes[zone.index]?.id || 'inactive',
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
      
      // Синхронизируем типы зон
      this.synchronizeZoneTypesAfterShuffle(zoneIndex);
      
      eventBus.emit(GameEvents.ZONES_SHUFFLED, this.gameState.targetZone);
      return true;
    }
    return false;
  }

  // Получить статистику зон
  getZoneStatistics() {
    if (!this.zoneTypes || this.zoneTypes.length === 0) {
      return { total: 0, gold: 0, inactive: 0, energy: 0, bonus: 0 };
    }
    
    const stats = {
      total: this.zoneTypes.length,
      gold: 0,
      inactive: 0,
      energy: 0,
      bonus: 0
    };
    
    this.zoneTypes.forEach(zone => {
      if (stats[zone.id] !== undefined) {
        stats[zone.id]++;
      }
    });
    
    return stats;
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