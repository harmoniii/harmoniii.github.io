// zones.js
import { ZONE_DEFS } from './config.js';

export class Zone {
  /**
   * @param {object} def   - из ZONE_DEFS
   * @param {number} index - номер сегмента
   * @param {number} total - общее число сегментов
   */
  constructor(def, index, total) {
    this.def = def;
    this.index = index;
    this.total = total;
  }

  contains(angle) {
    const step = 2 * Math.PI / this.total;
    const start = step * this.index;
    const end = start + step;
    const a = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return a >= start && a < end;
  }
}
