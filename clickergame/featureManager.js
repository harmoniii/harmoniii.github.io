import { EventBus } from './eventBus.js';
import { Zone }      from './zones.js';
import { CONFIG, ZONE_COUNT, BUFF_DEFS, DEBUFF_DEFS, RESOURCES } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    if (typeof this.state.targetZone !== 'number') {
      this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
    }
    this.buffIntervals = {};
    this.initZones();
  }

  initZones() {
    // Отписываем предыдущий обработчик, если есть
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click || [])
        .filter(h => h !== this.clickHandler);
    }

    // Инициализируем зоны
    this.zones = Array.from({ length: ZONE_COUNT }, (_, i) =>
      new Zone({ type: 'random' }, i, ZONE_COUNT)
    );

    this.clickHandler = angle => {
      const now = Date.now();
      // Игнорируем клики во время блокировки
      if (now < this.state.blockedUntil) return;

      // Нормализуем угол и определяем зону
      const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      const z = this.zones.find(z => z.contains(normalizedAngle));
      if (!z) return;

      // Обновление комбо
      this.state.combo.lastAngle = normalizedAngle;
      if (z.index === this.state.targetZone && now < this.state.combo.deadline) {
        this.state.combo.count++;
      } else {
        this.state.combo.count = 1;
      }
      this.state.combo.lastZone = z.index;
      this.state.combo.deadline = now + CONFIG.comboTimeout;
      EventBus.emit('comboChanged', this.state.combo.count);

      // Начисление золота
      let gain = this.state.combo.count;
      if (this.state.buffs.includes('frenzy')) gain *= 2;
      this.state.resources.gold += gain;
      EventBus.emit('resourceChanged', { resource: 'gold', amount: this.state.resources.gold });

      // Шанс смены сектора-мишени независимо от баффов
      if (z.index === this.state.targetZone && Math.random() * 100 < CONFIG.zoneShuffleChance) {
        this.state.targetZone = Math.floor(Math.random() * ZONE_COUNT);
        EventBus.emit('zonesShuffled', this.state.targetZone);
      }

      const { baseChance, chanceRange } = CONFIG;

      // 1) Фильтр шанса на эффект
      if (Math.random() * 100 >= baseChance) {
        return;
      }

      // 2) Расчет шанса баффа
      const minVar   = -chanceRange.min;
      const maxVar   =  chanceRange.max;
      const variation = Math.random() * (maxVar - minVar) + minVar;
      let buffChance = baseChance + (this.state.resources.faith - this.state.resources.chaos) + variation;
      buffChance = Math.max(0, Math.min(100, buffChance));

      // 3) Применяем бафф или дебафф
      if (Math.random() * 100 < buffChance) {
        const def = BUFF_DEFS[Math.floor(Math.random() * BUFF_DEFS.length)];
        this.applyBuff(def);
      } else {
        const def = DEBUFF_DEFS[Math.floor(Math.random() * DEBUFF_DEFS.length)];
        this.applyDebuff(def);
      }
    };

    EventBus.subscribe('click', this.clickHandler);
  }

  applyBuff(def) {
    const s = this.state;
    EventBus.emit('buffApplied', def.id);

    switch (def.id) {
      case 'frenzy':
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
          }, CONFIG.EFFECT_CONFIG.waterfall?.intervalMs || 1000);
          setTimeout(() => {
            clearInterval(this.buffIntervals.waterfall);
            delete this.buffIntervals.waterfall;
            s.buffs = s.buffs.filter(id => id !== def.id);
            EventBus.emit('buffExpired', def.id);
          }, def.duration * 1000);
        }
        break;

      case 'roll':
        const poolR = RESOURCES.filter(r => r !== 'faith' && r !== 'chaos');
        const outcome = Math.random();
        let message = 'Roll: ';
        if (outcome < 0.25) {
          const res1 = poolR[Math.floor(Math.random() * poolR.length)];
          s.resources[res1] += 50;
          message += `+50 ${res1}`;
          EventBus.emit('resourceChanged', { resource: res1, amount: s.resources[res1] });
        } else if (outcome < 0.5) {
          const res2 = poolR[Math.floor(Math.random() * poolR.length)];
          s.resources[res2] += 5;
          message += `+5 ${res2}`;
          EventBus.emit('resourceChanged', { resource: res2, amount: s.resources[res2] });
        } else if (outcome < 0.75) {
          message += 'nothing';
        } else {
          const res3 = poolR[Math.floor(Math.random() * poolR.length)];
          const loss = Math.min(5, s.resources[res3]);
          s.resources[res3] -= loss;
          message += `-${loss} ${res3}`;
          EventBus.emit('resourceChanged', { resource: res3, amount: s.resources[res3] });
        }
        this.showTempNotification(message);
        break;

      case 'mysteryBox':
        const poolM = RESOURCES;
        const opts = [];
        while (opts.length < 3) {
          const r = poolM[Math.floor(Math.random() * poolM.length)];
          if (!opts.includes(r)) opts.push(r);
        }
        const choice = prompt(
          `📦 Mystery Box! Choose resource to gain +5:\n` +
          opts.map((r,i) => `${i+1}: ${r}`).join('\n')
        );
        if (choice !== null) {
          const idx = parseInt(choice.trim(), 10) - 1;
          if (idx >= 0 && idx < opts.length) {
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
      s.resources[res] = Math.max(0, Math.floor(s.resources[res] * (1 - (CONFIG.EFFECT_CONFIG.explosion?.damagePercent || 0.1))));
      this.showTempNotification(`💣 Lost ${oldAmount - s.resources[res]} ${res}`);
      EventBus.emit('resourceChanged', { resource: res, amount: s.resources[res] });
      return;
    }

    if (!s.debuffs) s.debuffs = [];
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
          CONFIG.rotationSpeed = this._oldSpeed || 0.005;
        }
      }, (def.duration || 0) * 1000);
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

  showTempNotification(msg) {
    EventBus.emit('buffApplied', msg);
  }
}
