// featureManager.js
import { EventBus } from './eventBus.js';
import { Zone } from './zones.js';
import { ZONE_DEFS, UPGRADE_DEFS, ACHIEVEMENT_DEFS, CONFIG } from './config.js';

export class FeatureManager {
  constructor(state) {
    this.state = state;
    this.initZones();
    this.initUpgrades();
    this.initAchievements();
    this.applyOfflineEarnings();
  }
  initZones() {
    this.zones = ZONE_DEFS.map((def,i)=>new Zone(def,i));
    EventBus.subscribe('click', angle => {
      if (Date.now() < this.state.blockedUntil) return;
      const z = this.zones.find(z=>z.contains(angle,2*Math.PI));
      if(!z) return;
      if(z.def.type==='block') {
        this.state.blockedUntil = Date.now()+CONFIG.blockDuration;
        EventBus.emit('blocked',{until:this.state.blockedUntil});
      } else {
        this.state.score += z.def.score * this.state.clickValueBase;
        this.state.totalClicks++;
        EventBus.emit('scored',{gain:z.def.score});
      }
    });
  }
  initUpgrades() {
    this.upgrades = UPGRADE_DEFS.map(def=>({
      def, level:0,
      cost: def.baseCost
    }));
    EventBus.subscribe('purchase', id=>{
      const u = this.upgrades.find(x=>x.def.id===id);
      if(this.state.score>=u.cost){
        this.state.score-=u.cost;
        u.level++;
        u.cost = Math.floor(u.def.baseCost*Math.pow(u.def.costMultiplier,u.level));
        u.def.apply(this.state,u.level);
        EventBus.emit('upgradeApplied',{id,level:u.level,cost:u.cost});
      }
    });
  }
  initAchievements() {
    this.achievements = ACHIEVEMENT_DEFS.map(def=>({...def, unlocked:false}));
    EventBus.subscribe('scored',()=>this.checkAchievements());
    EventBus.subscribe('upgradeApplied',()=>this.checkAchievements());
  }
  checkAchievements() {
    this.achievements.forEach(a=>{
      if(!a.unlocked && a.condition(this.state)) {
        a.unlocked = true;
        EventBus.emit('achievementUnlocked',{id:a.id,name:a.name});
      }
    });
  }
  applyOfflineEarnings() {
    const now = Date.now();
    const diffH = (now - this.state.lastTimestamp)/3600000;
    const earn = diffH * this.state.passive.amount * CONFIG.offlineRate;
    this.state.score += earn;
    this.state.lastTimestamp = now;
  }
}