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
// Обновленный метод createGameRulesCard() для PanelManager.js
// Включает все изменения для системы сетки 3x3 и новые эффекты

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
      
      <h4>🎲 Effect System</h4>
      <p><strong>Base Effect Chance:</strong> ${GAME_CONSTANTS.BASE_EFFECT_CHANCE}% per target hit</p>
      <p><strong>Effect Influence:</strong> Faith increases buff chance, Chaos increases debuff chance</p>
      
      <h5>✨ Positive Effects (Buffs)</h5>
      <ul>
        <li><strong>🔥 Frenzy (Common):</strong> ${GAME_CONSTANTS.FRENZY_MULTIPLIER}x gold gain for 15s</li>
        <li><strong>💎 Lucky Zone (Common):</strong> +${GAME_CONSTANTS.LUCKY_BUFF_BONUS}% buff chance for 10s</li>
        <li><strong>⚙️ Resource Waterfall (Uncommon):</strong> +1 random resource every ${GAME_CONSTANTS.WATERFALL_INTERVAL / 1000}s for 10s</li>
        <li><strong>🔄 Double Tap (Uncommon):</strong> Each click counts as ${GAME_CONSTANTS.DOUBLE_TAP_MULTIPLIER} clicks for 12s</li>
        <li><strong>🎰 Slot Machine (Uncommon):</strong> ${GAME_CONSTANTS.SLOT_MACHINE_CHANCE * 100}% chance for +${GAME_CONSTANTS.SLOT_MACHINE_AMOUNT} random resource per click (15s)</li>
        <li><strong>⭐ Star Power (Uncommon):</strong> Next ${GAME_CONSTANTS.STAR_POWER_CLICKS} clicks give +${GAME_CONSTANTS.STAR_POWER_BONUS} random resource</li>
        <li><strong>🛡️ Shield (Rare):</strong> Blocks next ${GAME_CONSTANTS.SHIELD_BLOCKS} debuffs</li>
        <li><strong>👑 Golden Touch (Epic):</strong> 3x gold from all sources for 8s</li>
        <li><strong>⏰ Time Warp (Epic):</strong> Buildings work 5x faster for 6s</li>
        <li><strong>💎 Crystal Focus (Epic):</strong> All clicks are critical hits for 15s</li>
        <li><strong>🌈 Prismatic Glow (Rare):</strong> Target hits cost no energy for 10s</li>
        <li><strong>🎪 Chaos Clown (Legendary):</strong> 100% buff chance, 0% debuff chance for 10s</li>
        <li><strong>🏛️ Tax Boom (Legendary):</strong> 33% discount on all market items for 15 minutes</li>
      </ul>
      
      <h5>💀 Negative Effects (Debuffs)</h5>
      <ul>
        <li><strong>👻 Ghost Click (Mild):</strong> ${GAME_CONSTANTS.GHOST_CLICK_CHANCE * 100}% chance clicks ignored for 2s</li>
        <li><strong>💣 Explosion (Severe):</strong> Lose ${GAME_CONSTANTS.EXPLOSION_DAMAGE_PERCENT * 100}% of random resource instantly</li>
        <li><strong>🔒 Zone Lock (Moderate):</strong> Cannot click for 1 second</li>
        <li><strong>❄️ Freeze (Moderate):</strong> Combo counter frozen for 10s</li>
        <li><strong>⚖️ Heavy Click (Moderate):</strong> Need ${GAME_CONSTANTS.HEAVY_CLICK_REQUIRED} clicks per cell for 8s</li>
        <li><strong>💸 Tax Collector (Severe):</strong> Lose ${GAME_CONSTANTS.TAX_COLLECTOR_PERCENT * 100}% of all resources every ${GAME_CONSTANTS.TAX_COLLECTOR_INTERVAL / 1000}s for 9s</li>
        <li><strong>🌙 Curse (Severe):</strong> All buff chances reduced by 50% for 12s</li>
        <li><strong>☠️ Decay (Severe):</strong> Lose 1% of all resources every second for 15s</li>
        <li><strong>❄️ Absolute Zero (Catastrophic):</strong> Completely stops energy regen and building production for 15s</li>
        <li><strong>⚡ Energy Parasite (Severe):</strong> Each click costs double energy for 15s</li>
        <li><strong>🎲 Unlucky Curse (Catastrophic):</strong> 0% buff chance, 100% debuff chance for 20s</li>
      </ul>
      
      <h4>🙏 Faith vs 🌪️ Chaos Balance</h4>
      <ul>
        <li><strong>🙏 Faith:</strong> Increases probability of getting positive effects</li>
        <li><strong>🌪️ Chaos:</strong> Increases probability of getting negative effects</li>
        <li><strong>Balance Formula:</strong> Effect type = Faith / (Faith + Chaos)</li>
        <li><strong>Pure Faith:</strong> High faith, low chaos = mostly buffs</li>
        <li><strong>Pure Chaos:</strong> High chaos, low faith = mostly debuffs</li>
        <li><strong>Neutral:</strong> Equal amounts = 50/50 chance</li>
      </ul>
      
      <h4>🏗️ Building System</h4>
      <ul>
        <li><strong>🪚 Sawmill:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'sawmill')?.production?.amount || 1} wood every ${(BUILDING_DEFS.find(b => b.id === 'sawmill')?.production?.interval || 10000) / 1000}s</li>
        <li><strong>⛏️ Stone Quarry:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'quarry')?.production?.amount || 1} stone every ${(BUILDING_DEFS.find(b => b.id === 'quarry')?.production?.interval || 12000) / 1000}s</li>
        <li><strong>🌾 Farm:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'farm')?.production?.amount || 2} food every ${(BUILDING_DEFS.find(b => b.id === 'farm')?.production?.interval || 8000) / 1000}s</li>
        <li><strong>🪣 Water Well:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'well')?.production?.amount || 1} water every ${(BUILDING_DEFS.find(b => b.id === 'well')?.production?.interval || 6000) / 1000}s</li>
        <li><strong>⚒️ Iron Mine:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'mine')?.production?.amount || 1} iron every ${(BUILDING_DEFS.find(b => b.id === 'mine')?.production?.interval || 15000) / 1000}s</li>
        <li><strong>🏠 House:</strong> Attracts ${BUILDING_DEFS.find(b => b.id === 'house')?.production?.amount || 1} people every ${(BUILDING_DEFS.find(b => b.id === 'house')?.production?.interval || 30000) / 1000}s</li>
        <li><strong>⚡ Generator:</strong> Provides energy production and capacity bonuses</li>
        <li><strong>🔬 Laboratory:</strong> Produces ${BUILDING_DEFS.find(b => b.id === 'laboratory')?.production?.amount || 1} science every ${(BUILDING_DEFS.find(b => b.id === 'laboratory')?.production?.interval || 20000) / 1000}s</li>
        <li><strong>⛪ Temple:</strong> Produces faith and reduces chaos over time</li>
        <li><strong>🏰 Fortress:</strong> Provides 20% reduction to debuff duration</li>
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
        <li><strong>Save Version:</strong> Current version ${this.gameState?.saveVersion || '1.0.9'}</li>
      </ul>
      
      <h4>🎲 Advanced Mechanics</h4>
      <ul>
        <li><strong>Effect Stacking:</strong> Most effects don't stack, newer replaces older</li>
        <li><strong>Effect Priorities:</strong> Shield blocks debuffs, Chaos Clown blocks all debuffs</li>
        <li><strong>Rarity System:</strong> Common (45%), Uncommon (30%), Rare (18%), Epic (6%), Legendary (1%)</li>
        <li><strong>Severity System:</strong> Mild (45%), Moderate (35%), Severe (18%), Catastrophic (2%)</li>
        <li><strong>Energy Management:</strong> Strategic energy use is key to maintaining combo</li>
        <li><strong>Faith/Chaos Strategy:</strong> Balance these resources to control effect types</li>
        <li><strong>Building Synergy:</strong> Generator + Energy skills = extended gameplay</li>
        <li><strong>Grid Patterns:</strong> Target cell changes randomly after most clicks</li>
      </ul>
      
      <h4>🎯 Strategy Tips</h4>
      <ul>
        <li><strong>Early Game:</strong> Focus on basic resource buildings and energy skills</li>
        <li><strong>Mid Game:</strong> Build generators for energy, develop combo skills</li>
        <li><strong>Late Game:</strong> Optimize faith/chaos balance, max critical skills</li>
        <li><strong>Energy Priority:</strong> Always maintain enough energy for combo chains</li>
        <li><strong>Effect Management:</strong> Use Shield buff before attempting long combos</li>
        <li><strong>Market Timing:</strong> Buy during Tax Boom for maximum efficiency</li>
        <li><strong>Grid Strategy:</strong> Learn cell positions to click accurately and quickly</li>
        <li><strong>Auto Clicker:</strong> Essential for idle progression and maintaining combos</li>
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