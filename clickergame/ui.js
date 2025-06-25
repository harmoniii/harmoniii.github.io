// ui.js - Fixed version with working Reset and Load buttons
import { EventBus } from './eventBus.js';
import { SKILL_CATEGORIES, SKILL_DEFS, SkillManager } from './skills.js';
import { BUILDING_DEFS } from './buildings.js';
import { BUFF_DEFS, DEBUFF_DEFS } from './buffs.js';
import { MARKET_CATEGORIES } from './market.js';

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
    // Info - now separate menu instead of modal
    this.btnInfo.addEventListener('click', () => {
      this.currentPanel === 'info' ? this.hidePanel() : this.showInfo();
    });
    
    // Close modals on click
    this.infoModal.addEventListener('click',    () => this.infoModal.classList.add('hidden'));
    this.mysteryModal.addEventListener('click', () => this.mysteryModal.classList.add('hidden'));

    // COMPLETELY FIXED Save function - saves EVERYTHING
    this.btnSave.addEventListener('click', () => {
      try {
        // Create a complete copy of the state for saving
        const saveData = {
          // Core game state
          resources: { ...this.state.resources },
          combo: { ...this.state.combo },
          skillPoints: this.state.skillPoints || 0,
          targetZone: this.state.targetZone,
          
          // Buildings (levels and active status)
          buildings: {},
          
          // Skills (levels)
          skills: {},
          
          // Skill states (charges, etc)
          skillStates: { ...this.state.skillStates },
          
          // Market state
          market: { ...this.state.market },
          
          // Clear temporary effects before saving
          buffs: [],
          debuffs: [],
          blockedUntil: 0,
          effectStates: {
            starPowerClicks: 0,
            shieldBlocks: 0,
            heavyClickRequired: {},
            reverseDirection: 1,
            frozenCombo: false
          },
          
          // Metadata
          saveTimestamp: Date.now(),
          saveVersion: '0.7.2'
        };
        
        // Copy buildings data
        if (this.state.buildings) {
          Object.keys(this.state.buildings).forEach(buildingId => {
            saveData.buildings[buildingId] = { ...this.state.buildings[buildingId] };
          });
        }
        
        // Copy skills data
        if (this.state.skills) {
          Object.keys(this.state.skills).forEach(skillId => {
            saveData.skills[skillId] = { ...this.state.skills[skillId] };
          });
        }
        
        console.log('💾 Saving complete game state:', saveData);
        
        const jsonString = JSON.stringify(saveData);
        const saveCode = btoa(encodeURIComponent(jsonString));
        
        // Show code in textarea for easy copying
        const textarea = document.createElement('textarea');
        textarea.value = saveCode;
        textarea.style.position = 'fixed';
        textarea.style.top = '50%';
        textarea.style.left = '50%';
        textarea.style.transform = 'translate(-50%, -50%)';
        textarea.style.width = '80%';
        textarea.style.height = '200px';
        textarea.style.zIndex = '9999';
        textarea.style.background = 'white';
        textarea.style.border = '2px solid #333';
        textarea.style.padding = '10px';
        textarea.style.fontSize = '12px';
        textarea.readOnly = true;
        document.body.appendChild(textarea);
        textarea.select();
        
        // Auto copy to clipboard if possible
        if (navigator.clipboard) {
          navigator.clipboard.writeText(saveCode).then(() => {
            this.showNotification('💾 Save code copied to clipboard!');
          }).catch(() => {
            this.showNotification('💾 Save code ready. Copy it manually.');
          });
        } else {
          this.showNotification('💾 Save code ready. Copy it manually.');
        }
        
        // Remove textarea after 10 seconds
        setTimeout(() => {
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
          }
        }, 10000);
        
        // Can be removed by clicking outside
        textarea.addEventListener('blur', () => {
          if (document.body.contains(textarea)) {
            document.body.removeChild(textarea);
          }
        });
        
      } catch (error) {
        console.error('Save error:', error);
        this.showNotification('❌ Error saving game');
      }
    });

    // COMPLETELY FIXED Load function with proper reload
    this.btnLoad.addEventListener('click', () => {
      const code = prompt('🔄 LOAD SAVE\n\nPaste your save code:');
      if (!code || code.trim() === '') {
        this.showNotification('❌ No save code entered');
        return;
      }
      
      try {
        console.log('🔄 Starting load process...');
        
        // Try multiple decoding methods for compatibility
        let decoded;
        
        try {
          // New method (with encodeURIComponent)
          decoded = JSON.parse(decodeURIComponent(atob(code.trim())));
          console.log('✅ Decoded with new method');
        } catch (e1) {
          console.log('❌ New method failed, trying old method...');
          try {
            // Old method (without encodeURIComponent)
            decoded = JSON.parse(atob(code.trim()));
            console.log('✅ Decoded with old method');
          } catch (e2) {
            console.error('❌ Both decode methods failed:', e1, e2);
            throw new Error('Could not decode save code - format invalid');
          }
        }
        
        // Check if it looks like valid game save data
        if (!decoded || typeof decoded !== 'object' || !decoded.resources) {
          throw new Error('Invalid save data - missing required fields');
        }
        
        console.log('✅ Save data validated:', decoded);
        console.log('📊 Resources to load:', decoded.resources);
        console.log('🏠 Buildings to load:', decoded.buildings);
        console.log('🎯 Skills to load:', decoded.skills);
        
        console.log('✅ Save data validated, proceeding...');
        
        // Stop all current game processes
        try {
          if (this.state.featureMgr) this.state.featureMgr.stopAllEffects();
          if (this.state.buildingManager) this.state.buildingManager.stopAllProduction();
          if (this.state.skillManager) this.state.skillManager.stopAllGeneration();
        } catch (e) {
          console.warn('Warning stopping managers:', e);
        }
        
        // Clear ALL localStorage
        try {
          localStorage.clear();
          sessionStorage.clear();
          console.log('✅ Storage cleared');
        } catch (e) {
          console.warn('Warning clearing storage:', e);
        }
        
        // Clear temporary effects from loaded data and ensure clean state
        decoded.buffs = [];
        decoded.debuffs = [];
        decoded.blockedUntil = 0;
        decoded.effectStates = {
          starPowerClicks: 0,
          shieldBlocks: 0,
          heavyClickRequired: {},
          reverseDirection: 1,
          frozenCombo: false
        };
        
        // Ensure all required fields exist with defaults
        if (!decoded.resources) decoded.resources = {};
        if (!decoded.buildings) decoded.buildings = {};
        if (!decoded.skills) decoded.skills = {};
        if (!decoded.skillStates) decoded.skillStates = {};
        if (!decoded.market) decoded.market = {};
        if (!decoded.combo) decoded.combo = { count: 0, deadline: 0, lastZone: null, lastAngle: null };
        if (typeof decoded.skillPoints !== 'number') decoded.skillPoints = 0;
        if (typeof decoded.targetZone !== 'number') decoded.targetZone = 0;
        
        console.log('🧹 Cleaned save data ready for loading');
        
        // Save the cleaned state to localStorage
        const jsonString = JSON.stringify(decoded);
        localStorage.setItem('gameState', btoa(encodeURIComponent(jsonString)));
        console.log('✅ New save data stored');
        
        this.showNotification('✅ Save loaded! Reloading in 2 seconds...');
        console.log('🔄 Forcing page reload...');
        
        // Force hard reload
        setTimeout(() => {
          // Multiple fallback methods
          try {
            window.location.replace(window.location.href + '?reload=' + Date.now());
          } catch (e1) {
            try {
              window.location.href = window.location.href + '?reload=' + Date.now();
            } catch (e2) {
              try {
                window.location.reload(true);
              } catch (e3) {
                window.location = window.location;
              }
            }
          }
        }, 2000);
        
      } catch (error) {
        console.error('❌ Load error:', error);
        this.showNotification(`❌ Load failed: ${error.message}`);
      }
    });
    
    // NUCLEAR RESET with double confirmation
    this.btnReset.addEventListener('click', () => {
      if (confirm('🔥 COMPLETE GAME RESET 🔥\n\nThis will delete ALL data forever!\nAre you sure?')) {
        if (confirm('⚠️ FINAL WARNING ⚠️\n\nAll progress will be lost!\nContinue reset?')) {
          this.performNuclearReset();
        }
      }
    });
  }

  // NUCLEAR RESET METHOD - DESTROYS EVERYTHING
  performNuclearReset() {
    try {
      console.log('🔥🔥🔥 NUCLEAR RESET INITIATED 🔥🔥🔥');
      
      this.showNotification('🔥 NUCLEAR RESET IN PROGRESS...');
      
      // 1. Stop ALL possible game processes
      try {
        console.log('🛑 Stopping all game managers...');
        if (this.state.featureMgr) this.state.featureMgr.stopAllEffects();
        if (this.state.buildingManager) this.state.buildingManager.stopAllProduction();
        if (this.state.skillManager) this.state.skillManager.stopAllGeneration();
        if (this.state.marketManager) this.state.marketManager.stopAllEffects?.();
      } catch (e) {
        console.warn('⚠️ Error stopping managers (continuing anyway):', e);
      }
      
      // 2. NUCLEAR CLEAR - Clear EVERYTHING possible
      try {
        console.log('💥 Clearing ALL storage...');
        
        // Clear localStorage completely
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          localStorage.removeItem(key);
        }
        
        // Clear sessionStorage completely  
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          sessionStorage.removeItem(key);
        }
        
        // Extra cleanup
        localStorage.clear();
        sessionStorage.clear();
        
        console.log('✅ Storage completely cleared');
      } catch (e) {
        console.warn('⚠️ Error clearing storage (continuing anyway):', e);
      }
      
      // 3. Clear ALL timers and intervals (nuclear option)
      try {
        console.log('⏰ Clearing ALL timers and intervals...');
        
        // Get the highest timeout/interval ID and clear everything
        const maxId = setTimeout(() => {}, 0);
        for (let i = 0; i <= maxId + 1000; i++) {
          clearTimeout(i);
          clearInterval(i);
        }
        
        console.log('✅ All timers cleared');
      } catch (e) {
        console.warn('⚠️ Error clearing timers (continuing anyway):', e);
      }
      
      // 4. Reset the page URL to remove any parameters
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, baseUrl);
      } catch (e) {
        console.warn('⚠️ Error resetting URL:', e);
      }
      
      // 5. Show final message
      this.showNotification('💀 GAME COMPLETELY DESTROYED');
      this.showNotification('🔄 Reloading in 3 seconds...');
      
      console.log('🔄 Starting nuclear reload sequence...');
      
      // 6. MULTIPLE FALLBACK RELOAD METHODS
      let reloadAttempt = 0;
      
      const tryReload = () => {
        reloadAttempt++;
        console.log(`🔄 Reload attempt ${reloadAttempt}...`);
        
        try {
          // Method 1: Replace location with timestamp
          const timestamp = Date.now();
          window.location.replace(window.location.origin + window.location.pathname + '?nuclear_reset=' + timestamp);
        } catch (e1) {
          console.warn(`❌ Reload method 1 failed:`, e1);
          try {
            // Method 2: Assign new location
            window.location.assign(window.location.origin + window.location.pathname + '?reset=' + Date.now());
          } catch (e2) {
            console.warn(`❌ Reload method 2 failed:`, e2);
            try {
              // Method 3: Direct href change
              window.location.href = window.location.origin + window.location.pathname + '?hard_reset=' + Date.now();
            } catch (e3) {
              console.warn(`❌ Reload method 3 failed:`, e3);
              try {
                // Method 4: Force reload
                window.location.reload(true);
              } catch (e4) {
                console.warn(`❌ Reload method 4 failed:`, e4);
                if (reloadAttempt < 3) {
                  console.log('🔄 Retrying reload in 1 second...');
                  setTimeout(tryReload, 1000);
                } else {
                  console.error('💀 ALL RELOAD METHODS FAILED! Manual refresh required.');
                  alert('🔥 RESET COMPLETE! 🔥\n\nPlease manually refresh the page (F5 or Ctrl+R)');
                }
              }
            }
          }
        }
      };
      
      // Start reload after 3 seconds
      setTimeout(tryReload, 3000);
      
    } catch (error) {
      console.error('💀 CRITICAL ERROR in nuclear reset:', error);
      
      // Emergency fallback - direct alert and manual refresh request
      this.showNotification('💀 EMERGENCY FALLBACK ACTIVATED');
      setTimeout(() => {
        alert(`🔥 RESET COMPLETED WITH ERRORS 🔥

The game has been reset but some errors occurred.

Please manually refresh the page:
- Press F5, or
- Press Ctrl+R, or  
- Close and reopen the page

Error: ${error.message}`);
      }, 1000);
    }
  }

  // Create effect indicators
  createEffectIndicators() {
    // Create container for indicators if it doesn't exist
    if (!document.getElementById('effect-indicators')) {
      const indicatorContainer = document.createElement('div');
      indicatorContainer.id = 'effect-indicators';
      indicatorContainer.className = 'effect-indicators';
      document.body.appendChild(indicatorContainer);
    }
  }

  // Update effect indicators
  updateEffectIndicators() {
    const container = document.getElementById('effect-indicators');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Show active buffs
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
    
    // Show active debuffs
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
    
    // FIXED: handling new events with objects
    EventBus.subscribe('buffApplied', data => {
      if (typeof data === 'object' && data.name) {
        this.showNotification(`✨ Buff: ${data.name}`);
      } else {
        this.showNotification(`✨ Buff: ${data}`);
      }
      this.updateEffectIndicators();
    });
    
    EventBus.subscribe('debuffApplied', data => {
      if (typeof data === 'object' && data.name) {
        this.showNotification(`💀 Debuff: ${data.name}`);
      } else {
        this.showNotification(`💀 Debuff: ${data}`);
      }
      this.updateEffectIndicators();
    });
    
    EventBus.subscribe('buffExpired', data => {
      if (typeof data === 'object' && data.name) {
        this.showNotification(`⏰ Buff expired: ${data.name}`);
      } else {
        this.showNotification(`⏰ Buff expired: ${data}`);
      }
      this.updateEffectIndicators();
    });
    
    EventBus.subscribe('debuffExpired', data => {
      if (typeof data === 'object' && data.name) {
        this.showNotification(`⏰ Debuff expired: ${data.name}`);
      } else {
        this.showNotification(`⏰ Debuff expired: ${data}`);
      }
      this.updateEffectIndicators();
    });

    // Handle temporary notifications
    EventBus.subscribe('tempNotification', message => {
      this.showNotification(message);
    });
    
    EventBus.subscribe('mysteryBox', opts => this.showMysteryModal(opts));
    
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
  
    EventBus.subscribe('itemPurchased', () => {
      if (this.currentPanel === 'market') {
        this.showMarket();
      }
    });
  
    // NEW events for skills
    EventBus.subscribe('criticalHit', (data) => {
      this.showSkillNotification('💥 Critical Strike!', `Double damage: ${data.damage} gold`);
    });
  
    EventBus.subscribe('bonusResourceFound', (data) => {
      this.showSkillNotification('🔍 Resource Found!', `+${data.amount} ${data.resource}`);
    });
  
    EventBus.subscribe('missProtectionUsed', () => {
      this.showSkillNotification('🎯 Steady Hand!', 'Combo protected from miss');
    });

    // NEW events for effects
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
  
  // New method for skill notifications
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
    // Reset
    this.resourcesLeft.innerHTML  = '';
    this.resourcesRight.innerHTML = '';
    // Main resources
    ['gold','wood','stone','food','water','iron'].forEach(key => {
      const val = this.state.resources[key] || 0;
      this.resourcesLeft.appendChild(this.createResourceElem(key, val));
      this.resourcesLeft.appendChild(document.createElement('br'));
    });
    // Other resources
    Object.keys(this.state.resources)
      .filter(key => !['gold','wood','stone','food','water','iron'].includes(key))
      .forEach(key => {
        const val = this.state.resources[key];
        this.resourcesRight.appendChild(this.createResourceElem(key, val));
        this.resourcesRight.appendChild(document.createElement('br'));
      });
    // Combo
    const combo = document.createElement('div');
    combo.textContent = `Combo: ${this.state.combo.count}`;
    this.resourcesRight.appendChild(combo);
    // Skill Points displayed as whole number
    const sp = document.createElement('div');
    sp.textContent = `Skill Points: ${Math.floor(this.state.skillPoints || 0)}`;
    this.resourcesRight.appendChild(sp);

    // Update effect indicators
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

  // NEW: Info menu instead of modal
  showInfo() {
    this.currentPanel = 'info';
    this.panel.innerHTML = '<h2>📚 Effect Information</h2>';
    
    // Buffs section
    const buffsSection = document.createElement('div');
    buffsSection.className = 'category-section';
    buffsSection.innerHTML = '<h3>✨ Buffs (Positive Effects)</h3>';
    
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
          ${buff.duration ? `<div>⏱️ Duration: ${buff.duration} seconds</div>` : '<div>⚡ Instant effect</div>'}
        </div>
      `;
      buffsSection.appendChild(buffCard);
    });
    
    // Debuffs section
    const debuffsSection = document.createElement('div');
    debuffsSection.className = 'category-section';
    debuffsSection.innerHTML = '<h3>💀 Debuffs (Negative Effects)</h3>';
    
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
          ${debuff.duration ? `<div>⏱️ Duration: ${debuff.duration} seconds</div>` : '<div>⚡ Instant effect</div>'}
        </div>
      `;
      debuffsSection.appendChild(debuffCard);
    });

    // Rules section
    const rulesSection = document.createElement('div');
    rulesSection.className = 'category-section';
    rulesSection.innerHTML = `
      <h3>⚖️ Effect Rules</h3>
      <div class="item-card rules-card">
        <div class="item-description">
          <p><strong>Base chance:</strong> 10% per click to get an effect</p>
          <p><strong>Resource influence:</strong></p>
          <ul>
            <li>🙏 <strong>Faith</strong> increases buff chance</li>
            <li>🌪️ <strong>Chaos</strong> increases debuff chance</li>
          </ul>
          <p><strong>Modifiers:</strong></p>
          <ul>
            <li>💎 <strong>Lucky Zone</strong> buff: +25% buff chance</li>
            <li>🍀 <strong>Lucky Charm</strong> skill: increases buff chance</li>
            <li>🛡️ <strong>Shield</strong> buff: blocks next 3 debuffs</li>
          </ul>
        </div>
      </div>
    `;

    this.panel.appendChild(buffsSection);
    this.panel.appendChild(debuffsSection);
    this.panel.appendChild(rulesSection);
    this.panel.classList.remove('hidden');
  }

  // Market function
  showMarket() {
    this.currentPanel = 'market';
    this.panel.innerHTML = '<h2>🛒 Market</h2>';
    
    const description = document.createElement('div');
    description.style.textAlign = 'center';
    description.style.marginBottom = '2rem';
    description.style.fontSize = '1.1rem';
    description.style.color = '#666';
    description.innerHTML = `
      <p>💰 Trade resources and special items</p>
      <p>Reputation: <strong>${this.state.marketManager ? this.state.marketManager.getMarketReputation() : 0}</strong></p>
    `;
    this.panel.appendChild(description);

    // Get item categories
    const categories = this.state.marketManager ? 
      this.state.marketManager.getItemsByCategory() : {};

    Object.entries(categories).forEach(([categoryId, items]) => {
      const categorySection = document.createElement('div');
      categorySection.className = 'category-section';
      categorySection.innerHTML = `<h3>${MARKET_CATEGORIES[categoryId] || categoryId}</h3>`;
      
      const itemsGrid = document.createElement('div');
      itemsGrid.className = 'market-grid';
      
      items.forEach(item => {
        const itemCard = this.createMarketItemCard(item);
        itemsGrid.appendChild(itemCard);
      });
      
      categorySection.appendChild(itemsGrid);
      this.panel.appendChild(categorySection);
    });

    this.panel.classList.remove('hidden');
  }

  createMarketItemCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card market-card';
    
    card.innerHTML = `
      <div class="item-header">
        <span class="item-icon">${item.icon}</span>
        <span class="item-name">${item.name}</span>
      </div>
      <div class="item-description">${item.description}</div>
      <div class="item-details">
        <div>💰 Price: ${item.priceText}</div>
        <div>🎁 Reward: ${item.rewardText}</div>
      </div>
      <div class="item-footer">
        <button class="buy-button ${item.canAfford ? '' : 'disabled'}" 
                ${item.canAfford ? '' : 'disabled'}>
          Buy
        </button>
      </div>
    `;

    const buyButton = card.querySelector('.buy-button');
    buyButton.addEventListener('click', () => {
      if (this.state.marketManager && this.state.marketManager.buyItem(item.id)) {
        this.showNotification(`Bought: ${item.name}`);
        this.showMarket(); // Update panel
      } else {
        this.showNotification('Not enough resources!');
      }
    });

    return card;
  }

  showBuildings() {
    this.currentPanel = 'buildings';
    this.panel.innerHTML = '<h2>🏗️ Buildings</h2>';
    
    // Group buildings by categories
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
      <span class="item-level">Level: ${buildingInfo.currentLevel}/${def.maxLevel}</span>
    `;
    
    const description = document.createElement('div');
    description.className = 'item-description';
    description.textContent = def.description;
    
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (buildingInfo.productionRate) {
      details.innerHTML += `<div>📈 Production: ${buildingInfo.productionRate}</div>`;
    }
    
    if (def.special) {
      details.innerHTML += `<div>✨ Special: ${def.special.description || 'Special effect'}</div>`;
    }
    
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (buildingInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 MAX LEVEL</span>';
    } else {
      const priceText = Object.entries(buildingInfo.nextPrice)
        .map(([r, a]) => `${a} ${this.getEmoji(r)}`)
        .join(' ');
      
      footer.innerHTML = `
        <span class="price">Price: ${priceText}</span>
        <button class="buy-button ${buildingInfo.canAfford ? '' : 'disabled'}" 
                ${buildingInfo.canAfford ? '' : 'disabled'}>
          Upgrade
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      buyButton.addEventListener('click', () => {
        if (this.state.buildingManager.buyBuilding(def.id)) {
          this.showNotification(`${def.name} upgraded!`);
          this.showBuildings();
        } else {
          this.showNotification('Not enough resources');
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
    this.panel.innerHTML = '<h2>🎯 Skills</h2>';
    
    // Group skills by categories
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
      <span class="item-level">Level: ${skillInfo.currentLevel}/${def.maxLevel}</span>
    `;
    
    const description = document.createElement('div');
    description.className = 'item-description';
    description.textContent = def.description;
    
    const details = document.createElement('div');
    details.className = 'item-details';
    
    if (skillInfo.currentLevel > 0) {
      const currentEffect = (skillInfo.currentEffect * 100).toFixed(1);
      details.innerHTML += `<div>💪 Current effect: ${currentEffect}%</div>`;
    }
    
    const effectType = this.getEffectTypeDescription(def.effect.type);
    details.innerHTML += `<div>🎯 Type: ${effectType}</div>`;
    
    const footer = document.createElement('div');
    footer.className = 'item-footer';
    
    if (skillInfo.isMaxLevel) {
      footer.innerHTML = '<span class="max-level">🏆 MAX LEVEL</span>';
    } else {
      footer.innerHTML = `
        <span class="price">Price: ${skillInfo.nextCost} ✨ SP</span>
        <button class="buy-button ${skillInfo.canAfford ? '' : 'disabled'}" 
                ${skillInfo.canAfford ? '' : 'disabled'}>
          Learn
        </button>
      `;
      
      const buyButton = footer.querySelector('.buy-button');
      buyButton.addEventListener('click', () => {
        if (this.state.skillManager.buySkill(def.id)) {
          this.showNotification(`${def.name} learned!`);
          this.showSkills();
        } else {
          this.showNotification('Not enough Skill Points');
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
      'production': '🏭 Production',
      'population': '👥 Population', 
      'advanced': '🔬 Advanced',
      'special': '✨ Special'
    };
    return names[category] || category;
  }

  getEffectTypeDescription(type) {
    const types = {
      'multiplier': 'Multiplier',
      'chance': 'Chance',
      'generation': 'Generation',
      'reduction': 'Reduction',
      'duration': 'Duration',
      'automation': 'Automation',
      'protection': 'Protection',
      'charges': 'Charges',
      'preview': 'Preview'
    };
    return types[type] || type;
  }

  hidePanel() {
    this.currentPanel = null;
    this.panel.classList.add('hidden');
  }

  showMysteryModal(opts) {
    this.mysteryModal.innerHTML = '<h3>📦 Mystery Box</h3><p>Choose your reward:</p>';
    opts.forEach(r => {
      const btn = document.createElement('button');
      btn.textContent = `${this.getEmoji(r)} +5 ${r}`;
      btn.style.margin = '5px';
      btn.addEventListener('click', () => {
        this.state.resources[r] += 5;
        EventBus.emit('resourceChanged', { resource: r, amount: this.state.resources[r] });
        this.mysteryModal.classList.add('hidden');
        this.showNotification(`Received: +5 ${r}`);
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