// ui/PanelManager.js - ИСПРАВЛЕНО: только правила игры без описаний эффектов
import { CleanupMixin } from '../core/CleanupManager.js';
import { CardFactory } from './CardFactory.js';
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

  // ИСПРАВЛЕНИЕ: Показать только правила игры
  showInfo(panelElement) {
    this.clearPanel(panelElement);
    panelElement.innerHTML = '<h2>📚 Game Rules & Mechanics</h2>';
    
    // ИСПРАВЛЕНИЕ: Только секция правил, без описаний эффектов
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

  // ИСПРАВЛЕНИЕ: Полное руководство по игре с актуальными правилами
  createGameRulesCard() {
    const card = document.createElement('div');
    card.className = 'item-card rules-card';
    card.innerHTML = `
      <div class="item-description">
        <h4>🎮 Basic Gameplay</h4>
        <ul>
          <li><strong>Grid System:</strong> 3x3 grid with different cell types</li>
          <li><strong>🎯 Target Cell (Red):</strong> Gives gold and builds combo</li>
          <li><strong>⚡ Energy Cell (Green):</strong> Restores +3 energy</li>
          <li><strong>💰 Bonus Cell (Orange):</strong> Gives resources + energy</li>
          <li><strong>⚫ Empty Cells:</strong> Break combo but no energy cost</li>
        </ul>
        
        <h4>⚡ Energy System</h4>
        <ul>
          <li><strong>Energy Cost:</strong> ${GAME_CONSTANTS.CLICK_COST} energy per target click</li>
          <li><strong>Energy Regeneration:</strong> +${GAME_CONSTANTS.BASE_REGEN_RATE} every 15 seconds</li>
          <li><strong>Energy Zones:</strong> Hit green cells to restore energy</li>
          <li><strong>Energy Skills:</strong> Reduce cost and increase regeneration</li>
          <li><strong>Generator Building:</strong> Increases max energy and regen rate</li>
        </ul>
        
        <h4>🔥 Combo System</h4>
        <ul>
          <li><strong>Combo Building:</strong> Hit consecutive target cells</li>
          <li><strong>Combo Timeout:</strong> ${GAME_CONSTANTS.COMBO_TIMEOUT / 1000} seconds between hits</li>
          <li><strong>Max Combo:</strong> ${GAME_CONSTANTS.MAX_COMBO_COUNT}</li>
          <li><strong>Combo Breaks:</strong> Missing target or timeout</li>
          <li><strong>Time Stretch Skill:</strong> Extends combo timeout</li>
        </ul>
        
        <h4>🎲 Effect System</h4>
        <p><strong>Base Effect Chance:</strong> ${GAME_CONSTANTS.BASE_EFFECT_CHANCE}% per target hit</p>
        
        <h5>✨ Positive Effects (Buffs)</h5>
        <ul>
          <li><strong>🔥 Frenzy:</strong> ${GAME_CONSTANTS.FRENZY_MULTIPLIER}x gold for 15s</li>
          <li><strong>💎 Lucky Zone:</strong> +${GAME_CONSTANTS.LUCKY_BUFF_BONUS}% buff chance for 10s</li>
          <li><strong>🔄 Double Tap:</strong> ${GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER}x click effectiveness for 12s</li>
          <li><strong>⭐ Star Power:</strong> Next ${GAME_CONSTANTS.STAR_POWER_CLICKS} clicks give +${GAME_CONSTANTS.STAR_POWER_BONUS} random resource</li>
          <li><strong>🛡️ Shield:</strong> Blocks next ${GAME_CONSTANTS.SHIELD_BLOCKS} debuffs</li>
          <li><strong>🎰 Slot Machine:</strong> ${GAME_CONSTANTS.SLOT_MACHINE_CHANCE * 100}% chance for +${GAME_CONSTANTS.SLOT_MACHINE_AMOUNT} random resource per click</li>
          <li><strong>👑 Golden Touch:</strong> 3x gold from all sources for 8s</li>
          <li><strong>⏰ Time Warp:</strong> Buildings work 5x faster for 6s</li>
        </ul>
        
        <h5>💀 Negative Effects (Debuffs)</h5>
        <ul>
          <li><strong>👻 Ghost Click:</strong> ${GAME_CONSTANTS.GHOST_CLICK_CHANCE * 100}% chance clicks ignored for 2s</li>
          <li><strong>💣 Explosion:</strong> Lose ${GAME_CONSTANTS.EXPLOSION_DAMAGE_PERCENT * 100}% of random resource instantly</li>
          <li><strong>🔒 Zone Lock:</strong> Cannot click for 1 second</li>
          <li><strong>❄️ Freeze:</strong> Combo counter frozen for 10s</li>
          <li><strong>⚖️ Heavy Click:</strong> Need ${GAME_CONSTANTS.HEAVY_CLICK_REQUIRED} clicks per cell for 8s</li>
          <li><strong>💸 Tax Collector:</strong> Lose ${GAME_CONSTANTS.TAX_COLLECTOR_PERCENT * 100}% of all resources every 3s for 9s</li>
          <li><strong>🌙 Curse:</strong> All buff chances reduced by 50% for 12s</li>
          <li><strong>☠️ Decay:</strong> Lose 1% of all resources every second for 15s</li>
        </ul>
        
        <h4>🙏 Faith vs 🌪️ Chaos</h4>
        <ul>
          <li><strong>🙏 Faith:</strong> Increases probability of getting buffs</li>
          <li><strong>🌪️ Chaos:</strong> Increases probability of getting debuffs</li>
          <li><strong>Balance:</strong> Equal faith/chaos = 50/50 buff/debuff chance</li>
          <li><strong>Influence:</strong> Higher faith = more buffs, higher chaos = more debuffs</li>
        </ul>
        
        <h4>🏗️ Buildings</h4>
        <ul>
          <li><strong>Production Buildings:</strong> Generate resources automatically</li>
          <li><strong>🪚 Sawmill:</strong> Produces wood every 10s</li>
          <li><strong>⛏️ Quarry:</strong> Produces stone every 12s</li>
          <li><strong>🌾 Farm:</strong> Produces food every 8s</li>
          <li><strong>🪣 Well:</strong> Produces water every 6s</li>
          <li><strong>⚒️ Mine:</strong> Produces iron every 15s</li>
          <li><strong>🏠 House:</strong> Attracts people every 30s</li>
          <li><strong>⚡ Generator:</strong> Increases max energy and regen rate</li>
          <li><strong>🔬 Laboratory:</strong> Produces science every 20s</li>
          <li><strong>⛪ Temple:</strong> Produces faith and reduces chaos</li>
          <li><strong>🏰 Fortress:</strong> Reduces debuff duration by 20%</li>
        </ul>
        
        <h4>🎯 Skills</h4>
        <ul>
          <li><strong>Skill Points:</strong> Earned from achievements and purchases</li>
          <li><strong>💰 Golden Touch:</strong> +10% gold per level</li>
          <li><strong>💥 Critical Strike:</strong> +5% crit chance per level (2x damage)</li>
          <li><strong>🔍 Resource Finder:</strong> +3% chance for bonus resources per level</li>
          <li><strong>🎯 Steady Hand:</strong> Protection against combo breaks</li>
          <li><strong>⏰ Time Stretch:</strong> +1s combo timeout per level</li>
          <li><strong>🔥 Combo Master:</strong> +15% combo effectiveness per level</li>
          <li><strong>💡 Energy Efficiency:</strong> -25% energy cost per level (max 3)</li>
          <li><strong>⚡ Energy Mastery:</strong> +100% energy regen per level</li>
          <li><strong>🔋 Power Storage:</strong> +50 max energy per level</li>
          <li><strong>🤖 Auto Clicker:</strong> Automatically clicks target (faster per level)</li>
        </ul>
        
        <h4>🛒 Market</h4>
        <ul>
          <li><strong>Trade Resources:</strong> Gold for basic materials</li>
          <li><strong>Special Items:</strong> Energy packs, skill crystals, etc.</li>
          <li><strong>Reputation System:</strong> More purchases = bigger discounts</li>
          <li><strong>Discounts:</strong> 25+ rep = 5%, 50+ rep = 10%, 100+ rep = 15%</li>
        </ul>
        
        <h4>🏆 Achievements</h4>
        <ul>
          <li><strong>Click Milestones:</strong> 100, 1000 clicks</li>
          <li><strong>Combo Records:</strong> 10, 50 combo</li>
          <li><strong>Resource Collection:</strong> 1000, 10000 total resources</li>
          <li><strong>Energy Zones:</strong> 10, 50 energy zone hits</li>
          <li><strong>Rewards:</strong> Skill points for progression</li>
        </ul>
        
        <h4>💾 Save System</h4>
        <ul>
          <li><strong>Auto-Save:</strong> Every 30 seconds</li>
          <li><strong>Manual Save:</strong> Generate exportable save code</li>
          <li><strong>Import/Export:</strong> Share saves between devices</li>
          <li><strong>Reset:</strong> Start completely over (permanent)</li>
        </ul>
        
        <h4>🎲 Grid Mechanics</h4>
        <ul>
          <li><strong>Grid Shuffle:</strong> ${GAME_CONSTANTS.ZONE_SHUFFLE_CHANCE}% chance after each click</li>
          <li><strong>Target Selection:</strong> Random cell becomes new target</li>
          <li><strong>Cell Distribution:</strong> 1 target, 0-1 energy, 0-1 bonus, rest empty</li>
          <li><strong>Accuracy Bonus:</strong> Center clicks give small bonuses</li>
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