// effects/BuffManager.js - Управление баффами и дебаффами
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { 
  BUFF_DEFS, 
  DEBUFF_DEFS, 
  EFFECT_CONFIG,
  getBuffById,
  getDebuffById,
  getRandomBuffByRarity,
  getRandomDebuffBySeverity
} from './EffectDefinitions.js';
import { getResourcesInGroup } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class BuffManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.activeEffects = new Map(); // id -> {timeoutId, config, startTime}
    this.effectIntervals = new Map(); // id -> intervalId
    
    this.initializeEffectStates();
    
    console.log('🎭 BuffManager initialized');
  }

  // Инициализация состояний эффектов
  initializeEffectStates() {
    if (!this.gameState.effectStates) {
      this.gameState.effectStates = this.getDefaultEffectStates();
    } else {
      // Дополняем отсутствующие поля значениями по умолчанию
      const defaults = this.getDefaultEffectStates();
      Object.keys(defaults).forEach(key => {
        if (this.gameState.effectStates[key] === undefined) {
          this.gameState.effectStates[key] = defaults[key];
        }
      });
    }
  }

  // Получить состояния эффектов по умолчанию
  getDefaultEffectStates() {
    return {
      starPowerClicks: 0,
      shieldBlocks: 0,
      heavyClickRequired: {},
      reverseDirection: 1,
      frozenCombo: false
    };
  }

  // Применить случайный бафф
  applyRandomBuff() {
    const buffDef = getRandomBuffByRarity();
    if (buffDef) {
      this.applyBuff(buffDef);
    }
  }

  // Применить случайный дебафф
  applyRandomDebuff() {
    const debuffDef = getRandomDebuffBySeverity();
    if (debuffDef) {
      this.applyDebuff(debuffDef);
    }
  }

  // Применить бафф
  applyBuff(buffDef) {
    if (!this.isActive() || !buffDef) return;

    console.log(`Applying buff: ${buffDef.name}`);
    
    // Проверяем, можно ли стакать эффект
    const config = EFFECT_CONFIG[buffDef.id] || {};
    if (!config.stackable && this.gameState.buffs.includes(buffDef.id)) {
      // Если эффект не стакается, обновляем существующий
      this.removeBuff(buffDef.id);
    }

    // Добавляем в список активных баффов
    if (!this.gameState.buffs.includes(buffDef.id)) {
      this.gameState.buffs.push(buffDef.id);
    }

    // Эмитируем событие
    eventBus.emit(GameEvents.BUFF_APPLIED, {
      id: buffDef.id,
      name: buffDef.name
    });

    // Применяем эффект в зависимости от типа
    this.applyBuffEffect(buffDef);

    // Устанавливаем таймер истечения если есть длительность
    if (buffDef.duration) {
      this.setBuffExpiration(buffDef);
    }
  }

  // Применить эффект баффа
  applyBuffEffect(buffDef) {
    const config = EFFECT_CONFIG[buffDef.id] || {};

    switch (buffDef.id) {
      case 'frenzy':
      case 'lucky':
      case 'doubleTap':
      case 'slotMachine':
      case 'goldenTouch':
        // Пассивные баффы - эффект применяется в логике игры
        break;

      case 'speedBoost':
        this.applySpeedBoost(true);
        break;

      case 'waterfall':
        this.startWaterfall();
        break;

      case 'starPower':
        this.gameState.effectStates.starPowerClicks = GAME_CONSTANTS.STAR_POWER_CLICKS;
        break;

      case 'shield':
        this.gameState.effectStates.shieldBlocks = GAME_CONSTANTS.SHIELD_BLOCKS;
        break;

      case 'timeWarp':
        this.applyTimeWarp(true);
        break;

      case 'roll':
        this.executeRoll();
        break;

      case 'mysteryBox':
        this.showMysteryBox();
        break;
    }
  }

  // Установить истечение баффа
  setBuffExpiration(buffDef) {
    // Buff Mastery skill - увеличение длительности баффов
    const buffDurationBonus = this.getSkillBonus('duration', 'buffs');
    const durationMultiplier = 1 + buffDurationBonus;
    const finalDuration = Math.floor(buffDef.duration * durationMultiplier * 1000);

    const timeoutId = this.createTimeout(() => {
      this.removeBuff(buffDef.id);
      eventBus.emit(GameEvents.BUFF_EXPIRED, {
        id: buffDef.id,
        name: buffDef.name
      });
    }, finalDuration, `buff-${buffDef.id}`);

    this.activeEffects.set(buffDef.id, {
      timeoutId,
      config: EFFECT_CONFIG[buffDef.id],
      startTime: Date.now()
    });
  }

  // Удалить бафф
  removeBuff(buffId) {
    if (!this.gameState.buffs.includes(buffId)) return;

    console.log(`Removing buff: ${buffId}`);

    // Удаляем из списка
    this.gameState.buffs = this.gameState.buffs.filter(id => id !== buffId);

    // Очищаем таймер и интервалы
    this.clearEffect(buffId);

    // Снимаем специальные эффекты
    this.removeBuffEffect(buffId);
  }

  // Снять эффект баффа
  removeBuffEffect(buffId) {
    switch (buffId) {
      case 'speedBoost':
        this.applySpeedBoost(false);
        break;

      case 'timeWarp':
        this.applyTimeWarp(false);
        break;

      case 'waterfall':
        this.stopWaterfall();
        break;

      case 'starPower':
        this.gameState.effectStates.starPowerClicks = 0;
        break;

      case 'shield':
        this.gameState.effectStates.shieldBlocks = 0;
        break;
    }
  }

  // Применить дебафф
  applyDebuff(debuffDef) {
    if (!this.isActive() || !debuffDef) return;

    // Shield buff блокирует дебаффы
    if (this.gameState.buffs.includes('shield') && 
        this.gameState.effectStates.shieldBlocks > 0) {
      this.gameState.effectStates.shieldBlocks--;
      
      eventBus.emit(GameEvents.SHIELD_BLOCK, {
        debuff: debuffDef.name,
        remaining: this.gameState.effectStates.shieldBlocks
      });
      
      if (this.gameState.effectStates.shieldBlocks <= 0) {
        this.removeBuff('shield');
      }
      return;
    }

    console.log(`Applying debuff: ${debuffDef.name}`);

    // Проверяем стакаемость
    const config = EFFECT_CONFIG[debuffDef.id] || {};
    if (!config.stackable && this.gameState.debuffs.includes(debuffDef.id)) {
      this.removeDebuff(debuffDef.id);
    }

    // Добавляем в список активных дебаффов
    if (!this.gameState.debuffs.includes(debuffDef.id)) {
      this.gameState.debuffs.push(debuffDef.id);
    }

    eventBus.emit(GameEvents.DEBUFF_APPLIED, {
      id: debuffDef.id,
      name: debuffDef.name
    });

    // Применяем эффект дебаффа
    this.applyDebuffEffect(debuffDef);

    // Устанавливаем таймер истечения если есть длительность
    if (debuffDef.duration) {
      this.setDebuffExpiration(debuffDef);
    }
  }

  // Применить эффект дебаффа
  applyDebuffEffect(debuffDef) {
    switch (debuffDef.id) {
      case 'explosion':
        this.executeExplosion();
        break;

      case 'lock':
        this.gameState.blockedUntil = Date.now() + 1000;
        break;

      case 'rapid':
        this.applySpeedBoost(false, true); // rapid = anti-speed boost
        break;

      case 'freeze':
        this.gameState.effectStates.frozenCombo = true;
        break;

      case 'taxCollector':
        this.startTaxCollector();
        break;

      case 'decay':
        this.startDecay();
        break;

      case 'ghost':
      case 'heavyClick':
      case 'reverseControls':
      case 'curse':
        // Пассивные дебаффы - эффект применяется в логике игры
        break;
    }
  }

  // Установить истечение дебаффа
  setDebuffExpiration(debuffDef) {
    // Resilience skill - уменьшение длительности дебаффов
    const debuffReduction = this.getSkillBonus('reduction', 'debuffs');
    const finalDuration = Math.max(0.5, debuffDef.duration * (1 - debuffReduction));

    const timeoutId = this.createTimeout(() => {
      this.removeDebuff(debuffDef.id);
      eventBus.emit(GameEvents.DEBUFF_EXPIRED, {
        id: debuffDef.id,
        name: debuffDef.name
      });
    }, finalDuration * 1000, `debuff-${debuffDef.id}`);

    this.activeEffects.set(debuffDef.id, {
      timeoutId,
      config: EFFECT_CONFIG[debuffDef.id],
      startTime: Date.now()
    });
  }

  // Удалить дебафф
  removeDebuff(debuffId) {
    if (!this.gameState.debuffs.includes(debuffId)) return;

    console.log(`Removing debuff: ${debuffId}`);

    // Удаляем из списка
    this.gameState.debuffs = this.gameState.debuffs.filter(id => id !== debuffId);

    // Очищаем таймер и интервалы
    this.clearEffect(debuffId);

    // Снимаем специальные эффекты
    this.removeDebuffEffect(debuffId);
  }

  // Снять эффект дебаффа
  removeDebuffEffect(debuffId) {
    switch (debuffId) {
      case 'rapid':
        this.applySpeedBoost(true, false); // восстанавливаем нормальную скорость
        break;

      case 'freeze':
        this.gameState.effectStates.frozenCombo = false;
        break;

      case 'taxCollector':
        this.stopTaxCollector();
        break;

      case 'decay':
        this.stopDecay();
        break;

      case 'heavyClick':
        this.gameState.effectStates.heavyClickRequired = {};
        break;
    }
  }

  // ===== СПЕЦИАЛЬНЫЕ ЭФФЕКТЫ =====

  // Применить изменение скорости
  applySpeedBoost(isSpeedBoost, isRapid = false) {
    if (!this.gameState.CONFIG) {
      this.gameState.CONFIG = { rotationSpeed: 0.005 };
    }

    if (isRapid) {
      this.gameState.CONFIG.rotationSpeed *= GAME_CONSTANTS.RAPID_SPEED_MULTIPLIER;
    } else if (isSpeedBoost) {
      this.gameState.CONFIG.rotationSpeed *= GAME_CONSTANTS.SPEED_BOOST_MULTIPLIER;
    } else {
      // Восстанавливаем базовую скорость
      this.gameState.CONFIG.rotationSpeed = 0.005;
    }
  }

  // Применить Time Warp
  applyTimeWarp(enabled) {
    // Этот эффект обрабатывается в BuildingManager
    // Здесь мы просто уведомляем о смене состояния
    eventBus.emit(GameEvents.NOTIFICATION, 
      enabled ? '⏰ Time Warp: Buildings work 5x faster!' : 
                '⏰ Time Warp ended');
  }

  // Запустить Resource Waterfall
  startWaterfall() {
    const intervalId = this.createInterval(() => {
      const resourcePool = getResourcesInGroup('TRADEABLE');
      const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      const amount = GAME_CONSTANTS.WATERFALL_AMOUNT;
      
      this.gameState.addResource(randomResource, amount);
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }, GAME_CONSTANTS.WATERFALL_INTERVAL, 'waterfall');

    this.effectIntervals.set('waterfall', intervalId);
  }

  // Остановить Resource Waterfall
  stopWaterfall() {
    this.clearEffectInterval('waterfall');
  }

  // Выполнить Roll
  executeRoll() {
    const config = EFFECT_CONFIG.roll;
    const random = Math.random();
    let cumulativeChance = 0;
    
    for (const outcome of config.outcomes) {
      cumulativeChance += outcome.chance;
      if (random <= cumulativeChance) {
        const resourcePool = getResourcesInGroup('TRADEABLE');
        const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
        
        if (outcome.amount !== 0) {
          this.gameState.addResource(randomResource, outcome.amount);
          eventBus.emit(GameEvents.RESOURCE_CHANGED);
        }
        
        eventBus.emit(GameEvents.TEMP_MESSAGE, 
          `🎰 Roll: ${outcome.message} ${outcome.amount ? `${outcome.amount > 0 ? '+' : ''}${outcome.amount} ${randomResource}` : ''}`);
        break;
      }
    }
  }

  // Показать Mystery Box
  showMysteryBox() {
    const resourcePool = getResourcesInGroup('TRADEABLE');
    const options = [];
    
    while (options.length < 3 && options.length < resourcePool.length) {
      const resource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
      if (!options.includes(resource)) {
        options.push(resource);
      }
    }
    
    if (options.length >= 3) {
      eventBus.emit(GameEvents.MYSTERY_BOX, options);
    }
  }

  // Выполнить Explosion
  executeExplosion() {
    const resourcePool = getResourcesInGroup('TRADEABLE');
    const randomResource = resourcePool[Math.floor(Math.random() * resourcePool.length)];
    const currentAmount = this.gameState.resources[randomResource] || 0;
    
    // Efficient Storage skill - защита от взрывов
    const explosionProtection = this.getSkillBonus('protection', 'explosion');
    const baseDamage = GAME_CONSTANTS.EXPLOSION_DAMAGE_PERCENT;
    const finalDamage = baseDamage * (1 - explosionProtection);
    
    const newAmount = Math.max(0, Math.floor(currentAmount * (1 - finalDamage)));
    this.gameState.resources[randomResource] = newAmount;
    
    const actualLoss = currentAmount - newAmount;
    const message = explosionProtection > 0 ?
      `💣 Explosion: Lost ${actualLoss} ${randomResource} (${Math.floor(explosionProtection * 100)}% protected)` :
      `💣 Explosion: Lost ${actualLoss} ${randomResource}`;
    
    eventBus.emit(GameEvents.TEMP_MESSAGE, message);
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
  }

  // Запустить Tax Collector
  startTaxCollector() {
    const intervalId = this.createInterval(() => {
      const taxPercent = GAME_CONSTANTS.TAX_COLLECTOR_PERCENT;
      
      Object.keys(this.gameState.resources).forEach(resource => {
        const currentAmount = this.gameState.resources[resource] || 0;
        const taxAmount = Math.floor(currentAmount * taxPercent);
        this.gameState.resources[resource] = Math.max(0, currentAmount - taxAmount);
      });
      
      eventBus.emit(GameEvents.TAX_COLLECTED, { percent: taxPercent * 100 });
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }, GAME_CONSTANTS.TAX_COLLECTOR_INTERVAL, 'tax-collector');

    this.effectIntervals.set('taxCollector', intervalId);
  }

  // Остановить Tax Collector
  stopTaxCollector() {
    this.clearEffectInterval('taxCollector');
  }

  // Запустить Decay
  startDecay() {
    const intervalId = this.createInterval(() => {
      const decayPercent = 0.01; // 1% каждую секунду
      
      Object.keys(this.gameState.resources).forEach(resource => {
        const currentAmount = this.gameState.resources[resource] || 0;
        const decayAmount = Math.floor(currentAmount * decayPercent);
        this.gameState.resources[resource] = Math.max(0, currentAmount - decayAmount);
      });
      
      eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }, 1000, 'decay');

    this.effectIntervals.set('decay', intervalId);
  }

  // Остановить Decay
  stopDecay() {
    this.clearEffectInterval('decay');
  }

  // ===== УТИЛИТЫ =====

  // Очистить эффект
  clearEffect(effectId) {
    // Очищаем таймер истечения
    if (this.activeEffects.has(effectId)) {
      const effect = this.activeEffects.get(effectId);
      if (effect.timeoutId) {
        this.clearTimeout(effect.timeoutId);
      }
      this.activeEffects.delete(effectId);
    }

    // Очищаем интервалы
    this.clearEffectInterval(effectId);
  }

  // Очистить интервал эффекта
  clearEffectInterval(effectId) {
    if (this.effectIntervals.has(effectId)) {
      const intervalId = this.effectIntervals.get(effectId);
      this.clearInterval(intervalId);
      this.effectIntervals.delete(effectId);
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

  // Получить информацию об активных эффектах
  getActiveEffectInfo() {
    const info = {
      buffs: [],
      debuffs: [],
      totalActive: 0
    };

    // Информация о баффах
    this.gameState.buffs.forEach(buffId => {
      const def = getBuffById(buffId);
      const effect = this.activeEffects.get(buffId);
      
      if (def) {
        info.buffs.push({
          id: buffId,
          name: def.name,
          description: def.description,
          timeLeft: effect ? this.calculateTimeLeft(effect) : null,
          category: def.category,
          rarity: def.rarity
        });
      }
    });

    // Информация о дебаффах
    this.gameState.debuffs.forEach(debuffId => {
      const def = getDebuffById(debuffId);
      const effect = this.activeEffects.get(debuffId);
      
      if (def) {
        info.debuffs.push({
          id: debuffId,
          name: def.name,
          description: def.description,
          timeLeft: effect ? this.calculateTimeLeft(effect) : null,
          category: def.category,
          severity: def.severity
        });
      }
    });

    info.totalActive = info.buffs.length + info.debuffs.length;
    return info;
  }

  // Рассчитать оставшееся время эффекта
  calculateTimeLeft(effect) {
    if (!effect.startTime) return null;
    
    const elapsed = Date.now() - effect.startTime;
    const duration = effect.config?.duration || 0;
    
    if (duration <= 0) return null;
    
    const timeLeft = Math.max(0, (duration * 1000) - elapsed);
    return Math.ceil(timeLeft / 1000); // в секундах
  }

  // Получить статистику эффектов
  getEffectStatistics() {
    return {
      activeBuffs: this.gameState.buffs.length,
      activeDebuffs: this.gameState.debuffs.length,
      totalActiveEffects: this.gameState.buffs.length + this.gameState.debuffs.length,
      runningIntervals: this.effectIntervals.size,
      scheduledExpirations: this.activeEffects.size,
      effectStates: {
        starPowerClicks: this.gameState.effectStates.starPowerClicks,
        shieldBlocks: this.gameState.effectStates.shieldBlocks,
        frozenCombo: this.gameState.effectStates.frozenCombo,
        heavyClickZones: Object.keys(this.gameState.effectStates.heavyClickRequired || {}).length
      }
    };
  }

  // Проверить, активен ли определенный эффект
  isEffectActive(effectId) {
    return this.gameState.buffs.includes(effectId) || 
           this.gameState.debuffs.includes(effectId);
  }

  // Получить силу эффекта (для стакающихся эффектов)
  getEffectStrength(effectId) {
    let strength = 0;
    
    // Считаем количество одинаковых эффектов (если стакаются)
    this.gameState.buffs.forEach(buffId => {
      if (buffId === effectId) strength++;
    });
    
    this.gameState.debuffs.forEach(debuffId => {
      if (debuffId === effectId) strength++;
    });
    
    return strength;
  }

  // Форсированно удалить все эффекты
  clearAllEffects() {
    console.log('🧹 Clearing all effects...');
    
    // Создаем копии массивов для безопасного удаления
    const buffsToRemove = [...this.gameState.buffs];
    const debuffsToRemove = [...this.gameState.debuffs];
    
    buffsToRemove.forEach(buffId => this.removeBuff(buffId));
    debuffsToRemove.forEach(debuffId => this.removeDebuff(debuffId));
    
    // Очищаем все активные эффекты
    this.activeEffects.clear();
    this.effectIntervals.clear();
    
    // Сбрасываем состояния эффектов
    this.gameState.effectStates = this.getDefaultEffectStates();
    this.gameState.blockedUntil = 0;
    
    // Восстанавливаем базовые настройки игры
    if (this.gameState.CONFIG) {
      this.gameState.CONFIG.rotationSpeed = 0.005;
    }
    
    console.log('✅ All effects cleared');
  }

  // Применить эффект по ID (для отладки)
  forceApplyEffect(effectId, isDebuff = false) {
    const def = isDebuff ? getDebuffById(effectId) : getBuffById(effectId);
    
    if (!def) {
      console.warn(`Unknown effect: ${effectId}`);
      return false;
    }
    
    if (isDebuff) {
      this.applyDebuff(def);
    } else {
      this.applyBuff(def);
    }
    
    return true;
  }

  // Продлить эффект (для отладки)
  extendEffect(effectId, additionalTime) {
    if (!this.activeEffects.has(effectId)) {
      console.warn(`Effect ${effectId} is not active`);
      return false;
    }
    
    const effect = this.activeEffects.get(effectId);
    if (effect.timeoutId) {
      // Отменяем старый таймер
      this.clearTimeout(effect.timeoutId);
      
      // Создаем новый с дополнительным временем
      const newTimeoutId = this.createTimeout(() => {
        const isDebuff = this.gameState.debuffs.includes(effectId);
        if (isDebuff) {
          this.removeDebuff(effectId);
          eventBus.emit(GameEvents.DEBUFF_EXPIRED, { id: effectId });
        } else {
          this.removeBuff(effectId);
          eventBus.emit(GameEvents.BUFF_EXPIRED, { id: effectId });
        }
      }, additionalTime, `extended-${effectId}`);
      
      effect.timeoutId = newTimeoutId;
      this.activeEffects.set(effectId, effect);
      
      console.log(`Extended effect ${effectId} by ${additionalTime}ms`);
      return true;
    }
    
    return false;
  }

  // Получить эффекты по категории
  getEffectsByCategory(category) {
    const effects = {
      buffs: [],
      debuffs: []
    };
    
    this.gameState.buffs.forEach(buffId => {
      const def = getBuffById(buffId);
      if (def && def.category === category) {
        effects.buffs.push({
          id: buffId,
          definition: def,
          active: true
        });
      }
    });
    
    this.gameState.debuffs.forEach(debuffId => {
      const def = getDebuffById(debuffId);
      if (def && def.category === category) {
        effects.debuffs.push({
          id: debuffId,
          definition: def,
          active: true
        });
      }
    });
    
    return effects;
  }

  // Получить рекомендации по эффектам
  getEffectRecommendations() {
    const recommendations = [];
    const stats = this.getEffectStatistics();
    
    // Рекомендация по Shield если много дебаффов
    if (stats.activeDebuffs >= 2 && !this.gameState.buffs.includes('shield')) {
      recommendations.push({
        type: 'defense',
        message: 'Consider using Shield buff to block incoming debuffs',
        priority: 'high'
      });
    }
    
    // Рекомендация по комбо эффектам
    if (this.gameState.combo.count >= 10 && !this.gameState.buffs.includes('frenzy')) {
      recommendations.push({
        type: 'combo',
        message: 'High combo! Frenzy buff would multiply your gold gain',
        priority: 'medium'
      });
    }
    
    // Предупреждение о критических дебаффах
    const severeDebuffs = this.gameState.debuffs.filter(debuffId => {
      const def = getDebuffById(debuffId);
      return def && def.severity === 'severe';
    });
    
    if (severeDebuffs.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `You have ${severeDebuffs.length} severe debuff(s) active!`,
        priority: 'urgent'
      });
    }
    
    return recommendations;
  }

  // Деструктор
  destroy() {
    console.log('🧹 BuffManager cleanup started');
    
    // Очищаем все эффекты
    this.clearAllEffects();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ BuffManager destroyed');
  }
}