/* unified-ui-templates.js - Шаблоны для единого UI Telegram */

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
              <span>+5 ${resource}