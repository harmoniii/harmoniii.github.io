// Логика зон
class Zone {
  /**
   * @param {number} startAngle - Начальный угол в радианах
   * @param {number} endAngle   - Конечный угол в радианах
   * @param {string} type       - 'score' или 'block'
   * @param {number} value      - очки за клик (для 'score')
   */
  constructor(startAngle, endAngle, type, value = 1) {
    this.startAngle = startAngle;
    this.endAngle = endAngle;
    this.type = type;
    this.value = value;
  }

  contains(angle) {
    const a = (angle + Math.PI * 2) % (Math.PI * 2);
    const start = (this.startAngle + Math.PI * 2) % (Math.PI * 2);
    const end = (this.endAngle + Math.PI * 2) % (Math.PI * 2);
    if (start < end) {
      return a >= start && a < end;
    } else {
      return a >= start || a < end;
    }
  }
}

// Инициализация зон
const zones = [];
(function initZones() {
  const angleStep = (Math.PI * 2) / CONFIG.numZones;
  for (let i = 0; i < CONFIG.numZones; i++) {
    const start = i * angleStep;
    const end = start + angleStep;
    const type = (i === 0) ? 'block' : 'score'; // первая зона блокирующая
    const value = (type === 'score') ? 1 : 0;
    zones.push(new Zone(start, end, type, value));
  }
})();
