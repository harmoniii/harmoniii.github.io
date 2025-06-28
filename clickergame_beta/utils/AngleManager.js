// utils/AngleManager.js - Единый центр управления углами
export class AngleManager {
  /**
   * Нормализовать угол к диапазону [0, 2π)
   * @param {number} angle - Угол в радианах
   * @returns {number} Нормализованный угол
   */
  static normalize(angle) {
    if (typeof angle !== 'number' || isNaN(angle)) {
      console.warn('AngleManager: Invalid angle input:', angle);
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
   * Конвертировать угол в градусы
   * @param {number} radians - Угол в радианах
   * @returns {number} Угол в градусах
   */
  static toDegrees(radians) {
    return (radians * 180) / Math.PI;
  }

  /**
   * Конвертировать угол в радианы
   * @param {number} degrees - Угол в градусах
   * @returns {number} Угол в радианах
   */
  static toRadians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Найти зону по углу
   * @param {number} angle - Угол в радианах
   * @param {Zone[]} zones - Массив зон
   * @returns {Zone|null} Найденная зона или null
   */
  static findZoneByAngle(angle, zones) {
    if (!Array.isArray(zones) || zones.length === 0) {
      console.warn('AngleManager: Invalid zones array');
      return null;
    }

    const normalizedAngle = this.normalize(angle);
    
    for (const zone of zones) {
      if (zone && typeof zone.contains === 'function' && zone.contains(normalizedAngle)) {
        return zone;
      }
    }
    
    return null;
  }

  /**
   * Вычислить угол клика из события мыши
   * @param {MouseEvent|TouchEvent} event - Событие клика
   * @param {HTMLCanvasElement} canvas - Canvas элемент
   * @param {number} currentRotation - Текущий угол поворота колеса
   * @returns {number} Угол клика в радианах
   */
  static getClickAngle(event, canvas, currentRotation = 0) {
    if (!event || !canvas) {
      console.warn('AngleManager: Invalid event or canvas');
      return 0;
    }

    const rect = canvas.getBoundingClientRect();
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    let clientX, clientY;
    
    // Обработка touch событий
    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }
    
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    
    // Вычисляем угол относительно центра
    const rawAngle = Math.atan2(y, x);
    
    // Учитываем поворот колеса
    const adjustedAngle = rawAngle - currentRotation;
    
    return this.normalize(adjustedAngle);
  }

  /**
   * Вычислить расстояние между двумя углами
   * @param {number} angle1 - Первый угол в радианах
   * @param {number} angle2 - Второй угол в радианах
   * @returns {number} Минимальное расстояние между углами
   */
  static getAngleDistance(angle1, angle2) {
    const norm1 = this.normalize(angle1);
    const norm2 = this.normalize(angle2);
    
    let distance = Math.abs(norm1 - norm2);
    
    // Учитываем кольцевую природу углов
    if (distance > Math.PI) {
      distance = 2 * Math.PI - distance;
    }
    
    return distance;
  }

  /**
   * Проверить, находится ли угол в заданном диапазоне
   * @param {number} angle - Проверяемый угол
   * @param {number} startAngle - Начальный угол диапазона
   * @param {number} endAngle - Конечный угол диапазона
   * @returns {boolean} true если угол в диапазоне
   */
  static isAngleInRange(angle, startAngle, endAngle) {
    const normAngle = this.normalize(angle);
    const normStart = this.normalize(startAngle);
    const normEnd = this.normalize(endAngle);
    
    if (normStart <= normEnd) {
      return normAngle >= normStart && normAngle < normEnd;
    } else {
      // Диапазон пересекает границу 0/2π
      return normAngle >= normStart || normAngle < normEnd;
    }
  }

  /**
   * Интерполировать между двумя углами
   * @param {number} angle1 - Первый угол
   * @param {number} angle2 - Второй угол
   * @param {number} t - Коэффициент интерполяции (0-1)
   * @returns {number} Интерполированный угол
   */
  static lerpAngle(angle1, angle2, t) {
    const norm1 = this.normalize(angle1);
    const norm2 = this.normalize(angle2);
    
    let diff = norm2 - norm1;
    
    // Выбираем кратчайший путь
    if (Math.abs(diff) > Math.PI) {
      if (diff > 0) {
        diff -= 2 * Math.PI;
      } else {
        diff += 2 * Math.PI;
      }
    }
    
    return this.normalize(norm1 + diff * t);
  }

  /**
   * Получить случайный угол в заданном диапазоне
   * @param {number} startAngle - Начальный угол
   * @param {number} endAngle - Конечный угол
   * @returns {number} Случайный угол в диапазоне
   */
  static getRandomAngleInRange(startAngle, endAngle) {
    const normStart = this.normalize(startAngle);
    const normEnd = this.normalize(endAngle);
    
    let range;
    if (normStart <= normEnd) {
      range = normEnd - normStart;
      return normStart + Math.random() * range;
    } else {
      range = (2 * Math.PI - normStart) + normEnd;
      const randomValue = Math.random() * range;
      
      if (randomValue <= (2 * Math.PI - normStart)) {
        return normStart + randomValue;
      } else {
        return randomValue - (2 * Math.PI - normStart);
      }
    }
  }

  /**
   * Валидация угла
   * @param {number} angle - Угол для проверки
   * @returns {boolean} true если угол валидный
   */
  static isValidAngle(angle) {
    return typeof angle === 'number' && 
           !isNaN(angle) && 
           isFinite(angle);
  }

  /**
   * Отладочная информация об угле
   * @param {number} angle - Угол для анализа
   * @returns {Object} Отладочная информация
   */
  static getAngleDebugInfo(angle) {
    return {
      original: angle,
      normalized: this.normalize(angle),
      degrees: this.toDegrees(this.normalize(angle)),
      isValid: this.isValidAngle(angle),
      quadrant: Math.floor(this.normalize(angle) / (Math.PI / 2)) + 1
    };
  }
}