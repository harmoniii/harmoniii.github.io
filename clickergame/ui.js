// ui.js
import { EventBus }            from './eventBus.js';
import { SKILL_CATEGORIES,
         SKILL_DEFS,
         SkillManager }         from './skills.js';
import { BUILDING_DEFS }        from './buildings.js';
import { BUFF_DEFS,
         DEBUFF_DEFS }          from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.initElements();
    this.bindControls();
    this.bindEvents();
    this.updateResources();
  }

  initElements() {
    this.btnBuildings    = document.getElementById('toggle-buildings');
    this.btnSkills       = document.getElementById('toggle-skills');
    this.btnInfo         = document.getElementById('info-button');
    this.resourcesLeft   = document.getElementById('resources-left');
    this.resourcesRight  = document.getElementById('resources-right');
    this.panel           = document.getElementById('panel-container');
    this.btnLoad         = document.getElementById('load-button');
    this.btnSave         = document.getElementById('save-button');
    this.btnReset        = document.getElementById('reset-button');
    this.notifications   = document.getElementById('notifications');
    this.infoModal       = document.getElementById('info-modal');
    this.mysteryModal    = document.getElementById('mystery-modal');
  }

  bindControls() {
    // Buildings
    this.btnBuildings.addEventListener('click', () => {
      this.currentPanel === 'buildings' ? this.hidePanel() : this.showBuildings();
    });
    // Skills
    this.btnSkills.addEventListener('click', () => {
      this.currentPanel === 'skills' ? this.hidePanel() : this.showSkills();
    });
    // Buff/Debuff info
    this.btnInfo.addEventListener('click', () => this.showInfoModal());
    // Close modals on click
    this.infoModal.addEventListener('click',    () => this.infoModal.classList.add('hidden'));
    this.mysteryModal.addEventListener('click', () => this.mysteryModal.classList.add('hidden'));
    // Save
    this.btnSave.addEventListener('click', () => {
      const copy = { ...this.state };
      delete copy.featureMgr;
      delete copy.buildingManager;
      delete copy.skillManager;
      prompt('Copy save code:', btoa(JSON.stringify(copy)));
    });
    // Load
    this.btnLoad.addEventListener('click', () => {
      const code = prompt('Paste save code:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
        this.showNotification('Игра загружена');
      } catch {
        this.showNotification('Неверный код сохранения');
      }
    });
    // Reset — перезагрузка страницы
    this.btnReset.addEventListener('click', () => {
      if (confirm('Сбросить игру?')) location.reload();
    });
  }

  bindEvents() {
    EventBus.subscribe('resourceChanged',   () => this.updateResources());
    EventBus.subscribe('comboChanged',      () => this.updateResources());
    EventBus.subscribe('skillPointsChanged',() => this.updateResources());
    EventBus.subscribe('buffApplied',       id => this.showNotification(id));
    EventBus.subscribe('debuffApplied',     id => this.showNotification(`Debuff: ${id}`));
    EventBus.subscribe('mysteryBox',        opts => this.showMysteryModal(opts));
  }

  updateResources() {
    // Сброс
    this.resourcesLeft.innerHTML  = '';
    this.resourcesRight.innerHTML = '';
    // Основные
    ['gold','wood','stone','food','water','iron'].forEach(key => {
      const val = this.state.resources[key] || 0;
      this.resourcesLeft.appendChild(this.createResourceElem(key, val));
      this.resourcesLeft.appendChild(document.createElement('br'));
    });
    // Остальные
    Object.keys(this.state.resources)
      .filter(key => !['gold','wood','stone','food','water','iron'].includes(key))
      .forEach(key => {
        const val = this.state.resources[key];
        this.resourcesRight.appendChild(this.createResourceElem(key, val));
        this.resourcesRight.appendChild(document.createElement('br'));
      });
    // Комбо
    const combo = document.createElement('div');
    combo.textContent = `Комбо: ${this.state.combo.count}`;
    this.resourcesRight.appendChild(combo);
    // Skill Points
    const sp = document.createElement('div');
    sp.textContent = `Skill Points: ${this.state.skillPoints}`;
    this.resourcesRight.appendChild(sp);
  }

  createResourceElem(key, val) {
    const span = document.createElement('span');
    span.textContent = `${this.getEmoji(key)} ${Number(val).toFixed(1)}`;
    span.addEventListener('mouseenter', e => this.showTooltip(e, key));
    span.addEventListener('mouseleave',  () => this.hideTooltip());
    return span;
  }

  getEmoji(res) {
    return {
      gold: '🪙', wood: '🌲', stone: '🪨', food: '🍎',
      water: '💧', iron: '⛓️', people: '👥', energy: '⚡',
      science: '🔬', faith: '🙏', chaos: '🌪️', skillPoints: '✨'
    }[res] || res;
  }

  showTooltip(e, key) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);
    }
    this.tooltip.textContent = key;
    this.tooltip.style.top     = `${e.pageY + 10}px`;
    this.tooltip.style.left    = `${e.pageX + 10}px`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.style.display = 'none';
  }

  showBuildings() {
    this.currentPanel = 'buildings';
    this.panel.innerHTML = '';
    BUILDING_DEFS.forEach(def => {
      const priceText = Object.entries(def.price)
        .map(([r,a]) => `${a} ${r}`).join(', ');
      const btn = document.createElement('button');
      btn.textContent = `${def.img} ${def.name}: ${def.description} — цена ${priceText}`;
      btn.disabled = !this.state.buildingManager.canAfford(def.id);
      btn.addEventListener('click', () => {
        if (this.state.buildingManager.buyBuilding(def.id)) {
          EventBus.emit('buildingBought', def.id);
        } else this.showNotification('Недостаточно ресурсов');
      });
      this.panel.appendChild(btn);
      this.panel.appendChild(document.createElement('br'));
    });
    this.panel.classList.remove('hidden');
  }

  showSkills() {
    this.currentPanel = 'skills';
    this.panel.innerHTML = '';
    SKILL_DEFS.forEach(def => {
      const lvl = this.state.skillManager.getSkillLevel(def.id) || 0;
      const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, lvl));
      const btn = document.createElement('button');
      btn.textContent = `${def.icon} ${def.name} (Lv.${lvl}/${def.maxLevel}) — цена ${cost}`;
      btn.disabled = cost > this.state.skillPoints || lvl >= def.maxLevel;
      btn.title = def.description;
      btn.addEventListener('click', () => {
        if (this.state.skillManager.buySkill(def.id)) {
          this.showNotification(`${def.name} улучшен`);
        } else {
          this.showNotification('Недостаточно Skill Points');
        }
      });
      this.panel.appendChild(btn);
      this.panel.appendChild(document.createElement('br'));
    });
    this.panel.classList.remove('hidden');
  }

  hidePanel() {
    this.currentPanel = null;
    this.panel.classList.add('hidden');
  }

  showInfoModal() {
    this.infoModal.innerHTML = '<h3>Баффы</h3>';
    BUFF_DEFS.forEach(b => {
      const p = document.createElement('p');
      p.textContent = `${b.name} — ${b.description}`;
      this.infoModal.appendChild(p);
    });
    this.infoModal.appendChild(document.createElement('hr'));
    this.infoModal.appendChild(document.createElement('h3')).textContent = 'Дебаффы';
    DEBUFF_DEFS.forEach(d => {
      const p = document.createElement('p');
      p.textContent = `${d.name} — ${d.description}`;
      this.infoModal.appendChild(p);
    });
    this.infoModal.classList.remove('hidden');
  }

  showMysteryModal(opts) {
    this.mysteryModal.innerHTML = '<h3>📦 Mystery Box</h3>';
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5`;
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        this.mysteryModal.classList.add('hidden');
      });
      this.mysteryModal.appendChild(btn);
      this.mysteryModal.appendChild(document.createElement('br'));
    });
    this.mysteryModal.classList.remove('hidden');
  }

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    this.notifications.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}
