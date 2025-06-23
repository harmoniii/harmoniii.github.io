// ui.js
import { EventBus } from './eventBus.js';
import { FeatureManager } from './featureManager.js';
import { UPGRADE_DEFS, LOCALES } from './config.js';

export class UIManager {
  constructor(state) {
    this.state=state;
    this.locale = LOCALES['en'];
    this.createScore();
    this.createUpgrades();
    this.createAchievements();
    this.createBlockOverlay();
    this.createNotifications();
    this.bindReset();
    EventBus.subscribe('scored',()=>this.updateScore());
    EventBus.subscribe('upgradeApplied',()=>this.updateUpgrades());
    EventBus.subscribe('achievementUnlocked',data=>this.showAchievement(data));
    EventBus.subscribe('blocked',()=>this.showBlock());
  }
  createScore() {
    this.scoreEl = document.getElementById('score-container');
    this.updateScore();
  }
  updateScore() {
    this.scoreEl.textContent = `${this.locale.score}: ${Math.floor(this.state.score)}`;
  }
  createUpgrades() {
    this.upgContainer=document.getElementById('upgrades-container');
    this.buttons = {};
    UPGRADE_DEFS.forEach(def=>{
      const btn = document.createElement('button');
      btn.className='upgrade-button';
      btn.id=def.id;
      btn.onclick=()=>EventBus.emit('purchase',def.id);
      this.upgContainer.append(btn);
      this.buttons[def.id]=btn;
    });
    this.updateUpgrades();
  }
  updateUpgrades() {
    Object.values(this.buttons).forEach(btn=>{
      const id=btn.id;
      const up = this.state.featureMgr.upgrades.find(u=>u.def.id===id);
      btn.textContent = `(${up.level}) ${up.def.name}: ${up.cost}`;
      btn.disabled = this.state.score<up.cost;
      btn.classList.toggle('disabled',btn.disabled);
    });
    this.updateScore();
  }
  createAchievements() {
    this.achContainer=document.getElementById('achievements-container');
  }
  showAchievement({name}) {
    const div=document.createElement('div');
    div.className='achievement-item';
    div.textContent=`Achievement: ${name}`;
    this.achContainer.append(div);
    this.showNotification(`Unlocked: ${name}`);
  }
  createBlockOverlay() {
    this.overlay=document.getElementById('block-overlay');
    this.timerEl=document.getElementById('block-timer');
  }
  showBlock() {
    this.overlay.style.display='flex';
    const update = ()=>{
      const rem = Math.ceil((this.state.blockedUntil-Date.now())/1000);
      if(rem>0) {
        this.timerEl.textContent=`${this.locale.block}: ${rem}s`;
        requestAnimationFrame(update);
      } else {
        this.overlay.style.display='none';
      }
    };
    update();
  }
  createNotifications() {
    this.notifContainer=document.getElementById('notifications');
  }
  showNotification(msg) {
    const div=document.createElement('div');
    div.className='notification';
    div.textContent=msg;
    this.notifContainer.append(div);
    setTimeout(()=>this.notifContainer.removeChild(div),3000);
  }
  bindReset() {
    document.getElementById('reset-button').onclick=()=>{
      localStorage.clear();
      location.reload();
    };
  }
}