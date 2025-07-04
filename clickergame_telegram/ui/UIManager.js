// ui/UIManager.js - ОБНОВЛЕНО: добавлена поддержка системы рейдов
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
        this.raidPanel = new RaidPanel(gameState); // НОВОЕ: панель рейдов
        
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
        
        console.log('🖥️ UIManager initialized with raid support');
    }

    initializeElements() {
        // Основные кнопки навигации
        this.btnBuildings = document.getElementById('toggle-buildings');
        this.btnSkills = document.getElementById('toggle-skills');
        this.btnRaids = document.getElementById('toggle-raids'); // НОВОЕ: кнопка рейдов
        this.btnMarket = document.getElementById('toggle-market');
        this.btnInfo = document.getElementById('info-button');
        
        // Панель контента
        this.panel = document.getElementById('panel-container');
        
        // Кнопки управления сохранением
        this.btnLoad = document.getElementById('load-button');
        this.btnSave = document.getElementById('save-button');
        this.btnReset = document.getElementById('reset-button');
        
        // Контейнеры для сетки
        this.basicResources = document.getElementById('basic-resources');
        this.advancedResources = document.getElementById('advanced-resources');
        this.specialResources = document.getElementById('special-resources');
        
        this.validateElements();
    }

    validateElements() {
        const requiredElements = [
            'btnBuildings', 'btnSkills', 'btnMarket', 'btnInfo',
            'panel', 'btnLoad', 'btnSave', 'btnReset'
        ];
        
        // ОБНОВЛЕНО: btnRaids не обязательна (может быть скрыта до разблокировки)
        const missingElements = requiredElements.filter(elementName => !this[elementName]);
        
        if (missingElements.length > 0) {
            console.error('Missing UI elements:', missingElements);
            throw new Error(`Missing required UI elements: ${missingElements.join(', ')}`);
        }
        
        // Предупреждаем о недостающих контейнерах ресурсов
        if (!this.basicResources || !this.advancedResources || !this.specialResources) {
            console.warn('⚠️ Some resource containers not found - resource display may not work properly');
        }
        
        // НОВОЕ: Проверяем кнопку рейдов
        if (!this.btnRaids) {
            console.warn('⚠️ Raids button not found - creating it dynamically');
            this.createRaidsButton();
        }
        
        console.log('✅ All required UI elements found');
    }

    // НОВОЕ: Создать кнопку рейдов динамически
    createRaidsButton() {
        const topNav = document.getElementById('ui-top');
        if (!topNav) return;
        
        // Ищем кнопку Skills чтобы вставить рейды после неё
        const skillsButton = document.getElementById('toggle-skills');
        
        const raidsButton = document.createElement('button');
        raidsButton.id = 'toggle-raids';
        raidsButton.textContent = '⚔️ Raids';
        raidsButton.style.display = 'none'; // Скрываем до разблокировки
        
        if (skillsButton && skillsButton.nextSibling) {
            topNav.insertBefore(raidsButton, skillsButton.nextSibling);
        } else {
            topNav.appendChild(raidsButton);
        }
        
        this.btnRaids = raidsButton;
        console.log('✅ Raids button created dynamically');
    }

    bindControls() {
        // Кнопки навигации
        this.addEventListener(this.btnBuildings, 'click', () => {
            this.togglePanel('buildings');
        });
        
        this.addEventListener(this.btnSkills, 'click', () => {
            this.togglePanel('skills');
        });
        
        // НОВОЕ: Обработчик для кнопки рейдов
        if (this.btnRaids) {
            this.addEventListener(this.btnRaids, 'click', () => {
                this.togglePanel('raids');
            });
        }
        
        this.addEventListener(this.btnMarket, 'click', () => {
            this.togglePanel('market');
        });
        
        this.addEventListener(this.btnInfo, 'click', () => {
            this.togglePanel('info');
        });
        
        // Обработчики Save/Load/Reset
        this.addEventListener(this.btnSave, 'click', () => {
            this.saveLoadManager.performSave();
        });
        
        this.addEventListener(this.btnLoad, 'click', () => {
            this.saveLoadManager.performLoad();
        });
        
        this.addEventListener(this.btnReset, 'click', () => {
            this.saveLoadManager.performReset();
        });
        
        console.log('✅ UI controls bound with raids support');
    }

    bindEvents() {
        // Ограничение частоты уведомлений
        let lastEnergyNotification = 0;
        let lastSkillNotification = 0;
        let lastSpecialNotification = 0;
        let lastRaidNotification = 0; // НОВОЕ: для рейдов
        const energyNotificationCooldown = 3000;
        const skillNotificationCooldown = 1000;
        const specialNotificationCooldown = 500;
        const raidNotificationCooldown = 2000; // НОВОЕ

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

        // НОВОЕ: События рейдов
        eventBus.subscribe('raid:started', (data) => {
            const now = Date.now();
            if (now - lastRaidNotification > raidNotificationCooldown) {
                this.notificationManager.show(`⚔️ ${data.raid?.name || 'Raid'} started!`);
                lastRaidNotification = now;
            }
            
            // Обновляем панель если рейды открыты
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
            
            // Обновляем панель если рейды открыты
            if (this.currentPanel === 'raids') {
                this.showPanel('raids');
            }
        });
        
        eventBus.subscribe('raid:system_unlocked', () => {
            this.showRaidsButton();
            this.notificationManager.showSuccess('⚔️ Raid system unlocked!');
        });

        // НОВОЕ: События зданий для проверки разблокировки рейдов
        eventBus.subscribe(GameEvents.BUILDING_BOUGHT, (data) => {
            if (data.buildingId === 'watchTower') {
                this.showRaidsButton();
            }
            
            if (this.currentPanel === 'buildings') {
                this.showPanel('buildings');
            }
        });
        
        // События энергии с ограничением
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
        
        // События навыков с ограничением частоты
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
        
        // События зданий и маркета
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
        
        // Специальные события с ограничением частоты
        eventBus.subscribe(GameEvents.STAR_POWER_USED, (data) => {
            const now = Date.now();
            if (now - lastSpecialNotification > specialNotificationCooldown) {
                const resource = data.resource || 'Unknown';
                const amount = data.amount || 0;
                const remaining = data.remaining || 0;
                this.notificationManager.show(`⭐ Star Power: +${amount} ${resource} (${remaining} left)`);
                lastSpecialNotification = now;
            }
        });
        
        eventBus.subscribe(GameEvents.SLOT_MACHINE_WIN, (data) => {
            const now = Date.now();
            if (now - lastSpecialNotification > specialNotificationCooldown) {
                const resource = data.resource || 'Unknown';
                const amount = data.amount || 0;
                this.notificationManager.show(`🎰 Slot Win: +${amount} ${resource}`);
                lastSpecialNotification = now;
            }
        });
        
        eventBus.subscribe(GameEvents.GHOST_CLICK, () => {
            const now = Date.now();
            if (now - lastSpecialNotification > specialNotificationCooldown) {
                this.notificationManager.show('👻 Ghost Click: Ignored!');
                lastSpecialNotification = now;
            }
        });
        
        console.log('✅ UI events bound with raid support');
    }

    // НОВОЕ: Показать кнопку рейдов
    showRaidsButton() {
        if (this.btnRaids) {
            this.btnRaids.style.display = '';
            console.log('⚔️ Raids button shown');
        }
    }

    // НОВОЕ: Скрыть кнопку рейдов
    hideRaidsButton() {
        if (this.btnRaids) {
            this.btnRaids.style.display = 'none';
            console.log('⚔️ Raids button hidden');
        }
    }

    togglePanel(panelType) {
        if (this.currentPanel === panelType) {
            this.hidePanel();
        } else {
            this.showPanel(panelType);
        }
    }

    showPanel(panelType) {
        this.currentPanel = panelType;
        
        try {
            switch (panelType) {
                case 'buildings':
                    this.panelManager.showBuildings(this.panel);
                    break;
                case 'skills':
                    this.panelManager.showSkills(this.panel);
                    break;
                case 'raids': // НОВОЕ: панель рейдов
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
            console.log(`📱 Showing panel: ${panelType}`);
            
        } catch (error) {
            console.error(`❌ Error showing ${panelType} panel:`, error);
            this.notificationManager.showError(`Error loading ${panelType} panel`);
        }
    }

    // НОВОЕ: Показать панель рейдов
    showRaidsPanel() {
        try {
            // Добавляем стили для рейдов
            this.raidPanel.addRaidStyles();
            
            // Создаем панель рейдов
            this.raidPanel.createRaidPanel(this.panel);
            
        } catch (error) {
            console.error('❌ Error showing raids panel:', error);
            this.notificationManager.showError('Error loading raids panel');
            
            // Fallback - показываем простое сообщение
            this.panel.innerHTML = `
                <h2>⚔️ Raid System</h2>
                <p>❌ Error loading raid system. Please try again.</p>
                <p>Debug info: ${error.message}</p>
            `;
        }
    }

    hidePanel() {
        this.currentPanel = null;
        this.panel.classList.add('hidden');
        this.panel.innerHTML = '';
        
        // НОВОЕ: Останавливаем обновления рейдов
        if (this.raidPanel) {
            this.raidPanel.stopStatusUpdate();
        }
        
        console.log('📱 Panel hidden');
    }
    
    updateDisplay() {
        if (!this.isActive()) return;
        
        try {
            this.resourceDisplay.update();
            this.effectIndicators.update();
            
            // НОВОЕ: Проверяем видимость кнопки рейдов
            this.updateRaidsButtonVisibility();
            
        } catch (error) {
            console.warn('⚠️ Error updating display:', error);
        }
    }

    // НОВОЕ: Обновить видимость кнопки рейдов
    updateRaidsButtonVisibility() {
        if (!this.btnRaids) return;
        
        const isUnlocked = this.gameState.buildingManager?.isRaidSystemUnlocked() || false;
        
        if (isUnlocked && this.btnRaids.style.display === 'none') {
            this.showRaidsButton();
        } else if (!isUnlocked && this.btnRaids.style.display !== 'none') {
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
            raidsUnlocked: this.gameState.buildingManager?.isRaidSystemUnlocked() || false, // НОВОЕ
            currentRaidStatus: this.gameState.raidManager?.getCurrentRaidStatus() || { inProgress: false } // НОВОЕ
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
            
            // НОВОЕ: Обновляем панель рейдов если открыта
            if (this.currentPanel === 'raids' && this.raidPanel) {
                this.raidPanel.updatePanel();
            }
            
            // Обновляем текущую панель если открыта
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

    // Получить отладочную информацию
    getDebugInfo() {
        return {
            isActive: this.isActive(),
            currentPanel: this.currentPanel,
            hasRequiredElements: {
                buttons: !!(this.btnBuildings && this.btnSkills && this.btnMarket && this.btnInfo),
                raidsButton: !!this.btnRaids, // НОВОЕ
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
                raidPanel: !!this.raidPanel // НОВОЕ
            },
            raids: { // НОВОЕ: отладочная информация о рейдах
                systemUnlocked: this.gameState.buildingManager?.isRaidSystemUnlocked() || false,
                buttonVisible: this.btnRaids ? this.btnRaids.style.display !== 'none' : false,
                managerAvailable: !!this.gameState.raidManager,
                activeRaid: this.gameState.raidManager?.isRaidInProgress || false
            },
            stats: this.getUIStats()
        };
    }

    destroy() {
        console.log('🧹 UIManager cleanup started');
        
        // Скрываем панели и модальные окна
        this.hidePanel();
        
        if (this.modalManager) {
            this.modalManager.hideAllModals();
        }
        
        if (this.notificationManager) {
            this.notificationManager.clearAll();
        }
        
        // Вызываем родительский деструктор
        super.destroy();
        
        console.log('✅ UIManager destroyed');
    }
}