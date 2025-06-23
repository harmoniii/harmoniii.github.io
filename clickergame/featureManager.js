// featureManager.js
import { EventBus } from './eventBus.js';
import { Zone }      from './zones.js';
import { CONFIG, ZONE_COUNT, BUFF_DEFS, DEBUFF_DEFS, RESOURCES } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.buffIntervals = {};
    this.initZones();
  }

  initZones() {
    // Исправление 1: Правильная очистка обработчиков
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click || [])
        .filter(h => h !== this.clickHandler);
    }
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => {
      const now = Date.now();
      if (now < this.state.blockedUntil) return;
      
      // Исправление 2: Нормализация угла для корректного сравнения
      const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      const z = this.zones.find(z => z.contains(normalizedAngle));
      if (!z) return;

      // сохраняем угол
      this.state.combo.lastAngle = normalizedAngle;

      // комбо
      if (this.state.combo.lastZone === z.index && now < this.state.combo.deadline) {
        this.state.combo.count++;
      } else {
        this.state.combo.count = 1;
      }
      this.state.combo.lastZone  = z.index;
      this.state.combo.deadline  = now + 5000;
      EventBus.emit('comboChanged', this.state.combo.count);

      // золото (frenzy удваивает)
      let gain = this.state.combo.count;
      if (this.state.buffs.includes('frenzy')) gain *= 2;
      this.state.resources.gold += gain;
      EventBus.emit('resourceChanged', { resource: 'gold', amount: this.state.resources.gold });

      // Исправление 3: Ограничение шанса в разумных пределах
      let chance = Math.max(5, Math.min(95, 50 + this.state.resources.faith - this.state.resources.chaos));
      if (Math.random() * 100 < chance) {
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
    const s = this.state;
    EventBus.emit('buffApplied', def.id);

    switch (def.id) {
      case 'frenzy':
        // Исправление 4: Предотвращение дублирования баффов
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          setTimeout(() => {
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
          }, def.duration * 1000);
        }
        break;

      case 'lucky':
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          setTimeout(() => {
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
          }, def.duration * 1000);
        }
        break;

      case 'waterfall':
        // Исправление 5: Очистка предыдущего интервала
        if (this.buffIntervals.waterfall) {
          clearInterval(this.buffIntervals.waterfall);
        }
        if (!s.buffs.includes(def.id)) {
          s.buffs.push(def.id);
          this.buffIntervals.waterfall = setInterval(() => {
            const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
            const res = pool[Math.floor(Math.random() * pool.length)];
            s.resources[res]++;
            EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
          }, 1000);
          setTimeout(() => {
            clearInterval(this.buffIntervals.waterfall);
            delete this.buffIntervals.waterfall;
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
          }, def.duration * 1000);
        }
        break;

      case 'roll':
        // Casino: heavy / small / nothing / minus
        const poolR = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
        const outcome = Math.random();
        let message = 'Roll: ';
        if (outcome < 0.25) {
          // very much
          const res1 = poolR[Math.floor(Math.random() * poolR.length)];
          const amt1 = 50;
          s.resources[res1] += amt1;
          message += `+${amt1} ${res1}`;
          EventBus.emit('resourceChanged', { resource: res1, amount: s.resources[res1] });
        } else if (outcome < 0.5) {
          // small
          const res2 = poolR[Math.floor(Math.random() * poolR.length)];
          const amt2 = 5;
          s.resources[res2] += amt2;
          message += `+${amt2} ${res2}`;
          EventBus.emit('resourceChanged', { resource: res2, amount: s.resources[res2] });
        } else if (outcome < 0.75) {
          message += 'nothing';
        } else {
          const res3 = poolR[Math.floor(Math.random() * poolR.length)];
          const amt3 = 5;
          s.resources[res3] = Math.max(0, s.resources[res3] - amt3);
          message += `-${amt3} ${res3}`;
          EventBus.emit('resourceChanged', { resource: res3, amount: s.resources[res3] });
        }
        this.showTempNotification(message);
        break;

      case 'mysteryBox':
        // Mystery Box: выбираем из 3 случайных ресурсов
        const poolM = RESOURCES;
        // три уникальных
        const opts = [];
        while (opts.length < 3) {
          const r = poolM[Math.floor(Math.random() * poolM.length)];
          if (!opts.includes(r)) opts.push(r);
        }
        
        // Исправление 6: Более надежный пользовательский ввод
        const choice = prompt(
          `📦 Mystery Box! Choose resource to gain +5:\n` +
          opts.map((r,i) => `${i+1}: ${r}`).join('\n')
        );
        
        if (choice !== null) { // проверяем что пользователь не нажал Cancel
          const idx = parseInt(choice.trim()) - 1;
          if (idx >= 0 && idx < opts.length && !isNaN(idx)) {
            const picked = opts[idx];
            s.resources[picked] += 5;
            EventBus.emit('resourceChanged', { resource: picked, amount: s.resources[picked] });
            this.showTempNotification(`+5 ${picked}`);
          } else {
            this.showTempNotification('Invalid selection');
          }
        } else {
          this.showTempNotification('Cancelled');
        }
        break;
    }
  }

  applyDebuff(def) {
    const s = this.state;
    EventBus.emit('debuffApplied', def.id);

    if (def.id === 'explosion') {
      const pool = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
      const res = pool[Math.floor(Math.random() * pool.length)];
      const oldAmount = s.resources[res];
      s.resources[res] = Math.max(0, Math.floor(s.resources[res] * 0.9));
      EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
      this.showTempNotification(`💣 Lost ${oldAmount - s.resources[res]} ${res}`);
      return;
    }

    // Исправление 7: Инициализация массива debuffs
    if (!s.debuffs) s.debuffs = [];
    
    // Исправление 8: Предотвращение дублирования дебаффов
    if (!s.debuffs.includes(def.id)) {
      s.debuffs.push(def.id);

      if (def.id === 'rapid') {
        this._oldSpeed = CONFIG.rotationSpeed;
        CONFIG.rotationSpeed *= 5;
      }
      if (def.id === 'lock') {
        s.blockedUntil = Date.now() + def.duration * 1000;
      }

      setTimeout(() => {
        s.debuffs = s.debuffs.filter(id => id !== def.id);
        EventBus.emit('debuffExpired', def.id);
        if (def.id === 'rapid') {
          CONFIG.rotationSpeed = this._oldSpeed || 0.005; // fallback значение
        }
      }, (def.duration || 0) * 1000);
    }
  }

  shuffleZones() {
    const arr = this.zones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
      // Исправление 9: Правильное обновление индексов после перестановки
      arr[i].index = i;
      arr[j].index = j;
    }
  }

  showTempNotification(msg) {
    EventBus.emit('buffApplied', msg);
  }
}