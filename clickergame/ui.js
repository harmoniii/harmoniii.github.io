// ui.js
import { EventBus }   from './eventBus.js';
import { saveState }  from './storage.js';

export default class UIManager {
  constructor(state) {
    this.state = state;

    this.createResourceDisplay();
    this.bindSaveLoad();
    this.bindReset();

    EventBus.subscribe('resourceChanged', ()=> this.updateResources());
    EventBus.subscribe('comboChanged',    ()=> this.updateResources());
    EventBus.subscribe('buffApplied',     id => this.showNotification(`Buff: ${id}`));
    EventBus.subscribe('debuffApplied',   id => this.showNotification(`Debuff: ${id}`));

    // автосохранение
    setInterval(() => saveState(this.state), 5000);
  }

  createResourceDisplay() {
    this.resEl = document.getElementById('score-container');
    this.updateResources();
  }

  updateResources() {
    const r = this.state.resources;
    this.resEl.textContent =
      `🪙 ${r.gold} | 🌲 ${r.wood} | 🪨 ${r.stone} | 🍞 ${r.food} | 💧 ${r.water} | ` +
      `⚙️ ${r.iron} | 👥 ${r.people} | 🔋 ${r.energy} | 🧠 ${r.science} | ` +
      `✝️ ${r.faith} | ☠️ ${r.chaos} | Combo: ${this.state.combo.count}`;
  }

  bindSaveLoad() {
    document.getElementById('save-button').onclick = () => {
      const { featureMgr, ...toSave } = this.state;
      const hash = btoa(JSON.stringify(toSave));
      prompt('Copy your save-code:', hash);
    };
    document.getElementById('load-button').onclick = () => {
      const code = prompt('Paste your save-code:');
      try {
        const loaded = JSON.parse(atob(code));
        Object.assign(this.state, loaded);
        EventBus.emit('gameReset');
      } catch {
        alert('Invalid code');
      }
    };
  }

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      if (confirm('Are you sure?')) {
        localStorage.removeItem('gameState');
        EventBus.emit('gameReset');
      }
    };
  }

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    document.getElementById('notifications').append(div);
    setTimeout(() => div.remove(), 3000);
  }
}
