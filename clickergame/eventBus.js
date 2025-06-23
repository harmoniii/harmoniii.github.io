// eventBus.js
export const EventBus = {
  _handlers: {},
  subscribe(event, fn) {
    (this._handlers[event] = this._handlers[event] || []).push(fn);
  },
  emit(event, payload) {
    (this._handlers[event] || []).forEach(fn => fn(payload));
  }
};