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