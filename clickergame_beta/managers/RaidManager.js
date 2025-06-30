// managers/RaidManager.js - Система рейдов
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';

// Определения рейдов
export const RAID_DEFS = [
  {
    id: 'city_ruins',
    name: '🏚️ City Ruins',
    description: 'Explore the remnants of a once-great city for resources and technology',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 4, // 3-5 people
      food: 10,
      water: 5
    },
    duration: 120000, // 2 minutes in milliseconds
    riskPercentage: 20, // 20% chance of losses
    rewards: {
      guaranteed: [
        { resource: 'wood', min: 2, max: 5 },
        { resource: 'stone', min: 2, max: 5 },
        { resource: 'iron', min: 2, max: 5 }
      ],
      chance: [
        { 
          probability: 0.15, // 15% chance
          reward: { resource: 'science', amount: 2 },
          description: 'Found ancient technology'
        },
        {
          probability: 0.05, // 5% chance
          reward: { type: 'special', id: 'ancient_blueprint' },
          description: 'Discovered Ancient Blueprint'
        }
      ]
    },
    category: 'exploration'
  }
  // Можно добавить больше рейдов в будущем
];

// Специальные награды
export const SPECIAL_REWARDS = {
  ancient_blueprint: {
    name: 'Ancient Blueprint',
    description: '10% discount on next building upgrade',
    icon: '📜',
    effect: { type: 'building_discount', value: 0.1, uses: 1 }
  }
};

export class RaidManager extends CleanupMixin {
constructor(gameState) {
  super();
  
  this.gameState = gameState;
  this.activeRaid = null;
  this.raidProgress = 0;
  this.raidStartTime = 0;
  this.isRaidInProgress = false;
  this.autoClickerWasActive = false;
  
  this.initializeRaidState();
  this.bindEvents();
  
  // НОВОЕ: Восстанавливаем состояние рейда после загрузки
  this.restoreRaidStateFromSave();
  
  console.log('⚔️ RaidManager initialized');
}

  // Инициализация состояния рейдов
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
    
    // Валидация состояния рейдов
    this.validateRaidState();
  }

  restoreRaidStateFromSave() {
  if (!this.gameState.raids) return;
  
  const raids = this.gameState.raids;
  
  // Проверяем, был ли активный рейд
  if (raids.isRaidInProgress && raids.activeRaid) {
    console.log('🔄 Restoring active raid from save:', raids.activeRaid.name);
    
    // Восстанавливаем состояние
    this.activeRaid = raids.activeRaid;
    this.isRaidInProgress = raids.isRaidInProgress;
    this.raidStartTime = raids.raidStartTime;
    this.raidProgress = raids.raidProgress;
    this.autoClickerWasActive = raids.autoClickerWasActive;
    
    // Проверяем, не истек ли рейд за время отсутствия
    const now = Date.now();
    const elapsed = now - this.raidStartTime;
    const raidDuration = this.activeRaid.duration;
    
    if (elapsed >= raidDuration) {
      console.log('⏰ Raid expired while away, completing it...');
      // Рейд завершился пока игрок был в офлайне
      this.completeRaid();
    } else {
      console.log('⚔️ Raid still in progress, resuming...');
      
      // Обновляем прогресс
      this.raidProgress = Math.min(100, (elapsed / raidDuration) * 100);
      
      // Блокируем игровое поле
      this.blockGameField(true);
      
      // Запускаем таймер
      this.startRaidTimer();
      
      // Уведомляем о возобновлении
      eventBus.emit(GameEvents.NOTIFICATION, `⚔️ Resumed: ${this.activeRaid.name}`);
    }
  }
}

  // Валидация состояния рейдов
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

  // Привязка событий
  bindEvents() {
    // Слушаем события игры для обновления прогресса
    eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
      // Проверяем разблокировку новых рейдов
      this.checkUnlockedRaids();
    });
  }

  // Проверить разблокированные рейды
  checkUnlockedRaids() {
    RAID_DEFS.forEach(raidDef => {
      if (this.isRaidUnlocked(raidDef)) {
        // Можно добавить уведомление о разблокировке
      }
    });
  }

  // Проверить, разблокирован ли рейд
  isRaidUnlocked(raidDef) {
    const condition = raidDef.unlockCondition;
    
    if (condition.building) {
      const building = this.gameState.buildings[condition.building];
      return building && building.level >= (condition.level || 1);
    }
    
    return true; // По умолчанию разблокирован
  }

  // Проверить, доступен ли рейд для запуска
  canStartRaid(raidId) {
    const raidDef = this.getRaidDefinition(raidId);
    if (!raidDef) return { can: false, reason: 'Raid not found' };
    
    // Проверяем, что нет активного рейда
    if (this.isRaidInProgress) {
      return { can: false, reason: 'Another raid is in progress' };
    }
    
    // Проверяем разблокировку
    if (!this.isRaidUnlocked(raidDef)) {
      return { can: false, reason: 'Raid not unlocked' };
    }
    
    // Проверяем ресурсы
    const resourceCheck = this.checkRaidRequirements(raidDef);
    if (!resourceCheck.canAfford) {
      return { 
        can: false, 
        reason: `Not enough resources: ${resourceCheck.missing.join(', ')}` 
      };
    }
    
    return { can: true };
  }

  // Проверить требования для рейда
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

  // Запустить рейд
startRaid(raidId) {
  const canStart = this.canStartRaid(raidId);
  if (!canStart.can) {
    eventBus.emit(GameEvents.NOTIFICATION, `❌ ${canStart.reason}`);
    return false;
  }
  
  const raidDef = this.getRaidDefinition(raidId);
  
  try {
    // Тратим ресурсы
    if (!this.spendRaidRequirements(raidDef)) {
      throw new Error('Failed to spend raid requirements');
    }
    
    // Запускаем рейд
    this.activeRaid = raidDef;
    this.isRaidInProgress = true;
    this.raidStartTime = Date.now();
    this.raidProgress = 0;
    
    // НОВОЕ: Сохраняем состояние в GameState
    this.saveRaidStateToGameState();
    
    // Блокируем игровое поле
    this.blockGameField(true);
    
    // Отключаем автокликер во время рейда
    this.pauseAutoClicker();
    
    // Запускаем таймер рейда
    this.startRaidTimer();
    
    // Уведомления
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

// НОВЫЙ МЕТОД: Приостановить автокликер
pauseAutoClicker() {
  // Проверяем текущий статус автокликера
  const autoClickerStats = this.gameState.skillManager?.getAutoClickerStats?.();
  this.autoClickerWasActive = autoClickerStats?.active || false;
  
  if (this.autoClickerWasActive) {
    // Отправляем событие для остановки автокликера
    eventBus.emit(GameEvents.RAID_AUTOCLICKER_PAUSE);
    console.log('🤖 Auto clicker pause requested for raid');
    
    // Уведомляем игрока
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
  
  // Сохраняем текущее состояние активного рейда
  this.gameState.raids.activeRaid = this.activeRaid;
  this.gameState.raids.isRaidInProgress = this.isRaidInProgress;
  this.gameState.raids.raidStartTime = this.raidStartTime;
  this.gameState.raids.raidProgress = this.raidProgress;
  this.gameState.raids.autoClickerWasActive = this.autoClickerWasActive;
  
  console.log('💾 Raid state saved to GameState');
}


// НОВЫЙ МЕТОД: Восстановить автокликер
resumeAutoClicker() {
  if (this.autoClickerWasActive) {
    // Отправляем событие для восстановления автокликера с задержкой
    setTimeout(() => {
      eventBus.emit(GameEvents.RAID_AUTOCLICKER_RESUME);
      console.log('🤖 Auto clicker resume requested after raid');
      
      // Уведомляем игрока
      eventBus.emit(GameEvents.NOTIFICATION, '🤖 Auto clicker resumed');
    }, 500);
  }
  
  // Сбрасываем флаг
  this.autoClickerWasActive = false;
}

  // Потратить ресурсы для рейда
  spendRaidRequirements(raidDef) {
    const requirements = raidDef.requirements;
    
    // Проверяем еще раз перед тратой
    const resourceCheck = this.checkRaidRequirements(raidDef);
    if (!resourceCheck.canAfford) {
      return false;
    }
    
    // Тратим ресурсы
    Object.entries(requirements).forEach(([resource, amount]) => {
      this.gameState.resources[resource] = 
        Math.max(0, this.gameState.resources[resource] - amount);
    });
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
    return true;
  }

  // Заблокировать/разблокировать игровое поле
  blockGameField(block) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    if (block) {
      canvas.style.pointerEvents = 'none';
      canvas.style.opacity = '0.5';
      canvas.style.cursor = 'not-allowed';
      
      // Добавляем оверлей с информацией о рейде
      this.createRaidOverlay();
    } else {
      canvas.style.pointerEvents = '';
      canvas.style.opacity = '';
      canvas.style.cursor = '';
      
      // Убираем оверлей
      this.removeRaidOverlay();
    }
  }

  // Создать оверлей рейда
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
    
    // Позиционируем относительно canvas
    const gameContainer = canvas.parentElement;
    gameContainer.style.position = 'relative';
    gameContainer.appendChild(overlay);
    
    this.registerDOMElement(overlay);
  }

  // Убрать оверлей рейда
  removeRaidOverlay() {
    const overlay = document.getElementById('raid-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // Запустить таймер рейда
startRaidTimer() {
  const updateTimer = () => {
    if (!this.isRaidInProgress || !this.activeRaid) return;
    
    const elapsed = Date.now() - this.raidStartTime;
    const remaining = Math.max(0, this.activeRaid.duration - elapsed);
    this.raidProgress = Math.min(100, (elapsed / this.activeRaid.duration) * 100);
    
    // НОВОЕ: Периодически сохраняем прогресс
    this.saveRaidStateToGameState();
    
    // Обновляем таймер в оверлее
    this.updateRaidTimer(remaining);
    
    // Проверяем завершение
    if (remaining <= 0) {
      this.completeRaid();
      return;
    }
    
    // Продолжаем обновление
    this.createTimeout(updateTimer, 1000);
  };
  
  updateTimer();
}

  // Обновить таймер в оверлее
  updateRaidTimer(remainingMs) {
    const timerElement = document.getElementById('raid-timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Завершить рейд
  completeRaid() {
    if (!this.activeRaid) return;
    
    console.log(`⚔️ Completing raid: ${this.activeRaid.name}`);
    
    try {
      // Рассчитываем результат
      const result = this.calculateRaidResult(this.activeRaid);
      
      // Применяем результат
      this.applyRaidResult(result);
      
      // Обновляем статистику
      this.updateRaidStatistics(result);
      
      // Уведомления
      this.showRaidResults(result);
      
      // Завершаем рейд
      this.endRaid();
      
    } catch (error) {
      console.error('❌ Error completing raid:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid completion failed');
      this.endRaid();
    }
  }

  // Рассчитать результат рейда
  calculateRaidResult(raidDef) {
    const result = {
      success: true,
      peopleLost: 0,
      resourcesGained: {},
      specialRewards: [],
      totalValue: 0
    };
    
    // Проверяем риск потерь
    if (Math.random() < raidDef.riskPercentage / 100) {
      result.peopleLost = Math.floor(Math.random() * 2) + 1; // 1-2 people lost
      console.log(`⚔️ Risk event: ${result.peopleLost} people lost`);
    }
    
    // Гарантированные награды
    raidDef.rewards.guaranteed.forEach(reward => {
      const amount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
      result.resourcesGained[reward.resource] = amount;
      result.totalValue += amount;
    });
    
    // Случайные награды
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

  // Применить результат рейда
  applyRaidResult(result) {
    // Потери людей
    if (result.peopleLost > 0) {
      const currentPeople = this.gameState.resources.people || 0;
      this.gameState.resources.people = Math.max(0, currentPeople - result.peopleLost);
    }
    
    // Полученные ресурсы
    Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
      this.gameState.resources[resource] = 
        (this.gameState.resources[resource] || 0) + amount;
    });
    
    // Специальные награды
    result.specialRewards.forEach(rewardId => {
      this.gameState.raids.specialRewards[rewardId] = 
        (this.gameState.raids.specialRewards[rewardId] || 0) + 1;
    });
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
  }

  // Обновить статистику рейдов
  updateRaidStatistics(result) {
    const stats = this.gameState.raids.statistics;
    
    stats.totalRaids++;
    if (result.success) {
      stats.successfulRaids++;
    }
    stats.peopleLost += result.peopleLost;
    
    // Статистика ресурсов
    Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
      stats.resourcesGained[resource] = 
        (stats.resourcesGained[resource] || 0) + amount;
    });
    
    // Добавляем в историю завершенных рейдов
    this.gameState.raids.completed.push({
      raidId: this.activeRaid.id,
      timestamp: Date.now(),
      result
    });
    
    // Ограничиваем историю
    if (this.gameState.raids.completed.length > 50) {
      this.gameState.raids.completed = this.gameState.raids.completed.slice(-25);
    }
  }

  // Показать результаты рейда
  showRaidResults(result) {
    let message = `⚔️ ${this.activeRaid.name} completed!\n\n`;
    
    // Потери
    if (result.peopleLost > 0) {
      message += `💀 Lost ${result.peopleLost} people\n`;
    }
    
    // Ресурсы
    const resourceLines = Object.entries(result.resourcesGained).map(([resource, amount]) => {
      const emoji = getResourceEmoji(resource);
      return `${emoji} +${amount} ${resource}`;
    });
    
    if (resourceLines.length > 0) {
      message += `\n📦 Resources gained:\n${resourceLines.join('\n')}`;
    }
    
    // Специальные награды
    if (result.specialRewards.length > 0) {
      const specialLines = result.specialRewards.map(rewardId => {
        const reward = SPECIAL_REWARDS[rewardId];
        return `${reward ? reward.icon : '🎁'} ${reward ? reward.name : rewardId}`;
      });
      message += `\n\n✨ Special rewards:\n${specialLines.join('\n')}`;
    }
    
    // Показываем модальное окно с результатами
    if (this.gameState.modalManager) {
      this.gameState.modalManager.showInfoModal('Raid Complete', message.replace(/\n/g, '<br>'));
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, message.split('\n')[0]);
    }
  }

  // Завершить рейд
endRaid() {
  this.activeRaid = null;
  this.isRaidInProgress = false;
  this.raidProgress = 0;
  this.raidStartTime = 0;
  
  // НОВОЕ: Очищаем состояние рейда в GameState
  if (this.gameState.raids) {
    this.gameState.raids.activeRaid = null;
    this.gameState.raids.isRaidInProgress = false;
    this.gameState.raids.raidStartTime = 0;
    this.gameState.raids.raidProgress = 0;
    this.gameState.raids.autoClickerWasActive = false;
  }
  
  // Разблокируем игровое поле
  this.blockGameField(false);
  
  // Восстанавливаем автокликер после рейда
  this.resumeAutoClicker();
  
  eventBus.emit(GameEvents.RAID_COMPLETED, {
    timestamp: Date.now()
  });
  
  console.log('⚔️ Raid ended (autoclicker resumed)');
}

  // Отменить рейд (для экстренных случаев)
cancelRaid() {
  if (!this.isRaidInProgress) return false;
  
  console.log('⚔️ Cancelling raid...');
  
  // Возвращаем ресурсы (50% штраф)
  if (this.activeRaid) {
    Object.entries(this.activeRaid.requirements).forEach(([resource, amount]) => {
      const refund = Math.floor(amount * 0.5);
      this.gameState.resources[resource] = 
        (this.gameState.resources[resource] || 0) + refund;
    });
  }
  
  this.endRaid(); // Это автоматически восстановит автокликер
  
  eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid cancelled (Auto clicker resumed)');
  eventBus.emit(GameEvents.RESOURCE_CHANGED);
  
  return true;
}


  // Получить определение рейда
  getRaidDefinition(raidId) {
    return RAID_DEFS.find(raid => raid.id === raidId);
  }

  // Получить все доступные рейды
  getAvailableRaids() {
    return RAID_DEFS.filter(raid => this.isRaidUnlocked(raid));
  }

  // Получить информацию о рейде
  getRaidInfo(raidId) {
    const raidDef = this.getRaidDefinition(raidId);
    if (!raidDef) return null;
    
    const canStart = this.canStartRaid(raidId);
    const requirements = this.checkRaidRequirements(raidDef);
    
    return {
      ...raidDef,
      unlocked: this.isRaidUnlocked(raidDef),
      canStart: canStart.can,
      canStartReason: canStart.reason,
      requirementsMet: requirements.canAfford,
      missingRequirements: requirements.missing,
      durationText: this.formatDuration(raidDef.duration),
      completedCount: this.gameState.raids.completed.filter(c => c.raidId === raidId).length
    };
  }

  // Получить текущий статус рейда
  getCurrentRaidStatus() {
    if (!this.isRaidInProgress) {
      return { inProgress: false };
    }
    
    const elapsed = Date.now() - this.raidStartTime;
    const remaining = Math.max(0, this.activeRaid.duration - elapsed);
    
    return {
      inProgress: true,
      raid: this.activeRaid,
      progress: this.raidProgress,
      timeRemaining: remaining,
      timeRemainingText: this.formatDuration(remaining)
    };
  }

  // Форматировать длительность
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Получить статистику рейдов
  getRaidStatistics() {
    return {
      ...this.gameState.raids.statistics,
      successRate: this.gameState.raids.statistics.totalRaids > 0 ?
        (this.gameState.raids.statistics.successfulRaids / this.gameState.raids.statistics.totalRaids * 100).toFixed(1) + '%' :
        '0%',
      totalCompletedRaids: this.gameState.raids.completed.length,
      specialRewardsCount: Object.values(this.gameState.raids.specialRewards).reduce((sum, count) => sum + count, 0)
    };
  }

  // Получить специальные награды
  getSpecialRewards() {
    return Object.entries(this.gameState.raids.specialRewards).map(([rewardId, count]) => {
      const rewardDef = SPECIAL_REWARDS[rewardId];
      return {
        id: rewardId,
        count,
        definition: rewardDef,
        name: rewardDef ? rewardDef.name : rewardId,
        icon: rewardDef ? rewardDef.icon : '🎁'
      };
    }).filter(reward => reward.count > 0);
  }

  // Использовать специальную награду
  useSpecialReward(rewardId) {
    const currentCount = this.gameState.raids.specialRewards[rewardId] || 0;
    if (currentCount <= 0) return false;
    
    const rewardDef = SPECIAL_REWARDS[rewardId];
    if (!rewardDef) return false;
    
    try {
      // Применяем эффект (пример для Ancient Blueprint)
      if (rewardId === 'ancient_blueprint') {
        // Устанавливаем временную скидку на здания
        this.gameState.tempBuildingDiscount = {
          discount: rewardDef.effect.value,
          uses: rewardDef.effect.uses
        };
        
        eventBus.emit(GameEvents.NOTIFICATION, `📜 ${rewardDef.name} activated! Next building 10% cheaper`);
      }
      
      // Уменьшаем количество
      this.gameState.raids.specialRewards[rewardId]--;
      if (this.gameState.raids.specialRewards[rewardId] <= 0) {
        delete this.gameState.raids.specialRewards[rewardId];
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error using special reward:', error);
      return false;
    }
  }

  // Проверить готовность для рейдов (есть ли Watch Tower)
  isRaidSystemUnlocked() {
    const watchTower = this.gameState.buildings?.watchTower;
    return watchTower && watchTower.level >= 1;
  }

  // Деструктор
  destroy() {
    console.log('🧹 RaidManager cleanup started');
    
    // Отменяем активный рейд если есть
    if (this.isRaidInProgress) {
      this.endRaid();
    }
    
    super.destroy();
    
    console.log('✅ RaidManager destroyed');
  }
}

// Добавляем новые события для рейдов
export const RAID_EVENTS = {
  RAID_STARTED: 'raid:started',
  RAID_COMPLETED: 'raid:completed',
  RAID_CANCELLED: 'raid:cancelled',
  SPECIAL_REWARD_USED: 'raid:special_reward_used'
};