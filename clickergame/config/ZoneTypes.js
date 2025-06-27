// config/ZoneTypes.js - Упрощенная система зон
export const ZONE_TYPES = {
  GOLD: {
    id: 'gold',
    name: 'Gold Zone',
    color: '#C41E3A',
    probability: 1.0,
    effects: {
      givesGold: true,
      givesCombo: true,
      energyCost: 1
    }
  },
  ENERGY: {
    id: 'energy',
    name: 'Energy Zone',
    color: '#228B22',
    probability: 0.30,
    effects: {
      givesGold: false,
      givesCombo: false,
      energyRestore: 3,
      energyCost: 0
    }
  },
  BONUS: {
    id: 'bonus',
    name: 'Bonus Zone',
    color: '#FFB347',
    probability: 0.15,
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
  static generateZoneTypes(zoneCount, energyPercentage = 0.25) {
    const zones = [];
    
    // Всегда добавляем одну золотую зону
    zones.push(ZONE_TYPES.GOLD);
    
    // Распределяем оставшиеся зоны
    const remainingZones = zoneCount - 1;
    const energyZoneCount = Math.floor(remainingZones * ZONE_TYPES.ENERGY.probability * energyPercentage);
    const bonusZoneCount = Math.floor(remainingZones * ZONE_TYPES.BONUS.probability);
    const goldZoneCount = remainingZones - energyZoneCount - bonusZoneCount;
    
    // Добавляем зоны
    for (let i = 0; i < goldZoneCount; i++) zones.push(ZONE_TYPES.GOLD);
    for (let i = 0; i < energyZoneCount; i++) zones.push(ZONE_TYPES.ENERGY);
    for (let i = 0; i < bonusZoneCount; i++) zones.push(ZONE_TYPES.BONUS);
    
    // Заполняем оставшиеся золотыми зонами
    while (zones.length < zoneCount) {
      zones.push(ZONE_TYPES.GOLD);
    }
    
    return this.shuffleArray(zones);
  }
  
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
  
  static generateAdaptiveZoneTypes(zoneCount, currentEnergyPercent = 100) {
    let energyPercentage = 0.25;
    
    if (currentEnergyPercent <= 10) energyPercentage = 0.6;
    else if (currentEnergyPercent <= 30) energyPercentage = 0.45;
    else if (currentEnergyPercent <= 50) energyPercentage = 0.35;
    
    return this.generateZoneTypes(zoneCount, energyPercentage);
  }
  
  static findGoldZoneIndex(zones) {
    const goldIndex = zones.findIndex(zone => zone.id === 'gold');
    return goldIndex !== -1 ? goldIndex : 0;
  }
  
  // Убираем все избыточные функции проверки и статистики
}