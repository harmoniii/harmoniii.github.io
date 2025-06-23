// game.js
import { EventBus }      from './eventBus.js';
import { FeatureManager }from './featureManager.js';
import { loadState, saveState } from './storage.js';
import UIManager         from './ui.js';
import { CONFIG }        from './config.js';

let state = loadState();
let featureManager = new FeatureManager(state);
state.featureMgr = featureManager;
new UIManager(state);

const canvas = document.getElementById('gameCanvas');
canvas.width  = CONFIG.canvasSize;
canvas.height = CONFIG.canvasSize;
const ctx    = canvas.getContext('2d');
let angle    = 0;

function getClickAngle(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left  - canvas.width  / 2;
  const y = e.clientY - rect.top   - canvas.height / 2;
  return Math.atan2(y, x) - angle;
}

canvas.addEventListener('click',      e => EventBus.emit('click', getClickAngle(e)));
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  EventBus.emit('click', getClickAngle(e.touches[0]));
});

function resetGame() {
  EventBus._handlers = {};
  state = loadState();
  featureManager = new FeatureManager(state);
  state.featureMgr = featureManager;
  new UIManager(state);
  angle = 0;
}
EventBus.subscribe('gameReset', resetGame);

function loop() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const total = 2 * Math.PI;
  const step  = total / featureManager.zones.length;
  featureManager.zones.forEach(z => {
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasSize/2, CONFIG.canvasSize/2);
    ctx.arc(
      CONFIG.canvasSize/2,
      CONFIG.canvasSize/2,
      CONFIG.canvasSize/2 - 10,
      z.index * step + angle,
      (z.index + 1) * step + angle
    );
    ctx.closePath();
    ctx.fillStyle = z.def.color || '#888';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  saveState(state);
  angle += CONFIG.rotationSpeed;
  requestAnimationFrame(loop);
}

loop();
