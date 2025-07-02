// effects/BuffManager.js - ОБНОВЛЕННАЯ версия с новыми эффектами
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
    this.activeEffects = new Map(); // id -> {timeoutId, config, startTime, duration}
    this.effectIntervals = new Map(); // id -> intervalId
    
    this.cleanupCheckInterval = null;
    this.forceCleanupAfter = 60000; // 1 минута максимум для любого эффекта
    
    this.initializeEffectStates();
    this.startCleanupChecker();
    
    console.log('🎭 BuffManager initialized with new effects');
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
      frozenCombo: false,
      // НОВЫЕ СОСТОЯНИЯ
      crystalFocusActive: false,
      prismaticGlowActive: false,
      chaosClownActive: false,
      taxBoomActive: false,
      absoluteZeroActive: false,
      energyParasiteActive: false,
      unluckyCurseActive: false
    };
  }

  // Запуск системы принудительной очистки
  startCleanupChecker() {
    this.cleanupCheckInterval = this.createInterval(() => {
      this.forceCleanExpiredEffects();
    }, 5000, 'effect-cleanup-checker');
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

      // НОВЫЕ БАФФЫ
      case 'crystalFocus':
        this.gameState.effectStates.crystalFocusActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '💎 Crystal Focus: All clicks are now critical!');
        break;

      case 'prismaticGlow':
        this.gameState.effectStates.prismaticGlowActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '🌈 Prismatic Glow: Target hits cost no energy!');
        break;

      case 'chaosClown':
        this.gameState.effectStates.chaosClownActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '🎪 Chaos Clown: Only buffs, no debuffs!');
        break;

      case 'taxBoom':
        this.gameState.effectStates.taxBoomActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '🏛️ Tax Boom: 33% discount in market for 15 minutes!');
        break;
    }
  }

  // Установить истечение баффа с правильной очисткой
setBuffExpiration(buffDef) {
  // Buff Mastery skill + новый Buff Duration skill
  const buffDurationBonus = this.getSkillBonus('duration', 'buffs');
  const durationMultiplier = 1 + buffDurationBonus;
  
  // НОВОЕ: учитываем Buff Duration skill
  const buffDurationSkill = this.getSkillBonus('duration', 'buffs'); // уже включено выше
  
  const finalDuration = Math.floor(buffDef.duration * durationMultiplier * 1000);

  const timeoutId = this.createTimeout(() => {
    console.log(`🕒 Buff ${buffDef.id} expired naturally`);
    this.removeBuff(buffDef.id);
    eventBus.emit(GameEvents.BUFF_EXPIRED, {
      id: buffDef.id,
      name: buffDef.name
    });
  }, finalDuration, `buff-${buffDef.id}`);

  this.activeEffects.set(buffDef.id, {
    timeoutId,
    config: EFFECT_CONFIG[buffDef.id],
    startTime: Date.now(),
    duration: finalDuration,
    type: 'buff',
    definition: buffDef
  });

  console.log(`⏰ Buff ${buffDef.id} will expire in ${finalDuration}ms (duration bonus: +${Math.floor(buffDurationBonus * 100)}%)`);
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

      // НОВЫЕ БАФФЫ
      case 'crystalFocus':
        this.gameState.effectStates.crystalFocusActive = false;
        break;

      case 'prismaticGlow':
        this.gameState.effectStates.prismaticGlowActive = false;
        break;

      case 'chaosClown':
        this.gameState.effectStates.chaosClownActive = false;
        break;

      case 'taxBoom':
        this.gameState.effectStates.taxBoomActive = false;
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

    // Chaos Clown блокирует все дебаффы
    if (this.gameState.effectStates.chaosClownActive) {
      eventBus.emit(GameEvents.NOTIFICATION, '🎪 Chaos Clown blocked debuff!');
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

      // НОВЫЕ ДЕБАФФЫ
      case 'absoluteZero':
        this.gameState.effectStates.absoluteZeroActive = true;
        this.stopAllEnergyRegen();
        this.stopAllBuildingProduction();
        eventBus.emit(GameEvents.NOTIFICATION, '❄️ Absolute Zero: Everything frozen!');
        break;

      case 'energyParasite':
        this.gameState.effectStates.energyParasiteActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '⚡ Energy Parasite: Double energy cost!');
        break;

      case 'unluckyCurse':
        this.gameState.effectStates.unluckyCurseActive = true;
        eventBus.emit(GameEvents.NOTIFICATION, '🎲 Unlucky Curse: Only debuffs, no buffs!');
        break;
    }
  }

  // Установить истечение дебаффа с правильной очисткой
setDebuffExpiration(debuffDef) {
  // Resilience skill + новый Debuff Resistance skill
  const debuffReduction = this.getSkillBonus('reduction', 'debuffs');
  const finalDuration = Math.max(0.5, debuffDef.duration * (1 - Math.min(0.8, debuffReduction)));

  const timeoutId = this.createTimeout(() => {
    console.log(`🕒 Debuff ${debuffDef.id} expired naturally`);
    this.removeDebuff(debuffDef.id);
    eventBus.emit(GameEvents.DEBUFF_EXPIRED, {
      id: debuffDef.id,
      name: debuffDef.name
    });
  }, finalDuration * 1000, `debuff-${debuffDef.id}`);

  this.activeEffects.set(debuffDef.id, {
    timeoutId,
    config: EFFECT_CONFIG[debuffDef.id],
    startTime: Date.now(),
    duration: finalDuration * 1000,
    type: 'debuff',
    definition: debuffDef
  });

  console.log(`⏰ Debuff ${debuffDef.id} will expire in ${finalDuration * 1000}ms (resistance: -${Math.floor(debuffReduction * 100)}%)`);
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

      // НОВЫЕ ДЕБАФФЫ
      case 'absoluteZero':
        this.gameState.effectStates.absoluteZeroActive = false;
        this.restoreAllEnergyRegen();
        this.restoreAllBuildingProduction();
        break;

      case 'energyParasite':
        this.gameState.effectStates.energyParasiteActive = false;
        break;

      case 'unluckyCurse':
        this.gameState.effectStates.unluckyCurseActive = false;
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

  // ===== НОВЫЕ МЕТОДЫ ДЛЯ ABSOLUTE ZERO =====

  // Остановить всю регенерацию энергии
  stopAllEnergyRegen() {
    if (this.gameState.energyManager && typeof this.gameState.energyManager.stopRegeneration === 'function') {
      this.gameState.energyManager.stopRegeneration();
    }
  }

  // Восстановить регенерацию энергии
  restoreAllEnergyRegen() {
    if (this.gameState.energyManager && typeof this.gameState.energyManager.startRegeneration === 'function') {
      this.gameState.energyManager.startRegeneration();
    }
  }

  // Остановить всё производство зданий
  stopAllBuildingProduction() {
    if (this.gameState.buildingManager && typeof this.gameState.buildingManager.stopAllProduction === 'function') {
      this.gameState.buildingManager.stopAllProduction();
    }
  }

  // Восстановить производство зданий
  restoreAllBuildingProduction() {
    if (this.gameState.buildingManager && typeof this.gameState.buildingManager.startProduction === 'function') {
      this.gameState.buildingManager.startProduction();
    }
  }

  // ===== ПРОВЕРКИ АКТИВНЫХ ЭФФЕКТОВ =====

  // Проверить критические удары (Crystal Focus)
  shouldForceCritical() {
    return this.gameState.effectStates.crystalFocusActive === true;
  }

  // Проверить бесплатную энергию (Prismatic Glow)
  shouldReduceEnergyCost() {
    return this.gameState.effectStates.prismaticGlowActive === true;
  }

  // Проверить двойную стоимость энергии (Energy Parasite)
  shouldDoubleEnergyCost() {
    return this.gameState.effectStates.energyParasiteActive === true;
  }

  // Проверить скидку в маркете (Tax Boom)
  getMarketDiscount() {
    if (this.gameState.effectStates.taxBoomActive === true) {
      return 0.33; // 33% скидка
    }
    return 0;
  }

  // Модифицировать шанс баффов/дебаффов
  modifyEffectChances(baseBuffChance, baseDebuffChance) {
    let buffChance = baseBuffChance;
    let debuffChance = baseDebuffChance;

    // Chaos Clown
    if (this.gameState.effectStates.chaosClownActive) {
      buffChance = 100; // Гарантированные баффы
      debuffChance = 0; // Никаких дебаффов
    }

    // Unlucky Curse
    if (this.gameState.effectStates.unluckyCurseActive) {
      buffChance = 0; // Никаких баффов
      debuffChance = 100; // Гарантированные дебаффы
    }

    // Lucky buff
    if (this.gameState.buffs && this.gameState.buffs.includes('lucky')) {
      buffChance += GAME_CONSTANTS.LUCKY_BUFF_BONUS;
    }

    // Curse debuff
    if (this.gameState.debuffs && this.gameState.debuffs.includes('curse')) {
      buffChance *= 0.5;
    }

    return { buffChance, debuffChance };
  }

  // ===== УТИЛИТЫ =====

  // Правильная очистка эффекта
  clearEffect(effectId) {
    console.log(`🧹 Clearing effect: ${effectId}`);
    
    // Очищаем таймер истечения
    if (this.activeEffects.has(effectId)) {
      const effect = this.activeEffects.get(effectId);
      if (effect.timeoutId) {
        this.cleanupManager.clearTimeout(effect.timeoutId);
        console.log(`Cleared timeout for effect: ${effectId}`);
      }
      this.activeEffects.delete(effectId);
    }

    // Очищаем интервалы
    this.clearEffectInterval(effectId);
  }

  // Правильная очистка интервала эффекта
  clearEffectInterval(effectId) {
    if (this.effectIntervals.has(effectId)) {
      const intervalId = this.effectIntervals.get(effectId);
      this.cleanupManager.clearInterval(intervalId);
      this.effectIntervals.delete(effectId);
      console.log(`Cleared interval for effect: ${effectId}`);
    }
  }

  // Принудительная очистка истекших эффектов
  forceCleanExpiredEffects() {
    const now = Date.now();
    const expiredEffects = [];

    // Проверяем все активные эффекты
    this.activeEffects.forEach((effect, effectId) => {
      if (effect.startTime && effect.duration) {
        const elapsed = now - effect.startTime;
        
        // Проверяем истечение по времени
        if (elapsed > effect.duration) {
          expiredEffects.push(effectId);
        }
        
        // Принудительная очистка для слишком старых эффектов
        if (elapsed > this.forceCleanupAfter) {
          console.warn(`🧹 Force cleaning old effect: ${effectId} (${elapsed}ms old)`);
          expiredEffects.push(effectId);
        }
      }
    });

    // Удаляем истекшие эффекты
    expiredEffects.forEach(effectId => {
      console.log(`🕒 Force removing expired effect: ${effectId}`);
      
      if (this.gameState.buffs.includes(effectId)) {
        this.removeBuff(effectId);
        eventBus.emit(GameEvents.BUFF_EXPIRED, { id: effectId, name: effectId });
      }
      
      if (this.gameState.debuffs.includes(effectId)) {
        this.removeDebuff(effectId);
        eventBus.emit(GameEvents.DEBUFF_EXPIRED, { id: effectId, name: effectId });
      }
    });

    // Дополнительная проверка на висящие эффекты в DOM
    this.cleanupOrphanedEffects();
  }

  // Очистка осиротевших эффектов в UI
  cleanupOrphanedEffects() {
    // Получаем текущие активные эффекты
    const currentBuffs = this.gameState.buffs || [];
    const currentDebuffs = this.gameState.debuffs || [];
    const allCurrentEffects = [...currentBuffs, ...currentDebuffs];
    
    // Удаляем эффекты из activeEffects если их нет в gameState
    const orphanedEffects = [];
    this.activeEffects.forEach((effect, effectId) => {
      if (!allCurrentEffects.includes(effectId)) {
        orphanedEffects.push(effectId);
      }
    });
    
    orphanedEffects.forEach(effectId => {
      console.log(`🧹 Cleaning orphaned effect: ${effectId}`);
      this.clearEffect(effectId);
    });
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
    if (!effect.startTime || !effect.duration) return null;
    
    const elapsed = Date.now() - effect.startTime;
    const timeLeft = Math.max(0, effect.duration - elapsed);
    
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
        heavyClickZones: Object.keys(this.gameState.effectStates.heavyClickRequired || {}).length,
        // Новые состояния
        crystalFocusActive: this.gameState.effectStates.crystalFocusActive,
        prismaticGlowActive: this.gameState.effectStates.prismaticGlowActive,
        chaosClownActive: this.gameState.effectStates.chaosClownActive,
        taxBoomActive: this.gameState.effectStates.taxBoomActive,
        absoluteZeroActive: this.gameState.effectStates.absoluteZeroActive,
        energyParasiteActive: this.gameState.effectStates.energyParasiteActive,
        unluckyCurseActive: this.gameState.effectStates.unluckyCurseActive
      }
    };
  }

  // Проверить, активен ли определенный эффект
  isEffectActive(effectId) {
    return this.gameState.buffs.includes(effectId) || 
           this.gameState.debuffs.includes(effectId);
  }

  // Улучшенная очистка всех эффектов
  clearAllEffects() {
    console.log('🧹 Clearing all effects...');
    
    // Создаем копии массивов для безопасного удаления
    const buffsToRemove = [...(this.gameState.buffs || [])];
    const debuffsToRemove = [...(this.gameState.debuffs || [])];
    
    buffsToRemove.forEach(buffId => {
      try {
        this.removeBuff(buffId);
      } catch (error) {
        console.warn(`Error removing buff ${buffId}:`, error);
      }
    });
    
    debuffsToRemove.forEach(debuffId => {
      try {
        this.removeDebuff(debuffId);
      } catch (error) {
        console.warn(`Error removing debuff ${debuffId}:`, error);
      }
    });
    
    // Принудительно очищаем все активные эффекты
    this.activeEffects.clear();
    this.effectIntervals.clear();
    
    // Сбрасываем состояния эффектов
    this.gameState.effectStates = this.getDefaultEffectStates();
    this.gameState.blockedUntil = 0;
    
    // Восстанавливаем базовые настройки игры
    if (this.gameState.CONFIG) {
      this.gameState.CONFIG.rotationSpeed = 0.005;
    }
    
    // Очищаем массивы эффектов
    this.gameState.buffs = [];
    this.gameState.debuffs = [];
    
    console.log('✅ All effects cleared');
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      activeEffects: Array.from(this.activeEffects.entries()).map(([id, effect]) => ({
        id,
        type: effect.type,
        startTime: effect.startTime,
        duration: effect.duration,
        timeLeft: this.calculateTimeLeft(effect),
        age: Date.now() - effect.startTime
      })),
      activeIntervals: Array.from(this.effectIntervals.keys()),
      gameStateBuffs: this.gameState.buffs || [],
      gameStateDebuffs: this.gameState.debuffs || [],
      effectStates: this.gameState.effectStates
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 BuffManager cleanup started');
    
    // Останавливаем проверку очистки
    if (this.cleanupCheckInterval) {
      this.cleanupManager.clearInterval(this.cleanupCheckInterval);
      this.cleanupCheckInterval = null;
    }
    
    // Очищаем все эффекты
    this.clearAllEffects();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ BuffManager destroyed');
  }
}