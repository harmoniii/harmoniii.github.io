// storage.js
import { CONFIG } from './config.js';

function xorEncode(str, key) {
  let res = '';
  for(let i=0;i<str.length;i++){
    res += String.fromCharCode(str.charCodeAt(i)^key.charCodeAt(i%key.length));
  }
  return btoa(res);
}
function xorDecode(data, key) {
  const str = atob(data);
  let res = '';
  for(let i=0;i<str.length;i++){
    res += String.fromCharCode(str.charCodeAt(i)^key.charCodeAt(i%key.length));
  }
  return res;
}

export function saveState(state) {
  const json = JSON.stringify(state);
  const enc = xorEncode(json, CONFIG.storageSecret);
  localStorage.setItem('gameState',enc);
}
export function loadState() {
  try {
    const enc = localStorage.getItem('gameState');
    if(!enc) throw 'no data';
    const json = xorDecode(enc, CONFIG.storageSecret);
    return JSON.parse(json);
  } catch {
    return {
      score:0, clickValueBase:1,
      passive:{amount:0,interval:Infinity}, blockedUntil:0,
      totalClicks:0, lastTimestamp:Date.now()
    };
  }
}