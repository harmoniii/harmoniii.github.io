// managers/FeatureManager.js - ИСПРАВЛЕННАЯ версия с автосбросом комбо
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
  this.zoneTypes = []; // НОВЫЙ: массив типов зон
  
  this.comboCheckInterval = null;
  
  this.initializeZones();
  this.bindEvents();
  this.startComboTimer();
  
  console.log('🎯 FeatureManager initialized with energy zones');
}

  // Инициализация зон
  initializeZones() {
  // Проверяем состояние целевых зон
  if (typeof this.gameState.targetZone !== 'number' || 
      this.gameState.targetZone < 0 || 
      this.gameState.targetZone >= ZONE_COUNT) {
    this.gameState.targetZone = Math.floor(Math.random() * ZONE_COUNT);
  }
  
  if (typeof this.gameState.previousTargetZone !== 'number') {
    this.gameState.previousTargetZone = this.gameState.targetZone;
  }
  
  // НОВЫЙ: Генерируем типы зон
  this.generateZoneTypes();
  
  // Создаем зоны с типами
  this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
    const zoneType = this.zoneTypes[i] || ZONE_TYPES.GOLD;
    return new Zone({ type: zoneType.id, zoneType: zoneType }, i, ZONE_COUNT);
  });
  
  console.log(`🎯 Created ${ZONE_COUNT} zones with energy system`);
}

generateZoneTypes() {
  // Рассчитываем динамический процент энергетических зон
  const energyPercentage = this.calculateEnergyZonePercentage();
  
  // Генерируем типы зон
  this.zoneTypes = ZoneTypeManager.generateZoneTypes(ZONE_COUNT, energyPercentage);
  
  console.log(`🎯 Generated zone types: ${energyPercentage * 100}% energy zones`);
}

calculateEnergyZonePercentage() {
  // Базовый процент энергетических зон
  let energyPercentage = 0.25; // 25% по умолчанию
  
  // Увеличиваем процент если энергии мало
  if (this.gameState.energyManager) {
    const energyPerc = this.gameState.energyManager.getEnergyPercentage();
    
    if (energyPerc < 10) {
      energyPercentage = 0.5; // 50% при критической энергии
    } else if (energyPerc < 30) {
      energyPercentage = 0.35; // 35% при низкой энергии
    }
  }
  
  return energyPercentage;
}

  // ИСПРАВЛЕНИЕ: Запуск таймера проверки комбо
  startComboTimer() {
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
    }
    
    this.comboCheckInterval = this.createInterval(() => {
      this.checkComboTimeout();
    }, 1000, 'combo-timeout-check'); // Проверяем каждую секунду
    
    console.log('⏰ Combo timeout checker started');
  }

  // ИСПРАВЛЕНИЕ: Проверка таймаута комбо
  checkComboTimeout() {
    if (!this.gameState.combo || this.gameState.combo.count === 0) {
      return; // Нет активного комбо
    }
    
    const now = Date.now();
    const deadline = this.gameState.combo.deadline || 0;
    
    // Проверяем, истек ли таймер комбо
    if (now > deadline && this.gameState.combo.count > 0) {
      console.log(`⏰ Combo timeout detected! Count was ${this.gameState.combo.count}, resetting to 0`);
      
      // Сохраняем старое значение для логирования
      const oldCombo = this.gameState.combo.count;
      
      // Сбрасываем комбо
      this.gameState.combo.count = 0;
      this.gameState.combo.deadline = 0;
      this.gameState.combo.lastZone = null;
      this.gameState.combo.lastAngle = null;
      
      // Эмитируем событие изменения комбо
      eventBus.emit(GameEvents.COMBO_CHANGED, {
        count: 0,
        effective: 0,
        zone: null,
        target: this.gameState.targetZone,
        deadline: 0,
        reason: 'timeout',
        previousCount: oldCombo
      });
      
      // Показываем уведомление пользователю
      eventBus.emit(GameEvents.NOTIFICATION, `⏰ Combo expired! (was ${oldCombo})`);
    }
  }

  // Привязка событий
  bindEvents() {
    // Основной обработчик кликов
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

  // НОВЫЙ: Получаем тип зоны
  const zoneType = this.getZoneType(clickedZone.index);
  
  // НОВЫЙ: Проверяем энергию перед кликом (только для золотых зон)
  if (zoneType.effects.energyCost > 0) {
    if (!this.checkEnergyForClick(zoneType.effects.energyCost)) {
      return; // Недостаточно энергии
    }
  }

  // Ghost Click debuff - игнорируем клики с определенной вероятностью
  if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
    eventBus.emit(GameEvents.GHOST_CLICK);
    return;
  }

  // Heavy Click debuff - требует несколько кликов
  if (this.isHeavyClickActive()) {
    if (!this.handleHeavyClick(clickedZone)) {
      return; // Клик не засчитан
    }
  }

  // НОВЫЙ: Обрабатываем эффекты зоны
  this.handleZoneEffects(clickedZone, zoneType, normalizedAngle, now);

  // Обрабатываем перемещение целевой зоны
  this.handleZoneShuffle(clickedZone);

  // Обрабатываем появление баффов/дебаффов (только для золотых зон)
  if (zoneType.effects.givesGold) {
    this.handleEffectChance();
  }
}

checkEnergyForClick(energyCost) {
  if (!this.gameState.energyManager) return true; // Если нет энергетической системы
  
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
  // Обрабатываем комбо (только для золотых и бонусных зон)
  let effectiveCombo = 0;
  if (zoneType.effects.givesCombo) {
    effectiveCombo = this.handleCombo(zone, normalizedAngle, now);
  }

  // Обрабатываем получение золота
  if (zoneType.effects.givesGold) {
    this.handleGoldGain(zone, effectiveCombo, zoneType);
  }

  // НОВЫЙ: Обрабатываем восстановление энергии
  if (zoneType.effects.energyRestore > 0) {
    this.handleEnergyRestore(zoneType.effects.energyRestore, zoneType.id);
  }

  // НОВЫЙ: Обрабатываем трату энергии
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

// 10. НОВЫЙ метод handleEnergyRestore()
handleEnergyRestore(amount, zoneType) {
  if (this.gameState.energyManager) {
    if (zoneType === 'energy') {
      this.gameState.energyManager.restoreFromEnergyZone();
    } else if (zoneType === 'bonus') {
      this.gameState.energyManager.restoreFromGoldZone();
    }
    
    eventBus.emit(GameEvents.ENERGY_ZONE_HIT, {
      amount: amount,
      zoneType: zoneType
    });
  }
}

// 11. НОВЫЙ метод handleEnergyConsumption()
handleEnergyConsumption(cost) {
  if (this.gameState.energyManager) {
    // Энергия уже проверена в checkEnergyForClick, просто тратим
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
    
    // Инициализируем объект если его нет
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
      return false; // Клик не засчитан
    } else {
      // Сбрасываем счетчик после успешного клика
      this.gameState.effectStates.heavyClickRequired[zoneKey] = 0;
      return true; // Клик засчитан
    }
  }

  // ИСПРАВЛЕНИЕ: Обработка комбо с правильным автосбросом
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
      // Проверяем попадание в целевую зону
      if (zone.index === this.gameState.targetZone) {
        // ПОПАДАНИЕ В ЦЕЛЬ
        
        // ИСПРАВЛЕНИЕ: Улучшенная логика проверки таймаута
        const comboExpired = this.gameState.combo.count > 0 && safeNow > currentDeadline;
        
        if (comboExpired) {
          // Комбо истекло - начинаем новое
          console.log(`⏰ Combo expired on hit (was ${this.gameState.combo.count}), starting new combo`);
          this.gameState.combo.count = 1;
        } else {
          // Комбо продолжается или это первый клик
          this.gameState.combo.count++;
        }
        
        console.log(`✅ Combo HIT! Zone ${zone.index}, Combo: ${this.gameState.combo.count}`);
        
      } else {
        // ПРОМАХ
        console.log(`❌ Combo MISS! Clicked zone ${zone.index}, target was ${this.gameState.targetZone}`);
        
        // Проверяем защиту от промаха
        if (this.canUseMissProtection()) {
          this.useMissProtection();
          eventBus.emit(GameEvents.MISS_PROTECTION_USED);
          console.log(`🛡️ Miss protection used, combo preserved: ${this.gameState.combo.count}`);
          // Комбо остается прежним, но обновляем deadline
        } else {
          // Сбрасываем комбо
          this.gameState.combo.count = 1;
          console.log(`💥 Combo reset to 1 due to miss`);
        }
      }
      
      // ИСПРАВЛЕНИЕ: Всегда обновляем deadline после любого клика
      this.gameState.combo.deadline = safeNow + comboTimeout;
      
    } else {
      // Комбо заморожено - логируем но не изменяем
      console.log(`❄️ Combo frozen at ${this.gameState.combo.count}`);
      // При заморозке deadline не обновляется
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

  // Обработка получения золота и эффектов
  handleGoldAndEffects(zone, effectiveCombo) {
    let clickMultiplier = 1;
    
    // Double Tap buff - каждый клик считается как 2
    if (this.gameState.buffs.includes('doubleTap')) {
      clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
    }
    
    let goldGain = effectiveCombo * clickMultiplier;
    
    // Golden Touch skill - множитель золота
    const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
    goldGain = Math.floor(goldGain * goldMultiplier);
    
    // Frenzy buff - удвоение золота
    if (this.gameState.buffs.includes('frenzy')) {
      goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
    }
    
    // Golden Touch buff (эпический) - утроение золота
    if (this.gameState.buffs.includes('goldenTouch')) {
      goldGain *= 3;
    }
    
    // Critical Strike skill - шанс критического удара
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
  }

  handleGoldGain(zone, effectiveCombo, zoneType) {
  let clickMultiplier = 1;
  
  // Double Tap buff - каждый клик считается как 2
  if (this.gameState.buffs.includes('doubleTap')) {
    clickMultiplier = GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER;
  }
  
  let goldGain = effectiveCombo * clickMultiplier;
  
  // НОВЫЙ: Бонусный множитель для особых зон
  if (zoneType.effects.goldMultiplier) {
    goldGain *= zoneType.effects.goldMultiplier;
  }
  
  // Golden Touch skill - множитель золота
  const goldMultiplier = 1 + this.getSkillBonus('multiplier', 'gold');
  goldGain = Math.floor(goldGain * goldMultiplier);
  
  // Frenzy buff - удвоение золота
  if (this.gameState.buffs.includes('frenzy')) {
    goldGain *= GAME_CONSTANTS.FRENZY_MULTIPLIER;
  }
  
  // Golden Touch buff (эпический) - утроение золота
  if (this.gameState.buffs.includes('goldenTouch')) {
    goldGain *= 3;
  }
  
  // Critical Strike skill - шанс критического удара
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

// 14. НОВЫЙ метод getZoneStatistics()
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

  // Star Power buff - бонус к случайному ресурсу
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
      
      // Если заряды закончились, удаляем бафф
      if (this.gameState.effectStates.starPowerClicks <= 0) {
        this.removeBuff('starPower');
      }
    }
  }

  // Slot Machine buff - шанс получить случайный ресурс
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

  // Resource Finder skill - шанс получить случайный ресурс
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

  // Обработка перемещения целевой зоны
handleZoneShuffle(zone) {
  if (zone.index === this.gameState.targetZone && 
      Math.random() * 100 < GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE) {
    
    // Сохраняем текущую целевую зону как предыдущую
    this.gameState.previousTargetZone = this.gameState.targetZone;
    
    // Reverse Controls debuff - движение в обратном направлении
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
    
    // НОВЫЙ: Обновляем типы зон при перемешивании (20% шанс)
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
      
      // Lucky Charm skill - увеличение шанса баффов
      const buffChanceBonus = this.getSkillBonus('chance', 'buff') * 100;
      
      // Lucky Zone buff - бонус к шансу баффов
      const luckyBonus = this.gameState.buffs.includes('lucky') ? 
                        GAME_CONSTANTS.LUCKY_BUFF_BONUS : 0;
      
      // Inner Peace skill - снижение влияния хаоса
      const chaosReduction = this.getSkillBonus('reduction', 'chaos');
      const effectiveChaos = Math.max(0, this.gameState.resources.chaos * (1 - chaosReduction));
      
      // Curse debuff - снижение шанса баффов
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
      // Fallback
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

  // ИСПРАВЛЕНИЕ: Принудительный сброс комбо (для отладки)
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

  // ИСПРАВЛЕНИЕ: Получить время до истечения комбо
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

  // Деструктор
  destroy() {
    console.log('🧹 FeatureManager cleanup started');
    
    // ИСПРАВЛЕНИЕ: Останавливаем таймер проверки комбо
    if (this.comboCheckInterval) {
      this.cleanupManager.clearInterval(this.comboCheckInterval);
      this.comboCheckInterval = null;
    }
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ FeatureManager destroyed');
  }
}