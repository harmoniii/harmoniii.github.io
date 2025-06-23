// featureManager.js
import { EventBus }      from './eventBus.js';
import { Zone }          from './zones.js';
import { CONFIG,
         BUFF_DEFS,
         DEBUFF_DEFS,
         ZONE_COUNT }    from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.initZones();
  }

  initZones() {
    // Отписка старого
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click||[])
        .filter(h => h !== this.clickHandler);
    }

    // Генерируем зоны
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => {
      if (Date.now() < this.state.blockedUntil) return;
      const z = this.zones.find(z => z.contains(angle));
      if (!z) return;
      const now = Date.now();

      // --- Комбо ---
      if (this.state.combo.lastZone === z.index && now < this.state.combo.deadline) {
        this.state.combo.count++;
      } else {
        this.state.combo.count = 1;
      }
      this.state.combo.lastZone   = z.index;
      this.state.combo.deadline   = now + 5000;
      EventBus.emit('comboChanged', this.state.combo.count);

      // --- Золото по комбо ---
      const gain = this.state.combo.count;
      this.state.resources.gold += gain;
      EventBus.emit('resourceChanged', { resource: 'gold', amount: this.state.resources.gold });

      // --- Бафф или дебафф ---
      let buffChance = 50 + this.state.resources.faith - this.state.resources.chaos;
      if (Math.random() * 100 < buffChance) {
        this.applyBuff(BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)]);
      } else {
        this.applyDebuff(DEBUFF_DEFS[Math.floor(Math.random() * DEBUFF_DEFS.length)]);
      }

      this.shuffleZones();
      EventBus.emit('zonesShuffled');
    };

    EventBus.subscribe('click', this.clickHandler);
  }

  applyBuff(def) {
    this.state.buffs.push(def.id);
    EventBus.emit('buffApplied', def.id);
    setTimeout(() => {
      this.state.buffs = this.state.buffs.filter(id => id !== def.id);
      EventBus.emit('buffExpired', def.id);
    }, def.duration * 1000);
  }

  applyDebuff(def) {
    if (def.id === 'explosion') {
      const pool = Object.keys(this.state.resources)
        .filter(r => r !== 'faith' && r !== 'chaos');
      const res = pool[Math.floor(Math.random() * pool.length)];
      this.state.resources[res] = Math.max(
        0,
        Math.floor(this.state.resources[res] * 0.9)
      );
      EventBus.emit('resourceChanged', { resource: res, amount: this.state.resources[res] });
    } else {
      this.state.debuffs.push(def.id);
      EventBus.emit('debuffApplied', def.id);
      if (def.duration) {
        setTimeout(() => {
          this.state.debuffs = this.state.debuffs.filter(id => id !== def.id);
          EventBus.emit('debuffExpired', def.id);
        }, def.duration * 1000);
      }
    }
  }

  shuffleZones() {
    const arr = this.zones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
      arr[i].index = i;
      arr[j].index = j;
    }
  }
}
