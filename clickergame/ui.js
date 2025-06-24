// ui.js - Исправленная версия
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
    this.currentPanel = null; // ИСПРАВЛЕНИЕ: добавлено отсутствующее свойство
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
    
    // ИСПРАВЛЕНИЕ: добавляем подписку на события зданий и навыков для обновления панелей
    EventBus.subscribe('buildingBought', () => {
      if (this.currentPanel === 'buildings') {
        this.showBuildings(); // Обновляем панель зданий
      }
    });
    
    EventBus.subscribe('skillBought', () => {
      if (this.currentPanel === 'skills') {
        this.showSkills(); // Обновляем панель навыков
      }
    });
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
    sp.textContent = `Skill Points: ${this.state.skillPoints || 0}`; // ИСПРАВЛЕНИЕ: защита от undefined
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
    
    // ИСПРАВЛЕНИЕ: используем правильный метод для получения информации о здании
    BUILDING_DEFS.forEach(def => {
      const buildingInfo = this.state.buildingManager.getBuildingInfo(def.id);
      if (!buildingInfo) return;
      
      const currentLevel = buildingInfo.currentLevel;
      const nextPrice = buildingInfo.nextPrice;
      const canAfford = buildingInfo.canAfford;
      const isMaxLevel = buildingInfo.isMaxLevel;
      
      const btn = document.createElement('button');
      
      if (isMaxLevel) {
        btn.textContent = `${def.img} ${def.name} (MAX LEVEL ${currentLevel}) - ${def.description}`;
        btn.disabled = true;
      } else {
        const priceText = Object.entries(nextPrice)
          .map(([r,a]) => `${a} ${r}`).join(', ');
        btn.textContent = `${def.img} ${def.name} (Lv.${currentLevel}) - ${def.description} — цена: ${priceText}`;
        btn.disabled = !canAfford;
      }
      
      btn.addEventListener('click', () => {
        if (this.state.buildingManager.buyBuilding(def.id)) {
          this.showNotification(`${def.name} улучшен до уровня ${this.state.buildingManager.getBuildingInfo(def.id).currentLevel}`);
          this.showBuildings(); // Обновляем панель
        } else {
          this.showNotification('Недостаточно ресурсов');
        }
      });
      
      this.panel.appendChild(btn);
      this.panel.appendChild(document.createElement('br'));
    });
    this.panel.classList.remove('hidden');
  }

  showSkills() {
    this.currentPanel = 'skills';
    this.panel.innerHTML = '';
    
    // ИСПРАВЛЕНИЕ: используем правильный метод для получения информации о навыке
    SKILL_DEFS.forEach(def => {
      const skillInfo = this.state.skillManager.getSkillInfo(def.id);
      if (!skillInfo) return;
      
      const currentLevel = skillInfo.currentLevel;
      const nextCost = skillInfo.nextCost;
      const canAfford = skillInfo.canAfford;
      const isMaxLevel = skillInfo.isMaxLevel;
      
      const btn = document.createElement('button');
      
      if (isMaxLevel) {
        btn.textContent = `${def.icon} ${def.name} (MAX LEVEL ${currentLevel}) - ${def.description}`;
        btn.disabled = true;
      } else {
        btn.textContent = `${def.icon} ${def.name} (Lv.${currentLevel}/${def.maxLevel}) — цена: ${nextCost} SP`;
        btn.disabled = !canAfford;
      }
      
      btn.title = def.description;
      btn.addEventListener('click', () => {
        if (this.state.skillManager.buySkill(def.id)) {
          this.showNotification(`${def.name} улучшен до уровня ${this.state.skillManager.getSkillInfo(def.id).currentLevel}`);
          this.showSkills(); // Обновляем панель
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
    const debuffTitle = document.createElement('h3');
    debuffTitle.textContent = 'Дебаффы';
    this.infoModal.appendChild(debuffTitle);
    DEBUFF_DEFS.forEach(d => {
      const p = document.createElement('p');
      p.textContent = `${d.name} — ${d.description}`;
      this.infoModal.appendChild(p);
    });
    this.infoModal.classList.remove('hidden');
  }

  showMysteryModal(opts) {
    this.mysteryModal.innerHTML = '<h3>📦 Mystery Box</h3><p>Выберите награду:</p>';
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5 ${r}`;
      btn.style.margin = '5px';
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        this.mysteryModal.classList.add('hidden');
        this.showNotification(`Получено: +5 ${r}`);
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