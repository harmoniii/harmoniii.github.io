// core/ZoneEventQueue.js - Очередь событий зон для синхронизации
import { CleanupMixin } from './CleanupManager.js';
import { eventBus, GameEvents } from './GameEvents.js';

export class ZoneEventQueue extends CleanupMixin {
  constructor() {
    super();
    
    this.eventQueue = [];
    this.isProcessing = false;
    this.processingTimeout = null;
    this.maxQueueSize = 50;
    this.processInterval = 16; // ~60 FPS
    
    this.startProcessing();
    
    console.log('📋 ZoneEventQueue initialized');
  }

  /**
   * Добавить событие в очередь
   * @param {string} type - Тип события
   * @param {Object} data - Данные события
   * @param {number} priority - Приоритет (0 = высший)
   */
  enqueue(type, data = {}, priority = 5) {
    if (this.eventQueue.length >= this.maxQueueSize) {
      console.warn('⚠️ Zone event queue is full, dropping oldest event');
      this.eventQueue.shift();
    }

    const event = {
      id: this.generateEventId(),
      type,
      data,
      priority,
      timestamp: Date.now(),
      processed: false
    };

    // Вставляем с учетом приоритета
    const insertIndex = this.findInsertIndex(priority);
    this.eventQueue.splice(insertIndex, 0, event);

    console.log(`📋 Enqueued zone event: ${type} (priority: ${priority})`);
    return event.id;
  }

  /**
   * Найти позицию для вставки события с учетом приоритета
   * @param {number} priority - Приоритет события
   * @returns {number} Индекс для вставки
   */
  findInsertIndex(priority) {
    for (let i = 0; i < this.eventQueue.length; i++) {
      if (this.eventQueue[i].priority > priority) {
        return i;
      }
    }
    return this.eventQueue.length;
  }

  /**
   * Обработать следующее событие в очереди
   */
  processNext() {
    if (this.eventQueue.length === 0 || this.isProcessing) {
      return false;
    }

    this.isProcessing = true;
    const event = this.eventQueue.shift();

    try {
      this.processEvent(event);
      event.processed = true;
      console.log(`✅ Processed zone event: ${event.type}`);
    } catch (error) {
      console.error(`❌ Error processing zone event ${event.type}:`, error);
    } finally {
      this.isProcessing = false;
    }

    return true;
  }

  /**
   * Обработать конкретное событие
   * @param {Object} event - Событие для обработки
   */
  processEvent(event) {
    switch (event.type) {
      case 'ZONE_SHUFFLE':
        this.processZoneShuffle(event.data);
        break;
        
      case 'TARGET_ZONE_CHANGE':
        this.processTargetZoneChange(event.data);
        break;
        
      case 'ZONE_CLICK':
        this.processZoneClick(event.data);
        break;
        
      case 'ZONE_REGENERATE':
        this.processZoneRegenerate(event.data);
        break;
        
      case 'ZONE_VALIDATE':
        this.processZoneValidate(event.data);
        break;
        
      default:
        console.warn(`Unknown zone event type: ${event.type}`);
    }
  }

  /**
   * Обработать перемешивание зон
   * @param {Object} data - Данные события
   */
  processZoneShuffle(data) {
    const { newTargetZone, reason = 'shuffle' } = data;
    
    // Эмитируем событие только после обработки
    eventBus.emit(GameEvents.ZONES_SHUFFLED, {
      newTargetZone,
      reason,
      timestamp: Date.now()
    });
  }

  /**
   * Обработать изменение целевой зоны
   * @param {Object} data - Данные события
   */
  processTargetZoneChange(data) {
    const { previousZone, newZone, source = 'unknown' } = data;
    
    eventBus.emit(GameEvents.ZONES_SHUFFLED, {
      newTargetZone: newZone,
      previousZone,
      source,
      timestamp: Date.now()
    });
  }

  /**
   * Обработать клик по зоне
   * @param {Object} data - Данные события
   */
  processZoneClick(data) {
    const { zoneIndex, angle, isTarget, effects } = data;
    
    if (isTarget) {
      eventBus.emit(GameEvents.ZONE_HIT, {
        zone: zoneIndex,
        angle,
        effects,
        timestamp: Date.now()
      });
    } else {
      eventBus.emit(GameEvents.ZONE_MISS, {
        zone: zoneIndex,
        angle,
        effects,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Обработать регенерацию зон
   * @param {Object} data - Данные события
   */
  processZoneRegenerate(data) {
    const { zoneCount, targetZone } = data;
    
    // Уведомляем о полной регенерации зон
    eventBus.emit(GameEvents.ZONES_SHUFFLED, {
      newTargetZone: targetZone,
      reason: 'regenerate',
      zoneCount,
      timestamp: Date.now()
    });
  }

  /**
   * Обработать валидацию зон
   * @param {Object} data - Данные события
   */
  processZoneValidate(data) {
    const { isValid, errors = [] } = data;
    
    if (!isValid) {
      console.warn('⚠️ Zone validation failed:', errors);
      
      // Планируем регенерацию зон при ошибках валидации
      this.enqueue('ZONE_REGENERATE', {
        zoneCount: 8, // ZONE_COUNT
        targetZone: 0,
        reason: 'validation_failed'
      }, 1); // Высокий приоритет
    }
  }

  /**
   * Запустить обработку очереди
   */
  startProcessing() {
    if (this.processingTimeout) {
      this.cleanupManager.clearTimeout(this.processingTimeout);
    }

    const processLoop = () => {
      if (!this.isActive()) return;
      
      this.processNext();
      
      this.processingTimeout = this.createTimeout(processLoop, this.processInterval);
    };

    this.processingTimeout = this.createTimeout(processLoop, this.processInterval);
    console.log('📋 Zone event processing started');
  }

  /**
   * Остановить обработку очереди
   */
  stopProcessing() {
    if (this.processingTimeout) {
      this.cleanupManager.clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
    }
    console.log('📋 Zone event processing stopped');
  }

  /**
   * Очистить очередь
   */
  clearQueue() {
    this.eventQueue = [];
    console.log('📋 Zone event queue cleared');
  }

  /**
   * Получить статистику очереди
   * @returns {Object} Статистика
   */
  getQueueStats() {
    const eventTypes = {};
    this.eventQueue.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    return {
      queueLength: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize,
      isProcessing: this.isProcessing,
      eventTypes,
      oldestEvent: this.eventQueue.length > 0 ? 
        Date.now() - this.eventQueue[this.eventQueue.length - 1].timestamp : 0
    };
  }

  /**
   * Проверить наличие событий определенного типа
   * @param {string} eventType - Тип события
   * @returns {boolean} true если есть события этого типа
   */
  hasEventType(eventType) {
    return this.eventQueue.some(event => event.type === eventType);
  }

  /**
   * Удалить все события определенного типа
   * @param {string} eventType - Тип события для удаления
   * @returns {number} Количество удаленных событий
   */
  removeEventType(eventType) {
    const initialLength = this.eventQueue.length;
    this.eventQueue = this.eventQueue.filter(event => event.type !== eventType);
    const removedCount = initialLength - this.eventQueue.length;
    
    if (removedCount > 0) {
      console.log(`📋 Removed ${removedCount} events of type ${eventType}`);
    }
    
    return removedCount;
  }

  /**
   * Получить события определенного типа
   * @param {string} eventType - Тип события
   * @returns {Object[]} Массив событий
   */
  getEventsByType(eventType) {
    return this.eventQueue.filter(event => event.type === eventType);
  }

  /**
   * Принудительно обработать все события
   */
  flushQueue() {
    console.log('📋 Flushing zone event queue...');
    
    let processed = 0;
    const maxProcessing = 100; // Защита от бесконечного цикла
    
    while (this.eventQueue.length > 0 && processed < maxProcessing) {
      if (!this.processNext()) {
        break;
      }
      processed++;
    }
    
    console.log(`📋 Flushed ${processed} events from queue`);
    return processed;
  }

  /**
   * Генерировать уникальный ID события
   * @returns {string} Уникальный ID
   */
  generateEventId() {
    return `zone_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Добавить высокоприоритетное событие (обрабатывается немедленно)
   * @param {string} type - Тип события
   * @param {Object} data - Данные события
   */
  enqueueImmediate(type, data = {}) {
    this.enqueue(type, data, 0);
    
    // Пытаемся обработать немедленно если не заняты
    if (!this.isProcessing) {
      this.createTimeout(() => this.processNext(), 1);
    }
  }

  /**
   * Валидировать событие перед добавлением в очередь
   * @param {string} type - Тип события
   * @param {Object} data - Данные события
   * @returns {boolean} true если событие валидно
   */
  validateEvent(type, data) {
    if (!type || typeof type !== 'string') {
      console.warn('⚠️ Invalid event type:', type);
      return false;
    }

    const validTypes = [
      'ZONE_SHUFFLE', 'TARGET_ZONE_CHANGE', 'ZONE_CLICK', 
      'ZONE_REGENERATE', 'ZONE_VALIDATE'
    ];

    if (!validTypes.includes(type)) {
      console.warn(`⚠️ Unknown event type: ${type}`);
      return false;
    }

    return true;
  }

  /**
   * Безопасное добавление события с валидацией
   * @param {string} type - Тип события
   * @param {Object} data - Данные события
   * @param {number} priority - Приоритет
   * @returns {string|null} ID события или null при ошибке
   */
  safeEnqueue(type, data = {}, priority = 5) {
    if (!this.validateEvent(type, data)) {
      return null;
    }

    try {
      return this.enqueue(type, data, priority);
    } catch (error) {
      console.error('❌ Error enqueueing zone event:', error);
      return null;
    }
  }

  /**
   * Деструктор
   */
  destroy() {
    console.log('🧹 ZoneEventQueue cleanup started');
    
    this.stopProcessing();
    this.clearQueue();
    
    super.destroy();
    
    console.log('✅ ZoneEventQueue destroyed');
  }
}