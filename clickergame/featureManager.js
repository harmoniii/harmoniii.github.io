// featureManager.js
import { EventBus } from './eventBus.js';
import { Zone } from './zones.js';
import { ZONE_DEFS, UPGRADE_DEFS, ACHIEVEMENT_DEFS, SKILL_TREE_DEFS, CONFIG } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.initZones();
    this.initUpgrades();
    this.initAchievements();
    this.initSkills();
    this.applyOfflineEarnings();
  }

  initZones() {
    const defs = this.state.flags.removeBlock
      ? ZONE_DEFS.filter(d => d.type !== 'block')
      : ZONE_DEFS;
    this.zones = defs.map((def, i) => new Zone(def, i));
    EventBus.subscribe('click', angle => {
      if (Date.now() < this.state.blockedUntil) return;
      const z = this.zones.find(z => z.contains(angle, 2 * Math.PI));
      if (!z) return;
      if (z.def.type === 'block') {
        this.state.blockedUntil = Date.now() + CONFIG.blockDuration;
        EventBus.emit('blocked', { until: this.state.blockedUntil });
      } else {
        this.state.score += z.def.score * this.state.clickValueBase;
        this.state.totalClicks++;
        EventBus.emit('scored', { gain: z.def.score });
      }
      // Shuffle zones after each click
      this.shuffleZones();
      EventBus.emit('zonesShuffled');
    });
  }

  shuffleZones() {
    const arr = this.zones;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    arr.forEach((z, i) => (z.index = i));
  }

  initUpgrades() {
    this.upgrades = UPGRADE_DEFS.map(def => ({ def, level: 0, cost: def.baseCost }));
    EventBus.subscribe('purchase', id => {
      const u = this.upgrades.find(x => x.def.id === id);
      if (this.state.score >= u.cost) {
        this.state.score -= u.cost;
        u.level++;
        u.cost = Math.floor(u.def.baseCost * Math.pow(u.def.costMultiplier, u.level));
        u.def.apply(this.state, u.level);
        EventBus.emit('upgradeApplied', { id, level: u.level, cost: u.cost });
      }
    });
  }

  initAchievements() {
    this.achievements = ACHIEVEMENT_DEFS.map(def => ({ ...def, unlocked: false }));
    EventBus.subscribe('scored', () => this.checkAchievements());
    EventBus.subscribe('upgradeApplied', () => this.checkAchievements());
  }

  checkAchievements() {
    this.achievements.forEach(a => {
      if (!a.unlocked && a.condition(this.state)) {
        a.unlocked = true;
        EventBus.emit('achievementUnlocked', { id: a.id, name: a.name });
      }
    });
  }

  initSkills() {
    this.skills = SKILL_TREE_DEFS.map(def => ({ ...def, purchased: false }));
    EventBus.subscribe('achievementUnlocked', () => {
      this.state.skillPoints++;
      EventBus.emit('skillPointsChanged', this.state.skillPoints);
    });
    EventBus.subscribe('skillPurchase', id => {
      const sk = this.skills.find(s => s.id === id);
      if (!sk.purchased && this.state.skillPoints >= sk.cost) {
        this.state.skillPoints -= sk.cost;
        sk.purchased = true;
        sk.apply(this.state);
        EventBus.emit('skillPurchased', { id });
        EventBus.emit('skillPointsChanged', this.state.skillPoints);
      }
    });
  }

  applyOfflineEarnings() {
    const now = Date.now();
    const diffH = (now - this.state.lastTimestamp) / 3600000;
    const earn = diffH * this.state.passive.amount * CONFIG.offlineRate;
    this.state.score += earn;
    this.state.lastTimestamp = now;
  }
}
