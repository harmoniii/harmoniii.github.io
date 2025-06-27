// managers/ZoneManager.js - ИСПРАВЛЕННАЯ версия с правильной инициализацией зон
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { Zone } from '../utils/Zone.js';
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
    this.zoneTypes = new Array(ZONE_COUNT); // Состояние типов зон
    this.targetZone = 0;
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная последовательность инициализации
    this.initializeZonesStructure();
    this.initializeZoneTypes();
    this.bindEvents();
    
    console.log('🎯 ZoneManager initialized with unified zone system');
  }

  // ИСПРАВЛЕНИЕ: Отдельная инициализация структуры зон
  initializeZonesStructure() {
    console.log('🎯 Initializing zones structure...');
    
    // Инициализируем целевую зону
    this.targetZone = this.gameState.targetZone || 0;
    
    // КРИТИЧЕСКИ ВАЖНО: Создаем массив зон ПЕРЕД инициализацией типов
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
      return new Zone(ZONE_TYPES.INACTIVE, i, ZONE_COUNT);
    });
    
    // Инициализируем массив типов зон со значениями по умолчанию
    for (let i = 0; i < ZONE_COUNT; i++) {
      this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
    }
    
    console.log(`✅ Created ${ZONE_COUNT} zones and initialized zone types array`);
  }

  // ИСПРАВЛЕНИЕ: Отдельная инициализация типов зон
  initializeZoneTypes() {
    console.log('🎯 Initializing zone types...');
    
    // Проверяем, что структура создана
    if (!this.zones || this.zones.length !== ZONE_COUNT) {
      console.error('❌ Zones structure not properly initialized!');
      this.initializeZonesStructure();
    }
    
    if (!this.zoneTypes || this.zoneTypes.length !== ZONE_COUNT) {
      console.error('❌ Zone types array not properly initialized!');
      this.zoneTypes = new Array(ZONE_COUNT);
      for (let i = 0; i < ZONE_COUNT; i++) {
        this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
      }
    }
    
    // Теперь безопасно генерируем типы зон
    this.generateZoneTypes();
  }

  // ИСПРАВЛЕНИЕ: Безопасная генерация типов зон
  generateZoneTypes() {
    console.log('🎯 Generating zone types...');
    
    // КРИТИЧЕСКАЯ ПРОВЕРКА: убеждаемся что все массивы инициализированы
    if (!this.zones || this.zones.length !== ZONE_COUNT) {
      console.error('❌ Zones array not ready for type generation!');
      return false;
    }
    
    if (!this.zoneTypes || this.zoneTypes.length !== ZONE_COUNT) {
      console.error('❌ Zone types array not ready for type generation!');
      return false;
    }
    
    try {
      // Сбрасываем все зоны на неактивные
      for (let i = 0; i < ZONE_COUNT; i++) {
        // ИСПРАВЛЕНИЕ: Проверяем существование элементов перед обращением
        if (!this.zones[i]) {
          console.error(`❌ Zone ${i} is undefined! Recreating...`);
          this.zones[i] = new Zone(ZONE_TYPES.INACTIVE, i, ZONE_COUNT);
        }
        
        this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
        this.zones[i].definition = this.zoneTypes[i];
      }
      
      // Устанавливаем целевую зону
      if (this.targetZone >= 0 && this.targetZone < ZONE_COUNT) {
        this.zoneTypes[this.targetZone] = { ...ZONE_TYPES.TARGET };
        this.zones[this.targetZone].definition = this.zoneTypes[this.targetZone];
      } else {
        console.warn(`⚠️ Invalid target zone ${this.targetZone}, using 0`);
        this.targetZone = 0;
        this.zoneTypes[0] = { ...ZONE_TYPES.TARGET };
        this.zones[0].definition = this.zoneTypes[0];
      }
      
      // Генерируем специальные зоны
      const availableIndices = [];
      for (let i = 0; i < ZONE_COUNT; i++) {
        if (i !== this.targetZone) {
          availableIndices.push(i);
        }
      }
      
      // Добавляем энергетические зоны (25% шанс)
      const energyZoneCount = Math.max(1, Math.floor(availableIndices.length * 0.25));
      for (let i = 0; i < energyZoneCount && availableIndices.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
        
        this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.ENERGY };
        this.zones[zoneIndex].definition = this.zoneTypes[zoneIndex];
      }
      
      // Добавляем бонусные зоны (15% шанс)
      const bonusZoneCount = Math.max(1, Math.floor(availableIndices.length * 0.15));
      for (let i = 0; i < bonusZoneCount && availableIndices.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableIndices.length);
        const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
        
        this.zoneTypes[zoneIndex] = { ...ZONE_TYPES.BONUS };
        this.zones[zoneIndex].definition = this.zoneTypes[zoneIndex];
      }
      
      console.log(`✅ Zone types generated - Target: ${this.targetZone}, Energy: ${energyZoneCount}, Bonus: ${bonusZoneCount}`);
      return true;
      
    } catch (error) {
      console.error('❌ Error during zone type generation:', error);
      return false;
    }
  }

  // Привязка событий
  bindEvents() {
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, (newTargetZone) => {
      console.log(`🎯 Zone shuffle event: ${this.targetZone} -> ${newTargetZone}`);
      this.setTargetZone(newTargetZone);
    });
  }

  // ИСПРАВЛЕНИЕ: Безопасная установка целевой зоны
  setTargetZone(newTargetZone) {
    // Валидация входного параметра
    if (typeof newTargetZone !== 'number' || isNaN(newTargetZone)) {
      console.warn('Invalid target zone type:', typeof newTargetZone, newTargetZone);
      return false;
    }
    
    if (newTargetZone < 0 || newTargetZone >= ZONE_COUNT) {
      console.warn('Invalid target zone range:', newTargetZone);
      return false;
    }
    
    // Проверяем готовность структур
    if (!this.zones || this.zones.length !== ZONE_COUNT) {
      console.error('❌ Zones not ready for target zone change');
      return false;
    }
    
    const oldTargetZone = this.targetZone;
    this.targetZone = newTargetZone;
    this.gameState.targetZone = newTargetZone;
    this.gameState.previousTargetZone = oldTargetZone;
    
    // Безопасно перегенерируем типы зон
    const success = this.generateZoneTypes();
    if (!success) {
      console.error('❌ Failed to regenerate zone types');
      // Откатываемся к предыдущему состоянию
      this.targetZone = oldTargetZone;
      this.gameState.targetZone = oldTargetZone;
      return false;
    }
    
    console.log(`🎯 Target zone changed: ${oldTargetZone} -> ${newTargetZone}`);
    return true;
  }

  // Получить тип зоны по индексу
  getZoneType(zoneIndex) {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return ZONE_TYPES.INACTIVE;
    }
    if (!this.zoneTypes || !this.zoneTypes[zoneIndex]) {
      return ZONE_TYPES.INACTIVE;
    }
    return this.zoneTypes[zoneIndex];
  }

  // Получить зону по индексу
  getZone(zoneIndex) {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return null;
    }
    if (!this.zones || !this.zones[zoneIndex]) {
      return null;
    }
    return this.zones[zoneIndex];
  }

  // ИСПРАВЛЕНИЕ: Безопасный поиск зоны по углу
  findZoneByAngle(angle) {
    if (!this.zones || this.zones.length === 0) {
      console.warn('⚠️ No zones available for angle search');
      return null;
    }
    
    // Валидируем угол
    if (typeof angle !== 'number' || isNaN(angle)) {
      console.warn('⚠️ Invalid angle for zone search:', angle);
      return null;
    }
    
    try {
      const foundZone = this.zones.find(zone => zone && zone.contains && zone.contains(angle));
      return foundZone || null;
    } catch (error) {
      console.error('❌ Error finding zone by angle:', error);
      return null;
    }
  }

  // Получить все зоны для рендеринга
  getZonesForRendering() {
    if (!this.zones || this.zones.length === 0) {
      console.warn('⚠️ No zones available for rendering');
      return [];
    }
    
    try {
      return this.zones.map((zone, index) => {
        if (!zone) {
          console.warn(`⚠️ Zone ${index} is null, creating fallback`);
          return {
            index,
            zone: null,
            type: ZONE_TYPES.INACTIVE,
            isTarget: false,
            color: ZONE_TYPES.INACTIVE.color,
            startAngle: (index * 2 * Math.PI) / ZONE_COUNT,
            endAngle: ((index + 1) * 2 * Math.PI) / ZONE_COUNT,
            centerAngle: ((index + 0.5) * 2 * Math.PI) / ZONE_COUNT
          };
        }
        
        const zoneType = this.zoneTypes[index] || ZONE_TYPES.INACTIVE;
        
        return {
          index,
          zone,
          type: zoneType,
          isTarget: index === this.targetZone,
          color: zoneType.color,
          startAngle: zone.getStartAngle(),
          endAngle: zone.getEndAngle(),
          centerAngle: zone.getCenterAngle()
        };
      });
    } catch (error) {
      console.error('❌ Error getting zones for rendering:', error);
      return [];
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасная обработка клика по зоне
  handleZoneClick(clickedZone, angle) {
    if (!clickedZone) {
      console.warn('⚠️ No zone provided for click handling');
      return null;
    }
    
    // Безопасно получаем индекс зоны
    let zoneIndex;
    if (typeof clickedZone === 'object' && clickedZone.index !== undefined) {
      zoneIndex = clickedZone.index;
    } else if (typeof clickedZone === 'number') {
      zoneIndex = clickedZone;
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
    
    console.log(`🖱️ Zone click: ${zoneIndex}, type: ${zoneType.id}`);
    
    const result = {
      zoneIndex,
      zoneType,
      angle: angle || 0,
      isTarget: zoneIndex === this.targetZone,
      effects: { ...zoneType.effects }
    };
    
    // Эмитируем событие клика по зоне
    eventBus.emit(GameEvents.ZONE_HIT, result);
    
    return result;
  }

  // ИСПРАВЛЕНИЕ: Безопасное перемешивание зон
  shuffleZones() {
    if (!this.zones || this.zones.length === 0) {
      console.warn('⚠️ Cannot shuffle zones - no zones available');
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
    
    // Эмитируем событие перемешивания
    eventBus.emit(GameEvents.ZONES_SHUFFLED, newTarget);
    
    return newTarget;
  }

  // Получить статистику зон
  getZoneStatistics() {
    const stats = {
      total: ZONE_COUNT,
      target: this.targetZone,
      types: {
        target: 0,
        energy: 0,
        bonus: 0,
        inactive: 0
      },
      zonesReady: this.zones ? this.zones.length : 0,
      typesReady: this.zoneTypes ? this.zoneTypes.length : 0
    };
    
    if (this.zoneTypes && this.zoneTypes.length > 0) {
      this.zoneTypes.forEach(zoneType => {
        if (zoneType && stats.types[zoneType.id] !== undefined) {
          stats.types[zoneType.id]++;
        }
      });
    }
    
    return stats;
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      targetZone: this.targetZone,
      zoneCount: ZONE_COUNT,
      zonesInitialized: !!(this.zones && this.zones.length === ZONE_COUNT),
      zoneTypesInitialized: !!(this.zoneTypes && this.zoneTypes.length === ZONE_COUNT),
      zoneTypes: this.zoneTypes ? this.zoneTypes.map((type, index) => ({
        index,
        type: type ? type.id : 'null',
        color: type ? type.color : 'none',
        isTarget: index === this.targetZone
      })) : [],
      statistics: this.getZoneStatistics()
    };
  }

  // ИСПРАВЛЕНИЕ: Безопасное принудительное обновление зон
  forceUpdate() {
    console.log('🔄 Force updating zones...');
    
    try {
      // Переинициализируем структуру если нужно
      if (!this.zones || this.zones.length !== ZONE_COUNT) {
        console.log('🔄 Reinitializing zones structure...');
        this.initializeZonesStructure();
      }
      
      if (!this.zoneTypes || this.zoneTypes.length !== ZONE_COUNT) {
        console.log('🔄 Reinitializing zone types...');
        this.initializeZoneTypes();
      } else {
        // Просто перегенерируем типы
        this.generateZoneTypes();
      }
      
      console.log('✅ Zones force updated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error during force update:', error);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Безопасный сброс зон
  reset() {
    console.log('🔄 Resetting zones...');
    
    try {
      this.targetZone = 0;
      this.gameState.targetZone = 0;
      this.gameState.previousTargetZone = 0;
      
      // Переинициализируем все с нуля
      this.initializeZonesStructure();
      this.initializeZoneTypes();
      
      console.log('✅ Zones reset successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error during reset:', error);
      return false;
    }
  }

  // Проверить валидность состояния зон
  validateZones() {
    let isValid = true;
    const errors = [];
    
    // Проверяем количество зон
    if (!this.zones || this.zones.length !== ZONE_COUNT) {
      errors.push(`Zone count mismatch: expected ${ZONE_COUNT}, got ${this.zones ? this.zones.length : 0}`);
      isValid = false;
    }
    
    if (!this.zoneTypes || this.zoneTypes.length !== ZONE_COUNT) {
      errors.push(`Zone types count mismatch: expected ${ZONE_COUNT}, got ${this.zoneTypes ? this.zoneTypes.length : 0}`);
      isValid = false;
    }
    
    // Проверяем целевую зону
    if (this.targetZone < 0 || this.targetZone >= ZONE_COUNT) {
      errors.push(`Target zone out of range: ${this.targetZone}`);
      isValid = false;
    }
    
    // Проверяем, что целевая зона имеет правильный тип
    if (this.zoneTypes && this.zoneTypes[this.targetZone]) {
      const targetZoneType = this.zoneTypes[this.targetZone];
      if (targetZoneType.id !== 'target') {
        errors.push(`Target zone has wrong type: ${targetZoneType.id}`);
        isValid = false;
      }
    }
    
    // Проверяем, что есть хотя бы одна целевая зона
    if (this.zoneTypes) {
      const targetCount = this.zoneTypes.filter(type => type && type.id === 'target').length;
      if (targetCount !== 1) {
        errors.push(`Expected exactly 1 target zone, found: ${targetCount}`);
        isValid = false;
      }
    }
    
    if (!isValid) {
      console.warn('⚠️ Zone validation failed:', errors);
    }
    
    return { isValid, errors };
  }

  // Исправить поврежденные зоны
  fixCorruptedZones() {
    console.log('🔧 Fixing corrupted zones...');
    
    const validation = this.validateZones();
    if (validation.isValid) {
      console.log('✅ Zones are valid, no fix needed');
      return false;
    }
    
    console.log('🔧 Zones are corrupted, performing reset...');
    const success = this.reset();
    
    if (success) {
      const revalidation = this.validateZones();
      if (revalidation.isValid) {
        console.log('✅ Zones fixed successfully');
        return true;
      } else {
        console.error('❌ Failed to fix zones:', revalidation.errors);
        return false;
      }
    }
    
    return false;
  }

  // Безопасное получение информации о зоне
  getZoneInfo(zoneIndex) {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return null;
    }
    
    const zone = this.getZone(zoneIndex);
    const zoneType = this.getZoneType(zoneIndex);
    
    return {
      index: zoneIndex,
      zone: zone,
      type: zoneType,
      isTarget: zoneIndex === this.targetZone,
      isValid: !!(zone && zoneType)
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 ZoneManager cleanup started');
    
    // Очищаем массивы
    this.zones = null;
    this.zoneTypes = null;
    
    super.destroy();
    
    console.log('✅ ZoneManager destroyed');
  }
}