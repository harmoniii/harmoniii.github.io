// ui/PanelManager.js - ОБНОВЛЕНО: добавлена поддержка рейдов
import { CleanupMixin } from '../core/CleanupManager.js';
import { CardFactory } from './CardFactory.js';
import { RaidPanel } from './RaidPanel.js'; // НОВОЕ: импорт RaidPanel
import { SKILL_CATEGORIES } from '../managers/SkillManager.js';
import { MARKET_CATEGORIES } from '../managers/MarketManager.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class PanelManager extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.cardFactory = new CardFactory(gameState);
    this.raidPanel = new RaidPanel(gameState); // НОВОЕ: создаем экземпляр RaidPanel
    
    this.cleanupManager.registerComponent(this.cardFactory);
    this.cleanupManager.registerComponent(this.raidPanel); // НОВОЕ: регистрируем для очистки
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

  // НОВОЕ: Показать панель рейдов
  showRaids(panelElement) {
    this.clearPanel(panelElement);
    
    try {
      // Делегируем создание панели рейдов специальному компоненту
      this.raidPanel.createRaidPanel(panelElement);
      
    } catch (error) {
      console.error('❌ Error showing raids panel:', error);
      
      // Показываем ошибку пользователю
      panelElement.innerHTML = `
        <h2>⚔️ Raid System</h2>
        <div style="text-align: center; padding: 2rem; color: #dc3545;">
          <h3>❌ Error Loading Raids</h3>
          <p>Failed to load the raid system. Please try again.</p>
          <p><small>Error: ${error.message}</small></p>
          <button onclick="location.reload()" style="
            background: #dc3545; color: white; border: none;
            padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;
          ">🔄 Reload Game</button>
        </div>
      `;
    }
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

  // Показать информацию о игре
  showInfo(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>📚 Game Rules & Mechanics</h2>';
    
    // Секция правил игры
    const rulesSection = this.createCategorySection('⚖️ Complete Game Guide');
    const rulesCard = this.createGameRulesCard();
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

  // ОБНОВЛЕНО: Полное руководство по игре включая рейды
  createGameRulesCard() {
    const card = document.createElement('div');
    card.className = 'item-card rules-card';
    card.innerHTML = `
      <div class="item-description">
        <h4>🎮 Grid Gameplay System</h4>
        <ul>
          <li><strong>3x3 Grid:</strong> Game now uses a 3x3 grid instead of rotating wheel</li>
          <li><strong>🎯 Target Cell (Red):</strong> Main target - gives gold and builds combo</li>
          <li><strong>⚡ Energy Cell (Green):</strong> Restores +3 energy, appears 70% of the time</li>
          <li><strong>💰 Bonus Cell (Orange):</strong> Gives random resources + 2 energy, appears 15% of the time</li>
          <li><strong>⚫ Empty Cells:</strong> No effect but break combo, cost no energy</li>
          <li><strong>Grid Shuffle:</strong> ${GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE}% chance to reshuffle after each successful click</li>
        </ul>
        
        <h4>⚔️ Raid System</h4>
        <ul>
          <li><strong>🗼 Watch Tower Required:</strong> Build Watch Tower to unlock raid expeditions</li>
          <li><strong>🏚️ City Ruins (Beginner):</strong> 2-minute raid requiring 4 people, 10 food, 5 water</li>
          <li><strong>⚠️ Risk System:</strong> 20% chance of losing 1-2 people during raids</li>
          <li><strong>🎁 Guaranteed Rewards:</strong> 2-5 wood/stone/iron per successful raid</li>
          <li><strong>🎲 Chance Rewards:</strong> 15% for +2 science, 5% for Ancient Blueprint</li>
          <li><strong>📜 Ancient Blueprint:</strong> Provides 10% discount on next building upgrade</li>
          <li><strong>🚫 Game Blocking:</strong> Grid is locked and unclickable during active raids</li>
          <li><strong>❌ Raid Cancellation:</strong> Can cancel raid early for 50% resource refund</li>
          <li><strong>📊 Statistics:</strong> Track total raids, success rate, people lost, resources gained</li>
        </ul>
        
        <h4>⚡ Energy System</h4>
        <ul>
          <li><strong>Initial Energy:</strong> ${GAME_CONSTANTS.INITIAL_ENERGY}/${GAME_CONSTANTS.INITIAL_MAX_ENERGY}</li>
          <li><strong>Click Cost:</strong> ${GAME_CONSTANTS.CLICK_COST} energy per target hit</li>
          <li><strong>Regeneration:</strong> +${GAME_CONSTANTS.BASE_REGEN_RATE} energy every ${GAME_CONSTANTS.REGEN_INTERVAL / 1000} seconds</li>
          <li><strong>Energy Cells:</strong> Restore ${GAME_CONSTANTS.ZONE_RESTORE} energy (normal) or ${GAME_CONSTANTS.GOLD_ZONE_RESTORE} energy (bonus)</li>
          <li><strong>Critical Threshold:</strong> Warning at ${GAME_CONSTANTS.WARNING_THRESHOLD}%, critical at ${GAME_CONSTANTS.CRITICAL_THRESHOLD}%</li>
          <li><strong>Generator Building:</strong> +${GAME_CONSTANTS.GENERATOR_REGEN_BONUS * 100}% regen rate, +${GAME_CONSTANTS.GENERATOR_MAX_ENERGY_BONUS} max energy per level</li>
          <li><strong>Energy Efficiency Skill:</strong> -${GAME_CONSTANTS.EFFICIENCY_REDUCTION * 100}% energy cost per level</li>
        </ul>
        
        <h4>🔥 Combo System</h4>
        <ul>
          <li><strong>Combo Building:</strong> Hit consecutive target cells to build combo</li>
          <li><strong>Combo Timeout:</strong> ${GAME_CONSTANTS.COMBO_TIMEOUT / 1000} seconds between target hits</li>
          <li><strong>Max Combo:</strong> ${GAME_CONSTANTS.MAX_COMBO_COUNT}</li>
          <li><strong>Combo Breaks:</strong> Missing target, timeout, or hitting empty cells</li>
          <li><strong>Time Stretch Skill:</strong> Extends combo timeout by +1 second per level</li>
          <li><strong>Combo Master Skill:</strong> +15% combo effectiveness per level</li>
        </ul>
        
        <h4>🏗️ Building System</h4>
        <ul>
          <li><strong>🪚 Sawmill:</strong> Produces wood every 10 seconds</li>
          <li><strong>⛏️ Stone Quarry:</strong> Produces stone every 12 seconds</li>
          <li><strong>🌾 Farm:</strong> Produces food every 8 seconds (2 per cycle)</li>
          <li><strong>🪣 Water Well:</strong> Produces water every 6 seconds</li>
          <li><strong>⚒️ Iron Mine:</strong> Produces iron every 15 seconds</li>
          <li><strong>🏠 House:</strong> Attracts people every 30 seconds</li>
          <li><strong>⚡ Generator:</strong> Provides energy production and capacity bonuses</li>
          <li><strong>🔬 Laboratory:</strong> Produces science every 20 seconds</li>
          <li><strong>⛪ Temple:</strong> Produces faith and reduces chaos over time</li>
          <li><strong>🏰 Fortress:</strong> Provides 20% reduction to debuff duration</li>
          <li><strong>🗼 Watch Tower:</strong> Unlocks raid system for expeditions (NEW!)</li>
          <li><strong>Scaling Cost:</strong> Each level costs 1.5x more than the previous</li>
          <li><strong>Production Scaling:</strong> Production increases linearly with building level</li>
        </ul>
        
        <h4>🎯 Skills & Progression</h4>
        <ul>
          <li><strong>💰 Golden Touch:</strong> +10% gold per level (max 20 levels)</li>
          <li><strong>💥 Critical Strike:</strong> +5% crit chance per level for double damage (max 10 levels)</li>
          <li><strong>🔍 Resource Finder:</strong> +3% chance for bonus resources per level (max 15 levels)</li>
          <li><strong>🎯 Steady Hand:</strong> Combo break protection charges (max 5 levels)</li>
          <li><strong>⏰ Time Stretch:</strong> +1 second combo timeout per level (max 10 levels)</li>
          <li><strong>🔥 Combo Master:</strong> +15% combo effectiveness per level (max 15 levels)</li>
          <li><strong>💡 Energy Efficiency:</strong> -25% energy cost per level (max 3 levels)</li>
          <li><strong>⚡ Energy Mastery:</strong> +100% energy regen rate per level (max 5 levels)</li>
          <li><strong>🔋 Power Storage:</strong> +50 max energy per level (max 4 levels)</li>
          <li><strong>🤖 Auto Clicker:</strong> Automatically clicks target, faster with each level (max 3 levels)</li>
          <li><strong>👁️ Future Sight:</strong> Preview next target zone (max 1 level)</li>
        </ul>
        
        <h4>🛒 Market & Trading</h4>
        <ul>
          <li><strong>Basic Resources:</strong> Trade gold for wood, stone, food, water, iron (${GAME_CONSTANTS.BASIC_RESOURCE_PRICE} gold each)</li>
          <li><strong>Energy Pack:</strong> Restore +${GAME_CONSTANTS.ENERGY_PACK_RESTORE} energy (${GAME_CONSTANTS.ENERGY_PACK_PRICE} gold)</li>
          <li><strong>Science Book:</strong> +2 science (${GAME_CONSTANTS.SCIENCE_BOOK_PRICE} gold + 5 iron)</li>
          <li><strong>Faith Relic:</strong> +5 faith (${GAME_CONSTANTS.FAITH_RELIC_PRICE} gold + 20 stone)</li>
          <li><strong>Chaos Neutralizer:</strong> -10 chaos (${GAME_CONSTANTS.CHAOS_NEUTRALIZER_PRICE} gold + 3 science)</li>
          <li><strong>Skill Crystal:</strong> +3 skill points (${GAME_CONSTANTS.SKILL_CRYSTAL_PRICE} gold + 5 science + 3 faith)</li>
          <li><strong>Reputation System:</strong> More purchases = bigger discounts (5%-15%)</li>
          <li><strong>Special Discounts:</strong> Tax Boom buff provides 33% market discount</li>
        </ul>
        
        <h4>🏆 Achievement System</h4>
        <ul>
          <li><strong>Click Achievements:</strong> 100 clicks (2 SP), 1000 clicks (10 SP)</li>
          <li><strong>Combo Achievements:</strong> 10 combo (1 SP), 50 combo (8 SP)</li>
          <li><strong>Resource Achievements:</strong> 1000 total resources (5 SP), 10000 total resources (35 SP)</li>
          <li><strong>Energy Achievements:</strong> 10 energy zones (2 SP), 50 energy zones (5 SP)</li>
          <li><strong>Skill Points:</strong> Primary currency for learning skills</li>
          <li><strong>Progress Tracking:</strong> Statistics tracked across game sessions</li>
        </ul>
        
        <h4>💾 Save & Load System</h4>
        <ul>
          <li><strong>Auto-Save:</strong> Every 30 seconds and on page close</li>
          <li><strong>Manual Save:</strong> Generate exportable base64 save code</li>
          <li><strong>Cross-Device:</strong> Share saves between different devices/browsers</li>
          <li><strong>Import Protection:</strong> Validates save data before loading</li>
          <li><strong>Reset Function:</strong> Complete game reset (permanent action)</li>
          <li><strong>Save Version:</strong> Current version 1.0.9 with raids</li>
        </ul>
        
        <h4>🎯 Strategy Tips</h4>
        <ul>
          <li><strong>Early Game:</strong> Focus on basic resource buildings and energy skills</li>
          <li><strong>Mid Game:</strong> Build generators for energy, develop combo skills</li>
          <li><strong>Late Game:</strong> Build Watch Tower for raids, optimize faith/chaos balance</li>
          <li><strong>Raid Strategy:</strong> Ensure stable population before starting raids</li>
          <li><strong>Energy Priority:</strong> Always maintain enough energy for combo chains</li>
          <li><strong>Effect Management:</strong> Use Shield buff before attempting long combos</li>
          <li><strong>Market Timing:</strong> Buy during Tax Boom for maximum efficiency</li>
          <li><strong>Grid Strategy:</strong> Learn cell positions to click accurately and quickly</li>
          <li><strong>Auto Clicker:</strong> Essential for idle progression and maintaining combos</li>
          <li><strong>Risk Management:</strong> Only start raids when you can afford to lose people</li>
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

  // ОБНОВЛЕНО: Получить название категории включая военные здания
  getCategoryName(category) {
    const names = {
      'production': '🏭 Production',
      'population': '👥 Population',
      'advanced': '🔬 Advanced',
      'special': '✨ Special',
      'military': '⚔️ Military', // НОВОЕ: военная категория
      'energy': '⚡ Energy',
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

  // НОВОЕ: Получить отладочную информацию
  getDebugInfo() {
    return {
      isActive: this.isActive(),
      hasCardFactory: !!this.cardFactory,
      hasRaidPanel: !!this.raidPanel,
      raidPanelReady: this.raidPanel?.isActive?.() || false
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 PanelManager cleanup started');
    
    // Компоненты будут очищены автоматически через cleanupManager
    super.destroy();
    
    console.log('✅ PanelManager destroyed');
  }
}