// config/ZoneTypes.js - ИСПРАВЛЕННАЯ система зон с правильной логикой
export const ZONE_TYPES = {
  // Красная зона (целевая) - всегда одна
  GOLD: {
    id: 'gold',
    name: 'Target Zone',
    color: '#C41E3A', // Красный цвет
    probability: 1.0,
    effects: {
      givesGold: true,
      givesCombo: true,
      energyCost: 1
    }
  },
  
  // Серые зоны (неактивные) - по умолчанию
  INACTIVE: {
    id: 'inactive',
    name: 'Inactive Zone',
    color: '#E5E5E5', // Серый цвет
    probability: 1.0,
    effects: {
      givesGold: false,
      givesCombo: false,
      energyCost: 0
    }
  },
  
  // Зеленые зоны (энергия) - восстанавливают энергию
  ENERGY: {
    id: 'energy',
    name: 'Energy Zone',
    color: '#228B22', // Зеленый цвет
    probability: 0.25, // 25% шанс появления
    effects: {
      givesGold: false,
      givesCombo: false,
      energyRestore: 3,
      energyCost: 0
    }
  },
  
  // Золотые зоны (бонус) - дают ресурсы и энергию
  BONUS: {
    id: 'bonus',
    name: 'Bonus Zone',
    color: '#FFB347', // Золотистый цвет
    probability: 0.15, // 15% шанс появления
    effects: {
      givesGold: false,
      givesCombo: false,
      energyRestore: 2,
      energyCost: 0,
      resourceBonus: true,
      resourceAmount: 2
    }
  }
};

export class ZoneTypeManager {
  /**
   * ИСПРАВЛЕННАЯ генерация зон: 1 красная (целевая), остальные серые с шансом на спецзоны
   */
  static generateZoneTypes(zoneCount, targetZone = 0, energyPercentage = 1.0) {
    console.log(`🔧 ZoneTypeManager: Generating ${zoneCount} zones with target: ${targetZone}`);
    
    const zones = new Array(zoneCount);
    
    // ШАГ 1: Все зоны делаем серыми
    for (let i = 0; i < zoneCount; i++) {
      zones[i] = { ...ZONE_TYPES.INACTIVE };
    }
    
    // ШАГ 2: Целевую зону делаем красной
    if (targetZone >= 0 && targetZone < zoneCount) {
      zones[targetZone] = { ...ZONE_TYPES.GOLD };
    }
    
    // ШАГ 3: Добавляем специальные зоны
    const availableIndices = [];
    for (let i = 0; i < zoneCount; i++) {
      if (i !== targetZone) {
        availableIndices.push(i);
      }
    }
    
    // Определяем количество специальных зон
    const maxSpecialZones = availableIndices.length;
    const energyZoneCount = Math.min(
      maxSpecialZones,
      Math.max(1, Math.floor(maxSpecialZones * ZONE_TYPES.ENERGY.probability * energyPercentage))
    );
    const bonusZoneCount = Math.min(
      maxSpecialZones - energyZoneCount,
      Math.max(1, Math.floor(maxSpecialZones * ZONE_TYPES.BONUS.probability))
    );
    
    // Добавляем энергетические зоны
    for (let i = 0; i < energyZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      zones[zoneIndex] = { ...ZONE_TYPES.ENERGY };
    }
    
    // Добавляем бонусные зоны
    for (let i = 0; i < bonusZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      zones[zoneIndex] = { ...ZONE_TYPES.BONUS };
    }
    
    console.log(`✅ Generated zones: target=${targetZone} (gold), energy=${energyZoneCount}, bonus=${bonusZoneCount}`);
    
    return zones;
  }
  
  /**
   * Генерация адаптивных зон на основе текущей энергии
   */
  static generateAdaptiveZoneTypes(zoneCount, targetZone = 0, currentEnergyPercent = 100) {
    let energyPercentage = 1.0; // Базовый процент
    
    // Увеличиваем шанс энергетических зон при низкой энергии
    if (currentEnergyPercent <= 10) {
      energyPercentage = 3.0; // 300% при критической энергии
    } else if (currentEnergyPercent <= 30) {
      energyPercentage = 2.0; // 200% при низкой энергии
    } else if (currentEnergyPercent <= 50) {
      energyPercentage = 1.5; // 150% при средней энергии
    }
    
    return this.generateZoneTypes(zoneCount, targetZone, energyPercentage);
  }
  
  /**
   * Найти индекс целевой (красной) зоны
   */
  static findGoldZoneIndex(zones) {
    if (!Array.isArray(zones)) return 0;
    
    const goldIndex = zones.findIndex(zone => zone && zone.id === 'gold');
    return goldIndex !== -1 ? goldIndex : 0;
  }
  
  /**
   * Установить целевую зону на указанный индекс
   */
  static setTargetZone(zones, targetIndex) {
    if (!Array.isArray(zones) || targetIndex < 0 || targetIndex >= zones.length) {
      console.warn('Invalid zones array or target index');
      return zones;
    }
    
    console.log(`🎯 ZoneTypeManager: Setting target zone to ${targetIndex}`);
    
    // Заменяем текущую красную зону на серую
    for (let i = 0; i < zones.length; i++) {
      if (zones[i] && zones[i].id === 'gold') {
        zones[i] = { ...ZONE_TYPES.INACTIVE };
        break;
      }
    }
    
    // Устанавливаем красную зону на новое место
    zones[targetIndex] = { ...ZONE_TYPES.GOLD };
    
    return zones;
  }
  
  /**
   * Переместить целевую зону на новую позицию
   */
  static moveTargetZone(zones, newTargetIndex) {
    return this.setTargetZone(zones, newTargetIndex);
  }
  
  /**
   * Обновить специальные зоны (кроме целевой)
   */
  static refreshSpecialZones(zones, targetZone = 0, energyPercentage = 1.0) {
    if (!Array.isArray(zones)) return zones;
    
    console.log(`🔄 ZoneTypeManager: Refreshing special zones, target: ${targetZone}`);
    
    // Сбрасываем все зоны кроме целевой на серые
    for (let i = 0; i < zones.length; i++) {
      if (i !== targetZone) {
        zones[i] = { ...ZONE_TYPES.INACTIVE };
      }
    }
    
    // Генерируем новые специальные зоны
    const availableIndices = [];
    for (let i = 0; i < zones.length; i++) {
      if (i !== targetZone) {
        availableIndices.push(i);
      }
    }
    
    const maxSpecialZones = availableIndices.length;
    const energyZoneCount = Math.min(
      maxSpecialZones,
      Math.max(1, Math.floor(maxSpecialZones * ZONE_TYPES.ENERGY.probability * energyPercentage))
    );
    const bonusZoneCount = Math.min(
      maxSpecialZones - energyZoneCount,
      Math.max(1, Math.floor(maxSpecialZones * ZONE_TYPES.BONUS.probability))
    );
    
    // Добавляем энергетические зоны
    for (let i = 0; i < energyZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      zones[zoneIndex] = { ...ZONE_TYPES.ENERGY };
    }
    
    // Добавляем бонусные зоны
    for (let i = 0; i < bonusZoneCount && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      const zoneIndex = availableIndices.splice(randomIndex, 1)[0];
      zones[zoneIndex] = { ...ZONE_TYPES.BONUS };
    }
    
    console.log(`✅ Refreshed special zones: energy=${energyZoneCount}, bonus=${bonusZoneCount}`);
    
    return zones;
  }
  
  /**
   * Получить статистику зон
   */
  static getZoneStatistics(zones) {
    const stats = {
      total: Array.isArray(zones) ? zones.length : 0,
      gold: 0,
      inactive: 0,
      energy: 0,
      bonus: 0
    };
    
    if (Array.isArray(zones)) {
      zones.forEach(zone => {
        if (zone && stats[zone.id] !== undefined) {
          stats[zone.id]++;
        }
      });
    }
    
    return stats;
  }
  
  /**
   * Валидация массива зон
   */
  static validateZones(zones) {
    if (!Array.isArray(zones) || zones.length === 0) {
      console.warn('Invalid zones array');
      return false;
    }
    
    // Проверяем что есть ровно одна целевая зона
    const goldZones = zones.filter(zone => zone && zone.id === 'gold');
    if (goldZones.length !== 1) {
      console.warn(`Expected 1 gold zone, found ${goldZones.length}`);
      return false;
    }
    
    // Проверяем что все зоны имеют валидные типы
    const isValid = zones.every(zone => 
      zone && 
      typeof zone.id === 'string' && 
      typeof zone.color === 'string' &&
      typeof zone.effects === 'object'
    );
    
    if (!isValid) {
      console.warn('Some zones have invalid structure');
      return false;
    }
    
    return true;
  }
  
  /**
   * Создать зоны по умолчанию
   */
  static createDefaultZones(zoneCount = 8, targetZone = 0) {
    console.log(`🏗️ ZoneTypeManager: Creating default zones (count: ${zoneCount}, target: ${targetZone})`);
    
    const zones = this.generateZoneTypes(zoneCount, targetZone);
    
    if (!this.validateZones(zones)) {
      console.warn('Generated zones failed validation, creating fallback');
      // Создаем безопасные зоны как fallback
      const fallbackZones = new Array(zoneCount);
      for (let i = 0; i < zoneCount; i++) {
        fallbackZones[i] = i === targetZone ? 
          { ...ZONE_TYPES.GOLD } : 
          { ...ZONE_TYPES.INACTIVE };
      }
      return fallbackZones;
    }
    
    return zones;
  }
  
  /**
   * Клонировать массив зон
   */
  static cloneZones(zones) {
    if (!Array.isArray(zones)) return [];
    
    return zones.map(zone => zone ? { ...zone } : null);
  }
  
  /**
   * Получить цвет зоны для рендеринга
   */
  static getZoneRenderColor(zone, isTarget = false) {
    if (isTarget || (zone && zone.id === 'gold')) {
      return '#C41E3A'; // Красный для целевой
    }
    
    if (!zone || !zone.color) {
      return '#E5E5E5'; // Серый по умолчанию
    }
    
    return zone.color;
  }
  
  /**
   * Проверить может ли зона давать комбо
   */
  static canGiveCombo(zone) {
    return zone && zone.effects && zone.effects.givesCombo === true;
  }
  
  /**
   * Проверить восстанавливает ли зона энергию
   */
  static restoresEnergy(zone) {
    return zone && zone.effects && zone.effects.energyRestore > 0;
  }
  
  /**
   * Проверить тратит ли зона энергию
   */
  static consumesEnergy(zone) {
    return zone && zone.effects && zone.effects.energyCost > 0;
  }
  
  /**
   * Получить описание зоны
   */
  static getZoneDescription(zone) {
    if (!zone) return 'Unknown zone';
    
    switch (zone.id) {
      case 'gold':
        return 'Target zone - click here to gain gold and combo';
      case 'energy':
        return 'Energy zone - restores energy when clicked';
      case 'bonus':
        return 'Bonus zone - gives resources and energy';
      case 'inactive':
        return 'Inactive zone - no effect';
      default:
        return zone.name || 'Unknown zone type';
    }
  }
  
  /**
   * Получить иконку зоны
   */
  static getZoneIcon(zone) {
    if (!zone) return '❓';
    
    switch (zone.id) {
      case 'gold':
        return '🎯';
      case 'energy':
        return '⚡';
      case 'bonus':
        return '💰';
      case 'inactive':
        return '';
      default:
        return '❓';
    }
  }
  
  /**
   * Создать новый тип зоны
   */
  static createZoneType(id, name, color, effects, probability = 1.0) {
    return {
      id,
      name,
      color,
      probability,
      effects: {
        givesGold: false,
        givesCombo: false,
        energyCost: 0,
        energyRestore: 0,
        resourceBonus: false,
        resourceAmount: 0,
        ...effects
      }
    };
  }
  
  /**
   * Отладочная информация о зонах
   */
  static getDebugInfo(zones) {
    if (!Array.isArray(zones)) {
      return { error: 'Invalid zones array' };
    }
    
    const stats = this.getZoneStatistics(zones);
    const isValid = this.validateZones(zones);
    const targetIndex = this.findGoldZoneIndex(zones);
    
    return {
      stats,
      isValid,
      targetIndex,
      zoneDetails: zones.map((zone, i) => ({
        index: i,
        id: zone?.id || 'undefined',
        name: zone?.name || 'undefined',
        color: zone?.color || 'undefined',
        isTarget: i === targetIndex
      }))
    };
  }
  
  /**
   * Сравнить два массива зон
   */
  static compareZones(zones1, zones2) {
    if (!Array.isArray(zones1) || !Array.isArray(zones2)) {
      return { equal: false, reason: 'Invalid arrays' };
    }
    
    if (zones1.length !== zones2.length) {
      return { equal: false, reason: 'Different lengths' };
    }
    
    for (let i = 0; i < zones1.length; i++) {
      const zone1 = zones1[i];
      const zone2 = zones2[i];
      
      if (!zone1 || !zone2) {
        if (zone1 !== zone2) {
          return { equal: false, reason: `Null mismatch at index ${i}` };
        }
        continue;
      }
      
      if (zone1.id !== zone2.id) {
        return { equal: false, reason: `ID mismatch at index ${i}: ${zone1.id} vs ${zone2.id}` };
      }
    }
    
    return { equal: true, reason: 'Arrays are identical' };
  }
  
  /**
   * Исправить поврежденные зоны
   */
  static fixCorruptedZones(zones, zoneCount = 8, targetZone = 0) {
    console.log('🔧 ZoneTypeManager: Fixing corrupted zones...');
    
    if (!Array.isArray(zones) || zones.length !== zoneCount) {
      console.log('Creating new zones due to invalid array');
      return this.createDefaultZones(zoneCount, targetZone);
    }
    
    let needsFix = false;
    
    // Проверяем целевую зону
    const goldZones = zones.filter((zone, i) => zone && zone.id === 'gold');
    if (goldZones.length !== 1) {
      needsFix = true;
      console.log(`Found ${goldZones.length} gold zones, should be 1`);
    }
    
    // Проверяем валидность зон
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      if (!zone || !zone.id || !zone.effects) {
        needsFix = true;
        console.log(`Invalid zone at index ${i}`);
        break;
      }
    }
    
    if (needsFix) {
      console.log('Regenerating zones...');
      return this.generateZoneTypes(zoneCount, targetZone);
    }
    
    console.log('Zones are valid, no fix needed');
    return zones;
  }
}