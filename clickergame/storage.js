// storage.js
import { RESOURCES } from './config.js';

const DEFAULT_STATE = {
  blockedUntil: 0,
  combo: { lastZone: null, count: 0, deadline: 0 },
  resources: RESOURCES.reduce((o, k) => (o[k] = 0, o), {}),
  buffs: [],
  debuffs: [],
  flags: {},
  lastTimestamp: Date.now()
};

export function saveState(state) {
  const { featureMgr, ...toSave } = state;
  localStorage.setItem('gameState', btoa(JSON.stringify(toSave)));
}

export function loadState() {
  try {
    const enc = localStorage.getItem('gameState');
    if (!enc) throw 0;
    const loaded = JSON.parse(atob(enc));
    return { ...DEFAULT_STATE, ...loaded };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
