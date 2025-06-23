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
    
    // Подписываемся на событие покупки навыка, чтобы пересоздать зоны
    EventBus.subscribe('skillPurchased', (data) => {
      if (data.id === 'removeBlock') {
        this.initZones(); // Пересоздаем зоны после покупки навыка удаления блоков
        EventBus.emit('zonesRecreated');
      }
    });
  }

  initZones() {
    // Очищаем старые подписки на клики, если они есть
    if (this.clickHandler) {
      EventBus._handlers.click = (EventBus._handlers.click || []).filter(h => h !== this.clickHandler);
    }
    
    const defs = (this.state.flags && this.state.flags.removeBlock)
      ? ZONE_DEFS.filter(d => d.type !== 'block')
      : ZONE_DEFS;
    const resolvedDefs = defs.map(def => def.generate ? def.generate() : def);
    this.zones = defs.map((def, i) => new Zone(def, i, defs.length));
    
    // Сохраняем ссылку на обработчик для последующего удаления
    this.clickHandler = (angle) => {
      if (Date.now() < this.state.blockedUntil) return;
      const z = this.zones.find(z => z.contains(angle));
      if (!z) return;
      if (z.def.type === 'block') {
        this.state.blockedUntil = Date.now() + CONFIG.blockDuration;
        EventBus.emit('blocked', { until: this.state.blockedUntil });
      } else {
        this.state.score += z.def.score * this.state.clickValueBase;
        this.state.totalClicks++;
        EventBus.emit('scored', { gain: z.def.score });
      }
      this.shuffleZones();
      EventBus.emit('zonesShuffled');
    };
    
    EventBus.subscribe('click', this.clickHandler);
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
    // Восстанавливаем состояние улучшений из сохраненного состояния
    this.upgrades = UPGRADE_DEFS.map(def => {
      const saved = this.state.upgrades && this.state.upgrades[def.id];
      return saved ? { def, ...saved } : { def, level: 0, cost: def.baseCost };
    });
    EventBus.subscribe('purchase', id => {
      const u = this.upgrades.find(x => x.def.id === id);
      if (this.state.score >= u.cost) {
        this.state.score -= u.cost;
        u.level++;
        u.cost = Math.floor(u.def.baseCost * Math.pow(u.def.costMultiplier, u.level));
        u.def.apply(this.state, u.level);
        if (id === 'passiveIncome') {
          this.state.lastPassiveTick = Date.now();
        }
        EventBus.emit('upgradeApplied', { id, level: u.level, cost: u.cost });
        
        // Сохраняем состояние улучшений
        this.state.upgrades = this.state.upgrades || {};
        this.state.upgrades[id] = { level: u.level, cost: u.cost };
      }
    });
    
    // Применяем сохраненные улучшения при загрузке
    this.upgrades.forEach(u => {
      if (u.level > 0) {
        u.def.apply(this.state, u.level);
      }
    });
  }

  initAchievements() {
    // Восстанавливаем состояние достижений из сохраненного состояния
    this.achievements = ACHIEVEMENT_DEFS.map(def => {
      const saved = this.state.achievements && this.state.achievements[def.id];
      return { ...def, unlocked: saved ? saved.unlocked : false };
    });
    
    // Подписываемся на события для проверки достижений
    EventBus.subscribe('scored', () => this.checkAchievements());
    EventBus.subscribe('upgradeApplied', () => this.checkAchievements());
    
    // Проверяем достижения при инициализации (для загруженного состояния)
    this.checkAchievements();
  }

  checkAchievements() {
    this.achievements.forEach(a => {
      if (!a.unlocked && a.condition(this.state)) {
        a.unlocked = true;
        
        // Сохраняем состояние достижений
        this.state.achievements = this.state.achievements || {};
        this.state.achievements[a.id] = { unlocked: true };
        
        EventBus.emit('achievementUnlocked', { id: a.id, name: a.name });
      }
    });
  }

  initSkills() {
    // Восстанавливаем состояние навыков из сохраненного состояния
    this.skills = SKILL_TREE_DEFS.map(def => {
      const saved = this.state.skills && this.state.skills[def.id];
      return { ...def, purchased: saved ? saved.purchased : false };
    });
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
        
        // Сохраняем состояние навыков
        this.state.skills = this.state.skills || {};
        this.state.skills[id] = { purchased: true };
        
        EventBus.emit('skillPurchased', { id });
        EventBus.emit('skillPointsChanged', this.state.skillPoints);
      }
    });
    
    // Применяем сохраненные навыки при загрузке
    this.skills.forEach(sk => {
      if (sk.purchased) {
        sk.apply(this.state);
      }
    });
  }

  applyOfflineEarnings() {
    const now = Date.now();
    const diffH = (now - this.state.lastTimestamp) / 3600000;
    // Исправляем: проверяем что passive.amount больше 0 перед начислением
    if (this.state.passive.amount > 0) {
      const earn = diffH * this.state.passive.amount * CONFIG.offlineRate;
      this.state.score += earn;
      if (earn > 0) {
        EventBus.emit('offlineEarnings', { amount: earn });
      }
    }
    this.state.lastTimestamp = now;
  }
}