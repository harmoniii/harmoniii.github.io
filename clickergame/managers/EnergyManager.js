// managers/EnergyManager.js - Система энергии
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

// Константы энергии
export const ENERGY_CONSTANTS = {
  // Базовые параметры
  INITIAL_ENERGY: 100,
  INITIAL_MAX_ENERGY: 100,
  BASE_REGEN_RATE: 1, // энергии за интервал
  REGEN_INTERVAL: 15000, // 15 секунд
  CLICK_COST: 1, // энергии за клик
  
  // Зоны
  ENERGY_ZONE_RESTORE: 2, // сколько восстанавливает зеленая зона
  GOLD_ZONE_RESTORE: 1, // сколько восстанавливает золотая зона
  
  // Здания
  GENERATOR_MAX_ENERGY_BONUS: 10, // за уровень
  GENERATOR_REGEN_BONUS: 0.5, // множитель за уровень
  BATTERY_MAX_ENERGY_BONUS: 25, // за уровень
  BATTERY_OVERFLOW_LIMIT: 200, // максимум с батареями
  
  // Навыки
  EFFICIENCY_REDUCTION: 0.25, // за уровень
  MASTERY_REGEN_BONUS: 1.0, // множитель за уровень
  STORAGE_MAX_BONUS: 50, // за уровень
  
  // Предметы
  ENERGY_PACK_RESTORE: 50,
  ENERGY_DRINK_BONUS: 50,
  ENERGY_DRINK_DURATION: 600000, // 10 минут
  POWER_CORE_BONUS: 25,
  
  // Эффекты
  FRENZY_NO_COST_DURATION: 15000, // 15 секунд
  ENERGY_BOOST_REGEN: 2, // бонус регена в секунду
  ENERGY_BOOST_DURATION: 30000, // 30 секунд
  TIRED_COST_MULTIPLIER: 2,
  
  // Визуальные пороги
  WARNING_THRESHOLD: 20, // % для желтого цвета
  CRITICAL_THRESHOLD: 10, // % для красного цвета
  PULSE_THRESHOLD: 10 // энергии для анимации пульсации
};

export class EnergyManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.regenInterval = null;
    this.temporaryEffects = new Map(); // id -> {endTime, effect}
    
    this.initializeEnergy();
    this.startRegeneration();
    this.bindEvents();
    
    console.log('⚡ EnergyManager initialized');
  }

  // Инициализация системы энергии
  initializeEnergy() {
    if (!this.gameState.energy) {
      this.gameState.energy = {
        current: ENERGY_CONSTANTS.INITIAL_ENERGY,
        max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
        lastRegenTime: Date.now(),
        totalConsumed: 0,
        totalRegenerated: 0
      };
    }
    
    // Валидация значений
    this.validateEnergyValues();
  }

  // Валидация значений энергии
  validateEnergyValues() {
    const energy = this.gameState.energy;
    
    energy.current = Math.max(0, Math.floor(energy.current || 0));
    energy.max = Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, Math.floor(energy.max || ENERGY_CONSTANTS.INITIAL_MAX_ENERGY));
    energy.current = Math.min(energy.current, this.getEffectiveMaxEnergy());
    energy.totalConsumed = Math.max(0, energy.totalConsumed || 0);
    energy.totalRegenerated = Math.max(0, energy.totalRegenerated || 0);
    
    if (!energy.lastRegenTime || typeof energy.lastRegenTime !== 'number') {
      energy.lastRegenTime = Date.now();
    }
  }

  // Запуск регенерации энергии
  startRegeneration() {
    if (this.regenInterval) {
      this.cleanupManager.clearInterval(this.regenInterval);
    }
    
    this.regenInterval = this.createInterval(() => {
      this.regenerateEnergy();
    }, ENERGY_CONSTANTS.REGEN_INTERVAL, 'energy-regeneration');
  }

  // Привязка событий
  bindEvents() {
    // Отслеживаем клики для трат энергии
    eventBus.subscribe(GameEvents.CLICK, (data) => {
      this.handleClickEnergyCost(data);
    });

    // Отслеживаем эффекты
    eventBus.subscribe(GameEvents.BUFF_APPLIED, (data) => {
      this.handleBuffEffect(data);
    });

    eventBus.subscribe(GameEvents.DEBUFF_APPLIED, (data) => {
      this.handleDebuffEffect(data);
    });

    eventBus.subscribe(GameEvents.BUFF_EXPIRED, (data) => {
      this.removeTemporaryEffect(data.id);
    });

    eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, (data) => {
      this.removeTemporaryEffect(data.id);
    });

    // Отслеживаем покупки зданий
    eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
      this.updateMaxEnergy();
    });

    // Отслеживаем покупки навыков
    eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
      this.updateMaxEnergy();
    });
  }

  // Обработка трат энергии при клике
  handleClickEnergyCost(clickData) {
    // Проверяем, есть ли эффект "no energy cost"
    if (this.hasTemporaryEffect('frenzy_no_cost') || this.hasTemporaryEffect('energy_immunity')) {
      return; // Не тратим энергию
    }
    
    const cost = this.getClickEnergyCost();
    
    if (this.gameState.energy.current < cost) {
      // Недостаточно энергии для клика
      this.handleInsufficientEnergy();
      return false;
    }
    
    // Тратим энергию
    this.consumeEnergy(cost);
    return true;
  }

  // Получить стоимость клика в энергии
  getClickEnergyCost() {
    let cost = ENERGY_CONSTANTS.CLICK_COST;
    
    // Energy Efficiency skill
    const efficiencyLevel = this.getSkillLevel('energyEfficiency');
    const reduction = efficiencyLevel * ENERGY_CONSTANTS.EFFICIENCY_REDUCTION;
    cost *= (1 - Math.min(0.75, reduction)); // максимум 75% экономии
    
    // Tired debuff
    if (this.hasTemporaryEffect('tired')) {
      cost *= ENERGY_CONSTANTS.TIRED_COST_MULTIPLIER;
    }
    
    return Math.max(0.1, Math.ceil(cost * 10) / 10); // минимум 0.1, округление до 0.1
  }

  // Потребить энергию
  consumeEnergy(amount) {
    const oldEnergy = this.gameState.energy.current;
    this.gameState.energy.current = Math.max(0, this.gameState.energy.current - amount);
    this.gameState.energy.totalConsumed += amount;
    
    const actualConsumed = oldEnergy - this.gameState.energy.current;
    
    // Эмитируем событие изменения энергии
    eventBus.emit(GameEvents.ENERGY_CHANGED, {
      current: this.gameState.energy.current,
      max: this.getEffectiveMaxEnergy(),
      consumed: actualConsumed,
      percentage: this.getEnergyPercentage()
    });
    
    // Проверяем критический уровень
    if (this.gameState.energy.current <= ENERGY_CONSTANTS.PULSE_THRESHOLD) {
      eventBus.emit(GameEvents.ENERGY_CRITICAL);
    }
  }

  // Восстановить энергию
  restoreEnergy(amount, source = 'unknown') {
    const oldEnergy = this.gameState.energy.current;
    const maxEnergy = this.getEffectiveMaxEnergy();
    
    this.gameState.energy.current = Math.min(maxEnergy, this.gameState.energy.current + amount);
    this.gameState.energy.totalRegenerated += amount;
    
    const actualRestored = this.gameState.energy.current - oldEnergy;
    
    console.log(`⚡ Restored ${actualRestored} energy from ${source}`);
    
    // Эмитируем событие
    eventBus.emit(GameEvents.ENERGY_CHANGED, {
      current: this.gameState.energy.current,
      max: maxEnergy,
      restored: actualRestored,
      source: source,
      percentage: this.getEnergyPercentage()
    });

    if (actualRestored > 0) {
      eventBus.emit(GameEvents.NOTIFICATION, `⚡ +${actualRestored} Energy`);
    }
  }

  // Регенерация энергии по таймеру
  regenerateEnergy() {
    const now = Date.now();
    const timeSinceLastRegen = now - this.gameState.energy.lastRegenTime;
    
    // Рассчитываем количество интервалов регенерации
    const regenCycles = Math.floor(timeSinceLastRegen / ENERGY_CONSTANTS.REGEN_INTERVAL);
    
    if (regenCycles > 0) {
      const baseRegen = ENERGY_CONSTANTS.BASE_REGEN_RATE * regenCycles;
      const effectiveRegen = this.getEffectiveRegenRate() * regenCycles;
      
      this.restoreEnergy(effectiveRegen, 'regeneration');
      this.gameState.energy.lastRegenTime = now;
    }
  }

  // Получить эффективную скорость регенерации
  getEffectiveRegenRate() {
    let regen = ENERGY_CONSTANTS.BASE_REGEN_RATE;
    
    // Generator building bonus
    const generatorLevel = this.getBuildingLevel('generator');
    regen *= (1 + generatorLevel * ENERGY_CONSTANTS.GENERATOR_REGEN_BONUS);
    
    // Energy Mastery skill
    const masteryLevel = this.getSkillLevel('energyMastery');
    regen *= (1 + masteryLevel * ENERGY_CONSTANTS.MASTERY_REGEN_BONUS);
    
    // Energy Boost temporary effect
    if (this.hasTemporaryEffect('energy_boost')) {
      regen += ENERGY_CONSTANTS.ENERGY_BOOST_REGEN;
    }
    
    return Math.max(0.1, regen);
  }

  // Получить эффективную максимальную энергию
  getEffectiveMaxEnergy() {
    let maxEnergy = this.gameState.energy.max;
    
    // Generator building bonus
    const generatorLevel = this.getBuildingLevel('generator');
    maxEnergy += generatorLevel * ENERGY_CONSTANTS.GENERATOR_MAX_ENERGY_BONUS;
    
    // Battery building bonus (учитывается в базовой максимальной энергии)
    const batteryLevel = this.getBuildingLevel('battery');
    maxEnergy += batteryLevel * ENERGY_CONSTANTS.BATTERY_MAX_ENERGY_BONUS;
    
    // Power Storage skill
    const storageLevel = this.getSkillLevel('powerStorage');
    maxEnergy += storageLevel * ENERGY_CONSTANTS.STORAGE_MAX_BONUS;
    
    // Energy Drink temporary effect
    if (this.hasTemporaryEffect('energy_drink')) {
      maxEnergy += ENERGY_CONSTANTS.ENERGY_DRINK_BONUS;
    }
    
    // Power Core permanent bonus
    const powerCores = this.getPermanentBonus('powerCore') || 0;
    maxEnergy += powerCores * ENERGY_CONSTANTS.POWER_CORE_BONUS;
    
    return Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, maxEnergy);
  }

  // Обновить максимальную энергию (при покупке зданий/навыков)
  updateMaxEnergy() {
    const newMaxEnergy = this.getEffectiveMaxEnergy();
    
    // Если максимум увеличился, можем восстановить текущую энергию до нового максимума
    if (newMaxEnergy > this.gameState.energy.max) {
      const energyBonus = newMaxEnergy - this.gameState.energy.max;
      this.gameState.energy.max = newMaxEnergy;
      this.restoreEnergy(energyBonus, 'max_energy_increase');
    } else {
      this.gameState.energy.max = newMaxEnergy;
    }
    
    // Убеждаемся, что текущая энергия не превышает максимум
    this.gameState.energy.current = Math.min(this.gameState.energy.current, newMaxEnergy);
  }

  // Обработка недостатка энергии
  handleInsufficientEnergy() {
    eventBus.emit(GameEvents.ENERGY_INSUFFICIENT, {
      current: this.gameState.energy.current,
      required: this.getClickEnergyCost(),
      timeToNext: this.getTimeToNextRegen()
    });
    
    eventBus.emit(GameEvents.NOTIFICATION, '⚡ Not enough energy to click!');
  }

  // Получить время до следующей регенерации
  getTimeToNextRegen() {
    const now = Date.now();
    const timeSinceLastRegen = now - this.gameState.energy.lastRegenTime;
    return Math.max(0, ENERGY_CONSTANTS.REGEN_INTERVAL - timeSinceLastRegen);
  }

  // Получить процент энергии
  getEnergyPercentage() {
    const maxEnergy = this.getEffectiveMaxEnergy();
    return maxEnergy > 0 ? (this.gameState.energy.current / maxEnergy) * 100 : 0;
  }

  // Проверить, можно ли кликнуть
  canClick() {
    const cost = this.getClickEnergyCost();
    return this.gameState.energy.current >= cost;
  }

  // Обработка эффектов баффов
  handleBuffEffect(data) {
    switch (data.id) {
      case 'frenzy':
        this.addTemporaryEffect('frenzy_no_cost', ENERGY_CONSTANTS.FRENZY_NO_COST_DURATION);
        break;
      case 'energyBoost':
        this.addTemporaryEffect('energy_boost', ENERGY_CONSTANTS.ENERGY_BOOST_DURATION);
        break;
    }
  }

  // Обработка эффектов дебаффов
  handleDebuffEffect(data) {
    switch (data.id) {
      case 'tired':
        this.addTemporaryEffect('tired', data.duration || 10000);
        break;
    }
  }

  // Добавить временный эффект
  addTemporaryEffect(effectId, duration) {
    const endTime = Date.now() + duration;
    this.temporaryEffects.set(effectId, {
      endTime: endTime,
      duration: duration
    });
    
    console.log(`⚡ Added temporary energy effect: ${effectId} for ${duration}ms`);
  }

  // Проверить наличие временного эффекта
  hasTemporaryEffect(effectId) {
    if (!this.temporaryEffects.has(effectId)) return false;
    
    const effect = this.temporaryEffects.get(effectId);
    if (Date.now() > effect.endTime) {
      this.temporaryEffects.delete(effectId);
      return false;
    }
    
    return true;
  }

  // Удалить временный эффект
  removeTemporaryEffect(effectId) {
    this.temporaryEffects.delete(effectId);
    console.log(`⚡ Removed temporary energy effect: ${effectId}`);
  }

  // Использовать предмет Energy Pack
  useEnergyPack() {
    this.restoreEnergy(ENERGY_CONSTANTS.ENERGY_PACK_RESTORE, 'energy_pack');
    eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy Pack used! +${ENERGY_CONSTANTS.ENERGY_PACK_RESTORE} Energy`);
  }

  // Использовать предмет Energy Drink
  useEnergyDrink() {
    this.addTemporaryEffect('energy_drink', ENERGY_CONSTANTS.ENERGY_DRINK_DURATION);
    this.updateMaxEnergy(); // Обновляем максимум для применения бонуса
    eventBus.emit(GameEvents.NOTIFICATION, `🥤 Energy Drink used! +${ENERGY_CONSTANTS.ENERGY_DRINK_BONUS} Max Energy for 10 minutes`);
  }

  // Использовать предмет Power Core (permanent)
  usePowerCore() {
    if (!this.gameState.market) {
      this.gameState.market = {};
    }
    if (!this.gameState.market.permanentBonuses) {
      this.gameState.market.permanentBonuses = {};
    }
    
    const currentCores = this.gameState.market.permanentBonuses.powerCore || 0;
    this.gameState.market.permanentBonuses.powerCore = currentCores + 1;
    
    this.updateMaxEnergy();
    eventBus.emit(GameEvents.NOTIFICATION, `🔋 Power Core installed! +${ENERGY_CONSTANTS.POWER_CORE_BONUS} Max Energy permanently`);
  }

  // Восстановить энергию от зеленой зоны
  restoreFromEnergyZone() {
    this.restoreEnergy(ENERGY_CONSTANTS.ENERGY_ZONE_RESTORE, 'energy_zone');
  }

  // Восстановить энергию от золотой зоны
  restoreFromGoldZone() {
    this.restoreEnergy(ENERGY_CONSTANTS.GOLD_ZONE_RESTORE, 'gold_zone');
  }

  // Получить уровень здания
  getBuildingLevel(buildingId) {
    if (!this.gameState.buildings || !this.gameState.buildings[buildingId]) {
      return 0;
    }
    return this.gameState.buildings[buildingId].level || 0;
  }

  // Получить уровень навыка
  getSkillLevel(skillId) {
    if (!this.gameState.skills || !this.gameState.skills[skillId]) {
      return 0;
    }
    return this.gameState.skills[skillId].level || 0;
  }

  // Получить постоянный бонус
  getPermanentBonus(bonusId) {
    if (!this.gameState.market || !this.gameState.market.permanentBonuses) {
      return 0;
    }
    return this.gameState.market.permanentBonuses[bonusId] || 0;
  }

  // Получить информацию об энергии для UI
  getEnergyInfo() {
    const percentage = this.getEnergyPercentage();
    const maxEnergy = this.getEffectiveMaxEnergy();
    
    return {
      current: this.gameState.energy.current,
      max: maxEnergy,
      percentage: percentage,
      canClick: this.canClick(),
      clickCost: this.getClickEnergyCost(),
      regenRate: this.getEffectiveRegenRate(),
      timeToNext: this.getTimeToNextRegen(),
      timeToFull: this.getTimeToFullEnergy(),
      status: this.getEnergyStatus(),
      effects: this.getActiveEnergyEffects()
    };
  }

  // Получить статус энергии
  getEnergyStatus() {
    const percentage = this.getEnergyPercentage();
    
    if (percentage <= ENERGY_CONSTANTS.CRITICAL_THRESHOLD) {
      return 'critical';
    } else if (percentage <= ENERGY_CONSTANTS.WARNING_THRESHOLD) {
      return 'warning';
    } else {
      return 'normal';
    }
  }

  // Получить время до полной энергии
  getTimeToFullEnergy() {
    const maxEnergy = this.getEffectiveMaxEnergy();
    const energyNeeded = maxEnergy - this.gameState.energy.current;
    
    if (energyNeeded <= 0) return 0;
    
    const regenRate = this.getEffectiveRegenRate();
    const intervalsNeeded = Math.ceil(energyNeeded / regenRate);
    
    return intervalsNeeded * ENERGY_CONSTANTS.REGEN_INTERVAL;
  }

  // Получить активные эффекты энергии
  getActiveEnergyEffects() {
    const effects = [];
    const now = Date.now();
    
    this.temporaryEffects.forEach((effect, effectId) => {
      if (effect.endTime > now) {
        effects.push({
          id: effectId,
          timeLeft: effect.endTime - now,
          duration: effect.duration
        });
      }
    });
    
    return effects;
  }

  // Получить статистику энергии
  getEnergyStatistics() {
    return {
      current: this.gameState.energy.current,
      max: this.getEffectiveMaxEnergy(),
      percentage: this.getEnergyPercentage(),
      totalConsumed: this.gameState.energy.totalConsumed,
      totalRegenerated: this.gameState.energy.totalRegenerated,
      clickCost: this.getClickEnergyCost(),
      regenRate: this.getEffectiveRegenRate(),
      maxEnergyBonuses: {
        generator: this.getBuildingLevel('generator') * ENERGY_CONSTANTS.GENERATOR_MAX_ENERGY_BONUS,
        battery: this.getBuildingLevel('battery') * ENERGY_CONSTANTS.BATTERY_MAX_ENERGY_BONUS,
        powerStorage: this.getSkillLevel('powerStorage') * ENERGY_CONSTANTS.STORAGE_MAX_BONUS,
        powerCore: this.getPermanentBonus('powerCore') * ENERGY_CONSTANTS.POWER_CORE_BONUS
      },
      regenBonuses: {
        generator: this.getBuildingLevel('generator') * ENERGY_CONSTANTS.GENERATOR_REGEN_BONUS,
        energyMastery: this.getSkillLevel('energyMastery') * ENERGY_CONSTANTS.MASTERY_REGEN_BONUS
      },
      costReduction: {
        energyEfficiency: this.getSkillLevel('energyEfficiency') * ENERGY_CONSTANTS.EFFICIENCY_REDUCTION
      },
      activeEffects: this.getActiveEnergyEffects().length
    };
  }

  // Принудительно обновить все значения энергии
  forceUpdate() {
    this.validateEnergyValues();
    this.updateMaxEnergy();
    this.regenerateEnergy();
    
    eventBus.emit(GameEvents.ENERGY_CHANGED, {
      current: this.gameState.energy.current,
      max: this.getEffectiveMaxEnergy(),
      percentage: this.getEnergyPercentage()
    });
  }

  // Получить данные для сохранения
  getSaveData() {
    return {
      current: this.gameState.energy.current,
      max: this.gameState.energy.max,
      lastRegenTime: this.gameState.energy.lastRegenTime,
      totalConsumed: this.gameState.energy.totalConsumed,
      totalRegenerated: this.gameState.energy.totalRegenerated
    };
  }

  // Загрузить данные из сохранения
  loadSaveData(data) {
    if (data && typeof data === 'object') {
      this.gameState.energy = {
        current: Math.max(0, data.current || ENERGY_CONSTANTS.INITIAL_ENERGY),
        max: Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, data.max || ENERGY_CONSTANTS.INITIAL_MAX_ENERGY),
        lastRegenTime: data.lastRegenTime || Date.now(),
        totalConsumed: Math.max(0, data.totalConsumed || 0),
        totalRegenerated: Math.max(0, data.totalRegenerated || 0)
      };
      
      this.validateEnergyValues();
      this.forceUpdate();
    }
  }

  // Сбросить энергию (для отладки)
  resetEnergy() {
    this.gameState.energy = {
      current: ENERGY_CONSTANTS.INITIAL_ENERGY,
      max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
      lastRegenTime: Date.now(),
      totalConsumed: 0,
      totalRegenerated: 0
    };
    
    this.temporaryEffects.clear();
    this.forceUpdate();
    
    console.log('⚡ Energy system reset');
  }

  // Деструктор
  destroy() {
    console.log('🧹 EnergyManager cleanup started');
    
    // Останавливаем регенерацию
    if (this.regenInterval) {
      this.cleanupManager.clearInterval(this.regenInterval);
      this.regenInterval = null;
    }
    
    // Очищаем временные эффекты
    this.temporaryEffects.clear();
    
    super.destroy();
    
    console.log('✅ EnergyManager destroyed');
  }
}