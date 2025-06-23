// ui.js
import { EventBus } from './eventBus.js';
import { UPGRADE_DEFS, SKILL_TREE_DEFS, LOCALES } from './config.js';

export class UIManager {
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
    EventBus.subscribe('skillPurchased', data => this.showNotification('Skill Learned!'));
    EventBus.subscribe('blocked', () => this.showBlock());
  }

  // ... other methods remain the same ...

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      localStorage.clear();
      window.location.reload();
    };
  }
}
