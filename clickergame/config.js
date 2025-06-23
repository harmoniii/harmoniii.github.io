// config.js

export const CONFIG = {
  canvasSize: 500,
  rotationSpeed: 0.005,
  blockDuration: 3000
};

export const ZONE_COUNT = 8;

// На случай, если в будущем понадобится статический набор зон.
// Сейчас мы рендерим одинаковое число «random»-зон, но оставляем ZONE_DEFS
export const ZONE_DEFS = Array.from({ length: ZONE_COUNT }, () => ({ type: 'random' }));

export const RESOURCES = [
  'gold','faith','chaos','wood','stone','food','water','iron','people','energy','science'
];

export const BUFF_DEFS = [
  { id: 'frenzy',    name: '🔥 Frenzy',             duration: 15 },
  { id: 'lucky',     name: '💎 Lucky Zone',         duration: 10 },
  { id: 'magnet',    name: '🧲 Magnet',             duration: 10 },
  { id: 'waterfall', name: '⚙️ Resource Waterfall', duration: 10 }
];

export const DEBUFF_DEFS = [
  { id: 'rapid',     name: '🐌 Rapid Time',         duration: 5 },
  { id: 'ghost',     name: '👻 Ghost Click',        duration: 2 },
  { id: 'explosion', name: '💣 Explosion',         duration: null },
  { id: 'lock',      name: '🔒 Zone Lock',         duration: 1 }
];