// managers/ZoneManager.js - ИСПРАВЛЕННАЯ версия с правильной инициализацией зон
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { Zone } from '../utils/Zone.js';
import { AngleManager } from '../utils/AngleManager.js';
import { ZoneEventQueue } from '../core/ZoneEventQueue.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';

// ЕДИНЫЕ типы зон
export const ZONE_TYPES = {
  TARGET: {
    id: 'target',
    name: 'Target Zone',
    color: '#C41E3A', // Красный
    effects: {
      givesGold: true,
      givesCombo: true,
      energyCost: 1
    }
  },
  
  ENERGY: {
    id: 'energy',
    name: 'Energy Zone',
    color: '#228B22', // Зеленый
    effects: {
      energyRestore: 3,
      energyCost: 0
    }
  },
  
  BONUS: {
    id: 'bonus',
    name: 'Bonus Zone',
    color: '#FFB347', // Золотистый
    effects: {
      energyRestore: 2,
      resourceBonus: true,
      resourceAmount: 2,
      energyCost: 0
    }
  },
  
  INACTIVE: {
    id: 'inactive',
    name: 'Inactive Zone',
    color: '#E5E5E5', // Серый
    effects: {
      energyCost: 0
    }
  }
};

export class ZoneManager extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.zones = [];
    this.zoneTypes = [];
    this.targetZone = 0;
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Очередь событий для синхронизации
    this.eventQueue = new ZoneEventQueue();
    this.cleanupManager.registerComponent(this.eventQueue, 'ZoneEventQueue');
    
    // Инициализируем зоны синхронно и надежно
    this.initialize();
    
    console.log('🎯 ZoneManager initialized with synchronized zone system');
  }

  /**
   * ИСПРАВЛЕНИЕ: Синхронная и надежная инициализация
   */
  initialize() {
    try {
      console.log('🎯 Starting ZoneManager initialization...');
      
      // Шаг 1: Валидация входных данных
      this.validateInitializationData();
      
      // Шаг 2: Создание базовой структуры зон
      this.createZoneStructure();
      
      // Шаг 3: Инициализация типов зон
      this.initializeZoneTypes();
      
      // Шаг 4: Валидация результата
      this.validateInitialization();
      
      // Шаг 5: Привязка событий
      this.bindEvents();
      
      this.isInitialized = true;
      console.log('✅ ZoneManager initialization completed successfully');
      
    } catch (error) {
      console.error('❌ ZoneManager initialization failed:', error);
      this.handleInitializationFailure(error);
    }
  }

  /**
   * Валидация данных для инициализации
   */
  validateInitializationData() {
    if (!this.gameState) {
      throw new Error('GameState is required for ZoneManager');
    }
    
    if (typeof ZONE_COUNT !== 'number' || ZONE_COUNT < 4 || ZONE_COUNT > 16) {
      throw new Error(`Invalid ZONE_COUNT: ${ZONE_COUNT}. Must be between 4 and 16`);
    }
    
    if (!ZONE_TYPES || typeof ZONE_TYPES !== 'object') {
      throw new Error('ZONE_TYPES configuration is missing');
    }
    
    console.log(`✅ Validation passed for ${ZONE_COUNT} zones`);
  }

  /**
   * Создание базовой структуры зон
   */
  createZoneStructure() {
    console.log('🎯 Creating zone structure...');
    
    // Очищаем предыдущие данные
    this.zones = [];
    this.zoneTypes = [];
    
    // Создаем зоны с использованием Zone класса
    for (let i = 0; i < ZONE_COUNT; i++) {
      const zone = new Zone(ZONE_TYPES.INACTIVE, i, ZONE_COUNT);
      this.zones.push(zone);
      this.zoneTypes.push({ ...ZONE_TYPES.INACTIVE });
    }
    
    // Валидируем созданную структуру
    if (this.zones.length !== ZONE_COUNT) {
      throw new Error(`Zone creation failed: expected ${ZONE_COUNT}, got ${this.zones.length}`);
    }
    
    console.log(`✅ Created ${ZONE_COUNT} zones successfully`);
  }

  /**
   * Инициализация типов зон
   */
  initializeZoneTypes() {
    console.log('🎯 Initializing zone types...');
    
    // Устанавливаем целевую зону
    this.targetZone = this.validateTargetZone(this.gameState.targetZone || 0);
    this.gameState.targetZone = this.targetZone;
    
    // Генерируем типы зон
    this.generateZoneTypes();
    
    console.log(`✅ Zone types initialized with target zone: ${this.targetZone}`);
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная генерация типов зон
   */
  generateZoneTypes() {
    try {
      // Сбрасываем все зоны на неактивные
      for (let i = 0; i < ZONE_COUNT; i++) {
        this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
        this.zones[i].definition = this.zoneTypes[i];
      }
      
      // Устанавливаем целевую зону
      this.zoneTypes[this.targetZone] = { ...ZONE_TYPES.TARGET };
      this.zones[this.targetZone].definition = this.zoneTypes[this.targetZone];
      
      // Генерируем специальные зоны
      this.generateSpecialZones();
      
      console.log(`✅ Zone types generated successfully`);
      
    } catch (error) {
      console.error('❌ Error generating zone types:', error);
      this.fallbackZoneGeneration();
    }
  }

  /**
   * Генерация специальных зон (энергетические, бонусные)
   */
  generateSpecialZones() {
    const availableIndices = [];
    
    // Собираем доступные индексы (исключая целевую зону)
    for (let i = 0; i < ZONE_COUNT; i++) {
      if (i !== this.targetZone) {
        availableIndices.push(i);
      }
    }
    
    // Энергетические зоны (25% от доступных)
    const energyZoneCount = Math.max(1, Math.floor(availableIndices.length * 0.25));
    for (let i = 0; i < energyZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      
      this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.ENERGY };
      this.zones[zoneIndex].definition = this.zoneTypes[zoneIndex];
    }
    
    // Бонусные зоны (15% от доступных)
    const bonusZoneCount = Math.max(1, Math.floor(availableIndices.length * 0.15));
    for (let i = 0; i < bonusZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      
      this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.BONUS };
      this.zones[zoneIndex].definition = this.zoneTypes[zoneIndex];
    }
    
    console.log(`Generated ${energyZoneCount} energy zones and ${bonusZoneCount} bonus zones`);
  }

  /**
   * Fallback генерация зон при ошибке
   */
  fallbackZoneGeneration() {
    console.warn('⚠️ Using fallback zone generation');
    
    for (let i = 0; i < ZONE_COUNT; i++) {
      if (i === this.targetZone) {
        this.zoneTypes[i] = { ...ZONE_TYPES.TARGET };
      } else {
        this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
      }
      this.zones[i].definition = this.zoneTypes[i];
    }
  }

  /**
   * Валидация инициализации
   */
  validateInitialization() {
    const errors = [];
    
    if (this.zones.length !== ZONE_COUNT) {
      errors.push(`Wrong zone count: ${this.zones.length} !== ${ZONE_COUNT}`);
    }
    
    if (this.zoneTypes.length !== ZONE_COUNT) {
      errors.push(`Wrong zone types count: ${this.zoneTypes.length} !== ${ZONE_COUNT}`);
    }
    
    if (this.targetZone < 0 || this.targetZone >= ZONE_COUNT) {
      errors.push(`Invalid target zone: ${this.targetZone}`);
    }
    
    // Проверяем, что есть ровно одна целевая зона
    const targetZones = this.zoneTypes.filter(type => type.id === 'target');
    if (targetZones.length !== 1) {
      errors.push(`Expected 1 target zone, found ${targetZones.length}`);
    }
    
    // Проверяем углы зон
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      if (!AngleManager.isValidAngle(zone.getStartAngle()) || 
          !AngleManager.isValidAngle(zone.getEndAngle())) {
        errors.push(`Invalid angles in zone ${i}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Zone validation failed: ${errors.join(', ')}`);
    }
    
    console.log('✅ Zone initialization validation passed');
  }

  /**
   * Обработка ошибки инициализации
   */
  handleInitializationFailure(error) {
    console.error('❌ ZoneManager initialization failed, attempting recovery...');
    
    try {
      // Создаем минимальную рабочую конфигурацию
      this.zones = Zone.createZones(ZONE_COUNT, ZONE_TYPES.INACTIVE);
      this.zoneTypes = Array(ZONE_COUNT).fill({ ...ZONE_TYPES.INACTIVE });
      this.targetZone = 0;
      this.zoneTypes[0] = { ...ZONE_TYPES.TARGET };
      this.zones[0].definition = this.zoneTypes[0];
      
      this.isInitialized = true;
      console.log('✅ Recovery successful with minimal configuration');
      
    } catch (recoveryError) {
      console.error('❌ Recovery failed:', recoveryError);
      throw new Error(`ZoneManager initialization failed and recovery impossible: ${error.message}`);
    }
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, (data) => {
      if (data && typeof data.newTargetZone === 'number') {
        this.handleZoneShuffleEvent(data.newTargetZone, data.reason);
      }
    });
  }

  /**
   * Обработка события перемешивания зон
   */
  handleZoneShuffleEvent(newTargetZone, reason = 'unknown') {
    if (!this.isInitialized) {
      console.warn('⚠️ ZoneManager not initialized, ignoring shuffle event');
      return;
    }
    
    console.log(`🎯 Handling zone shuffle: ${this.targetZone} -> ${newTargetZone} (${reason})`);
    this.setTargetZone(newTargetZone);
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная установка целевой зоны с валидацией
   */
  setTargetZone(newTargetZone) {
    if (!this.isInitialized) {
      console.warn('⚠️ Cannot set target zone: ZoneManager not initialized');
      return false;
    }
    
    const validatedTarget = this.validateTargetZone(newTargetZone);
    if (validatedTarget === this.targetZone) {
      return true; // Нет изменений
    }
    
    const oldTargetZone = this.targetZone;
    
    try {
      // Обновляем старую целевую зону
      if (oldTargetZone >= 0 && oldTargetZone < ZONE_COUNT) {
        this.zoneTypes[oldTargetZone] = { ...ZONE_TYPES.INACTIVE };
        this.zones[oldTargetZone].definition = this.zoneTypes[oldTargetZone];
      }
      
      // Устанавливаем новую целевую зону
      this.targetZone = validatedTarget;
      this.zoneTypes[this.targetZone] = { ...ZONE_TYPES.TARGET };
      this.zones[this.targetZone].definition = this.zoneTypes[this.targetZone];
      
      // Обновляем состояние игры
      this.gameState.targetZone = this.targetZone;
      this.gameState.previousTargetZone = oldTargetZone;
      
      // Регенерируем специальные зоны
      this.generateSpecialZones();
      
      // Уведомляем через очередь событий
      this.eventQueue.safeEnqueue('TARGET_ZONE_CHANGE', {
        previousZone: oldTargetZone,
        newZone: this.targetZone,
        source: 'setTargetZone'
      }, 2);
      
      console.log(`✅ Target zone changed: ${oldTargetZone} -> ${this.targetZone}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error setting target zone:', error);
      
      // Откатываемся к предыдущему состоянию
      this.targetZone = oldTargetZone;
      this.gameState.targetZone = oldTargetZone;
      return false;
    }
  }

  /**
   * Валидация целевой зоны
   */
  validateTargetZone(zoneIndex) {
    if (typeof zoneIndex !== 'number' || isNaN(zoneIndex)) {
      console.warn(`Invalid target zone type: ${typeof zoneIndex}`);
      return 0;
    }
    
    if (zoneIndex < 0) {
      console.warn(`Target zone too low: ${zoneIndex}`);
      return 0;
    }
    
    if (zoneIndex >= ZONE_COUNT) {
      console.warn(`Target zone too high: ${zoneIndex} >= ${ZONE_COUNT}`);
      return ZONE_COUNT - 1;
    }
    
    return Math.floor(zoneIndex);
  }

  /**
   * ИСПРАВЛЕНИЕ: Точный поиск зоны по углу с использованием AngleManager
   */
  findZoneByAngle(angle) {
    if (!this.isInitialized) {
      console.warn('⚠️ ZoneManager not initialized for angle search');
      return null;
    }
    
    return AngleManager.findZoneByAngle(angle, this.zones);
  }

  /**
   * Получить тип зоны по индексу
   */
  getZoneType(zoneIndex) {
    if (!this.isInitialized || zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return ZONE_TYPES.INACTIVE;
    }
    return this.zoneTypes[zoneIndex] || ZONE_TYPES.INACTIVE;
  }

  /**
   * Получить зону по индексу
   */
  getZone(zoneIndex) {
    if (!this.isInitialized || zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return null;
    }
    return this.zones[zoneIndex] || null;
  }

  /**
   * ИСПРАВЛЕНИЕ: Надежное получение зон для рендеринга
   */
  getZonesForRendering() {
    if (!this.isInitialized) {
      console.warn('⚠️ ZoneManager not initialized for rendering');
      return this.createEmergencyRenderZones();
    }
    
    try {
      return this.zones.map((zone, index) => {
        const zoneType = this.zoneTypes[index] || ZONE_TYPES.INACTIVE;
        
        return {
          index,
          zone,
          type: zoneType,
          isTarget: index === this.targetZone,
          color: zoneType.color,
          startAngle: zone.getStartAngle(),
          endAngle: zone.getEndAngle(),
          centerAngle: zone.getCenterAngle(),
          definition: zoneType
        };
      });
      
    } catch (error) {
      console.error('❌ Error getting zones for rendering:', error);
      return this.createEmergencyRenderZones();
    }
  }

  /**
   * Создание аварийных зон для рендеринга
   */
  createEmergencyRenderZones() {
    console.warn('⚠️ Creating emergency render zones');
    
    const stepAngle = (2 * Math.PI) / ZONE_COUNT;
    const emergencyZones = [];
    
    for (let i = 0; i < ZONE_COUNT; i++) {
      const isTarget = (i === (this.targetZone || 0));
      const zoneType = isTarget ? ZONE_TYPES.TARGET : ZONE_TYPES.INACTIVE;
      
      emergencyZones.push({
        index: i,
        zone: null,
        type: zoneType,
        isTarget,
        color: zoneType.color,
        startAngle: i * stepAngle,
        endAngle: (i + 1) * stepAngle,
        centerAngle: (i + 0.5) * stepAngle,
        definition: zoneType
      });
    }
    
    return emergencyZones;
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасная обработка клика по зоне
   */
  handleZoneClick(clickedZone, angle) {
    if (!this.isInitialized) {
      console.warn('⚠️ ZoneManager not initialized for click handling');
      return null;
    }
    
    let zoneIndex;
    
    // Определяем индекс зоны
    if (typeof clickedZone === 'number') {
      zoneIndex = clickedZone;
    } else if (clickedZone && typeof clickedZone.index === 'number') {
      zoneIndex = clickedZone.index;
    } else {
      console.warn('⚠️ Invalid clicked zone format:', clickedZone);
      return null;
    }
    
    // Валидируем индекс
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      console.warn('⚠️ Zone index out of range:', zoneIndex);
      return null;
    }
    
    const zoneType = this.getZoneType(zoneIndex);
    const normalizedAngle = AngleManager.normalize(angle);
    
    const result = {
      zoneIndex,
      zoneType,
      angle: normalizedAngle,
      isTarget: zoneIndex === this.targetZone,
      effects: { ...zoneType.effects },
      accuracy: this.calculateClickAccuracy(zoneIndex, normalizedAngle)
    };
    
    // Добавляем в очередь событий
    this.eventQueue.safeEnqueue('ZONE_CLICK', result, 3);
    
    console.log(`🖱️ Zone click processed: ${zoneIndex} (${zoneType.id}), accuracy: ${result.accuracy.toFixed(2)}`);
    
    return result;
  }

  /**
   * Вычисление точности клика
   */
  calculateClickAccuracy(zoneIndex, angle) {
    const zone = this.getZone(zoneIndex);
    if (!zone) return 0;
    
    try {
      return zone.getAccuracy(angle);
    } catch (error) {
      console.warn('⚠️ Error calculating click accuracy:', error);
      return 0.5; // Средняя точность как fallback
    }
  }

  /**
   * ИСПРАВЛЕНИЕ: Безопасное перемешивание зон
   */
  shuffleZones() {
    if (!this.isInitialized) {
      console.warn('⚠️ Cannot shuffle zones: ZoneManager not initialized');
      return this.targetZone;
    }
    
    let newTarget;
    let attempts = 0;
    const maxAttempts = ZONE_COUNT * 2;
    
    do {
      newTarget = Math.floor(Math.random() * ZONE_COUNT);
      attempts++;
    } while (newTarget === this.targetZone && ZONE_COUNT > 1 && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      newTarget = (this.targetZone + 1) % ZONE_COUNT;
    }
    
    const success = this.setTargetZone(newTarget);
    if (!success) {
      console.warn('⚠️ Failed to shuffle zones, keeping current target');
      return this.targetZone;
    }
    
    // Уведомляем через очередь событий
    this.eventQueue.safeEnqueue('ZONE_SHUFFLE', {
      newTargetZone: newTarget,
      reason: 'shuffle'
    }, 2);
    
    return newTarget;
  }

  /**
   * Получить статистику зон
   */
  getZoneStatistics() {
    const stats = {
      total: ZONE_COUNT,
      target: this.targetZone,
      isInitialized: this.isInitialized,
      types: {
        target: 0,
        energy: 0,
        bonus: 0,
        inactive: 0
      },
      zonesReady: this.zones ? this.zones.length : 0,
      typesReady: this.zoneTypes ? this.zoneTypes.length : 0
    };
    
    if (this.isInitialized && this.zoneTypes) {
      this.zoneTypes.forEach(zoneType => {
        if (zoneType && stats.types[zoneType.id] !== undefined) {
          stats.types[zoneType.id]++;
        }
      });
    }
    
    return stats;
  }

  /**
   * Получить отладочную информацию
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      targetZone: this.targetZone,
      zoneCount: ZONE_COUNT,
      zonesLength: this.zones ? this.zones.length : 0,
      zoneTypesLength: this.zoneTypes ? this.zoneTypes.length : 0,
      eventQueueStats: this.eventQueue ? this.eventQueue.getQueueStats() : null,
      zoneDetails: this.isInitialized ? this.zones.map((zone, index) => ({
        index,
        type: this.zoneTypes[index] ? this.zoneTypes[index].id : 'unknown',
        color: this.zoneTypes[index] ? this.zoneTypes[index].color : 'none',
        isTarget: index === this.targetZone,
        angles: zone ? {
          start: zone.getStartAngle(),
          end: zone.getEndAngle(),
          center: zone.getCenterAngle()
        } : null
      })) : [],
      statistics: this.getZoneStatistics()
    };
  }

  /**
   * Принудительное обновление зон
   */
  forceUpdate() {
    console.log('🔄 Force updating zones...');
    
    if (!this.isInitialized) {
      console.log('🔄 ZoneManager not initialized, performing full initialization...');
      this.initialize();
      return;
    }
    
    try {
      // Перегенерируем типы зон
      this.generateZoneTypes();
      
      // Валидируем результат
      this.validateInitialization();
      
      console.log('✅ Zones force updated successfully');
      
    } catch (error) {
      console.error('❌ Error during force update:', error);
      
      // Попытка восстановления
      this.isInitialized = false;
      this.initialize();
    }
  }

  /**
   * Сброс зон в исходное состояние
   */
  reset() {
    console.log('🔄 Resetting zones...');
    
    try {
      this.isInitialized = false;
      this.targetZone = 0;
      this.gameState.targetZone = 0;
      this.gameState.previousTargetZone = 0;
      
      // Очищаем очередь событий
      this.eventQueue.clearQueue();
      
      // Переинициализируем
      this.initialize();
      
      console.log('✅ Zones reset successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error during reset:', error);
      return false;
    }
  }

  /**
   * Валидация состояния зон
   */
  validateZones() {
    const errors = [];
    
    if (!this.isInitialized) {
      errors.push('ZoneManager not initialized');
      return { isValid: false, errors };
    }
    
    if (!this.zones || this.zones.length !== ZONE_COUNT) {
      errors.push(`Zone count mismatch: expected ${ZONE_COUNT}, got ${this.zones ? this.zones.length : 0}`);
    }
    
    if (!this.zoneTypes || this.zoneTypes.length !== ZONE_COUNT) {
      errors.push(`Zone types count mismatch: expected ${ZONE_COUNT}, got ${this.zoneTypes ? this.zoneTypes.length : 0}`);
    }
    
    if (this.targetZone < 0 || this.targetZone >= ZONE_COUNT) {
      errors.push(`Target zone out of range: ${this.targetZone}`);
    }
    
    if (this.zoneTypes) {
      const targetCount = this.zoneTypes.filter(type => type && type.id === 'target').length;
      if (targetCount !== 1) {
        errors.push(`Expected exactly 1 target zone, found: ${targetCount}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Проверка готовности для использования
   */
  isReady() {
    return this.isInitialized && 
           this.zones && 
           this.zones.length === ZONE_COUNT &&
           this.zoneTypes &&
           this.zoneTypes.length === ZONE_COUNT;
  }

  /**
   * Деструктор
   */
  destroy() {
    console.log('🧹 ZoneManager cleanup started');
    
    this.isInitialized = false;
    this.zones = null;
    this.zoneTypes = null;
    
    super.destroy();
    
    console.log('✅ ZoneManager destroyed');
  }
}