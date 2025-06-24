// ui.js
import { EventBus }  from './eventBus.js';
import { saveState } from './storage.js';
import { SKILL_CATEGORIES } from './skills.js';
import { BUILDING_DEFS } from './buildings.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.currentTab = 'game';
    this.createLayout();
    this.bindSaveLoad();
    this.bindReset();
    this.bindTabSwitching();

    EventBus.subscribe('resourceChanged', () => this.updateResources());
    EventBus.subscribe('comboChanged', () => this.updateResources());
    EventBus.subscribe('buffApplied', id => this.showNotification(id));
    EventBus.subscribe('debuffApplied', id => this.showNotification(`Debuff: ${id}`));
    EventBus.subscribe('buildingBought', data => this.updateBuildingsTab());
    EventBus.subscribe('skillBought', data => this.updateSkillsTab());
    EventBus.subscribe('skillPointsChanged', () => this.updateSkillsTab());

    setInterval(() => saveState(this.state), 5000);
  }

  createLayout() {
    this.leftEl = document.getElementById('resources-left');
    this.rightEl = document.getElementById('resources-right');
    
    // Создаем табы если их нет
    this.createTabSystem();
    this.updateResources();
    this.updateActiveTab();
  }

  createTabSystem() {
    // Проверяем есть ли уже табы
    if (document.querySelector('.tabs')) return;

    const gameContainer = document.getElementById('game-container');
    
    // Создаем контейнер для табов
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tabs';
    tabContainer.innerHTML = `
      <button class="tab-btn active" data-tab="game">Game</button>
      <button class="tab-btn" data-tab="buildings">Buildings</button>
      <button class="tab-btn" data-tab="skills">Skills</button>
    `;
    
    // Вставляем перед game-container
    gameContainer.parentNode.insertBefore(tabContainer, gameContainer);
    
    // Создаем контент для табов
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.innerHTML = `
      <div class="tab-panel active" id="game-panel">
        <!-- Здесь будет игровой контент (canvas уже есть) -->
      </div>
      <div class="tab-panel" id="buildings-panel">
        <h3>Buildings</h3>
        <div id="buildings-list"></div>
      </div>
      <div class="tab-panel" id="skills-panel">
        <h3>Skills (Points: <span id="skill-points">0</span>)</h3>
        <div id="skills-list"></div>
      </div>
    `;
    
    // Вставляем после game-container
    gameContainer.parentNode.insertBefore(tabContent, gameContainer.nextSibling);
    
    // Перемещаем game-container в game-panel
    document.getElementById('game-panel').appendChild(gameContainer);
  }

  bindTabSwitching() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      }
    });
    
    // Bind building purchase buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('buy-building-btn')) {
        const buildingId = e.target.dataset.building;
        if (this.state.buildingManager) {
          this.state.buildingManager.buyBuilding(buildingId);
        }
      }
    });
    
    // Bind skill purchase buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('buy-skill-btn')) {
        const skillId = e.target.dataset.skill;
        if (this.state.skillManager) {
          this.state.skillManager.buySkill(skillId);
        }
      }
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Обновляем активные кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Обновляем активные панели
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabName}-panel`);
    });
    
    this.updateActiveTab();
  }

  updateActiveTab() {
    switch (this.currentTab) {
      case 'buildings':
        this.updateBuildingsTab();
        break;
      case 'skills':
        this.updateSkillsTab();
        break;
    }
  }

  updateBuildingsTab() {
    const container = document.getElementById('buildings-list');
    if (!container || !this.state.buildingManager) return;

    const buildings = this.state.buildingManager.getAllBuildings();
    const categorized = this.categorizeBuildings(buildings);
    
    container.innerHTML = '';
    
    Object.entries(categorized).forEach(([category, buildingList]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'building-category';
      
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = this.formatCategoryName(category);
      categoryDiv.appendChild(categoryTitle);
      
      buildingList.forEach(building => {
        const buildingDiv = document.createElement('div');
        buildingDiv.className = `building-item ${building.canAfford ? 'affordable' : 'expensive'}`;
        
        const priceText = building.nextPrice ? 
          Object.entries(building.nextPrice)
            .map(([res, amt]) => `${amt} ${res}`)
            .join(', ') : 'MAX';
            
        buildingDiv.innerHTML = `
          <div class="building-header">
            <span class="building-icon">${building.img}</span>
            <span class="building-name">${building.name}</span>
            <span class="building-level">Lv.${building.currentLevel}/${building.maxLevel}</span>
          </div>
          <div class="building-description">${building.description}</div>
          ${building.productionRate ? `<div class="building-production">Production: ${building.productionRate}</div>` : ''}
          <div class="building-footer">
            <span class="building-price">${priceText}</span>
            ${!building.isMaxLevel ? 
              `<button class="buy-building-btn ${building.canAfford ? '' : 'disabled'}" 
                       data-building="${building.id}" 
                       ${building.canAfford ? '' : 'disabled'}>
                 Buy
               </button>` : 
              '<span class="max-level">MAX</span>'
            }
          </div>
        `;
        
        categoryDiv.appendChild(buildingDiv);
      });
      
      container.appendChild(categoryDiv);
    });
  }

  categorizeBuildings(buildings) {
    const categories = {
      production: [],
      population: [],
      advanced: [],
      special: []
    };
    
    buildings.forEach(building => {
      const category = building.category || 'production';
      if (categories[category]) {
        categories[category].push(building);
      }
    });
    
    return categories;
  }

  updateSkillsTab() {
    const container = document.getElementById('skills-list');
    const pointsSpan = document.getElementById('skill-points');
    
    if (!container || !this.state.skillManager) return;
    
    // Обновляем количество очков навыков
    if (pointsSpan) {
      pointsSpan.textContent = Math.floor(this.state.skillPoints || 0);
    }

    const skillsByCategory = this.state.skillManager.getSkillsByCategory();
    
    container.innerHTML = '';
    
    Object.entries(skillsByCategory).forEach(([categoryId, skills]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'skill-category';
      
      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = SKILL_CATEGORIES[categoryId];
      categoryDiv.appendChild(categoryTitle);
      
      skills.forEach(skill => {
        const skillDiv = document.createElement('div');
        skillDiv.className = `skill-item ${skill.canAfford ? 'affordable' : 'expensive'}`;
        
        const costText = skill.nextCost !== null ? `${skill.nextCost} SP` : 'MAX';
        
        skillDiv.innerHTML = `
          <div class="skill-header">
            <span class="skill-icon">${skill.icon}</span>
            <span class="skill-name">${skill.name}</span>
            <span class="skill-level">Lv.${skill.currentLevel}/${skill.maxLevel}</span>
          </div>
          <div class="skill-description">${skill.description}</div>
          <div class="skill-effect">Current effect: ${this.formatSkillEffect(skill)}</div>
          <div class="skill-footer">
            <span class="skill-cost">${costText}</span>
            ${!skill.isMaxLevel ? 
              `<button class="buy-skill-btn ${skill.canAfford ? '' : 'disabled'}" 
                       data-skill="${skill.id}" 
                       ${skill.canAfford ? '' : 'disabled'}>
                 Upgrade
               </button>` : 
              '<span class="max-level">MAX</span>'
            }
          </div>
        `;
        
        categoryDiv.appendChild(skillDiv);
      });
      
      container.appendChild(categoryDiv);
    });
  }

  formatSkillEffect(skill) {
    const effect = skill.currentEffect;
    
    switch (skill.effect.type) {
      case 'multiplier':
        return `+${(effect * 100).toFixed(0)}%`;
      case 'chance':
        return `${(effect * 100).toFixed(1)}%`;
      case 'duration':
        return `+${(effect / 1000).toFixed(1)}s`;
      case 'reduction':
        return `-${(effect * 100).toFixed(0)}%`;
      case 'generation':
        return `+${effect.toFixed(2)}/min`;
      case 'charges':
        return `+${effect} charges`;
      case 'protection':
        return `${(effect * 100).toFixed(0)}% protection`;
      default:
        return `${effect}x`;
    }
  }

  formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  updateResources() {
    const r = this.state.resources;
    const fmt = v => Number(v).toFixed(1);
    this.leftEl.innerHTML = 
      `🪙 ${fmt(r.gold)}<br>🌲 ${fmt(r.wood)}<br>🪨 ${fmt(r.stone)}<br>` +
      `🍞 ${fmt(r.food)}<br>💧 ${fmt(r.water)}<br>⚙️ ${fmt(r.iron)}`;
    this.rightEl.innerHTML = 
      `👥 ${fmt(r.people)}<br>🔋 ${fmt(r.energy)}<br>🧠 ${fmt(r.science)}<br>` +
      `✝️ ${fmt(r.faith)}<br>☠️ ${fmt(r.chaos)}<br>Combo: ${this.state.combo.count}`;
  }

  bindSaveLoad() {
    document.getElementById('save-button').onclick = () => {
      const { featureMgr, buildingManager, skillManager, ...toSave } = this.state;
      prompt('Copy save-code:', btoa(JSON.stringify(toSave)));
    };
    document.getElementById('load-button').onclick = () => {
      const code = prompt('Paste save-code:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
      } catch {
        alert('Invalid code');
      }
    };
  }

  bindReset() {
    document.getElementById('reset-button').onclick = () => {
      if (confirm('Reset?')) {
        localStorage.removeItem('gameState');
        EventBus.emit('gameReset');
      }
    };
  }

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    document.getElementById('notifications').appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}