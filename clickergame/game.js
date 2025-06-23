// game.js
import { CONFIG, ZONE_DEFS } from './config.js';
import { EventBus } from './eventBus.js';
import { FeatureManager } from './featureManager.js';
import { loadState, saveState } from './storage.js';
import { UIManager } from './ui.js';

// Load or initialize state
let state = loadState();
// Initialize features and UI
state.featureMgr = new FeatureManager(state);
const ui = new UIManager(state);

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let angle = 0;

// Input handling (mouse and touch)
function getClickAngle(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - canvas.width / 2;
  const y = e.clientY - rect.top - canvas.height / 2;
  return Math.atan2(y, x) - angle;
}
canvas.addEventListener('click', e => EventBus.emit('click', getClickAngle(e)));
canvas.addEventListener('touchstart', e => EventBus.emit('click', getClickAngle(e.touches[0])));

// Main render loop
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw rotating zones
  const total = 2 * Math.PI;
  const step = total / ZONE_DEFS.length;
  state.featureMgr.zones.forEach(z => {
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

  // Save state each frame
  saveState(state);
  // Increment rotation
  angle += CONFIG.rotationSpeed;
  // Continue loop
  requestAnimationFrame(loop);
}

// Start the loop
loop();
