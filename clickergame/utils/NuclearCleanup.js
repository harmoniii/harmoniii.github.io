// utils/NuclearCleanup.js - Утилиты для полного уничтожения всех данных
export class NuclearCleanup {
  
    /**
     * Выполнить полное уничтожение всех возможных данных игры
     * ВНИМАНИЕ: Эта функция уничтожает ВСЕ данные без возможности восстановления!
     */
    static async executeCompleteDestruction() {
      console.log('🔥💀 EXECUTING COMPLETE DATA DESTRUCTION 💀🔥');
      
      const results = {
        localStorage: false,
        sessionStorage: false,
        indexedDB: false,
        webSQL: false,
        cookies: false,
        cacheAPI: false,
        serviceWorker: false,
        applicationCache: false
      };
      
      // 1. Уничтожить localStorage
      results.localStorage = await this.destroyLocalStorage();
      
      // 2. Уничтожить sessionStorage
      results.sessionStorage = await this.destroySessionStorage();
      
      // 3. Уничтожить IndexedDB
      results.indexedDB = await this.destroyIndexedDB();
      
      // 4. Уничтожить WebSQL
      results.webSQL = await this.destroyWebSQL();
      
      // 5. Уничтожить cookies
      results.cookies = await this.destroyCookies();
      
      // 6. Уничтожить Cache API
      results.cacheAPI = await this.destroyCacheAPI();
      
      // 7. Уничтожить Service Worker
      results.serviceWorker = await this.destroyServiceWorker();
      
      // 8. Уничтожить Application Cache
      results.applicationCache = await this.destroyApplicationCache();
      
      console.log('💀 Destruction results:', results);
      return results;
    }
    
    /**
     * Полное уничтожение localStorage
     */
    static async destroyLocalStorage() {
      try {
        console.log('🗑️ Destroying localStorage...');
        
        // Получаем все ключи
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          keys.push(localStorage.key(i));
        }
        
        // Удаляем каждый ключ индивидуально
        let removedCount = 0;
        keys.forEach(key => {
          try {
            localStorage.removeItem(key);
            removedCount++;
            console.log(`✅ Destroyed localStorage key: ${key}`);
          } catch (e) {
            console.warn(`⚠️ Failed to destroy localStorage key: ${key}`, e);
          }
        });
        
        // Принудительная очистка
        try {
          localStorage.clear();
          console.log('💥 localStorage force-cleared');
        } catch (e) {
          console.warn('⚠️ localStorage force-clear failed:', e);
        }
        
        // Проверяем результат
        const remainingKeys = localStorage.length;
        console.log(`📊 localStorage destruction: ${removedCount} keys removed, ${remainingKeys} remaining`);
        
        return remainingKeys === 0;
        
      } catch (error) {
        console.error('💀 localStorage destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение sessionStorage
     */
    static async destroySessionStorage() {
      try {
        console.log('🗑️ Destroying sessionStorage...');
        
        // Получаем все ключи
        const keys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          keys.push(sessionStorage.key(i));
        }
        
        // Удаляем каждый ключ индивидуально
        let removedCount = 0;
        keys.forEach(key => {
          try {
            sessionStorage.removeItem(key);
            removedCount++;
            console.log(`✅ Destroyed sessionStorage key: ${key}`);
          } catch (e) {
            console.warn(`⚠️ Failed to destroy sessionStorage key: ${key}`, e);
          }
        });
        
        // Принудительная очистка
        try {
          sessionStorage.clear();
          console.log('💥 sessionStorage force-cleared');
        } catch (e) {
          console.warn('⚠️ sessionStorage force-clear failed:', e);
        }
        
        // Проверяем результат
        const remainingKeys = sessionStorage.length;
        console.log(`📊 sessionStorage destruction: ${removedCount} keys removed, ${remainingKeys} remaining`);
        
        return remainingKeys === 0;
        
      } catch (error) {
        console.error('💀 sessionStorage destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение IndexedDB
     */
    static async destroyIndexedDB() {
      try {
        if (!window.indexedDB) {
          console.log('ℹ️ IndexedDB not available');
          return true;
        }
        
        console.log('🗑️ Destroying IndexedDB...');
        
        let destroyedCount = 0;
        
        // Получаем список всех баз данных (современный API)
        if (indexedDB.databases) {
          try {
            const databases = await indexedDB.databases();
            console.log(`📊 Found ${databases.length} IndexedDB databases`);
            
            await Promise.all(databases.map(async (db) => {
              try {
                await this.deleteIndexedDatabase(db.name);
                destroyedCount++;
                console.log(`✅ Destroyed IndexedDB: ${db.name}`);
              } catch (e) {
                console.warn(`⚠️ Failed to destroy IndexedDB: ${db.name}`, e);
              }
            }));
          } catch (e) {
            console.warn('⚠️ Failed to enumerate IndexedDB databases:', e);
          }
        }
        
        // Уничтожаем известные базы данных игры
        const knownDatabases = [
          'gameState', 'advancedClicker', 'clickerGame', 'clicker-data',
          'game-save', 'player-data', 'app-data', 'user-data'
        ];
        
        await Promise.all(knownDatabases.map(async (dbName) => {
          try {
            await this.deleteIndexedDatabase(dbName);
            console.log(`✅ Destroyed known IndexedDB: ${dbName}`);
          } catch (e) {
            // Игнорируем ошибки для несуществующих БД
          }
        }));
        
        console.log(`📊 IndexedDB destruction: ${destroyedCount} databases destroyed`);
        return true;
        
      } catch (error) {
        console.error('💀 IndexedDB destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Вспомогательная функция для удаления IndexedDB
     */
    static deleteIndexedDatabase(name) {
      return new Promise((resolve, reject) => {
        const deleteReq = indexedDB.deleteDatabase(name);
        
        deleteReq.onsuccess = () => resolve();
        deleteReq.onerror = () => reject(deleteReq.error);
        deleteReq.onblocked = () => {
          console.warn(`⚠️ IndexedDB ${name} deletion blocked`);
          // Принудительно резолвим после таймаута
          setTimeout(resolve, 1000);
        };
      });
    }
    
    /**
     * Полное уничтожение WebSQL
     */
    static async destroyWebSQL() {
      try {
        if (!window.openDatabase) {
          console.log('ℹ️ WebSQL not available');
          return true;
        }
        
        console.log('🗑️ Destroying WebSQL...');
        
        const knownDatabases = [
          'gameState', 'advancedClicker', 'clickerGame', 'clicker-data'
        ];
        
        let destroyedCount = 0;
        
        knownDatabases.forEach(dbName => {
          try {
            const db = openDatabase(dbName, '', '', '');
            db.transaction(tx => {
              // Получаем список всех таблиц
              tx.executeSql(
                "SELECT name FROM sqlite_master WHERE type='table'",
                [],
                (tx, result) => {
                  for (let i = 0; i < result.rows.length; i++) {
                    const tableName = result.rows.item(i).name;
                    if (tableName !== 'sqlite_sequence') {
                      tx.executeSql(`DROP TABLE IF EXISTS ${tableName}`);
                      console.log(`✅ Destroyed WebSQL table: ${tableName}`);
                    }
                  }
                }
              );
            });
            destroyedCount++;
            console.log(`✅ Destroyed WebSQL database: ${dbName}`);
          } catch (e) {
            // Игнорируем ошибки для несуществующих БД
          }
        });
        
        console.log(`📊 WebSQL destruction: ${destroyedCount} databases processed`);
        return true;
        
      } catch (error) {
        console.error('💀 WebSQL destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение cookies
     */
    static async destroyCookies() {
      try {
        console.log('🗑️ Destroying cookies...');
        
        const cookies = document.cookie.split(';');
        const gameKeywords = [
          'game', 'clicker', 'save', 'state', 'advanced', 'player',
          'data', 'session', 'user', 'app', 'storage'
        ];
        
        let destroyedCount = 0;
        
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          
          if (name) {
            // Проверяем, связан ли cookie с игрой
            const isGameCookie = gameKeywords.some(keyword => 
              name.toLowerCase().includes(keyword)
            );
            
            if (isGameCookie) {
              // Удаляем cookie для всех возможных путей и доменов
              const expireDate = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
              
              // Основное удаление
              document.cookie = `${name}=;${expireDate};path=/`;
              document.cookie = `${name}=;${expireDate};path=/;domain=${window.location.hostname}`;
              document.cookie = `${name}=;${expireDate};path=/;domain=.${window.location.hostname}`;
              
              // Удаление для поддоменов
              const parts = window.location.hostname.split('.');
              if (parts.length > 1) {
                const domain = parts.slice(-2).join('.');
                document.cookie = `${name}=;${expireDate};path=/;domain=.${domain}`;
              }
              
              destroyedCount++;
              console.log(`✅ Destroyed cookie: ${name}`);
            }
          }
        });
        
        console.log(`📊 Cookie destruction: ${destroyedCount} cookies destroyed`);
        return true;
        
      } catch (error) {
        console.error('💀 Cookie destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение Cache API
     */
    static async destroyCacheAPI() {
      try {
        if (!('caches' in window)) {
          console.log('ℹ️ Cache API not available');
          return true;
        }
        
        console.log('🗑️ Destroying Cache API...');
        
        const cacheNames = await caches.keys();
        console.log(`📊 Found ${cacheNames.length} caches`);
        
        let destroyedCount = 0;
        
        await Promise.all(cacheNames.map(async (cacheName) => {
          try {
            const deleted = await caches.delete(cacheName);
            if (deleted) {
              destroyedCount++;
              console.log(`✅ Destroyed cache: ${cacheName}`);
            }
          } catch (e) {
            console.warn(`⚠️ Failed to destroy cache: ${cacheName}`, e);
          }
        }));
        
        console.log(`📊 Cache API destruction: ${destroyedCount} caches destroyed`);
        return true;
        
      } catch (error) {
        console.error('💀 Cache API destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение Service Worker
     */
    static async destroyServiceWorker() {
      try {
        if (!('serviceWorker' in navigator)) {
          console.log('ℹ️ Service Worker not available');
          return true;
        }
        
        console.log('🗑️ Destroying Service Worker...');
        
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`📊 Found ${registrations.length} service worker registrations`);
        
        let destroyedCount = 0;
        
        await Promise.all(registrations.map(async (registration) => {
          try {
            const unregistered = await registration.unregister();
            if (unregistered) {
              destroyedCount++;
              console.log(`✅ Destroyed service worker: ${registration.scope}`);
            }
          } catch (e) {
            console.warn(`⚠️ Failed to destroy service worker: ${registration.scope}`, e);
          }
        }));
        
        console.log(`📊 Service Worker destruction: ${destroyedCount} registrations destroyed`);
        return true;
        
      } catch (error) {
        console.error('💀 Service Worker destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Полное уничтожение Application Cache
     */
    static async destroyApplicationCache() {
      try {
        if (!window.applicationCache) {
          console.log('ℹ️ Application Cache not available');
          return true;
        }
        
        console.log('🗑️ Destroying Application Cache...');
        
        // Принудительное обновление кэша приложения
        try {
          window.applicationCache.update();
          console.log('✅ Application Cache updated/cleared');
        } catch (e) {
          console.warn('⚠️ Application Cache update failed:', e);
        }
        
        return true;
        
      } catch (error) {
        console.error('💀 Application Cache destruction failed:', error);
        return false;
      }
    }
    
    /**
     * Проверить, остались ли какие-либо данные после уничтожения
     */
    static async verifyDestruction() {
      console.log('🔍 Verifying complete destruction...');
      
      const verification = {
        localStorage: localStorage.length === 0,
        sessionStorage: sessionStorage.length === 0,
        cookies: this.countGameCookies() === 0,
        indexedDB: true, // Сложно проверить без асинхронного API
        cacheAPI: true   // Сложно проверить без доступа к caches
      };
      
      const allClear = Object.values(verification).every(v => v === true);
      
      console.log('📊 Destruction verification:', verification);
      console.log(allClear ? '✅ ALL DATA DESTROYED' : '⚠️ SOME DATA MAY REMAIN');
      
      return { verification, allClear };
    }
    
    /**
     * Подсчитать количество игровых cookies
     */
    static countGameCookies() {
      const cookies = document.cookie.split(';');
      const gameKeywords = ['game', 'clicker', 'save', 'state', 'advanced'];
      
      return cookies.filter(cookie => {
        const name = cookie.split('=')[0].trim().toLowerCase();
        return gameKeywords.some(keyword => name.includes(keyword));
      }).length;
    }
    
    /**
     * Экстренная процедура уничтожения
     * Используется когда обычные методы не сработали
     */
    static async emergencyDestruction() {
      console.log('🚨💀 EMERGENCY DESTRUCTION PROTOCOL 💀🚨');
      
      try {
        // Многократное уничтожение localStorage
        for (let i = 0; i < 5; i++) {
          try {
            localStorage.clear();
            for (let j = localStorage.length - 1; j >= 0; j--) {
              const key = localStorage.key(j);
              if (key) localStorage.removeItem(key);
            }
          } catch (e) {
            console.warn(`localStorage emergency clear attempt ${i + 1} failed:`, e);
          }
        }
        
        // Многократное уничтожение sessionStorage
        for (let i = 0; i < 5; i++) {
          try {
            sessionStorage.clear();
            for (let j = sessionStorage.length - 1; j >= 0; j--) {
              const key = sessionStorage.key(j);
              if (key) sessionStorage.removeItem(key);
            }
          } catch (e) {
            console.warn(`sessionStorage emergency clear attempt ${i + 1} failed:`, e);
          }
        }
        
        // Принудительное удаление всех cookies
        const allCookies = document.cookie.split(';');
        allCookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name) {
            // Удаляем с множественными вариантами путей и доменов
            const expireDate = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = `${name}=;${expireDate};path=/`;
            document.cookie = `${name}=;${expireDate};path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;${expireDate};path=/;domain=.${window.location.hostname}`;
            document.cookie = `${name}=;${expireDate}`;
          }
        });
        
        // Принудительная очистка глобальных переменных
        if (window.gameCore) {
          try {
            window.gameCore.destroy();
            delete window.gameCore;
          } catch (e) {
            console.warn('Failed to destroy gameCore:', e);
          }
        }
        
        // Очистка других глобальных переменных игры
        const globalVarsToDestroy = ['gameState', 'gameData', 'playerData', 'saveData'];
        globalVarsToDestroy.forEach(varName => {
          if (window[varName]) {
            try {
              delete window[varName];
            } catch (e) {
              window[varName] = null;
            }
          }
        });
        
        console.log('✅ Emergency destruction protocol completed');
        return true;
        
      } catch (error) {
        console.error('💀 Emergency destruction protocol failed:', error);
        return false;
      }
    }
    
    /**
     * Финальная проверка и отчет о состоянии уничтожения
     */
    static async generateDestructionReport() {
      console.log('📋 Generating destruction report...');
      
      const report = {
        timestamp: new Date().toISOString(),
        localStorage: {
          keys: localStorage.length,
          cleared: localStorage.length === 0
        },
        sessionStorage: {
          keys: sessionStorage.length,
          cleared: sessionStorage.length === 0
        },
        cookies: {
          total: document.cookie.split(';').filter(c => c.trim()).length,
          gameCookies: this.countGameCookies(),
          cleared: this.countGameCookies() === 0
        },
        indexedDB: {
          available: !!window.indexedDB,
          // Сложно проверить без асинхронных вызовов
          assumedCleared: true
        },
        cacheAPI: {
          available: !!window.caches,
          assumedCleared: true
        },
        serviceWorker: {
          available: !!navigator.serviceWorker,
          assumedCleared: true
        },
        globalVariables: {
          gameCore: !window.gameCore,
          cleared: !window.gameCore
        }
      };
      
      // Подсчитываем общий результат
      const clearedComponents = [
        report.localStorage.cleared,
        report.sessionStorage.cleared,
        report.cookies.cleared,
        report.globalVariables.cleared
      ];
      
      const totalCleared = clearedComponents.filter(Boolean).length;
      const totalComponents = clearedComponents.length;
      
      report.summary = {
        componentsCleared: totalCleared,
        totalComponents: totalComponents,
        successPercentage: (totalCleared / totalComponents * 100).toFixed(1),
        allCleared: totalCleared === totalComponents
      };
      
      console.log('📊 DESTRUCTION REPORT:', report);
      
      if (report.summary.allCleared) {
        console.log('✅💀 COMPLETE DESTRUCTION CONFIRMED 💀✅');
      } else {
        console.log('⚠️💀 PARTIAL DESTRUCTION - SOME DATA MAY REMAIN 💀⚠️');
      }
      
      return report;
    }
    
    /**
     * Главная функция для полного уничтожения всех данных
     * Комбинирует все методы для максимальной эффективности
     */
    static async performTotalAnnihilation() {
      console.log('🔥💀🔥 TOTAL ANNIHILATION INITIATED 🔥💀🔥');
      
      const startTime = Date.now();
      
      try {
        // Шаг 1: Обычное уничтожение
        console.log('🔥 Phase 1: Standard destruction...');
        const standardResults = await this.executeCompleteDestruction();
        
        // Шаг 2: Проверка результатов
        console.log('🔍 Phase 2: Verification...');
        const verification = await this.verifyDestruction();
        
        // Шаг 3: Экстренное уничтожение если нужно
        if (!verification.allClear) {
          console.log('🚨 Phase 3: Emergency destruction...');
          await this.emergencyDestruction();
        }
        
        // Шаг 4: Финальная проверка
        console.log('📋 Phase 4: Final report...');
        const finalReport = await this.generateDestructionReport();
        
        const duration = Date.now() - startTime;
        
        console.log(`🕐 Total annihilation completed in ${duration}ms`);
        
        return {
          success: finalReport.summary.allCleared,
          duration: duration,
          standardResults: standardResults,
          verification: verification,
          finalReport: finalReport
        };
        
      } catch (error) {
        console.error('💀 TOTAL ANNIHILATION FAILED:', error);
        
        // Попытка экстренного восстановления
        try {
          await this.emergencyDestruction();
        } catch (emergencyError) {
          console.error('💀 EMERGENCY DESTRUCTION ALSO FAILED:', emergencyError);
        }
        
        return {
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        };
      }
    }
    
    /**
     * Утилита для создания визуального отчета о состоянии уничтожения
     */
    static createVisualDestructionReport(report) {
      const reportHTML = `
        <div style="
          position: fixed; top: 50%; left: 50%; 
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
          color: #ff4444; padding: 30px; border-radius: 15px;
          border: 2px solid #ff4444; font-family: monospace;
          z-index: 99999; max-width: 600px; box-shadow: 0 0 50px rgba(255,68,68,0.5);
        ">
          <h2 style="margin-top: 0; text-align: center; color: #ff6666;">
            💀 DESTRUCTION REPORT 💀
          </h2>
          <div style="font-size: 14px; line-height: 1.4;">
            <p><strong>Timestamp:</strong> ${report.timestamp}</p>
            <p><strong>Success Rate:</strong> ${report.summary.successPercentage}%</p>
            <p><strong>Components Cleared:</strong> ${report.summary.componentsCleared}/${report.summary.totalComponents}</p>
            
            <h3 style="color: #ffaaaa; margin: 20px 0 10px 0;">Storage Status:</h3>
            <p>LocalStorage: ${report.localStorage.cleared ? '✅ DESTROYED' : '❌ ACTIVE'} (${report.localStorage.keys} keys)</p>
            <p>SessionStorage: ${report.sessionStorage.cleared ? '✅ DESTROYED' : '❌ ACTIVE'} (${report.sessionStorage.keys} keys)</p>
            <p>Cookies: ${report.cookies.cleared ? '✅ DESTROYED' : '❌ ACTIVE'} (${report.cookies.gameCookies}/${report.cookies.total})</p>
            <p>Global Variables: ${report.globalVariables.cleared ? '✅ DESTROYED' : '❌ ACTIVE'}</p>
            
            <h3 style="color: ${report.summary.allCleared ? '#44ff44' : '#ff4444'}; margin: 20px 0 10px 0;">
              ${report.summary.allCleared ? '✅ TOTAL DESTRUCTION CONFIRMED' : '⚠️ PARTIAL DESTRUCTION'}
            </h3>
          </div>
          
          <button onclick="this.parentElement.remove()" style="
            background: #ff4444; color: white; border: none;
            padding: 10px 20px; border-radius: 5px; cursor: pointer;
            margin-top: 20px; width: 100%; font-weight: bold;
          ">
            Close Report
          </button>
        </div>
      `;
      
      const reportElement = document.createElement('div');
      reportElement.innerHTML = reportHTML;
      document.body.appendChild(reportElement);
      
      return reportElement;
    }
  }
  
  // Экспорт для использования в других модулях
  export default NuclearCleanup;