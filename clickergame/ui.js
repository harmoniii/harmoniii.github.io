// Взаимодействие с DOM
const scoreEl = document.getElementById('score');
const upgradeClickBtn = document.getElementById('upgrade-click');
const upgradePassiveBtn = document.getElementById('upgrade-passive');
const resetBtn = document.getElementById('reset-button');

function updateScore(score) {
  scoreEl.textContent = Math.floor(score);
}

function bindUI(state) {
  upgradeClickBtn.addEventListener('click', () => {
    // Пример покупки апгрейда (без цены)
    upgrades.clickMultiplier.bonus = state.upgrades.clickMultiplier + 0.005;
    state.upgrades.clickMultiplier = upgrades.clickMultiplier.bonus;
    upgrades.clickMultiplier.apply(state);
    saveState(state);
    alert('Клик-множитель улучшен');
  });
  upgradePassiveBtn.addEventListener('click', () => {
    upgrades.passiveIncome.amount = state.upgrades.passiveIncome.amount + 1;
    state.upgrades.passiveIncome.amount = upgrades.passiveIncome.amount;
    saveState(state);
    alert('Пассивный доход улучшен');
  });
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}
