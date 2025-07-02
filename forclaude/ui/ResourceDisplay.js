// ui/ResourceDisplay.js - ИСПРАВЛЕНИЕ для новой разметки сетки 3x3
import { CleanupMixin } from '../core/CleanupManager.js';
import { getResourceEmoji, RESOURCE_GROUPS } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class ResourceDisplay extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.tooltip = null;
    
    console.log('📊 ResourceDisplay initialized for grid layout');
  }

  // ИСПРАВЛЕНИЕ: Обновить отображение для новой структуры
  update() {
    if (!this.isActive()) return;
    
    try {
      this.displayBasicResources();
      this.displayAdvancedResources();
      this.displaySpecialResources();
    } catch (error) {
      console.warn('⚠️ Error updating resource display:', error);
    }
  }

  // Отобразить основные ресурсы
  displayBasicResources() {
    const container = document.getElementById('basic-resources');
    if (!container) {
      console.warn('⚠️ Basic resources container not found');
      return;
    }
    
    container.innerHTML = '';
    
    const basicResources = RESOURCE_GROUPS.BASIC; // gold, wood, stone, food, water, iron
    
    basicResources.forEach(resourceName => {
      const value = this.gameState.resources[resourceName] || 0;
      const element = this.createResourceElement(resourceName, value);
      container.appendChild(element);
    });
  }

  // Отобразить продвинутые ресурсы
  displayAdvancedResources() {
    const container = document.getElementById('advanced-resources');
    if (!container) {
      console.warn('⚠️ Advanced resources container not found');
      return;
    }
    
    container.innerHTML = '';
    
    const advancedResources = RESOURCE_GROUPS.ADVANCED; // people, energy, science
    
    advancedResources.forEach(resourceName => {
      const value = this.gameState.resources[resourceName] || 0;
      const element = this.createResourceElement(resourceName, value);
      container.appendChild(element);
    });
  }

  // Отобразить специальные ресурсы и статистику
  displaySpecialResources() {
    const container = document.getElementById('special-resources');
    if (!container) {
      console.warn('⚠️ Special resources container not found');
      return;
    }
    
    container.innerHTML = '';
    
    // Специальные ресурсы
    const specialResources = RESOURCE_GROUPS.SPECIAL; // faith, chaos
    
    specialResources.forEach(resourceName => {
      const value = this.gameState.resources[resourceName] || 0;
      const element = this.createResourceElement(resourceName, value);
      container.appendChild(element);
    });
    
    // Skill Points
    const skillPoints = Math.floor(this.gameState.skillPoints || 0);
    const sp = this.createStatElement('Skill Points', skillPoints, '✨');
    container.appendChild(sp);
    
    // Активные эффекты если есть
    if (this.gameState.buffs && this.gameState.buffs.length > 0) {
      const activeBuffs = this.createStatElement('Active Buffs', this.gameState.buffs.length, '✨');
      container.appendChild(activeBuffs);
    }
    
    if (this.gameState.debuffs && this.gameState.debuffs.length > 0) {
      const activeDebuffs = this.createStatElement('Active Debuffs', this.gameState.debuffs.length, '💀');
      container.appendChild(activeDebuffs);
    }
  }

  // Создать элемент ресурса
  createResourceElement(resourceName, value) {
    const div = document.createElement('div');
    div.className = 'resource-display';
    
    const emoji = getResourceEmoji(resourceName);
    const formattedValue = this.formatValue(value);
    
    div.textContent = `${emoji} ${formattedValue}`;
    
    // Добавляем обработчики для подсказок
    this.addEventListener(div, 'mouseenter', (e) => {
      this.showTooltip(e, this.getResourceTooltip(resourceName, value));
    });
    
    this.addEventListener(div, 'mouseleave', () => {
      this.hideTooltip();
    });
    
    // Цветовое кодирование для специальных ресурсов
    if (resourceName === 'faith' && value > 0) {
      div.style.color = '#4CAF50';
    } else if (resourceName === 'chaos' && value > 0) {
      div.style.color = '#f44336';
    }
    
    return div;
  }

  // Создать элемент статистики
  createStatElement(label, value, emoji = '') {
    const div = document.createElement('div');
    div.className = 'resource-display';
    
    const formattedValue = this.formatValue(value);
    div.textContent = `${emoji} ${formattedValue}`;
    div.title = label; // Подсказка
    
    return div;
  }

  // Форматировать значение
  formatValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }
    
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'B';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else if (value >= 100) {
      return Math.floor(value).toString();
    } else {
      return value.toFixed(1);
    }
  }

  // Получить подсказку для ресурса
  getResourceTooltip(resourceName, value) {
    const tooltips = {
      gold: 'Primary currency earned by clicking the target',
      wood: 'Basic building material from sawmills',
      stone: 'Sturdy construction resource from quarries',
      food: 'Sustenance for your people from farms',
      water: 'Essential for life and production from wells',
      iron: 'Strong metal for advanced buildings from mines',
      people: 'Population that works in buildings',
      energy: 'Power for clicking and building operations',
      science: 'Research and development from laboratories',
      faith: 'Spiritual resource that increases buff chance',
      chaos: 'Destructive force that increases debuff chance'
    };
    
    const baseTooltip = tooltips[resourceName] || `Resource: ${resourceName}`;
    const exactValue = typeof value === 'number' ? value.toFixed(2) : '0';
    
    return `${baseTooltip}\nExact value: ${exactValue}`;
  }

  // Показать подсказку
  showTooltip(event, text) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      this.tooltip.style.cssText = `
        position: absolute;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        white-space: pre-line;
        max-width: 200px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(this.tooltip);
      
      this.onDestroy(() => {
        if (this.tooltip && document.body.contains(this.tooltip)) {
          document.body.removeChild(this.tooltip);
        }
      });
    }
    
    this.tooltip.textContent = text;
    this.tooltip.style.top = `${event.pageY + 10}px`;
    this.tooltip.style.left = `${event.pageX + 10}px`;
    this.tooltip.style.display = 'block';
  }

  // Скрыть подсказку
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  // Подсветить ресурс (при изменении)
  highlightResource(resourceName) {
    if (!this.isActive()) return;
    
    const containers = ['basic-resources', 'advanced-resources', 'special-resources'];
    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      const resourceElements = container.querySelectorAll('.resource-display');
      resourceElements.forEach(element => {
        const text = element.textContent;
        const emoji = getResourceEmoji(resourceName);
        
        if (text.startsWith(emoji)) {
          element.style.transition = 'all 0.3s ease';
          element.style.backgroundColor = '#4CAF50';
          element.style.color = 'white';
          element.style.transform = 'scale(1.05)';
          
          this.createTimeout(() => {
            if (element) {
              element.style.backgroundColor = '';
              element.style.color = '';
              element.style.transform = '';
            }
          }, 1000);
        }
      });
    });
  }

  // Получить статистику отображения
  getDisplayStats() {
    return {
      totalResources: Object.keys(this.gameState.resources || {}).length,
      totalValue: Object.values(this.gameState.resources || {}).reduce((sum, val) => sum + (val || 0), 0),
      hasActiveEffects: (this.gameState.buffs && this.gameState.buffs.length > 0) || 
                       (this.gameState.debuffs && this.gameState.debuffs.length > 0),
      skillPoints: this.gameState.skillPoints || 0,
      hasTooltip: !!this.tooltip
    };
  }

  // Принудительное обновление
  forceUpdate() {
    console.log('🔄 Force updating resource display...');
    this.update();
  }

  // Получить отладочную информацию
  getDebugInfo() {
    return {
      isActive: this.isActive(),
      containers: {
        basic: !!document.getElementById('basic-resources'),
        advanced: !!document.getElementById('advanced-resources'),
        special: !!document.getElementById('special-resources')
      },
      resources: this.gameState.resources || {},
      skillPoints: this.gameState.skillPoints || 0,
      effects: {
        buffs: (this.gameState.buffs || []).length,
        debuffs: (this.gameState.debuffs || []).length
      }
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 ResourceDisplay cleanup started');
    
    if (this.tooltip) {
      this.hideTooltip();
    }
    
    super.destroy();
    
    console.log('✅ ResourceDisplay destroyed');
  }
}