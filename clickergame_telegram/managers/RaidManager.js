import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';
import { dataLoader } from '../utils/DataLoader.js';

export class RaidManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.activeRaid = null;
    this.raidProgress = 0;
    this.raidStartTime = 0;
    this.isRaidInProgress = false;
    this.autoClickerWasActive = false;
    this.raidDefs = [];
    this.specialRewards = {};
    this.difficultyInfo = {};
    this.isDataLoaded = false;
    this.initializeRaidState();
    this.bindEvents();
    this.loadRaidData().then(() => {
      this.restoreRaidStateFromSave();
    });
    console.log('⚔️ RaidManager initialized');
  }

  async loadRaidData() {
    const data = await dataLoader.loadRaidsData();
    if (!dataLoader.validateRaidsData(data)) {
      throw new Error('Raid data validation failed');
    }
    
    this.raidDefs = data.raids;
    this.specialRewards = data.specialRewards || {};
    this.difficultyInfo = data.difficulties || {};
    this.isDataLoaded = true;
    console.log(`✅ RaidManager: Loaded ${this.raidDefs.length} raid definitions`);
  }

    initializeRaidState() {
        if (!this.gameState.raids) {
            this.gameState.raids = {
                completed: [],
                specialRewards: {},
                statistics: {
                    totalRaids: 0,
                    successfulRaids: 0,
                    resourcesGained: {},
                    peopleLost: 0
                }
            };
        }
        this.validateRaidState();
    }

    restoreRaidStateFromSave() {
        if (!this.gameState.raids) return;
        
        const raids = this.gameState.raids;
        console.log('🔄 Checking for active raid to restore...', {
            isRaidInProgress: raids.isRaidInProgress,
            activeRaid: raids.activeRaid?.id || 'none',
            startTime: raids.raidStartTime,
            progress: raids.raidProgress
        });

        if (raids.isRaidInProgress && raids.activeRaid) {
            console.log('🔄 Restoring active raid from save:', raids.activeRaid.name || raids.activeRaid.id);
            
            const fullRaidDef = this.getRaidDefinition(raids.activeRaid.id);
            if (!fullRaidDef) {
                console.error('❌ Raid definition not found for ID:', raids.activeRaid.id);
                console.log('📝 Available raid definitions:', this.raidDefs.map(r => r.id));
                
                if (raids.activeRaid.id && raids.activeRaid.name) {
                    console.log('🔧 Attempting to reconstruct raid from partial data...');
                    this.activeRaid = {
                        id: raids.activeRaid.id,
                        name: raids.activeRaid.name,
                        difficulty: raids.activeRaid.difficulty || 'unknown',
                        duration: 120000,
                        riskPercentage: 20,
                        description: 'Restored raid from save data'
                    };
                } else {
                    this.clearRaidState();
                    return;
                }
            } else {
                this.activeRaid = fullRaidDef;
            }

            this.isRaidInProgress = raids.isRaidInProgress;
            this.raidStartTime = raids.raidStartTime;
            this.raidProgress = raids.raidProgress;
            this.autoClickerWasActive = raids.autoClickerWasActive;

            const now = Date.now();
            const elapsed = now - this.raidStartTime;
            const raidDuration = this.activeRaid.duration || 120000;

            console.log('⏰ Raid timing check:', {
                elapsed: Math.round(elapsed / 1000) + 's',
                duration: Math.round(raidDuration / 1000) + 's',
                remaining: Math.round((raidDuration - elapsed) / 1000) + 's'
            });

            if (elapsed >= raidDuration) {
                console.log('⏰ Raid expired while away, completing it...');
                this.completeRaid();
            } else {
                console.log('⚔️ Raid still in progress, resuming...');
                this.raidProgress = Math.min(100, (elapsed / raidDuration) * 100);
                this.saveRaidStateToGameState();
                this.blockGameField(true);
                this.startRaidTimer();
                eventBus.emit(GameEvents.NOTIFICATION, `⚔️ Resumed: ${this.activeRaid.name}`);
                console.log('✅ Active raid restored and resumed successfully');
            }
        } else {
            console.log('ℹ️ No active raid to restore');
        }

        // Emergency backup check
        try {
            const emergencyBackup = localStorage.getItem('emergency_raid_backup');
            if (emergencyBackup && !this.isRaidInProgress) {
                const backupData = JSON.parse(emergencyBackup);
                console.log('🚨 Found emergency raid backup in localStorage:', backupData);
                
                if (backupData.emergencyFlag && backupData.raidId) {
                    const raidDef = this.getRaidDefinition(backupData.raidId);
                    if (raidDef) {
                        console.log('🚨 Restoring raid from emergency backup...');
                        this.activeRaid = raidDef;
                        this.isRaidInProgress = true;
                        this.raidStartTime = backupData.startTime;
                        this.raidProgress = backupData.progress;
                        this.autoClickerWasActive = backupData.autoClickerWasActive;

                        const now = Date.now();
                        const elapsed = now - this.raidStartTime;
                        if (elapsed >= raidDef.duration) {
                            console.log('🚨 Emergency backup raid expired, completing...');
                            this.completeRaid();
                        } else {
                            console.log('🚨 Emergency backup raid still active, resuming...');
                            this.raidProgress = Math.min(100, (elapsed / raidDef.duration) * 100);
                            this.saveRaidStateToGameState();
                            this.blockGameField(true);
                            this.startRaidTimer();
                            eventBus.emit(GameEvents.NOTIFICATION, `🚨 Emergency recovery: ${this.activeRaid.name}`);
                        }
                    }
                }
                localStorage.removeItem('emergency_raid_backup');
            }
        } catch (error) {
            console.warn('⚠️ Error checking emergency backup:', error);
        }
    }

    clearRaidState() {
        console.log('🧹 Clearing invalid raid state...');
        this.activeRaid = null;
        this.isRaidInProgress = false;
        this.raidStartTime = 0;
        this.raidProgress = 0;
        this.autoClickerWasActive = false;
        
        if (this.gameState.raids) {
            this.gameState.raids.activeRaid = null;
            this.gameState.raids.isRaidInProgress = false;
            this.gameState.raids.raidStartTime = 0;
            this.gameState.raids.raidProgress = 0;
            this.gameState.raids.autoClickerWasActive = false;
        }
        
        this.blockGameField(false);
        console.log('✅ Raid state cleared');
    }

    validateRaidState() {
        const raids = this.gameState.raids;
        
        if (!Array.isArray(raids.completed)) {
            raids.completed = [];
        }
        
        if (!raids.specialRewards || typeof raids.specialRewards !== 'object') {
            raids.specialRewards = {};
        }
        
        if (!raids.statistics || typeof raids.statistics !== 'object') {
            raids.statistics = {
                totalRaids: 0,
                successfulRaids: 0,
                resourcesGained: {},
                peopleLost: 0
            };
        }
    }

    bindEvents() {
        eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
            this.checkUnlockedRaids();
        });
    }

    checkUnlockedRaids() {
        this.raidDefs.forEach(raidDef => {
            if (this.isRaidUnlocked(raidDef)) {
                // Could emit event for newly unlocked raids
            }
        });
    }

    isRaidUnlocked(raidDef) {
        const condition = raidDef.unlockCondition;
        if (condition.building) {
            const building = this.gameState.buildings[condition.building];
            return building && building.level >= (condition.level || 1);
        }
        return true;
    }

    getRaidDefinition(raidId) {
        return this.raidDefs.find(raid => raid.id === raidId);
    }

    getAvailableRaids() {
        return this.raidDefs.filter(raid => this.isRaidUnlocked(raid));
    }

    canStartRaid(raidId) {
        const raidDef = this.getRaidDefinition(raidId);
        if (!raidDef) return { can: false, reason: 'Raid not found' };

        if (this.isRaidInProgress) {
            return { can: false, reason: 'Another raid is in progress' };
        }

        if (!this.isRaidUnlocked(raidDef)) {
            return { can: false, reason: 'Raid not unlocked' };
        }

        const resourceCheck = this.checkRaidRequirements(raidDef);
        if (!resourceCheck.canAfford) {
            return {
                can: false,
                reason: `Not enough resources: ${resourceCheck.missing.join(', ')}`
            };
        }

        return { can: true };
    }

    checkRaidRequirements(raidDef) {
        const requirements = raidDef.requirements;
        const missing = [];

        Object.entries(requirements).forEach(([resource, required]) => {
            const available = this.gameState.resources[resource] || 0;
            if (available < required) {
                const emoji = getResourceEmoji(resource);
                missing.push(`${required - available} ${emoji} ${resource}`);
            }
        });

        return {
            canAfford: missing.length === 0,
            missing
        };
    }

    startRaid(raidId) {
        const canStart = this.canStartRaid(raidId);
        if (!canStart.can) {
            eventBus.emit(GameEvents.NOTIFICATION, `❌ ${canStart.reason}`);
            return false;
        }

        const raidDef = this.getRaidDefinition(raidId);
        
        try {
            if (!this.spendRaidRequirements(raidDef)) {
                throw new Error('Failed to spend raid requirements');
            }

            this.activeRaid = raidDef;
            this.isRaidInProgress = true;
            this.raidStartTime = Date.now();
            this.raidProgress = 0;

            this.saveRaidStateToGameState();
            this.blockGameField(true);
            this.pauseAutoClicker();
            this.startRaidTimer();

            eventBus.emit(GameEvents.NOTIFICATION, `⚔️ ${raidDef.name} started!`);
            eventBus.emit(GameEvents.RAID_STARTED, {
                raid: raidDef,
                duration: raidDef.duration
            });

            console.log(`⚔️ Raid started: ${raidDef.name} (autoclicker paused)`);
            return true;
        } catch (error) {
            console.error('❌ Failed to start raid:', error);
            eventBus.emit(GameEvents.NOTIFICATION, `❌ Failed to start raid: ${error.message}`);
            return false;
        }
    }

    pauseAutoClicker() {
        const autoClickerStats = this.gameState.skillManager?.getAutoClickerStats?.();
        this.autoClickerWasActive = autoClickerStats?.active || false;
        
        if (this.autoClickerWasActive) {
            eventBus.emit(GameEvents.RAID_AUTOCLICKER_PAUSE);
            console.log('🤖 Auto clicker pause requested for raid');
            eventBus.emit(GameEvents.NOTIFICATION, '🤖 Auto clicker paused during raid');
        } else {
            console.log('🤖 Auto clicker was not active, no pause needed');
        }
    }

    saveRaidStateToGameState() {
        if (!this.gameState.raids) {
            this.gameState.raids = {
                completed: [],
                specialRewards: {},
                statistics: {
                    totalRaids: 0,
                    successfulRaids: 0,
                    resourcesGained: {},
                    peopleLost: 0
                }
            };
        }

        this.gameState.raids.activeRaid = this.activeRaid;
        this.gameState.raids.isRaidInProgress = this.isRaidInProgress;
        this.gameState.raids.raidStartTime = this.raidStartTime;
        this.gameState.raids.raidProgress = this.raidProgress;
        this.gameState.raids.autoClickerWasActive = this.autoClickerWasActive;

        console.log('💾 Raid state saved to GameState');
    }

    resumeAutoClicker() {
        if (this.autoClickerWasActive) {
            setTimeout(() => {
                eventBus.emit(GameEvents.RAID_AUTOCLICKER_RESUME);
                console.log('🤖 Auto clicker resume requested after raid');
                eventBus.emit(GameEvents.NOTIFICATION, '🤖 Auto clicker resumed');
            }, 500);
        }
        this.autoClickerWasActive = false;
    }

    spendRaidRequirements(raidDef) {
        const requirements = raidDef.requirements;
        const resourceCheck = this.checkRaidRequirements(raidDef);
        
        if (!resourceCheck.canAfford) {
            return false;
        }

        Object.entries(requirements).forEach(([resource, amount]) => {
            this.gameState.resources[resource] =
                Math.max(0, this.gameState.resources[resource] - amount);
        });

        eventBus.emit(GameEvents.RESOURCE_CHANGED);
        return true;
    }

    blockGameField(block) {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        if (block) {
            canvas.style.pointerEvents = 'none';
            canvas.style.opacity = '0.5';
            canvas.style.cursor = 'not-allowed';
            this.createRaidOverlay();
        } else {
            canvas.style.pointerEvents = '';
            canvas.style.opacity = '';
            canvas.style.cursor = '';
            this.removeRaidOverlay();
        }
    }

    createRaidOverlay() {
        const existingOverlay = document.getElementById('raid-overlay');
        if (existingOverlay) return;

        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        const overlay = document.createElement('div');
        overlay.id = 'raid-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            border-radius: 12px;
        `;

        overlay.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">⚔️</div>
            <div style="font-size: 16px; margin-bottom: 5px;">RAID IN PROGRESS</div>
            <div id="raid-timer" style="font-size: 14px; opacity: 0.8;">--:--</div>
            <div style="font-size: 12px; margin-top: 10px; opacity: 0.6;">
                ${this.activeRaid ? this.activeRaid.name : 'Unknown Raid'}
            </div>
        `;

        const gameContainer = canvas.parentElement;
        gameContainer.style.position = 'relative';
        gameContainer.appendChild(overlay);
        this.registerDOMElement(overlay);
    }

    removeRaidOverlay() {
        const overlay = document.getElementById('raid-overlay');
        if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    startRaidTimer() {
        const updateTimer = () => {
            if (!this.isRaidInProgress || !this.activeRaid) return;

            const elapsed = Date.now() - this.raidStartTime;
            const remaining = Math.max(0, this.activeRaid.duration - elapsed);
            this.raidProgress = Math.min(100, (elapsed / this.activeRaid.duration) * 100);

            this.saveRaidStateToGameState();
            this.updateRaidTimer(remaining);

            if (remaining <= 0) {
                this.completeRaid();
                return;
            }

            this.createTimeout(updateTimer, 1000);
        };

        updateTimer();
    }

    updateRaidTimer(remainingMs) {
        const timerElement = document.getElementById('raid-timer');
        if (!timerElement) return;

        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    completeRaid() {
        if (!this.activeRaid) return;

        console.log(`⚔️ Completing raid: ${this.activeRaid.name}`);
        
        try {
            const result = this.calculateRaidResult(this.activeRaid);
            this.applyRaidResult(result);
            this.updateRaidStatistics(result);
            this.showRaidResults(result);
            this.endRaid();
        } catch (error) {
            console.error('❌ Error completing raid:', error);
            eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid completion failed');
            this.endRaid();
        }
    }

    calculateRaidResult(raidDef) {
        const result = {
            success: true,
            peopleLost: 0,
            resourcesGained: {},
            specialRewards: [],
            totalValue: 0
        };

        // Risk calculation
        if (Math.random() < raidDef.riskPercentage / 100) {
            result.peopleLost = Math.floor(Math.random() * 2) + 1;
            console.log(`⚔️ Risk event: ${result.peopleLost} people lost`);
        }

        // Guaranteed rewards
        raidDef.rewards.guaranteed.forEach(reward => {
            const amount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
            result.resourcesGained[reward.resource] = amount;
            result.totalValue += amount;
        });

        // Chance rewards
        raidDef.rewards.chance.forEach(chanceReward => {
            if (Math.random() < chanceReward.probability) {
                if (chanceReward.reward.type === 'special') {
                    result.specialRewards.push(chanceReward.reward.id);
                } else {
                    const existing = result.resourcesGained[chanceReward.reward.resource] || 0;
                    result.resourcesGained[chanceReward.reward.resource] =
                        existing + chanceReward.reward.amount;
                    result.totalValue += chanceReward.reward.amount;
                }
                console.log(`⚔️ Bonus reward: ${chanceReward.description}`);
            }
        });

        return result;
    }

    applyRaidResult(result) {
        // Apply losses
        if (result.peopleLost > 0) {
            const currentPeople = this.gameState.resources.people || 0;
            this.gameState.resources.people = Math.max(0, currentPeople - result.peopleLost);
        }

        // Apply resource gains
        Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
            this.gameState.resources[resource] =
                (this.gameState.resources[resource] || 0) + amount;
        });

        // Apply special rewards
        result.specialRewards.forEach(rewardId => {
            this.gameState.raids.specialRewards[rewardId] =
                (this.gameState.raids.specialRewards[rewardId] || 0) + 1;
        });

        eventBus.emit(GameEvents.RESOURCE_CHANGED);
    }

    updateRaidStatistics(result) {
        const stats = this.gameState.raids.statistics;
        stats.totalRaids++;
        
        if (result.success) {
            stats.successfulRaids++;
        }
        
        stats.peopleLost += result.peopleLost;
        
        Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
            stats.resourcesGained[resource] =
                (stats.resourcesGained[resource] || 0) + amount;
        });

        this.gameState.raids.completed.push({
            raidId: this.activeRaid.id,
            timestamp: Date.now(),
            result
        });

        // Keep only recent raids to prevent save bloat
        if (this.gameState.raids.completed.length > 50) {
            this.gameState.raids.completed = this.gameState.raids.completed.slice(-25);
        }
    }

    showRaidResults(result) {
        let message = `⚔️ ${this.activeRaid.name} completed!\n\n`;

        if (result.peopleLost > 0) {
            message += `💀 Lost ${result.peopleLost} people\n`;
        }

        const resourceLines = Object.entries(result.resourcesGained).map(([resource, amount]) => {
            const emoji = getResourceEmoji(resource);
            return `${emoji} +${amount} ${resource}`;
        });

        if (resourceLines.length > 0) {
            message += `\n📦 Resources gained:\n${resourceLines.join('\n')}`;
        }

        if (result.specialRewards.length > 0) {
            const specialLines = result.specialRewards.map(rewardId => {
                const reward = this.specialRewards[rewardId];
                return `${reward ? reward.icon : '🎁'} ${reward ? reward.name : rewardId}`;
            });
            message += `\n\n✨ Special rewards:\n${specialLines.join('\n')}`;
        }

        if (this.gameState.modalManager) {
            this.gameState.modalManager.showInfoModal('Raid Complete', message.replace(/\n/g, '<br>'));
        } else {
            eventBus.emit(GameEvents.NOTIFICATION, message.split('\n')[0]);
        }
    }

    endRaid() {
        this.activeRaid = null;
        this.isRaidInProgress = false;
        this.raidProgress = 0;
        this.raidStartTime = 0;

        if (this.gameState.raids) {
            this.gameState.raids.activeRaid = null;
            this.gameState.raids.isRaidInProgress = false;
            this.gameState.raids.raidProgress = 0;
            this.gameState.raids.autoClickerWasActive = false;
            this.saveRaidStateToGameState();
            this.blockGameField(false);
            this.resumeAutoClicker();}

    eventBus.emit(GameEvents.RAID_COMPLETED, {
        raid: this.activeRaid,
        timestamp: Date.now()
    });

    console.log(`✅ Raid ended: ${this.activeRaid ? this.activeRaid.name : 'Unknown'}`);
    this.activeRaid = null;
}

cancelRaid() {
    if (!this.isRaidInProgress || !this.activeRaid) {
        eventBus.emit(GameEvents.NOTIFICATION, '❌ No active raid to cancel');
        return false;
    }

    console.log(`⚔️ Cancelling raid: ${this.activeRaid.name}`);

    try {
        // Возвращаем 50% ресурсов
        const requirements = this.activeRaid.requirements;
        Object.entries(requirements).forEach(([resource, amount]) => {
            const refundAmount = Math.floor(amount * 0.5);
            this.gameState.resources[resource] = 
                (this.gameState.resources[resource] || 0) + refundAmount;
        });

        // Обновляем статистику
        this.gameState.raids.statistics.totalRaids++;

        this.endRaid();

        eventBus.emit(GameEvents.NOTIFICATION, '⚔️ Raid cancelled - 50% resources refunded');
        eventBus.emit(GameEvents.RAID_CANCELLED, {
            raid: this.activeRaid,
            timestamp: Date.now()
        });

        eventBus.emit(GameEvents.RESOURCE_CHANGED);

        console.log('✅ Raid cancelled successfully');
        return true;
    } catch (error) {
        console.error('❌ Error cancelling raid:', error);
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Failed to cancel raid');
        return false;
    }
}

getRaidInfo(raidId) {
    const raidDef = this.getRaidDefinition(raidId);
    if (!raidDef) return null;

    const canStartResult = this.canStartRaid(raidId);
    const completedCount = this.gameState.raids.completed.filter(
        completed => completed.raidId === raidId
    ).length;

    return {
        ...raidDef,
        canStart: canStartResult.can,
        canStartReason: canStartResult.reason,
        durationText: this.formatDuration(raidDef.duration),
        completedCount: completedCount
    };
}

formatDuration(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

getCurrentRaidStatus() {
    if (!this.isRaidInProgress || !this.activeRaid) {
        return { inProgress: false };
    }

    const now = Date.now();
    const elapsed = now - this.raidStartTime;
    const remaining = Math.max(0, this.activeRaid.duration - elapsed);
    const progress = Math.min(100, (elapsed / this.activeRaid.duration) * 100);

    return {
        inProgress: true,
        raid: this.activeRaid,
        progress: progress,
        timeRemaining: remaining,
        timeRemainingText: this.formatDuration(remaining),
        startTime: this.raidStartTime,
        autoClickerWasActive: this.autoClickerWasActive
    };
}

getRaidStatistics() {
    const stats = this.gameState.raids.statistics;
    const successRate = stats.totalRaids > 0 ? 
        `${Math.round((stats.successfulRaids / stats.totalRaids) * 100)}%` : '0%';

    return {
        totalRaids: stats.totalRaids,
        successfulRaids: stats.successfulRaids,
        successRate: successRate,
        peopleLost: stats.peopleLost,
        resourcesGained: { ...stats.resourcesGained }
    };
}

getSpecialRewards() {
    const rewards = [];
    Object.entries(this.gameState.raids.specialRewards).forEach(([rewardId, count]) => {
        if (count > 0) {
            const rewardDef = this.specialRewards[rewardId];
            rewards.push({
                id: rewardId,
                count: count,
                name: rewardDef ? rewardDef.name : rewardId,
                icon: rewardDef ? rewardDef.icon : '🎁',
                definition: rewardDef
            });
        }
    });
    return rewards;
}

useSpecialReward(rewardId) {
    const available = this.gameState.raids.specialRewards[rewardId] || 0;
    if (available <= 0) {
        eventBus.emit(GameEvents.NOTIFICATION, '❌ No rewards of this type available');
        return false;
    }

    const rewardDef = this.specialRewards[rewardId];
    if (!rewardDef) {
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Unknown reward type');
        return false;
    }

    try {
        // Применяем эффект награды
        this.applySpecialRewardEffect(rewardId, rewardDef);

        // Уменьшаем количество
        this.gameState.raids.specialRewards[rewardId]--;
        if (this.gameState.raids.specialRewards[rewardId] <= 0) {
            delete this.gameState.raids.specialRewards[rewardId];
        }

        eventBus.emit(GameEvents.NOTIFICATION, `✨ Used: ${rewardDef.name}`);
        return true;
    } catch (error) {
        console.error('❌ Error using special reward:', error);
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Failed to use reward');
        return false;
    }
}

applySpecialRewardEffect(rewardId, rewardDef) {
    switch (rewardId) {
        case 'ancient_blueprint':
            // 25% скидка на следующее улучшение здания
            this.gameState.tempBuildingDiscount = {
                discount: 0.25,
                uses: 1
            };
            eventBus.emit(GameEvents.NOTIFICATION, '📜 Ancient Blueprint: 25% building discount!');
            break;
        
        case 'energy_crystal':
            // Восстанавливает всю энергию
            if (this.gameState.energyManager) {
                this.gameState.energyManager.restoreEnergy(1000, 'energy_crystal');
            }
            break;
        
        case 'skill_tome':
            // Дает 5 очков навыков
            if (this.gameState.skillManager) {
                this.gameState.skillManager.addSkillPoints(5);
            }
            break;
        
        default:
            console.warn('Unknown special reward effect:', rewardId);
    }
}

isRaidSystemUnlocked() {
    const watchTower = this.gameState.buildings?.watchTower;
    return watchTower && watchTower.level >= 1;
}

validateRaidData() {
    if (!this.gameState.raids) {
        this.gameState.raids = {
            completed: [],
            specialRewards: {},
            statistics: {
                totalRaids: 0,
                successfulRaids: 0,
                resourcesGained: {},
                peopleLost: 0
            },
            activeRaid: null,
            isRaidInProgress: false,
            raidStartTime: 0,
            raidProgress: 0,
            autoClickerWasActive: false
        };
    }

    // Валидация статистики
    const stats = this.gameState.raids.statistics;
    stats.totalRaids = Math.max(0, stats.totalRaids || 0);
    stats.successfulRaids = Math.max(0, stats.successfulRaids || 0);
    stats.peopleLost = Math.max(0, stats.peopleLost || 0);
    
    if (!stats.resourcesGained || typeof stats.resourcesGained !== 'object') {
        stats.resourcesGained = {};
    }

    // Валидация завершенных рейдов
    if (!Array.isArray(this.gameState.raids.completed)) {
        this.gameState.raids.completed = [];
    }

    // Валидация специальных наград
    if (!this.gameState.raids.specialRewards || typeof this.gameState.raids.specialRewards !== 'object') {
        this.gameState.raids.specialRewards = {};
    }
}

getDebugInfo() {
    return {
        isDataLoaded: this.isDataLoaded,
        raidDefsCount: this.raidDefs.length,
        specialRewardsCount: Object.keys(this.specialRewards).length,
        isRaidInProgress: this.isRaidInProgress,
        activeRaidId: this.activeRaid?.id || null,
        gameStateRaidsExists: !!this.gameState.raids,
        raidSystemUnlocked: this.isRaidSystemUnlocked(),
        totalCompletedRaids: this.gameState.raids?.completed?.length || 0,
        currentRaidStatus: this.getCurrentRaidStatus()
    };
}

async reloadRaidData() {
    try {
        console.log('🔄 Reloading raid data...');
        dataLoader.clearCache();
        await this.loadRaidData();
        console.log('✅ Raid data reloaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to reload raid data:', error);
        return false;
    }
}

exportRaidStatistics() {
    return {
        statistics: this.getRaidStatistics(),
        specialRewards: this.getSpecialRewards(),
        completedRaids: this.gameState.raids.completed.map(raid => ({
            raidId: raid.raidId,
            timestamp: raid.timestamp,
            success: raid.result?.success || false,
            resourcesGained: raid.result?.resourcesGained || {},
            peopleLost: raid.result?.peopleLost || 0
        })),
        systemUnlocked: this.isRaidSystemUnlocked(),
        currentStatus: this.getCurrentRaidStatus()
    };
}

// Методы для интеграции с другими системами
pauseForRaid() {
    console.log('⚔️ Pausing other systems for raid...');
    // Уведомляем систему автокликера о паузе
    eventBus.emit(GameEvents.RAID_AUTOCLICKER_PAUSE);
}

resumeAfterRaid() {
    console.log('⚔️ Resuming systems after raid...');
    // Уведомляем систему автокликера о возобновлении
    eventBus.emit(GameEvents.RAID_AUTOCLICKER_RESUME);
}

// Методы для восстановления состояния
emergencyEndRaid() {
    console.log('🚨 Emergency raid termination...');
    if (this.isRaidInProgress) {
        this.blockGameField(false);
        this.resumeAutoClicker();
        this.isRaidInProgress = false;
        this.activeRaid = null;
        this.raidProgress = 0;
        this.raidStartTime = 0;
        this.autoClickerWasActive = false;
        this.saveRaidStateToGameState();
        console.log('🚨 Emergency raid termination completed');
    }
}

destroy() {
    console.log('🧹 RaidManager cleanup started');
    
    if (this.isRaidInProgress) {
        console.log('⚔️ Active raid detected during cleanup, ending gracefully...');
        this.emergencyEndRaid();
    }

    // Очищаем все таймеры и интервалы
    super.destroy();
    
    console.log('✅ RaidManager destroyed');
}
}