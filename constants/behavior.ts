
// ============================================
// 少女行为系统常量 (Maiden Behavior Constants)
// ============================================

import { CarriageFunction, CharacterStatus } from '../meta/type';

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
            requiredFunction: 'pray' as CarriageFunction,
            avgDevotionThreshold: 50,
            probability: 0.02,
            description: '几个少女自发地聚在一起，开始共同祈祷',
        },
        WHISPERED_GOSSIP: {
            minSize: 2,
            requiredFunction: null, // 任何车厢
            avgStressThreshold: 40,
            probability: 0.03,
            description: '几个少女凑在一起，窃窃私语',
        },
        COMFORT_CIRCLE: {
            minSize: 3,
            requiredFunction: 'rest' as CarriageFunction,
            avgSanityThreshold: 50, // 低于此值触发
            probability: 0.02,
            description: '几个少女围坐在一起，互相安慰',
        },
        SHARED_MEAL: {
            minSize: 2,
            requiredFunction: 'eat' as CarriageFunction,
            avgHungerThreshold: 50,
            probability: 0.04,
            description: '几个少女一起用餐',
        },
        COLLECTIVE_BATHING: {
            minSize: 2,
            requiredFunction: 'bathe' as CarriageFunction,
            probability: 0.05,
            description: '几个少女一同在浴池中沐浴',
        },
    },
} as const;

// ============================================
// 角色状态名称映射
// ============================================

/**
 * 状态短标签，用于卡片与列表上的徽标。
 *
 * 与下面的 `ACTIVITY_STATUS_NAMES` 是两套措辞而非重复：这里是两三个字的标签
 * （"睡眠"），那里是叙述句（"正在睡眠"），后者会嵌进日志行文。两处都保留，
 * 但**同一个状态在两个组件里必须显示同一个标签**，所以标签只有这一份。
 */
export const STATUS_LABELS: Record<CharacterStatus, string> = {
    'normal': '正常',
    'panicked': '恐惧',
    'aroused': '动情',
    'injured': '受伤',
    'broken': '崩溃',
    'pregnant': '怀孕',
    'euphoric': '极乐',
    'dissociated': '解离',
    'devoted': '虔诚',
    'complicit': '共犯',
    'voyeur': '窥伺',
    'deaconess': '执事',
    'gestating': '孕育',
    'performing': '表演',
    'confessing': '忏悔',
    'anchoring': '锚定',
    'sleeping': '睡眠',
    'eating': '进食',
    'bathing': '沐浴',
    'wandering': '游荡',
    'chatting': '交谈',
    'observing': '观测',
};

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
