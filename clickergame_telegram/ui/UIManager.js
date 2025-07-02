// ui/UIManager.js - ИСПРАВЛЕНО: рабочие кнопки и единый стиль
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { PanelManager } from './PanelManager.js';
import { NotificationManager } from './NotificationManager.js';
import { ModalManager } from './ModalManager.js';
import { ResourceDisplay } from './ResourceDisplay.js';
import { EffectIndicators } from './EffectIndicators.js';
import { SaveLoadManager } from './SaveLoadManager.js';
import { EnergyDisplay } from './EnergyDisplay.js';
import { ComboDisplay } from './ComboDisplay.js';
import { RaidPanel } from './RaidPanel.js';

export default class UIManager extends CleanupMixin {
    constructor(gameState) {
        super();
        
        this.gameState = gameState;
        this.currentPanel = null;
        
        // Инициализируем компоненты UI
        this.panelManager = new PanelManager(gameState);
        this.notificationManager = new NotificationManager();
        this.modalManager = new ModalManager(gameState);
        this.resourceDisplay = new ResourceDisplay(gameState);
        this.effectIndicators = new EffectIndicators(gameState);
        this.saveLoadManager = new SaveLoadManager(gameState);
        this.energyDisplay = new EnergyDisplay(gameState);
        this.comboDisplay = new ComboDisplay(gameState);
        this.raidPanel = new RaidPanel(gameState);
        
        // Регистрируем компоненты для очистки
        [this.panelManager, this.notificationManager, this.modalManager, 
         this.resourceDisplay, this.effectIndicators, this.saveLoadManager,
         this.energyDisplay, this.comboDisplay, this.raidPanel].forEach(component => {
            this.cleanupManager.registerComponent(component);
        });
        
        this.initializeElements();
        this.bindControls();
        this.bindEvents();
        this.updateDisplay();
        
        console.log('🖥️ UIManager initialized with unified style');
    }

    initializeElements() {
        // Основные кнопки навигации
        this.btnBuildings = document.getElementById('toggle-buildings');
        this.btnSkills = document.getElementById('toggle-skills');
        this.btnRaids = document.getElementById('toggle-raids');
        this.btnMarket = document.getElementById('toggle-market');
        this.btnInfo = document.getElementById('info-button');
        
        // Быстрые кнопки Telegram
        this.tgBuildingsBtn = document.getElementById('tg-buildings-btn');
        this.tgSkillsBtn = document.getElementById('tg-skills-btn');
        this.tgRaidsBtn = document.getElementById('tg-raids-btn');
        this.tgMarketBtn = document.getElementById('tg-market-btn');
        
        // Панель контента
        this.panel = document.getElementById('panel-container');
        
        // Кнопки управления сохранением
        this.btnLoad = document.getElementById('load-button');
        this.btnSave = document.getElementById('save-button');
        this.btnReset = document.getElementById('reset-button');
        
        // Контейнеры для ресурсов
        this.basicResources = document.getElementById('basic-resources');
        this.advancedResources = document.getElementById('advanced-resources');
        this.specialResources = document.getElementById('special-resources');
        
        this.validateElements();
    }

    validateElements() {
        // Проверяем обязательные элементы
        const requiredElements = ['panel'];
        const missingElements = requiredElements.filter(elementName => !this[elementName]);
        
        if (missingElements.length > 0) {
            console.error('Missing UI elements:', missingElements);
            throw new Error(`Missing required UI elements: ${missingElements.join(', ')}`);
        }
        
        // Создаем недостающие кнопки если их нет
        this.ensureNavigationButtons();
        this.ensureTelegramButtons();
        
        console.log('✅ UI elements validated and created');
    }

    ensureNavigationButtons() {
        // Создаем верхнюю навигацию если её нет
        let topNav = document.getElementById('ui-top');
        if (!topNav) {
            topNav = document.createElement('div');
            topNav.id = 'ui-top';
            topNav.className = 'telegram-hidden-controls';
            document.body.insertBefore(topNav, document.body.firstChild);
        }

        // Создаем кнопки навигации
        const navButtons = [
            { id: 'toggle-buildings', text: '🏗️ Buildings', property: 'btnBuildings' },
            { id: 'toggle-skills', text: '🎯 Skills', property: 'btnSkills' },
            { id: 'toggle-raids', text: '⚔️ Raids', property: 'btnRaids', hidden: true },
            { id: 'toggle-market', text: '🛒 Market', property: 'btnMarket' },
            { id: 'info-button', text: '📚 Info', property: 'btnInfo' }
        ];

        navButtons.forEach(btn => {
            if (!this[btn.property]) {
                const button = document.createElement('button');
                button.id = btn.id;
                button.textContent = btn.text;
                if (btn.hidden) {
                    button.style.display = 'none';
                }
                topNav.appendChild(button);
                this[btn.property] = button;
            }
        });
    }

    ensureTelegramButtons() {
        // Создаем быстрые кнопки Telegram если их нет
        let quickActions = document.querySelector('.telegram-quick-actions');
        if (!quickActions) {
            quickActions = document.createElement('div');
            quickActions.className = 'telegram-quick-actions';
            document.body.appendChild(quickActions);
        }

        const tgButtons = [
            { id: 'tg-buildings-btn', text: '🏗️', property: 'tgBuildingsBtn' },
            { id: 'tg-skills-btn', text: '🎯', property: 'tgSkillsBtn' },
            { id: 'tg-raids-btn', text: '⚔️', property: 'tgRaidsBtn', hidden: true },
            { id: 'tg-market-btn', text: '🛒', property: 'tgMarketBtn' }
        ];

        tgButtons.forEach(btn => {
            if (!this[btn.property]) {
                const button = document.createElement('button');
                button.id = btn.id;
                button.className = 'tg-action-btn';
                button.textContent = btn.text;
                if (btn.hidden) {
                    button.style.display = 'none';
                }
                quickActions.appendChild(button);
                this[btn.property] = button;
            }
        });
    }

    bindControls() {
        console.log('🔗 Binding UI controls...');

        // ИСПРАВЛЕНИЕ: Привязываем обычные кнопки навигации
        if (this.btnBuildings) {
            this.addEventListener(this.btnBuildings, 'click', () => {
                console.log('🏗️ Buildings button clicked');
                this.togglePanel('buildings');
            });
        }
        
        if (this.btnSkills) {
            this.addEventListener(this.btnSkills, 'click', () => {
                console.log('🎯 Skills button clicked');
                this.togglePanel('skills');
            });
        }
        
        if (this.btnRaids) {
            this.addEventListener(this.btnRaids, 'click', () => {
                console.log('⚔️ Raids button clicked');
                this.togglePanel('raids');
            });
        }
        
        if (this.btnMarket) {
            this.addEventListener(this.btnMarket, 'click', () => {
                console.log('🛒 Market button clicked');
                this.togglePanel('market');
            });
        }
        
        if (this.btnInfo) {
            this.addEventListener(this.btnInfo, 'click', () => {
                console.log('📚 Info button clicked');
                this.togglePanel('info');
            });
        }

        // ИСПРАВЛЕНИЕ: Привязываем быстрые кнопки Telegram
        if (this.tgBuildingsBtn) {
            this.addEventListener(this.tgBuildingsBtn, 'click', () => {
                console.log('🏗️ Telegram Buildings button clicked');
                this.togglePanel('buildings');
            });
        }
        
        if (this.tgSkillsBtn) {
            this.addEventListener(this.tgSkillsBtn, 'click', () => {
                console.log('🎯 Telegram Skills button clicked');
                this.togglePanel('skills');
            });
        }
        
        if (this.tgRaidsBtn) {
            this.addEventListener(this.tgRaidsBtn, 'click', () => {
                console.log('⚔️ Telegram Raids button clicked');
                this.togglePanel('raids');
            });
        }
        
        if (this.tgMarketBtn) {
            this.addEventListener(this.tgMarketBtn, 'click', () => {
                console.log('🛒 Telegram Market button clicked');
                this.togglePanel('market');
            });
        }

        // Обработчики Save/Load/Reset
        if (this.btnSave) {
            this.addEventListener(this.btnSave, 'click', () => {
                console.log('💾 Save button clicked');
                this.saveLoadManager.performSave();
            });
        }
        
        if (this.btnLoad) {
            this.addEventListener(this.btnLoad, 'click', () => {
                console.log('📁 Load button clicked');
                this.saveLoadManager.performLoad();
            });
        }
        
        if (this.btnReset) {
            this.addEventListener(this.btnReset, 'click', () => {
                console.log('🔄 Reset button clicked');
                this.saveLoadManager.performReset();
            });
        }

        // ИСПРАВЛЕНИЕ: Добавляем обработчик закрытия панели по клику вне
        this.addEventListener(this.panel, 'click', (e) => {
            if (e.target === this.panel) {
                this.hidePanel();
            }
        });

        // ИСПРАВЛЕНИЕ: Закрытие панели по Escape
        this.addEventListener(document, 'keydown', (e) => {
            if (e.key === 'Escape' && this.currentPanel) {
                this.hidePanel();
            }
        });
        
        console.log('✅ UI controls bound successfully');
    }

    bindEvents() {
        // Ограничение частоты уведомлений
        let lastEnergyNotification = 0;
        let lastSkillNotification = 0;
        let lastRaidNotification = 0;
        const energyNotificationCooldown = 3000;
        const skillNotificationCooldown = 1000;
        const raidNotificationCooldown = 2000;

        // События ресурсов
        eventBus.subscribe(GameEvents.RESOURCE_CHANGED, () => {
            this.updateDisplay();
        });
        
        eventBus.subscribe(GameEvents.COMBO_CHANGED, () => {
            if (this.comboDisplay) {
                this.comboDisplay.forceUpdate();
            }
        });
        
        eventBus.subscribe(GameEvents.SKILL_POINTS_CHANGED, () => {
            this.updateDisplay();
        });

        // События рейдов
        eventBus.subscribe('raid:started', (data) => {
            const now = Date.now();
            if (now - lastRaidNotification > raidNotificationCooldown) {
                this.notificationManager.show(`⚔️ ${data.raid?.name || 'Raid'} started!`);
                lastRaidNotification = now;
            }
            
            if (this.currentPanel === 'raids') {
                this.showPanel('raids');
            }
        });
        
        eventBus.subscribe('raid:completed', () => {
            const now = Date.now();
            if (now - lastRaidNotification > raidNotificationCooldown) {
                this.notificationManager.showSuccess('⚔️ Raid completed!');
                lastRaidNotification = now;
            }
            
            if (this.currentPanel === 'raids') {
                this.showPanel('raids');
            }
        });
        
        eventBus.subscribe('raid:system_unlocked', () => {
            this.showRaidsButton();
            this.notificationManager.showSuccess('⚔️ Raid system unlocked!');
        });

        // События зданий для проверки разблокировки рейдов
        eventBus.subscribe(GameEvents.BUILDING_BOUGHT, (data) => {
            if (data.buildingId === 'watchTower') {
                this.showRaidsButton();
            }
            
            if (this.currentPanel === 'buildings') {
                this.showPanel('buildings');
            }
        });
        
        // События энергии
        eventBus.subscribe(GameEvents.ENERGY_CHANGED, () => {
            if (this.energyDisplay) {
                this.energyDisplay.updateFromGameState();
            }
        });
        
        eventBus.subscribe(GameEvents.ENERGY_INSUFFICIENT, (data) => {
            const now = Date.now();
            if (now - lastEnergyNotification > energyNotificationCooldown) {
                this.notificationManager.showWarning(`⚡ Need ${data.required?.toFixed(1) || 'more'} energy!`);
                lastEnergyNotification = now;
            }
        });
        
        eventBus.subscribe(GameEvents.ENERGY_CRITICAL, () => {
            const now = Date.now();
            if (now - lastEnergyNotification > energyNotificationCooldown / 2) {
                this.notificationManager.showError('⚡ Critical Energy!');
                lastEnergyNotification = now;
            }
        });
        
        // События эффектов
        eventBus.subscribe(GameEvents.BUFF_APPLIED, (data) => {
            const message = data.name ? `✨ Buff: ${data.name}` : '✨ Buff applied';
            this.notificationManager.show(message);
            this.effectIndicators.update();
        });
        
        eventBus.subscribe(GameEvents.DEBUFF_APPLIED, (data) => {
            const message = data.name ? `💀 Debuff: ${data.name}` : '💀 Debuff applied';
            this.notificationManager.show(message);
            this.effectIndicators.update();
        });
        
        eventBus.subscribe(GameEvents.BUFF_EXPIRED, () => {
            this.effectIndicators.update();
        });
        
        eventBus.subscribe(GameEvents.DEBUFF_EXPIRED, () => {
            this.effectIndicators.update();
        });
        
        // События навыков
        eventBus.subscribe(GameEvents.CRITICAL_HIT, (data) => {
            const now = Date.now();
            if (now - lastSkillNotification > skillNotificationCooldown) {
                const damage = data.damage || 'Unknown';
                this.notificationManager.showSkill('💥 Critical Strike!', `Double damage: ${damage} gold`);
                lastSkillNotification = now;
            }
        });
        
        eventBus.subscribe(GameEvents.BONUS_RESOURCE_FOUND, (data) => {
            const now = Date.now();
            if (now - lastSkillNotification > skillNotificationCooldown) {
                const amount = data.amount || 'Unknown';
                const resource = data.resource || 'Unknown';
                this.notificationManager.showSkill('🔍 Resource Found!', `+${amount} ${resource}`);
                lastSkillNotification = now;
            }
        });
        
        eventBus.subscribe(GameEvents.SHIELD_BLOCK, (data) => {
            const debuff = data.debuff || 'Unknown';
            const remaining = data.remaining || 0;
            this.notificationManager.showSkill('🛡️ Shield Block!', `Blocked ${debuff} (${remaining} left)`);
        });
        
        // События покупок
        eventBus.subscribe(GameEvents.SKILL_BOUGHT, () => {
            if (this.currentPanel === 'skills') {
                this.showPanel('skills');
            }
        });
        
        eventBus.subscribe(GameEvents.ITEM_PURCHASED, () => {
            if (this.currentPanel === 'market') {
                this.showPanel('market');
            }
        });
        
        // UI события
        eventBus.subscribe(GameEvents.NOTIFICATION, (data) => {
            this.notificationManager.show(data.message || data);
        });
        
        eventBus.subscribe(GameEvents.TEMP_MESSAGE, (data) => {
            this.notificationManager.show(data.message || data);
        });
        
        eventBus.subscribe(GameEvents.MYSTERY_BOX, (data) => {
            if (Array.isArray(data)) {
                this.modalManager.showMysteryBox(data);
            }
        });
        
        console.log('✅ UI events bound');
    }

    showRaidsButton() {
        if (this.btnRaids) {
            this.btnRaids.style.display = '';
        }
        if (this.tgRaidsBtn) {
            this.tgRaidsBtn.style.display = '';
        }
        console.log('⚔️ Raids buttons shown');
    }

    hideRaidsButton() {
        if (this.btnRaids) {
            this.btnRaids.style.display = 'none';
        }
        if (this.tgRaidsBtn) {
            this.tgRaidsBtn.style.display = 'none';
        }
        console.log('⚔️ Raids buttons hidden');
    }

    togglePanel(panelType) {
        console.log(`📱 Toggle panel: ${panelType}, current: ${this.currentPanel}`);
        
        if (this.currentPanel === panelType) {
            this.hidePanel();
        } else {
            this.showPanel(panelType);
        }
    }

    showPanel(panelType) {
        console.log(`📱 Showing panel: ${panelType}`);
        this.currentPanel = panelType;
        
        try {
            switch (panelType) {
                case 'buildings':
                    this.panelManager.showBuildings(this.panel);
                    break;
                case 'skills':
                    this.panelManager.showSkills(this.panel);
                    break;
                case 'raids':
                    this.showRaidsPanel();
                    break;
                case 'market':
                    this.panelManager.showMarket(this.panel);
                    break;
                case 'info':
                    this.panelManager.showInfo(this.panel);
                    break;
                default:
                    console.warn('Unknown panel type:', panelType);
                    return;
            }
            
            this.panel.classList.remove('hidden');
            
            // ИСПРАВЛЕНИЕ: Добавляем кнопку закрытия
            this.addCloseButton();
            
            console.log(`✅ Panel ${panelType} shown successfully`);
            
        } catch (error) {
            console.error(`❌ Error showing ${panelType} panel:`, error);
            this.notificationManager.showError(`Error loading ${panelType} panel`);
        }
    }

    addCloseButton() {
        // Удаляем старую кнопку закрытия если есть
        const existingCloseBtn = this.panel.querySelector('.panel-close-btn');
        if (existingCloseBtn) {
            existingCloseBtn.remove();
        }

        // Создаем новую кнопку закрытия
        const closeBtn = document.createElement('button');
        closeBtn.className = 'panel-close-btn';
        closeBtn.innerHTML = '❌ Close';
        closeBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1001;
            background: var(--error-color);
            color: white;
            border: none;
            border-radius: var(--border-radius);
            padding: var(--spacing-xs) var(--spacing-sm);
            font-size: 0.8rem;
            cursor: pointer;
            box-shadow: var(--shadow-medium);
        `;

        this.addEventListener(closeBtn, 'click', () => {
            this.hidePanel();
        });

        this.panel.appendChild(closeBtn);
    }

    showRaidsPanel() {
        try {
            this.raidPanel.addRaidStyles();
            this.raidPanel.createRaidPanel(this.panel);
        } catch (error) {
            console.error('❌ Error showing raids panel:', error);
            this.notificationManager.showError('Error loading raids panel');
            
            this.panel.innerHTML = `
                <h2>⚔️ Raid System</h2>
                <p>❌ Error loading raid system. Please try again.</p>
                <p>Debug info: ${error.message}</p>
            `;
        }
    }

    hidePanel() {
        console.log('📱 Hiding panel');
        this.currentPanel = null;
        this.panel.classList.add('hidden');
        this.panel.innerHTML = '';
        
        if (this.raidPanel) {
            this.raidPanel.stopStatusUpdate();
        }
    }
    
    updateDisplay() {
        if (!this.isActive()) return;
        
        try {
            this.resourceDisplay.update();
            this.effectIndicators.update();
            this.updateRaidsButtonVisibility();
        } catch (error) {
            console.warn('⚠️ Error updating display:', error);
        }
    }

    updateRaidsButtonVisibility() {
        if (!this.btnRaids && !this.tgRaidsBtn) return;
        
        const isUnlocked = this.gameState.buildingManager?.isRaidSystemUnlocked() || false;
        
        if (isUnlocked) {
            this.showRaidsButton();
        } else {
            this.hideRaidsButton();
        }
    }

    getCurrentPanel() {
        return this.currentPanel;
    }

    isPanelOpen() {
        return this.currentPanel !== null;
    }

    getUIStats() {
        return {
            currentPanel: this.currentPanel,
            activeNotifications: this.notificationManager.getActiveCount(),
            activeModals: this.modalManager.getActiveModals().length,
            hasActiveEffects: this.effectIndicators.hasActiveEffects(),
            displayStats: this.resourceDisplay.getDisplayStats(),
            energyDisplay: this.energyDisplay ? this.energyDisplay.getDisplayInfo() : null,
            comboDisplay: this.comboDisplay ? this.comboDisplay.getDisplayInfo() : null,
            raidsUnlocked: this.gameState.buildingManager?.isRaidSystemUnlocked() || false,
            currentRaidStatus: this.gameState.raidManager?.getCurrentRaidStatus() || { inProgress: false }
        };
    }

    forceUpdate() {
        console.log('🔄 Force updating UI...');
        
        try {
            this.updateDisplay();
            this.effectIndicators.update();
            
            if (this.energyDisplay) {
                this.energyDisplay.forceUpdate();
            }
            
            if (this.comboDisplay) {
                this.comboDisplay.forceUpdate();
            }
            
            if (this.currentPanel === 'raids' && this.raidPanel) {
                this.raidPanel.updatePanel();
            }
            
            if (this.currentPanel && this.currentPanel !== 'raids') {
                const currentPanel = this.currentPanel;
                this.hidePanel();
                this.showPanel(currentPanel);
            }
            
            console.log('✅ UI force update completed');
            
        } catch (error) {
            console.error('❌ Error during force update:', error);
        }
    }

    getDebugInfo() {
        return {
            isActive: this.isActive(),
            currentPanel: this.currentPanel,
            hasRequiredElements: {
                buttons: !!(this.btnBuildings && this.btnSkills && this.btnMarket && this.btnInfo),
                telegramButtons: !!(this.tgBuildingsBtn && this.tgSkillsBtn && this.tgMarketBtn),
                raidsButtons: !!(this.btnRaids && this.tgRaidsBtn),
                panel: !!this.panel,
                controls: !!(this.btnLoad && this.btnSave && this.btnReset)
            },
            components: {
                panelManager: !!this.panelManager,
                notificationManager: !!this.notificationManager,
                modalManager: !!this.modalManager,
                resourceDisplay: !!this.resourceDisplay,
                effectIndicators: !!this.effectIndicators,
                saveLoadManager: !!this.saveLoadManager,
                energyDisplay: !!this.energyDisplay,
                comboDisplay: !!this.comboDisplay,
                raidPanel: !!this.raidPanel
            },
            raids: {
                systemUnlocked: this.gameState.buildingManager?.isRaidSystemUnlocked() || false,
                buttonsVisible: this.btnRaids ? this.btnRaids.style.display !== 'none' : false,
                managerAvailable: !!this.gameState.raidManager,
                activeRaid: this.gameState.raidManager?.isRaidInProgress || false
            },
            stats: this.getUIStats()
        };
    }

    destroy() {
        console.log('🧹 UIManager cleanup started');
        
        this.hidePanel();
        
        if (this.modalManager) {
            this.modalManager.hideAllModals();
        }
        
        if (this.notificationManager) {
            this.notificationManager.clearAll();
        }
        
        super.destroy();
        
        console.log('✅ UIManager destroyed');
    }
}