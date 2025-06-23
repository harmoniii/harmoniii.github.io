// zones.js
export class Zone {
  constructor(def, index, total) {
    this.def = def;
    this.index = index;
    this.total = total;
  }
  
  contains(angle) {
    const step = 2 * Math.PI / this.total;
    const start = step * this.index;
    const end = start + step;
    
    // Улучшение: более надежная нормализация угла
    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Обработка граничного случая (переход через 0)
    if (start <= end) {
      return normalizedAngle >= start && normalizedAngle < end;
    } else {
      // Случай когда зона пересекает границу 0/2π
      return normalizedAngle >= start || normalizedAngle < end;
    }
  }
  
  // Добавим полезные методы
  getStartAngle() {
    return (2 * Math.PI / this.total) * this.index;
  }
  
  getEndAngle() {
    return (2 * Math.PI / this.total) * (this.index + 1);
  }
  
  getCenterAngle() {
    return this.getStartAngle() + (2 * Math.PI / this.total) / 2;
  }
}