// ui/EffectIndicators.js - Индикаторы активных эффектов
import { CleanupMixin } from '../core/CleanupManager.js';
import { BUFF_DEFS, DEBUFF_DEFS } from '../effects/EffectDefinitions.js';

export class EffectIndicators extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.container = null;
    this.initializeContainer();
  }

  // Инициализировать контейнер
  initializeContainer() {
    this.container = document.getElementById('effect-indicators');
    
    if (!this.container) {
      this.createContainer();
    }
  }

  // Создать контейнер для индикаторов
  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'effect-indicators';
    this.container.className = 'effect-indicators';
    document.body.appendChild(this.container);
    
    this.onDestroy(() => {
      if (document.body.contains(this.container)) {
        document.body.removeChild(this.container);
      }
    });
  }

  // Обновить индикаторы
  update() {
    if (!this.isActive() || !this.container) return;
    
    this.clearContainer();
    this.showActiveBuffs();
    this.showActiveDebuffs();
  }

  // Очистить контейнер
  clearContainer() {
    this.container.innerHTML = '';
  }

  // Показать активные баффы
  showActiveBuffs() {
    if (!this.gameState.buffs || this.gameState.buffs.length === 0) return;
    
    this.gameState.buffs.forEach(buffId => {
      const buffDef = this.findBuffDefinition(buffId);
      if (buffDef) {
        const indicator = this.createBuffIndicator(buffDef);
        this.container.appendChild(indicator);
      }
    });
  }

  // Показать активные дебаффы
  showActiveDebuffs() {
    if (!this.gameState.debuffs || this.gameState.debuffs.length === 0) return;
    
    this.gameState.debuffs.forEach(debuffId => {
      const debuffDef = this.findDebuffDefinition(debuffId);
      if (debuffDef) {
        const indicator = this.createDebuffIndicator(debuffDef);
        this.container.appendChild(indicator);
      }
    });
  }

  // Найти определение баффа
  findBuffDefinition(buffId) {
    return BUFF_DEFS.find(buff => buff.id === buffId);
  }

  // Найти определение дебаффа
  findDebuffDefinition(debuffId) {
    return DEBUFF_DEFS.find(debuff => debuff.id === debuffId);
  }

  // Создать индикатор баффа
  createBuffIndicator(buffDef) {
    const indicator = document.createElement('div');
    indicator.className = 'effect-indicator buff-indicator';
    indicator.setAttribute('data-effect-id', buffDef.id);
    
    const icon = this.extractIcon(buffDef.name);
    const name = this.extractName(buffDef.name);
    
    indicator.innerHTML = `
      <span class="effect-icon">${icon}</span>
      <span class="effect-name">${name}</span>
    `;
    
    // Добавляем подсказку
    indicator.title = this.createEffectTooltip(buffDef);
    
    // Добавляем анимацию появления
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(-20px)';
    
    this.createTimeout(() => {
      indicator.style.transition = 'all 0.3s ease-out';
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateX(0)';
    }, 50);
    
    return indicator;
  }

  // Создать индикатор дебаффа
  createDebuffIndicator(debuffDef) {
    const indicator = document.createElement('div');
    indicator.className = 'effect-indicator debuff-indicator';
    indicator.setAttribute('data-effect-id', debuffDef.id);
    
    const icon = this.extractIcon(debuffDef.name);
    const name = this.extractName(debuffDef.name);
    
    indicator.innerHTML = `
      <span class="effect-icon">${icon}</span>
      <span class="effect-name">${name}</span>
    `;
    
    // Добавляем подсказку
    indicator.title = this.createEffectTooltip(debuffDef);
    
    // Добавляем анимацию появления
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(-20px)';
    
    this.createTimeout(() => {
      indicator.style.transition = 'all 0.3s ease-out';
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateX(0)';
    }, 50);
    
    return indicator;
  }

  // Извлечь иконку из названия эффекта
  extractIcon(effectName) {
    const parts = effectName.split(' ');
    return parts[0] || '❓';
  }

  // Извлечь название без иконки
  extractName(effectName) {
    const parts = effectName.split(' ');
    return parts.slice(1).join(' ') || effectName;
  }

  // Создать подсказку для эффекта
  createEffectTooltip(effectDef) {
    let tooltip = `${effectDef.name}\n${effectDef.description}`;
    
    if (effectDef.duration) {
      tooltip += `\nDuration: ${effectDef.duration} seconds`;
    } else {
      tooltip += '\nInstant effect';
    }
    
    if (effectDef.rarity) {
      tooltip += `\nRarity: ${effectDef.rarity}`;
    }
    
    if (effectDef.severity) {
      tooltip += `\nSeverity: ${effectDef.severity}`;
    }
    
    return tooltip;
  }

  // Анимировать добавление эффекта
  animateEffectAdded(effectId, isPositive = true) {
    if (!this.container) return;
    
    // Создаем временный индикатор для анимации
    const tempIndicator = document.createElement('div');
    tempIndicator.className = `effect-indicator ${isPositive ? 'buff' : 'debuff'}-indicator effect-adding`;
    tempIndicator.style.position = 'fixed';
    tempIndicator.style.top = '50%';
    tempIndicator.style.left = '50%';
    tempIndicator.style.transform = 'translate(-50%, -50%) scale(2)';
    tempIndicator.style.zIndex = '10000';
    tempIndicator.style.opacity = '0.8';
    
    const effectDef = isPositive ? 
      this.findBuffDefinition(effectId) : 
      this.findDebuffDefinition(effectId);
    
    if (effectDef) {
      const icon = this.extractIcon(effectDef.name);
      tempIndicator.innerHTML = `<span class="effect-icon">${icon}</span>`;
      
      document.body.appendChild(tempIndicator);
      
      // Анимация перемещения к контейнеру
      this.createTimeout(() => {
        const containerRect = this.container.getBoundingClientRect();
        tempIndicator.style.transition = 'all 0.8s ease-out';
        tempIndicator.style.top = `${containerRect.top + 20}px`;
        tempIndicator.style.left = `${containerRect.left + 20}px`;
        tempIndicator.style.transform = 'scale(1)';
        tempIndicator.style.opacity = '0';
        
        this.createTimeout(() => {
          if (document.body.contains(tempIndicator)) {
            document.body.removeChild(tempIndicator);
          }
          this.update(); // Обновляем основные индикаторы
        }, 800);
      }, 100);
    }
  }

  // Анимировать удаление эффекта
  animateEffectRemoved(effectId) {
    if (!this.container) return;
    
    const indicator = this.container.querySelector(`[data-effect-id="${effectId}"]`);
    if (indicator) {
      indicator.style.transition = 'all 0.3s ease-in';
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(-20px) scale(0.8)';
      
      this.createTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  // Показать специальные состояния
  showSpecialStates() {
    const specialStates = [];
    
    // Проверяем специальные состояния из effectStates
    if (this.gameState.effectStates) {
      const states = this.gameState.effectStates;
      
      if (states.starPowerClicks > 0) {
        specialStates.push({
          icon: '⭐',
          name: 'Star Power',
          detail: `${states.starPowerClicks} clicks left`
        });
      }
      
      if (states.shieldBlocks > 0) {
        specialStates.push({
          icon: '🛡️',
          name: 'Shield',
          detail: `${states.shieldBlocks} blocks left`
        });
      }
      
      if (states.frozenCombo) {
        specialStates.push({
          icon: '❄️',
          name: 'Frozen Combo',
          detail: 'Combo cannot grow'
        });
      }
    }
    
    // Добавляем индикаторы специальных состояний
    specialStates.forEach(state => {
      const indicator = this.createSpecialStateIndicator(state);
      this.container.appendChild(indicator);
    });
  }

  // Создать индикатор специального состояния
  createSpecialStateIndicator(state) {
    const indicator = document.createElement('div');
    indicator.className = 'effect-indicator special-indicator';
    
    indicator.innerHTML = `
      <span class="effect-icon">${state.icon}</span>
      <span class="effect-name">${state.name}</span>
    `;
    
    indicator.title = `${state.name}\n${state.detail}`;
    
    return indicator;
  }

  // Получить количество активных эффектов
  getActiveEffectCount() {
    const buffCount = this.gameState.buffs ? this.gameState.buffs.length : 0;
    const debuffCount = this.gameState.debuffs ? this.gameState.debuffs.length : 0;
    return buffCount + debuffCount;
  }

  // Проверить, есть ли активные эффекты
  hasActiveEffects() {
    return this.getActiveEffectCount() > 0;
  }

  // Получить список активных эффектов
  getActiveEffects() {
    const effects = [];
    
    if (this.gameState.buffs) {
      this.gameState.buffs.forEach(buffId => {
        const def = this.findBuffDefinition(buffId);
        if (def) {
          effects.push({ ...def, type: 'buff' });
        }
      });
    }
    
    if (this.gameState.debuffs) {
      this.gameState.debuffs.forEach(debuffId => {
        const def = this.findDebuffDefinition(debuffId);
        if (def) {
          effects.push({ ...def, type: 'debuff' });
        }
      });
    }
    
    return effects;
  }
}