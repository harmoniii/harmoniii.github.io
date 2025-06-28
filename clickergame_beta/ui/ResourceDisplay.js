// ui/ResourceDisplay.js - ИСПРАВЛЕННАЯ версия БЕЗ управления комбо
import { CleanupMixin } from '../core/CleanupManager.js';
import { getResourceEmoji, RESOURCE_GROUPS } from '../config/ResourceConfig.js';
import { GAME_CONSTANTS } from '../config/GameConstants.js';

export class ResourceDisplay extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.tooltip = null;
  }

  // ИСПРАВЛЕНИЕ: Обновить отображение ресурсов БЕЗ комбо (БЕЗ энергии)
  update(leftContainer, rightContainer) {
    if (!this.isActive() || !leftContainer || !rightContainer) return;
    
    this.clearContainers(leftContainer, rightContainer);
    this.displayMainResources(leftContainer);
    this.displayOtherResources(rightContainer);
    this.displayGameStats(rightContainer);
  }

  // Очистить контейнеры
  clearContainers(leftContainer, rightContainer) {
    leftContainer.innerHTML = '';
    rightContainer.innerHTML = '';
  }

  // ИСПРАВЛЕНИЕ: Отобразить основные ресурсы БЕЗ энергии
  displayMainResources(container) {
    const mainResources = RESOURCE_GROUPS.BASIC; // gold, wood, stone, food, water, iron
    
    mainResources.forEach(resourceName => {
      const value = this.gameState.resources[resourceName] || 0;
      const element = this.createResourceElement(resourceName, value);
      container.appendChild(element);
      container.appendChild(document.createElement('br'));
    });
  }

  // ИСПРАВЛЕНИЕ: Отобразить остальные ресурсы БЕЗ энергии
  displayOtherResources(container) {
    // Исключаем энергию из отображения, показываем только people, science, faith, chaos
    const otherResources = ['people', 'science', 'faith', 'chaos'];
    
    otherResources.forEach(resourceName => {
      const value = this.gameState.resources[resourceName] || 0;
      const element = this.createResourceElement(resourceName, value);
      container.appendChild(element);
      container.appendChild(document.createElement('br'));
    });
  }

  // Отобразить игровую статистику БЕЗ комбо (теперь отдельно)
  displayGameStats(container) {
    // Skill Points
    const skillPoints = Math.floor(this.gameState.skillPoints || 0);
    const sp = this.createStatElement('Skill Points', skillPoints, '✨');
    container.appendChild(sp);
    
    // Дополнительная информация если есть активные эффекты
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
    const span = document.createElement('span');
    span.className = 'resource-display';
    
    const emoji = getResourceEmoji(resourceName);
    const formattedValue = this.formatValue(value);
    
    span.textContent = `${emoji} ${formattedValue}`;
    
    // Добавляем обработчики для подсказок
    this.addEventListener(span, 'mouseenter', (e) => {
      this.showTooltip(e, this.getResourceTooltip(resourceName, value));
    });
    
    this.addEventListener(span, 'mouseleave', () => {
      this.hideTooltip();
    });
    
    // Добавляем цветовое кодирование для специальных ресурсов
    if (resourceName === 'faith' && value > 0) {
      span.style.color = '#4CAF50';
    } else if (resourceName === 'chaos' && value > 0) {
      span.style.color = '#f44336';
    }
    
    return span;
  }

  // Создать элемент статистики
  createStatElement(label, value, emoji = '') {
    const div = document.createElement('div');
    div.className = 'stat-display';
    
    const formattedValue = this.formatValue(value);
    div.textContent = `${emoji} ${label}: ${formattedValue}`;
    
    return div;
  }

  // Форматировать значение для отображения
  formatValue(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '0';
    }
    
    // Для больших чисел используем сокращения
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
      gold: 'Primary currency earned by clicking',
      wood: 'Basic building material',
      stone: 'Sturdy construction resource',
      food: 'Sustenance for your people',
      water: 'Essential for life and production',
      iron: 'Strong metal for advanced buildings',
      people: 'Population that works in buildings',
      science: 'Research and development resource',
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
      document.body.appendChild(this.tooltip);
      
      this.onDestroy(() => {
        if (this.tooltip && document.body.contains(this.tooltip)) {
          document.body.removeChild(this.tooltip);
        }
      });
    }
    
    this.tooltip.textContent = text;
    this.tooltip.style.top = `${event.pageY + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.left = `${event.pageX + GAME_CONSTANTS.TOOLTIP_OFFSET}px`;
    this.tooltip.style.display = 'block';
    this.tooltip.style.whiteSpace = 'pre-line';
  }

  // Скрыть подсказку
  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
  }

  // Обновить только конкретный ресурс (оптимизация)
  updateResource(resourceName, container) {
    if (!this.isActive()) return;
    
    const resourceElements = container.querySelectorAll('.resource-display');
    resourceElements.forEach(element => {
      const text = element.textContent;
      const emoji = getResourceEmoji(resourceName);
      
      if (text.startsWith(emoji)) {
        const value = this.gameState.resources[resourceName] || 0;
        const formattedValue = this.formatValue(value);
        element.textContent = `${emoji} ${formattedValue}`;
      }
    });
  }

  // Подсветить ресурс (при изменении)
  highlightResource(resourceName, container) {
    if (!this.isActive()) return;
    
    const resourceElements = container.querySelectorAll('.resource-display');
    resourceElements.forEach(element => {
      const text = element.textContent;
      const emoji = getResourceEmoji(resourceName);
      
      if (text.startsWith(emoji)) {
        element.style.transition = 'all 0.3s ease';
        element.style.backgroundColor = '#4CAF50';
        element.style.color = 'white';
        element.style.padding = '2px 4px';
        element.style.borderRadius = '4px';
        
        // Убираем подсветку через время
        this.createTimeout(() => {
          if (element) {
            element.style.backgroundColor = '';
            element.style.color = '';
            element.style.padding = '';
            element.style.borderRadius = '';
          }
        }, 1000);
      }
    });
  }

  // Получить статистику отображения
  getDisplayStats() {
    return {
      totalResources: Object.keys(this.gameState.resources).length,
      totalValue: Object.values(this.gameState.resources).reduce((sum, val) => sum + (val || 0), 0),
      hasActiveEffects: (this.gameState.buffs && this.gameState.buffs.length > 0) || 
                       (this.gameState.debuffs && this.gameState.debuffs.length > 0)
    };
  }
}