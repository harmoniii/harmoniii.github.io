// managers/FeatureManager.js - Основные механики кликера (обновленная версия)
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { Zone } from '../utils/Zone.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS, UI_CONFIG } from '../config/GameConstants.js';
import { RESOURCE_GROUPS, getResourcesInGroup } from '../config/ResourceConfig.js';

export class FeatureManager extends CleanupMixin {
  constructor(gameState, buffManager = null) {
    super();
    
    this.gameState = gameState;
    this.buffManager = buffManager;
    this.zones = [];
    
    this.initializeZones();
    this.bindEvents();
    
    console.log('🎯 FeatureManager initialized');
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
    
    // Создаем зоны
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );
    
    console.log(`🎯 Created ${ZONE_COUNT} zones`);
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

    // Ghost Click debuff - игнорируем клики с определенной вероятностью
    if (this.isGhostClickActive() && Math.random() < GAME_CONSTANTS.GHOST_CLICK_CHANCE) {
      eventBus.emit(GameEvents.GHOST_CLICK);
      return;
    }

    // Нормализуем угол и находим зону
    const normalizedAngle = this.normalizeAngle(angle);
    const clickedZone = this.findZoneByAngle(normalizedAngle);
    
    if (!clickedZone) {
      console.warn('No zone found for angle:', normalizedAngle);
      return;
    }

    // Heavy Click debuff - требует несколько кликов
    if (this.isHeavyClickActive()) {
      if (!this.handleHeavyClick(clickedZone)) {
        return; // Клик не засчитан
      }
    }

    // Обрабатываем комбо
    const effectiveCombo = this.handleCombo(clickedZone, normalizedAngle, now);

    // Обрабатываем получение золота и эффекты
    this.handleGoldAndEffects(clickedZone, effectiveCombo);

    // Обрабатываем перемещение целевой зоны
    this.handleZoneShuffle(clickedZone);

    // Обрабатываем появление баффов/дебаффов
    this.handleEffectChance();
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

// Обработка комбо
handleCombo(zone, normalizedAngle, now) {
  // ИСПРАВЛЕНИЕ: Сохраняем угол для отладки
  this.gameState.combo.lastAngle = normalizedAngle;
  
  // Time Stretch skill - увеличение времени комбо
  const extraTime = this.getSkillBonus('duration', 'combo_timeout');
  const comboTimeout = GAME_CONSTANTS.COMBO_TIMEOUT + extraTime;
  
  // Проверяем заморозку комбо (Freeze debuff)
  const isComboFrozen = this.gameState.debuffs && 
                       this.gameState.debuffs.includes('freeze');
  
  // ИСПРАВЛЕНИЕ: Безопасная работа с таймингом
  const safeNow = Math.max(now, 0);
  const currentDeadline = this.gameState.combo.deadline || 0;
  
  // ИСПРАВЛЕНИЕ: Логика комбо с корректными проверками
  if (!isComboFrozen) {
    // Проверяем попадание в целевую зону
    if (zone.index === this.gameState.targetZone) {
      // ПОПАДАНИЕ В ЦЕЛЬ
      
      // Проверяем, не истекло ли время комбо
      if (safeNow <= currentDeadline || this.gameState.combo.count === 0) {
        // Время не истекло или это первый клик - увеличиваем комбо
        this.gameState.combo.count++;
        console.log(`✅ Combo HIT! Zone ${zone.index}, Combo: ${this.gameState.combo.count}`);
      } else {
        // Время истекло - сбрасываем комбо и начинаем новое
        this.gameState.combo.count = 1;
        console.log(`⏰ Combo timeout, restarting. Zone ${zone.index}, Combo: 1`);
      }
    } else {
      // ПРОМАХ
      console.log(`❌ Combo MISS! Clicked zone ${zone.index}, target was ${this.gameState.targetZone}`);
      
      // Проверяем защиту от промаха
      if (this.canUseMissProtection()) {
        this.useMissProtection();
        eventBus.emit(GameEvents.MISS_PROTECTION_USED);
        console.log(`🛡️ Miss protection used, combo preserved: ${this.gameState.combo.count}`);
        // Комбо остается прежним
      } else {
        // Сбрасываем комбо
        this.gameState.combo.count = 1;
        console.log(`💥 Combo reset to 1 due to miss`);
      }
    }
    
    // ИСПРАВЛЕНИЕ: Всегда обновляем deadline после клика
    this.gameState.combo.deadline = safeNow + comboTimeout;
  } else {
    // Комбо заморожено - логируем но не изменяем
    console.log(`❄️ Combo frozen at ${this.gameState.combo.count}`);
  }
  
  // Обновляем последнюю зону
  this.gameState.combo.lastZone = zone.index;
  
  // ИСПРАВЛЕНИЕ: Ограничиваем комбо максимальным значением
  this.gameState.combo.count = Math.min(
    Math.max(0, this.gameState.combo.count), // Не меньше 0
    GAME_CONSTANTS.MAX_COMBO_COUNT
  );
  
  // Combo Master skill - увеличение эффективности комбо
  const comboMultiplier = 1 + this.getSkillBonus('multiplier', 'combo');
  const effectiveCombo = Math.floor(this.gameState.combo.count * comboMultiplier);
  
  // ИСПРАВЛЕНИЕ: Всегда эмитируем событие изменения комбо
  eventBus.emit(GameEvents.COMBO_CHANGED, {
    count: this.gameState.combo.count,
    effective: effectiveCombo,
    zone: zone.index,
    target: this.gameState.targetZone,
    deadline: this.gameState.combo.deadline
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
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ FeatureManager destroyed');
  }
}