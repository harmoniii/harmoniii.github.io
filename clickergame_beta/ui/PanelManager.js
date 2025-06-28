// ui/PanelManager.js - Управление панелями интерфейса
import { CleanupMixin } from '../core/CleanupManager.js';
import { CardFactory } from './CardFactory.js';
import { BUFF_DEFS, DEBUFF_DEFS } from '../effects/EffectDefinitions.js';
import { SKILL_CATEGORIES } from '../managers/SkillManager.js';
import { MARKET_CATEGORIES } from '../managers/MarketManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class PanelManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.cardFactory = new CardFactory(gameState);
    this.cleanupManager.registerComponent(this.cardFactory);
  }

  // Показать панель зданий
  showBuildings(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>🏗️ Buildings</h2>';
    
    const buildingManager = this.gameState.buildingManager;
    if (!buildingManager) {
      panelElement.innerHTML += '<p>Building manager not available</p>';
      return;
    }

    const buildings = buildingManager.getAllBuildings();
    const categories = this.groupBuildingsByCategory(buildings);

    Object.entries(categories).forEach(([category, categoryBuildings]) => {
      const categorySection = this.createCategorySection(this.getCategoryName(category));
      
      categoryBuildings.forEach(building => {
        const card = this.cardFactory.createBuildingCard(building);
        categorySection.appendChild(card);
      });
      
      panelElement.appendChild(categorySection);
    });
  }

  // Показать панель навыков
  showSkills(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>🎯 Skills</h2>';
    
    const skillManager = this.gameState.skillManager;
    if (!skillManager) {
      panelElement.innerHTML += '<p>Skill manager not available</p>';
      return;
    }

    const skillsByCategory = skillManager.getSkillsByCategory();

    Object.entries(skillsByCategory).forEach(([category, skills]) => {
      const categorySection = this.createCategorySection(SKILL_CATEGORIES[category] || category);
      
      skills.forEach(skill => {
        const card = this.cardFactory.createSkillCard(skill);
        categorySection.appendChild(card);
      });
      
      panelElement.appendChild(categorySection);
    });
  }

  // Показать панель маркета
  showMarket(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>🛒 Market</h2>';
    
    const marketManager = this.gameState.marketManager;
    if (!marketManager) {
      panelElement.innerHTML += '<p>Market manager not available</p>';
      return;
    }

    // Описание маркета
    const description = document.createElement('div');
    description.style.textAlign = 'center';
    description.style.marginBottom = '2rem';
    description.style.fontSize = '1.1rem';
    description.style.color = '#666';
    
    const reputation = marketManager.getMarketReputation();
    const discount = Math.floor((1 - marketManager.getReputationDiscount()) * 100);
    
    description.innerHTML = `
      <p>💰 Trade resources and special items</p>
      <p>Reputation: <strong>${reputation}</strong> ${discount > 0 ? `(${discount}% discount)` : ''}</p>
    `;
    panelElement.appendChild(description);

    // Товары по категориям
    const itemsByCategory = marketManager.getItemsByCategory();

    Object.entries(itemsByCategory).forEach(([categoryId, items]) => {
      const categorySection = this.createCategorySection(MARKET_CATEGORIES[categoryId] || categoryId);
      
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'market-grid';
      
      items.forEach(item => {
        const card = this.cardFactory.createMarketCard(item);
        itemsGrid.appendChild(card);
      });
      
      categorySection.appendChild(itemsGrid);
      panelElement.appendChild(categorySection);
    });
  }

  // Показать информационную панель
  showInfo(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>📚 Effect Information</h2>';
    
    // Секция баффов
    const buffsSection = this.createCategorySection('✨ Buffs (Positive Effects)');
    BUFF_DEFS.forEach(buff => {
      const card = this.cardFactory.createEffectCard(buff, 'buff');
      buffsSection.appendChild(card);
    });
    panelElement.appendChild(buffsSection);
    
    // Секция дебаффов
    const debuffsSection = this.createCategorySection('💀 Debuffs (Negative Effects)');
    DEBUFF_DEFS.forEach(debuff => {
      const card = this.cardFactory.createEffectCard(debuff, 'debuff');
      debuffsSection.appendChild(card);
    });
    panelElement.appendChild(debuffsSection);
    
    // Секция правил
    const rulesSection = this.createCategorySection('⚖️ Effect Rules');
    const rulesCard = this.createEffectRulesCard();
    rulesSection.appendChild(rulesCard);
    panelElement.appendChild(rulesSection);
  }

  // Создать секцию категории
  createCategorySection(title) {
    const section = document.createElement('div');
    section.className = 'category-section';
    section.innerHTML = `<h3>${title}</h3>`;
    return section;
  }

  // Создать карточку правил эффектов
  createEffectRulesCard() {
    const card = document.createElement('div');
    card.className = 'item-card rules-card';
    card.innerHTML = `
      <div class="item-description">
        <p><strong>Base chance:</strong> ${GAME_CONSTANTS.BASE_EFFECT_CHANCE}% per click to get an effect</p>
        <p><strong>Resource influence:</strong></p>
        <ul>
          <li>🙏 <strong>Faith</strong> increases buff chance</li>
          <li>🌪️ <strong>Chaos</strong> increases debuff chance</li>
        </ul>
        <p><strong>Modifiers:</strong></p>
        <ul>
          <li>💎 <strong>Lucky Zone</strong> buff: +${GAME_CONSTANTS.LUCKY_BUFF_BONUS}% buff chance</li>
          <li>🍀 <strong>Lucky Charm</strong> skill: increases buff chance</li>
          <li>🛡️ <strong>Shield</strong> buff: blocks next ${GAME_CONSTANTS.SHIELD_BLOCKS} debuffs</li>
        </ul>
        <p><strong>Skill Effects:</strong></p>
        <ul>
          <li>✨ <strong>Buff Mastery</strong>: increases buff duration</li>
          <li>🛡️ <strong>Resilience</strong>: reduces debuff duration</li>
          <li>☮️ <strong>Inner Peace</strong>: reduces chaos influence</li>
        </ul>
      </div>
    `;
    return card;
  }

  // Группировать здания по категориям
  groupBuildingsByCategory(buildings) {
    const categories = {};
    
    buildings.forEach(building => {
      const category = building.category || 'other';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(building);
    });
    
    return categories;
  }

  // Получить название категории
  getCategoryName(category) {
    const names = {
      'production': '🏭 Production',
      'population': '👥 Population',
      'advanced': '🔬 Advanced',
      'special': '✨ Special',
      'other': '📦 Other'
    };
    return names[category] || category;
  }

  // Очистить панель
  clearPanel(panelElement) {
    if (panelElement) {
      panelElement.innerHTML = '';
      panelElement.classList.remove('hidden');
    }
  }
}