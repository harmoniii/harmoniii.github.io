// ui.js - версия с ультимативным Reset + меню Информация + индикаторы баффов
import { EventBus }            from './eventBus.js';
import { SKILL_CATEGORIES,
         SKILL_DEFS,
         SkillManager }         from './skills.js';
import { BUILDING_DEFS }        from './buildings.js';
import { BUFF_DEFS,
         DEBUFF_DEFS }          from './config.js';

export default class UIManager {
  constructor(state) {
    this.state = state;
    this.currentPanel = null;
    this.initElements();
    this.bindControls();
    this.bindEvents();
    this.updateResources();
    this.createEffectIndicators();
  }

  initElements() {
    this.btnBuildings    = document.getElementById('toggle-buildings');
    this.btnSkills       = document.getElementById('toggle-skills');
    this.btnMarket       = document.getElementById('toggle-market');
    this.btnInfo         = document.getElementById('info-button');
    this.resourcesLeft   = document.getElementById('resources-left');
    this.resourcesRight  = document.getElementById('resources-right');
    this.panel           = document.getElementById('panel-container');
    this.btnLoad         = document.getElementById('load-button');
    this.btnSave         = document.getElementById('save-button');
    this.btnReset        = document.getElementById('reset-button');
    this.notifications   = document.getElementById('notifications');
    this.infoModal       = document.getElementById('info-modal');
    this.mysteryModal    = document.getElementById('mystery-modal');
  }

  bindControls() {
    // Buildings
    this.btnBuildings.addEventListener('click', () => {
      this.currentPanel === 'buildings' ? this.hidePanel() : this.showBuildings();
    });
    // Skills
    this.btnSkills.addEventListener('click', () => {
      this.currentPanel === 'skills' ? this.hidePanel() : this.showSkills();
    });
    // Market
    this.btnMarket.addEventListener('click', () => {
      this.currentPanel === 'market' ? this.hidePanel() : this.showMarket();
    });
    // Info - теперь отдельное меню вместо модалки
    this.btnInfo.addEventListener('click', () => {
      this.currentPanel === 'info' ? this.hidePanel() : this.showInfo();
    });
    
    // Close modals on click
    this.infoModal.addEventListener('click',    () => this.infoModal.classList.add('hidden'));
    this.mysteryModal.addEventListener('click', () => this.mysteryModal.classList.add('hidden'));
    // Save
    this.btnSave.addEventListener('click', () => {
      const copy = { ...this.state };
      delete copy.featureMgr;
      delete copy.buildingManager;
      delete copy.skillManager;
      prompt('Copy save code:', btoa(JSON.stringify(copy)));
    });
    // Load
    this.btnLoad.addEventListener('click', () => {
      const code = prompt('Paste save code:');
      try {
        Object.assign(this.state, JSON.parse(atob(code)));
        EventBus.emit('gameReset');
        this.showNotification('Игра загружена');
      } catch {
        this.showNotification('Неверный код сохранения');
      }
    });
    
    // УЛЬТИМАТИВНЫЙ RESET - полный сброс всего
    this.btnReset.addEventListener('click', () => {
      if (confirm('🔥 ПОЛНЫЙ СБРОС ИГРЫ 🔥\n\nЭто удалит ВСЕ данные навсегда!\nВы уверены?')) {
        if (confirm('⚠️ ПОСЛЕДНЕЕ ПРЕДУПРЕЖДЕНИЕ ⚠️\n\nВесь прогресс будет потерян!\nПродолжить сброс?')) {
          this.performUltimateReset();
        }
      }
    });
  }

  // Ультимативная функция сброса
  performUltimateReset() {
    try {
      console.log('🔥 Начинаем ультимативный сброс...');
      
      // 1. Показываем уведомление
      this.showNotification('🔥 СБРОС ИГРЫ - Удаляем все данные...');
      
      // 2. Останавливаем ВСЕ интервалы в игре
      this.stopAllIntervals();
      
      // 3. Очищаем EventBus полностью
      if (EventBus && EventBus._handlers) {
        EventBus._handlers = {};
      }
      
      // 4. ПОЛНАЯ очистка localStorage - все возможные способы
      this.clearAllStorage();
      
      // 5. Сбрасываем состояние в памяти
      this.resetInMemoryState();
      
      // 6. Принудительная перезагрузка через несколько способов
      setTimeout(() => {
        this.showNotification('🔄 Перезагрузка страницы...');
        
        // Попробуем несколько способов перезагрузки
        this.forcePageReload();
        
      }, 1500);
      
    } catch (error) {
      console.error('Ошибка при сбросе:', error);
      // Если что-то пошло не так - принудительная перезагрузка
      this.forcePageReload();
    }
  }

  // Останавливаем все возможные интервалы
  stopAllIntervals() {
    try {
      // Останавливаем интервалы менеджеров
      if (this.state.buildingManager) {
        this.state.buildingManager.stopAllProduction();
      }
      if (this.state.skillManager) {
        this.state.skillManager.stopAllGeneration();
      }
      if (this.state.featureMgr && this.state.featureMgr.buffIntervals) {
        Object.values(this.state.featureMgr.buffIntervals).forEach(interval => {
          if (interval) clearInterval(interval);
        });
      }
      
      // Очищаем все возможные интервалы в window
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      console.log('✅ Все интервалы остановлены');
    } catch (error) {
      console.warn('Предупреждение при остановке интервалов:', error);
    }
  }

  // Максимально агрессивная очистка storage
  clearAllStorage() {
    try {
      // 1. Удаляем конкретный ключ игры
      localStorage.removeItem('gameState');
      
      // 2. Удаляем все возможные ключи, связанные с игрой
      const possibleKeys = [
        'gameState', 'game-state', 'advanced-clicker', 'clicker-game',
        'buildings', 'skills', 'resources', 'combo', 'achievements'
      ];
      
      possibleKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // 3. ПОЛНАЯ очистка localStorage (ЯДЕРНЫЙ ВАРИАНТ)
      localStorage.clear();
      sessionStorage.clear();
      
      // 4. Очистка IndexedDB если есть
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('gameData');
      }
      
      // 5. Очистка cookies связанных с игрой
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      console.log('🗑️ Все хранилища очищены');
    } catch (error) {
      console.warn('Предупреждение при очистке storage:', error);
    }
  }

  // Сброс состояния в памяти
  resetInMemoryState() {
    try {
      // Обнуляем состояние
      if (this.state) {
        Object.keys(this.state).forEach(key => {
          delete this.state[key];
        });
      }
      
      // Удаляем глобальные переменные если есть
      if (window.gameState) delete window.gameState;
      if (window.state) delete window.state;
      
      console.log('🧠 Состояние в памяти сброшено');
    } catch (error) {
      console.warn('Предупреждение при сбросе состояния:', error);
    }
  }

  // Принудительная перезагрузка страницы
  forcePageReload() {
    try {
      // Способ 1: Стандартная перезагрузка с очисткой кеша
      if (window.location && window.location.reload) {
        window.location.reload(true);
        return;
      }
      
      // Способ 2: Перенаправление на ту же страницу
      if (window.location && window.location.href) {
        window.location.href = window.location.href;
        return;
      }
      
      // Способ 3: Замена текущей страницы
      if (window.location && window.location.replace) {
        window.location.replace(window.location.href);
        return;
      }
      
      // Способ 4: Полная перезагрузка
      if (window.location) {
        window.location = window.location;
        return;
      }
      
    } catch (error) {
      console.error('Не удалось перезагрузить страницу:', error);
      
      // Крайний случай - показываем инструкцию пользователю
      alert('❌ Автоматическая перезагрузка не удалась.\n\n🔄 Пожалуйста, перезагрузите страницу вручную (F5 или Ctrl+R)');
    }
  }

  // Создание индикаторов эффектов
  createEffectIndicators() {
    // Создаем контейнер для индикаторов если его нет
    if (!document.getElementById('effect-indicators')) {
      const indicatorContainer = document.createElement('div');
      indicatorContainer.id = 'effect-indicators';
      indicatorContainer.className = 'effect-indicators';
      document.body.appendChild(indicatorContainer);
    }
  }

  // Обновление индикаторов эффектов
  updateEffectIndicators() {
    const container = document.getElementById('effect-indicators');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Показываем активные баффы
    if (this.state.buffs && this.state.buffs.length > 0) {
      this.state.buffs.forEach(buffId => {
        const buffDef = BUFF_DEFS.find(b => b.id === buffId);
        if (buffDef) {
          const indicator = document.createElement('div');
          indicator.className = 'effect-indicator buff-indicator';
          indicator.innerHTML = `
            <span class="effect-icon">${buffDef.name.split(' ')[0]}</span>
            <span class="effect-name">${buffDef.name}</span>
          `;
          indicator.title = buffDef.description;
          container.appendChild(indicator);
        }
      });
    }
    
    // Показываем активные дебаффы
    if (this.state.debuffs && this.state.debuffs.length > 0) {
      this.state.debuffs.forEach(debuffId => {
        const debuffDef = DEBUFF_DEFS.find(d => d.id === debuffId);
        if (debuffDef) {
          const indicator = document.createElement('div');
          indicator.className = 'effect-indicator debuff-indicator';
          indicator.innerHTML = `
            <span class="effect-icon">${debuffDef.name.split(' ')[0]}</span>
            <span class="effect-name">${debuffDef.name}</span>
          `;
          indicator.title = debuffDef.description;
          container.appendChild(indicator);
        }
      });
    }
  }

  bindEvents() {
    EventBus.subscribe('resourceChanged',   () => this.updateResources());
    EventBus.subscribe('comboChanged',      () => this.updateResources());
    EventBus.subscribe('skillPointsChanged',() => this.updateResources());
    EventBus.subscribe('buffApplied',       id => {
      this.showNotification(`✨ Buff: ${id}`);
      this.updateEffectIndicators();
    });
    EventBus.subscribe('debuffApplied',     id => {
      this.showNotification(`💀 Debuff: ${id}`);
      this.updateEffectIndicators();
    });
    EventBus.subscribe('buffExpired',       id => {
      this.showNotification(`⏰ Buff expired: ${id}`);
      this.updateEffectIndicators();
    });
    EventBus.subscribe('debuffExpired',     id => {
      this.showNotification(`⏰ Debuff expired: ${id}`);
      this.updateEffectIndicators();
    });
    EventBus.subscribe('mysteryBox',        opts => this.showMysteryModal(opts));
    
    EventBus.subscribe('buildingBought', () => {
      if (this.currentPanel === 'buildings') {
        this.showBuildings();
      }
    });
    
    EventBus.subscribe('skillBought', () => {
      if (this.currentPanel === 'skills') {
        this.showSkills();
      }
    });
  
    EventBus.subscribe('resourceBought', () => {
      if (this.currentPanel === 'market') {
        this.showMarket();
      }
    });
  
    // НОВЫЕ события для навыков
    EventBus.subscribe('criticalHit', (data) => {
      this.showSkillNotification('💥 Critical Strike!', `Double damage: ${data.damage} gold`);
    });
  
    EventBus.subscribe('bonusResourceFound', (data) => {
      this.showSkillNotification('🔍 Resource Found!', `+${data.amount} ${data.resource}`);
    });
  
    EventBus.subscribe('missProtectionUsed', () => {
      this.showSkillNotification('🎯 Steady Hand!', 'Combo protected from miss');
    });

    // НОВЫЕ события для эффектов
    EventBus.subscribe('starPowerUsed', (data) => {
      this.showSkillNotification('⭐ Star Power!', `+${data.amount} ${data.resource} (${data.remaining} left)`);
    });

    EventBus.subscribe('slotMachineWin', (data) => {
      this.showSkillNotification('🎰 Slot Win!', `+${data.amount} ${data.resource}`);
    });

    EventBus.subscribe('shieldBlock', (data) => {
      this.showSkillNotification('🛡️ Shield Block!', `Blocked ${data.debuff} (${data.remaining} left)`);
    });

    EventBus.subscribe('taxCollected', (data) => {
      this.showNotification(`💸 Tax Collector: -${data.percent}% all resources`);
    });

    EventBus.subscribe('heavyClickProgress', (data) => {
      this.showNotification(`⚖️ Heavy Click: ${data.current}/${data.required}`);
    });

    EventBus.subscribe('ghostClick', () => {
      this.showNotification('👻 Ghost Click: Ignored!');
    });
  }
  
  // Новый метод для уведомлений о навыках
  showSkillNotification(title, description) {
    const div = document.createElement('div');
    div.className = 'notification skill-notification';
    div.innerHTML = `
      <div class="skill-notification-title">${title}</div>
      <div class="skill-notification-desc">${description}</div>
    `;
    this.notifications.appendChild(div);
    setTimeout(() => div.remove(), 4000);
  }

  updateResources() {
    // Сброс
    this.resourcesLeft.innerHTML  = '';
    this.resourcesRight.innerHTML = '';
    // Основные
    ['gold','wood','stone','food','water','iron'].forEach(key => {
      const val = this.state.resources[key] || 0;
      this.resourcesLeft.appendChild(this.createResourceElem(key, val));
      this.resourcesLeft.appendChild(document.createElement('br'));
    });
    // Остальные
    Object.keys(this.state.resources)
      .filter(key => !['gold','wood','stone','food','water','iron'].includes(key))
      .forEach(key => {
        const val = this.state.resources[key];
        this.resourcesRight.appendChild(this.createResourceElem(key, val));
        this.resourcesRight.appendChild(document.createElement('br'));
      });
    // Комбо
    const combo = document.createElement('div');
    combo.textContent = `Комбо: ${this.state.combo.count}`;
    this.resourcesRight.appendChild(combo);
    // Skill Points отображаются как целое число
    const sp = document.createElement('div');
    sp.textContent = `Skill Points: ${Math.floor(this.state.skillPoints || 0)}`;
    this.resourcesRight.appendChild(sp);

    // Обновляем индикаторы эффектов
    this.updateEffectIndicators();
  }

  createResourceElem(key, val) {
    const span = document.createElement('span');
    span.textContent = `${this.getEmoji(key)} ${Number(val).toFixed(1)}`;
    span.addEventListener('mouseenter', e => this.showTooltip(e, key));
    span.addEventListener('mouseleave',  () => this.hideTooltip());
    return span;
  }

  getEmoji(res) {
    return {
      gold: '🪙', wood: '🌲', stone: '🪨', food: '🍎',
      water: '💧', iron: '⛓️', people: '👥', energy: '⚡',
      science: '🔬', faith: '🙏', chaos: '🌪️', skillPoints: '✨'
    }[res] || res;
  }

  showTooltip(e, key) {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);
    }
    this.tooltip.textContent = key;
    this.tooltip.style.top     = `${e.pageY + 10}px`;
    this.tooltip.style.left    = `${e.pageX + 10}px`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.style.display = 'none';
  }

  // НОВОЕ: Меню информации вместо модалки
  showInfo() {
    this.currentPanel = 'info';
    this.panel.innerHTML = '<h2>📚 Информация об эффектах</h2>';
    
    // Секция баффов
    const buffsSection = document.createElement('div');
    buffsSection.className = 'category-section';
    buffsSection.innerHTML = '<h3>✨ Баффы (Положительные эффекты)</h3>';
    
    BUFF_DEFS.forEach(buff => {
      const buffCard = document.createElement('div');
      buffCard.className = 'item-card buff-card';
      buffCard.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${buff.name.split(' ')[0]}</span>
          <span class="item-name">${buff.name}</span>
          <span class="item-level rarity-${buff.rarity}">${buff.rarity}</span>
        </div>
        <div class="item-description">${buff.description}</div>
        <div class="item-details">
          ${buff.duration ? `<div>⏱️ Длительность: ${buff.duration} секунд</div>` : '<div>⚡ Мгновенный эффект</div>'}
        </div>
      `;
      buffsSection.appendChild(buffCard);
    });
    
    // Секция дебаффов
    const debuffsSection = document.createElement('div');
    debuffsSection.className = 'category-section';
    debuffsSection.innerHTML = '<h3>💀 Дебаффы (Отрицательные эффекты)</h3>';
    
    DEBUFF_DEFS.forEach(debuff => {
      const debuffCard = document.createElement('div');
      debuffCard.className = 'item-card debuff-card';
      debuffCard.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${debuff.name.split(' ')[0]}</span>
          <span class="item-name">${debuff.name}</span>
          <span class="item-level severity-${debuff.severity}">${debuff.severity}</span>
        </div>
        <div class="item-description">${debuff.description}</div>
        <div class="item-details">
          ${debuff.duration ? `<div>⏱️ Длительность: ${debuff.duration} секунд</div>` : '<div>⚡ Мгновенный эффект</div>'}
        </div>
      `;
      debuffsSection.appendChild(debuffCard);
    });

    // Секция общих правил
    const rulesSection = document.createElement('div');
    rulesSection.className = 'category-section';
    rulesSection.innerHTML = `
      <h3>⚖️ Правила получения эффектов</h3>
      <div class="item-card rules-card">
        <div class="item-description">
          <p><strong>Базовый шанс:</strong> 10% на каждый клик получить эффект</p>
          <p><strong>Влияние ресурсов:</strong></p>
          <ul>
            <li>🙏 <strong>Faith</strong> увеличивает шанс баффов</li>
            <li>🌪️ <strong>Chaos</strong> увеличивает шанс дебаффов</li>
          </ul>
          <p><strong>Модификаторы:</strong></p>
          <ul>
            <li>💎 <strong>Lucky Zone</strong> бафф: +25% к шансу баффов</li>
            <li>🍀 <strong>Lucky Charm</strong> навык: увеличивает шанс баффов</li>
            <li>🛡️ <strong>Shield</strong> бафф: блокирует следующие 3 дебаффа</li>
          </ul>
        </div>
      </div>
    `;

    this.panel.appendChild(buffsSection);
    this.panel.appendChild(debuffsSection);
    this.panel.appendChild(rulesSection);
    this.panel.classList.remove('hidden');
  }

  // Новая функция: Маркет
  showMarket() {
    this.currentPanel = 'market';
    this.panel.innerHTML = '<h2>🛒 Маркет</h2>';
    
    const description = document.createElement('div');
    description.style.textAlign = 'center';
    description.style.marginBottom = '2rem';
    description.style.fontSize = '1.1rem';
    description.style.color = '#666';
    description.innerHTML = `
      <p>💰 Цена за 1 единицу любого ресурса: <strong>2000 золота</strong></p>
      <p>Нажмите на ресурс для мгновенной покупки</p>
    `;
    this.panel.appendChild(description);

    const marketSection = document.createElement('div');
    marketSection.className = 'category-section';
    marketSection.innerHTML = '<h3>🏪 Доступные ресурсы</h3>';

    // Список ресурсов для покупки
    const marketResources = ['wood', 'stone', 'food', 'water', 'iron'];
    const resourcesGrid = document.createElement('div');
    resourcesGrid.style.display = 'grid';
    resourcesGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    resourcesGrid.style.gap = '1rem';

    marketResources.forEach(resource => {
      const resourceCard = this.createMarketResourceCard(resource);
      resourcesGrid.appendChild(resourceCard);
    });

    marketSection.appendChild(resourcesGrid);
    this.panel.appendChild(marketSection);
    this.panel.classList.remove('hidden');
  }

  createMarketResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'item-card market-card';
    
    const currentGold = this.state.resources.gold || 0;
    const canAfford = currentGold >= 2000;
    
    card.innerHTML = `
      <div class="item-header">
        <span class="item-icon">${this.getEmoji(resource)}</span>
        <span class="item-name">${resource.charAt(0).toUpperCase() + resource.slice(1)}</span>
      </div>
      <div class="item-description">
        Купить 1 единицу ${resource}
      </div>
      <div class="item-footer">
        <span class="price">Цена: 2000 🪙</span>
        <button class="buy-button ${canAfford ? '' : 'disabled'}" 
                ${canAfford ? '' : 'disabled'}>
          Купить
        </button>
      </div>
    `;

    const buyButton = card.querySelector('.buy-button');
    buyButton.addEventListener('click', () => {
      if (this.buyResource(resource)) {
        this.showNotification(`Куплено: +1 ${resource}`);
        this.showMarket(); // Обновляем панель
      } else {
        this.showNotification('Недостаточно золота!');
      }
    });

    return card;
  }

  buyResource(resource) {
    const cost = 2000;
    if (this.state.resources.gold >= cost) {
      this.state.resources.gold -= cost;
      this.state.resources[resource] += 1;
      EventBus.emit('resourceChanged');
      EventBus.emit('resourceBought', { resource, cost });
      return true;
    }
    return false;
  }

  showBuildings() {
    this.currentPanel = 'buildings';
    this.panel.innerHTML = '<h2>🏗️ Строения</h2>';
    
    // Группируем здания по категориям
    const categories = {};
    BUILDING_DEFS.forEach(def => {
      if (!categories[def.category]) {
        categories[def.category] = [];
      }
      categories[def.category].push(def);
    });

    Object.entries(categories).forEach(([category, buildings]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category-section';
      categoryDiv.innerHTML = `<h3>${this.getCategoryName(category)}</h3>`;
      
      buildings.forEach(def => {
        const buildingInfo = this.state.buildingManager.getBuildingInfo(def.id);
        if (!buildingInfo) return;
        
        const buildingCard = this.createBuildingCard(def, buildingInfo);
        categoryDiv.appendChild(buildingCard);
      });
      
      this.panel.appendChild(categoryDiv);
    });
    
    this.panel.classList.remove('hidden');
  }

  createBuildingCard(def, buildingInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = `
      <span class="item-icon">${def.img}</span>
      <span class="item-name">${def.name}</span>
      <span class="item-level">Уровень: ${buildingInfo.currentLevel}/${def.maxLevel}</span>
    `;
    
    const description = document.createElement('div');
    description.className = 'item-description';
    description.textContent = def.description;
    
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (buildingInfo.productionRate) {
      details.innerHTML += `<div>📈 Производство: ${buildingInfo.productionRate}</div>`;
    }
    
    if (def.special) {
      details.innerHTML += `<div>✨ Особое: ${def.special.description || 'Специальный эффект'}</div>`;
    }
    
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (buildingInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 МАКСИМАЛЬНЫЙ УРОВЕНЬ</span>';
    } else {
      const priceText = Object.entries(buildingInfo.nextPrice)
        .map(([r, a]) => `${a} ${this.getEmoji(r)}`)
        .join(' ');
      
      footer.innerHTML = `
        <span class="price">Цена: ${priceText}</span>
        <button class="buy-button ${buildingInfo.canAfford ? '' : 'disabled'}" 
                ${buildingInfo.canAfford ? '' : 'disabled'}>
          Улучшить
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      buyButton.addEventListener('click', () => {
        if (this.state.buildingManager.buyBuilding(def.id)) {
          this.showNotification(`${def.name} улучшен!`);
          this.showBuildings();
        } else {
          this.showNotification('Недостаточно ресурсов');
        }
      });
    }
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
  }

  showSkills() {
    this.currentPanel = 'skills';
    this.panel.innerHTML = '<h2>🎯 Навыки</h2>';
    
    // Группируем навыки по категориям
    const categories = {};
    SKILL_DEFS.forEach(def => {
      if (!categories[def.category]) {
        categories[def.category] = [];
      }
      categories[def.category].push(def);
    });

    Object.entries(categories).forEach(([category, skills]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category-section';
      categoryDiv.innerHTML = `<h3>${SKILL_CATEGORIES[category]}</h3>`;
      
      skills.forEach(def => {
        const skillInfo = this.state.skillManager.getSkillInfo(def.id);
        if (!skillInfo) return;
        
        const skillCard = this.createSkillCard(def, skillInfo);
        categoryDiv.appendChild(skillCard);
      });
      
      this.panel.appendChild(categoryDiv);
    });
    
    this.panel.classList.remove('hidden');
  }

  createSkillCard(def, skillInfo) {
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const header = document.createElement('div');
    header.className = 'item-header';
    header.innerHTML = `
      <span class="item-icon">${def.icon}</span>
      <span class="item-name">${def.name}</span>
      <span class="item-level">Уровень: ${skillInfo.currentLevel}/${def.maxLevel}</span>
    `;
    
    const description = document.createElement('div');
    description.className = 'item-description';
    description.textContent = def.description;
    
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (skillInfo.currentLevel > 0) {
      const currentEffect = (skillInfo.currentEffect * 100).toFixed(1);
      details.innerHTML += `<div>💪 Текущий эффект: ${currentEffect}%</div>`;
    }
    
    const effectType = this.getEffectTypeDescription(def.effect.type);
    details.innerHTML += `<div>🎯 Тип: ${effectType}</div>`;
    
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (skillInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 МАКСИМАЛЬНЫЙ УРОВЕНЬ</span>';
    } else {
      footer.innerHTML = `
        <span class="price">Цена: ${skillInfo.nextCost} ✨ SP</span>
        <button class="buy-button ${skillInfo.canAfford ? '' : 'disabled'}" 
                ${skillInfo.canAfford ? '' : 'disabled'}>
          Изучить
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      buyButton.addEventListener('click', () => {
        if (this.state.skillManager.buySkill(def.id)) {
          this.showNotification(`${def.name} изучен!`);
          this.showSkills();
        } else {
          this.showNotification('Недостаточно Skill Points');
        }
      });
    }
    
    card.appendChild(header);
    card.appendChild(description);
    card.appendChild(details);
    card.appendChild(footer);
    
    return card;
  }

  getCategoryName(category) {
    const names = {
      'production': '🏭 Производство',
      'population': '👥 Население', 
      'advanced': '🔬 Продвинутые',
      'special': '✨ Особые'
    };
    return names[category] || category;
  }

  getEffectTypeDescription(type) {
    const types = {
      'multiplier': 'Множитель',
      'chance': 'Шанс',
      'generation': 'Генерация',
      'reduction': 'Снижение',
      'duration': 'Длительность',
      'automation': 'Автоматизация',
      'protection': 'Защита',
      'charges': 'Заряды',
      'preview': 'Предпросмотр'
    };
    return types[type] || type;
  }

  hidePanel() {
    this.currentPanel = null;
    this.panel.classList.add('hidden');
  }

  showMysteryModal(opts) {
    this.mysteryModal.innerHTML = '<h3>📦 Mystery Box</h3><p>Выберите награду:</p>';
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5 ${r}`;
      btn.style.margin = '5px';
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        this.mysteryModal.classList.add('hidden');
        this.showNotification(`Получено: +5 ${r}`);
      });
      this.mysteryModal.appendChild(btn);
      this.mysteryModal.appendChild(document.createElement('br'));
    });
    this.mysteryModal.classList.remove('hidden');
  }

  showNotification(msg) {
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = msg;
    this.notifications.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }
}