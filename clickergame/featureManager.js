// featureManager.js
import { EventBus } from './eventBus.js';
import { Zone }      from './zones.js';
import { CONFIG, ZONE_COUNT, BUFF_DEFS, DEBUFF_DEFS } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.buffIntervals = {};
    this.initZones();
  }

  initZones() {
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click||[])
        .filter(h => h !== this.clickHandler);
    }
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => {
      const now = Date.now();
      if (now < this.state.blockedUntil) return;
      const z = this.zones.find(z => z.contains(angle));
      if (!z) return;

      // Комбо
      if (this.state.combo.lastZone === z.index && now < this.state.combo.deadline) {
        this.state.combo.count++;
      } else {
        this.state.combo.count = 1;
      }
      this.state.combo.lastZone   = z.index;
      this.state.combo.deadline   = now + 5000;
      EventBus.emit('comboChanged', this.state.combo.count);

      // Золото (зависит от frenzy)
      let gain = this.state.combo.count;
      if (this.state.buffs.includes('frenzy')) gain *= 2;
      this.state.resources.gold += gain;
      EventBus.emit('resourceChanged', { resource:'gold', amount:this.state.resources.gold });

      // Бафф или дебафф
      let chance = 50 + this.state.resources.faith - this.state.resources.chaos;
      if (Math.random()*100 < chance) {
        this.applyBuff(BUFF_DEFS[Math.floor(Math.random()*BUFF_DEFS.length)]);
      } else {
        this.applyDebuff(DEBUFF_DEFS[Math.floor(Math.random()*DEBUFF_DEFS.length)]);
      }

      this.shuffleZones();
      EventBus.emit('zonesShuffled');
    };

    EventBus.subscribe('click', this.clickHandler);
  }

  applyBuff(def) {
    const s = this.state;
    s.buffs.push(def.id);
    EventBus.emit('buffApplied', def.id);

    // Специальные эффекты
    if (def.id === 'magnet') {
      this.buffIntervals.magnet = setInterval(() => {
        EventBus.emit('click', null); // автоклик по предыдущему углу
      }, 1000);
    }
    if (def.id === 'waterfall') {
      this.buffIntervals.waterfall = setInterval(() => {
        const pool = Object.keys(s.resources).filter(r=>'faith,chaos'.indexOf(r)<0);
        const res = pool[Math.floor(Math.random()*pool.length)];
        s.resources[res]++; 
        EventBus.emit('resourceChanged',{resource:res,amount:s.resources[res]});
      }, 1000);
    }

    setTimeout(() => {
      s.buffs = s.buffs.filter(id => id !== def.id);
      EventBus.emit('buffExpired', def.id);
      // очищаем интервалы
      if (this.buffIntervals[def.id]) {
        clearInterval(this.buffIntervals[def.id]);
        delete this.buffIntervals[def.id];
      }
    }, def.duration*1000);
  }

  applyDebuff(def) {
    const s = this.state;
    if (def.id === 'explosion') {
      const pool = Object.keys(s.resources).filter(r=>'faith,chaos'.indexOf(r)<0);
      const res = pool[Math.floor(Math.random()*pool.length)];
      s.resources[res] = Math.max(0, Math.floor(s.resources[res]*0.9));
      EventBus.emit('resourceChanged',{resource:res,amount:s.resources[res]});
    } else {
      s.debuffs = s.debuffs||[];
      s.debuffs.push(def.id);
      EventBus.emit('debuffApplied', def.id);
      if (def.id === 'rapid') {
        // ускоряем вращение
        this._oldSpeed = CONFIG.rotationSpeed;
        CONFIG.rotationSpeed *= 5;
      }
      if (def.id === 'lock') {
        s.blockedUntil = Date.now() + def.duration*1000;
      }
      setTimeout(() => {
        s.debuffs = s.debuffs.filter(id=>id!==def.id);
        EventBus.emit('debuffExpired', def.id);
        if (def.id === 'rapid') {
          CONFIG.rotationSpeed = this._oldSpeed;
        }
      }, (def.duration||0)*1000);
    }
  }

  shuffleZones() {
    const arr = this.zones;
    for (let i = arr.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [arr[i],arr[j]] = [arr[j],arr[i]];
      arr[i].index = i; arr[j].index = j;
    }
  }
}
