// managers/FeatureManager.js - ИСПРАВЛЕННАЯ версия с правильной логикой зон и целевой зоной
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
    this.zoneTypes = []; // Массив типов зон
    
    this.comboCheckInterval = null;
    
    this.initializeZones();
    this.bindEvents();
    this.startComboTimer();
    
    console.log('🎯 FeatureManager initialized with energy zones');
  }

  // Инициализация зон
  initializeZones() {
    // ИСПРАВЛЕНИЕ: Убеждаемся что всегда есть хотя бы одна золотая зона
    if (typeof this.gameState.targetZone !== 'number' || 
        this.gameState.targetZone < 0 || 
        this.gameState.targetZone >= ZONE_COUNT) {
      this.gameState.targetZone = 0; // Первая зона всегда целевая
    }
    
    if (typeof this.gameState.previousTargetZone !== 'number') {
      this.gameState.previousTargetZone = this.gameState.targetZone;
    }
    
    // Генерируем типы зон с гарантированной золотой зоной на целевой позиции
    this.generateZoneTypes();
    
    // Создаем зоны с типами
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
      const zoneType = this.zoneTypes[i] || ZONE_TYPES.GOLD;
      return new Zone({ type: zoneType.id, zoneType: zoneType }, i, ZONE_COUNT);
    });
    
    console.log(`🎯 Created ${ZONE_COUNT} zones with energy system`);
  }

  generateZoneTypes() {
    // Используем адаптивную генерацию из исправленного ZoneTypeManager
    const energyPercentage = this.calculateEnergyZonePercentage();
    this.zoneTypes = ZoneTypeManager.generateAdaptiveZoneTypes(ZONE_COUNT, energyPercentage);
    
    // ИСПРАВЛЕНИЕ: Гарантируем что целевая зона всегда золотая (для комбо)
    if (this.zoneTypes[this.gameState.targetZone]?.id !== 'gold') {
      this.zoneTypes[this.gameState.targetZone] = ZONE_TYPES.GOLD;
    }
    
    console.log(`🎯 Generated zone types with ${energyPercentage * 100}% energy preference, target zone ${this.gameState.targetZone} is gold`);
  }

  calculateEnergyZonePercentage() {
    let energyPercentage = 0.25; // 25% по умолчанию
    
    // Увеличиваем процент если энергии мало
    if (this.gameState.energyManager) {
      const energyPerc = this.gameState.energyManager.getEnergyPercentage();
      
      if (energyPerc < 10) {
        energyPercentage = 0.6; // 60% при критической энергии
      } else if (energyPerc < 30) {
        energyPercentage = 0.45; // 45% при низкой энергии
      } else if (energyPerc < 50) {
        energyPercentage = 0.35; // 35% при средней энергии
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

  // Главный обработчик кликов
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

    // Получаем тип зоны
    const zoneType = this.getZoneType(clickedZone.index);
    
    // Проверяем энергию только для зон, которые тратят энергию
    if (zoneType.effects.energyCost > 0) {
      if (!this.checkEnergyForClick(zoneType.effects.energyCost)) {
        return;
      }
    }

    // Ghost Click debuff
    if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      eventBus.emit(GameEvents.GHOST_CLICK);
      return;
    }

    // Heavy Click debuff
    if (this.isHeavyClickActive()) {
      if (!this.handleHeavyClick(clickedZone)) {
        return;
      }
    }

    // Обрабатываем эффекты зоны
    this.handleZoneEffects(clickedZone, zoneType, normalizedAngle, now);

    // ИСПРАВЛЕНИЕ: Перемещение целевой зоны только для золотых зон
    if (zoneType.effects.givesGold) {
      this.handleZoneShuffle(clickedZone);
    }

    // Обрабатываем появление баффов/дебаффов только для золотых зон
    if (zoneType.effects.givesGold) {
      this.handleEffectChance();
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

  getZoneType(zoneIndex) {
    return this.zoneTypes[zoneIndex] || ZONE_TYPES.GOLD;
  }

  handleZoneEffects(zone, zoneType, normalizedAngle, now) {
    let effectiveCombo = 0;
    
    // ИСПРАВЛЕНИЕ: Комбо только для зон, которые дают комбо (золотые и бонусные)
    if (zoneType.effects.givesCombo) {
      effectiveCombo = this.handleCombo(zone, normalizedAngle, now);
    }

    // Обрабатываем получение золота
    if (zoneType.effects.givesGold) {
      this.handleGoldGain(zone, effectiveCombo, zoneType);
    }

    // Обрабатываем восстановление энергии
    if (zoneType.effects.energyRestore > 0) {
      this.handleEnergyRestore(zoneType.effects.energyRestore, zoneType.id);
    }

    // Обрабатываем случайные ресурсы от бонусной зоны
    if (zoneType.effects.resourceBonus) {
      this.handleBonusResources(zoneType.effects.resourceAmount || 2);
    }

    // Обрабатываем трату энергии
    if (zoneType.effects.energyCost > 0) {
      this.handleEnergyConsumption(zoneType.effects.energyCost);
    }

    // Эмитируем событие попадания в зону
    eventBus.emit(GameEvents.ZONE_HIT, {
      zone: zone.index,
      zoneType: zoneType.id,
      combo: effectiveCombo,
      angle: normalizedAngle
    });
  }

  handleEnergyRestore(amount, zoneType) {
    if (this.gameState.energyManager) {
      // Используем правильные методы восстановления энергии
      if (zoneType === 'energy') {
        this.gameState.energyManager.restoreEnergy(amount, 'energy_zone');
        // ИСПРАВЛЕНИЕ: Уменьшаем количество уведомлений - только одно
        eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy Zone: +${amount} Energy`);
      } else if (zoneType === 'bonus') {
        this.gameState.energyManager.restoreEnergy(amount, 'bonus_zone');
        eventBus.emit(GameEvents.NOTIFICATION, `🟡 Bonus Zone: +${amount} Energy`);
      }
      
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
    eventBus.emit(GameEvents.NOTIFICATION, `🟡 Bonus: +${amount} ${randomResource}`);
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

  // ИСПРАВЛЕНИЕ: Обработка комбо только для целевой золотой зоны
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
      // ИСПРАВЛЕНИЕ: Проверяем попадание только в целевую золотую зону
      if (zone.index === this.gameState.targetZone) {
        // ПОПАДАНИЕ В ЦЕЛЕВУЮ ЗОНУ
        const comboExpired = this.gameState.combo.count > 0 && safeNow > currentDeadline;
        
        if (comboExpired) {
          console.log(`⏰ Combo expired on hit (was ${this.gameState.combo.count}), starting new combo`);
          this.gameState.combo.count = 1;
        } else {
          this.gameState.combo.count++;
        }
        
        console.log(`✅ Combo HIT! Zone ${zone.index}, Combo: ${this.gameState.combo.count}`);
        
      } else {
        // ПРОМАХ ПО ЦЕЛЕВОЙ ЗОНЕ
        console.log(`❌ Combo MISS! Clicked zone ${zone.index}, target was ${this.gameState.targetZone}`);
        
        // Проверяем защиту от промаха
        if (this.canUseMissProtection()) {
          this.useMissProtection();
          eventBus.emit(GameEvents.MISS_PROTECTION_USED);
          console.log(`🛡️ Miss protection used, combo preserved: ${this.gameState.combo.count}`);
        } else {
          // Сбрасываем комбо
          this.gameState.combo.count = 1;
          console.log(`💥 Combo reset to 1 due to miss`);
        }
      }
      
      // Всегда обновляем deadline после любого клика
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
    
    // Всегда эмитируем событие изменения комбо
    eventBus.emit(GameEvents.COMBO_CHANGED, {
      count: this.gameState.combo.count,
      effective: effectiveCombo,
      zone: zone.index,
      target: this.gameState.targetZone,
      deadline: this.gameState.combo.deadline,
      timeLeft: Math.max(0, this.gameState.combo.deadline - safeNow),
      reason: 'click'
    });
    
    console.log(`📊 Final combo state: ${this.gameState.combo.count} (effective: ${effectiveCombo})`);
    
    return effectiveCombo;
  }

  handleGoldGain(zone, effectiveCombo, zoneType) {
    let clickMultiplier = 1;
    
    // Double Tap buff
    if (this.gameState.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let goldGain = effectiveCombo * clickMultiplier;
    
    // Бонусный множитель для особых зон
    if (zoneType.effects.goldMultiplier) {
      goldGain *= zoneType.effects.goldMultiplier;
    }
    
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

  refreshZoneTypes() {
    console.log('🔄 Refreshing zone types...');
    this.generateZoneTypes();
    
    // Обновляем типы в существующих зонах
    this.zones.forEach((zone, index) => {
      const newZoneType = this.zoneTypes[index] || ZONE_TYPES.GOLD;
      zone.definition.zoneType = newZoneType;
      zone.definition.type = newZoneType.id;
    });
    
    // Принудительная перерисовка
    if (this.gameState.gameLoop) {
      this.gameState.gameLoop.forceRedraw();
    }
  }

  getZoneStatistics() {
    const stats = {
      total: this.zones.length,
      types: {
        gold: 0,
        energy: 0,
        bonus: 0
      }
    };
    
    this.zoneTypes.forEach(zoneType => {
      if (stats.types[zoneType.id] !== undefined) {
        stats.types[zoneType.id]++;
      }
    });
    
    return stats;
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

  // ИСПРАВЛЕНИЕ: Перемещение целевой зоны только после попадания в золотую зону
  handleZoneShuffle(zone) {
    // Перемещаем целевую зону только если попали в неё И это золотая зона
    if (zone.index === this.gameState.targetZone && 
        Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
      
      // Сохраняем текущую целевую зону как предыдущую
      this.gameState.previousTargetZone = this.gameState.targetZone;
      
      // Reverse Controls debuff
      if (this.gameState.debuffs && this.gameState.debuffs.includes('reverseControls')) {
        this.gameState.targetZone = (this.gameState.targetZone - 1 + ZONE_COUNT) % ZONE_COUNT;
        eventBus.emit(GameEvents.ZONES_SHUFFLED, this.gameState.targetZone);
        eventBus.emit(GameEvents.TEMP_MESSAGE, '🙃 Reverse Controls: Zone moves backward');
      } else {
        // Обычное случайное движение
        let newTarget;
        let attempts = 0;
        const maxAttempts = ZONE_COUNT * 2;
        
        do {
          newTarget = Math.floor(Math.random() * ZONE_COUNT);
          attempts++;
        } while (newTarget === this.gameState.targetZone && 
                 ZONE_COUNT > 1 && 
                 attempts < maxAttempts);
        
        this.gameState.targetZone = newTarget;
        eventBus.emit(GameEvents.ZONES_SHUFFLED, this.gameState.targetZone);
      }
      
      // ИСПРАВЛЕНИЕ: Гарантируем что новая целевая зона тоже золотая
      this.zoneTypes[this.gameState.targetZone] = ZONE_TYPES.GOLD;
      
      // Обновляем типы зон при перемешивании (20% шанс)
      if (Math.random() < 0.2) {
        this.refreshZoneTypes();
      }
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

  // Получить время до истечения комбо
  getComboTimeLeft() {
    if (!this.gameState.combo || this.gameState.combo.count === 0) {
      return 0;
    }
    
    const now = Date.now();
    const deadline = this.gameState.combo.deadline || 0;
    return Math.max(0, deadline - now);
  }

  // Перемешать зоны (для специальных эффектов)
  shuffleZones() {
    if (!this.isActive()) return;
    
    for (let i = this.zones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.zones[i], this.zones[j]] = [this.zones[j], this.zones[i]];
      this.zones[i].index = i;
      this.zones[j].index = j;
    }
    
    console.log('🎯 Zones shuffled');
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
        zoneType: this.zoneTypes[zone.index]?.id || 'gold',
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
      
      // Гарантируем что новая целевая зона золотая
      this.zoneTypes[zoneIndex] = ZONE_TYPES.GOLD;
      
      eventBus.emit(GameEvents.ZONES_SHUFFLED, this.gameState.targetZone);
      return true;
    }
    return false;
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