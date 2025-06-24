// ui.js
import { EventBus }       from './eventBus.js';
import { saveState }      from './storage.js';
import { SKILL_CATEGORIES } from './skills.js';
import { BUILDING_DEFS }    from './buildings.js';
import { BUFF_DEFS, DEBUFF_DEFS } from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.initLayout();
    this.bindControls();
    this.subscribeEvents();
    this.updateResources();
  }

  initLayout() {
    // Навигация сверху
    this.btnBuildings = document.getElementById('toggle-buildings');
    this.btnSkills    = document.getElementById('toggle-skills');
    this.btnInfo      = document.getElementById('info-button');

    // Панели ресурсов и списков
    this.leftPanel   = document.getElementById('resources-left');
    this.rightPanel  = document.getElementById('resources-right');
    this.buildList   = document.getElementById('buildings-list');
    this.skillList   = document.getElementById('skills-list');

    // Нижние кнопки
    this.btnLoad     = document.getElementById('load-button');
    this.btnSave     = document.getElementById('save-button');
    this.btnReset    = document.getElementById('reset-button');

    // Модалки
    this.infoModal    = document.getElementById('info-modal');
    this.mysteryModal = document.getElementById('mystery-modal');
  }

  bindControls() {
    // Показ/скрытие списка строений
    this.btnBuildings.addEventListener('click', () => {
      const show = this.buildList.style.display !== 'block';
      this.buildList.style.display = show ? 'block' : 'none';
      if (show) this.renderBuildings();
    });
    // Показ/скрытие списка скиллов
    this.btnSkills.addEventListener('click', () => {
      const show = this.skillList.style.display !== 'block';
      this.skillList.style.display = show ? 'block' : 'none';
      if (show) this.renderSkills();
    });
    // Показ модалки баффов/дебаффов
    this.btnInfo.addEventListener('click', () => this.showInfoModal());
    // Закрытие модалок по клику на них
    this.infoModal.addEventListener('click',    () => this.infoModal.classList.add('hidden'));
    this.mysteryModal.addEventListener('click', () => this.mysteryModal.classList.add('hidden'));

    // Save / Load / Reset
    this.btnSave.addEventListener('click', () => {
      const copy = { ...this.state };
      delete copy.featureMgr;
      delete copy.buildingManager;
      delete copy.skillManager;
      prompt('Скопируйте код сохранения:', btoa(JSON.stringify(copy)));
    });
    this.btnLoad.addEventListener('click', () => {
      const code = prompt('Вставьте код сохранения:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
        this.showNotification('Игра загружена');
      } catch {
        this.showNotification('Неверный код сохранения');
      }
    });
    this.btnReset.addEventListener('click', () => {
      if (confirm('Сбросить игру?')) {
        localStorage.removeItem('gameState');
        EventBus.emit('gameReset');
      }
    });
  }

  subscribeEvents() {
    EventBus.subscribe('resourceChanged', () => this.updateResources());
    EventBus.subscribe('comboChanged',    () => this.updateResources());
    EventBus.subscribe('buffApplied',     id  => this.showNotification(id));
    EventBus.subscribe('debuffApplied',   id  => this.showNotification(`Debuff: ${id}`));
    EventBus.subscribe('buildingBought',  ()  => this.updateResources());
    EventBus.subscribe('skillBought',     ()  => this.updateResources());
    EventBus.subscribe('mysteryBox',      opts => this.showMysteryModal(opts));
  }

  updateResources() {
    const primary = ['gold','wood','stone','food','water','iron'];
    // Левая панель: основные ресурсы
    this.leftPanel.innerHTML  = '';
    primary.forEach(key => {
      const val = this.state.resources[key] || 0;
      const el  = this.createResourceElem(key, val);
      this.leftPanel.appendChild(el);
      this.leftPanel.appendChild(document.createElement('br'));
    });
    // Правая панель: остальные ресурсы + комбо
    this.rightPanel.innerHTML = '';
    Object.keys(this.state.resources)
      .filter(key => !primary.includes(key))
      .forEach(key => {
        const val = this.state.resources[key];
        const el  = this.createResourceElem(key, val);
        this.rightPanel.appendChild(el);
        this.rightPanel.appendChild(document.createElement('br'));
      });
    // Комбо
    const combo = document.createElement('div');
    combo.className = 'combo-counter';
    combo.textContent = `Комбо: ${this.state.combo.count}`;
    this.rightPanel.appendChild(combo);
  }

  createResourceElem(key, val) {
    const span = document.createElement('span');
    span.textContent = `${this.getEmoji(key)} ${Number(val).toFixed(1)}`;
    span.addEventListener('mouseenter', e => this.showTooltip(e, key));
    span.addEventListener('mouseleave',  () => this.hideTooltip());
    return span;
  }

  getEmoji(res) {
    const map = {
      gold: '🪙', wood: '🌲', stone: '🪨', food: '🍎',
      water: '💧', iron: '⛓️', people: '👥', energy: '⚡',
      science: '🔬', faith: '🙏', chaos: '🌪️'
    };
    return map[res] || res;
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

  renderBuildings() {
    this.buildList.innerHTML = '';
    BUILDING_DEFS.forEach(b => {
      const btn = document.createElement('button');
      btn.textContent = `${b.name} (${b.costText})`;
      btn.disabled = !this.state.buildingManager.canAfford(b.id);
      btn.addEventListener('click', () => {
        if (this.state.buildingManager.buyBuilding(b.id)) {
          EventBus.emit('buildingBought', b.id);
        } else {
          this.showNotification('Недостаточно ресурсов');
        }
      });
      this.buildList.appendChild(btn);
    });
  }

  renderSkills() {
    this.skillList.innerHTML = '';
    Object.entries(this.state.skillManager.getSkillsByCategory())
      .forEach(([catId, skills]) => {
        const hdr = document.createElement('h4');
        hdr.textContent = SKILL_CATEGORIES[catId];
        this.skillList.appendChild(hdr);
        skills.forEach(s => {
          const btn = document.createElement('button');
          btn.textContent = `${s.icon} ${s.name} (Lv.${s.currentLevel}/${s.maxLevel})`;
          btn.disabled = !s.canAfford;
          btn.addEventListener('click', () => {
            if (this.state.skillManager.buySkill(s.id)) {
              EventBus.emit('skillBought', s.id);
            } else {
              this.showNotification('Недостаточно ресурсов');
            }
          });
          this.skillList.appendChild(btn);
        });
      });
  }

  showInfoModal() {
    this.infoModal.innerHTML = `<h3>Баффы</h3>`;
    BUFF_DEFS.forEach(b => {
      const p = document.createElement('p');
      p.textContent = `${b.name} — ${b.description}`;
      this.infoModal.appendChild(p);
    });
    this.infoModal.appendChild(document.createElement('hr'));
    const hdr = document.createElement('h3');
    hdr.textContent = 'Дебаффы';
    this.infoModal.appendChild(hdr);
    DEBUFF_DEFS.forEach(d => {
      const p = document.createElement('p');
      p.textContent = `${d.name} — ${d.description}`;
      this.infoModal.appendChild(p);
    });
    this.infoModal.classList.remove('hidden');
  }

  showMysteryModal(opts) {
    this.mysteryModal.innerHTML = `<h3>📦 Mystery Box</h3>`;
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5`;
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        this.mysteryModal.classList.add('hidden');
      });
      this.mysteryModal.appendChild(btn);
    });
    this.mysteryModal.classList.remove('hidden');
  }

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    document.getElementById('notifications').appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}
