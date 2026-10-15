
// ============================================
// 游戏系统配置 (Game System Configuration)
// 所有可调参数集中管理
// ============================================

/**
 * 游戏核心配置
 * 包含所有可调节的游戏参数
 */
export const GAME_CONFIG = {
  // ========== 车厢网格 (Carriage Grid) ==========
  /** 网格行数 (5行) */
  GRID_ROWS: 5,
  /** 网格列数 (50列) */
  GRID_COLS: 50,
  /** 总车厢数 (5×50=250) */
  TOTAL_CARRIAGES: 250,
  /** 地图视口大小 */
  VIEWPORT_SIZE: 10,

  // ========== 少女系统 (Maiden System) ==========
  /** 少女总数 */
  TOTAL_MAIDENS: 250,

  // ========== 时间系统 (Time System) ==========
  /** Tick间隔(毫秒) - 游戏心跳 */
  TICK_INTERVAL_MS: 1000,
  /** 枢纽重组间隔(毫秒) - 10分钟 */
  HUB_SHUFFLE_INTERVAL_MS: 10 * 60 * 1000,
  /** 枢纽重组触发概率 */
  HUB_SHUFFLE_CHANCE: 0.3,
  /** 神恩检查间隔(毫秒) - 5分钟 */
  GRACE_CHECK_INTERVAL_MS: 5 * 60 * 1000,
  /** 自动神恩触发概率 */
  AUTO_GRACE_CHANCE: 0.2,
  /** 自动存档间隔(毫秒) - 5分钟 */
  AUTOSAVE_INTERVAL_MS: 5 * 60 * 1000,

  // ========== 初始系统状态 (Initial System State) ==========
  /** 初始共振频率 (共振圣歌) */
  INITIAL_RESONANCE: 18,
  /** 初始熵值 (枢纽系统稳定性) */
  INITIAL_ENTROPY: 5,
  /** 初始神恩池 */
  INITIAL_GRACE_POOL: 100,
  /** 初始周期数 */
  INITIAL_CYCLE: 127,
  /** 最大共振频率 */
  MAX_RESONANCE: 50,
  /** 最小共振频率 */
  MIN_RESONANCE: 0,

  // ========== 属性阈值 (Attribute Thresholds) ==========
  THRESHOLDS: {
    /** 理智临界值 - 触发崩溃 */
    SANITY_CRITICAL: 30,
    /** 理智低值 - 恢复崩溃 */
    SANITY_LOW: 50,
    /** 欲望高值 - 触发动情 */
    LUST_HIGH: 70,
    /** 欲望正常值 - 恢复动情 */
    LUST_NORMAL: 50,
    /** 压力高值 - 触发恐惧 */
    STRESS_HIGH: 80,
    /** 堕落共犯阈值 */
    CORRUPTION_COMPLICIT: 50,
    /** 虔诚狂热阈值 */
    DEVOTION_FANATIC: 70,
    /** 饥饿紧急值 */
    HUNGER_URGENT: 85,
    /** 疲劳耗尽值 */
    FATIGUE_EXHAUSTED: 90,
    /** 清洁脏污值 */
    HYGIENE_DIRTY: 30,
  },

  // ========== 属性变化速率 (Attribute Change Rates) ==========
  // 单位：每游戏分钟变化量
  RATES: {
    /** 饥饿增长 */
    HUNGER_INCREASE: 0.05,
    /** 疲劳增长 */
    FATIGUE_INCREASE: 0.03,
    /** 清洁下降 */
    HYGIENE_DECREASE: 0.02,
    /** 深渊理智流失 */
    SANITY_ABYSS_DRAIN: 0.5,
    /** 深渊压力增长 */
    STRESS_ABYSS_GAIN: 0.3,
    /** 睡眠理智恢复 */
    SANITY_SLEEP_REGEN: 0.5,
    /** 睡眠疲劳恢复 */
    FATIGUE_SLEEP_REGEN: 2.0,
    /** 进食饥饿恢复 */
    HUNGER_EAT_REGEN: 3.0,
    /** 沐浴清洁恢复 */
    HYGIENE_BATH_REGEN: 5.0,
    /** 沐浴压力恢复 */
    STRESS_BATH_REGEN: 0.5,
    /** 关系衰减率 */
    RELATIONSHIP_DECAY: 0.001,
  },

  // ========== 活动持续时间 (Activity Durations) ==========
  // 单位：游戏分钟
  DURATIONS: {
    /** 睡眠时长 (8小时) */
    SLEEP: 480,
    /** 进食时长 */
    EAT: 45,
    /** 沐浴时长 */
    BATH: 60,
    /** 游荡时长 */
    WANDER: 30,
    /** 忏悔时长 */
    CONFESS: 20,
    /** 时长随机波动范围 (±40%) */
    DURATION_VARIANCE: 0.4,
  },

  // ========== 怀孕系统 (Pregnancy System) ==========
  PREGNANCY: {
    /** 总孕周 */
    TOTAL_WEEKS: 40,
    /** 发现怀孕周数 */
    DISCOVERY_WEEK: 4,
    /** 胎动周数 */
    MOVEMENT_WEEK: 20,
    /** 晚期开始周数 */
    LATE_WEEK: 28,
    /** 临产准备周数 */
    IMMINENT_WEEK: 36,
    /** 并发症概率 */
    COMPLICATION_CHANCE: 0.02,
    /** 并发症风险增加 */
    COMPLICATION_RISK_INCREASE: 10,
  },

  // ========== 日志系统 (Log System) ==========
  /** 最大日志保留数 */
  MAX_LOGS: 500,
  /** 存档保留日志数 */
  SAVE_LOGS_COUNT: 100,

  // ========== 神恩系统 (Grace System) ==========
  GRACE: {
    /** 压力减少 */
    STRESS_REDUCTION: 15,
    /** 虔诚增加 */
    DEVOTION_INCREASE: 5,
    /** 理智增加 */
    SANITY_INCREASE: 2,
  },

  // ========== 情绪系统 (Mood System) ==========
  MOOD: {
    /** 情绪最小持续时间 (ms) - 5分钟 */
    MIN_DURATION: 5 * 60 * 1000,
    /** 自发行为冷却时间 (ms) - 2分钟 */
    ACTION_COOLDOWN: 2 * 60 * 1000,
  },

  // ========== 水仙协议 (Narcissus Protocol) ==========
  NARCISSUS: {
    /** 最少在车天数要求 */
    MIN_DAYS_ON_TRAIN: 30,
    /** 最少深渊暴露次数 */
    MIN_ABYSS_EXPOSURE: 3,
    /** 理智范围要求 [最小, 最大] */
    SANITY_RANGE: [20, 70] as [number, number],
    /** 外界褪色速率系数 (level = days * rate) */
    FADING_RATE: 2,
    /** 触发邀请的褪色阈值 */
    INVITATION_THRESHOLD: 70,
  },
} as const;

// ========== 动态管理常量 (Dynamic Management) ==========

/** 变化追踪阈值 - 用于生成状态变化日志 */
export const CHANGE_THRESHOLDS = {
  sanityCritical: 30,
  sanityRecovered: 50,
  stressHigh: 80,
  stressRelieved: 60,
  lustHigh: 70,
  lustNormal: 50,
  hungerUrgent: 85,
  fatigueExhausted: 90,
  hygieneDirty: 30,
} as const;

/** 立绘更新属性阈值 - 跨越时触发立绘更新 */
export const PORTRAIT_THRESHOLDS = {
  lust: [25, 50, 75],
  sanity: [75, 50, 25],
  obedience: [25, 50, 75],
  stress: [25, 50, 75],
  corruption: [25, 50, 75],
  devotion: [25, 50, 75],
} as const;

/** 怀孕里程碑周数 - 触发立绘更新 */
export const PORTRAIT_PREGNANCY_MILESTONES = [4, 12, 20, 28, 36, 40] as const;

/** 最小立绘更新间隔 (毫秒) */
export const MIN_PORTRAIT_UPDATE_INTERVAL = 30000;

// 类型导出
export type GameConfigType = typeof GAME_CONFIG;
