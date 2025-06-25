// zones.js - Улучшенная версия с лучшей обработкой углов
export class Zone {
  constructor(def, index, total) {
    this.def = def;
    this.index = index;
    this.total = total;
    
    // Предварительно вычисляем углы для производительности
    this.stepSize = 2 * Math.PI / this.total;
    this.startAngle = this.stepSize * this.index;
    this.endAngle = this.startAngle + this.stepSize;
    this.centerAngle = this.startAngle + (this.stepSize / 2);
  }
  
  contains(angle) {
    // ИСПРАВЛЕНИЕ 12: Улучшенная нормализация угла
    const normalizedAngle = this.normalizeAngle(angle);
    const normalizedStart = this.normalizeAngle(this.startAngle);
    const normalizedEnd = this.normalizeAngle(this.endAngle);
    
    // Обработка граничного случая (переход через 0/2π)
    if (normalizedStart <= normalizedEnd) {
      return normalizedAngle >= normalizedStart && normalizedAngle < normalizedEnd;
    } else {
      // Случай когда зона пересекает границу 0/2π
      return normalizedAngle >= normalizedStart || normalizedAngle < normalizedEnd;
    }
  }
  
  // ИСПРАВЛЕНИЕ 12: Улучшенная нормализация угла
  normalizeAngle(angle) {
    if (typeof angle !== 'number' || isNaN(angle)) {
      return 0;
    }
    
    const twoPi = 2 * Math.PI;
    let normalized = angle % twoPi;
    
    if (normalized < 0) {
      normalized += twoPi;
    }
    
    return normalized;
  }
  
  // Получить начальный угол зоны
  getStartAngle() {
    return this.startAngle;
  }
  
  // Получить конечный угол зоны  
  getEndAngle() {
    return this.endAngle;
  }
  
  // Получить центральный угол зоны
  getCenterAngle() {
    return this.centerAngle;
  }
  
  // Получить размер зоны в радианах
  getSize() {
    return this.stepSize;
  }
  
  // ИСПРАВЛЕНИЕ 12: Проверить, находится ли угол в центральной части зоны
  isInCenter(angle, tolerance = 0.3) {
    const normalizedAngle = this.normalizeAngle(angle);
    const normalizedCenter = this.normalizeAngle(this.centerAngle);
    const halfSize = this.stepSize / 2;
    const centerTolerance = halfSize * tolerance;
    
    const minCenterAngle = this.normalizeAngle(normalizedCenter - centerTolerance);
    const maxCenterAngle = this.normalizeAngle(normalizedCenter + centerTolerance);
    
    if (minCenterAngle <= maxCenterAngle) {
      return normalizedAngle >= minCenterAngle && normalizedAngle <= maxCenterAngle;
    } else {
      return normalizedAngle >= minCenterAngle || normalizedAngle <= maxCenterAngle;
    }
  }
  
  // ИСПРАВЛЕНИЕ 12: Получить случайный угол внутри зоны
  getRandomAngle() {
    return this.startAngle + (Math.random() * this.stepSize);
  }
  
  // ИСПРАВЛЕНИЕ 12: Получить угол с учетом предпочтения к центру
  getTargetAngle(centerBias = 0.7) {
    if (Math.random() < centerBias) {
      // Клик ближе к центру зоны
      const centerOffset = (Math.random() - 0.5) * this.stepSize * 0.3;
      return this.centerAngle + centerOffset;
    } else {
      // Случайный клик в любом месте зоны
      return this.getRandomAngle();
    }
  }
  
  // Получить расстояние от угла до центра зоны
  getDistanceToCenter(angle) {
    const normalizedAngle = this.normalizeAngle(angle);
    const normalizedCenter = this.normalizeAngle(this.centerAngle);
    
    let distance = Math.abs(normalizedAngle - normalizedCenter);
    
    // Учитываем кольцевую природу углов
    if (distance > Math.PI) {
      distance = 2 * Math.PI - distance;
    }
    
    return distance;
  }
  
  // Проверить, является ли зона соседней с другой зоной
  isAdjacentTo(otherZone) {
    if (!otherZone || otherZone.total !== this.total) {
      return false;
    }
    
    const indexDiff = Math.abs(this.index - otherZone.index);
    return indexDiff === 1 || indexDiff === (this.total - 1);
  }
  
  // Получить соседние зоны (индексы)
  getAdjacentZoneIndices() {
    const prevIndex = (this.index - 1 + this.total) % this.total;
    const nextIndex = (this.index + 1) % this.total;
    return [prevIndex, nextIndex];
  }
  
  // Преобразовать в строку для отладки
  toString() {
    return `Zone(${this.index}/${this.total}, ${this.startAngle.toFixed(3)}-${this.endAngle.toFixed(3)})`;
  }
}