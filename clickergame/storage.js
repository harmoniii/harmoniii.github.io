// Сохранение и загрузка прогресса
const STORAGE_KEY = 'clickerGameState';

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Object.assign({
      score: 0,
      clickValueBase: 1,
      upgrades: {
        clickMultiplier: upgrades.clickMultiplier.bonus,
        passiveIncome: {
          interval: upgrades.passiveIncome.interval,
          amount: upgrades.passiveIncome.amount
        },
      },
      blockedUntil: 0,
    }, data);
  } catch (e) {
    return {
      score: 0,
      clickValueBase: 1,
      upgrades: {
        clickMultiplier: upgrades.clickMultiplier.bonus,
        passiveIncome: {
          interval: upgrades.passiveIncome.interval,
          amount: upgrades.passiveIncome.amount
        },
      },
      blockedUntil: 0,
    };
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
