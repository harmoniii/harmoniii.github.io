// managers/EnergyManager.js - ИСПРАВЛЕНО: правильное сохранение/загрузка энергии
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export const ENERGY_CONSTANTS = {
    INITIAL_ENERGY: 100,
    INITIAL_MAX_ENERGY: 100,
    BASE_REGEN_RATE: 1,
    REGEN_INTERVAL: 15000, // 15 секунд
    CLICK_COST: 1,
    
    // Зоны
    ENERGY_ZONE_RESTORE: 1,
    GOLD_ZONE_RESTORE: 4,
    
    // Здания
    GENERATOR_MAX_ENERGY_BONUS: 10,
    GENERATOR_REGEN_BONUS: 0.5,
    
    // Навыки
    EFFICIENCY_REDUCTION: 0.25,
    MASTERY_REGEN_BONUS: 1.0,
    STORAGE_MAX_BONUS: 50,
    
    // Предметы
    ENERGY_PACK_RESTORE: 50,
    
    // Пороги
    WARNING_THRESHOLD: 20,
    CRITICAL_THRESHOLD: 10,
    PULSE_THRESHOLD: 10
};

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
                current: ENERGY_CONSTANTS.INITIAL_ENERGY,
                max: ENERGY_CONSTANTS.INITIAL_MAX_ENERGY,
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
        energy.max = Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, Math.floor(energy.max || ENERGY_CONSTANTS.INITIAL_MAX_ENERGY));
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
        }, ENERGY_CONSTANTS.REGEN_INTERVAL, 'energy-regeneration');
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
        let cost = ENERGY_CONSTANTS.CLICK_COST;
        
        // Energy Efficiency skill
        const efficiencyLevel = this.getSkillLevel('energyEfficiency');
        const reduction = efficiencyLevel * ENERGY_CONSTANTS.EFFICIENCY_REDUCTION;
        cost *= (1 - Math.min(0.75, reduction));
        
        return Math.max(0.1, Math.ceil(cost * 10) / 10);
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
        
        if (this.gameState.energy.current <= ENERGY_CONSTANTS.PULSE_THRESHOLD) {
            eventBus.emit(GameEvents.ENERGY_CRITICAL);
        }
    }

    restoreEnergy(amount, source = 'unknown') {
        const oldEnergy = this.gameState.energy.current;
        const maxEnergy = this.getEffectiveMaxEnergy();
        
        this.gameState.energy.current = Math.min(maxEnergy, this.gameState.energy.current + amount);
        this.gameState.energy.totalRegenerated += amount;
        
        const actualRestored = this.gameState.energy.current - oldEnergy;
        
        eventBus.emit(GameEvents.ENERGY_CHANGED, {
            current: this.gameState.energy.current,
            max: maxEnergy,
            restored: actualRestored,
            source: source,
            percentage: this.getEnergyPercentage()
        });

        if (actualRestored > 0) {
            eventBus.emit(GameEvents.NOTIFICATION, `⚡ +${actualRestored} Energy`);
        }
    }

    regenerateEnergy() {
        const now = Date.now();
        const timeSinceLastRegen = now - this.gameState.energy.lastRegenTime;
        
        const regenCycles = Math.floor(timeSinceLastRegen / ENERGY_CONSTANTS.REGEN_INTERVAL);
        
        if (regenCycles > 0) {
            const effectiveRegen = this.getEffectiveRegenRate() * regenCycles;
            
            this.restoreEnergy(effectiveRegen, 'regeneration');
            this.gameState.energy.lastRegenTime = now;
        }
    }

    getEffectiveRegenRate() {
        let regen = ENERGY_CONSTANTS.BASE_REGEN_RATE;
        
        // Generator building bonus
        const generatorLevel = this.getBuildingLevel('generator');
        regen *= (1 + generatorLevel * ENERGY_CONSTANTS.GENERATOR_REGEN_BONUS);
        
        // Energy Mastery skill
        const masteryLevel = this.getSkillLevel('energyMastery');
        regen *= (1 + masteryLevel * ENERGY_CONSTANTS.MASTERY_REGEN_BONUS);
        
        return Math.max(0.1, regen);
    }

    getEffectiveMaxEnergy() {
        let maxEnergy = this.gameState.energy.max;
        
        // Generator building bonus
        const generatorLevel = this.getBuildingLevel('generator');
        maxEnergy += generatorLevel * ENERGY_CONSTANTS.GENERATOR_MAX_ENERGY_BONUS;
        
        // Power Storage skill
        const storageLevel = this.getSkillLevel('powerStorage');
        maxEnergy += storageLevel * ENERGY_CONSTANTS.STORAGE_MAX_BONUS;
        
        return Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, maxEnergy);
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
        return Math.max(0, ENERGY_CONSTANTS.REGEN_INTERVAL - timeSinceLastRegen);
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
        this.restoreEnergy(ENERGY_CONSTANTS.ENERGY_PACK_RESTORE, 'energy_pack');
        eventBus.emit(GameEvents.NOTIFICATION, `⚡ Energy Pack used! +${ENERGY_CONSTANTS.ENERGY_PACK_RESTORE} Energy`);
    }

    restoreFromEnergyZone() {
        this.restoreEnergy(ENERGY_CONSTANTS.ENERGY_ZONE_RESTORE, 'energy_zone');
    }

    restoreFromGoldZone() {
        this.restoreEnergy(ENERGY_CONSTANTS.GOLD_ZONE_RESTORE, 'gold_zone');
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
        
        if (percentage <= ENERGY_CONSTANTS.CRITICAL_THRESHOLD) {
            return 'critical';
        } else if (percentage <= ENERGY_CONSTANTS.WARNING_THRESHOLD) {
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
                current: Math.max(0, Math.floor(data.current || ENERGY_CONSTANTS.INITIAL_ENERGY)),
                max: Math.max(ENERGY_CONSTANTS.INITIAL_MAX_ENERGY, Math.floor(data.max || ENERGY_CONSTANTS.INITIAL_MAX_ENERGY)),
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