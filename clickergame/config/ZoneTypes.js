// config/ZoneTypes.js - ИСПРАВЛЕННАЯ система зон с улучшенными цветами и логикой
export const ZONE_TYPES = {
  GOLD: {
    id: 'gold',
    name: 'Gold Zone',
    color: '#C41E3A', // Более приятный красный
    probability: 1.0, // Всегда есть одна золотая зона
    effects: {
      givesGold: true,
      givesCombo: true,
      energyCost: 1
    },
    description: 'Gives gold and builds combo. Always present on wheel.'
  },
  ENERGY: {
    id: 'energy',
    name: 'Energy Zone',
    color: '#228B22', // Более приятный зеленый
    probability: 0.30, // 30% шанс появления
    effects: {
      givesGold: false,
      givesCombo: false,
      energyRestore: 3, // Увеличено восстановление
      energyCost: 0
    },
    description: 'Restores energy, no gold or combo'
  },
  BONUS: {
    id: 'bonus',
    name: 'Bonus Zone',
    color: '#FFB347', // Приятный персиковый/золотистый
    probability: 0.15, // 15% шанс появления
    effects: {
      givesGold: false,
      givesCombo: false,
      energyRestore: 2,
      energyCost: 0,
      resourceBonus: true, // Дает случайные ресурсы
      resourceAmount: 2
    },
    description: 'Gives random resources and restores energy'
  }
};

export class ZoneTypeManager {
  /**
   * Генерирует массив типов зон для игрового колеса
   * @param {number} zoneCount - Общее количество зон
   * @param {number} energyPercentage - Процент энергетических зон (0.0 - 1.0)
   * @returns {Array} Массив типов зон
   */
  static generateZoneTypes(zoneCount, energyPercentage = 0.25) {
    const zones = [];
    
    // ИСПРАВЛЕНИЕ: Всегда добавляем одну красную (золотую) зону
    zones.push(ZONE_TYPES.GOLD);
    
    // Оставшиеся зоны распределяем между энергетическими и бонусными
    const remainingZones = zoneCount - 1;
    
    // Рассчитываем количество зон каждого типа на основе вероятностей
    const energyZoneCount = Math.floor(remainingZones * ZONE_TYPES.ENERGY.probability * energyPercentage);
    const bonusZoneCount = Math.floor(remainingZones * ZONE_TYPES.BONUS.probability);
    const goldZoneCount = remainingZones - energyZoneCount - bonusZoneCount;
    
    // Добавляем дополнительные золотые зоны
    for (let i = 0; i < goldZoneCount; i++) {
      zones.push(ZONE_TYPES.GOLD);
    }
    
    // Добавляем энергетические зоны
    for (let i = 0; i < energyZoneCount; i++) {
      zones.push(ZONE_TYPES.ENERGY);
    }
    
    // Добавляем бонусные зоны
    for (let i = 0; i < bonusZoneCount; i++) {
      zones.push(ZONE_TYPES.BONUS);
    }
    
    // Если зон недостаточно, добавляем золотые
    while (zones.length < zoneCount) {
      zones.push(ZONE_TYPES.GOLD);
    }
    
    // Перемешиваем зоны для случайного распределения
    return this.shuffleArray(zones);
  }
  
  /**
   * Перемешивает массив зон
   * @param {Array} array - Массив для перемешивания
   * @returns {Array} Перемешанный массив
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
   * Получает тип зоны по индексу
   * @param {Array} zones - Массив типов зон
   * @param {number} index - Индекс зоны
   * @returns {Object} Тип зоны
   */
  static getZoneTypeByIndex(zones, index) {
    return zones[index] || ZONE_TYPES.GOLD;
  }
  
  /**
   * Находит индекс первой золотой зоны (для целевой зоны)
   * @param {Array} zones - Массив типов зон
   * @returns {number} Индекс золотой зоны
   */
  static findGoldZoneIndex(zones) {
    const goldIndex = zones.findIndex(zone => zone.id === 'gold');
    return goldIndex !== -1 ? goldIndex : 0;
  }
  
  /**
   * Получает распределение зон по типам
   * @param {Array} zones - Массив типов зон
   * @returns {Object} Объект с количеством зон каждого типа
   */
  static getZoneDistribution(zones) {
    const distribution = {
      gold: 0,
      energy: 0, 
      bonus: 0
    };
    
    zones.forEach(zone => {
      if (distribution[zone.id] !== undefined) {
        distribution[zone.id]++;
      }
    });
    
    return distribution;
  }
  
  /**
   * Создает адаптивное распределение зон на основе текущего состояния энергии
   * @param {number} zoneCount - Количество зон
   * @param {number} currentEnergyPercent - Текущий процент энергии (0-100)
   * @returns {Array} Массив типов зон
   */
  static generateAdaptiveZoneTypes(zoneCount, currentEnergyPercent = 100) {
    let energyPercentage = 0.25; // Базовый процент энергетических зон
    
    // Увеличиваем процент энергетических зон при низкой энергии
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
   * Проверяет, является ли зона энергетической
   * @param {Object} zoneType - Тип зоны
   * @returns {boolean} true если зона восстанавливает энергию
   */
  static isEnergyZone(zoneType) {
    return zoneType && zoneType.effects && zoneType.effects.energyRestore > 0;
  }
  
  /**
   * Проверяет, является ли зона золотой (дает золото)
   * @param {Object} zoneType - Тип зоны
   * @returns {boolean} true если зона дает золото
   */
  static isGoldZone(zoneType) {
    return zoneType && zoneType.effects && zoneType.effects.givesGold === true;
  }
  
  /**
   * Проверяет, тратит ли зона энергию
   * @param {Object} zoneType - Тип зоны
   * @returns {boolean} true если зона тратит энергию
   */
  static consumesEnergy(zoneType) {
    return zoneType && zoneType.effects && zoneType.effects.energyCost > 0;
  }
  
  /**
   * Получает стоимость клика по зоне в энергии
   * @param {Object} zoneType - Тип зоны
   * @returns {number} Стоимость в энергии
   */
  static getEnergyCost(zoneType) {
    return (zoneType && zoneType.effects && zoneType.effects.energyCost) || 0;
  }
  
  /**
   * Получает количество восстанавливаемой энергии
   * @param {Object} zoneType - Тип зоны
   * @returns {number} Количество восстанавливаемой энергии
   */
  static getEnergyRestore(zoneType) {
    return (zoneType && zoneType.effects && zoneType.effects.energyRestore) || 0;
  }
  
  /**
   * Получает количество ресурсов от бонусной зоны
   * @param {Object} zoneType - Тип зоны
   * @returns {number} Количество ресурсов
   */
  static getResourceAmount(zoneType) {
    return (zoneType && zoneType.effects && zoneType.effects.resourceAmount) || 0;
  }
  
  /**
   * Создает описание эффектов зоны для UI
   * @param {Object} zoneType - Тип зоны
   * @returns {string} Описание эффектов
   */
  static getEffectDescription(zoneType) {
    if (!zoneType || !zoneType.effects) return 'No effects';
    
    const effects = [];
    const e = zoneType.effects;
    
    if (e.givesGold) {
      effects.push('Gold & Combo');
    }
    
    if (e.energyRestore > 0) {
      effects.push(`+${e.energyRestore} Energy`);
    }
    
    if (e.resourceBonus) {
      effects.push(`+${e.resourceAmount} Random Resource`);
    }
    
    if (e.energyCost > 0) {
      effects.push(`-${e.energyCost} Energy`);
    }
    
    return effects.length > 0 ? effects.join(', ') : 'No effects';
  }
  
  /**
   * Получает все возможные типы зон
   * @returns {Array} Массив всех типов зон
   */
  static getAllZoneTypes() {
    return Object.values(ZONE_TYPES);
  }
  
  /**
   * Получает тип зоны по ID
   * @param {string} zoneId - ID типа зоны
   * @returns {Object|null} Тип зоны или null
   */
  static getZoneTypeById(zoneId) {
    return Object.values(ZONE_TYPES).find(type => type.id === zoneId) || null;
  }
  
  /**
   * Валидирует массив типов зон
   * @param {Array} zones - Массив типов зон
   * @returns {boolean} true если массив валиден
   */
  static validateZoneTypes(zones) {
    if (!Array.isArray(zones)) return false;
    
    return zones.every(zone => {
      return zone && 
             typeof zone.id === 'string' && 
             typeof zone.effects === 'object' &&
             zone.effects !== null;
    });
  }
  
  /**
   * Получает статистику типов зон
   * @param {Array} zones - Массив типов зон
   * @returns {Object} Статистика
   */
  static getZoneStatistics(zones) {
    if (!Array.isArray(zones)) {
      return { total: 0, distribution: {}, percentages: {} };
    }
    
    const distribution = this.getZoneDistribution(zones);
    const total = zones.length;
    const percentages = {};
    
    Object.entries(distribution).forEach(([type, count]) => {
      percentages[type] = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
    });
    
    return {
      total,
      distribution,
      percentages,
      energyZones: distribution.energy || 0,
      goldZones: distribution.gold || 0,
      bonusZones: distribution.bonus || 0,
      totalEnergyRestore: (distribution.energy || 0) * ZONE_TYPES.ENERGY.effects.energyRestore +
                         (distribution.bonus || 0) * ZONE_TYPES.BONUS.effects.energyRestore
    };
  }
}