// Основной игровой цикл
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let state = loadState();

// Привязка UI
bindUI(state);

let angle = 0;

function gameLoop() {
  // Отрисовка
  ctx.clearRect(0, 0, CONFIG.canvasSize, CONFIG.canvasSize);
  zones.forEach(zone => {
    ctx.beginPath();
    ctx.moveTo(CONFIG.canvasSize / 2, CONFIG.canvasSize / 2);
    ctx.arc(
      CONFIG.canvasSize / 2,
      CONFIG.canvasSize / 2,
      CONFIG.canvasSize / 2 - 10,
      zone.startAngle + angle,
      zone.endAngle + angle
    );
    ctx.closePath();
    ctx.fillStyle = (zone.type === 'block') ? 'red' : 'green';
    ctx.fill();
  });

  // Пассивный доход
  upgrades.passiveIncome.apply(state);

  // Обновление UI и сохранение
  updateScore(state.score);
  saveState(state);

  // Вращение
  angle += CONFIG.rotationSpeed;
  requestAnimationFrame(gameLoop);
}

// Обработка кликов
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - CONFIG.canvasSize / 2;
  const y = e.clientY - rect.top - CONFIG.canvasSize / 2;
  const clickAngle = Math.atan2(y, x) - angle;

  if (Date.now() < state.blockedUntil) {
    // Игрок заблокирован
    return;
  }

  const zone = zones.find(z => z.contains(clickAngle));
  if (zone) {
    if (zone.type === 'block') {
      state.blockedUntil = Date.now() + CONFIG.blockDuration;
    } else if (zone.type === 'score') {
      state.score += state.clickValueBase;
    }
    saveState(state);
  }
});

// Запуск игры
gameLoop();
