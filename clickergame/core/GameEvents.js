// core/GameEvents.js - Упрощенная система событий
export class GameEvents {
  // Игровые события
  static CLICK = 'game:click';
  static COMBO_CHANGED = 'game:combo_changed';
  static ZONES_SHUFFLED = 'game:zones_shuffled';
  
  // События ресурсов
  static RESOURCE_CHANGED = 'resource:changed';
  static RESOURCE_GAINED = 'resource:gained';
  static RESOURCE_SPENT = 'resource:spent';
  
  // События энергии
  static ENERGY_CHANGED = 'energy:changed';
  static ENERGY_INSUFFICIENT = 'energy:insufficient';
  static ENERGY_CRITICAL = 'energy:critical';
  static ENERGY_ZONE_HIT = 'energy:zone_hit';
  
  // События эффектов
  static BUFF_APPLIED = 'effect:buff_applied';
  static BUFF_EXPIRED = 'effect:buff_expired';
  static DEBUFF_APPLIED = 'effect:debuff_applied';
  static DEBUFF_EXPIRED = 'effect:debuff_expired';
  static SHIELD_BLOCK = 'effect:shield_block';
  
  // События навыков
  static SKILL_BOUGHT = 'skill:bought';
  static SKILL_POINTS_CHANGED = 'skill:points_changed';
  static CRITICAL_HIT = 'skill:critical_hit';
  static BONUS_RESOURCE_FOUND = 'skill:bonus_resource';
  static MISS_PROTECTION_USED = 'skill:miss_protection';
  
  // События зданий
  static BUILDING_BOUGHT = 'building:bought';
  static BUILDING_PRODUCED = 'building:produced';
  
  // События маркета
  static ITEM_PURCHASED = 'market:item_purchased';
  
  // UI события
  static NOTIFICATION = 'ui:notification';
  static SKILL_NOTIFICATION = 'ui:skill_notification';
  static MYSTERY_BOX = 'ui:mystery_box';
  static TEMP_MESSAGE = 'ui:temp_message';
  
  // Специальные события
  static STAR_POWER_USED = 'special:star_power_used';
  static SLOT_MACHINE_WIN = 'special:slot_machine_win';
  static TAX_COLLECTED = 'special:tax_collected';
  static HEAVY_CLICK_PROGRESS = 'special:heavy_click_progress';
  static GHOST_CLICK = 'special:ghost_click';
  
  // События зон
  static ZONE_HIT = 'zone:hit';
  static ZONE_MISS = 'zone:miss';
  
  // Системные события
  static GAME_RESET = 'system:reset';
  static SAVE_COMPLETED = 'system:save_completed';
  static LOAD_COMPLETED = 'system:load_completed';
  
  // События достижений
  static ACHIEVEMENT_UNLOCKED = 'achievement:unlocked';
}

export class EventBus {
  constructor() {
      this._handlers = new Map();
  }
  
  subscribe(event, handler) {
      if (typeof handler !== 'function') {
          throw new Error('Event handler must be a function');
      }
      
      if (!this._handlers.has(event)) {
          this._handlers.set(event, new Set());
      }
      
      this._handlers.get(event).add(handler);
      return handler;
  }
  
  unsubscribe(event, handler) {
      if (this._handlers.has(event)) {
          const handlers = this._handlers.get(event);
          handlers.delete(handler);
          
          if (handlers.size === 0) {
              this._handlers.delete(event);
          }
      }
  }
  
  emit(event, payload = {}) {
      if (this._handlers.has(event)) {
          const handlers = this._handlers.get(event);
          const normalizedPayload = this._normalizePayload(payload);
          
          handlers.forEach(handler => {
              try {
                  handler(normalizedPayload);
              } catch (error) {
                  console.error(`Error in event handler for ${event}:`, error);
              }
          });
      }
  }
  
  _normalizePayload(payload) {
      if (payload === undefined || payload === null) {
          return {};
      }
      if (typeof payload === 'string') {
          return { message: payload };
      }
      if (typeof payload === 'object' && !Array.isArray(payload)) {
          return { ...payload };
      }
      return { data: payload };
  }
  
  once(event, handler) {
      const onceHandler = (payload) => {
          handler(payload);
          this.unsubscribe(event, onceHandler);
      };
      
      return this.subscribe(event, onceHandler);
  }
  
  clearAll() {
      this._handlers.clear();
  }
  
  hasSubscribers(event) {
      return this._handlers.has(event) && this._handlers.get(event).size > 0;
  }
}

export const eventBus = new EventBus();