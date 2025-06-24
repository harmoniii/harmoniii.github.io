// config.js - Обновленная версия без баффов и дебаффов

export const CONFIG = {
  canvasSize:    500,
  rotationSpeed: 0.005,
  blockDuration: 3000,
  // Новые настройки баланса
  comboTimeout: 5000,
  maxComboMultiplier: 10, // ограничение на множитель комбо
  zoneShuffleChance: 75,       // % шанс, что после клика зона-мишень действительно поменяется
  baseChance: 10,             // базовый шанс получить бафф
  chanceRange: { min: 5, max: 25 }, // пределы шанса
};

export const ZONE_COUNT = 8;
export const ZONE_DEFS = Array.from({ length: ZONE_COUNT }, () => ({ type: 'random' }));

export const RESOURCES = [
  'gold','wood','stone','food','water','iron',
  'people','energy','science','faith','chaos'
];