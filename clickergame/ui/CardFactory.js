// ui/CardFactory.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ версия с корректной проверкой доступности
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';

export class CardFactory extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
  }

  // Создать карточку здания
  createBuildingCard(buildingInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = this.createItemHeader(
      buildingInfo.img, 
      buildingInfo.name, 
      `Level: ${buildingInfo.currentLevel}/${buildingInfo.maxLevel}`
    );
    
    const description = this.createItemDescription(buildingInfo.description);
    const details = this.createBuildingDetails(buildingInfo);
    const footer = this.createBuildingFooter(buildingInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    // Регистрируем карточку для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // Создать карточку навыка
  createSkillCard(skillInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = this.createItemHeader(
      skillInfo.icon, 
      skillInfo.name, 
      `Level: ${skillInfo.currentLevel}/${skillInfo.maxLevel}`
    );
    
    const description = this.createItemDescription(skillInfo.description);
    const details = this.createSkillDetails(skillInfo);
    const footer = this.createSkillFooter(skillInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    // Регистрируем карточку для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // ИСПРАВЛЕНИЕ: Создать карточку товара маркета с корректной проверкой доступности
  createMarketCard(itemInfo) {
    const card = document.createElement('div');
    card.className = 'item-card market-card';
    
    const header = this.createItemHeader(itemInfo.icon, itemInfo.name);
    const description = this.createItemDescription(itemInfo.description);
    const details = this.createMarketDetails(itemInfo);
    
    // ИСПРАВЛЕНИЕ: Пересчитываем доступность перед созданием footer
    const canAfford = this.checkMarketItemAffordability(itemInfo);
    const correctedItemInfo = { ...itemInfo, canAfford };
    
    const footer = this.createMarketFooter(correctedItemInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    // Регистрируем карточку для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // ИСПРАВЛЕНИЕ: Новый метод для правильной проверки доступности товаров маркета
  checkMarketItemAffordability(itemInfo) {
    if (!itemInfo.effectivePrice) {
      console.warn('Item has no effectivePrice:', itemInfo);
      return false;
    }

    // Проверяем каждый ресурс в цене
    for (const [resource, requiredAmount] of Object.entries(itemInfo.effectivePrice)) {
      const availableAmount = this.gameState.resources[resource] || 0;
      if (availableAmount < requiredAmount) {
        console.log(`Cannot afford ${itemInfo.name}: need ${requiredAmount} ${resource}, have ${availableAmount}`);
        return false;
      }
    }

    return true;
  }

  // Создать карточку эффекта
  createEffectCard(effectInfo, type) {
    const card = document.createElement('div');
    card.className = `item-card ${type}-card`;
    
    const icon = effectInfo.name.split(' ')[0];
    const rarityOrSeverity = effectInfo.rarity || effectInfo.severity || 'unknown';
    
    const header = this.createItemHeader(icon, effectInfo.name, rarityOrSeverity);
    const description = this.createItemDescription(effectInfo.description);
    const details = this.createEffectDetails(effectInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    
    // Регистрируем карточку для очистки
    this.registerDOMElement(card);
    
    return card;
  }

  // Создать заголовок карточки
  createItemHeader(icon, name, badge = '') {
    const header = document.createElement('div');
    header.className = 'item-header';
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'item-icon';
    iconSpan.textContent = icon;
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = name;
    
    header.appendChild(iconSpan);
    header.appendChild(nameSpan);
    
    if (badge) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'item-level';
      badgeSpan.textContent = badge;
      header.appendChild(badgeSpan);
    }
    
    return header;
  }

  // Создать описание карточки
  createItemDescription(description) {
    const desc = document.createElement('div');
    desc.className = 'item-description';
    
    // ИСПРАВЛЕНИЕ: Безопасная установка текста
    if (typeof description === 'string') {
      desc.textContent = description;
    } else {
      desc.textContent = 'No description available';
    }
    
    return desc;
  }

  // Создать детали здания
  createBuildingDetails(buildingInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (buildingInfo.productionRate) {
      const production = document.createElement('div');
      production.textContent = `📈 Production: ${buildingInfo.productionRate}`;
      details.appendChild(production);
    }
    
    if (buildingInfo.specialEffect) {
      const special = document.createElement('div');
      special.textContent = `✨ Special: ${buildingInfo.specialEffect}`;
      details.appendChild(special);
    }
    
    // ИСПРАВЛЕНИЕ: Показываем текущий статус здания
    if (buildingInfo.currentLevel > 0) {
      const status = document.createElement('div');
      status.textContent = `🔧 Status: ${buildingInfo.isActive ? 'Active' : 'Inactive'}`;
      status.style.color = buildingInfo.isActive ? '#4CAF50' : '#999';
      details.appendChild(status);
    }
    
    return details;
  }

  // Создать детали навыка
  createSkillDetails(skillInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (skillInfo.currentLevel > 0) {
      const currentEffect = document.createElement('div');
      const effectValue = skillInfo.effectDescription || `${(skillInfo.currentEffect * 100).toFixed(1)}%`;
      currentEffect.textContent = `💪 Current effect: ${effectValue}`;
      details.appendChild(currentEffect);
    }
    
    const effectType = document.createElement('div');
    effectType.textContent = `🎯 Type: ${this.getEffectTypeDescription(skillInfo.effect?.type)}`;
    details.appendChild(effectType);
    
    // ИСПРАВЛЕНИЕ: Показываем следующий уровень эффекта
    if (!skillInfo.isMaxLevel) {
      const nextEffect = document.createElement('div');
      const nextValue = skillInfo.effect?.value ? 
        ((skillInfo.currentLevel + 1) * skillInfo.effect.value * 100).toFixed(1) + '%' :
        'Unknown';
      nextEffect.textContent = `⬆️ Next level: ${nextValue}`;
      nextEffect.style.color = '#4CAF50';
      details.appendChild(nextEffect);
    }
    
    return details;
  }

  // ИСПРАВЛЕНИЕ: Создать детали товара маркета с правильным отображением цен
  createMarketDetails(itemInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    // Показываем эффективную цену (с учетом скидок)
    const price = document.createElement('div');
    const effectivePrice = itemInfo.effectivePrice || itemInfo.price;
    price.textContent = `💰 Price: ${this.formatPrice(effectivePrice)}`;
    details.appendChild(price);
    
    // Показываем оригинальную цену если есть скидка
    if (itemInfo.effectivePrice && itemInfo.price) {
      const originalTotal = Object.values(itemInfo.price).reduce((sum, val) => sum + val, 0);
      const effectiveTotal = Object.values(itemInfo.effectivePrice).reduce((sum, val) => sum + val, 0);
      
      if (originalTotal > effectiveTotal) {
        const discountPercent = Math.round((1 - effectiveTotal / originalTotal) * 100);
        const originalPrice = document.createElement('div');
        originalPrice.style.textDecoration = 'line-through';
        originalPrice.style.color = '#999';
        originalPrice.textContent = `Original: ${this.formatPrice(itemInfo.price)} (-${discountPercent}%)`;
        details.appendChild(originalPrice);
      }
    }
    
    const reward = document.createElement('div');
    reward.textContent = `🎁 Reward: ${itemInfo.rewardText}`;
    details.appendChild(reward);
    
    // ИСПРАВЛЕНИЕ: Показываем доступность ресурсов
    if (itemInfo.effectivePrice) {
      const affordability = document.createElement('div');
      affordability.style.fontSize = '0.85em';
      affordability.style.marginTop = '5px';
      
      const canAffordAll = this.checkMarketItemAffordability(itemInfo);
      if (canAffordAll) {
        affordability.textContent = '✅ You can afford this item';
        affordability.style.color = '#4CAF50';
      } else {
        const missingResources = this.getMissingResources(itemInfo.effectivePrice);
        affordability.textContent = `❌ Missing: ${missingResources.join(', ')}`;
        affordability.style.color = '#f44336';
      }
      details.appendChild(affordability);
    }
    
    return details;
  }

  // ИСПРАВЛЕНИЕ: Новый метод для получения недостающих ресурсов
  getMissingResources(price) {
    const missing = [];
    Object.entries(price).forEach(([resource, required]) => {
      const available = this.gameState.resources[resource] || 0;
      if (available < required) {
        const shortfall = required - available;
        missing.push(`${shortfall} ${getResourceEmoji(resource)}`);
      }
    });
    return missing;
  }

  // Создать детали эффекта
  createEffectDetails(effectInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    const duration = document.createElement('div');
    if (effectInfo.duration) {
      duration.textContent = `⏱️ Duration: ${effectInfo.duration} seconds`;
    } else {
      duration.textContent = '⚡ Instant effect';
    }
    details.appendChild(duration);
    
    // ИСПРАВЛЕНИЕ: Добавляем категорию эффекта
    if (effectInfo.category) {
      const category = document.createElement('div');
      category.textContent = `📂 Category: ${effectInfo.category}`;
      category.style.fontStyle = 'italic';
      details.appendChild(category);
    }
    
    return details;
  }

  // Создать подвал карточки здания
  createBuildingFooter(buildingInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (buildingInfo.isMaxLevel) {
      const maxLevel = document.createElement('span');
      maxLevel.className = 'max-level';
      maxLevel.textContent = '🏆 MAX LEVEL';
      footer.appendChild(maxLevel);
    } else {
      const priceSpan = document.createElement('span');
      priceSpan.className = 'price';
      priceSpan.textContent = `Price: ${this.formatPrice(buildingInfo.nextPrice)}`;
      
      const buyButton = this.createBuyButton(
        buildingInfo.canAfford,
        'Upgrade',
        () => this.handleBuildingPurchase(buildingInfo.id, buildingInfo.name),
        `Upgrade ${buildingInfo.name} to level ${buildingInfo.currentLevel + 1}`
      );
      
      footer.appendChild(priceSpan);
      footer.appendChild(buyButton);
    }
    
    return footer;
  }

  // Создать подвал карточки навыка
  createSkillFooter(skillInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (skillInfo.isMaxLevel) {
      const maxLevel = document.createElement('span');
      maxLevel.className = 'max-level';
      maxLevel.textContent = '🏆 MAX LEVEL';
      footer.appendChild(maxLevel);
    } else {
      const priceSpan = document.createElement('span');
      priceSpan.className = 'price';
      priceSpan.textContent = `Price: ${skillInfo.nextCost} ✨ SP`;
      
      const buyButton = this.createBuyButton(
        skillInfo.canAfford,
        'Learn',
        () => this.handleSkillPurchase(skillInfo.id, skillInfo.name),
        `Learn ${skillInfo.name} level ${skillInfo.currentLevel + 1}`
      );
      
      footer.appendChild(priceSpan);
      footer.appendChild(buyButton);
    }
    
    return footer;
  }

  // ИСПРАВЛЕНИЕ: Создать подвал карточки маркета с правильной проверкой доступности
  createMarketFooter(itemInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед созданием кнопки
    const finalCanAfford = itemInfo.canAfford && this.checkMarketItemAffordability(itemInfo);
    
    const buyButton = this.createBuyButton(
      finalCanAfford,
      'Buy',
      () => this.handleMarketPurchase(itemInfo.id, itemInfo.name),
      `Buy ${itemInfo.name}`
    );
    
    footer.appendChild(buyButton);
    return footer;
  }

  // ИСПРАВЛЕНИЕ: Создать кнопку покупки с правильной логикой доступности
  createBuyButton(canAfford, text, clickHandler, tooltipText = '') {
    const button = document.createElement('button');
    button.className = `buy-button ${canAfford ? '' : 'disabled'}`;
    button.textContent = text;
    button.disabled = !canAfford;
    
    // ИСПРАВЛЕНИЕ: Добавляем tooltip
    if (tooltipText) {
      button.title = tooltipText;
    }
    
    // ИСПРАВЛЕНИЕ: Обработчик добавляется всегда, но проверяет доступность внутри
    this.addEventListener(button, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Дополнительная проверка доступности при клике
      if (!canAfford) {
        console.log('Button clicked but item not affordable');
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Not enough resources!');
        return;
      }
      
      // Выполняем действие только если можем позволить
      try {
        if (clickHandler) {
          clickHandler();
        }
      } catch (error) {
        console.error('Error in button click handler:', error);
        eventBus.emit(GameEvents.NOTIFICATION, '❌ Purchase failed!');
      }
    });
    
    // ИСПРАВЛЕНИЕ: Добавляем визуальную обратную связь
    this.addEventListener(button, 'mouseenter', () => {
      if (!canAfford) {
        button.style.cursor = 'not-allowed';
      }
    });
    
    return button;
  }

  // ИСПРАВЛЕНИЕ: Обработчик покупки здания с дополнительными проверками
  handleBuildingPurchase(buildingId, buildingName) {
    const buildingManager = this.gameState.buildingManager;
    
    if (!buildingManager) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Building manager not available');
      return;
    }

    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед покупкой
    if (!buildingManager.canAfford(buildingId)) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Not enough resources!');
      return;
    }

    if (buildingManager.buyBuilding(buildingId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `✅ ${buildingName} upgraded!`);
      eventBus.emit(GameEvents.BUILDING_BOUGHT, { buildingId, name: buildingName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Upgrade failed!');
    }
  }

  // ИСПРАВЛЕНИЕ: Обработчик покупки навыка с дополнительными проверками
  handleSkillPurchase(skillId, skillName) {
    const skillManager = this.gameState.skillManager;
    
    if (!skillManager) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Skill manager not available');
      return;
    }

    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед покупкой
    if (!skillManager.canAfford(skillId)) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Not enough Skill Points!');
      return;
    }

    if (skillManager.buySkill(skillId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `✅ ${skillName} learned!`);
      eventBus.emit(GameEvents.SKILL_BOUGHT, { skillId, name: skillName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Learning failed!');
    }
  }

  // ИСПРАВЛЕНИЕ: Обработчик покупки в маркете с дополнительной проверкой
  handleMarketPurchase(itemId, itemName) {
    const marketManager = this.gameState.marketManager;
    
    if (!marketManager) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Market not available');
      return;
    }

    // ИСПРАВЛЕНИЕ: Дополнительная проверка доступности перед покупкой
    if (!marketManager.canAfford(itemId)) {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Not enough resources!');
      return;
    }

    if (marketManager.buyItem(itemId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `✅ Bought: ${itemName}`);
      eventBus.emit(GameEvents.ITEM_PURCHASED, { itemId, name: itemName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Purchase failed!');
    }
  }

  // ИСПРАВЛЕНИЕ: Форматировать цену с проверкой валидности
  formatPrice(price) {
    if (!price || typeof price !== 'object') {
      return 'Invalid price';
    }
    
    const validEntries = Object.entries(price).filter(([resource, amount]) => {
      return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
    });
    
    if (validEntries.length === 0) {
      return 'Free';
    }
    
    return validEntries
      .map(([resource, amount]) => `${Math.floor(amount)} ${getResourceEmoji(resource)}`)
      .join(' + ');
  }

  // Получить описание типа эффекта
  getEffectTypeDescription(type) {
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
  }

  // ИСПРАВЛЕНИЕ: Создать индикатор загрузки для длительных операций
  createLoadingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.style.cssText = `
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
    
    // Добавляем CSS анимацию если её нет
    if (!document.getElementById('loading-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'loading-animation-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    return indicator;
  }

  // ИСПРАВЛЕНИЕ: Метод для обновления существующей карточки
  updateCard(card, newInfo) {
    if (!card || !newInfo) return false;
    
    try {
      // Обновляем только необходимые части карточки
      const priceElement = card.querySelector('.price');
      if (priceElement && newInfo.nextPrice) {
        priceElement.textContent = `Price: ${this.formatPrice(newInfo.nextPrice)}`;
      }
      
      const buyButton = card.querySelector('.buy-button');
      if (buyButton && typeof newInfo.canAfford === 'boolean') {
        buyButton.disabled = !newInfo.canAfford;
        buyButton.className = `buy-button ${newInfo.canAfford ? '' : 'disabled'}`;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating card:', error);
      return false;
    }
  }

  // ИСПРАВЛЕНИЕ: Очистка ресурсов при уничтожении
  destroy() {
    console.log('🧹 CardFactory cleanup started');
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ CardFactory destroyed');
  }
}