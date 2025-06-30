// ui/RaidPanel.js - UI компонент для системы рейдов
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';

export class RaidPanel extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.updateInterval = null;
  }

  // Создать панель рейдов
  createRaidPanel(panelElement) {
    this.clearPanel(panelElement);
    
    // Проверяем, разблокирована ли система рейдов
    if (!this.isRaidSystemUnlocked()) {
      this.showRaidSystemLocked(panelElement);
      return;
    }

    panelElement.innerHTML = '<h2>⚔️ Raid System</h2>';
    
    // Статус текущего рейда
    const currentStatus = this.getCurrentRaidStatus();
    if (currentStatus.inProgress) {
      this.showActiveRaidStatus(panelElement, currentStatus);
    }
    
    // Доступные рейды
    this.showAvailableRaids(panelElement);
    
    // Статистика и специальные награды
    this.showRaidStatistics(panelElement);
    this.showSpecialRewards(panelElement);
    
    // Запускаем обновление если рейд активен
    if (currentStatus.inProgress) {
      this.startStatusUpdate();
    }
  }

  // Показать сообщение о заблокированной системе
  showRaidSystemLocked(panelElement) {
    const lockSection = document.createElement('div');
    lockSection.className = 'raid-locked-section';
    lockSection.innerHTML = `
      <h2>⚔️ Raid System</h2>
      <div class="raid-locked-message">
        <div class="lock-icon">🔒</div>
        <h3>Raid System Locked</h3>
        <p>Build a <strong>🗼 Watch Tower</strong> to unlock expeditions into the wasteland.</p>
        <div class="requirements">
          <h4>Watch Tower Requirements:</h4>
          <ul>
            <li>🌲 50 Wood</li>
            <li>🪨 80 Stone</li>
            <li>⛓️ 30 Iron</li>
            <li>👥 8 People</li>
          </ul>
        </div>
        <p class="description">
          The Watch Tower serves as a command center for dangerous expeditions. 
          From its heights, scouts can identify targets and coordinate missions 
          to recover lost resources and ancient technology.
        </p>
      </div>
    `;
    
    lockSection.style.cssText = `
      text-align: center;
      padding: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
      margin: 1rem 0;
    `;
    
    panelElement.appendChild(lockSection);
  }

  // Показать статус активного рейда
  showActiveRaidStatus(panelElement, status) {
    const statusSection = document.createElement('div');
    statusSection.className = 'active-raid-status';
    statusSection.innerHTML = `
      <div class="raid-status-header">
        <h3>🎯 Active Raid: ${status.raid.name}</h3>
        <div class="raid-progress-container">
          <div class="raid-progress-bar">
            <div class="raid-progress-fill" style="width: ${status.progress}%"></div>
          </div>
          <div class="raid-time-remaining">${status.timeRemainingText}</div>
        </div>
      </div>
      <div class="raid-status-details">
        <p><strong>Difficulty:</strong> ${this.capitalize(status.raid.difficulty)}</p>
        <p><strong>Risk:</strong> ${status.raid.riskPercentage}% chance of casualties</p>
        <p><strong>Description:</strong> ${status.raid.description}</p>
      </div>
      <div class="raid-status-actions">
        <button id="cancel-raid-btn" class="cancel-raid-button">
          ❌ Cancel Raid (50% refund)
        </button>
      </div>
    `;
    
    statusSection.style.cssText = `
      background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
      border: 2px solid #f39c12;
      border-radius: 12px;
      padding: 1.5rem;
      margin: 1rem 0;
    `;
    
    panelElement.appendChild(statusSection);
    
    // Привязываем обработчик отмены
    const cancelBtn = statusSection.querySelector('#cancel-raid-btn');
    if (cancelBtn) {
      this.addEventListener(cancelBtn, 'click', () => {
        this.handleCancelRaid();
      });
    }
  }

  // Показать доступные рейды
  showAvailableRaids(panelElement) {
    const raidsSection = document.createElement('div');
    raidsSection.className = 'available-raids-section';
    raidsSection.innerHTML = '<h3>📋 Available Expeditions</h3>';
    
    const availableRaids = this.getAvailableRaids();
    
    if (availableRaids.length === 0) {
      raidsSection.innerHTML += '<p>No raids available. Check back later.</p>';
    } else {
      availableRaids.forEach(raid => {
        const raidCard = this.createRaidCard(raid);
        raidsSection.appendChild(raidCard);
      });
    }
    
    panelElement.appendChild(raidsSection);
  }

  // Создать карточку рейда
  createRaidCard(raidInfo) {
    const card = document.createElement('div');
    card.className = 'raid-card';
    
    // Определяем CSS класс по сложности
    const difficultyClass = `raid-${raidInfo.difficulty}`;
    card.classList.add(difficultyClass);
    
    // Формируем требования
    const requirementsList = Object.entries(raidInfo.requirements).map(([resource, amount]) => {
      const emoji = getResourceEmoji(resource);
      const available = this.gameState.resources[resource] || 0;
      const hasEnough = available >= amount;
      const className = hasEnough ? 'requirement-met' : 'requirement-not-met';
      return `<span class="${className}">${emoji} ${amount} ${resource}</span>`;
    }).join(', ');
    
    // Формируем гарантированные награды
    const guaranteedRewards = raidInfo.rewards.guaranteed.map(reward => {
      const emoji = getResourceEmoji(reward.resource);
      return `${emoji} ${reward.min}-${reward.max} ${reward.resource}`;
    }).join(', ');
    
    // Формируем случайные награды
    const chanceRewards = raidInfo.rewards.chance.map(chance => {
      const percent = Math.round(chance.probability * 100);
      if (chance.reward.type === 'special') {
        return `${percent}% ${chance.description}`;
      } else {
        const emoji = getResourceEmoji(chance.reward.resource);
        return `${percent}% ${emoji} +${chance.reward.amount} ${chance.reward.resource}`;
      }
    }).join('<br>');
    
    card.innerHTML = `
      <div class="raid-card-header">
        <h4>${raidInfo.name}</h4>
        <div class="raid-difficulty">${this.capitalize(raidInfo.difficulty)}</div>
      </div>
      
      <div class="raid-card-content">
        <p class="raid-description">${raidInfo.description}</p>
        
        <div class="raid-details">
          <div class="raid-detail-row">
            <strong>⏱️ Duration:</strong> ${raidInfo.durationText}
          </div>
          <div class="raid-detail-row">
            <strong>⚠️ Risk:</strong> ${raidInfo.riskPercentage}% casualties
          </div>
          <div class="raid-detail-row">
            <strong>📋 Requirements:</strong> ${requirementsList}
          </div>
        </div>
        
        <div class="raid-rewards">
          <div class="reward-section">
            <strong>🎁 Guaranteed:</strong>
            <div class="reward-list">${guaranteedRewards}</div>
          </div>
          
          ${chanceRewards ? `
            <div class="reward-section">
              <strong>🎲 Chance Rewards:</strong>
              <div class="reward-list">${chanceRewards}</div>
            </div>
          ` : ''}
        </div>
        
        ${raidInfo.completedCount > 0 ? `
          <div class="raid-stats">
            <small>📊 Completed ${raidInfo.completedCount} times</small>
          </div>
        ` : ''}
      </div>
      
      <div class="raid-card-footer">
        <button class="start-raid-button ${raidInfo.canStart ? '' : 'disabled'}" 
                data-raid-id="${raidInfo.id}"
                ${raidInfo.canStart ? '' : 'disabled'}>
          ${raidInfo.canStart ? '⚔️ Start Raid' : '❌ Cannot Start'}
        </button>
        ${!raidInfo.canStart && raidInfo.canStartReason ? `
          <div class="raid-error-message">${raidInfo.canStartReason}</div>
        ` : ''}
      </div>
    `;
    
    // Стили карточки
    card.style.cssText = `
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 1px solid #dee2e6;
      border-radius: 12px;
      padding: 1rem;
      margin: 0.5rem 0;
      transition: all 0.3s ease;
    `;
    
    // Стили по сложности
    if (raidInfo.difficulty === 'beginner') {
      card.style.borderLeftColor = '#28a745';
      card.style.borderLeftWidth = '4px';
    } else if (raidInfo.difficulty === 'intermediate') {
      card.style.borderLeftColor = '#ffc107';
      card.style.borderLeftWidth = '4px';
    } else if (raidInfo.difficulty === 'advanced') {
      card.style.borderLeftColor = '#dc3545';
      card.style.borderLeftWidth = '4px';
    }
    
    // Привязываем обработчик кнопки
    const startButton = card.querySelector('.start-raid-button');
    if (startButton && raidInfo.canStart) {
      this.addEventListener(startButton, 'click', () => {
        this.handleStartRaid(raidInfo.id);
      });
    }
    
    return card;
  }

  // Показать статистику рейдов
  showRaidStatistics(panelElement) {
    const stats = this.getRaidStatistics();
    
    const statsSection = document.createElement('div');
    statsSection.className = 'raid-statistics-section';
    statsSection.innerHTML = `
      <h3>📊 Raid Statistics</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.totalRaids}</div>
          <div class="stat-label">Total Raids</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.successfulRaids}</div>
          <div class="stat-label">Successful</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.successRate}</div>
          <div class="stat-label">Success Rate</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.peopleLost}</div>
          <div class="stat-label">People Lost</div>
        </div>
      </div>
      
      ${Object.keys(stats.resourcesGained).length > 0 ? `
        <div class="resources-gained">
          <h4>📦 Resources Gained</h4>
          <div class="resource-stats">
            ${Object.entries(stats.resourcesGained).map(([resource, amount]) => {
              const emoji = getResourceEmoji(resource);
              return `<span class="resource-stat">${emoji} ${amount} ${resource}</span>`;
            }).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    statsSection.style.cssText = `
      background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
      border-radius: 12px;
      padding: 1rem;
      margin: 1rem 0;
    `;
    
    panelElement.appendChild(statsSection);
  }

  // Показать специальные награды
  showSpecialRewards(panelElement) {
    const specialRewards = this.getSpecialRewards();
    
    if (specialRewards.length === 0) return;
    
    const rewardsSection = document.createElement('div');
    rewardsSection.className = 'special-rewards-section';
    rewardsSection.innerHTML = '<h3>✨ Special Rewards</h3>';
    
    specialRewards.forEach(reward => {
      const rewardItem = document.createElement('div');
      rewardItem.className = 'special-reward-item';
      rewardItem.innerHTML = `
        <div class="reward-info">
          <span class="reward-icon">${reward.icon}</span>
          <div class="reward-details">
            <div class="reward-name">${reward.name}</div>
            <div class="reward-description">${reward.definition ? reward.definition.description : 'Special item'}</div>
          </div>
          <div class="reward-count">×${reward.count}</div>
        </div>
        <button class="use-reward-button" data-reward-id="${reward.id}">
          🎯 Use
        </button>
      `;
      
      rewardItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 8px;
        padding: 0.75rem;
        margin: 0.5rem 0;
        border: 1px solid #dee2e6;
      `;
      
      // Привязываем обработчик использования
      const useButton = rewardItem.querySelector('.use-reward-button');
      this.addEventListener(useButton, 'click', () => {
        this.handleUseSpecialReward(reward.id);
      });
      
      rewardsSection.appendChild(rewardItem);
    });
    
    rewardsSection.style.cssText = `
      background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
      border-radius: 12px;
      padding: 1rem;
      margin: 1rem 0;
    `;
    
    panelElement.appendChild(rewardsSection);
  }

  // Обработчики событий
  handleStartRaid(raidId) {
    if (this.gameState.raidManager) {
      const success = this.gameState.raidManager.startRaid(raidId);
      if (success) {
        // Обновляем панель для показа активного рейда
        this.updatePanel();
      }
    }
  }

  handleCancelRaid() {
    const confirmed = confirm('⚠️ Cancel the current raid?\n\nYou will get back 50% of spent resources, but lose any potential rewards.');
    
    if (confirmed && this.gameState.raidManager) {
      const success = this.gameState.raidManager.cancelRaid();
      if (success) {
        this.updatePanel();
      }
    }
  }

  handleUseSpecialReward(rewardId) {
    if (this.gameState.raidManager) {
      const success = this.gameState.raidManager.useSpecialReward(rewardId);
      if (success) {
        this.updatePanel();
      }
    }
  }

  // Запустить обновление статуса рейда
  startStatusUpdate() {
    if (this.updateInterval) return;
    
    this.updateInterval = this.createInterval(() => {
      const status = this.getCurrentRaidStatus();
      if (!status.inProgress) {
        this.stopStatusUpdate();
        this.updatePanel();
        return;
      }
      
      // Обновляем прогресс-бар и таймер
      const progressBar = document.querySelector('.raid-progress-fill');
      const timeRemaining = document.querySelector('.raid-time-remaining');
      
      if (progressBar) {
        progressBar.style.width = `${status.progress}%`;
      }
      
      if (timeRemaining) {
        timeRemaining.textContent = status.timeRemainingText;
      }
    }, 1000, 'raid-status-update');
  }

  // Остановить обновление статуса рейда
  stopStatusUpdate() {
    if (this.updateInterval) {
      this.cleanupManager.clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Обновить панель
  updatePanel() {
    const panelElement = document.getElementById('panel-container');
    if (panelElement && !panelElement.classList.contains('hidden')) {
      this.createRaidPanel(panelElement);
    }
  }

  // Утилиты (делегируем к RaidManager)
  isRaidSystemUnlocked() {
    return this.gameState.buildingManager?.isRaidSystemUnlocked() || false;
  }

  getAvailableRaids() {
    if (!this.gameState.raidManager) return [];
    
    return this.gameState.raidManager.getAvailableRaids()
      .map(raid => this.gameState.raidManager.getRaidInfo(raid.id))
      .filter(Boolean);
  }

  getCurrentRaidStatus() {
    if (!this.gameState.raidManager) {
      return { inProgress: false };
    }
    
    return this.gameState.raidManager.getCurrentRaidStatus();
  }

  getRaidStatistics() {
    if (!this.gameState.raidManager) {
      return {
        totalRaids: 0,
        successfulRaids: 0,
        successRate: '0%',
        peopleLost: 0,
        resourcesGained: {}
      };
    }
    
    return this.gameState.raidManager.getRaidStatistics();
  }

  getSpecialRewards() {
    if (!this.gameState.raidManager) return [];
    
    return this.gameState.raidManager.getSpecialRewards();
  }

  // Вспомогательные функции
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  clearPanel(panelElement) {
    if (panelElement) {
      panelElement.innerHTML = '';
      panelElement.classList.remove('hidden');
    }
  }

  // Добавить CSS стили для рейдов
  addRaidStyles() {
    if (document.getElementById('raid-panel-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'raid-panel-styles';
    style.textContent = `
      .raid-progress-container {
        margin: 1rem 0;
      }
      
      .raid-progress-bar {
        width: 100%;
        height: 20px;
        background: rgba(0,0,0,0.1);
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 0.5rem;
      }
      
      .raid-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        transition: width 0.3s ease;
      }
      
      .raid-time-remaining {
        text-align: center;
        font-weight: bold;
        font-size: 1.1em;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin: 1rem 0;
      }
      
      .stat-item {
        text-align: center;
        padding: 0.75rem;
        background: rgba(255,255,255,0.7);
        border-radius: 8px;
      }
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: bold;
        color: #2c3e50;
      }
      
      .stat-label {
        font-size: 0.85rem;
        color: #6c757d;
        margin-top: 0.25rem;
      }
      
      .requirement-met {
        color: #28a745;
        font-weight: bold;
      }
      
      .requirement-not-met {
        color: #dc3545;
        font-weight: bold;
      }
      
      .start-raid-button {
        width: 100%;
        padding: 0.75rem;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .start-raid-button:hover:not(.disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      }
      
      .start-raid-button.disabled {
        background: #6c757d;
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      .cancel-raid-button {
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
      }
      
      .use-reward-button {
        background: linear-gradient(135deg, #9c27b0 0%, #8e24aa 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
      }
      
      .raid-error-message {
        color: #dc3545;
        font-size: 0.85rem;
        margin-top: 0.5rem;
        text-align: center;
      }
      
      .resource-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .resource-stat {
        background: rgba(255,255,255,0.8);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
      }
      
      .reward-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-grow: 1;
      }
      
      .reward-icon {
        font-size: 1.5rem;
      }
      
      .reward-name {
        font-weight: bold;
        color: #2c3e50;
      }
      
      .reward-description {
        font-size: 0.85rem;
        color: #6c757d;
      }
      
      .reward-count {
        background: #007bff;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: bold;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Деструктор
  destroy() {
    console.log('🧹 RaidPanel cleanup started');
    
    this.stopStatusUpdate();
    super.destroy();
    
    console.log('✅ RaidPanel destroyed');
  }
}