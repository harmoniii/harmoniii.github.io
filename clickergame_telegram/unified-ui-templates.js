/* unified-ui-templates.js - Шаблоны для единого UI Telegram */

// Импорты функций-утилит
import { getResourceEmoji } from '../config/ResourceConfig.js';

export const UI_TEMPLATES = {

  // ===== ОСНОВНАЯ РАЗМЕТКА =====
  gameArea: `
    <div class="tg-game-area">
      <!-- Навигационная панель -->
      <nav class="tg-nav tg-hidden" id="ui-top">
        <button class="tg-button tg-nav-button" id="toggle-buildings">🏗️ Buildings</button>
        <button class="tg-button tg-nav-button" id="toggle-skills">🎯 Skills</button>
        <button class="tg-button tg-nav-button tg-hidden" id="toggle-raids">⚔️ Raids</button>
        <button class="tg-button tg-nav-button" id="toggle-market">🛒 Market</button>
        <button class="tg-button tg-nav-button tg-button--secondary" id="info-button">📚 Info</button>
      </nav>

      <!-- Основная игровая область -->
      <div class="tg-grid-container">
        <!-- Левая панель ресурсов -->
        <div class="tg-grid-side-panel">
          <div class="tg-resource-section">
            <h4 class="tg-resource-title">📦 Basic</h4>
            <div class="tg-resource-group" id="basic-resources"></div>
          </div>
          
          <div class="tg-resource-section">
            <h4 class="tg-resource-title">⚗️ Advanced</h4>
            <div class="tg-resource-group" id="advanced-resources"></div>
          </div>
          
          <div class="tg-resource-section">
            <h4 class="tg-resource-title">✨ Special</h4>
            <div class="tg-resource-group" id="special-resources"></div>
          </div>
        </div>

        <!-- Игровая сетка по центру -->
        <div class="tg-grid-center">
          <canvas class="tg-game-canvas" id="gameCanvas" width="350" height="350"></canvas>
        </div>

        <!-- Правая панель статуса -->
        <div class="tg-grid-side-panel">
          <!-- Комбо индикатор -->
          <div class="tg-status-indicator tg-status-indicator--combo" id="combo-indicator">
            <div class="tg-status-title">COMBO</div>
            <div class="tg-status-value" id="combo-value">0</div>
            <div class="tg-status-subtitle" id="combo-bonus">Hit the target!</div>
          </div>

          <!-- Энергия -->
          <div class="tg-status-indicator tg-status-indicator--energy" id="energy-display">
            <div class="tg-status-title">ENERGY</div>
            <div class="tg-progress-container">
              <div class="tg-progress-bar">
                <div class="tg-progress-fill" id="energy-bar"></div>
              </div>
            </div>
            <div class="tg-status-subtitle" id="energy-text">⚡ 100/100</div>
            <div class="tg-status-subtitle" id="energy-status">Ready!</div>
            <div class="tg-status-subtitle tg-hidden" id="energy-warning">⚡ Low!</div>
          </div>
        </div>
      </div>

      <!-- Быстрые действия -->
      <div class="tg-quick-actions">
        <button class="tg-quick-action" id="tg-buildings-btn">🏗️</button>
        <button class="tg-quick-action" id="tg-skills-btn">🎯</button>
        <button class="tg-quick-action tg-hidden" id="tg-raids-btn">⚔️</button>
        <button class="tg-quick-action" id="tg-market-btn">🛒</button>
      </div>
    </div>
  `,

  // ===== ПАНЕЛЬ КОНТЕНТА =====
  panel: `
    <div class="tg-panel tg-hidden" id="panel-container">
      <div class="tg-panel-header">
        <h2 class="tg-panel-title" id="panel-title">Panel</h2>
      </div>
      <div class="tg-panel-content" id="panel-content">
        <!-- Контент панели -->
      </div>
    </div>
  `,

  // ===== КАРТОЧКИ ПРЕДМЕТОВ =====
  buildingCard: (building) => `
    <div class="tg-item-card tg-item-card--building">
      <div class="tg-item-header">
        <span class="tg-item-icon">${building.img}</span>
        <span class="tg-item-name">${building.name}</span>
        <span class="tg-item-badge">Lv. ${building.currentLevel}</span>
      </div>
      
      <div class="tg-item-description">${building.description}</div>
      
      <div class="tg-item-details">
        ${building.productionRate ? `<div>📈 Production: ${building.productionRate}</div>` : ''}
        ${building.specialEffect ? `<div>✨ Special: ${building.specialEffect}</div>` : ''}
        ${building.currentLevel > 0 ? `<div>🔧 Status: <span style="color: ${building.isActive ? 'var(--tg-success-color)' : 'var(--tg-hint-color)'}">${building.isActive ? 'Active' : 'Inactive'}</span></div>` : ''}
      </div>
      
      <div class="tg-item-footer">
        ${building.isMaxLevel ? 
          `<span class="tg-item-badge" style="background: var(--tg-warning-color)">🏆 MAX LEVEL</span>` :
          `<span class="tg-item-price">💰 ${formatPrice(building.nextPrice)}</span>
           <button class="tg-button ${building.canAfford ? '' : 'tg-button--secondary'}" 
                   ${building.canAfford ? '' : 'disabled'} 
                   data-building-id="${building.id}">
             ${building.canAfford ? '⬆️ Upgrade' : '❌ Can\'t Afford'}
           </button>`
        }
      </div>
    </div>
  `,

  skillCard: (skill) => `
    <div class="tg-item-card tg-item-card--skill">
      <div class="tg-item-header">
        <span class="tg-item-icon">${skill.icon}</span>
        <span class="tg-item-name">${skill.name}</span>
        <span class="tg-item-badge">Lv. ${skill.currentLevel}</span>
      </div>
      
      <div class="tg-item-description">${skill.description}</div>
      
      <div class="tg-item-details">
        ${skill.currentLevel > 0 ? `<div>💪 Current: ${skill.effectDescription || skill.currentEffect}</div>` : ''}
        <div>🎯 Type: ${getEffectTypeDescription(skill.effect?.type)}</div>
        ${!skill.isMaxLevel ? `<div style="color: var(--tg-success-color)">⬆️ Next: ${skill.nextEffectDescription || 'Unknown'}</div>` : ''}
      </div>
      
      <div class="tg-item-footer">
        ${skill.isMaxLevel ? 
          `<span class="tg-item-badge" style="background: var(--tg-warning-color)">🏆 MAX LEVEL</span>` :
          `<span class="tg-item-price">✨ ${skill.nextCost} SP</span>
           <button class="tg-button ${skill.canAfford ? '' : 'tg-button--secondary'}" 
                   ${skill.canAfford ? '' : 'disabled'} 
                   data-skill-id="${skill.id}">
             ${skill.canAfford ? '📚 Learn' : '❌ Not Enough SP'}
           </button>`
        }
      </div>
    </div>
  `,

  marketCard: (item) => `
    <div class="tg-item-card tg-item-card--market">
      <div class="tg-item-header">
        <span class="tg-item-icon">${item.icon}</span>
        <span class="tg-item-name">${item.name}</span>
      </div>
      
      <div class="tg-item-description">${item.description}</div>
      
      <div class="tg-item-details">
        <div>💰 Price: ${formatPrice(item.effectivePrice || item.price)}</div>
        ${item.effectivePrice && item.price ? `<div style="text-decoration: line-through; color: var(--tg-hint-color)">Original: ${formatPrice(item.price)}</div>` : ''}
        <div>🎁 Reward: ${item.rewardText}</div>
        <div class="tg-requirement ${item.canAfford ? 'tg-requirement--met' : 'tg-requirement--not-met'}">
          ${item.canAfford ? '✅ You can afford this' : '❌ Not enough resources'}
        </div>
      </div>
      
      <div class="tg-item-footer">
        <button class="tg-button tg-w-full ${item.canAfford ? '' : 'tg-button--secondary'}" 
                ${item.canAfford ? '' : 'disabled'} 
                data-item-id="${item.id}">
          ${item.canAfford ? '🛒 Buy' : '❌ Cannot Buy'}
        </button>
      </div>
    </div>
  `,

  // ===== РЕЙД КАРТОЧКИ =====
  raidCard: (raid) => `
    <div class="tg-item-card tg-item-card--raid">
      <div class="tg-item-header">
        <span class="tg-item-icon">⚔️</span>
        <span class="tg-item-name">${raid.name}</span>
        <span class="tg-item-badge" style="background: ${getDifficultyColor(raid.difficulty)}">${raid.difficulty}</span>
      </div>
      
      <div class="tg-item-description">${raid.description}</div>
      
      <div class="tg-item-details">
        <div>⏱️ Duration: ${raid.durationText}</div>
        <div>⚠️ Risk: ${raid.riskPercentage}% casualties</div>
        <div>📋 Requirements: ${formatRequirements(raid.requirements)}</div>
      </div>
      
      <div class="tg-reward-section">
        <div class="tg-reward-title">🎁 Guaranteed Rewards:</div>
        <div class="tg-reward-list">${formatRewards(raid.rewards.guaranteed)}</div>
        
        ${raid.rewards.chance.length > 0 ? `
          <div class="tg-reward-title">🎲 Chance Rewards:</div>
          <div class="tg-reward-list">${formatChanceRewards(raid.rewards.chance)}</div>
        ` : ''}
      </div>
      
      ${raid.completedCount > 0 ? `
        <div class="tg-text tg-text--small tg-text--secondary tg-text-center">
          📊 Completed ${raid.completedCount} times
        </div>
      ` : ''}
      
      <div class="tg-item-footer">
        <button class="tg-button tg-w-full ${raid.canStart ? '' : 'tg-button--secondary'}" 
                ${raid.canStart ? '' : 'disabled'} 
                data-raid-id="${raid.id}">
          ${raid.canStart ? '⚔️ Start Raid' : '❌ Cannot Start'}
        </button>
        ${!raid.canStart && raid.canStartReason ? `
          <div class="tg-text tg-text--small" style="color: var(--tg-error-color); text-align: center; margin-top: var(--tg-spacing-xs);">
            ${raid.canStartReason}
          </div>
        ` : ''}
      </div>
    </div>
  `,

  // ===== АКТИВНЫЙ РЕЙД =====
  activeRaidStatus: (status) => `
    <div class="tg-special-card" style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); border-color: var(--tg-warning-color);">
      <div class="tg-special-icon">🎯</div>
      <div class="tg-special-title">Active Raid: ${status.raid.name}</div>
      <div class="tg-special-description">
        <strong>Difficulty:</strong> ${status.raid.difficulty}<br>
        <strong>Risk:</strong> ${status.raid.riskPercentage}% chance of casualties<br>
        <strong>Description:</strong> ${status.raid.description}
      </div>
      
      <div class="tg-progress-container">
        <div class="tg-progress-bar">
          <div class="tg-progress-fill tg-progress-fill--animated" style="width: ${status.progress}%"></div>
        </div>
        <div class="tg-text tg-text-center" style="margin-top: var(--tg-spacing-xs); font-weight: 600;">
          ${status.timeRemainingText}
        </div>
      </div>
      
      <div class="tg-special-card" style="background: rgba(255, 193, 7, 0.2); border: 1px solid var(--tg-warning-color); margin: var(--tg-spacing-md) 0;">
        <div class="tg-text tg-text-center">
          ⚠️ <strong>Game Field Locked:</strong> All clicking disabled during raid
        </div>
      </div>
      
      <button class="tg-button tg-button--error" id="cancel-raid-btn">
        ❌ Cancel Raid (50% refund)
      </button>
    </div>
  `,

  // ===== СИСТЕМА ЗАБЛОКИРОВАНА =====
  lockedSystem: (systemName, requirements, description) => `
    <div class="tg-special-card tg-special-card--locked">
      <div class="tg-special-icon">🔒</div>
      <div class="tg-special-title">${systemName} Locked</div>
      <div class="tg-special-description">${description}</div>
      
      <div class="tg-section">
        <h4 class="tg-heading tg-heading--h3">Requirements:</h4>
        <div class="tg-list">
          ${requirements.map(req => `
            <div class="tg-list-item">
              <span class="tg-list-item-icon">${req.icon}</span>
              <span class="tg-list-item-content">${req.amount} ${req.name}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `,

  // ===== СТАТИСТИКА =====
  statsGrid: (stats) => `
    <div class="tg-stats-grid">
      ${Object.entries(stats).map(([key, value]) => `
        <div class="tg-stat-item">
          <div class="tg-stat-value">${typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div class="tg-stat-label">${formatStatLabel(key)}</div>
        </div>
      `).join('')}
    </div>
  `,

  // ===== КАТЕГОРИИ =====
  categorySection: (title, items) => `
    <div class="tg-category">
      <h3 class="tg-category-title">${title}</h3>
      <div class="tg-section">
        ${items}
      </div>
    </div>
  `,

  // ===== УВЕДОМЛЕНИЯ =====
  notification: (message, type = 'info') => `
    <div class="tg-notification tg-notification--${type}">
      ${message}
    </div>
  `,

  skillNotification: (title, description) => `
    <div class="tg-notification tg-notification--success">
      <div style="font-weight: 600; margin-bottom: var(--tg-spacing-xs);">${title}</div>
      <div style="font-size: 0.875rem;">${description}</div>
    </div>
  `,

  // ===== ЭФФЕКТЫ =====
  effectIndicator: (effect, type) => `
    <div class="tg-effect tg-effect--${type}" data-effect-id="${effect.id}" title="${effect.description}">
      <span class="tg-effect-icon">${extractIcon(effect.name)}</span>
      <span class="tg-effect-name">${extractName(effect.name)}</span>
    </div>
  `,

  // ===== МОДАЛЬНЫЕ ОКНА =====
  mysteryBox: (options) => `
    <div class="tg-modal-content">
      <div class="tg-modal-header">
        <h3 class="tg-heading tg-heading--h2">📦 Mystery Box</h3>
      </div>
      <div class="tg-modal-body">
        <p class="tg-text tg-text-center">Choose your reward:</p>
        <div class="tg-grid tg-grid--3" style="margin: var(--tg-spacing-lg) 0;">
          ${options.map(resource => `
            <button class="tg-button tg-button--large" data-resource="${resource}">
              <span style="font-size: 1.5rem;">${getResourceEmoji(resource)}</span>
              <span>+5 ${resource}</span>
            </button>
          `).join('')}
        </div>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-button tg-button--secondary">Cancel</button>
      </div>
    </div>
  `,

  confirmModal: (title, message, confirmText = 'Confirm', cancelText = 'Cancel') => `
    <div class="tg-modal-content">
      <div class="tg-modal-header">
        <h3 class="tg-heading tg-heading--h2">${title}</h3>
      </div>
      <div class="tg-modal-body">
        <p class="tg-text">${message}</p>
      </div>
      <div class="tg-modal-footer">
        <button class="tg-button tg-button--secondary" data-action="cancel">${cancelText}</button>
        <button class="tg-button" data-action="confirm">${confirmText}</button>
      </div>
    </div>
  `,

  infoModal: (title, content) => `
    <div class="tg-modal-content">
      <div class="tg-modal-header">
        <h3 class="tg-heading tg-heading--h2">${title}</h3>
      </div>
      <div class="tg-modal-body">
        ${content}
      </div>
      <div class="tg-modal-footer">
        <button class="tg-button">Close</button>
      </div>
    </div>
  `,

  // ===== ПРОГРЕСС ЭЛЕМЕНТЫ =====
  progressBar: (progress, label = '', animated = false) => `
    <div class="tg-progress-container">
      <div class="tg-progress-bar">
        <div class="tg-progress-fill ${animated ? 'tg-progress-fill--animated' : ''}" 
             style="width: ${Math.max(0, Math.min(100, progress))}%"></div>
      </div>
      ${label ? `<div class="tg-text tg-text-center" style="margin-top: 0.25rem; font-weight: 600;">${label}</div>` : ''}
    </div>
  `,

  // ===== СПИСКИ =====
  list: (items) => `
    <div class="tg-list">
      ${items.map(item => `
        <div class="tg-list-item">
          ${item.icon ? `<span class="tg-list-item-icon">${item.icon}</span>` : ''}
          <div class="tg-list-item-content">
            ${item.title ? `<div class="tg-list-item-title">${item.title}</div>` : ''}
            ${item.subtitle ? `<div class="tg-list-item-subtitle">${item.subtitle}</div>` : ''}
            ${!item.title && !item.subtitle ? item.content || '' : ''}
          </div>
          ${item.action ? `<div class="tg-list-item-action">${item.action}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `,

  // ===== СПЕЦИАЛЬНЫЕ ЭЛЕМЕНТЫ =====
  loadingSpinner: (text = 'Loading...') => `
    <div class="tg-loading">
      <div class="tg-loading-spinner"></div>
      <div class="tg-loading-text">${text}</div>
    </div>
  `,

  errorState: (title, message, actionText = 'Reload', actionCallback = 'location.reload()') => `
    <div class="tg-special-card tg-special-card--error">
      <div class="tg-special-icon">❌</div>
      <div class="tg-special-title">${title}</div>
      <div class="tg-special-description">${message}</div>
      <button class="tg-button tg-button--error" onclick="${actionCallback}">${actionText}</button>
    </div>
  `,

  emptyState: (title, message, actionText = '', actionCallback = '') => `
    <div class="tg-special-card">
      <div class="tg-special-icon">📭</div>
      <div class="tg-special-title">${title}</div>
      <div class="tg-special-description">${message}</div>
      ${actionText && actionCallback ? `<button class="tg-button" onclick="${actionCallback}">${actionText}</button>` : ''}
    </div>
  `,

  // ===== ACHIEVEMENT КАРТОЧКА =====
  achievementCard: (achievement) => `
    <div class="tg-item-card" style="background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%); border-left: 4px solid #FF9800;">
      <div class="tg-item-header">
        <span class="tg-item-icon">${achievement.icon || '🏆'}</span>
        <span class="tg-item-name">${achievement.title}</span>
        <span class="tg-item-badge" style="background: var(--tg-success-color)">✅ Unlocked</span>
      </div>
      
      <div class="tg-item-description">${achievement.description}</div>
      
      ${achievement.reward ? `
        <div class="tg-item-details">
          <div>🎁 Reward: ${achievement.reward}</div>
        </div>
      ` : ''}
    </div>
  `,

  // ===== РЕСУРС ДИСПЛЕЙ =====
  resourceDisplay: (resource, amount, emoji) => `
    <div class="tg-resource-item" data-resource="${resource}" title="${resource}: ${amount}">
      ${emoji} ${formatResourceAmount(amount)}
    </div>
  `,

  // ===== SWITCH ПЕРЕКЛЮЧАТЕЛЬ =====
  toggle: (id, label, checked = false) => `
    <div class="tg-flex tg-flex--between" style="align-items: center;">
      <label for="${id}" class="tg-text">${label}</label>
      <label class="tg-switch">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        <span class="tg-switch-slider"></span>
      </label>
    </div>
  `,

  // ===== TABS ВКЛАДКИ =====
  tabs: (tabs, activeTab = 0) => `
    <div class="tg-tabs">
      <div class="tg-tab-headers">
        ${tabs.map((tab, index) => `
          <button class="tg-tab-header ${index === activeTab ? 'tg-tab-header--active' : ''}" 
                  data-tab-index="${index}">
            ${tab.title}
          </button>
        `).join('')}
      </div>
      <div class="tg-tab-content">
        ${tabs.map((tab, index) => `
          <div class="tg-tab-panel ${index === activeTab ? 'tg-tab-panel--active' : 'tg-hidden'}" 
               data-tab-index="${index}">
            ${tab.content}
          </div>
        `).join('')}
      </div>
    </div>
  `
};

// ===== УТИЛИТЫ ДЛЯ ШАБЛОНОВ =====

export const TEMPLATE_UTILS = {
  
  // Форматировать цену
  formatPrice: (price) => {
    if (!price || typeof price !== 'object') return 'Free';
    
    return Object.entries(price)
      .filter(([resource, amount]) => typeof amount === 'number' && amount > 0)
      .map(([resource, amount]) => `${Math.floor(amount)} ${getResourceEmoji(resource)}`)
      .join(' + ') || 'Free';
  },

  // Форматировать количество ресурса
  formatResourceAmount: (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0';
    
    if (amount >= 1000000000) {
      return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    } else if (amount >= 100) {
      return Math.floor(amount).toString();
    } else {
      return amount.toFixed(1);
    }
  },

  // Получить цвет сложности
  getDifficultyColor: (difficulty) => {
    const colors = {
      beginner: '#28a745',
      intermediate: '#ffc107',
      advanced: '#dc3545',
      expert: '#6f42c1',
      legendary: '#fd7e14'
    };
    return colors[difficulty] || '#6c757d';
  },

  // Форматировать требования
  formatRequirements: (requirements) => {
    return Object.entries(requirements)
      .map(([resource, amount]) => `${getResourceEmoji(resource)} ${amount}`)
      .join(', ');
  },

  // Форматировать награды
  formatRewards: (rewards) => {
    return rewards.map(reward => {
      const emoji = getResourceEmoji(reward.resource);
      return `${emoji} ${reward.min}-${reward.max} ${reward.resource}`;
    }).join(', ');
  },

  // Форматировать случайные награды
  formatChanceRewards: (rewards) => {
    return rewards.map(chance => {
      const percent = Math.round(chance.probability * 100);
      if (chance.reward.type === 'special') {
        return `${percent}% ${chance.description}`;
      } else {
        const emoji = getResourceEmoji(chance.reward.resource);
        return `${percent}% ${emoji} +${chance.reward.amount} ${chance.reward.resource}`;
      }
    }).join('<br>');
  },

  // Форматировать ярлык статистики
  formatStatLabel: (key) => {
    const labels = {
      totalRaids: 'Total Raids',
      successfulRaids: 'Successful',
      successRate: 'Success Rate',
      peopleLost: 'People Lost',
      resourcesGained: 'Resources Gained',
      totalClicks: 'Total Clicks',
      maxCombo: 'Max Combo',
      totalResourcesCollected: 'Resources Collected',
      skillPoints: 'Skill Points',
      buildingLevels: 'Building Levels',
      skillLevels: 'Skill Levels'
    };
    
    return labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  },

  // Получить описание типа эффекта
  getEffectTypeDescription: (type) => {
    const types = {
      'multiplier': 'Multiplier Bonus',
      'chance': 'Chance Effect',
      'generation': 'Resource Generation',
      'reduction': 'Reduction Effect',
      'duration': 'Duration Extension',
      'automation': 'Automation',
      'protection': 'Protection',
      'charges': 'Charge System',
      'preview': 'Preview Feature'
    };
    return types[type] || (type ? `${type} Effect` : 'Unknown Effect');
  },

  // Извлечь иконку из названия
  extractIcon: (name) => {
    if (!name || typeof name !== 'string') return '?';
    
    const emojiMatch = name.match(/^(\p{Emoji})/u);
    if (emojiMatch) return emojiMatch[1];
    
    const anyEmojiMatch = name.match(/(\p{Emoji})/u);
    if (anyEmojiMatch) return anyEmojiMatch[1];
    
    return name.charAt(0) || '?';
  },

  // Извлечь название без иконки
  extractName: (name) => {
    if (!name || typeof name !== 'string') return 'Unknown';
    return name.replace(/\p{Emoji}/gu, '').trim() || 'Unknown';
  },

  // Создать CSS классы для компонента
  createComponentStyles: (componentName, styles) => {
    if (document.getElementById(`${componentName}-styles`)) return;
    
    const style = document.createElement('style');
    style.id = `${componentName}-styles`;
    style.textContent = styles;
    document.head.appendChild(style);
  },

  // Добавить обработчик событий к элементу
  addEventHandler: (element, event, handler, options = {}) => {
    if (element && typeof handler === 'function') {
      element.addEventListener(event, handler, options);
      return () => element.removeEventListener(event, handler, options);
    }
    return () => {};
  },

  // Анимировать элемент
  animate: (element, animation, duration = 300) => {
    if (!element) return Promise.resolve();
    
    return new Promise(resolve => {
      element.style.animation = `${animation} ${duration}ms ease`;
      setTimeout(() => {
        element.style.animation = '';
        resolve();
      }, duration);
    });
  },

  // Показать/скрыть элемент с анимацией
  toggleVisibility: (element, show = true, animation = 'fadeIn') => {
    if (!element) return Promise.resolve();
    
    if (show) {
      element.classList.remove('tg-hidden');
      return TEMPLATE_UTILS.animate(element, animation);
    } else {
      return TEMPLATE_UTILS.animate(element, 'fadeOut').then(() => {
        element.classList.add('tg-hidden');
      });
    }
  },

  // Создать делегированный обработчик событий
  delegate: (parent, selector, event, handler) => {
    if (!parent || typeof handler !== 'function') return () => {};
    
    const delegatedHandler = (e) => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) {
        handler.call(target, e);
      }
    };
    
    parent.addEventListener(event, delegatedHandler);
    return () => parent.removeEventListener(event, delegatedHandler);
  },

  // Очистить содержимое элемента
  clearContent: (element) => {
    if (element) {
      element.innerHTML = '';
    }
  },

  // Установить содержимое элемента
  setContent: (element, content) => {
    if (element) {
      element.innerHTML = content;
    }
  },

  // Добавить класс с анимацией
  addClass: (element, className, animationDuration = 0) => {
    if (!element) return Promise.resolve();
    
    element.classList.add(className);
    
    if (animationDuration > 0) {
      return new Promise(resolve => {
        setTimeout(resolve, animationDuration);
      });
    }
    
    return Promise.resolve();
  },

  // Удалить класс с анимацией
  removeClass: (element, className, animationDuration = 0) => {
    if (!element) return Promise.resolve();
    
    if (animationDuration > 0) {
      return new Promise(resolve => {
        setTimeout(() => {
          element.classList.remove(className);
          resolve();
        }, animationDuration);
      });
    } else {
      element.classList.remove(className);
      return Promise.resolve();
    }
  }
};

// Экспортируем утилиты отдельно для удобства
export const {
  formatPrice,
  formatResourceAmount,
  getDifficultyColor,
  formatRequirements,
  formatRewards,
  formatChanceRewards,
  formatStatLabel,
  getEffectTypeDescription,
  extractIcon,
  extractName,
  createComponentStyles,
  addEventHandler,
  animate,
  toggleVisibility,
  delegate,
  clearContent,
  setContent,
  addClass,
  removeClass
} = TEMPLATE_UTILS;