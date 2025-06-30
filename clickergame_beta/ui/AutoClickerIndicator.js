// ui/AutoClickerIndicator.js - Новый компонент для отображения статуса автокликера
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';

export class AutoClickerIndicator extends CleanupMixin {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.indicator = null;
    this.lastStatus = null;
    
    this.createIndicator();
    this.bindEvents();
    this.updateStatus();
    
    console.log('🤖 AutoClickerIndicator initialized');
  }

  createIndicator() {
    // Создаем индикатор
    this.indicator = document.createElement('div');
    this.indicator.id = 'autoclicker-indicator';
    this.indicator.className = 'autoclicker-indicator hidden';
    
    // Позиционируем в правом нижнем углу игровой области
    this.indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 950;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      min-width: 180px;
      text-align: center;
      cursor: help;
    `;
    
    document.body.appendChild(this.indicator);
    this.registerDOMElement(this.indicator);
  }

  bindEvents() {
    // События автокликера
    eventBus.subscribe(GameEvents.AUTO_CLICKER_STARTED, () => {
      this.updateStatus();
    });

    eventBus.subscribe(GameEvents.AUTO_CLICKER_STOPPED, () => {
      this.updateStatus();
    });

    eventBus.subscribe(GameEvents.AUTO_CLICKER_PAUSED, () => {
      this.updateStatus();
    });

    eventBus.subscribe(GameEvents.AUTO_CLICKER_RESUMED, () => {
      this.updateStatus();
    });

    // События рейдов
    eventBus.subscribe(GameEvents.RAID_STARTED, () => {
      this.updateStatus();
    });

    eventBus.subscribe(GameEvents.RAID_COMPLETED, () => {
      this.updateStatus();
    });

    eventBus.subscribe(GameEvents.RAID_CANCELLED, () => {
      this.updateStatus();
    });

    // События навыков
    eventBus.subscribe(GameEvents.SKILL_BOUGHT, (data) => {
      if (data.skillId === 'autoClicker') {
        this.updateStatus();
      }
    });

    // Обновляем статус периодически
    this.createInterval(() => {
      this.updateStatus();
    }, 2000, 'autoclicker-status-update');
  }

  updateStatus() {
    if (!this.isActive() || !this.indicator) return;

    const autoClickerStats = this.getAutoClickerStats();
    const raidStatus = this.getRaidStatus();
    
    // Определяем новый статус
    const newStatus = this.determineStatus(autoClickerStats, raidStatus);
    
    // Обновляем только если статус изменился
    if (JSON.stringify(newStatus) !== JSON.stringify(this.lastStatus)) {
      this.applyStatus(newStatus);
      this.lastStatus = newStatus;
    }
  }

  getAutoClickerStats() {
    if (this.gameState.skillManager && 
        typeof this.gameState.skillManager.getAutoClickerStats === 'function') {
      return this.gameState.skillManager.getAutoClickerStats();
    }
    
    return {
      level: 0,
      active: false,
      blocked: false,
      pending: false,
      status: 'Not available'
    };
  }

  getRaidStatus() {
    if (this.gameState.raidManager && 
        typeof this.gameState.raidManager.getCurrentRaidStatus === 'function') {
      return this.gameState.raidManager.getCurrentRaidStatus();
    }
    
    return { inProgress: false };
  }

  determineStatus(autoClickerStats, raidStatus) {
    const { level, active, blocked, pending, status } = autoClickerStats;
    const { inProgress } = raidStatus;

    // Если навык не изучен, не показываем индикатор
    if (level === 0) {
      return { show: false };
    }

    let displayText, statusClass, borderColor, tooltip;

    if (inProgress && (blocked || pending)) {
      // Во время рейда
      displayText = '🤖 ⚔️ Paused for Raid';
      statusClass = 'paused-raid';
      borderColor = '#f39c12';
      tooltip = 'Auto clicker is paused during the raid expedition.\nIt will resume automatically when the raid ends.';
    } else if (active) {
      // Активен
      displayText = '🤖 ✅ Auto Clicker ON';
      statusClass = 'active';
      borderColor = '#27ae60';
      tooltip = `Auto clicker is running at level ${level}.\nAutomatically clicking the target zone.`;
    } else if (level > 0) {
      // Изучен но не активен
      displayText = '🤖 ⭕ Auto Clicker OFF';
      statusClass = 'inactive';
      borderColor = '#95a5a6';
      tooltip = `Auto clicker skill level ${level} available.\nWill activate when appropriate.`;
    } else {
      // Не должно происходить, но на всякий случай
      return { show: false };
    }

    return {
      show: true,
      text: displayText,
      statusClass,
      borderColor,
      tooltip,
      level
    };
  }

  applyStatus(status) {
    if (!status.show) {
      this.hideIndicator();
      return;
    }

    // Показываем индикатор
    this.indicator.classList.remove('hidden');
    this.indicator.textContent = status.text;
    this.indicator.title = status.tooltip;
    
    // Применяем стили
    this.indicator.style.borderColor = status.borderColor;
    
    // Убираем предыдущие классы состояния
    this.indicator.classList.remove('active', 'inactive', 'paused-raid');
    this.indicator.classList.add(status.statusClass);
    
    // Специальная анимация для паузы рейда
    if (status.statusClass === 'paused-raid') {
      this.indicator.style.animation = 'autoClickerPulse 2s ease-in-out infinite';
    } else {
      this.indicator.style.animation = '';
    }
  }

  hideIndicator() {
    if (this.indicator) {
      this.indicator.classList.add('hidden');
    }
  }

  // Показать/скрыть индикатор принудительно
  setVisible(visible) {
    if (!this.indicator) return;

    if (visible) {
      this.updateStatus();
    } else {
      this.hideIndicator();
    }
  }

  // Получить текущий статус для отладки
  getCurrentStatus() {
    return {
      visible: this.indicator && !this.indicator.classList.contains('hidden'),
      text: this.indicator ? this.indicator.textContent : null,
      lastStatus: this.lastStatus,
      autoClickerStats: this.getAutoClickerStats(),
      raidStatus: this.getRaidStatus()
    };
  }

  // Добавить CSS стили
  addRequiredStyles() {
    if (document.getElementById('autoclicker-indicator-styles')) return;

    const style = document.createElement('style');
    style.id = 'autoclicker-indicator-styles';
    style.textContent = `
      .autoclicker-indicator.hidden {
        display: none;
      }
      
      .autoclicker-indicator.active {
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        border-color: #27ae60 !important;
      }
      
      .autoclicker-indicator.inactive {
        background: linear-gradient(135deg, #95a5a6 0%, #bdc3c7 100%);
        border-color: #95a5a6 !important;
      }
      
      .autoclicker-indicator.paused-raid {
        background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
        border-color: #f39c12 !important;
      }
      
      .autoclicker-indicator:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      }
      
      @keyframes autoClickerPulse {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        50% {
          box-shadow: 0 4px 12px rgba(243, 156, 18, 0.6);
        }
      }
      
      /* Адаптивность для мобильных */
      @media (max-width: 768px) {
        .autoclicker-indicator {
          bottom: 10px;
          right: 10px;
          font-size: 0.75rem;
          padding: 0.5rem 0.75rem;
          min-width: 150px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // Инициализация с добавлением стилей
  initialize() {
    this.addRequiredStyles();
    this.updateStatus();
  }

  // Деструктор
  destroy() {
    console.log('🧹 AutoClickerIndicator cleanup started');
    
    if (this.indicator) {
      this.hideIndicator();
    }
    
    super.destroy();
    
    console.log('✅ AutoClickerIndicator destroyed');
  }
}