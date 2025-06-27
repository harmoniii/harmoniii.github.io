// config/ZoneTypes.js - ИСПРАВЛЕННАЯ система зон
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
  static generateZoneTypes(zoneCount, energyPercentage = 0.25) {
    const zones = [];
    
    // Создаем все зоны как неактивные (серые)
    for (let i = 0; i < zoneCount; i++) {
      zones.push(ZONE_TYPES.INACTIVE);
    }
    
    // Определяем количество специальных зон (но не больше zoneCount - 1)
    const maxSpecialZones = Math.max(0, zoneCount - 1);
    const energyZoneCount = Math.min(
      maxSpecialZones,
      Math.floor(maxSpecialZones * ZONE_TYPES.ENERGY.probability * energyPercentage)
    );
    const bonusZoneCount = Math.min(
      maxSpecialZones - energyZoneCount,
      Math.floor(maxSpecialZones * ZONE_TYPES.BONUS.probability)
    );
    
    // Добавляем энергетические зоны
    for (let i = 0; i < energyZoneCount; i++) {
      const randomIndex = Math.floor(Math.random() * zoneCount);
      zones[randomIndex] = ZONE_TYPES.ENERGY;
    }
    
    // Добавляем бонусные зоны
    for (let i = 0; i < bonusZoneCount; i++) {
      let attempts = 0;
      let randomIndex;
      
      // Ищем свободную серую зону
      do {
        randomIndex = Math.floor(Math.random() * zoneCount);
        attempts++;
      } while (zones[randomIndex].id !== 'inactive' && attempts < 20);
      
      if (zones[randomIndex].id === 'inactive') {
        zones[randomIndex] = ZONE_TYPES.BONUS;
      }
    }
    
    return zones;
  }
  
  /**
   * Генерация адаптивных зон на основе текущей энергии
   */
  static generateAdaptiveZoneTypes(zoneCount, currentEnergyPercent = 100) {
    let energyPercentage = 0.25; // Базовый процент
    
    // Увеличиваем шанс энергетических зон при низкой энергии
    if (currentEnergyPercent <= 10) {
      energyPercentage = 0.6; // 60% при критической энергии
    } else if (currentEnergyPercent <= 30) {
      energyPercentage = 0.45; // 45% при низкой энергии
    } else if (currentEnergyPercent <= 50) {
      energyPercentage = 0.35; // 35% при средней энергии
    }
    
    return this.generateZoneTypes(zoneCount, energyPercentage);
  }
  
  /**
   * Найти индекс целевой (красной) зоны
   */
  static findGoldZoneIndex(zones) {
    const goldIndex = zones.findIndex(zone => zone.id === 'gold');
    return goldIndex !== -1 ? goldIndex : 0;
  }
  
  /**
   * Установить целевую зону на указанный индекс
   */
  static setTargetZone(zones, targetIndex) {
    if (targetIndex < 0 || targetIndex >= zones.length) {
      return zones;
    }
    
    // Заменяем текущую красную зону на серую
    for (let i = 0; i < zones.length; i++) {
      if (zones[i].id === 'gold') {
        zones[i] = ZONE_TYPES.INACTIVE;
        break;
      }
    }
    
    // Сохраняем тип зоны если это специальная зона
    const currentZoneType = zones[targetIndex];
    
    // Устанавливаем красную зону на новое место
    zones[targetIndex] = ZONE_TYPES.GOLD;
    
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
  static refreshSpecialZones(zones, energyPercentage = 0.25) {
    const targetIndex = this.findGoldZoneIndex(zones);
    
    // Сбрасываем все зоны кроме целевой на серые
    for (let i = 0; i < zones.length; i++) {
      if (i !== targetIndex) {
        zones[i] = ZONE_TYPES.INACTIVE;
      }
    }
    
    // Генерируем новые специальные зоны
    const zoneCount = zones.length;
    const maxSpecialZones = Math.max(0, zoneCount - 1);
    
    const energyZoneCount = Math.floor(maxSpecialZones * ZONE_TYPES.ENERGY.probability * energyPercentage);
    const bonusZoneCount = Math.floor(maxSpecialZones * ZONE_TYPES.BONUS.probability);
    
    // Добавляем энергетические зоны
    let addedEnergy = 0;
    while (addedEnergy < energyZoneCount) {
      const randomIndex = Math.floor(Math.random() * zoneCount);
      if (randomIndex !== targetIndex && zones[randomIndex].id === 'inactive') {
        zones[randomIndex] = ZONE_TYPES.ENERGY;
        addedEnergy++;
      }
    }
    
    // Добавляем бонусные зоны
    let addedBonus = 0;
    while (addedBonus < bonusZoneCount) {
      const randomIndex = Math.floor(Math.random() * zoneCount);
      if (randomIndex !== targetIndex && zones[randomIndex].id === 'inactive') {
        zones[randomIndex] = ZONE_TYPES.BONUS;
        addedBonus++;
      }
    }
    
    return zones;
  }
  
  /**
   * Получить статистику зон
   */
  static getZoneStatistics(zones) {
    const stats = {
      total: zones.length,
      gold: 0,
      inactive: 0,
      energy: 0,
      bonus: 0
    };
    
    zones.forEach(zone => {
      if (stats[zone.id] !== undefined) {
        stats[zone.id]++;
      }
    });
    
    return stats;
  }
  
  /**
   * Валидация массива зон
   */
  static validateZones(zones) {
    if (!Array.isArray(zones) || zones.length === 0) {
      return false;
    }
    
    // Проверяем что есть ровно одна целевая зона
    const goldZones = zones.filter(zone => zone.id === 'gold');
    if (goldZones.length !== 1) {
      return false;
    }
    
    // Проверяем что все зоны имеют валидные типы
    return zones.every(zone => 
      zone && 
      typeof zone.id === 'string' && 
      typeof zone.color === 'string' &&
      typeof zone.effects === 'object'
    );
  }
  
  /**
   * Создать зоны по умолчанию
   */
  static createDefaultZones(zoneCount = 8) {
    const zones = this.generateZoneTypes(zoneCount);
    
    // Гарантируем что первая зона - целевая
    zones[0] = ZONE_TYPES.GOLD;
    
    return zones;
  }
  
  /**
   * Клонировать массив зон
   */
  static cloneZones(zones) {
    return zones.map(zone => ({...zone}));
  }
  
  /**
   * Перемешать массив (утилита)
   */
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  /**
   * Получить цвет зоны для рендеринга
   */
  static getZoneRenderColor(zone, isTarget = false) {
    if (isTarget || zone.id === 'gold') {
      return '#C41E3A'; // Красный для целевой
    }
    
    return zone.color || '#E5E5E5';
  }
  
  /**
   * Проверить может ли зона давать комбо
   */
  static canGiveCombo(zone) {
    return zone.effects && zone.effects.givesCombo === true;
  }
  
  /**
   * Проверить восстанавливает ли зона энергию
   */
  static restoresEnergy(zone) {
    return zone.effects && zone.effects.energyRestore > 0;
  }
  
  /**
   * Проверить тратит ли зона энергию
   */
  static consumesEnergy(zone) {
    return zone.effects && zone.effects.energyCost > 0;
  }
}