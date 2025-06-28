// managers/ZoneManager.js - Упрощенная версия с единственным источником истины
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { ZONE_COUNT } from '../config/ResourceConfig.js';

// Простые типы зон
const ZONE_TYPES = {
  TARGET: { id: 'target', color: '#C41E3A', icon: '🎯' },
  ENERGY: { id: 'energy', color: '#228B22', icon: '⚡' },
  BONUS: { id: 'bonus', color: '#FFB347', icon: '💰' },
  INACTIVE: { id: 'inactive', color: '#E5E5E5', icon: '' }
};

export class ZoneManager extends CleanupMixin {
  constructor() {
    super();
    
    this.zones = [];
    this.targetZone = 0;
    this.isReady = false;
    
    this.initializeZones();
    console.log('🎯 ZoneManager: Simple architecture initialized');
  }

  // Синхронная инициализация зон
  initializeZones() {
    console.log('🎯 Creating zones synchronously...');
    
    // Создаем 8 зон
    const stepAngle = (2 * Math.PI) / ZONE_COUNT;
    
    for (let i = 0; i < ZONE_COUNT; i++) {
      this.zones[i] = {
        index: i,
        startAngle: i * stepAngle,
        endAngle: (i + 1) * stepAngle,
        centerAngle: (i + 0.5) * stepAngle,
        type: ZONE_TYPES.INACTIVE,
        isTarget: false
      };
    }
    
    // Устанавливаем типы зон
    this.generateZoneTypes();
    
    this.isReady = true;
    console.log(`✅ ${ZONE_COUNT} zones created and ready`);
  }

  // Генерация типов зон
  generateZoneTypes() {
    // Сбрасываем все зоны на неактивные
    this.zones.forEach(zone => {
      zone.type = ZONE_TYPES.INACTIVE;
      zone.isTarget = false;
    });
    
    // Устанавливаем целевую зону
    this.zones[this.targetZone].type = ZONE_TYPES.TARGET;
    this.zones[this.targetZone].isTarget = true;
    
    // Добавляем 1-2 энергетические зоны
    this.addSpecialZones(ZONE_TYPES.ENERGY, 2);
    
    // Добавляем 1 бонусную зону
    this.addSpecialZones(ZONE_TYPES.BONUS, 1);
  }

  // Добавить специальные зоны
  addSpecialZones(zoneType, count) {
    const availableIndices = [];
    
    // Собираем доступные индексы (не целевые)
    for (let i = 0; i < ZONE_COUNT; i++) {
      if (i !== this.targetZone && this.zones[i].type === ZONE_TYPES.INACTIVE) {
        availableIndices.push(i);
      }
    }
    
    // Добавляем зоны случайно
    for (let i = 0; i < count && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      this.zones[zoneIndex].type = zoneType;
    }
  }

  // Установить новую целевую зону
  setTargetZone(newTargetIndex) {
    if (newTargetIndex < 0 || newTargetIndex >= ZONE_COUNT) {
      console.warn(`Invalid target zone: ${newTargetIndex}`);
      return false;
    }
    
    if (this.targetZone === newTargetIndex) {
      return true; // Уже установлена
    }
    
    console.log(`🎯 Moving target: ${this.targetZone} -> ${newTargetIndex}`);
    
    this.targetZone = newTargetIndex;
    this.generateZoneTypes();
    
    // Уведомляем об обновлении
    eventBus.emit(GameEvents.ZONES_UPDATED, {
      targetZone: this.targetZone,
      zones: this.getZonesForRendering()
    });
    
    return true;
  }

  // Перемешать зоны (выбрать новую цель)
  shuffleZones() {
    let newTarget;
    let attempts = 0;
    
    do {
      newTarget = Math.floor(Math.random() * ZONE_COUNT);
      attempts++;
    } while (newTarget === this.targetZone && attempts < 10);
    
    return this.setTargetZone(newTarget);
  }

  // Найти зону по углу
  findZoneByAngle(angle) {
    const normalizedAngle = this.normalizeAngle(angle);
    
    for (const zone of this.zones) {
      if (this.angleInZone(normalizedAngle, zone)) {
        return zone;
      }
    }
    
    return null;
  }

  // Проверить, находится ли угол в зоне
  angleInZone(angle, zone) {
    const { startAngle, endAngle } = zone;
    
    if (startAngle <= endAngle) {
      return angle >= startAngle && angle < endAngle;
    } else {
      // Зона пересекает границу 0/2π
      return angle >= startAngle || angle < endAngle;
    }
  }

  // Нормализовать угол
  normalizeAngle(angle) {
    const twoPi = 2 * Math.PI;
    let normalized = angle % twoPi;
    if (normalized < 0) normalized += twoPi;
    return normalized;
  }

  // Получить зоны для рендеринга
  getZonesForRendering() {
    if (!this.isReady) {
      console.warn('🎯 ZoneManager not ready for rendering');
      return [];
    }
    
    return this.zones.map(zone => ({
      index: zone.index,
      startAngle: zone.startAngle,
      endAngle: zone.endAngle,
      centerAngle: zone.centerAngle,
      type: zone.type,
      isTarget: zone.isTarget,
      color: zone.type.color,
      icon: zone.type.icon
    }));
  }

  // Обработать клик по зоне
  handleZoneClick(angle) {
    const clickedZone = this.findZoneByAngle(angle);
    
    if (!clickedZone) {
      return null;
    }
    
    // Вычисляем точность
    const accuracy = this.calculateAccuracy(angle, clickedZone);
    
    return {
      zoneIndex: clickedZone.index,
      zoneType: clickedZone.type,
      isTarget: clickedZone.isTarget,
      angle: angle,
      accuracy: accuracy,
      effects: this.getZoneEffects(clickedZone)
    };
  }

  // Вычислить точность клика
  calculateAccuracy(angle, zone) {
    const distance = Math.abs(angle - zone.centerAngle);
    const normalizedDistance = Math.min(distance, 2 * Math.PI - distance);
    const maxDistance = (zone.endAngle - zone.startAngle) / 2;
    
    return Math.max(0, 1 - (normalizedDistance / maxDistance));
  }

  // Получить эффекты зоны
  getZoneEffects(zone) {
    switch (zone.type.id) {
      case 'target':
        return { givesGold: true, givesCombo: true, energyCost: 1 };
      case 'energy':
        return { energyRestore: 3, energyCost: 0 };
      case 'bonus':
        return { energyRestore: 2, resourceBonus: true, energyCost: 0 };
      default:
        return { energyCost: 0 };
    }
  }

  // Получить текущую целевую зону
  getTargetZone() {
    return this.targetZone;
  }

  // Получить зону по индексу
  getZone(index) {
    return this.zones[index] || null;
  }

  // Проверить готовность
  isManagerReady() {
    return this.isReady && this.zones.length === ZONE_COUNT;
  }

  // Получить статистику
  getStats() {
    return {
      isReady: this.isReady,
      zoneCount: this.zones.length,
      targetZone: this.targetZone,
      zoneTypes: this.zones.reduce((acc, zone) => {
        acc[zone.type.id] = (acc[zone.type.id] || 0) + 1;
        return acc;
      }, {})
    };
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      isReady: this.isReady,
      targetZone: this.targetZone,
      zones: this.zones.map(zone => ({
        index: zone.index,
        type: zone.type.id,
        isTarget: zone.isTarget,
        angles: {
          start: (zone.startAngle * 180 / Math.PI).toFixed(1) + '°',
          end: (zone.endAngle * 180 / Math.PI).toFixed(1) + '°',
          center: (zone.centerAngle * 180 / Math.PI).toFixed(1) + '°'
        }
      }))
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 ZoneManager cleanup');
    this.isReady = false;
    this.zones = [];
    super.destroy();
  }
}