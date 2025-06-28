// ui/ComboDisplay.js - Отдельный компонент для отображения комбо
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class ComboDisplay extends CleanupMixin {
  constructor(gameState) {
    super();
    
    this.gameState = gameState;
    this.comboIndicator = null;
    this.comboValue = null;
    this.comboBonus = null;
    this.lastComboCount = 0;
    
    this.initializeComboIndicator();
    this.bindEvents();
    
    console.log('🔥 ComboDisplay initialized');
  }

  // Инициализация индикатора комбо
  initializeComboIndicator() {
    this.comboIndicator = document.getElementById('combo-indicator');
    this.comboValue = document.getElementById('combo-value');
    this.comboBonus = document.getElementById('combo-bonus');
    
    if (!this.comboIndicator || !this.comboValue || !this.comboBonus) {
      console.warn('Combo indicator elements not found');
      return;
    }
    
    // Добавляем CSS стили для анимации если их нет
    this.addComboAnimationStyles();
  }

  // Привязка событий
  bindEvents() {
    // Обновляем при изменении комбо
    eventBus.subscribe(GameEvents.COMBO_CHANGED, (data) => {
      this.updateComboIndicator(data);
    });
  }

  // ИСПРАВЛЕНИЕ: Обновление индикатора комбо с правильной логикой
  updateComboIndicator(comboData = null) {
    if (!this.comboIndicator || !this.comboValue || !this.comboBonus) return;
    
    // Получаем данные комбо
    const comboCount = comboData?.count || this.gameState.combo?.count || 0;
    const comboDeadline = comboData?.deadline || this.gameState.combo?.deadline || 0;
    const targetZone = comboData?.target || this.gameState.targetZone || 0;
    const now = Date.now();
    
    // Обновляем значение комбо
    this.comboValue.textContent = comboCount.toString();
    
    // Обновляем состояние индикатора на основе уровня комбо
    this.comboIndicator.className = 'combo-indicator';
    
    if (comboCount >= 50) {
      this.comboIndicator.classList.add('combo-perfect');
      this.comboBonus.textContent = 'PERFECT COMBO! 🌟';
    } else if (comboCount >= 20) {
      this.comboIndicator.classList.add('combo-high');
      this.comboBonus.textContent = 'Amazing streak! 🔥';
    } else if (comboCount >= 10) {
      this.comboBonus.textContent = 'Great combo! Keep going!';
    } else if (comboCount >= 5) {
      this.comboBonus.textContent = 'Good streak! 👍';
    } else if (comboCount > 0) {
      this.comboBonus.textContent = `Building momentum... (Zone ${targetZone})`;
    } else {
      this.comboBonus.textContent = `Keep hitting the target! (Zone ${targetZone})`;
    }
    
    // Показываем оставшееся время если комбо активно
    if (comboCount > 0 && comboDeadline > now) {
      const timeLeft = Math.ceil((comboDeadline - now) / 1000);
      this.comboBonus.textContent += ` (${timeLeft}s)`;
    }
    
    // ИСПРАВЛЕНИЕ: Анимация при изменении комбо
    if (this.lastComboCount !== comboCount) {
      this.animateComboChange(comboCount > this.lastComboCount);
      this.lastComboCount = comboCount;
    }
  }

  // ИСПРАВЛЕНИЕ: Улучшенная анимация изменения комбо
  animateComboChange(isIncrease) {
    if (!this.comboValue) return;
    
    // Удаляем предыдущие классы анимации
    this.comboValue.classList.remove('combo-increase', 'combo-decrease');
    
    // Добавляем соответствующий класс
    const animationClass = isIncrease ? 'combo-increase' : 'combo-decrease';
    this.comboValue.classList.add(animationClass);
    
    // Убираем класс через время
    this.createTimeout(() => {
      if (this.comboValue) {
        this.comboValue.classList.remove(animationClass);
      }
    }, 600);
  }

  // Добавление CSS стилей для анимации
  addComboAnimationStyles() {
    if (document.getElementById('combo-animation-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'combo-animation-styles';
    style.textContent = `
      .combo-increase {
        animation: comboIncrease 0.6s ease-out;
      }
      
      .combo-decrease {
        animation: comboDecrease 0.6s ease-out;
      }
      
      @keyframes comboIncrease {
        0% { transform: scale(1); color: inherit; }
        50% { transform: scale(1.2); color: #4CAF50; text-shadow: 0 0 10px #4CAF50; }
        100% { transform: scale(1); color: inherit; }
      }
      
      @keyframes comboDecrease {
        0% { transform: scale(1); color: inherit; }
        50% { transform: scale(0.8); color: #f44336; text-shadow: 0 0 10px #f44336; }
        100% { transform: scale(1); color: inherit; }
      }
    `;
    document.head.appendChild(style);
  }

  // Принудительное обновление
  forceUpdate() {
    this.updateComboIndicator();
  }

  // Получить информацию о компоненте
  getDisplayInfo() {
    return {
      comboIndicator: !!this.comboIndicator,
      comboValue: !!this.comboValue,
      comboBonus: !!this.comboBonus,
      isVisible: this.comboIndicator && !this.comboIndicator.classList.contains('hidden'),
      currentCombo: this.gameState.combo?.count || 0,
      lastComboCount: this.lastComboCount
    };
  }

  // Скрыть/показать дисплей комбо
  setVisible(visible) {
    if (!this.comboIndicator) return;
    
    if (visible) {
      this.comboIndicator.classList.remove('hidden');
    } else {
      this.comboIndicator.classList.add('hidden');
    }
  }

  // Получить текущее состояние комбо
  getComboState() {
    return {
      count: this.gameState.combo?.count || 0,
      deadline: this.gameState.combo?.deadline || 0,
      timeLeft: Math.max(0, (this.gameState.combo?.deadline || 0) - Date.now()),
      targetZone: this.gameState.targetZone || 0,
      lastZone: this.gameState.combo?.lastZone,
      lastAngle: this.gameState.combo?.lastAngle
    };
  }

  // Деструктор
  destroy() {
    console.log('🧹 ComboDisplay cleanup started');
    
    super.destroy();
    
    console.log('✅ ComboDisplay destroyed');
  }
}