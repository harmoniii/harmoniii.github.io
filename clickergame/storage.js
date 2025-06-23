// storage.js
import { CONFIG } from './config.js';

function xorEncode(str, key) {
  let res = '';
  for (let i = 0; i < str.length; i++) {
    res += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(res);
}

function xorDecode(data, key) {
  const str = atob(data);
  let res = '';
  for (let i = 0; i < str.length; i++) {
    res += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return res;
}

const DEFAULT_STATE = {
  score: 0,
  clickValueBase: 1,
  passive: { amount: 0, interval: Infinity },
  blockedUntil: 0,
  totalClicks: 0,
  lastTimestamp: Date.now(),
  lastPassiveTick: Date.now(),
  skillPoints: 0,
  flags: {}
};

export function saveState(state) {
  const { featureMgr, ...toSave } = state;
  const json = JSON.stringify(toSave);
  const enc = xorEncode(json, CONFIG.storageSecret);
  localStorage.setItem('gameState', enc);
}

export function loadState() {
  try {
    const enc = localStorage.getItem('gameState');
    if (!enc) throw 'no data';
    const json = xorDecode(enc, CONFIG.storageSecret);
    const loaded = JSON.parse(json);
    return { ...DEFAULT_STATE, ...loaded };
  } catch {
    return { ...DEFAULT_STATE };
  }
}
