// game.js
import { CONFIG } from './config.js';
import { EventBus } from './eventBus.js';
import { FeatureManager } from './featureManager.js';
import { loadState, saveState } from './storage.js';
import UIManager from './ui.js';

let state = loadState();
state.featureMgr = new FeatureManager(state);
const ui = new UIManager(state);

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let angle = 0;

function getClickAngle(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - canvas.width / 2;
  const y = e.clientY - rect.top - canvas.height / 2;
  return Math.atan2(y, x) - angle;
}

canvas.addEventListener('click', e => EventBus.emit('click', getClickAngle(e)));
canvas.addEventListener('touchstart', e => EventBus.emit('click', getClickAngle(e.touches[0])));

function loop() {
  const now = Date.now();
  if (state.passive.amount > 0) {
    const diff = now - state.lastPassiveTick;
    if (diff >= state.passive.interval) {
      const times = Math.floor(diff / state.passive.interval);
      state.score += times * state.passive.amount;
      state.lastPassiveTick += times * state.passive.interval;
      EventBus.emit('scored', { gain: state.passive.amount });
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const total = 2 * Math.PI;
  const zones = state.featureMgr.zones;
  const step = total / zones.length;
  zones.forEach(z => {
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 2 - 10,
      z.index * step + angle,
      (z.index + 1) * step + angle
    );
    ctx.closePath();
    ctx.fillStyle = z.def.color;
    ctx.fill();
  });

  saveState(state);
  angle += CONFIG.rotationSpeed;
  requestAnimationFrame(loop);
}

loop();
