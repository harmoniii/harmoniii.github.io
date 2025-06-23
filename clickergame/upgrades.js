// Логика улучшений
const upgrades = {
  clickMultiplier: {
    name: "Увеличение дохода",
    bonus: 0.005, // +0.5%
    apply(state) {
      // Увеличивает базовый доход за клик
      state.clickValueBase *= (1 + this.bonus);
    },
  },
  passiveIncome: {
    name: "Пассивный доход",
    interval: 10000,  // мс
    amount: 1,        // очков
    lastTime: Date.now(),
    apply(state) {
      // Начисляет пассивно очки по таймеру
      const now = Date.now();
      if (now - this.lastTime >= this.interval) {
        state.score += this.amount;
        this.lastTime = now;
      }
    },
  },
};
