// ui.js
import { EventBus } from './eventBus.js';
import { saveState } from './storage.js';
import { SKILL_CATEGORIES } from './skills.js';
import { BUILDING_DEFS } from './buildings.js';
import { BUFF_DEFS, DEBUFF_DEFS } from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.currentTab = 'game';
    this.createLayout();
    this.bindSaveLoad();
    this.bindReset();
    this.bindTabSwitching();
    EventBus.subscribe('resourceChanged', () => this.updateResources());
    EventBus.subscribe('comboChanged',    () => this.updateResources());
    EventBus.subscribe('buffApplied',     id  => this.showNotification(id));
    EventBus.subscribe('debuffApplied',   id  => this.showNotification(`Debuff: ${id}`));
    EventBus.subscribe('buildingBought',  ()  => this.updateBuildingsTab());
    EventBus.subscribe('skillBought',     ()  => this.updateSkillsTab());
    EventBus.subscribe('mysteryBox',      opts => this.showMysteryModal(opts));
  }

  // === Layout & Tabs ===

  createLayout() {
    // Ресурсы
    this.leftEl  = document.getElementById('resources-left');
    this.rightEl = document.getElementById('resources-right');
    
    // Таб-система
    this.createTabSystem();
    this.updateResources();
    this.updateActiveTab();

    // Toggle Buildings list
    document.getElementById('toggle-buildings').addEventListener('click', () => {
      const pnl = document.getElementById('buildings-list');
      pnl.style.display = pnl.style.display === 'block' ? 'none' : 'block';
      if (pnl.style.display === 'block') this.renderBuildings();
    });

    // Toggle Skills list
    document.getElementById('toggle-skills').addEventListener('click', () => {
      const pnl = document.getElementById('skills-list');
      pnl.style.display = pnl.style.display === 'block' ? 'none' : 'block';
      if (pnl.style.display === 'block') this.renderSkills();
    });

    // Info modal for buffs/debuffs
    document.getElementById('info-button').addEventListener('click', () => {
      this.showInfoModal();
    });
    // Close modals on backdrop click
    document.getElementById('info-modal').addEventListener('click', () =>
      document.getElementById('info-modal').classList.add('hidden')
    );
    document.getElementById('mystery-modal').addEventListener('click', () =>
      document.getElementById('mystery-modal').classList.add('hidden')
    );
  }

  createTabSystem() {
    if (document.querySelector('.tabs')) return;
    const gc = document.getElementById('game-container');
    const tc = document.createElement('div');
    tc.className = 'tabs';
    tc.innerHTML = `
      <button class="tab-btn active" data-tab="game">Game</button>
      <button class="tab-btn" data-tab="buildings">Buildings</button>
      <button class="tab-btn" data-tab="skills">Skills</button>
    `;
    gc.prepend(tc);
  }

  bindTabSwitching() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      }
    });
    // Delegate building/skill purchases inside tabs as before...
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('buy-building-btn')) {
        const id = e.target.dataset.building;
        this.state.buildingManager.buyBuilding(id);
      }
      if (e.target.classList.contains('buy-skill-btn')) {
        const id = e.target.dataset.skill;
        this.state.skillManager.buySkill(id);
      }
    });
  }

  updateActiveTab() {
    document.querySelectorAll('.tab-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === this.currentTab)
    );
    document.getElementById('gameCanvas').style.display       = this.currentTab === 'game' ? 'block' : 'none';
    document.getElementById('buildings-list').style.display   = this.currentTab === 'buildings' ? 'block' : 'none';
    document.getElementById('skills-list').style.display      = this.currentTab === 'skills' ? 'block' : 'none';
  }

  switchTab(tab) {
    this.currentTab = tab;
    this.updateActiveTab();
    if (tab === 'buildings') this.renderBuildings();
    if (tab === 'skills')    this.renderSkills();
  }

  updateBuildingsTab() {
    if (this.currentTab === 'buildings') this.renderBuildings();
  }

  updateSkillsTab() {
    if (this.currentTab === 'skills') this.renderSkills();
  }

  // === Resources Display & Tooltips ===

  updateResources() {
    ['left','right'].forEach(side => {
      const container = document.getElementById(`resources-${side}`);
      container.innerHTML = '';
      Object.entries(this.state.resources).forEach(([key, val]) => {
        const span = document.createElement('span');
        span.textContent = `${this.getEmoji(key)} ${Number(val).toFixed(1)}`;
        span.addEventListener('mouseenter', e => this.showTooltip(e, key));
        span.addEventListener('mouseleave',  () => this.hideTooltip());
        container.appendChild(span);
        container.appendChild(document.createElement('br'));
      });
    });
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

  // === Buildings & Skills Lists ===

  renderBuildings() {
    const pnl = document.getElementById('buildings-list');
    pnl.innerHTML = '';
    BUILDING_DEFS.forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'buy-building-btn';
      btn.dataset.building = b.id;
      btn.textContent = `${b.name} (${b.costText})`;
      btn.disabled = !this.state.buildingManager.canAfford(b.id);
      pnl.appendChild(btn);
    });
  }

  renderSkills() {
    const pnl = document.getElementById('skills-list');
    pnl.innerHTML = '';
    Object.entries(this.state.skillManager.getSkillsByCategory()).forEach(
      ([catId, skills]) => {
        const heading = document.createElement('h4');
        heading.textContent = SKILL_CATEGORIES[catId];
        pnl.appendChild(heading);
        skills.forEach(s => {
          const btn = document.createElement('button');
          btn.className = 'buy-skill-btn';
          btn.dataset.skill = s.id;
          btn.textContent = `${s.icon} ${s.name} (Lv.${s.currentLevel}/${s.maxLevel})`;
          btn.disabled = !s.canAfford;
          pnl.appendChild(btn);
        });
      }
    );
  }

  // === Buffs & Debuffs Info ===

  showInfoModal() {
    const m = document.getElementById('info-modal');
    m.innerHTML = `<h3>Buffs</h3>`;
    BUFF_DEFS.forEach(b => {
      const p = document.createElement('p');
      p.textContent = `${b.name} — ${b.description}`;
      m.appendChild(p);
    });
    m.appendChild(document.createElement('hr'));
    const hdr = document.createElement('h3');
    hdr.textContent = 'Debuffs';
    m.appendChild(hdr);
    DEBUFF_DEFS.forEach(d => {
      const p = document.createElement('p');
      p.textContent = `${d.name} — ${d.description}`;
      m.appendChild(p);
    });
    m.classList.remove('hidden');
  }

  showMysteryModal(opts) {
    const m = document.getElementById('mystery-modal');
    m.innerHTML = `<h3>📦 Mystery Box</h3>`;
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5`;
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        m.classList.add('hidden');
      });
      m.appendChild(btn);
    });
    m.classList.remove('hidden');
  }

  // === Save / Load / Reset ===

  bindSaveLoad() {
    document.getElementById('save-button').onclick = () => {
      const { featureMgr, buildingManager, skillManager, ...toSave } = this.state;
      prompt('Copy save-code:', btoa(JSON.stringify(toSave)));
    };
    document.getElementById('load-button').onclick = () => {
      const code = prompt('Paste save-code:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
        this.showNotification('Game loaded');
      } catch {
        this.showNotification('Invalid save code');
      }
    };
  }

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      if (confirm('Reset game?')) {
        localStorage.removeItem('gameState');
        EventBus.emit('gameReset');
      }
    };
  }

  // === Notifications ===

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    document.getElementById('notifications').appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}
