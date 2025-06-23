// zones.js
import { ZONE_DEFS, CONFIG } from './config.js';

export class Zone {
  constructor(def, index) {
    this.def = def;
    this.index = index;
  }
  contains(angle, totalAngle) {
    const step = totalAngle / ZONE_DEFS.length;
    const start = step * this.index;
    const end = start + step;
    const a = (angle % (2*Math.PI) + 2*Math.PI) % (2*Math.PI);
    return a >= start && a < end;
  }
}