// game.js
import { EventBus }       from './eventBus.js';
import { FeatureManager } from './featureManager.js';
import { loadState, saveState } from './storage.js';
import UIManager          from './ui.js';
import { CONFIG }         from './config.js';

let state = loadState();
let fm    = new FeatureManager(state);
state.featureMgr = fm;
new UIManager(state);

const canvas = document.getElementById('gameCanvas');
canvas.width  = CONFIG.canvasSize;
canvas.height = CONFIG.canvasSize;
const ctx = canvas.getContext('2d');
let angle = 0;

function getClickAngle(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left  - canvas.width/2;
  const y = e.clientY - r.top   - canvas.height/2;
  return Math.atan2(y,x) - angle;
}

canvas.addEventListener('click',      e=>EventBus.emit('click', getClickAngle(e)));
canvas.addEventListener('touchstart', e=>{e.preventDefault();EventBus.emit('click', getClickAngle(e.touches[0]));});

EventBus.subscribe('gameReset', () => {
  EventBus._handlers = {}; 
  state = loadState();
  fm = new FeatureManager(state);
  state.featureMgr = fm;
  new UIManager(state);
  angle = 0;
});

function loop(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const total = 2*Math.PI;
  const step  = total/fm.zones.length;
  fm.zones.forEach(z=>{
    const start = z.index*step + angle;
    const end   = (z.index+1)*step + angle;
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasSize/2,CONFIG.canvasSize/2);
    ctx.arc(CONFIG.canvasSize/2,CONFIG.canvasSize/2,CONFIG.canvasSize/2-10,start,end);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    // подсветка целевого
    if (state.combo.lastZone === z.index) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CONFIG.canvasSize/2,CONFIG.canvasSize/2);
      ctx.arc(CONFIG.canvasSize/2,CONFIG.canvasSize/2,CONFIG.canvasSize/2-10,start,end);
      ctx.closePath();
      ctx.stroke();
    }
  });
  saveState(state);
  angle += CONFIG.rotationSpeed;
  requestAnimationFrame(loop);
}

loop();
