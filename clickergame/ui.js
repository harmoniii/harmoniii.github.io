// ui.js
import { EventBus }  from './eventBus.js';
import { saveState } from './storage.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.createLayout();
    this.bindSaveLoad();
    this.bindReset();

    EventBus.subscribe('resourceChanged', ()=>this.updateResources());
    EventBus.subscribe('comboChanged',    ()=>this.updateResources());
    EventBus.subscribe('buffApplied',     id=>this.showNotification(`Buff: ${id}`));
    EventBus.subscribe('debuffApplied',   id=>this.showNotification(`Debuff: ${id}`));

    setInterval(() => saveState(this.state), 5000);
  }

  createLayout() {
    // контейнеры
    this.leftEl  = document.getElementById('resources-left');
    this.rightEl = document.getElementById('resources-right');
    this.updateResources();
  }

  updateResources() {
    const r = this.state.resources;
    // первые 6
    this.leftEl.innerHTML = 
      `🪙 ${r.gold}<br>🌲 ${r.wood}<br>🪨 ${r.stone}<br>🍞 ${r.food}<br>💧 ${r.water}<br>⚙️ ${r.iron}`;
    // остальные + комбо
    this.rightEl.innerHTML = 
      `👥 ${r.people}<br>🔋 ${r.energy}<br>🧠 ${r.science}<br>✝️ ${r.faith}<br>☠️ ${r.chaos}<br>Combo: ${this.state.combo.count}`;
  }

  bindSaveLoad() {
    document.getElementById('save-button').onclick = () => {
      const { featureMgr,...toSave } = this.state;
      prompt('Copy save-code:', btoa(JSON.stringify(toSave)));
    };
    document.getElementById('load-button').onclick = () => {
      const code = prompt('Paste save-code:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
      } catch {
        alert('Invalid');
      }
    };
  }

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      if(confirm('Reset?')) {
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
    setTimeout(()=>div.remove(),3000);
  }
}
