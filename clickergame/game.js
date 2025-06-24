// game.js
import { EventBus }       from './eventBus.js';
import { FeatureManager } from './featureManager.js';
import { BuildingManager } from './buildings.js';
import { SkillManager }   from './skills.js';
import { loadState, saveState } from './storage.js';
import UIManager          from './ui.js';
import { CONFIG }         from './config.js';

let state = loadState();

// Инициализация менеджеров
let fm = new FeatureManager(state);
state.featureMgr = fm;
let bm = new BuildingManager(state);
let sm = new SkillManager(state);

// Добавляем менеджеры в состояние
state.featureMgr = fm;
state.buildingManager = bm;
state.skillManager = sm;

// Инициализируем UI
new UIManager(state);

const canvas = document.getElementById('gameCanvas');
canvas.width = CONFIG.canvasSize;
canvas.height = CONFIG.canvasSize;
const ctx = canvas.getContext('2d');
let angle = 0;

function getClickAngle(e) {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left - canvas.width / 2;
  const y = e.clientY - r.top - canvas.height / 2;
  return Math.atan2(y, x) - angle;
}

canvas.addEventListener('click', e => EventBus.emit('click', getClickAngle(e)));
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  EventBus.emit('click', getClickAngle(e.touches[0]));
});

// Обработчик сброса игры
EventBus.subscribe('gameReset', () => {
  // Останавливаем все интервалы
  if (bm) bm.stopAllProduction();
  if (sm) sm.stopAllGeneration();
  
  // Очищаем обработчики событий
  EventBus._handlers = {};
  
  // Перезагружаем состояние
  state = loadState();
  
  // Пересоздаем менеджеры
  fm = new FeatureManager(state);
  bm = new BuildingManager(state);
  sm = new SkillManager(state);
  
  // Обновляем ссылки в состоянии
  state.featureMgr = fm;
  state.buildingManager = bm;
  state.skillManager = sm;
  
  // Пересоздаем UI
  new UIManager(state);
  
  angle = 0;
});

// Система награды skill points за достижения
let lastComboCheck = 0;
let lastResourceCheck = 0;

function checkAchievements() {
  const now = Date.now();
  
  // Проверяем достижения комбо каждые 10 секунд
  if (now - lastComboCheck > 10000) {
    lastComboCheck = now;
    
    if (state.combo.count >= 10) {
      sm.addSkillPoints(1);
    }
    if (state.combo.count >= 25) {
      sm.addSkillPoints(2);
    }
    if (state.combo.count >= 50) {
      sm.addSkillPoints(5);
    }
  }
  
  // Проверяем достижения ресурсов каждые 30 секунд
  if (now - lastResourceCheck > 30000) {
    lastResourceCheck = now;
    
    const totalResources = Object.values(state.resources)
      .reduce((sum, val) => sum + val, 0);
    
    if (totalResources >= 1000) {
      sm.addSkillPoints(1);
    }
    if (totalResources >= 5000) {
      sm.addSkillPoints(3);
    }
    if (totalResources >= 10000) {
      sm.addSkillPoints(5);
    }
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const total = 2 * Math.PI;
  const step = total / fm.zones.length;
  
  fm.zones.forEach(z => {
    const start = z.index * step + angle;
    const end = (z.index + 1) * step + angle;
    
    // Основная заливка
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
    ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, CONFIG.canvasSize / 2 - 10, start, end);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Подсветка целевого
    if (state.targetZone === z.index) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
      ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, CONFIG.canvasSize / 2 - 10, start, end);
      ctx.closePath();
      ctx.stroke();
    }
    
    // Предварительный показ следующей зоны (если есть навык)
    if (sm && sm.skills.zonePreview && sm.skills.zonePreview.level > 0) {
      // Показываем следующую зону после текущей
      const nextZone = (state.targetZone + 1) % fm.zones.length;
      if (nextZone === z.index) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
        ctx.arc(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2, CONFIG.canvasSize / 2 - 10, start, end);
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });

  // Проверяем достижения
  checkAchievements();
  
  saveState(state);
  
  // Применяем модификаторы скорости от навыков
  let rotationSpeed = CONFIG.rotationSpeed;
  
  // Увеличиваем скорость если есть дебафф rapid
  if (state.debuffs && state.debuffs.includes('rapid')) {
    rotationSpeed *= 5;
  }
  
  angle += rotationSpeed;
  requestAnimationFrame(loop);
}

loop();