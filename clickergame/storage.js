// storage.js
import { RESOURCES } from './config.js';

const DEFAULT_STATE = {
  blockedUntil:       0,
  totalClicks:        0,
  lastTimestamp:      Date.now(),
  skillPoints:        0,
  flags:              {},
  combo: {
    lastZone:  null,
    count:     0,
    deadline:  0
  },
  resources: RESOURCES.reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
  buffs:     [],
  debuffs:   [],
  upgrades:  {},
  achievements:{},
  skills:    {}
};

export function saveState(state) {
  const { featureMgr, ...toSave } = state;
  localStorage.setItem('gameState', btoa(JSON.stringify(toSave)));
}

export function loadState() {
  try {
    const enc = localStorage.getItem('gameState');
    if (!enc) throw 'no data';
    const loaded = JSON.parse(atob(enc));
    return { ...DEFAULT_STATE, ...loaded };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
