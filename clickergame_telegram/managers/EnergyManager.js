// managers/EnergyManager.js - ИСПРАВЛЕНО: правильное сохранение/загрузка энергии
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class EnergyManager extends CleanupMixin {
    constructor(gameState) {
        super();
        
        this.gameState = gameState;
        this.regenInterval = null;
        
        this.initializeEnergy();
        this.startRegeneration();
        this.bindEvents();
    }

    initializeEnergy() {
        if (!this.gameState.energy) {
            this.gameState.energy = {
                current: GAME_CONSTANTS.INITIAL_ENERGY,
                max: GAME_CONSTANTS.INITIAL_MAX_ENERGY,
                lastRegenTime: Date.now(),
                totalConsumed: 0,
                totalRegenerated: 0
            };
        }
        
        this.validateEnergyValues();
    }

    validateEnergyValues() {
        const energy = this.gameState.energy;
        
        energy.current = Math.max(0, Math.floor(energy.current || 0));
        energy.max = Math.max(GAME_CONSTANTS.INITIAL_MAX_ENERGY, Math.floor(energy.max || GAME_CONSTANTS.INITIAL_MAX_ENERGY));
        energy.current = Math.min(energy.current, this.getEffectiveMaxEnergy());
        energy.totalConsumed = Math.max(0, energy.totalConsumed || 0);
        energy.totalRegenerated = Math.max(0, energy.totalRegenerated || 0);
        
        if (!energy.lastRegenTime || typeof energy.lastRegenTime !== 'number') {
            energy.lastRegenTime = Date.now();
        }
    }

    startRegeneration() {
        if (this.regenInterval) {
            this.cleanupManager.clearInterval(this.regenInterval);
        }
        
        this.regenInterval = this.createInterval(() => {
            this.regenerateEnergy();
        }, GAME_CONSTANTS.REGEN_INTERVAL, 'energy-regeneration');
    }

    bindEvents() {
        eventBus.subscribe(GameEvents.CLICK, (data) => {
            this.handleClickEnergyCost(data);
        });

        eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
            this.updateMaxEnergy();
        });

        eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
            this.updateMaxEnergy();
        });
    }

    handleClickEnergyCost(clickData) {
        const cost = this.getClickEnergyCost();
        
        if (this.gameState.energy.current < cost) {
            this.handleInsufficientEnergy();
            return false;
        }
        
        this.consumeEnergy(cost);
        return true;
    }

getClickEnergyCost() {
  let cost = GAME_CONSTANTS.CLICK_COST;
  
  // Energy Efficiency skill с убывающей отдачей
  const efficiencyLevel = this.getSkillLevel('energyEfficiency');
  let reduction = 0;
  
  if (GAME_CONSTANTS.SKILL_DIMINISHING_RETURNS) {
    // Убывающая отдача: первый уровень дает больше
    for (let i = 1; i <= efficiencyLevel; i++) {
      reduction += GAME_CONSTANTS.EFFICIENCY_REDUCTION * Math.pow(0.7, i - 1);
    }
  } else {
    reduction = efficiencyLevel * GAME_CONSTANTS.EFFICIENCY_REDUCTION;
  }
  
  cost *= (1 - Math.min(0.6, reduction)); // максимум 60% снижение
  
  // Energy Parasite debuff
  if (this.gameState.effectStates?.energyParasiteActive) {
    cost *= 2;
  }
  
  return Math.max(0.2, Math.ceil(cost * 10) / 10); // минимум 0.2 энергии
}

    consumeEnergy(amount) {
        const oldEnergy = this.gameState.energy.current;
        this.gameState.energy.current = Math.max(0, this.gameState.energy.current - amount);
        this.gameState.energy.totalConsumed += amount;
        
        const actualConsumed = oldEnergy - this.gameState.energy.current;
        
        eventBus.emit(GameEvents.ENERGY_CHANGED, {
            current: this.gameState.energy.current,
            max: this.getEffectiveMaxEnergy(),
            consumed: actualConsumed,
            percentage: this.getEnergyPercentage()
        });
        
        if (this.gameState.energy.current <= GAME_CONSTANTS.PULSE_THRESHOLD) {
            eventBus.emit(GameEvents.ENERGY_CRITICAL);
        }
    }

restoreEnergy(amount, source = 'unknown') {
  const oldEnergy = this.gameState.energy.current;
  const maxEnergy = this.getEffectiveMaxEnergy();
  
  // Ограничиваем восстановление в зависимости от источника
  let cappedAmount = amount;
  switch (source) {
    case 'energy_zone':
      cappedAmount = Math.min(amount, 10); // не больше 10 за клик
      break;
    case 'energy_pack':
      cappedAmount = Math.min(amount, 50); // не больше 50 за пак
      break;
    case 'regeneration':
      // Регенерация не ограничивается
      break;
    default:
      cappedAmount = Math.min(amount, 25); // общий лимит
  }
  
  this.gameState.energy.current = Math.min(maxEnergy, this.gameState.energy.current + cappedAmount);
  this.gameState.energy.totalRegenerated += cappedAmount;
  
  const actualRestored = this.gameState.energy.current - oldEnergy;
  
  eventBus.emit(GameEvents.ENERGY_CHANGED, {
    current: this.gameState.energy.current,
    max: maxEnergy,
    restored: actualRestored,
    source: source,
    percentage: this.getEnergyPercentage()
  });

  if (actualRestored > 0 && source !== 'regeneration') {
    eventBus.emit(GameEvents.NOTIFICATION, `⚡ +${actualRestored} Energy`);
  }
}

    regenerateEnergy() {
        const now = Date.now();
        const timeSinceLastRegen = now - this.gameState.energy.lastRegenTime;
        
        const regenCycles = Math.floor(timeSinceLastRegen / GAME_CONSTANTS.REGEN_INTERVAL);
        
        if (regenCycles > 0) {
            const effectiveRegen = this.getEffectiveRegenRate() * regenCycles;
            
            this.restoreEnergy(effectiveRegen, 'regeneration');
            this.gameState.energy.lastRegenTime = now;
        }
    }

getEffectiveRegenRate() {
  let regen = GAME_CONSTANTS.BASE_REGEN_RATE;
  
  // Generator building bonus - с убывающей отдачей
  const generatorLevel = this.getBuildingLevel('generator');
  if (generatorLevel > 0) {
    let generatorBonus = 0;
    for (let i = 1; i <= generatorLevel; i++) {
      generatorBonus += GAME_CONSTANTS.GENERATOR_REGEN_BONUS * Math.pow(0.8, i - 1);
    }
    regen *= (1 + generatorBonus);
  }
  
  // Energy Mastery skill - с убывающей отдачей
  const masteryLevel = this.getSkillLevel('energyMastery');
  if (masteryLevel > 0) {
    let masteryBonus = 0;
    for (let i = 1; i <= masteryLevel; i++) {
      masteryBonus += GAME_CONSTANTS.MASTERY_REGEN_BONUS * Math.pow(0.75, i - 1);
    }
    regen *= (1 + masteryBonus);
  }
  
  // Ограничиваем максимальную регенерацию
  const maxRegen = GAME_CONSTANTS.BASE_REGEN_RATE * 3; // не больше 3x базовой
  
  return Math.min(maxRegen, Math.max(0.1, regen));
}

getEffectiveMaxEnergy() {
  let maxEnergy = this.gameState.energy.max;
  
  // Generator building bonus - с убывающей отдачей
  const generatorLevel = this.getBuildingLevel('generator');
  if (generatorLevel > 0) {
    let generatorBonus = 0;
    for (let i = 1; i <= generatorLevel; i++) {
      generatorBonus += GAME_CONSTANTS.GENERATOR_MAX_ENERGY_BONUS * Math.pow(0.9, i - 1);
    }
    maxEnergy += Math.floor(generatorBonus);
  }
  
  // Power Storage skill - с убывающей отдачей
  const storageLevel = this.getSkillLevel('powerStorage');
  if (storageLevel > 0) {
    let storageBonus = 0;
    for (let i = 1; i <= storageLevel; i++) {
      storageBonus += GAME_CONSTANTS.STORAGE_MAX_BONUS * Math.pow(0.8, i - 1);
    }
    maxEnergy += Math.floor(storageBonus);
  }
  
  // Ограничиваем максимальную энергию
  const absoluteMax = GAME_CONSTANTS.INITIAL_MAX_ENERGY * 4; // не больше 4x начальной
  
  return Math.min(absoluteMax, Math.max(GAME_CONSTANTS.INITIAL_MAX_ENERGY, maxEnergy));
}

    updateMaxEnergy() {
        const newMaxEnergy = this.getEffectiveMaxEnergy();
        
        if (newMaxEnergy > this.gameState.energy.max) {
            const energyBonus = newMaxEnergy - this.gameState.energy.max;
            this.gameState.energy.max = newMaxEnergy;
            this.restoreEnergy(energyBonus, 'max_energy_increase');
        } else {
            this.gameState.energy.max = newMaxEnergy;
        }
        
        this.gameState.energy.current = Math.min(this.gameState.energy.current, newMaxEnergy);
    }

    handleInsufficientEnergy() {
        eventBus.emit(GameEvents.ENERGY_INSUFFICIENT, {
            current: this.gameState.energy.current,
            required: this.getClickEnergyCost(),
            timeToNext: this.getTimeToNextRegen()
        });
        
        eventBus.emit(GameEvents.NOTIFICATION, '⚡ Not enough energy to click!');
    }

    getTimeToNextRegen() {
        const now = Date.now();
        const timeSinceLastRegen = now - this.gameState.energy.lastRegenTime;
        return Math.max(0, GAME_CONSTANTS.REGEN_INTERVAL - timeSinceLastRegen);
    }

    getEnergyPercentage() {
        const maxEnergy = this.getEffectiveMaxEnergy();
        return maxEnergy > 0 ? (this.gameState.energy.current / maxEnergy) * 100 : 0;
    }

    canClick() {
        const cost = this.getClickEnergyCost();
        return this.gameState.energy.current >= cost;
    }

    useEnergyPack() {
        this.restoreEnergy(GAME_CONSTANTS.ENERGY_PACK_RESTORE, 'energy_pack');
        eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy Pack used! +${GAME_CONSTANTS.ENERGY_PACK_RESTORE} Energy`);
    }

    restoreFromEnergyZone() {
        this.restoreEnergy(GAME_CONSTANTS.ENERGY_ZONE_RESTORE, 'energy_zone');
    }

    restoreFromGoldZone() {
        this.restoreEnergy(GAME_CONSTANTS.GOLD_ZONE_RESTORE, 'gold_zone');
    }

    getBuildingLevel(buildingId) {
        if (!this.gameState.buildings || !this.gameState.buildings[buildingId]) {
            return 0;
        }
        return this.gameState.buildings[buildingId].level || 0;
    }

    getSkillLevel(skillId) {
        if (!this.gameState.skills || !this.gameState.skills[skillId]) {
            return 0;
        }
        return this.gameState.skills[skillId].level || 0;
    }

    getEnergyInfo() {
        const percentage = this.getEnergyPercentage();
        const maxEnergy = this.getEffectiveMaxEnergy();
        
        return {
            current: this.gameState.energy.current,
            max: maxEnergy,
            percentage: percentage,
            canClick: this.canClick(),
            clickCost: this.getClickEnergyCost(),
            regenRate: this.getEffectiveRegenRate(),
            timeToNext: this.getTimeToNextRegen(),
            status: this.getEnergyStatus()
        };
    }

    getEnergyStatus() {
        const percentage = this.getEnergyPercentage();
        
        if (percentage <= GAME_CONSTANTS.CRITICAL_THRESHOLD) {
            return 'critical';
        } else if (percentage <= GAME_CONSTANTS.WARNING_THRESHOLD) {
            return 'warning';
        } else {
            return 'normal';
        }
    }

    forceUpdate() {
        this.validateEnergyValues();
        this.updateMaxEnergy();
        this.regenerateEnergy();
        
        eventBus.emit(GameEvents.ENERGY_CHANGED, {
            current: this.gameState.energy.current,
            max: this.getEffectiveMaxEnergy(),
            percentage: this.getEnergyPercentage()
        });
    }

    getSaveData() {
        return {
            current: this.gameState.energy.current,
            max: this.gameState.energy.max,
            lastRegenTime: this.gameState.energy.lastRegenTime,
            totalConsumed: this.gameState.energy.totalConsumed,
            totalRegenerated: this.gameState.energy.totalRegenerated
        };
    }

    // ИСПРАВЛЕНИЕ: Правильная загрузка данных энергии без перезаписи
    loadSaveData(data) {
        if (data && typeof data === 'object') {
            console.log('⚡ Loading energy data:', data);
            
            // Загружаем энергию с валидацией
            this.gameState.energy = {
                current: Math.max(0, Math.floor(data.current || GAME_CONSTANTS.INITIAL_ENERGY)),
                max: Math.max(GAME_CONSTANTS.INITIAL_MAX_ENERGY, Math.floor(data.max || GAME_CONSTANTS.INITIAL_MAX_ENERGY)),
                lastRegenTime: data.lastRegenTime || Date.now(),
                totalConsumed: Math.max(0, data.totalConsumed || 0),
                totalRegenerated: Math.max(0, data.totalRegenerated || 0)
            };
            
            // ИСПРАВЛЕНИЕ: НЕ вызываем validateEnergyValues, которая сбрасывает значения
            // Вместо этого делаем только базовую валидацию
            this.gameState.energy.current = Math.min(this.gameState.energy.current, this.getEffectiveMaxEnergy());
            
            console.log('✅ Energy loaded:', this.gameState.energy);
            
            // Уведомляем об изменении энергии
            this.forceUpdate();
        }
    }

    destroy() {
        if (this.regenInterval) {
            this.cleanupManager.clearInterval(this.regenInterval);
            this.regenInterval = null;
        }
        
        super.destroy();
    }
}