// utils/Zone.js - Класс зоны для игрового колеса
export class Zone {
    constructor(definition, index, totalZones) {
      this.definition = definition;
      this.index = index;
      this.totalZones = totalZones;
      
      // Предварительно вычисляем углы для производительности
      this.stepSize = (2 * Math.PI) / this.totalZones;
      this.startAngle = this.stepSize * this.index;
      this.endAngle = this.startAngle + this.stepSize;
      this.centerAngle = this.startAngle + (this.stepSize / 2);
    }
    
    /**
     * Проверить, содержит ли зона данный угол
     * @param {number} angle - Угол в радианах
     * @returns {boolean}
     */
    contains(angle) {
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
    
    /**
     * Нормализация угла к диапазону [0, 2π)
     * @param {number} angle - Угол в радианах
     * @returns {number}
     */
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
    
    /**
     * Получить начальный угол зоны
     * @returns {number}
     */
    getStartAngle() {
      return this.startAngle;
    }
    
    /**
     * Получить конечный угол зоны
     * @returns {number}
     */
    getEndAngle() {
      return this.endAngle;
    }
    
    /**
     * Получить центральный угол зоны
     * @returns {number}
     */
    getCenterAngle() {
      return this.centerAngle;
    }
    
    /**
     * Получить размер зоны в радианах
     * @returns {number}
     */
    getSize() {
      return this.stepSize;
    }
    
    /**
     * Проверить, находится ли угол в центральной части зоны
     * @param {number} angle - Угол в радианах
     * @param {number} tolerance - Допуск (0.0 - 1.0)
     * @returns {boolean}
     */
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
    
    /**
     * Получить случайный угол внутри зоны
     * @returns {number}
     */
    getRandomAngle() {
      return this.startAngle + (Math.random() * this.stepSize);
    }
    
    /**
     * Получить угол с предпочтением к центру зоны
     * @param {number} centerBias - Вероятность клика ближе к центру (0.0 - 1.0)
     * @returns {number}
     */
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
    
    /**
     * Получить расстояние от угла до центра зоны
     * @param {number} angle - Угол в радианах
     * @returns {number}
     */
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
    
    /**
     * Проверить, является ли зона соседней с другой зоной
     * @param {Zone} otherZone - Другая зона
     * @returns {boolean}
     */
    isAdjacentTo(otherZone) {
      if (!otherZone || otherZone.totalZones !== this.totalZones) {
        return false;
      }
      
      const indexDiff = Math.abs(this.index - otherZone.index);
      return indexDiff === 1 || indexDiff === (this.totalZones - 1);
    }
    
    /**
     * Получить индексы соседних зон
     * @returns {number[]}
     */
    getAdjacentZoneIndices() {
      const prevIndex = (this.index - 1 + this.totalZones) % this.totalZones;
      const nextIndex = (this.index + 1) % this.totalZones;
      return [prevIndex, nextIndex];
    }
    
    /**
     * Получить процент попадания в зону для данного угла
     * @param {number} angle - Угол в радианах
     * @returns {number} Процент (0.0 - 1.0), где 1.0 = точно в центре
     */
    getAccuracy(angle) {
      if (!this.contains(angle)) {
        return 0;
      }
      
      const distance = this.getDistanceToCenter(angle);
      const maxDistance = this.stepSize / 2;
      
      // Линейная интерполяция: чем ближе к центру, тем выше точность
      return Math.max(0, 1 - (distance / maxDistance));
    }
    
    /**
     * Получить качество попадания (оценку)
     * @param {number} angle - Угол в радианах
     * @returns {string} 'perfect', 'good', 'ok', 'miss'
     */
    getHitQuality(angle) {
      if (!this.contains(angle)) {
        return 'miss';
      }
      
      const accuracy = this.getAccuracy(angle);
      
      if (accuracy >= 0.9) return 'perfect';
      if (accuracy >= 0.7) return 'good';
      if (accuracy >= 0.3) return 'ok';
      return 'poor';
    }
    
    /**
     * Получить бонусный множитель основанный на точности
     * @param {number} angle - Угол в радианах
     * @returns {number} Множитель (1.0 - 2.0)
     */
    getAccuracyBonus(angle) {
      const accuracy = this.getAccuracy(angle);
      return 1 + accuracy; // От 1.0 до 2.0
    }
    
    /**
     * Проверить, находится ли угол в "золотой зоне" (очень точно в центре)
     * @param {number} angle - Угол в радианах
     * @returns {boolean}
     */
    isGoldenHit(angle) {
      return this.getAccuracy(angle) >= 0.95;
    }
    
    /**
     * Получить визуальную информацию о зоне для рендеринга
     * @returns {Object}
     */
    getRenderInfo() {
      return {
        index: this.index,
        startAngle: this.startAngle,
        endAngle: this.endAngle,
        centerAngle: this.centerAngle,
        size: this.stepSize,
        definition: this.definition
      };
    }
    
    /**
     * Получить отладочную информацию
     * @returns {Object}
     */
    getDebugInfo() {
      return {
        index: this.index,
        totalZones: this.totalZones,
        angles: {
          start: this.startAngle,
          end: this.endAngle,
          center: this.centerAngle,
          size: this.stepSize
        },
        boundaries: {
          startDegrees: (this.startAngle * 180 / Math.PI).toFixed(1),
          endDegrees: (this.endAngle * 180 / Math.PI).toFixed(1),
          centerDegrees: (this.centerAngle * 180 / Math.PI).toFixed(1)
        },
        definition: this.definition
      };
    }
    
    /**
     * Клонировать зону с новым индексом
     * @param {number} newIndex - Новый индекс
     * @returns {Zone}
     */
    clone(newIndex = this.index) {
      return new Zone(this.definition, newIndex, this.totalZones);
    }
    
    /**
     * Сравнить с другой зоной
     * @param {Zone} otherZone - Другая зона
     * @returns {boolean}
     */
    equals(otherZone) {
      return otherZone && 
             this.index === otherZone.index && 
             this.totalZones === otherZone.totalZones;
    }
    
    /**
     * Преобразовать в строку для отладки
     * @returns {string}
     */
    toString() {
      const startDeg = (this.startAngle * 180 / Math.PI).toFixed(1);
      const endDeg = (this.endAngle * 180 / Math.PI).toFixed(1);
      return `Zone(${this.index}/${this.totalZones}, ${startDeg}°-${endDeg}°)`;
    }
    
    /**
     * Преобразовать в JSON
     * @returns {Object}
     */
    toJSON() {
      return {
        index: this.index,
        totalZones: this.totalZones,
        definition: this.definition,
        angles: {
          start: this.startAngle,
          end: this.endAngle,
          center: this.centerAngle,
          size: this.stepSize
        }
      };
    }
    
    /**
     * Создать зону из JSON
     * @param {Object} json - JSON объект
     * @returns {Zone}
     */
    static fromJSON(json) {
      return new Zone(json.definition, json.index, json.totalZones);
    }
    
    /**
     * Создать массив зон
     * @param {number} count - Количество зон
     * @param {Object} definition - Определение зоны по умолчанию
     * @returns {Zone[]}
     */
    static createZones(count, definition = { type: 'default' }) {
      return Array.from({ length: count }, (_, i) => 
        new Zone(definition, i, count)
      );
    }
    
    /**
     * Найти зону по углу в массиве зон
     * @param {Zone[]} zones - Массив зон
     * @param {number} angle - Угол в радианах
     * @returns {Zone|null}
     */
    static findZoneByAngle(zones, angle) {
      return zones.find(zone => zone.contains(angle)) || null;
    }
    
    /**
     * Получить статистику массива зон
     * @param {Zone[]} zones - Массив зон
     * @returns {Object}
     */
    static getZoneStatistics(zones) {
      if (!zones || zones.length === 0) {
        return { count: 0, totalAngle: 0, averageSize: 0 };
      }
      
      const totalAngle = 2 * Math.PI;
      const averageSize = totalAngle / zones.length;
      
      return {
        count: zones.length,
        totalAngle,
        averageSize,
        sizeInDegrees: averageSize * 180 / Math.PI,
        zones: zones.map(zone => zone.getDebugInfo())
      };
    }
  }