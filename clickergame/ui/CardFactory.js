// ui/CardFactory.js - Фабрика для создания карточек UI
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
    
    return card;
  }

  // Создать карточку товара маркета
  createMarketCard(itemInfo) {
    const card = document.createElement('div');
    card.className = 'item-card market-card';
    
    const header = this.createItemHeader(itemInfo.icon, itemInfo.name);
    const description = this.createItemDescription(itemInfo.description);
    const details = this.createMarketDetails(itemInfo);
    const footer = this.createMarketFooter(itemInfo);
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
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
    desc.textContent = description;
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
    
    if (buildingInfo.special) {
      const special = document.createElement('div');
      special.textContent = `✨ Special: ${buildingInfo.special.description || 'Special effect'}`;
      details.appendChild(special);
    }
    
    return details;
  }

  // Создать детали навыка
  createSkillDetails(skillInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (skillInfo.currentLevel > 0) {
      const currentEffect = document.createElement('div');
      const effectValue = (skillInfo.currentEffect * 100).toFixed(1);
      currentEffect.textContent = `💪 Current effect: ${effectValue}%`;
      details.appendChild(currentEffect);
    }
    
    const effectType = document.createElement('div');
    effectType.textContent = `🎯 Type: ${this.getEffectTypeDescription(skillInfo.effect?.type)}`;
    details.appendChild(effectType);
    
    return details;
  }

  // Создать детали товара маркета
  createMarketDetails(itemInfo) {
    const details = document.createElement('div');
    details.className = 'item-details';
    
    const price = document.createElement('div');
    price.textContent = `💰 Price: ${itemInfo.priceText}`;
    details.appendChild(price);
    
    const reward = document.createElement('div');
    reward.textContent = `🎁 Reward: ${itemInfo.rewardText}`;
    details.appendChild(reward);
    
    return details;
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
        () => this.handleBuildingPurchase(buildingInfo.id, buildingInfo.name)
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
        () => this.handleSkillPurchase(skillInfo.id, skillInfo.name)
      );
      
      footer.appendChild(priceSpan);
      footer.appendChild(buyButton);
    }
    
    return footer;
  }

  // Создать подвал карточки маркета
  createMarketFooter(itemInfo) {
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    const buyButton = this.createBuyButton(
      itemInfo.canAfford,
      'Buy',
      () => this.handleMarketPurchase(itemInfo.id, itemInfo.name)
    );
    
    footer.appendChild(buyButton);
    return footer;
  }

  // Создать кнопку покупки
  createBuyButton(canAfford, text, clickHandler) {
    const button = document.createElement('button');
    button.className = `buy-button ${canAfford ? '' : 'disabled'}`;
    button.textContent = text;
    button.disabled = !canAfford;
    
    if (canAfford) {
      this.addEventListener(button, 'click', clickHandler);
    }
    
    return button;
  }

  // Обработчик покупки здания
  handleBuildingPurchase(buildingId, buildingName) {
    const buildingManager = this.gameState.buildingManager;
    if (buildingManager && buildingManager.buyBuilding(buildingId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `${buildingName} upgraded!`);
      eventBus.emit(GameEvents.BUILDING_BOUGHT, { buildingId, name: buildingName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, 'Not enough resources');
    }
  }

  // Обработчик покупки навыка
  handleSkillPurchase(skillId, skillName) {
    const skillManager = this.gameState.skillManager;
    if (skillManager && skillManager.buySkill(skillId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `${skillName} learned!`);
      eventBus.emit(GameEvents.SKILL_BOUGHT, { skillId, name: skillName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, 'Not enough Skill Points');
    }
  }

  // Обработчик покупки в маркете
  handleMarketPurchase(itemId, itemName) {
    const marketManager = this.gameState.marketManager;
    if (marketManager && marketManager.buyItem(itemId)) {
      eventBus.emit(GameEvents.NOTIFICATION, `Bought: ${itemName}`);
      eventBus.emit(GameEvents.ITEM_PURCHASED, { itemId, name: itemName });
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, 'Not enough resources!');
    }
  }

  // Форматировать цену
  formatPrice(price) {
    return Object.entries(price)
      .map(([resource, amount]) => `${amount} ${getResourceEmoji(resource)}`)
      .join(' ');
  }

  // Получить описание типа эффекта
  getEffectTypeDescription(type) {
    const types = {
      'multiplier': 'Multiplier',
      'chance': 'Chance',
      'generation': 'Generation',
      'reduction': 'Reduction',
      'duration': 'Duration',
      'automation': 'Automation',
      'protection': 'Protection',
      'charges': 'Charges',
      'preview': 'Preview'
    };
    return types[type] || type || 'Unknown';
  }
}