/**
 * DataLoader - Утилита для загрузки конфигурационных данных из JSON файлов
 * Поддерживает кэширование и обработку ошибок
 */
export class DataLoader {
  constructor() {
    this.cache = new Map();
    this.loadPromises = new Map();
  }

  /**
   * Загружает данные из JSON файла
   * @param {string} path - Путь к JSON файлу
   * @param {boolean} useCache - Использовать кэширование (по умолчанию true)
   * @returns {Promise<Object>} Parsed JSON data
   */
  async loadData(path, useCache = true) {
    if (useCache && this.cache.has(path)) {
      console.log(`📦 DataLoader: Using cached data for ${path}`);
      return this.cache.get(path);
    }

    // Предотвращаем множественные запросы одного файла
    if (this.loadPromises.has(path)) {
      console.log(`⏳ DataLoader: Waiting for ongoing request for ${path}`);
      return this.loadPromises.get(path);
    }

    const loadPromise = this._fetchAndParseData(path);
    this.loadPromises.set(path, loadPromise);

    try {
      const data = await loadPromise;
      
      if (useCache) {
        this.cache.set(path, data);
        console.log(`✅ DataLoader: Cached data for ${path}`);
      }

      this.loadPromises.delete(path);
      return data;
    } catch (error) {
      this.loadPromises.delete(path);
      throw error;
    }
  }

  /**
   * Загружает конфигурацию строений
   * @returns {Promise<Object>} Buildings configuration
   */
  async loadBuildingsData() {
    try {
      const data = await this.loadData('data/buildings.json');
      console.log(`🏗️ Loaded ${data.buildings?.length || 0} building definitions`);
      return {
        buildings: data.buildings || [],
        categories: data.categories || {}
      };
    } catch (error) {
      console.error('❌ Failed to load buildings data:', error);
      return this._getFallbackBuildingsData();
    }
  }

  /**
   * Загружает конфигурацию навыков
   * @returns {Promise<Object>} Skills configuration
   */
  async loadSkillsData() {
    try {
      const data = await this.loadData('data/skills.json');
      console.log(`🎯 Loaded ${data.skills?.length || 0} skill definitions`);
      return {
        skills: data.skills || [],
        categories: data.categories || {}
      };
    } catch (error) {
      console.error('❌ Failed to load skills data:', error);
      return this._getFallbackSkillsData();
    }
  }

  /**
   * Загружает конфигурацию рейдов
   * @returns {Promise<Object>} Raids configuration
   */
  async loadRaidsData() {
    try {
      const data = await this.loadData('data/raids.json');
      console.log(`⚔️ Loaded ${data.raids?.length || 0} raid definitions`);
      return {
        raids: data.raids || [],
        specialRewards: data.specialRewards || {},
        difficulties: data.difficulties || {}
      };
    } catch (error) {
      console.error('❌ Failed to load raids data:', error);
      return this._getFallbackRaidsData();
    }
  }

  /**
   * Загружает конфигурацию рынка
   * @returns {Promise<Object>} Market configuration
   */
  async loadMarketData() {
    try {
      const data = await this.loadData('data/market.json');
      console.log(`🛒 Loaded ${data.items?.length || 0} market item definitions`);
      return {
        items: data.items || [],
        categories: data.categories || {}
      };
    } catch (error) {
      console.error('❌ Failed to load market data:', error);
      return this._getFallbackMarketData();
    }
  }

  /**
   * Внутренний метод для загрузки и парсинга данных
   * @private
   */
  async _fetchAndParseData(path) {
    console.log(`📥 DataLoader: Fetching ${path}...`);
    
    try {
      const response = await fetch(path);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ DataLoader: Successfully loaded ${path}`);
      return data;
    } catch (error) {
      console.error(`❌ DataLoader: Failed to load ${path}:`, error);
      throw new Error(`Failed to load data from ${path}: ${error.message}`);
    }
  }

  /**
   * Резервные данные для строений (минимальный набор)
   * @private
   */
  _getFallbackBuildingsData() {
    console.warn('⚠️ Using fallback buildings data');
    return {
      buildings: [
        {
          id: 'sawmill',
          img: '🪚',
          name: 'Sawmill',
          description: 'Produces wood automatically',
          price: { wood: 0, stone: 10, iron: 5 },
          production: { resource: 'wood', amount: 1, interval: 10000 },
          maxLevel: 10,
          category: 'production'
        }
      ],
      categories: {
        production: '🏭 Production'
      }
    };
  }

  /**
   * Резервные данные для навыков (минимальный набор)
   * @private
   */
  _getFallbackSkillsData() {
    console.warn('⚠️ Using fallback skills data');
    return {
      skills: [
        {
          id: 'goldMultiplier',
          name: 'Golden Touch',
          icon: '💰',
          description: 'Increase gold gain from clicks',
          category: 'clicking',
          maxLevel: 20,
          baseCost: 1,
          costMultiplier: 1.2,
          effect: {
            type: 'multiplier',
            target: 'gold',
            value: 0.05
          }
        }
      ],
      categories: {
        clicking: 'Clicking Skills'
      }
    };
  }

  /**
   * Резервные данные для рейдов (минимальный набор)
   * @private
   */
  _getFallbackRaidsData() {
    console.warn('⚠️ Using fallback raids data');
    return {
      raids: [
        {
          id: 'city_ruins',
          name: '🏚️ City Ruins',
          description: 'Basic exploration raid',
          difficulty: 'beginner',
          unlockCondition: { building: 'watchTower', level: 1 },
          requirements: { people: 4, food: 12, water: 8 },
          duration: 120000,
          riskPercentage: 20,
          rewards: {
            guaranteed: [
              { resource: 'wood', min: 2, max: 5 }
            ],
            chance: []
          },
          category: 'exploration'
        }
      ],
      specialRewards: {},
      difficulties: {
        beginner: {
          name: 'Beginner',
          color: '#28a745',
          description: 'Low risk expeditions'
        }
      }
    };
  }

  /**
   * Резервные данные для рынка (минимальный набор)
   * @private
   */
  _getFallbackMarketData() {
    console.warn('⚠️ Using fallback market data');
    return {
      items: [
        {
          id: 'wood',
          name: 'Wood',
          icon: '🌲',
          description: 'Basic building material',
          basePrice: { gold: 500 },
          reward: { wood: 1 },
          category: 'resources',
          adaptive: true,
          scalingFactor: 1.1
        }
      ],
      categories: {
        resources: 'Basic Resources'
      }
    };
  }

  /**
   * Очищает кэш
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 DataLoader: Cache cleared');
  }

  /**
   * Предзагружает все конфигурационные данные
   * @returns {Promise<Object>} Все загруженные данные
   */
  async preloadAllData() {
    console.log('🚀 DataLoader: Preloading all configuration data...');
    
    try {
      const [buildings, skills, raids, market] = await Promise.all([
        this.loadBuildingsData(),
        this.loadSkillsData(),
        this.loadRaidsData(),
        this.loadMarketData()
      ]);

      console.log('✅ DataLoader: All data preloaded successfully');
      
      return {
        buildings,
        skills,
        raids,
        market
      };
    } catch (error) {
      console.error('❌ DataLoader: Failed to preload all data:', error);
      throw error;
    }
  }

  /**
   * Получает информацию о кэше
   * @returns {Object} Cache statistics
   */
  getCacheInfo() {
    return {
      cachedFiles: Array.from(this.cache.keys()),
      cacheSize: this.cache.size,
      pendingRequests: Array.from(this.loadPromises.keys())
    };
  }

  /**
   * Валидирует структуру данных строений
   * @param {Object} data - Данные для валидации
   * @returns {boolean} Результат валидации
   */
  validateBuildingsData(data) {
    if (!data || !Array.isArray(data.buildings)) {
      console.error('❌ Invalid buildings data: missing buildings array');
      return false;
    }

    for (const building of data.buildings) {
      if (!building.id || !building.name || !building.price) {
        console.error('❌ Invalid building data:', building);
        return false;
      }
    }

    console.log('✅ Buildings data validation passed');
    return true;
  }

  /**
   * Валидирует структуру данных навыков
   * @param {Object} data - Данные для валидации
   * @returns {boolean} Результат валидации
   */
  validateSkillsData(data) {
    if (!data || !Array.isArray(data.skills)) {
      console.error('❌ Invalid skills data: missing skills array');
      return false;
    }

    for (const skill of data.skills) {
      if (!skill.id || !skill.name || !skill.effect) {
        console.error('❌ Invalid skill data:', skill);
        return false;
      }
    }

    console.log('✅ Skills data validation passed');
    return true;
  }
}

// Создаем глобальный экземпляр загрузчика данных
export const dataLoader = new DataLoader();

// Делаем доступным для отладки
if (typeof window !== 'undefined') {
  window.dataLoader = dataLoader;
}