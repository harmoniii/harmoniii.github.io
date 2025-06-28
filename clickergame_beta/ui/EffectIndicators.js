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
    
    // ИСПРАВЛЕНИЕ: Правильная регистрация DOM элемента
    this.registerDOMElement(this.container);
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
        }, 200);
      }
    }, 10);
  }

  // ИСПРАВЛЕНИЕ: Анимация удаления эффекта
  animateEffectRemoved(effectId) {
    const indicator = this.container.querySelector(`[data-effect-id="${effectId}"]`);
    
    if (indicator) {
      // Анимация исчезновения
      indicator.style.transition = 'all 0.3s ease-in';
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(-100%) scale(0.5)';
      
      // Удаляем элемент после анимации
      this.createTimeout(() => {
        if (indicator && indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }
  }

  // Извлечь иконку из названия эффекта
  extractIcon(name) {
    if (!name || typeof name !== 'string') return '?';
    
    // Ищем эмодзи в начале строки
    const emojiMatch = name.match(/^(\p{Emoji})/u);
    if (emojiMatch) {
      return emojiMatch[1];
    }
    
    // Ищем эмодзи в любом месте строки
    const anyEmojiMatch = name.match(/(\p{Emoji})/u);
    if (anyEmojiMatch) {
      return anyEmojiMatch[1];
    }
    
    // Возвращаем первый символ или знак вопроса
    return name.charAt(0) || '?';
  }

  // Извлечь название без иконки
  extractName(name) {
    if (!name || typeof name !== 'string') return 'Unknown';
    
    // Удаляем эмодзи и лишние пробелы
    return name.replace(/\p{Emoji}/gu, '').trim() || 'Unknown';
  }

  // Создать подсказку для эффекта
  createEffectTooltip(effectDef) {
    if (!effectDef) return 'Unknown effect';
    
    let tooltip = effectDef.name;
    
    if (effectDef.description) {
      tooltip += `\n${effectDef.description}`;
    }
    
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

  // Принудительное обновление всех индикаторов
  forceUpdate() {
    this.clearContainer();
    this.currentIndicators.clear();
    
    // Небольшая задержка перед созданием новых индикаторов
    this.createTimeout(() => {
      this.update();
    }, 100);
  }

  // Проверить наличие активных эффектов
  hasActiveEffects() {
    const buffs = this.gameState.buffs || [];
    const debuffs = this.gameState.debuffs || [];
    return buffs.length > 0 || debuffs.length > 0;
  }

  // Получить количество активных эффектов
  getActiveEffectCount() {
    const buffs = this.gameState.buffs || [];
    const debuffs = this.gameState.debuffs || [];
    return {
      buffs: buffs.length,
      debuffs: debuffs.length,
      total: buffs.length + debuffs.length
    };
  }

  // Получить список активных эффектов
  getActiveEffects() {
    const buffs = this.gameState.buffs || [];
    const debuffs = this.gameState.debuffs || [];
    
    return {
      buffs: buffs.map(id => ({
        id,
        definition: this.findBuffDefinition(id),
        type: 'buff'
      })).filter(effect => effect.definition),
      
      debuffs: debuffs.map(id => ({
        id,
        definition: this.findDebuffDefinition(id),
        type: 'debuff'
      })).filter(effect => effect.definition)
    };
  }

  // Получить отладочную информацию
  getDebugInfo() {
    const activeEffects = this.getActiveEffects();
    const indicatorElements = this.container ? 
      this.container.querySelectorAll('.effect-indicator').length : 0;
    
    return {
      containerExists: !!this.container,
      indicatorElements,
      currentIndicators: Array.from(this.currentIndicators),
      activeBuffs: activeEffects.buffs.map(b => b.id),
      activeDebuffs: activeEffects.debuffs.map(d => d.id),
      lastUpdateTime: this.lastUpdateTime,
      updateInterval: Date.now() - this.lastUpdateTime
    };
  }

  // Принудительная очистка (для отладки)
  forceCleanup() {
    console.log('🧹 Force cleaning effect indicators...');
    
    this.clearContainer();
    this.currentIndicators.clear();
    this.lastUpdateTime = 0;
    
    console.log('✅ Effect indicators force cleaned');
  }

  // Установить видимость контейнера
  setVisible(visible) {
    if (!this.container) return;
    
    if (visible) {
      this.container.style.display = 'flex';
      this.container.classList.remove('hidden');
    } else {
      this.container.style.display = 'none';
      this.container.classList.add('hidden');
    }
  }

  // Получить позицию контейнера
  getPosition() {
    if (!this.container) return null;
    
    const rect = this.container.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      bottom: rect.bottom,
      right: rect.right,
      width: rect.width,
      height: rect.height
    };
  }

  // Установить позицию контейнера
  setPosition(top, left) {
    if (!this.container) return;
    
    this.container.style.position = 'fixed';
    this.container.style.top = `${top}px`;
    this.container.style.left = `${left}px`;
  }

  // Добавить CSS стили если их нет
  addRequiredStyles() {
    if (document.getElementById('effect-indicators-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'effect-indicators-styles';
    style.textContent = `
      .effect-indicators {
        position: fixed;
        top: 100px;
        left: 20px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 900;
        max-width: 200px;
        pointer-events: none;
      }
      
      .effect-indicator {
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: bold;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        cursor: help;
        position: relative;
        transform: translateZ(0);
      }
      
      .effect-indicator:hover {
        transform: translateX(5px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .buff-indicator {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
        border-left: 4px solid #2E7D32;
      }
      
      .debuff-indicator {
        background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
        color: white;
        border-left: 4px solid #b71c1c;
      }
      
      .effect-icon {
        font-size: 1.2rem;
        min-width: 20px;
      }
      
      .effect-name {
        font-size: 0.8rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    
    document.head.appendChild(style);
  }

  // Инициализация с проверкой стилей
  initialize() {
    this.addRequiredStyles();
    this.initializeContainer();
    this.update();
  }

  // Деструктор
  destroy() {
    console.log('🧹 EffectIndicators cleanup started');
    
    // Очищаем все индикаторы
    this.clearContainer();
    
    // Вызываем родительский деструктор
    super.destroy();
    
    console.log('✅ EffectIndicators destroyed');
  }
}