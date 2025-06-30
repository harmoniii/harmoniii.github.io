// managers/RaidManager.js - Система рейдов
import { CleanupMixin } from '../core/CleanupManager.js';
import { eventBus, GameEvents } from '../core/GameEvents.js';
import { getResourceEmoji } from '../config/ResourceConfig.js';

// Определения рейдов
export const RAID_DEFS = [
  // ===== BEGINNER RAIDS (Легкие) =====
  {
    id: 'city_ruins',
    name: '🏚️ City Ruins',
    description: 'Explore the remnants of a once-great city for resources and technology',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 4,
      food: 12,
      water: 8
    },
    duration: 120000, // 2 minutes
    riskPercentage: 20,
    rewards: {
      guaranteed: [
        { resource: 'wood', min: 2, max: 5 },
        { resource: 'stone', min: 2, max: 5 },
        { resource: 'iron', min: 2, max: 5 }
      ],
      chance: [
        { 
          probability: 0.15,
          reward: { resource: 'science', amount: 2 },
          description: 'Found ancient technology'
        },
        {
          probability: 0.05,
          reward: { type: 'special', id: 'ancient_blueprint' },
          description: 'Discovered Ancient Blueprint'
        }
      ]
    },
    category: 'exploration'
  },
  
  {
    id: 'abandoned_farm',
    name: '🌾 Abandoned Farm',
    description: 'Search through the ruins of an old agricultural facility for seeds and tools',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 3,
      food: 8,
      water: 10
    },
    duration: 90000, // 1.5 minutes
    riskPercentage: 15,
    rewards: {
      guaranteed: [
        { resource: 'food', min: 5, max: 8 },
        { resource: 'wood', min: 3, max: 6 }
      ],
      chance: [
        { 
          probability: 0.25,
          reward: { resource: 'water', amount: 5 },
          description: 'Found underground water source'
        },
        {
          probability: 0.10,
          reward: { type: 'special', id: 'fertile_seeds' },
          description: 'Discovered rare seeds'
        }
      ]
    },
    category: 'resource_gathering'
  },
  
  {
    id: 'old_quarry',
    name: '⛏️ Old Quarry',
    description: 'Scavenge stone and minerals from an abandoned mining site',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 5,
      food: 10,
      iron: 2
    },
    duration: 150000, // 2.5 minutes
    riskPercentage: 25,
    rewards: {
      guaranteed: [
        { resource: 'stone', min: 6, max: 10 },
        { resource: 'iron', min: 1, max: 3 }
      ],
      chance: [
        { 
          probability: 0.20,
          reward: { resource: 'gold', amount: 15 },
          description: 'Found precious metal veins'
        },
        {
          probability: 0.08,
          reward: { type: 'special', id: 'mining_tools' },
          description: 'Recovered mining equipment'
        }
      ]
    },
    category: 'resource_gathering'
  },
  
  {
    id: 'survivor_camp',
    name: '⛺ Survivor Camp',
    description: 'Rescue survivors from a small encampment and gain their loyalty',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 6,
      food: 15,
      water: 12
    },
    duration: 180000, // 3 minutes
    riskPercentage: 10,
    rewards: {
      guaranteed: [
        { resource: 'people', min: 2, max: 4 }
      ],
      chance: [
        { 
          probability: 0.30,
          reward: { resource: 'skillPoints', amount: 1 },
          description: 'Gained knowledge from survivors'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'survival_guide' },
          description: 'Obtained survival manual'
        }
      ]
    },
    category: 'recruitment'
  },
  
  {
    id: 'supply_depot',
    name: '📦 Supply Depot',
    description: 'Raid an old supply depot for emergency provisions and basic equipment',
    difficulty: 'beginner',
    unlockCondition: { building: 'watchTower', level: 1 },
    requirements: {
      people: 4,
      food: 6,
      water: 6
    },
    duration: 100000, // 1.67 minutes
    riskPercentage: 18,
    rewards: {
      guaranteed: [
        { resource: 'food', min: 8, max: 12 },
        { resource: 'water', min: 6, max: 10 },
        { resource: 'wood', min: 2, max: 4 }
      ],
      chance: [
        { 
          probability: 0.20,
          reward: { resource: 'iron', amount: 3 },
          description: 'Found metal containers'
        },
        {
          probability: 0.12,
          reward: { type: 'special', id: 'first_aid_kit' },
          description: 'Recovered medical supplies'
        }
      ]
    },
    category: 'supply_run'
  },

  // ===== INTERMEDIATE RAIDS (Средние) =====
  {
    id: 'forgotten_district',
    name: '🏙️ Forgotten District',
    description: 'Scout the abandoned district for usable machinery and parts',
    difficulty: 'intermediate',
    unlockCondition: { building: 'watchTower', level: 2 },
    requirements: {
      people: 15,
      food: 45,
      water: 30
    },
    duration: 240000, // 4 minutes
    riskPercentage: 28,
    rewards: {
      guaranteed: [
        { resource: 'iron', min: 10, max: 15 },
        { resource: 'science', min: 8, max: 12 }
      ],
      chance: [
        { 
          probability: 0.35,
          reward: { resource: 'skillPoints', amount: 3 },
          description: 'Found ancient technology'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'advanced_blueprint' },
          description: 'Discovered Advanced Blueprint'
        }
      ]
    },
    category: 'exploration'
  },
  
  {
    id: 'factory_complex',
    name: '🏭 Factory Complex',
    description: 'Infiltrate an abandoned manufacturing facility to salvage machinery',
    difficulty: 'intermediate',
    unlockCondition: { building: 'watchTower', level: 2 },
    requirements: {
      people: 12,
      food: 35,
      water: 25,
      iron: 8
    },
    duration: 300000, // 5 minutes
    riskPercentage: 32,
    rewards: {
      guaranteed: [
        { resource: 'iron', min: 15, max: 25 },
        { resource: 'stone', min: 8, max: 12 },
        { resource: 'science', min: 5, max: 8 }
      ],
      chance: [
        { 
          probability: 0.25,
          reward: { resource: 'gold', amount: 50 },
          description: 'Found valuable components'
        },
        {
          probability: 0.20,
          reward: { type: 'special', id: 'power_core' },
          description: 'Salvaged energy core'
        }
      ]
    },
    category: 'industrial'
  },
  
  {
    id: 'research_facility',
    name: '🔬 Research Facility',
    description: 'Break into a secured laboratory to recover scientific equipment and data',
    difficulty: 'intermediate',
    unlockCondition: { building: 'watchTower', level: 2 },
    requirements: {
      people: 10,
      food: 40,
      water: 30,
      science: 5
    },
    duration: 270000, // 4.5 minutes
    riskPercentage: 25,
    rewards: {
      guaranteed: [
        { resource: 'science', min: 12, max: 20 },
        { resource: 'skillPoints', min: 2, max: 4 }
      ],
      chance: [
        { 
          probability: 0.30,
          reward: { resource: 'faith', amount: 8 },
          description: 'Discovered hopeful research'
        },
        {
          probability: 0.18,
          reward: { type: 'special', id: 'research_data' },
          description: 'Retrieved valuable data'
        }
      ]
    },
    category: 'scientific'
  },
  
  {
    id: 'military_outpost',
    name: '🪖 Military Outpost',
    description: 'Assault a fortified outpost to claim weapons and tactical equipment',
    difficulty: 'intermediate',
    unlockCondition: { building: 'watchTower', level: 2 },
    requirements: {
      people: 18,
      food: 50,
      water: 35,
      iron: 10
    },
    duration: 360000, // 6 minutes
    riskPercentage: 35,
    rewards: {
      guaranteed: [
        { resource: 'iron', min: 20, max: 30 },
        { resource: 'gold', min: 25, max: 40 }
      ],
      chance: [
        { 
          probability: 0.40,
          reward: { resource: 'people', amount: 5 },
          description: 'Recruited military survivors'
        },
        {
          probability: 0.12,
          reward: { type: 'special', id: 'tactical_manual' },
          description: 'Found military strategies'
        }
      ]
    },
    category: 'military'
  },
  
  {
    id: 'underground_bunker',
    name: '🕳️ Underground Bunker',
    description: 'Explore deep bunkers for preserved resources and hidden technologies',
    difficulty: 'intermediate',
    unlockCondition: { building: 'watchTower', level: 2 },
    requirements: {
      people: 8,
      food: 30,
      water: 40,
      iron: 12
    },
    duration: 320000, // 5.33 minutes
    riskPercentage: 30,
    rewards: {
      guaranteed: [
        { resource: 'food', min: 20, max: 35 },
        { resource: 'water', min: 15, max: 25 },
        { resource: 'science', min: 6, max: 10 }
      ],
      chance: [
        { 
          probability: 0.22,
          reward: { resource: 'skillPoints', amount: 5 },
          description: 'Found preserved knowledge'
        },
        {
          probability: 0.08,
          reward: { type: 'special', id: 'bunker_key' },
          description: 'Discovered bunker access codes'
        }
      ]
    },
    category: 'exploration'
  },

  // ===== ADVANCED RAIDS (Сложные) =====
  {
    id: 'corrupted_metropolis',
    name: '🌆 Corrupted Metropolis',
    description: 'Venture into the chaos-twisted heart of a fallen megacity where reality bends',
    difficulty: 'advanced',
    unlockCondition: { building: 'watchTower', level: 3 },
    requirements: {
      people: 25,
      food: 80,
      water: 60,
      iron: 25,
      science: 15,
      faith: 10
    },
    duration: 480000, // 8 minutes
    riskPercentage: 45,
    rewards: {
      guaranteed: [
        { resource: 'science', min: 25, max: 40 },
        { resource: 'iron', min: 30, max: 50 },
        { resource: 'skillPoints', min: 5, max: 8 }
      ],
      chance: [
        { 
          probability: 0.35,
          reward: { resource: 'gold', amount: 150 },
          description: 'Looted corporate vaults'
        },
        {
          probability: 0.25,
          reward: { type: 'special', id: 'chaos_crystal' },
          description: 'Crystallized chaos energy'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'master_blueprint' },
          description: 'Pre-war construction plans'
        }
      ]
    },
    category: 'chaos_expedition'
  },
  
  {
    id: 'ancient_cathedral',
    name: '⛪ Ancient Cathedral',
    description: 'Cleanse a holy site consumed by chaos to restore its sacred power',
    difficulty: 'advanced',
    unlockCondition: { building: 'watchTower', level: 3 },
    requirements: {
      people: 20,
      food: 70,
      water: 50,
      faith: 25,
      science: 10
    },
    duration: 420000, // 7 minutes
    riskPercentage: 40,
    rewards: {
      guaranteed: [
        { resource: 'faith', min: 30, max: 50 },
        { resource: 'chaos', min: -15, max: -25 }
      ],
      chance: [
        { 
          probability: 0.40,
          reward: { resource: 'skillPoints', amount: 10 },
          description: 'Divine inspiration granted'
        },
        {
          probability: 0.20,
          reward: { type: 'special', id: 'holy_relic' },
          description: 'Blessed artifact recovered'
        },
        {
          probability: 0.10,
          reward: { type: 'special', id: 'purification_ritual' },
          description: 'Ancient cleansing rite'
        }
      ]
    },
    category: 'spiritual'
  },
  
  {
    id: 'orbital_debris',
    name: '🛰️ Orbital Debris',
    description: 'Launch an expedition to recover technology from crashed space stations',
    difficulty: 'advanced',
    unlockCondition: { building: 'watchTower', level: 3 },
    requirements: {
      people: 15,
      food: 60,
      water: 40,
      iron: 35,
      science: 25
    },
    duration: 540000, // 9 minutes
    riskPercentage: 50,
    rewards: {
      guaranteed: [
        { resource: 'science', min: 35, max: 55 },
        { resource: 'skillPoints', min: 8, max: 12 }
      ],
      chance: [
        { 
          probability: 0.30,
          reward: { resource: 'gold', amount: 200 },
          description: 'Rare metal alloys recovered'
        },
        {
          probability: 0.25,
          reward: { type: 'special', id: 'fusion_core' },
          description: 'Advanced power source'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'stellar_data' },
          description: 'Cosmic knowledge database'
        }
      ]
    },
    category: 'technological'
  },
  
  {
    id: 'warlord_stronghold',
    name: '🏰 Warlord Stronghold',
    description: 'Storm the fortress of a chaos-corrupted warlord and claim their domain',
    difficulty: 'advanced',
    unlockCondition: { building: 'watchTower', level: 3 },
    requirements: {
      people: 30,
      food: 100,
      water: 80,
      iron: 40,
      people: 35 // High people requirement for assault
    },
    duration: 600000, // 10 minutes
    riskPercentage: 55,
    rewards: {
      guaranteed: [
        { resource: 'iron', min: 50, max: 80 },
        { resource: 'gold', min: 100, max: 150 },
        { resource: 'people', min: 10, max: 20 }
      ],
      chance: [
        { 
          probability: 0.45,
          reward: { resource: 'skillPoints', amount: 15 },
          description: 'Claimed warlord\'s knowledge'
        },
        {
          probability: 0.20,
          reward: { type: 'special', id: 'war_banner' },
          description: 'Symbol of conquered domain'
        },
        {
          probability: 0.12,
          reward: { type: 'special', id: 'fortress_plans' },
          description: 'Defensive construction secrets'
        }
      ]
    },
    category: 'conquest'
  },
  
  {
    id: 'time_rift_expedition',
    name: '⏰ Time Rift Expedition',
    description: 'Navigate temporal anomalies to recover pre-cataclysm technologies',
    difficulty: 'advanced',
    unlockCondition: { building: 'watchTower', level: 3 },
    requirements: {
      people: 12,
      food: 90,
      water: 70,
      science: 30,
      faith: 20,
      chaos: 10
    },
    duration: 450000, // 7.5 minutes
    riskPercentage: 48,
    rewards: {
      guaranteed: [
        { resource: 'science', min: 40, max: 60 },
        { resource: 'skillPoints', min: 12, max: 18 }
      ],
      chance: [
        { 
          probability: 0.35,
          reward: { resource: 'gold', amount: 300 },
          description: 'Pristine pre-war artifacts'
        },
        {
          probability: 0.18,
          reward: { type: 'special', id: 'temporal_stabilizer' },
          description: 'Time manipulation device'
        },
        {
          probability: 0.08,
          reward: { type: 'special', id: 'chrono_knowledge' },
          description: 'Temporal engineering data'
        }
      ]
    },
    category: 'anomalous'
  },

  // ===== IMPOSSIBLE RAIDS (Невозможные) =====
  {
    id: 'chaos_nexus',
    name: '🌪️ Chaos Nexus',
    description: 'Assault the epicenter of chaos itself - where reality breaks down completely',
    difficulty: 'impossible',
    unlockCondition: { building: 'watchTower', level: 4 },
    requirements: {
      people: 50,
      food: 200,
      water: 150,
      iron: 80,
      science: 50,
      faith: 100,
      chaos: 25 // Need chaos to understand chaos
    },
    duration: 900000, // 15 minutes
    riskPercentage: 75,
    rewards: {
      guaranteed: [
        { resource: 'skillPoints', min: 25, max: 40 },
        { resource: 'science', min: 60, max: 100 },
        { resource: 'chaos', min: -50, max: -30 }
      ],
      chance: [
        { 
          probability: 0.50,
          reward: { resource: 'gold', amount: 500 },
          description: 'Chaos-forged treasures'
        },
        {
          probability: 0.30,
          reward: { type: 'special', id: 'reality_anchor' },
          description: 'Device that stabilizes reality'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'chaos_mastery' },
          description: 'Understanding of chaos itself'
        }
      ]
    },
    category: 'ultimate'
  },
  
  {
    id: 'divine_sanctuary',
    name: '🌟 Divine Sanctuary',
    description: 'Ascend to a heavenly realm to commune with the last remnants of divine power',
    difficulty: 'impossible',
    unlockCondition: { building: 'watchTower', level: 4 },
    requirements: {
      people: 40,
      food: 180,
      water: 120,
      science: 40,
      faith: 150,
      chaos: 0 // Must have no chaos
    },
    duration: 720000, // 12 minutes
    riskPercentage: 65,
    rewards: {
      guaranteed: [
        { resource: 'faith', min: 100, max: 150 },
        { resource: 'skillPoints', min: 30, max: 50 },
        { resource: 'people', min: 15, max: 25 }
      ],
      chance: [
        { 
          probability: 0.40,
          reward: { resource: 'gold', amount: 1000 },
          description: 'Heavenly treasures bestowed'
        },
        {
          probability: 0.25,
          reward: { type: 'special', id: 'divine_blessing' },
          description: 'Permanent divine protection'
        },
        {
          probability: 0.10,
          reward: { type: 'special', id: 'resurrection_power' },
          description: 'Power to restore the lost'
        }
      ]
    },
    category: 'transcendent'
  },
  
  {
    id: 'world_core',
    name: '🌍 World Core',
    description: 'Descend to the planet\'s core to repair the fundamental damage done to reality',
    difficulty: 'impossible',
    unlockCondition: { building: 'watchTower', level: 5 },
    requirements: {
      people: 60,
      food: 300,
      water: 250,
      iron: 100,
      science: 80,
      faith: 80,
      chaos: 50
    },
    duration: 1200000, // 20 minutes
    riskPercentage: 80,
    rewards: {
      guaranteed: [
        { resource: 'skillPoints', min: 50, max: 80 },
        { resource: 'science', min: 100, max: 150 },
        { resource: 'faith', min: 80, max: 120 },
        { resource: 'chaos', min: -100, max: -50 }
      ],
      chance: [
        { 
          probability: 0.60,
          reward: { resource: 'gold', amount: 2000 },
          description: 'Crystallized world essence'
        },
        {
          probability: 0.35,
          reward: { type: 'special', id: 'world_heart' },
          description: 'Core fragment of the planet'
        },
        {
          probability: 0.20,
          reward: { type: 'special', id: 'genesis_protocol' },
          description: 'Power to reshape reality'
        }
      ]
    },
    category: 'planetary'
  },
  
  {
    id: 'void_gateway',
    name: '🕳️ Void Gateway',
    description: 'Enter the spaces between realities to confront the source of the cataclysm',
    difficulty: 'impossible',
    unlockCondition: { building: 'watchTower', level: 5 },
    requirements: {
      people: 35,
      food: 250,
      water: 200,
      iron: 75,
      science: 100,
      faith: 75,
      chaos: 75
    },
    duration: 1080000, // 18 minutes
    riskPercentage: 85,
    rewards: {
      guaranteed: [
        { resource: 'skillPoints', min: 40, max: 70 },
        { resource: 'science', min: 80, max: 120 },
        { resource: 'gold', min: 500, max: 800 }
      ],
      chance: [
        { 
          probability: 0.45,
          reward: { resource: 'chaos', amount: -200 },
          description: 'Sealed void breach'
        },
        {
          probability: 0.25,
          reward: { type: 'special', id: 'void_essence' },
          description: 'Essence of nothingness itself'
        },
        {
          probability: 0.15,
          reward: { type: 'special', id: 'creation_spark' },
          description: 'Power to create from nothing'
        }
      ]
    },
    category: 'metaphysical'
  },
  
  {
    id: 'titan_awakening',
    name: '🏔️ Titan Awakening',
    description: 'Awaken and tame the last sleeping titan to help rebuild the world',
    difficulty: 'impossible',
    unlockCondition: { building: 'watchTower', level: 5 },
    requirements: {
      people: 100,
      food: 500,
      water: 400,
      iron: 150,
      science: 75,
      faith: 200,
      gold: 1000
    },
    duration: 1500000, // 25 minutes
    riskPercentage: 70,
    rewards: {
      guaranteed: [
        { resource: 'people', min: 50, max: 100 },
        { resource: 'skillPoints', min: 60, max: 100 },
        { resource: 'gold', min: 1000, max: 1500 }
      ],
      chance: [
        { 
          probability: 0.50,
          reward: { resource: 'faith', amount: 300 },
          description: 'Titan\'s ancient wisdom'
        },
        {
          probability: 0.30,
          reward: { type: 'special', id: 'titan_bond' },
          description: 'Eternal pact with titan'
        },
        {
          probability: 0.20,
          reward: { type: 'special', id: 'world_builder' },
          description: 'Power to reshape landscapes'
        }
      ]
    },
    category: 'legendary'
  }
];

// Специальные награды
export const SPECIAL_REWARDS = {
  // Существующие
  ancient_blueprint: {
    name: 'Ancient Blueprint',
    description: '10% discount on next building upgrade',
    icon: '📜',
    effect: { type: 'building_discount', value: 0.1, uses: 1 }
  },
  
  // Новые награды для beginners
  fertile_seeds: {
    name: 'Fertile Seeds',
    description: 'Farms produce 25% more food for 1 hour',
    icon: '🌱',
    effect: { type: 'production_boost', target: 'farm', value: 0.25, duration: 3600000 }
  },
  
  mining_tools: {
    name: 'Mining Tools',
    description: 'Quarries and mines produce 20% more for 30 minutes',
    icon: '⛏️',
    effect: { type: 'production_boost', target: 'mining', value: 0.2, duration: 1800000 }
  },
  
  survival_guide: {
    name: 'Survival Guide',
    description: 'Reduces raid risk by 5% permanently',
    icon: '📖',
    effect: { type: 'permanent_bonus', target: 'raid_risk', value: -0.05 }
  },
  
  first_aid_kit: {
    name: 'First Aid Kit',
    description: 'Next raid has 0% casualty risk',
    icon: '🏥',
    effect: { type: 'raid_protection', value: 1.0, uses: 1 }
  },
  
  // Новые награды для intermediate
  advanced_blueprint: {
    name: 'Advanced Blueprint',
    description: '25% discount on next building upgrade',
    icon: '🗒️',
    effect: { type: 'building_discount', value: 0.25, uses: 1 }
  },
  
  power_core: {
    name: 'Power Core',
    description: 'Generators produce 50% more energy for 2 hours',
    icon: '⚡',
    effect: { type: 'production_boost', target: 'generator', value: 0.5, duration: 7200000 }
  },
  
  research_data: {
    name: 'Research Data',
    description: 'Laboratories produce double science for 1 hour',
    icon: '💾',
    effect: { type: 'production_boost', target: 'laboratory', value: 1.0, duration: 3600000 }
  },
  
  tactical_manual: {
    name: 'Tactical Manual',
    description: 'Reduces all raid risks by 10% for next 5 raids',
    icon: '📋',
    effect: { type: 'temporary_bonus', target: 'raid_risk', value: -0.1, uses: 5 }
  },
  
  bunker_key: {
    name: 'Bunker Access Codes',
    description: 'Unlocks special underground expeditions',
    icon: '🗝️',
    effect: { type: 'unlock', target: 'bunker_raids', value: true }
  },
  
  // Новые награды для advanced
  chaos_crystal: {
    name: 'Chaos Crystal',
    description: 'Can convert 10 chaos into 50 science',
    icon: '💎',
    effect: { type: 'converter', from: 'chaos', to: 'science', ratio: 5, uses: 3 }
  },
  
  master_blueprint: {
    name: 'Master Blueprint',
    description: '50% discount on all buildings for next hour',
    icon: '📐',
    effect: { type: 'global_discount', target: 'buildings', value: 0.5, duration: 3600000 }
  },
  
  holy_relic: {
    name: 'Holy Relic',
    description: 'Temples produce triple faith for 3 hours',
    icon: '✨',
    effect: { type: 'production_boost', target: 'temple', value: 2.0, duration: 10800000 }
  },
  
  purification_ritual: {
    name: 'Purification Ritual',
    description: 'Removes all chaos and prevents chaos gain for 2 hours',
    icon: '🕊️',
    effect: { type: 'chaos_immunity', duration: 7200000, cleanse: true }
  },
  
  fusion_core: {
    name: 'Fusion Core',
    description: 'All production buildings work 100% faster for 1 hour',
    icon: '⚛️',
    effect: { type: 'global_production_boost', value: 1.0, duration: 3600000 }
  },
  
  stellar_data: {
    name: 'Stellar Knowledge',
    description: 'Grants 100 skill points instantly',
    icon: '🌌',
    effect: { type: 'instant_reward', resource: 'skillPoints', amount: 100 }
  },
  
  war_banner: {
    name: 'War Banner',
    description: 'Increases people recruitment by 200% for 4 hours',
    icon: '🚩',
    effect: { type: 'production_boost', target: 'house', value: 2.0, duration: 14400000 }
  },
  
  fortress_plans: {
    name: 'Fortress Plans',
    description: 'Next fortress upgrade costs 75% less',
    icon: '🏰',
    effect: { type: 'specific_discount', target: 'fortress', value: 0.75, uses: 1 }
  },
  
  temporal_stabilizer: {
    name: 'Temporal Stabilizer',
    description: 'All timers run 50% faster for 2 hours',
    icon: '⏳',
    effect: { type: 'time_acceleration', value: 0.5, duration: 7200000 }
  },
  
  chrono_knowledge: {
    name: 'Chrono Knowledge',
    description: 'Unlocks time-based special abilities',
    icon: '⚡',
    effect: { type: 'unlock', target: 'time_abilities', value: true }
  },
  
  // Новые награды для impossible
  reality_anchor: {
    name: 'Reality Anchor',
    description: 'Prevents all negative effects for 24 hours',
    icon: '⚓',
    effect: { type: 'immunity', target: 'all_debuffs', duration: 86400000 }
  },
  
  chaos_mastery: {
    name: 'Chaos Mastery',
    description: 'Can control chaos effects instead of being harmed by them',
    icon: '🌀',
    effect: { type: 'chaos_control', permanent: true }
  },
  
  divine_blessing: {
    name: 'Divine Blessing',
    description: 'All production permanently increased by 25%',
    icon: '🙏',
    effect: { type: 'permanent_bonus', target: 'all_production', value: 0.25 }
  },
  
  resurrection_power: {
    name: 'Resurrection Power',
    description: 'Can revive lost people from failed raids',
    icon: '💫',
    effect: { type: 'resurrection', uses: 5 }
  },
  
  world_heart: {
    name: 'World Heart',
    description: 'Core fragment that slowly heals the world (-1 chaos per minute)',
    icon: '💚',
    effect: { type: 'passive_healing', target: 'chaos', value: -1, interval: 60000 }
  },
  
  genesis_protocol: {
    name: 'Genesis Protocol',
    description: 'Can create any resource from energy (1 energy = 10 any resource)',
    icon: '🌅',
    effect: { type: 'transmutation', permanent: true }
  },
  
  void_essence: {
    name: 'Void Essence',
    description: 'Can destroy unwanted effects and debuffs permanently',
    icon: '🕳️',
    effect: { type: 'void_cleanse', uses: 10 }
  },
  
  creation_spark: {
    name: 'Creation Spark',
    description: 'Can instantly complete any building or upgrade',
    icon: '✨',
    effect: { type: 'instant_build', uses: 3 }
  },
  
  titan_bond: {
    name: 'Titan Bond',
    description: 'Massive passive bonuses to all aspects of civilization',
    icon: '🤝',
    effect: { type: 'titan_bonuses', permanent: true }
  },
  
  world_builder: {
    name: 'World Builder',
    description: 'Can reshape and redesign the world itself',
    icon: '🌍',
    effect: { type: 'world_reshape', permanent: true }
  }
};

// Обновленная функция проверки разблокировки рейдов
export function isRaidUnlocked(raidDef, gameState) {
  const condition = raidDef.unlockCondition;
  
  if (condition.building) {
    const building = gameState.buildings[condition.building];
    if (!building || building.level < (condition.level || 1)) {
      return false;
    }
  }
  
  // Дополнительные условия для сложных рейдов
  if (raidDef.difficulty === 'advanced') {
    // Требуется определенный прогресс
    const totalSkillPoints = gameState.skillPoints || 0;
    const completedRaids = gameState.raids?.completed?.length || 0;
    
    if (totalSkillPoints < 50 || completedRaids < 10) {
      return false;
    }
  }
  
  if (raidDef.difficulty === 'impossible') {
    // Требуется очень высокий прогресс
    const totalSkillPoints = gameState.skillPoints || 0;
    const completedRaids = gameState.raids?.completed?.length || 0;
    const advancedRaidsCompleted = gameState.raids?.completed?.filter(
      raid => RAID_DEFS.find(def => def.id === raid.raidId)?.difficulty === 'advanced'
    )?.length || 0;
    
    if (totalSkillPoints < 200 || completedRaids < 50 || advancedRaidsCompleted < 5) {
      return false;
    }
  }
  
  return true;
}

export function getDifficultyInfo(difficulty) {
  const difficultyData = {
    beginner: {
      name: 'Beginner',
      color: '#28a745',
      description: 'Low risk expeditions to nearby areas',
      riskRange: '10-25%',
      duration: '1.5-3 minutes',
      requirements: 'Basic resources and small teams'
    },
    intermediate: {
      name: 'Intermediate', 
      color: '#ffc107',
      description: 'Moderate risk raids to dangerous zones',
      riskRange: '25-35%',
      duration: '4-6 minutes',
      requirements: 'Significant resources and larger teams'
    },
    advanced: {
      name: 'Advanced',
      color: '#dc3545',
      description: 'High risk assaults on heavily fortified or corrupted areas',
      riskRange: '40-55%',
      duration: '7-10 minutes',
      requirements: 'Substantial investment and experienced teams'
    },
    impossible: {
      name: 'Impossible',
      color: '#6f42c1',
      description: 'Legendary expeditions that defy reality itself',
      riskRange: '65-85%',
      duration: '12-25 minutes',
      requirements: 'Massive resources and ultimate preparation'
    }
  };
  
  return difficultyData[difficulty] || difficultyData.beginner;
}

// Функция для расчета модификаторов сложности
export function calculateDifficultyModifiers(difficulty, gameState) {
  const modifiers = {
    resourceMultiplier: 1,
    rewardMultiplier: 1,
    experienceMultiplier: 1,
    unlockRequirements: {}
  };
  
  switch (difficulty) {
    case 'beginner':
      modifiers.resourceMultiplier = 1;
      modifiers.rewardMultiplier = 1;
      modifiers.experienceMultiplier = 1;
      break;
      
    case 'intermediate':
      modifiers.resourceMultiplier = 2.5;
      modifiers.rewardMultiplier = 2;
      modifiers.experienceMultiplier = 1.5;
      modifiers.unlockRequirements.minWatchTowerLevel = 2;
      break;
      
    case 'advanced':
      modifiers.resourceMultiplier = 5;
      modifiers.rewardMultiplier = 4;
      modifiers.experienceMultiplier = 3;
      modifiers.unlockRequirements.minWatchTowerLevel = 3;
      modifiers.unlockRequirements.minSkillPoints = 50;
      modifiers.unlockRequirements.minCompletedRaids = 10;
      break;
      
    case 'impossible':
      modifiers.resourceMultiplier = 10;
      modifiers.rewardMultiplier = 8;
      modifiers.experienceMultiplier = 5;
      modifiers.unlockRequirements.minWatchTowerLevel = 4;
      modifiers.unlockRequirements.minSkillPoints = 200;
      modifiers.unlockRequirements.minCompletedRaids = 50;
      modifiers.unlockRequirements.minAdvancedRaids = 5;
      break;
  }
  
  return modifiers;
}

export class RaidManager extends CleanupMixin {
constructor(gameState) {
  super();
  
  this.gameState = gameState;
  this.activeRaid = null;
  this.raidProgress = 0;
  this.raidStartTime = 0;
  this.isRaidInProgress = false;
  this.autoClickerWasActive = false;
  
  this.initializeRaidState();
  this.bindEvents();
  
  // НОВОЕ: Восстанавливаем состояние рейда после загрузки
  this.restoreRaidStateFromSave();
  
  console.log('⚔️ RaidManager initialized');
}

  // Инициализация состояния рейдов
  initializeRaidState() {
    if (!this.gameState.raids) {
      this.gameState.raids = {
        completed: [],
        specialRewards: {},
        statistics: {
          totalRaids: 0,
          successfulRaids: 0,
          resourcesGained: {},
          peopleLost: 0
        }
      };
    }
    
    // Валидация состояния рейдов
    this.validateRaidState();
  }

restoreRaidStateFromSave() {
  if (!this.gameState.raids) return;
  
  const raids = this.gameState.raids;
  
  console.log('🔄 Checking for active raid to restore...', {
    isRaidInProgress: raids.isRaidInProgress,
    activeRaid: raids.activeRaid?.id || 'none',
    startTime: raids.raidStartTime,
    progress: raids.raidProgress
  });
  
  // Проверяем, был ли активный рейд
  if (raids.isRaidInProgress && raids.activeRaid) {
    console.log('🔄 Restoring active raid from save:', raids.activeRaid.name || raids.activeRaid.id);
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Находим полное определение рейда по ID
    const fullRaidDef = this.getRaidDefinition(raids.activeRaid.id);
    if (!fullRaidDef) {
      console.error('❌ Raid definition not found for ID:', raids.activeRaid.id);
      console.log('📝 Available raid definitions:', RAID_DEFS.map(r => r.id));
      
      // Пытаемся восстановить из частичных данных
      if (raids.activeRaid.id && raids.activeRaid.name) {
        console.log('🔧 Attempting to reconstruct raid from partial data...');
        this.activeRaid = {
          id: raids.activeRaid.id,
          name: raids.activeRaid.name,
          difficulty: raids.activeRaid.difficulty || 'unknown',
          duration: 120000, // Стандартная длительность как fallback
          riskPercentage: 20,
          description: 'Restored raid from save data'
        };
      } else {
        this.clearRaidState();
        return;
      }
    } else {
      // Используем полное определение рейда
      this.activeRaid = fullRaidDef;
    }
    
    // Восстанавливаем состояние
    this.isRaidInProgress = raids.isRaidInProgress;
    this.raidStartTime = raids.raidStartTime;
    this.raidProgress = raids.raidProgress;
    this.autoClickerWasActive = raids.autoClickerWasActive;
    
    // ВАЖНАЯ ПРОВЕРКА: Рассчитываем, не истек ли рейд
    const now = Date.now();
    const elapsed = now - this.raidStartTime;
    const raidDuration = this.activeRaid.duration || 120000;
    
    console.log('⏰ Raid timing check:', {
      elapsed: Math.round(elapsed / 1000) + 's',
      duration: Math.round(raidDuration / 1000) + 's',
      remaining: Math.round((raidDuration - elapsed) / 1000) + 's'
    });
    
    if (elapsed >= raidDuration) {
      console.log('⏰ Raid expired while away, completing it...');
      // Рейд завершился пока игрок был в офлайне
      this.completeRaid();
    } else {
      console.log('⚔️ Raid still in progress, resuming...');
      
      // Обновляем прогресс с учетом прошедшего времени
      this.raidProgress = Math.min(100, (elapsed / raidDuration) * 100);
      
      // Обновляем состояние в GameState
      this.saveRaidStateToGameState();
      
      // Блокируем игровое поле
      this.blockGameField(true);
      
      // Запускаем таймер с корректировкой времени
      this.startRaidTimer();
      
      // Уведомляем о возобновлении
      eventBus.emit(GameEvents.NOTIFICATION, `⚔️ Resumed: ${this.activeRaid.name}`);
      
      console.log('✅ Active raid restored and resumed successfully');
    }
  } else {
    console.log('ℹ️ No active raid to restore');
  }
  // НОВОЕ: Проверяем экстренный резерв из localStorage
try {
  const emergencyBackup = localStorage.getItem('emergency_raid_backup');
  if (emergencyBackup && !this.isRaidInProgress) {
    const backupData = JSON.parse(emergencyBackup);
    console.log('🚨 Found emergency raid backup in localStorage:', backupData);
    
    if (backupData.emergencyFlag && backupData.raidId) {
      const raidDef = this.getRaidDefinition(backupData.raidId);
      if (raidDef) {
        console.log('🚨 Restoring raid from emergency backup...');
        
        this.activeRaid = raidDef;
        this.isRaidInProgress = true;
        this.raidStartTime = backupData.startTime;
        this.raidProgress = backupData.progress;
        this.autoClickerWasActive = backupData.autoClickerWasActive;
        
        // Проверяем, не истек ли рейд
        const now = Date.now();
        const elapsed = now - this.raidStartTime;
        
        if (elapsed >= raidDef.duration) {
          console.log('🚨 Emergency backup raid expired, completing...');
          this.completeRaid();
        } else {
          console.log('🚨 Emergency backup raid still active, resuming...');
          this.raidProgress = Math.min(100, (elapsed / raidDef.duration) * 100);
          this.saveRaidStateToGameState();
          this.blockGameField(true);
          this.startRaidTimer();
          
          eventBus.emit(GameEvents.NOTIFICATION, `🚨 Emergency recovery: ${this.activeRaid.name}`);
        }
      }
    }
    
    // Удаляем использованный резерв
    localStorage.removeItem('emergency_raid_backup');
  }
} catch (error) {
  console.warn('⚠️ Error checking emergency backup:', error);
}
}

clearRaidState() {
  console.log('🧹 Clearing invalid raid state...');
  
  this.activeRaid = null;
  this.isRaidInProgress = false;
  this.raidStartTime = 0;
  this.raidProgress = 0;
  this.autoClickerWasActive = false;
  
  // Очищаем в GameState
  if (this.gameState.raids) {
    this.gameState.raids.activeRaid = null;
    this.gameState.raids.isRaidInProgress = false;
    this.gameState.raids.raidStartTime = 0;
    this.gameState.raids.raidProgress = 0;
    this.gameState.raids.autoClickerWasActive = false;
  }
  
  // Разблокируем игровое поле
  this.blockGameField(false);
  
  console.log('✅ Raid state cleared');
}

  // Валидация состояния рейдов
  validateRaidState() {
    const raids = this.gameState.raids;
    
    if (!Array.isArray(raids.completed)) {
      raids.completed = [];
    }
    
    if (!raids.specialRewards || typeof raids.specialRewards !== 'object') {
      raids.specialRewards = {};
    }
    
    if (!raids.statistics || typeof raids.statistics !== 'object') {
      raids.statistics = {
        totalRaids: 0,
        successfulRaids: 0,
        resourcesGained: {},
        peopleLost: 0
      };
    }
  }

  // Привязка событий
  bindEvents() {
    // Слушаем события игры для обновления прогресса
    eventBus.subscribe(GameEvents.BUILDING_BOUGHT, () => {
      // Проверяем разблокировку новых рейдов
      this.checkUnlockedRaids();
    });
  }

  // Проверить разблокированные рейды
  checkUnlockedRaids() {
    RAID_DEFS.forEach(raidDef => {
      if (this.isRaidUnlocked(raidDef)) {
        // Можно добавить уведомление о разблокировке
      }
    });
  }

  // Проверить, разблокирован ли рейд
  isRaidUnlocked(raidDef) {
    const condition = raidDef.unlockCondition;
    
    if (condition.building) {
      const building = this.gameState.buildings[condition.building];
      return building && building.level >= (condition.level || 1);
    }
    
    return true; // По умолчанию разблокирован
  }

  // Проверить, доступен ли рейд для запуска
  canStartRaid(raidId) {
    const raidDef = this.getRaidDefinition(raidId);
    if (!raidDef) return { can: false, reason: 'Raid not found' };
    
    // Проверяем, что нет активного рейда
    if (this.isRaidInProgress) {
      return { can: false, reason: 'Another raid is in progress' };
    }
    
    // Проверяем разблокировку
    if (!this.isRaidUnlocked(raidDef)) {
      return { can: false, reason: 'Raid not unlocked' };
    }
    
    // Проверяем ресурсы
    const resourceCheck = this.checkRaidRequirements(raidDef);
    if (!resourceCheck.canAfford) {
      return { 
        can: false, 
        reason: `Not enough resources: ${resourceCheck.missing.join(', ')}` 
      };
    }
    
    return { can: true };
  }

  // Проверить требования для рейда
  checkRaidRequirements(raidDef) {
    const requirements = raidDef.requirements;
    const missing = [];
    
    Object.entries(requirements).forEach(([resource, required]) => {
      const available = this.gameState.resources[resource] || 0;
      if (available < required) {
        const emoji = getResourceEmoji(resource);
        missing.push(`${required - available} ${emoji} ${resource}`);
      }
    });
    
    return {
      canAfford: missing.length === 0,
      missing
    };
  }

  // Запустить рейд
startRaid(raidId) {
  const canStart = this.canStartRaid(raidId);
  if (!canStart.can) {
    eventBus.emit(GameEvents.NOTIFICATION, `❌ ${canStart.reason}`);
    return false;
  }
  
  const raidDef = this.getRaidDefinition(raidId);
  
  try {
    // Тратим ресурсы
    if (!this.spendRaidRequirements(raidDef)) {
      throw new Error('Failed to spend raid requirements');
    }
    
    // Запускаем рейд
    this.activeRaid = raidDef;
    this.isRaidInProgress = true;
    this.raidStartTime = Date.now();
    this.raidProgress = 0;
    
    // НОВОЕ: Сохраняем состояние в GameState
    this.saveRaidStateToGameState();
    
    // Блокируем игровое поле
    this.blockGameField(true);
    
    // Отключаем автокликер во время рейда
    this.pauseAutoClicker();
    
    // Запускаем таймер рейда
    this.startRaidTimer();
    
    // Уведомления
    eventBus.emit(GameEvents.NOTIFICATION, `⚔️ ${raidDef.name} started!`);
    eventBus.emit(GameEvents.RAID_STARTED, {
      raid: raidDef,
      duration: raidDef.duration
    });
    
    console.log(`⚔️ Raid started: ${raidDef.name} (autoclicker paused)`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to start raid:', error);
    eventBus.emit(GameEvents.NOTIFICATION, `❌ Failed to start raid: ${error.message}`);
    return false;
  }
}

// НОВЫЙ МЕТОД: Приостановить автокликер
pauseAutoClicker() {
  // Проверяем текущий статус автокликера
  const autoClickerStats = this.gameState.skillManager?.getAutoClickerStats?.();
  this.autoClickerWasActive = autoClickerStats?.active || false;
  
  if (this.autoClickerWasActive) {
    // Отправляем событие для остановки автокликера
    eventBus.emit(GameEvents.RAID_AUTOCLICKER_PAUSE);
    console.log('🤖 Auto clicker pause requested for raid');
    
    // Уведомляем игрока
    eventBus.emit(GameEvents.NOTIFICATION, '🤖 Auto clicker paused during raid');
  } else {
    console.log('🤖 Auto clicker was not active, no pause needed');
  }
}

saveRaidStateToGameState() {
  if (!this.gameState.raids) {
    this.gameState.raids = {
      completed: [],
      specialRewards: {},
      statistics: {
        totalRaids: 0,
        successfulRaids: 0,
        resourcesGained: {},
        peopleLost: 0
      }
    };
  }
  
  // Сохраняем текущее состояние активного рейда
  this.gameState.raids.activeRaid = this.activeRaid;
  this.gameState.raids.isRaidInProgress = this.isRaidInProgress;
  this.gameState.raids.raidStartTime = this.raidStartTime;
  this.gameState.raids.raidProgress = this.raidProgress;
  this.gameState.raids.autoClickerWasActive = this.autoClickerWasActive;
  
  console.log('💾 Raid state saved to GameState');
}


// НОВЫЙ МЕТОД: Восстановить автокликер
resumeAutoClicker() {
  if (this.autoClickerWasActive) {
    // Отправляем событие для восстановления автокликера с задержкой
    setTimeout(() => {
      eventBus.emit(GameEvents.RAID_AUTOCLICKER_RESUME);
      console.log('🤖 Auto clicker resume requested after raid');
      
      // Уведомляем игрока
      eventBus.emit(GameEvents.NOTIFICATION, '🤖 Auto clicker resumed');
    }, 500);
  }
  
  // Сбрасываем флаг
  this.autoClickerWasActive = false;
}

  // Потратить ресурсы для рейда
  spendRaidRequirements(raidDef) {
    const requirements = raidDef.requirements;
    
    // Проверяем еще раз перед тратой
    const resourceCheck = this.checkRaidRequirements(raidDef);
    if (!resourceCheck.canAfford) {
      return false;
    }
    
    // Тратим ресурсы
    Object.entries(requirements).forEach(([resource, amount]) => {
      this.gameState.resources[resource] = 
        Math.max(0, this.gameState.resources[resource] - amount);
    });
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
    return true;
  }

  // Заблокировать/разблокировать игровое поле
  blockGameField(block) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    if (block) {
      canvas.style.pointerEvents = 'none';
      canvas.style.opacity = '0.5';
      canvas.style.cursor = 'not-allowed';
      
      // Добавляем оверлей с информацией о рейде
      this.createRaidOverlay();
    } else {
      canvas.style.pointerEvents = '';
      canvas.style.opacity = '';
      canvas.style.cursor = '';
      
      // Убираем оверлей
      this.removeRaidOverlay();
    }
  }

  // Создать оверлей рейда
  createRaidOverlay() {
    const existingOverlay = document.getElementById('raid-overlay');
    if (existingOverlay) return;
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'raid-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      text-align: center;
      z-index: 1000;
      border-radius: 12px;
    `;
    
    overlay.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">⚔️</div>
      <div style="font-size: 16px; margin-bottom: 5px;">RAID IN PROGRESS</div>
      <div id="raid-timer" style="font-size: 14px; opacity: 0.8;">--:--</div>
      <div style="font-size: 12px; margin-top: 10px; opacity: 0.6;">
        ${this.activeRaid ? this.activeRaid.name : 'Unknown Raid'}
      </div>
    `;
    
    // Позиционируем относительно canvas
    const gameContainer = canvas.parentElement;
    gameContainer.style.position = 'relative';
    gameContainer.appendChild(overlay);
    
    this.registerDOMElement(overlay);
  }

  // Убрать оверлей рейда
  removeRaidOverlay() {
    const overlay = document.getElementById('raid-overlay');
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  // Запустить таймер рейда
startRaidTimer() {
  const updateTimer = () => {
    if (!this.isRaidInProgress || !this.activeRaid) return;
    
    const elapsed = Date.now() - this.raidStartTime;
    const remaining = Math.max(0, this.activeRaid.duration - elapsed);
    this.raidProgress = Math.min(100, (elapsed / this.activeRaid.duration) * 100);
    
    // НОВОЕ: Периодически сохраняем прогресс
    this.saveRaidStateToGameState();
    
    // Обновляем таймер в оверлее
    this.updateRaidTimer(remaining);
    
    // Проверяем завершение
    if (remaining <= 0) {
      this.completeRaid();
      return;
    }
    
    // Продолжаем обновление
    this.createTimeout(updateTimer, 1000);
  };
  
  updateTimer();
}

  // Обновить таймер в оверлее
  updateRaidTimer(remainingMs) {
    const timerElement = document.getElementById('raid-timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Завершить рейд
  completeRaid() {
    if (!this.activeRaid) return;
    
    console.log(`⚔️ Completing raid: ${this.activeRaid.name}`);
    
    try {
      // Рассчитываем результат
      const result = this.calculateRaidResult(this.activeRaid);
      
      // Применяем результат
      this.applyRaidResult(result);
      
      // Обновляем статистику
      this.updateRaidStatistics(result);
      
      // Уведомления
      this.showRaidResults(result);
      
      // Завершаем рейд
      this.endRaid();
      
    } catch (error) {
      console.error('❌ Error completing raid:', error);
      eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid completion failed');
      this.endRaid();
    }
  }

  // Рассчитать результат рейда
  calculateRaidResult(raidDef) {
    const result = {
      success: true,
      peopleLost: 0,
      resourcesGained: {},
      specialRewards: [],
      totalValue: 0
    };
    
    // Проверяем риск потерь
    if (Math.random() < raidDef.riskPercentage / 100) {
      result.peopleLost = Math.floor(Math.random() * 2) + 1; // 1-2 people lost
      console.log(`⚔️ Risk event: ${result.peopleLost} people lost`);
    }
    
    // Гарантированные награды
    raidDef.rewards.guaranteed.forEach(reward => {
      const amount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
      result.resourcesGained[reward.resource] = amount;
      result.totalValue += amount;
    });
    
    // Случайные награды
    raidDef.rewards.chance.forEach(chanceReward => {
      if (Math.random() < chanceReward.probability) {
        if (chanceReward.reward.type === 'special') {
          result.specialRewards.push(chanceReward.reward.id);
        } else {
          const existing = result.resourcesGained[chanceReward.reward.resource] || 0;
          result.resourcesGained[chanceReward.reward.resource] = 
            existing + chanceReward.reward.amount;
          result.totalValue += chanceReward.reward.amount;
        }
        console.log(`⚔️ Bonus reward: ${chanceReward.description}`);
      }
    });
    
    return result;
  }

  // Применить результат рейда
  applyRaidResult(result) {
    // Потери людей
    if (result.peopleLost > 0) {
      const currentPeople = this.gameState.resources.people || 0;
      this.gameState.resources.people = Math.max(0, currentPeople - result.peopleLost);
    }
    
    // Полученные ресурсы
    Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
      this.gameState.resources[resource] = 
        (this.gameState.resources[resource] || 0) + amount;
    });
    
    // Специальные награды
    result.specialRewards.forEach(rewardId => {
      this.gameState.raids.specialRewards[rewardId] = 
        (this.gameState.raids.specialRewards[rewardId] || 0) + 1;
    });
    
    eventBus.emit(GameEvents.RESOURCE_CHANGED);
  }

  // Обновить статистику рейдов
  updateRaidStatistics(result) {
    const stats = this.gameState.raids.statistics;
    
    stats.totalRaids++;
    if (result.success) {
      stats.successfulRaids++;
    }
    stats.peopleLost += result.peopleLost;
    
    // Статистика ресурсов
    Object.entries(result.resourcesGained).forEach(([resource, amount]) => {
      stats.resourcesGained[resource] = 
        (stats.resourcesGained[resource] || 0) + amount;
    });
    
    // Добавляем в историю завершенных рейдов
    this.gameState.raids.completed.push({
      raidId: this.activeRaid.id,
      timestamp: Date.now(),
      result
    });
    
    // Ограничиваем историю
    if (this.gameState.raids.completed.length > 50) {
      this.gameState.raids.completed = this.gameState.raids.completed.slice(-25);
    }
  }

  // Показать результаты рейда
  showRaidResults(result) {
    let message = `⚔️ ${this.activeRaid.name} completed!\n\n`;
    
    // Потери
    if (result.peopleLost > 0) {
      message += `💀 Lost ${result.peopleLost} people\n`;
    }
    
    // Ресурсы
    const resourceLines = Object.entries(result.resourcesGained).map(([resource, amount]) => {
      const emoji = getResourceEmoji(resource);
      return `${emoji} +${amount} ${resource}`;
    });
    
    if (resourceLines.length > 0) {
      message += `\n📦 Resources gained:\n${resourceLines.join('\n')}`;
    }
    
    // Специальные награды
    if (result.specialRewards.length > 0) {
      const specialLines = result.specialRewards.map(rewardId => {
        const reward = SPECIAL_REWARDS[rewardId];
        return `${reward ? reward.icon : '🎁'} ${reward ? reward.name : rewardId}`;
      });
      message += `\n\n✨ Special rewards:\n${specialLines.join('\n')}`;
    }
    
    // Показываем модальное окно с результатами
    if (this.gameState.modalManager) {
      this.gameState.modalManager.showInfoModal('Raid Complete', message.replace(/\n/g, '<br>'));
    } else {
      eventBus.emit(GameEvents.NOTIFICATION, message.split('\n')[0]);
    }
  }

  // Завершить рейд
endRaid() {
  this.activeRaid = null;
  this.isRaidInProgress = false;
  this.raidProgress = 0;
  this.raidStartTime = 0;
  
  // НОВОЕ: Очищаем состояние рейда в GameState
  if (this.gameState.raids) {
    this.gameState.raids.activeRaid = null;
    this.gameState.raids.isRaidInProgress = false;
    this.gameState.raids.raidStartTime = 0;
    this.gameState.raids.raidProgress = 0;
    this.gameState.raids.autoClickerWasActive = false;
  }
  
  // Разблокируем игровое поле
  this.blockGameField(false);
  
  // Восстанавливаем автокликер после рейда
  this.resumeAutoClicker();
  
  eventBus.emit(GameEvents.RAID_COMPLETED, {
    timestamp: Date.now()
  });
  
  console.log('⚔️ Raid ended (autoclicker resumed)');
}

  // Отменить рейд (для экстренных случаев)
cancelRaid() {
  if (!this.isRaidInProgress) return false;
  
  console.log('⚔️ Cancelling raid...');
  
  // Возвращаем ресурсы (50% штраф)
  if (this.activeRaid) {
    Object.entries(this.activeRaid.requirements).forEach(([resource, amount]) => {
      const refund = Math.floor(amount * 0.5);
      this.gameState.resources[resource] = 
        (this.gameState.resources[resource] || 0) + refund;
    });
  }
  
  this.endRaid(); // Это автоматически восстановит автокликер
  
  eventBus.emit(GameEvents.NOTIFICATION, '❌ Raid cancelled (Auto clicker resumed)');
  eventBus.emit(GameEvents.RESOURCE_CHANGED);
  
  return true;
}


  // Получить определение рейда
  getRaidDefinition(raidId) {
    return RAID_DEFS.find(raid => raid.id === raidId);
  }

  // Получить все доступные рейды
  getAvailableRaids() {
    return RAID_DEFS.filter(raid => this.isRaidUnlocked(raid));
  }

  // Получить информацию о рейде
  getRaidInfo(raidId) {
    const raidDef = this.getRaidDefinition(raidId);
    if (!raidDef) return null;
    
    const canStart = this.canStartRaid(raidId);
    const requirements = this.checkRaidRequirements(raidDef);
    
    return {
      ...raidDef,
      unlocked: this.isRaidUnlocked(raidDef),
      canStart: canStart.can,
      canStartReason: canStart.reason,
      requirementsMet: requirements.canAfford,
      missingRequirements: requirements.missing,
      durationText: this.formatDuration(raidDef.duration),
      completedCount: this.gameState.raids.completed.filter(c => c.raidId === raidId).length
    };
  }

  // Получить текущий статус рейда
  getCurrentRaidStatus() {
    if (!this.isRaidInProgress) {
      return { inProgress: false };
    }
    
    const elapsed = Date.now() - this.raidStartTime;
    const remaining = Math.max(0, this.activeRaid.duration - elapsed);
    
    return {
      inProgress: true,
      raid: this.activeRaid,
      progress: this.raidProgress,
      timeRemaining: remaining,
      timeRemainingText: this.formatDuration(remaining)
    };
  }

  // Форматировать длительность
  formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Получить статистику рейдов
  getRaidStatistics() {
    return {
      ...this.gameState.raids.statistics,
      successRate: this.gameState.raids.statistics.totalRaids > 0 ?
        (this.gameState.raids.statistics.successfulRaids / this.gameState.raids.statistics.totalRaids * 100).toFixed(1) + '%' :
        '0%',
      totalCompletedRaids: this.gameState.raids.completed.length,
      specialRewardsCount: Object.values(this.gameState.raids.specialRewards).reduce((sum, count) => sum + count, 0)
    };
  }

  // Получить специальные награды
  getSpecialRewards() {
    return Object.entries(this.gameState.raids.specialRewards).map(([rewardId, count]) => {
      const rewardDef = SPECIAL_REWARDS[rewardId];
      return {
        id: rewardId,
        count,
        definition: rewardDef,
        name: rewardDef ? rewardDef.name : rewardId,
        icon: rewardDef ? rewardDef.icon : '🎁'
      };
    }).filter(reward => reward.count > 0);
  }

  // Использовать специальную награду
  useSpecialReward(rewardId) {
    const currentCount = this.gameState.raids.specialRewards[rewardId] || 0;
    if (currentCount <= 0) return false;
    
    const rewardDef = SPECIAL_REWARDS[rewardId];
    if (!rewardDef) return false;
    
    try {
      // Применяем эффект (пример для Ancient Blueprint)
      if (rewardId === 'ancient_blueprint') {
        // Устанавливаем временную скидку на здания
        this.gameState.tempBuildingDiscount = {
          discount: rewardDef.effect.value,
          uses: rewardDef.effect.uses
        };
        
        eventBus.emit(GameEvents.NOTIFICATION, `📜 ${rewardDef.name} activated! Next building 10% cheaper`);
      }
      
      // Уменьшаем количество
      this.gameState.raids.specialRewards[rewardId]--;
      if (this.gameState.raids.specialRewards[rewardId] <= 0) {
        delete this.gameState.raids.specialRewards[rewardId];
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Error using special reward:', error);
      return false;
    }
  }

  // Проверить готовность для рейдов (есть ли Watch Tower)
  isRaidSystemUnlocked() {
    const watchTower = this.gameState.buildings?.watchTower;
    return watchTower && watchTower.level >= 1;
  }

  // Деструктор
  destroy() {
    console.log('🧹 RaidManager cleanup started');
    
    // Отменяем активный рейд если есть
    if (this.isRaidInProgress) {
      this.endRaid();
    }
    
    super.destroy();
    
    console.log('✅ RaidManager destroyed');
  }
}

// Добавляем новые события для рейдов
export const RAID_EVENTS = {
  RAID_STARTED: 'raid:started',
  RAID_COMPLETED: 'raid:completed',
  RAID_CANCELLED: 'raid:cancelled',
  SPECIAL_REWARD_USED: 'raid:special_reward_used'
};