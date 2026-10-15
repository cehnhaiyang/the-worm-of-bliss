
// ============================================
// 少女行为系统常量 (Maiden Behavior Constants)
// ============================================

import {
  CarriageType,
  CarriageFunction,
} from '../meta';
import { CharacterStatus } from '../meta/type';

// ============================================
// 需求紧急度阈值
// Need urgency thresholds
// ============================================

export const NEED_THRESHOLDS = {
  CRITICAL: 95,    // 危急：立即行动
  URGENT: 85,      // 紧急：优先处理
  HIGH: 70,        // 高：尽快处理
  MODERATE: 50,    // 中等：有空处理
  LOW: 30,         // 低：可忽略
} as const;

// ============================================
// 车厢功能映射
// Carriage function mapping
// ============================================

export const CARRIAGE_FUNCTIONS: Record<CarriageType, CarriageFunction> = {
  // 圣所区域
  'ATRIUM': { canSleep: true, canEat: true, canBathe: false, canPray: false, canSocialize: true, comfortLevel: 0.8 },
  'POOLS': { canSleep: false, canEat: false, canBathe: true, canPray: false, canSocialize: true, comfortLevel: 0.9 },
  'VEIL': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: true, comfortLevel: 0.5 },
  'CONFESSIONAL': { canSleep: false, canEat: false, canBathe: false, canPray: true, canSocialize: false, comfortLevel: 0.3 },
  'ARCHIVE': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.4 },
  'MUSE_THEATRE': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: true, comfortLevel: 0.3 },
  'SCALES_CONSERVATORY': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: true, comfortLevel: 0.5 },
  'GARDEN': { canSleep: true, canEat: false, canBathe: false, canPray: false, canSocialize: true, comfortLevel: 0.9 },
  'NURSERY': { canSleep: true, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.7 },
  'ALTAR': { canSleep: false, canEat: false, canBathe: false, canPray: true, canSocialize: false, comfortLevel: 0.2 },
  'CAULDRON': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  // 深渊区域 - 全部不适合日常活动
  'SILENT_SALON': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.1 },
  'ORACLE_WHISPER': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.1 },
  'NEGATIVE_GALLERY': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.1 },
  'ESCHER_STAIRS': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'MIRROR_HALL': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'TIME_INFIRMARY': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'DISSOLUTION_CHAMBER': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'FLESH_HIVE': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'INVERTED_TREE': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'SYMBIOTIC_GALLERY': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'VOID_WINDOW': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
  'ENTROPY_CLOCK': { canSleep: false, canEat: false, canBathe: false, canPray: false, canSocialize: false, comfortLevel: 0.0 },
};

// ============================================
// 情绪状态系统 (Mood System)
// 影响少女的行为决策和社交倾向
// ============================================

// ============================================
// 群体行为触发 (Group Behavior Triggers)
// 当多个少女在同一车厢时可能触发的群体行为
// ============================================

export const GROUP_BEHAVIOR_CONFIG = {
  // 最小人数要求
  MIN_GROUP_SIZE: 3,

  // 群体行为类型
  BEHAVIORS: {
    COLLECTIVE_PRAYER: {
      minSize: 3,
      requiredCarriage: ['ALTAR', 'CONFESSIONAL'],
      avgDevotionThreshold: 50,
      probability: 0.02,
      description: '几个少女自发地聚在一起，开始共同祈祷',
    },
    WHISPERED_GOSSIP: {
      minSize: 2,
      requiredCarriage: null, // 任何车厢
      avgStressThreshold: 40,
      probability: 0.03,
      description: '几个少女凑在一起，窃窃私语',
    },
    COMFORT_CIRCLE: {
      minSize: 3,
      requiredCarriage: ['GARDEN', 'ATRIUM', 'NURSERY'],
      avgSanityThreshold: 50, // 低于此值触发
      probability: 0.02,
      description: '几个少女围坐在一起，互相安慰',
    },
    SHARED_MEAL: {
      minSize: 2,
      requiredCarriage: ['ATRIUM'],
      avgHungerThreshold: 50,
      probability: 0.04,
      description: '几个少女一起用餐',
    },
    COLLECTIVE_BATHING: {
      minSize: 2,
      requiredCarriage: ['POOLS'],
      probability: 0.05,
      description: '几个少女一同在浴池中沐浴',
    },
  },
} as const;

// ============================================
// 角色状态名称映射
// ============================================

/**
 * 活动状态名称映射（用于状态描述）
 */
export const ACTIVITY_STATUS_NAMES: Record<CharacterStatus, string> = {
  'sleeping': '正在睡眠',
  'eating': '正在进食',
  'bathing': '正在沐浴',
  'wandering': '四处游荡',
  'chatting': '与人交谈',
  'confessing': '正在忏悔',
  'devoted': '虔诚祈祷',
  'normal': '状态正常',
  'panicked': '惊恐不安',
  'aroused': '情欲高涨',
  'broken': '精神崩溃',
  'injured': '身体受伤',
  'pregnant': '怀有身孕',
  'euphoric': '极度愉悦',
  'dissociated': '意识游离',
  'complicit': '堕落共犯',
  'voyeur': '窥视者',
  'deaconess': '执事',
  'gestating': '孕育中',
  'performing': '表演中',
  'anchoring': '锚定中',
  'observing': '正在观测',
};
