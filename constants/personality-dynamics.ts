// ============================================
// IS-SHEX 人格动力学 - 状态-特质动力学模型
// Level VI: State-Trait Dynamics Model
// ============================================

import {
  HexacoProfile,
  HexacoFacets,
  MetaTraits,
  PersonalityState,
  MoodState,
} from '../meta';

// ============================================
// 人格状态转移模型
// 个体心理状态在不同稳健度等级间转移
// ============================================

/** 人格状态等级 */
export const PERSONALITY_STATE_LEVELS = {
  INTEGRATED: { code: 'I', alphaThreshold: 65, description: '行为与核心人格高度一致' },
  ADAPTIVE: { code: 'A', alphaThreshold: 40, description: '正常范围内的弹性适应' },
  STRESSED: { code: 'S', alphaThreshold: 25, description: '行为开始偏离常态' },
  DISSOCIATED: { code: 'D', alphaThreshold: 0, description: '影子人格激活' },
} as const;


/** 计算状态转移概率 */
export function calculateStateTransitionProbability(
  currentState: PersonalityState,
  stressLevel: number,      // 0-100
  psychCapital: number,     // 心理资本 0-100
  recoveryRate: number      // 恢复速率 0-1
): Record<PersonalityState, number> {
  const stressFactor = stressLevel / 100;
  const resilience = psychCapital / 100;
  const recovery = recoveryRate;

  // 基础转移矩阵（根据压力调整）
  const baseMatrix: Record<PersonalityState, Record<PersonalityState, number>> = {
    integrated: {
      integrated: 0.85 - stressFactor * 0.3,
      adaptive: 0.10 + stressFactor * 0.2,
      stressed: 0.04 + stressFactor * 0.08,
      dissociated: 0.01 + stressFactor * 0.02,
    },
    adaptive: {
      integrated: 0.15 * recovery * resilience,
      adaptive: 0.70 - stressFactor * 0.2,
      stressed: 0.12 + stressFactor * 0.15,
      dissociated: 0.03 + stressFactor * 0.05,
    },
    stressed: {
      integrated: 0.05 * recovery * resilience,
      adaptive: 0.20 * recovery,
      stressed: 0.60 - stressFactor * 0.1,
      dissociated: 0.15 + stressFactor * 0.1,
    },
    dissociated: {
      integrated: 0.02 * recovery * resilience,
      adaptive: 0.08 * recovery,
      stressed: 0.30 * recovery,
      dissociated: 0.60 - recovery * 0.2,
    },
  };

  return baseMatrix[currentState];
}

// ============================================
// 影子人格 (Shadow Personality)
// 当α崩溃时，被压抑的人格侧面涌现
// ============================================

/** 计算影子特质分数 */
export function calculateShadowTrait(baselineScore: number): number {
  return 100 - baselineScore;
}

/** 影子人格爆发模式 */
export const SHADOW_ERUPTION_PATTERNS: Record<keyof HexacoProfile, {
  shadowBehavior: string;
  triggerCondition: string;
  description: string;
}> = {
  H: {
    shadowBehavior: '爆发性贪婪或欺骗',
    triggerCondition: '长期被剥削、信任被严重背叛',
    description: '平时诚实的人突然展现出操纵性',
  },
  E: {
    shadowBehavior: '情感麻木、冷漠',
    triggerCondition: '创伤后解离、情感过载',
    description: '敏感的人变得异常冷漠',
  },
  X: {
    shadowBehavior: '过度社交、寻求关注',
    triggerCondition: '长期孤立后的补偿性行为',
    description: '内向者突然变得极度外向',
  },
  A: {
    shadowBehavior: '刻薄易怒、攻击性',
    triggerCondition: '长期压抑愤怒、边界被反复侵犯',
    description: '温和的人爆发出强烈敌意',
  },
  C: {
    shadowBehavior: '冲动放纵、暴食酗酒',
    triggerCondition: '长期过度控制、完美主义崩溃',
    description: '自律者陷入混乱失控',
  },
  O: {
    shadowBehavior: '激进颠覆、破坏规则',
    triggerCondition: '僵化系统崩溃、认知失调',
    description: '传统者变成激进的破坏者',
  },
};

// ============================================
// 特质疲劳与恢复性生态位
// ============================================

/** 计算特质疲劳 */
export function calculateTraitFatigue(
  cumulativeTime: number,      // 累积时间（分钟）
  behaviorScore: number,       // 表现行为分数
  baselineScore: number,       // 核心特质分数
  situationIntensity: number   // 情境强度 0-1
): number {
  const deviation = Math.abs(behaviorScore - baselineScore);
  return cumulativeTime * deviation * situationIntensity / 100;
}

/** 恢复性生态位配置 */
export const RESTORATIVE_NICHES: Record<keyof HexacoProfile, {
  highTrait: { fatigueSource: string; restorativeNiche: string };
  lowTrait: { fatigueSource: string; restorativeNiche: string };
}> = {
  H: {
    highTrait: { fatigueSource: '被迫妥协道德原则', restorativeNiche: '独处反思、道德讨论' },
    lowTrait: { fatigueSource: '被迫遵守严格规则', restorativeNiche: '自由竞争环境' },
  },
  E: {
    highTrait: { fatigueSource: '被迫冒险或独立应对', restorativeNiche: '安全屋、亲友倾诉、熟悉环境' },
    lowTrait: { fatigueSource: '被迫表达情感或依赖他人', restorativeNiche: '独立任务、理性讨论空间' },
  },
  X: {
    highTrait: { fatigueSource: '被迫长期独处', restorativeNiche: '聚会、舞台、社交活动' },
    lowTrait: { fatigueSource: '被迫长期社交', restorativeNiche: '独处空间、安静环境' },
  },
  A: {
    highTrait: { fatigueSource: '被迫对抗或竞争', restorativeNiche: '和谐环境、合作任务' },
    lowTrait: { fatigueSource: '被迫妥协或顺从', restorativeNiche: '竞争环境、独立决策' },
  },
  C: {
    highTrait: { fatigueSource: '被迫即兴或混乱环境', restorativeNiche: '有序空间、计划制定' },
    lowTrait: { fatigueSource: '被迫严格遵守计划', restorativeNiche: '自由时间、无结构活动' },
  },
  O: {
    highTrait: { fatigueSource: '被迫遵循僵化规则', restorativeNiche: '艺术展、异域旅行、创意项目' },
    lowTrait: { fatigueSource: '被迫面对过多新异刺激', restorativeNiche: '熟悉环境、例行程序' },
  },
};

// ============================================
// 情绪-认知-行为三角动力学
// ============================================

/** 人格特质在三角系统中的作用 */
export const TRAIT_SYSTEM_ROLES = {
  E: { system: 'emotion', role: '影响情绪系统的基线反应性' },
  O: { system: 'cognition', role: '影响认知系统的开放性与灵活性' },
  C: { system: 'behavior', role: '影响行为系统的控制与执行' },
  X: { system: 'behavior', role: '影响行为系统的能量输出' },
  A: { system: 'emotion_cognition', role: '影响情绪系统的愤怒阈值与认知系统的归因模式' },
  H: { system: 'cognition_behavior', role: '影响认知系统的道德推理与行为系统的策略选择' },
} as const;

// ============================================
// 行为权重计算 (替代旧的 PersonalityWeight)
// ============================================


// ============================================
// 情绪状态映射
// ============================================

/** 从HEXACO预测情绪倾向 */
export function predictMoodTendency(
  profile: HexacoProfile,
  facets: HexacoFacets,
  currentStress: number,
  currentSanity: number
): MoodState {
  const { E, X, A, C } = profile;

  // 麻木：长期高压 + 低理智 + 高E
  if (currentStress > 85 && currentSanity < 35 && E > 50) {
    return MoodState.NUMB;
  }

  // 恐惧：极低理智 + 高E.恐惧
  if (currentSanity < 25 || (currentSanity < 40 && facets.fearfulness > 70)) {
    return MoodState.FEARFUL;
  }

  // 狂喜：高X.活力 + 低压力 + 高E.感伤
  if (facets.liveliness > 70 && currentStress < 30 && facets.sentimentality > 60) {
    return MoodState.EUPHORIC;
  }

  // 焦虑：高E.焦虑 + 高压力
  if (facets.anxiety > 60 && currentStress > 50) {
    return MoodState.ANXIOUS;
  }

  // 易怒：低A.耐心 + 高压力
  if (facets.patience < 40 && currentStress > 60) {
    return MoodState.IRRITABLE;
  }

  // 忧郁：高E.感伤 + 低理智
  if (facets.sentimentality > 60 && currentSanity < 50) {
    return MoodState.MELANCHOLY;
  }

  return MoodState.CONTENT;
}

