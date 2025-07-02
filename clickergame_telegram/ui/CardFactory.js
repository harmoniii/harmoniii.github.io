// ui/CardFactory.js - ОБНОВЛЕНО: единый дизайн для Telegram
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';
import { UI_TEMPLATES, UI_HELPERS } from './UnifiedUITemplates.js';

export class CardFactory extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
  }

  // Создать карточку здания с новым дизайном
  createBuildingCard(buildingInfo) {
    const card = UI_HELPERS.createElement(this.createBuildingCardHTML(buildingInfo));
    
    // Привязываем обработчики событий
    this.bindBuildingCardEvents(card, buildingInfo);
    
    // Регистрируем для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // Создать карточку навыка с новым дизайном
  createSkillCard(skillInfo) {
    const card = UI_HELPERS.createElement(this.createSkillCardHTML(skillInfo));
    
    // Привязываем обработчики событий
    this.bindSkillCardEvents(card, skillInfo);
    
    // Регистрируем для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // Создать карточку товара маркета с новым дизайном
createMarketCard(itemInfo) {
  const card = document.createElement('div');
  card.className = 'item-card market-card';
  
  // Проверяем валидность данных
  if (!itemInfo || typeof itemInfo !== 'object') {
    console.error('Invalid itemInfo passed to createMarketCard:', itemInfo);
    card.innerHTML = '<div class="error">Invalid item data</div>';
    return card;
  }

  // Создаем заголовок карточки
  const header = this.createItemHeader(
    itemInfo.icon || '🛒', 
    itemInfo.name || 'Unknown Item'
  );
  
  // Создаем описание
  const description = this.createItemDescription(itemInfo.description || 'No description available');
  
  // Создаем детали товара
  const details = this.createMarketDetails(itemInfo);
  
  // ИСПРАВЛЕНИЕ: Пересчитываем доступность перед созданием footer
  const canAfford = this.checkMarketItemAffordability(itemInfo);
  const correctedItemInfo = { ...itemInfo, canAfford };
  
  // Создаем подвал с кнопкой покупки
  const footer = this.createMarketFooter(correctedItemInfo);
  
  // Собираем карточку
  card.appendChild(header);
  card.appendChild(description);
  card.appendChild(details);
  card.appendChild(footer);
  
  // ИСПРАВЛЕНИЕ: Правильная регистрация карточки для очистки
  this.registerDOMElement(card);
  
  return card;
}

createMarketFooter(itemInfo) {
  const footer = document.createElement('div');
  footer.className = 'item-footer';
  
  try {
    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед созданием кнопки
    const finalCanAfford = itemInfo.canAfford && this.checkMarketItemAffordability(itemInfo);
    
    const buyButton = this.createBuyButton(
      finalCanAfford,
      finalCanAfford ? 'Buy' : 'Cannot Buy',
      () => this.handleMarketPurchase(itemInfo.id, itemInfo.name),
      `${finalCanAfford ? 'Buy' : 'Cannot afford'} ${itemInfo.name}`
    );
    
    footer.appendChild(buyButton);
    
  } catch (error) {
    console.error('Error creating market footer:', error);
    footer.innerHTML = '<div style="color: #f44336;">Error loading purchase options</div>';
  }
  
  return footer;
}

createMarketDetails(itemInfo) {
  const details = document.createElement('div');
  details.className = 'item-details';
  
  try {
    // Показываем эффективную цену (с учетом скидок)
    const price = document.createElement('div');
    const effectivePrice = itemInfo.effectivePrice || itemInfo.price || {};
    price.textContent = `💰 Price: ${this.formatPrice(effectivePrice)}`;
    details.appendChild(price);
    
    // ИСПРАВЛЕНИЕ: Показываем оригинальную цену если есть скидка
    if (itemInfo.effectivePrice && itemInfo.price && 
        typeof itemInfo.effectivePrice === 'object' && 
        typeof itemInfo.price === 'object') {
      
      const originalTotal = this.calculateTotalPrice(itemInfo.price);
      const effectiveTotal = this.calculateTotalPrice(itemInfo.effectivePrice);
      
      if (originalTotal > effectiveTotal) {
        const discountPercent = Math.round((1 - effectiveTotal / originalTotal) * 100);
        const originalPrice = document.createElement('div');
        originalPrice.style.cssText = 'text-decoration: line-through; color: #999; font-size: 0.8em;';
        originalPrice.textContent = `Original: ${this.formatPrice(itemInfo.price)} (-${discountPercent}%)`;
        details.appendChild(originalPrice);
      }
    }
    
    // Показываем награду
    const reward = document.createElement('div');
    reward.textContent = `🎁 Reward: ${itemInfo.rewardText || 'Unknown reward'}`;
    details.appendChild(reward);
    
    // ИСПРАВЛЕНИЕ: Показываем доступность ресурсов
    const affordability = this.createAffordabilityIndicator(itemInfo);
    if (affordability) {
      details.appendChild(affordability);
    }
    
  } catch (error) {
    console.error('Error creating market details:', error);
    details.innerHTML = '<div style="color: #f44336;">Error loading item details</div>';
  }
  
  return details;
}

createAffordabilityIndicator(itemInfo) {
  const affordability = document.createElement('div');
  affordability.style.cssText = 'font-size: 0.85em; margin-top: 5px; padding: 0.25rem; border-radius: 4px;';
  
  try {
    const canAfford = this.checkMarketItemAffordability(itemInfo);
    
    if (canAfford) {
      affordability.textContent = '✅ You can afford this item';
      affordability.style.cssText += 'color: #4CAF50; background: rgba(76, 175, 80, 0.1);';
    } else {
      const missingResources = this.getMissingResources(itemInfo.effectivePrice || itemInfo.price || {});
      affordability.textContent = `❌ Missing: ${missingResources.join(', ') || 'Unknown requirements'}`;
      affordability.style.cssText += 'color: #f44336; background: rgba(244, 67, 54, 0.1);';
    }
    
    return affordability;
    
  } catch (error) {
    console.error('Error creating affordability indicator:', error);
    affordability.textContent = '⚠️ Unable to check affordability';
    affordability.style.cssText += 'color: #FF9800; background: rgba(255, 152, 0, 0.1);';
    return affordability;
  }
}

getMissingResources(price) {
  if (!price || typeof price !== 'object') {
    return ['Invalid price data'];
  }
  
  const missing = [];
  
  try {
    Object.entries(price).forEach(([resource, required]) => {
      const numRequired = parseFloat(required);
      
      // Пропускаем невалидные значения
      if (isNaN(numRequired) || numRequired <= 0) {
        return;
      }
      
      const available = this.gameState.resources[resource] || 0;
      
      if (available < numRequired) {
        const shortfall = numRequired - available;
        const emoji = this.getResourceEmoji ? this.getResourceEmoji(resource) : '📦';
        missing.push(`${shortfall.toFixed(1)} ${emoji} ${resource}`);
      }
    });
  } catch (error) {
    console.error('Error calculating missing resources:', error);
    missing.push('Error calculating requirements');
  }
  
  return missing;
}

checkMarketItemAffordability(itemInfo) {
  try {
    const price = itemInfo.effectivePrice || itemInfo.price;
    
    if (!price || typeof price !== 'object') {
      console.warn('Item has no valid price:', itemInfo);
      return false;
    }

    // Проверяем каждый ресурс в цене
    for (const [resource, requiredAmount] of Object.entries(price)) {
      const numRequired = parseFloat(requiredAmount);
      
      // Пропускаем невалидные значения
      if (isNaN(numRequired) || numRequired <= 0) {
        continue;
      }
      
      const availableAmount = this.gameState.resources[resource] || 0;
      
      if (availableAmount < numRequired) {
        console.log(`Cannot afford ${itemInfo.name}: need ${numRequired} ${resource}, have ${availableAmount}`);
        return false;
      }
    }

    return true;
    
  } catch (error) {
    console.error('Error checking market item affordability:', error);
    return false;
  }
}

// НОВЫЙ метод для расчета общей стоимости
calculateTotalPrice(price) {
  if (!price || typeof price !== 'object') return 0;
  
  return Object.values(price).reduce((total, amount) => {
    const numAmount = parseFloat(amount);
    return total + (isNaN(numAmount) ? 0 : Math.max(0, numAmount));
  }, 0);
}

  // Создать карточку рейда с новым дизайном
  createRaidCard(raidInfo) {
    const card = UI_HELPERS.createElement(this.createRaidCardHTML(raidInfo));
    
    // Привязываем обработчики событий
    this.bindRaidCardEvents(card, raidInfo);
    
    // Регистрируем для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // Создать карточку эффекта с новым дизайном
  createEffectCard(effectInfo, type) {
    const card = UI_HELPERS.createElement(this.createEffectCardHTML(effectInfo, type));
    
    // Регистрируем для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // ===== HTML ГЕНЕРАТОРЫ =====

  createBuildingCardHTML(building) {
    return `
      <div class="tg-item-card tg-item-card--building">
        <div class="tg-item-header">
          <span class="tg-item-icon">${building.img}</span>
          <span class="tg-item-name">${building.name}</span>
          <span class="tg-item-badge">Lv. ${building.currentLevel}/${building.maxLevel}</span>
        </div>
        
        <div class="tg-item-description">${building.description}</div>
        
        <div class="tg-item-details">
          ${building.productionRate ? `<div>📈 Production: ${building.productionRate}</div>` : ''}
          ${building.specialEffect ? `<div>✨ Special: ${building.specialEffect}</div>` : ''}
          ${building.currentLevel > 0 ? `
            <div>🔧 Status: 
              <span style="color: ${building.isActive ? 'var(--tg-success-color)' : 'var(--tg-hint-color)'}">
                ${building.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ` : ''}
        </div>
        
        <div class="tg-item-footer">
          ${building.isMaxLevel ? 
            `<span class="tg-item-badge" style="background: var(--tg-warning-color); width: 100%; text-align: center; padding: var(--tg-spacing-sm);">
              🏆 MAX LEVEL
            </span>` :
            `<span class="tg-item-price">💰 ${UI_HELPERS.formatPrice(building.nextPrice)}</span>
             <button class="tg-button ${building.canAfford ? '' : 'tg-button--secondary'}" 
                     ${building.canAfford ? '' : 'disabled'} 
                     data-building-id="${building.id}"
                     title="Upgrade ${building.name} to level ${building.currentLevel + 1}">
               ${building.canAfford ? '⬆️ Upgrade' : '❌ Can\'t Afford'}
             </button>`
          }
        </div>
      </div>
    `;
  }

  createSkillCardHTML(skill) {
    return `
      <div class="tg-item-card tg-item-card--skill">
        <div class="tg-item-header">
          <span class="tg-item-icon">${skill.icon}</span>
          <span class="tg-item-name">${skill.name}</span>
          <span class="tg-item-badge">Lv. ${skill.currentLevel}/${skill.maxLevel}</span>
        </div>
        
        <div class="tg-item-description">${skill.description}</div>
        
        <div class="tg-item-details">
          ${skill.currentLevel > 0 ? `
            <div>💪 Current: ${skill.effectDescription || `${(skill.currentEffect * 100).toFixed(1)}%`}</div>
          ` : ''}
          <div>🎯 Type: ${this.getEffectTypeDescription(skill.effect?.type)}</div>
          ${!skill.isMaxLevel ? `
            <div style="color: var(--tg-success-color)">
              ⬆️ Next level: ${this.getNextLevelEffect(skill)}
            </div>
          ` : ''}
        </div>
        
        <div class="tg-item-footer">
          ${skill.isMaxLevel ? 
            `<span class="tg-item-badge" style="background: var(--tg-warning-color); width: 100%; text-align: center; padding: var(--tg-spacing-sm);">
              🏆 MAX LEVEL
            </span>` :
            `<span class="tg-item-price">✨ ${skill.nextCost} SP</span>
             <button class="tg-button ${skill.canAfford ? '' : 'tg-button--secondary'}" 
                     ${skill.canAfford ? '' : 'disabled'} 
                     data-skill-id="${skill.id}"
                     title="Learn ${skill.name} level ${skill.currentLevel + 1}">
               ${skill.canAfford ? '📚 Learn' : '❌ Not Enough SP'}
             </button>`
          }
        </div>
      </div>
    `;
  }

  getResourceEmoji(resource) {
  // Импортируем функцию если доступна
  if (typeof getResourceEmoji === 'function') {
    return getResourceEmoji(resource);
  }
  
  // Fallback эмодзи
  const fallbackEmojis = {
    gold: '🪙',
    wood: '🌲',
    stone: '🪨',
    food: '🍎',
    water: '💧',
    iron: '⛓️',
    people: '👥',
    science: '🔬',
    faith: '🙏',
    chaos: '🌪️'
  };
  
  return fallbackEmojis[resource] || '📦';
}

handleMarketPurchase(itemId, itemName) {
  if (!this.gameState.marketManager) {
    this.showError('Market not available');
    return;
  }

  try {
    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед покупкой
    if (!this.gameState.marketManager.canAfford(itemId)) {
      this.showError('Not enough resources!');
      return;
    }

    if (this.gameState.marketManager.buyItem(itemId)) {
      this.showSuccess(`Bought: ${itemName}`);
      this.emitPurchaseEvent(itemId, itemName);
    } else {
      this.showError('Purchase failed!');
    }
    
  } catch (error) {
    console.error('Error in market purchase:', error);
    this.showError('Purchase error occurred');
  }
}

// ВСПОМОГАТЕЛЬНЫЕ методы для уведомлений
showSuccess(message) {
  if (typeof eventBus !== 'undefined' && eventBus.emit) {
    eventBus.emit('ui:notification', { message, type: 'success' });
  }
}

showError(message) {
  if (typeof eventBus !== 'undefined' && eventBus.emit) {
    eventBus.emit('ui:notification', { message, type: 'error' });
  }
}

emitPurchaseEvent(itemId, itemName) {
  if (typeof eventBus !== 'undefined' && eventBus.emit) {
    eventBus.emit('market:item_purchased', { itemId, name: itemName });
  }
}

// Создать карточку рейда (НОВОЕ)
createRaidCard(raidInfo) {
  const card = document.createElement('div');
  card.className = 'tg-item-card tg-item-card--raid';
  
  // Определяем CSS класс и цвет по сложности
  const difficultyColors = {
    beginner: '#28a745',
    intermediate: '#ffc107', 
    advanced: '#dc3545',
    expert: '#6f42c1'
  };
  
  const difficultyColor = difficultyColors[raidInfo.difficulty] || '#6c757d';
  
  const header = this.createItemHeader(
    '⚔️', 
    raidInfo.name, 
    this.capitalize(raidInfo.difficulty)
  );
  
  const description = this.createItemDescription(raidInfo.description);
  const details = this.createRaidDetails(raidInfo);
  const rewards = this.createRaidRewards(raidInfo);
  const footer = this.createRaidFooter(raidInfo);
  
  card.appendChild(header);
  card.appendChild(description);
  card.appendChild(details);
  card.appendChild(rewards);
  card.appendChild(footer);
  
  // Стилизация по сложности
  card.style.borderLeft = `4px solid ${difficultyColor}`;
  
  // Регистрируем карточку для очистки
  this.registerDOMElement(card);
  
  return card;
}

// Создать детали рейда (НОВОЕ)
createRaidDetails(raidInfo) {
  const details = document.createElement('div');
  details.className = 'tg-item-details';
  
  // Длительность
  const duration = document.createElement('div');
  duration.innerHTML = `<strong>⏱️ Duration:</strong> ${raidInfo.durationText}`;
  details.appendChild(duration);
  
  // Риск
  const risk = document.createElement('div');
  risk.innerHTML = `<strong>⚠️ Risk:</strong> ${raidInfo.riskPercentage}% casualties`;
  details.appendChild(risk);
  
  // Требования
  const requirements = document.createElement('div');
  requirements.innerHTML = `<strong>📋 Requirements:</strong>`;
  
  const reqList = document.createElement('div');
  reqList.style.marginTop = '0.5rem';
  reqList.style.display = 'flex';
  reqList.style.flexWrap = 'wrap';
  reqList.style.gap = '0.25rem';
  
  Object.entries(raidInfo.requirements).forEach(([resource, amount]) => {
    const emoji = getResourceEmoji(resource);
    const available = this.gameState.resources[resource] || 0;
    const hasEnough = available >= amount;
    
    const reqSpan = document.createElement('span');
    reqSpan.className = hasEnough ? 'tg-requirement tg-requirement--met' : 'tg-requirement tg-requirement--not-met';
    reqSpan.textContent = `${emoji} ${amount} ${resource}`;
    reqList.appendChild(reqSpan);
  });
  
  requirements.appendChild(reqList);
  details.appendChild(requirements);
  
  return details;
}

// Создать раздел наград рейда (НОВОЕ)
createRaidRewards(raidInfo) {
  const rewards = document.createElement('div');
  rewards.className = 'tg-reward-section';
  rewards.style.margin = '1rem 0';
  
  // Гарантированные награды
  if (raidInfo.rewards.guaranteed && raidInfo.rewards.guaranteed.length > 0) {
    const guaranteedTitle = document.createElement('div');
    guaranteedTitle.className = 'tg-reward-title';
    guaranteedTitle.innerHTML = '<strong>🎁 Guaranteed Rewards:</strong>';
    rewards.appendChild(guaranteedTitle);
    
    const guaranteedList = document.createElement('div');
    guaranteedList.className = 'tg-reward-list';
    guaranteedList.innerHTML = raidInfo.rewards.guaranteed.map(reward => {
      const emoji = getResourceEmoji(reward.resource);
      return `${emoji} ${reward.min}-${reward.max} ${reward.resource}`;
    }).join(', ');
    rewards.appendChild(guaranteedList);
  }
  
  // Случайные награды
  if (raidInfo.rewards.chance && raidInfo.rewards.chance.length > 0) {
    const chanceTitle = document.createElement('div');
    chanceTitle.className = 'tg-reward-title';
    chanceTitle.innerHTML = '<strong>🎲 Chance Rewards:</strong>';
    chanceTitle.style.marginTop = '0.5rem';
    rewards.appendChild(chanceTitle);
    
    const chanceList = document.createElement('div');
    chanceList.className = 'tg-reward-list';
    chanceList.innerHTML = raidInfo.rewards.chance.map(chance => {
      const percent = Math.round(chance.probability * 100);
      if (chance.reward.type === 'special') {
        return `${percent}% ${chance.description}`;
      } else {
        const emoji = getResourceEmoji(chance.reward.resource);
        return `${percent}% ${emoji} +${chance.reward.amount} ${chance.reward.resource}`;
      }
    }).join('<br>');
    rewards.appendChild(chanceList);
  }
  
  return rewards;
}

// Создать подвал карточки рейда (НОВОЕ)
createRaidFooter(raidInfo) {
  const footer = document.createElement('div');
  footer.className = 'tg-item-footer';
  
  // Статистика выполнений
  if (raidInfo.completedCount > 0) {
    const stats = document.createElement('div');
    stats.className = 'tg-text tg-text--small tg-text--secondary';
    stats.style.textAlign = 'center';
    stats.style.marginBottom = '0.5rem';
    stats.textContent = `📊 Completed ${raidInfo.completedCount} times`;
    footer.appendChild(stats);
  }
  
  // Кнопка запуска
  const startButton = this.createBuyButton(
    raidInfo.canStart,
    raidInfo.canStart ? '⚔️ Start Raid' : '❌ Cannot Start',
    () => this.handleStartRaid(raidInfo.id),
    raidInfo.canStart ? `Start ${raidInfo.name}` : raidInfo.canStartReason || 'Cannot start raid'
  );
  
  startButton.style.width = '100%';
  footer.appendChild(startButton);
  
  // Сообщение об ошибке
  if (!raidInfo.canStart && raidInfo.canStartReason) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'tg-text tg-text--small';
    errorMsg.style.color = 'var(--tg-error-color, #f44336)';
    errorMsg.style.textAlign = 'center';
    errorMsg.style.marginTop = '0.5rem';
    errorMsg.textContent = raidInfo.canStartReason;
    footer.appendChild(errorMsg);
  }
  
  return footer;
}

// Обработчик запуска рейда (НОВОЕ)
handleStartRaid(raidId) {
  if (!this.gameState.raidManager) {
    console.error('RaidManager not available');
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid system not available');
    return;
  }
  
  try {
    const success = this.gameState.raidManager.startRaid(raidId);
    if (success) {
      console.log(`✅ Raid ${raidId} started successfully`);
      eventBus.emit(GameEvents.NOTIFICATION, '⚔️ Raid expedition started!');
    } else {
      console.warn(`⚠️ Failed to start raid ${raidId}`);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Failed to start raid');
    }
  } catch (error) {
    console.error('Error starting raid:', error);
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Error starting raid');
  }
}

// Создать карточку специальной награды (НОВОЕ)
createSpecialRewardCard(rewardInfo) {
  const card = document.createElement('div');
  card.className = 'tg-item-card';
  card.style.background = 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)';
  card.style.borderLeft = '4px solid #9c27b0';
  
  const header = this.createItemHeader(
    rewardInfo.icon || '✨',
    rewardInfo.name,
    `×${rewardInfo.count}`
  );
  
  const description = this.createItemDescription(
    rewardInfo.definition ? rewardInfo.definition.description : 'Special reward item'
  );
  
  const footer = document.createElement('div');
  footer.className = 'tg-item-footer';
  
  const useButton = this.createBuyButton(
    true,
    '🎯 Use',
    () => this.handleUseSpecialReward(rewardInfo.id),
    `Use ${rewardInfo.name}`
  );
  
  footer.appendChild(useButton);
  
  card.appendChild(header);
  card.appendChild(description);
  card.appendChild(footer);
  
  this.registerDOMElement(card);
  
  return card;
}

// Обработчик использования специальной награды (НОВОЕ)
handleUseSpecialReward(rewardId) {
  if (!this.gameState.raidManager) {
    console.error('RaidManager not available');
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid system not available');
    return;
  }
  
  try {
    const success = this.gameState.raidManager.useSpecialReward(rewardId);
    if (success) {
      console.log(`✅ Special reward ${rewardId} used successfully`);
      eventBus.emit(GameEvents.NOTIFICATION, '✨ Special reward used!');
    } else {
      console.warn(`⚠️ Failed to use special reward ${rewardId}`);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Failed to use reward');
    }
  } catch (error) {
    console.error('Error using special reward:', error);
    eventBus.emit(GameEvents.NOTIFICATION, '❌ Error using reward');
  }
}

// Создать прогресс-бар (НОВОЕ)
createProgressBar(progress, label = '', animated = false) {
  const container = document.createElement('div');
  container.className = 'tg-progress-container';
  
  const bar = document.createElement('div');
  bar.className = 'tg-progress-bar';
  
  const fill = document.createElement('div');
  fill.className = `tg-progress-fill ${animated ? 'tg-progress-fill--animated' : ''}`;
  fill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  
  bar.appendChild(fill);
  container.appendChild(bar);
  
  if (label) {
    const labelDiv = document.createElement('div');
    labelDiv.className = 'tg-text tg-text-center';
    labelDiv.style.marginTop = '0.25rem';
    labelDiv.style.fontWeight = '600';
    labelDiv.textContent = label;
    container.appendChild(labelDiv);
  }
  
  return container;
}

// Создать статистическую сетку (НОВОЕ)
createStatsGrid(stats) {
  const grid = document.createElement('div');
  grid.className = 'tg-stats-grid';
  
  Object.entries(stats).forEach(([key, value]) => {
    const statItem = document.createElement('div');
    statItem.className = 'tg-stat-item';
    
    const statValue = document.createElement('div');
    statValue.className = 'tg-stat-value';
    statValue.textContent = typeof value === 'number' ? value.toLocaleString() : value;
    
    const statLabel = document.createElement('div');
    statLabel.className = 'tg-stat-label';
    statLabel.textContent = this.formatStatLabel(key);
    
    statItem.appendChild(statValue);
    statItem.appendChild(statLabel);
    grid.appendChild(statItem);
  });
  
  return grid;
}

// Форматировать ярлык статистики (НОВОЕ)
formatStatLabel(key) {
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
}

// Создать заблокированную секцию (НОВОЕ)
createLockedSection(title, requirements, description) {
  const section = document.createElement('div');
  section.className = 'tg-special-card tg-special-card--locked';
  
  const icon = document.createElement('div');
  icon.className = 'tg-special-icon';
  icon.textContent = '🔒';
  
  const titleDiv = document.createElement('div');
  titleDiv.className = 'tg-special-title';
  titleDiv.textContent = title;
  
  const desc = document.createElement('div');
  desc.className = 'tg-special-description';
  desc.textContent = description;
  
  const reqSection = document.createElement('div');
  reqSection.className = 'tg-section';
  
  const reqTitle = document.createElement('h4');
  reqTitle.className = 'tg-heading tg-heading--h3';
  reqTitle.textContent = 'Requirements:';
  
  const reqList = document.createElement('div');
  reqList.className = 'tg-list';
  
  requirements.forEach(req => {
    const reqItem = document.createElement('div');
    reqItem.className = 'tg-list-item';
    
    const reqIcon = document.createElement('span');
    reqIcon.className = 'tg-list-item-icon';
    reqIcon.textContent = req.icon;
    
    const reqContent = document.createElement('span');
    reqContent.className = 'tg-list-item-content';
    reqContent.textContent = `${req.amount} ${req.name}`;
    
    reqItem.appendChild(reqIcon);
    reqItem.appendChild(reqContent);
    reqList.appendChild(reqItem);
  });
  
  reqSection.appendChild(reqTitle);
  reqSection.appendChild(reqList);
  
  section.appendChild(icon);
  section.appendChild(titleDiv);
  section.appendChild(desc);
  section.appendChild(reqSection);
  
  this.registerDOMElement(section);
  
  return section;
}

// Добавить CSS классы для новых компонентов (НОВОЕ)
addTelegramStyles() {
  if (document.getElementById('telegram-card-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'telegram-card-styles';
  style.textContent = `
    .tg-item-card--raid {
      border-left: 4px solid #dc3545;
    }
    
    .tg-requirement {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 600;
      margin: 0.125rem;
      border: 1px solid;
    }
    
    .tg-requirement--met {
      color: #28a745;
      background: rgba(40, 167, 69, 0.1);
      border-color: #28a745;
    }
    
    .tg-requirement--not-met {
      color: #dc3545;
      background: rgba(220, 53, 69, 0.1);
      border-color: #dc3545;
    }
    
    .tg-reward-section {
      margin: 1rem 0;
    }
    
    .tg-reward-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .tg-reward-list {
      background: rgba(0,0,0,0.05);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    
    .tg-progress-container {
      margin: 0.5rem 0;
    }
    
    .tg-progress-bar {
      width: 100%;
      height: 8px;
      background: rgba(0,0,0,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .tg-progress-fill {
      height: 100%;
      background: #28a745;
      transition: width 0.3s ease;
      border-radius: 4px;
    }
    
    .tg-progress-fill--animated {
      background: linear-gradient(90deg, 
        #28a745 0%, 
        rgba(40, 167, 69, 0.7) 50%, 
        #28a745 100%);
      background-size: 200% 100%;
      animation: progressShine 2s linear infinite;
    }
    
    @keyframes progressShine {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    .tg-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .tg-stat-item {
      text-align: center;
      padding: 1rem;
      background: rgba(0,0,0,0.05);
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    
    .tg-stat-item:hover {
      background: rgba(0,0,0,0.1);
    }
    
    .tg-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2481cc;
      margin-bottom: 0.25rem;
    }
    
    .tg-stat-label {
      font-size: 0.875rem;
      color: #666;
    }
  `;
  
  document.head.appendChild(style);
}
}