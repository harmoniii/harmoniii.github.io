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
    const a = (angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return a >= start && a < end;
  }
}
