// managers/ZoneManager.js - ЕДИНЫЙ менеджер зон (исправленная версия)
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
    
    this.initializeZones();
    this.bindEvents();
    
    console.log('🎯 ZoneManager initialized with unified zone system');
  }

  // Инициализация зон
  initializeZones() {
    // Инициализируем целевую зону
    this.targetZone = this.gameState.targetZone || 0;
    
    // Создаем геометрические зоны
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) => {
      return new Zone(ZONE_TYPES.INACTIVE, i, ZONE_COUNT);
    });
    
    // Генерируем типы зон
    this.generateZoneTypes();
    
    console.log(`🎯 Zones initialized - Target: ${this.targetZone}`);
  }

  // ЕДИНАЯ генерация типов зон
  generateZoneTypes() {
    console.log('🎯 Generating zone types...');
    
    // Сбрасываем все зоны на неактивные
    for (let i = 0; i < ZONE_COUNT; i++) {
      this.zoneTypes[i] = { ...ZONE_TYPES.INACTIVE };
      this.zones[i].definition = this.zoneTypes[i];
    }
    
    // Устанавливаем целевую зону
    this.zoneTypes[this.targetZone] = { ...ZONE_TYPES.TARGET };
    this.zones[this.targetZone].definition = this.zoneTypes[this.targetZone];
    
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
  }

  // Привязка событий
  bindEvents() {
    eventBus.subscribe(GameEvents.ZONES_SHUFFLED, (newTargetZone) => {
      console.log(`🎯 Zone shuffle event: ${this.targetZone} -> ${newTargetZone}`);
      this.setTargetZone(newTargetZone);
    });
  }

  // Установить целевую зону
  setTargetZone(newTargetZone) {
    if (newTargetZone < 0 || newTargetZone >= ZONE_COUNT) {
      console.warn('Invalid target zone:', newTargetZone);
      return false;
    }
    
    const oldTargetZone = this.targetZone;
    this.targetZone = newTargetZone;
    this.gameState.targetZone = newTargetZone;
    this.gameState.previousTargetZone = oldTargetZone;
    
    // Перегенерируем типы зон
    this.generateZoneTypes();
    
    console.log(`🎯 Target zone changed: ${oldTargetZone} -> ${newTargetZone}`);
    return true;
  }

  // Получить тип зоны по индексу
  getZoneType(zoneIndex) {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return ZONE_TYPES.INACTIVE;
    }
    return this.zoneTypes[zoneIndex] || ZONE_TYPES.INACTIVE;
  }

  // Получить зону по индексу
  getZone(zoneIndex) {
    if (zoneIndex < 0 || zoneIndex >= ZONE_COUNT) {
      return null;
    }
    return this.zones[zoneIndex];
  }

  // Найти зону по углу
  findZoneByAngle(angle) {
    return this.zones.find(zone => zone.contains(angle)) || null;
  }

  // Получить все зоны для рендеринга
  getZonesForRendering() {
    return this.zones.map((zone, index) => ({
      index,
      zone,
      type: this.zoneTypes[index],
      isTarget: index === this.targetZone,
      color: this.zoneTypes[index].color,
      startAngle: zone.getStartAngle(),
      endAngle: zone.getEndAngle(),
      centerAngle: zone.getCenterAngle()
    }));
  }

  // Обработать клик по зоне
  handleZoneClick(clickedZone, angle) {
    if (!clickedZone) {
      console.warn('No zone found for click');
      return null;
    }
    
    const zoneIndex = clickedZone.index;
    const zoneType = this.getZoneType(zoneIndex);
    
    console.log(`🖱️ Zone click: ${zoneIndex}, type: ${zoneType.id}`);
    
    const result = {
      zoneIndex,
      zoneType,
      angle,
      isTarget: zoneIndex === this.targetZone,
      effects: { ...zoneType.effects }
    };
    
    // Эмитируем событие клика по зоне
    eventBus.emit(GameEvents.ZONE_HIT, result);
    
    return result;
  }

  // Перемешать зоны (перенести целевую зону)
  shuffleZones() {
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
    
    this.setTargetZone(newTarget);
    
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
      }
    };
    
    this.zoneTypes.forEach(zoneType => {
      if (zoneType && stats.types[zoneType.id] !== undefined) {
        stats.types[zoneType.id]++;
      }
    });
    
    return stats;
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      targetZone: this.targetZone,
      zoneCount: ZONE_COUNT,
      zoneTypes: this.zoneTypes.map((type, index) => ({
        index,
        type: type.id,
        color: type.color,
        isTarget: index === this.targetZone
      })),
      statistics: this.getZoneStatistics()
    };
  }

  // Принудительное обновление зон
  forceUpdate() {
    console.log('🔄 Force updating zones...');
    this.generateZoneTypes();
  }

  // Сброс зон к состоянию по умолчанию
  reset() {
    console.log('🔄 Resetting zones...');
    this.targetZone = 0;
    this.gameState.targetZone = 0;
    this.gameState.previousTargetZone = 0;
    this.generateZoneTypes();
  }

  // Проверить валидность состояния зон
  validateZones() {
    let isValid = true;
    
    // Проверяем количество зон
    if (this.zones.length !== ZONE_COUNT || this.zoneTypes.length !== ZONE_COUNT) {
      console.error('Zone count mismatch');
      isValid = false;
    }
    
    // Проверяем целевую зону
    const targetZoneType = this.getZoneType(this.targetZone);
    if (targetZoneType.id !== 'target') {
      console.error('Target zone has wrong type:', targetZoneType.id);
      isValid = false;
    }
    
    // Проверяем, что есть хотя бы одна целевая зона
    const targetCount = this.zoneTypes.filter(type => type.id === 'target').length;
    if (targetCount !== 1) {
      console.error('Expected exactly 1 target zone, found:', targetCount);
      isValid = false;
    }
    
    return isValid;
  }

  // Исправить поврежденные зоны
  fixCorruptedZones() {
    console.log('🔧 Fixing corrupted zones...');
    
    if (!this.validateZones()) {
      this.reset();
      return true;
    }
    
    return false;
  }

  // Деструктор
  destroy() {
    console.log('🧹 ZoneManager cleanup started');
    
    super.destroy();
    
    console.log('✅ ZoneManager destroyed');
  }
}