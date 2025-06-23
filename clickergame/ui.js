// ui.js
import { EventBus } from './eventBus.js';
import { UPGRADE_DEFS, SKILL_TREE_DEFS, LOCALES } from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.locale = LOCALES['en'];
    this.createScore();
    this.createUpgrades();
    this.createAchievements();
    this.createSkills();
    this.createBlockOverlay();
    this.createNotifications();
    this.bindReset();

    EventBus.subscribe('scored', () => this.updateScore());
    EventBus.subscribe('upgradeApplied', () => this.updateUpgrades());
    EventBus.subscribe('achievementUnlocked', data => this.showAchievement(data));
    EventBus.subscribe('skillPointsChanged', () => this.updateSkills());
    EventBus.subscribe('skillPurchased', () => this.showNotification('Skill Learned!'));
    EventBus.subscribe('blocked', () => this.showBlock());
    EventBus.subscribe('zonesShuffled', () => this.showNotification('Zones Shuffled'));
  }

  createScore() {
    this.scoreEl = document.getElementById('score-container');
    this.updateScore();
  }
  updateScore() {
    this.scoreEl.textContent = `${this.locale.score}: ${Math.floor(this.state.score)}`;
  }

  createUpgrades() {
    this.upgContainer = document.getElementById('upgrades-container');
    this.upgradeButtons = {};
    UPGRADE_DEFS.forEach(def => {
      const btn = document.createElement('button');
      btn.className = 'upgrade-button';
      btn.id = def.id;
      btn.onclick = () => EventBus.emit('purchase', def.id);
      this.upgContainer.append(btn);
      this.upgradeButtons[def.id] = btn;
    });
    this.updateUpgrades();
  }
  updateUpgrades() {
    Object.values(this.upgradeButtons).forEach(btn => {
      const up = this.state.featureMgr.upgrades.find(u => u.def.id === btn.id);
      btn.textContent = `(${up.level}) ${up.def.name}: ${up.cost}`;
      const disabled = this.state.score < up.cost;
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    });
    this.updateScore();
  }

  createAchievements() {
    this.achContainer = document.getElementById('achievements-container');
  }
  showAchievement({ name }) {
    const item = document.createElement('div');
    item.className = 'achievement-item';
    item.textContent = `Achievement: ${name}`;
    this.achContainer.append(item);
    this.showNotification(`Unlocked: ${name}`);
  }

  createSkills() {
    this.skillsContainer = document.getElementById('levels-container');
    this.spEl = document.createElement('div');
    this.spEl.id = 'skill-points';
    this.skillsContainer.append(this.spEl);
    this.skillButtons = {};
    SKILL_TREE_DEFS.forEach(def => {
      const btn = document.createElement('button');
      btn.className = 'level-item';
      btn.id = def.id;
      btn.onclick = () => EventBus.emit('skillPurchase', def.id);
      this.skillsContainer.append(btn);
      this.skillButtons[def.id] = btn;
    });
    this.updateSkills();
  }
  updateSkills() {
    this.spEl.textContent = `${this.locale.skillPoints}: ${this.state.skillPoints}`;
    Object.values(this.skillButtons).forEach(btn => {
      const sk = this.state.featureMgr.skills.find(s => s.id === btn.id);
      btn.textContent = `${sk.name} (cost: ${sk.cost})`;
      const disabled = sk.purchased || this.state.skillPoints < sk.cost;
      btn.disabled = disabled;
      btn.classList.toggle('disabled', disabled);
    });
  }

  createBlockOverlay() {
    this.overlay = document.getElementById('block-overlay');
    this.timerEl = document.getElementById('block-timer');
  }
  showBlock() {
    this.overlay.style.display = 'flex';
    const update = () => {
      const rem = Math.ceil((this.state.blockedUntil - Date.now()) / 1000);
      if (rem > 0) {
        this.timerEl.textContent = `${this.locale.block}: ${rem}s`;
        requestAnimationFrame(update);
      } else {
        this.overlay.style.display = 'none';
      }
    };
    update();
  }

  createNotifications() {
    this.notifContainer = document.getElementById('notifications');
  }
  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    this.notifContainer.append(div);
    setTimeout(() => {
      if (this.notifContainer.contains(div)) this.notifContainer.removeChild(div);
    }, 3000);
  }

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      localStorage.removeItem('gameState');
      window.location.reload();
    };
  }
}
