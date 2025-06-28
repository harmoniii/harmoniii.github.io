// ui/EffectIndicators.js - ИСПРАВЛЕННАЯ версия с правильным удалением индикаторов
import { CleanupMixin } from '../core/CleanupManager.js';
import { BUFF_DEFS, DEBUFF_DEFS } from '../effects/EffectDefinitions.js';

export class EffectIndicators extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.container = null;
    
    // ИСПРАВЛЕНИЕ: Отслеживаем текущие индикаторы
    this.currentIndicators = new Set();
    this.lastUpdateTime = 0;
    
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

  // ИСПРАВЛЕНИЕ: Обновить индикаторы с правильной синхронизацией
  update() {
    if (!this.isActive() || !this.container) return;
    
    const now = Date.now();
    
    // Ограничиваем частоту обновлений для производительности
    if (now - this.lastUpdateTime < 100) return;
    this.lastUpdateTime = now;
    
    // Получаем текущие активные эффекты
    const currentBuffs = this.gameState.buffs || [];
    const currentDebuffs = this.gameState.debuffs || [];
    const allCurrentEffects = new Set([...currentBuffs, ...currentDebuffs]);
    
    // ИСПРАВЛЕНИЕ: Удаляем индикаторы для неактивных эффектов
    this.removeInactiveIndicators(allCurrentEffects);
    
    // Добавляем индикаторы для новых эффектов
    this.addNewIndicators(currentBuffs, currentDebuffs);
    
    // Обновляем отслеживаемый список
    this.currentIndicators = new Set(allCurrentEffects);
  }

  // ИСПРАВЛЕНИЕ: Удаление неактивных индикаторов
  removeInactiveIndicators(activeEffects) {
    const existingIndicators = this.container.querySelectorAll('.effect-indicator');
    
    existingIndicators.forEach(indicator => {
      const effectId = indicator.getAttribute('data-effect-id');
      
      if (effectId && !activeEffects.has(effectId)) {
        console.log(`🗑️ Removing indicator for inactive effect: ${effectId}`);
        this.animateEffectRemoved(effectId);
      }
    });
  }

  // ИСПРАВЛЕНИЕ: Добавление новых индикаторов
  addNewIndicators(currentBuffs, currentDebuffs) {
    // Добавляем индикаторы баффов
    currentBuffs.forEach(buffId => {
      if (!this.hasIndicator(buffId)) {
        const buffDef = this.findBuffDefinition(buffId);
        if (buffDef) {
          const indicator = this.createBuffIndicator(buffDef);
          this.container.appendChild(indicator);
        }
      }
    });
    
    // Добавляем индикаторы дебаффов
    currentDebuffs.forEach(debuffId => {
      if (!this.hasIndicator(debuffId)) {
        const debuffDef = this.findDebuffDefinition(debuffId);
        if (debuffDef) {
          const indicator = this.createDebuffIndicator(debuffDef);
          this.container.appendChild(indicator);
        }
      }
    });
  }

  // ИСПРАВЛЕНИЕ: Проверка наличия индикатора
  hasIndicator(effectId) {
    return this.container.querySelector(`[data-effect-id="${effectId}"]`) !== null;
  }

  // Очистить контейнер
  clearContainer() {
    if (this.container) {
      // ИСПРАВЛЕНИЕ: Плавная очистка с анимацией
      const indicators = this.container.querySelectorAll('.effect-indicator');
      indicators.forEach(indicator => {
        indicator.style.transition = 'all 0.3s ease-out';
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateX(-100%) scale(0.5)';
      });
      
      // Окончательная очистка после анимации
      this.createTimeout(() => {
        if (this.container) {
          this.container.innerHTML = '';
        }
      }, 300);
    }
    
    this.currentIndicators.clear();
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
    
    // ИСПРАВЛЕНИЕ: Улучшенная анимация появления
    this.animateIndicatorAppearance(indicator, 'buff');
    
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
    
    // ИСПРАВЛЕНИЕ: Улучшенная анимация появления
    this.animateIndicatorAppearance(indicator, 'debuff');
    
    return indicator;
  }

  // ИСПРАВЛЕНИЕ: Улучшенная анимация появления
  animateIndicatorAppearance(indicator, type) {
    // Начальное состояние
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(-100%) scale(0.8)';
    indicator.style.transition = 'none';
    
    // Запускаем анимацию через малый таймаут
    this.createTimeout(() => {
      indicator.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateX(0) scale(1)';
      
      // Дополнительный эффект мерцания для важных дебаффов
      if (type === 'debuff') {
        this.createTimeout(() => {
          indicator.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.8)';
          this.createTimeout(() => {
            indicator.style.boxShadow = '';
          }, 200);
        }, 400);
      }
    }, 50);
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
    
    // ИСПРАВЛЕНИЕ: Проверяем, не существует ли уже индикатор
    if (this.hasIndicator(effectId)) {
      console.log(`Indicator for ${effectId} already exists, skipping animation`);
      return;
    }
    
    // Создаем временный индикатор для анимации
    const tempIndicator = document.createElement('div');
    tempIndicator.className = `effect-indicator ${isPositive ? 'buff' : 'debuff'}-indicator effect-adding`;
    tempIndicator.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(2);
      z-index: 10000;
      opacity: 0.8;
      pointer-events: none;
    `;
    
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
        tempIndicator.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        tempIndicator.style.top = `${containerRect.top + 20}px`;
        tempIndicator.style.left = `${containerRect.left + 20}px`;
        tempIndicator.style.transform = 'scale(1)';
        tempIndicator.style.opacity = '0';
        
        this.createTimeout(() => {
          if (document.body.contains(tempIndicator)) {
            document.body.removeChild(tempIndicator);
          }
          // Обновляем основные индикаторы после анимации
          this.update();
        }, 800);
      }, 100);
    }
  }

  // ИСПРАВЛЕНИЕ: Улучшенная анимация удаления
  animateEffectRemoved(effectId) {
    if (!this.container) return;
    
    const indicator = this.container.querySelector(`[data-effect-id="${effectId}"]`);
    if (!indicator) {
      console.log(`Indicator for ${effectId} not found for removal`);
      return;
    }
    
    console.log(`🎬 Animating removal of effect: ${effectId}`);
    
    // Анимация исчезновения
    indicator.style.transition = 'all 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateX(-100%) scale(0.5)';
    indicator.style.filter = 'blur(2px)';
    
    // Удаляем из DOM после анимации
    this.createTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
        console.log(`🗑️ Removed indicator for ${effectId} from DOM`);
      }
    }, 400);
  }

  // ИСПРАВЛЕНИЕ: Показать специальные состояния с проверками
  showSpecialStates() {
    if (!this.gameState.effectStates) return;
    
    const specialStates = [];
    const states = this.gameState.effectStates;
    
    if (states.starPowerClicks > 0) {
      specialStates.push({
        icon: '⭐',
        name: 'Star Power',
        detail: `${states.starPowerClicks} clicks left`,
        id: 'special-star-power'
      });
    }
    
    if (states.shieldBlocks > 0) {
      specialStates.push({
        icon: '🛡️',
        name: 'Shield',
        detail: `${states.shieldBlocks} blocks left`,
        id: 'special-shield'
      });
    }
    
    if (states.frozenCombo) {
      specialStates.push({
        icon: '❄️',
        name: 'Frozen Combo',
        detail: 'Combo cannot grow',
        id: 'special-frozen'
      });
    }
    
    // Удаляем старые специальные индикаторы
    const oldSpecialIndicators = this.container.querySelectorAll('.special-indicator');
    oldSpecialIndicators.forEach(indicator => {
      const id = indicator.getAttribute('data-effect-id');
      if (!specialStates.find(s => s.id === id)) {
        this.animateEffectRemoved(id);
      }
    });
    
    // Добавляем новые специальные индикаторы
    specialStates.forEach(state => {
      if (!this.hasIndicator(state.id)) {
        const indicator = this.createSpecialStateIndicator(state);
        this.container.appendChild(indicator);
      }
    });
  }

  // Создать индикатор специального состояния
  createSpecialStateIndicator(state) {
    const indicator = document.createElement('div');
    indicator.className = 'effect-indicator special-indicator';
    indicator.setAttribute('data-effect-id', state.id);
    
    indicator.innerHTML = `
      <span class="effect-icon">${state.icon}</span>
      <span class="effect-name">${state.name}</span>
    `;
    
    indicator.title = `${state.name}\n${state.detail}`;
    
    // Анимация появления
    this.animateIndicatorAppearance(indicator, 'special');
    
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

  // ИСПРАВЛЕНИЕ: Принудительная очистка всех индикаторов
  forceCleanup() {
    console.log('🧹 Force cleaning all effect indicators...');
    
    if (this.container) {
      const indicators = this.container.querySelectorAll('.effect-indicator');
      console.log(`Found ${indicators.length} indicators to clean`);
      
      indicators.forEach((indicator, index) => {
        const effectId = indicator.getAttribute('data-effect-id');
        console.log(`Cleaning indicator ${index}: ${effectId}`);
        
        // Немедленное удаление без анимации
        this.createTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, index * 50); // Небольшая задержка для каждого индикатора
      });
    }
    
    this.currentIndicators.clear();
  }

  // ИСПРАВЛЕНИЕ: Получить отладочную информацию
  getDebugInfo() {
    const indicators = this.container ? 
      Array.from(this.container.querySelectorAll('.effect-indicator')).map(el => ({
        id: el.getAttribute('data-effect-id'),
        class: el.className,
        text: el.textContent
      })) : [];
    
    return {
      containerExists: !!this.container,
      indicatorCount: indicators.length,
      indicators,
      gameStateBuffs: this.gameState.buffs || [],
      gameStateDebuffs: this.gameState.debuffs || [],
      currentIndicators: Array.from(this.currentIndicators),
      lastUpdateTime: this.lastUpdateTime
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 EffectIndicators cleanup started');
    
    // Принудительная очистка
    this.forceCleanup();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ EffectIndicators destroyed');
  }
}