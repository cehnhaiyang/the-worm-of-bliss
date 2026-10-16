import {
  Carriage,
  Maiden,
  MaidenSummary,
  CarriageType,
  CharacterStatus,
  PersonalityState,
  LogType,
  SocialInteractionType,
  StateChange,
  SystemState,
  GameEvent,
  EventEffectContext,
  RelationshipNetworkData,
  PregnancyData,
  EventTimestampData,
  EventType,
  clamp, deepCopy, getCurrentCarriageId
} from '../../../meta';
import {
  NEED_THRESHOLDS,
  CHANGE_THRESHOLDS,
  ACTIVITY_STATUS_NAMES,
  GAME_CONFIG,
  CARRIAGE_TYPE_INFO,
  TIME_CONFIG,
  CARRIAGE_FUNCTIONS,
  PERSONALITY_MODS,
} from '../../../constants';

// 导入子模块
import { maidenGenerator } from './MaidenGenerator';
import { maidenBehavior } from './MaidenBehavior';
import { maidenSocialization } from './MaidenSocialization';
import { maidenRandomEvent } from './MaidenRandomEvent';
import { maidenMemory } from './MaidenMemory';
import { maidenPregnancy } from './MaidenPregnancy';
import { maidenRelationship } from './MaidenRelationship';
import { maidenNarcissus } from './MaidenNarcissus';
import { maidenClothing } from './MaidenClothing';
import { maidenMood } from './MaidenMood';

// 导入外部服务
import { aiService } from '../../services';

/** 值得追踪开始/结束的活动 */
const TRACKABLE_ACTIVITIES: CharacterStatus[] = [
  'sleeping', 'eating', 'bathing', 'confessing', 'devoted', 'performing', 'observing',
];

/** 不值得记录的普通状态 */
const INSIGNIFICANT_STATUSES: CharacterStatus[] = [
  'normal', 'sleeping', 'eating', 'bathing', 'wandering', 'chatting',
];

export const ACTIVITY_END_DESCRIPTIONS: Record<CharacterStatus, string[]> = {
  'sleeping': ['醒来', '睡眠结束', '休息完毕'],
  'eating': ['进食结束', '用餐完毕', '吃饱了'],
  'bathing': ['沐浴结束', '洗浴完毕', '清洁完成'],
  'wandering': ['停止游荡', '结束游荡', '停止走动'],
  'chatting': ['交谈结束', '聊天结束', '对话完毕'],
  'confessing': ['忏悔结束', '祷告完毕', '忏悔完成'],
  'devoted': ['祈祷结束', '礼拜完毕', '虔诚消退'],
  'normal': ['状态异常', '中断活动', '停止活动'],
  'panicked': ['从惊恐中恢复', '惊恐消退', '恢复平静'],
  'aroused': ['欲望平息', '情欲消退', '恢复理智'],
  'broken': ['精神逐渐恢复', '开始恢复', '精神好转'],
  'injured': ['伤势痊愈', '伤愈', '恢复健康'],
  'pregnant': ['不再怀孕', '妊娠结束', '恢复常态'],
  'euphoric': ['从愉悦中清醒', '愉悦消退', '恢复正常'],
  'dissociated': ['意识恢复清醒', '意识回归', '精神恢复'],
  'complicit': ['不再是共犯', '脱离共犯关系', '不再同谋'],
  'voyeur': ['不再窥视', '停止观察', '结束窥视'],
  'deaconess': ['失去执事身份', '圣职被剥夺', '不再担任执事'],
  'gestating': ['孕育结束', '妊娠结束', '分娩完成'],
  'performing': ['表演结束', '演出完毕', '下台'],
  'anchoring': ['锚定结束', '稳定完成', '结束锚定'],
  'observing': ['停止观测深渊', '移开视线', '不再凝视深渊', '离开观测窗', '停止窥视'],
};

const ACTIVITY_START_DESCRIPTIONS: Record<CharacterStatus, string[]> = {
  'sleeping': ['开始休息', '准备入睡', '躺下休息'],
  'eating': ['开始进食', '开始用餐', '享用食物'],
  'bathing': ['开始沐浴', '开始洗澡', '准备清洁'],
  'wandering': ['开始游荡', '四处走动', '开始漫步'],
  'chatting': ['开始交谈', '开始聊天', '与人对话'],
  'confessing': ['开始忏悔', '开始祷告', '向神明忏悔'],
  'devoted': ['开始祈祷', '虔诚祈祷', '开始礼拜'],
  'normal': ['恢复正常活动', '状态正常', '开始日常活动'],
  'panicked': ['陷入惊恐', '开始恐慌', '惊慌失措'],
  'aroused': ['情欲高涨', '春心萌动', '欲望觉醒'],
  'broken': ['精神崩溃', '崩溃瓦解', '精神瓦解'],
  'injured': ['受伤了', '身体受伤', '遭受伤害'],
  'pregnant': ['怀孕了', '怀有身孕', '开始妊娠'],
  'euphoric': ['陷入极度愉悦', '极度愉悦', '幸福感爆棚'],
  'dissociated': ['意识开始游离', '意识游离', '精神脱离'],
  'complicit': ['成为堕落共犯', '堕入共犯', '成为同谋'],
  'voyeur': ['成为窥视者', '开始窥视', '暗中观察'],
  'deaconess': ['晋升为执事', '成为执事', '接受圣职'],
  'gestating': ['开始孕育', '开始妊娠', '孕育新生命'],
  'performing': ['开始表演', '走上舞台', '开始演出'],
  'anchoring': ['开始锚定', '开始稳定', '进行锚定'],
  'observing': ['颤抖着靠近观测窗，向深渊窥视', '被虚空吸引，趴在窗沿上凝视', '无法移开视线，直视着深渊的黑暗', '开始观测深渊', '凝视深渊', '向深渊窥视'],
};

const CHARACTER_STATUS_NAMES: Record<CharacterStatus, string> = {
  'normal': '正常活动', 'panicked': '惊恐', 'injured': '受伤', 'broken': '崩溃',
  'dissociated': '游离', 'aroused': '情欲', 'pregnant': '怀孕', 'gestating': '孕育',
  'euphoric': '愉悦', 'devoted': '虔诚', 'complicit': '共犯', 'voyeur': '窥视',
  'deaconess': '执事', 'performing': '表演', 'confessing': '忏悔', 'anchoring': '锚定',
  'sleeping': '休息', 'eating': '进食', 'bathing': '沐浴', 'wandering': '游荡',
  'chatting': '交谈', 'observing': '观测',
};

/** 根据α值确定人格状态 */
function determinePersonalityState(alpha: number): PersonalityState {
  if (alpha > 65) return 'integrated';
  if (alpha > 40) return 'adaptive';
  if (alpha > 25) return 'stressed';
  return 'dissociated';
}

// ============================================
// 少女系统协调器类
// MaidenSystem Coordinator Class
// ============================================

class MaidenSystem {
  // 内部逻辑模块 (私有/封装)
  private generator = maidenGenerator;
  private behavior = maidenBehavior;

  // 公共子系统 (暴露给外部服务使用)
  readonly socialization = maidenSocialization;
  readonly memory = maidenMemory;
  readonly narcissus = maidenNarcissus;
  readonly clothing = maidenClothing;
  readonly mood = maidenMood;

  /**
   * 随机事件系统 - 公共 API 门面（适配外部调用约定）
   * checkForEvents 接受完整的 SystemState + masterCarriageId 签名，内部桥接至实现层
   */
  readonly event = {
    checkForEvents: (
      maidens: Map<string, Maiden>,
      carriages: Map<string, Carriage>,
      _systemState: SystemState,
      _masterCarriageId: string,
      gameTimePassed: number,
      targetIds?: string[]
    ): GameEvent[] =>
      maidenRandomEvent.checkForEvents(maidens, carriages, gameTimePassed, targetIds),
    serialize: (): EventTimestampData[] =>
      maidenRandomEvent.serialize().map(([eventType, timestamp]) => ({ eventType: eventType as EventType, timestamp })),
    deserialize: (data: EventTimestampData[]): void =>
      maidenRandomEvent.deserialize(data.map(d => [d.eventType, d.timestamp])),
  };

  /** @deprecated 改名为 event，此别名保留向后兼容 */
  readonly randomEvent = maidenRandomEvent;

  /**
   * 事件效果结算器 - 与 event 共用同一底层实现
   */
  readonly eventEffects = {
    applyEventEffects: (event: GameEvent, ctx: EventEffectContext): Map<string, Maiden> =>
      maidenRandomEvent.applyEventEffects(event, ctx),
  };

  /**
   * 妊娠子系统 - 附加序列化接口
   * 妊娠状态内嵌于 Maiden.physiology，全量存档通过 Maiden 序列化完成；
   * 此处 serialize/deserialize 用于子系统数据与 SubsystemsData 规范对齐。
   */
  readonly pregnancy = Object.assign(maidenPregnancy, {
    serialize: (maidens?: Map<string, Maiden>): PregnancyData[] => {
      if (!maidens) return [];
      const result: PregnancyData[] = [];
      for (const maiden of maidens.values()) {
        if (maiden.physiology.pregnancy) {
          result.push({ maidenId: maiden.id, pregnancyState: maiden.physiology.pregnancy });
        }
      }
      return result;
    },
    deserialize: (_data: PregnancyData[]): void => {
      // 妊娠状态通过 Maiden 全量恢复，此处为空操作
    },
  });

  /**
   * 关系子系统 - 附加序列化接口
   * 关系数据内嵌于 Maiden.relationships，全量存档通过 Maiden 序列化完成。
   */
  readonly relationship = Object.assign(maidenRelationship, {
    serialize: (maidens?: Map<string, Maiden>): RelationshipNetworkData[] => {
      if (!maidens) return [];
      const result: RelationshipNetworkData[] = [];
      for (const maiden of maidens.values()) {
        if (maiden.relationships && maiden.relationships.length > 0) {
          result.push({
            maidenId: maiden.id,
            relationships: maiden.relationships.map(r => ({ targetId: r.targetId, relationship: r })),
          });
        }
      }
      return result;
    },
    deserialize: (_data: RelationshipNetworkData[]): void => {
      // 关系数据通过 Maiden 全量恢复，此处为空操作
    },
  });

  // 生成配置常量指定数量的少女（使用IS-SHEX人格系统）
  generateMaidens(carriages: Map<string, Carriage>): Map<string, Maiden> {
    const maidens = new Map<string, Maiden>();
    const carriageIds = Array.from(carriages.keys()).filter(id => {
      const c = carriages.get(id)!;
      return c.isAccessible && c.category !== 'abyss';
    });

    const usedNames = new Set<string>();

    for (let i = 0; i < GAME_CONFIG.TOTAL_MAIDENS; i++) {
      const id = `Unit-${String(i + 1).padStart(3, '0')}`;
      const carriageId = carriageIds[Math.floor(Math.random() * carriageIds.length)];

      // 委托给生成器
      const maiden = this.generator.generateUnit(id, carriageId, usedNames, 0);

      // 将少女放入车厢（不可变更新）
      const carriage = carriages.get(carriageId)!;
      carriages.set(carriageId, {
        ...carriage,
        occupants: [...carriage.occupants, id],
      });

      maidens.set(id, maiden);
    }

    // 初始化关系网络
    this.relationship.initializeNetwork(maidens, 0);

    return maidens;
  }

  // ==========================================
  // 动态系统 - 状态更新
  // ==========================================

  getGameHour(gameTimePassed: number): number {
    return Math.floor((gameTimePassed / TIME_CONFIG.MS_PER_HOUR) % 24);
  }
  getGameMinute(gameTimePassed: number): number {
    return Math.floor((gameTimePassed / TIME_CONFIG.MS_PER_MINUTE) % 60);
  }
  getGameSecond(gameTimePassed: number): number {
    return Math.floor((gameTimePassed / TIME_CONFIG.MS_PER_SECOND) % 60);
  }
  isRestTime(gameTimePassed: number): boolean {
    const hour = this.getGameHour(gameTimePassed);
    return hour >= TIME_CONFIG.REST_START_HOUR || hour < TIME_CONFIG.REST_END_HOUR;
  }

  updateMaidenState(
    maiden: Maiden,
    carriage: Carriage,
    gameDeltaMs: number,
    resonanceFrequency: number,
    gameTimePassed: number
  ): Maiden {
    const deltaSeconds = gameDeltaMs / 1000;
    const deltaMinutes = deltaSeconds / 60;
    const typeInfo = CARRIAGE_TYPE_INFO.find(info => info.type === carriage.type);
    if (!typeInfo) {
      throw new Error(`Unknown carriage type: ${carriage.type}`);
    }
    const { RATES, THRESHOLDS } = GAME_CONFIG;
    const { hexaco, facets, behaviorWeights } = maiden.isshex;
    const carriageFunc = CARRIAGE_FUNCTIONS[carriage.type];

    let attrs = { ...maiden.attributes };
    const sanityMod = 1 - (hexaco.C - 50) * PERSONALITY_MODS.SANITY_C_MOD;
    const stressMod = 1 / behaviorWeights.stressResistance;
    const lustMod = behaviorWeights.lustSensitivity;

    attrs.sanity = clamp(attrs.sanity + typeInfo.periodicEffects.sanity * deltaMinutes * 0.1 * sanityMod);
    attrs.lust = clamp(attrs.lust + typeInfo.periodicEffects.lust * deltaMinutes * 0.1 * lustMod);
    attrs.stress = clamp(attrs.stress + typeInfo.periodicEffects.stress * deltaMinutes * 0.1 * stressMod);

    const resonanceEffect = Math.max(0, (20 - resonanceFrequency) / 20);
    attrs.lust = clamp(attrs.lust + resonanceEffect * deltaMinutes * 0.2 * lustMod);

    const isResting = this.isRestTime(gameTimePassed);
    let hungerRate = isResting ? RATES.HUNGER_INCREASE * 0.5 : RATES.HUNGER_INCREASE;
    let fatigueRate = isResting ? RATES.FATIGUE_INCREASE * 0.3 : RATES.FATIGUE_INCREASE;

    const syncedMaiden = this.pregnancy.syncToMaiden(maiden);
    const { physiology } = syncedMaiden;

    const pregnancyWeek = physiology.pregnancy?.weekNumber ?? 0;
    if (pregnancyWeek > 0) {
      const impacts = this.pregnancy.getPregnancyImpacts(pregnancyWeek);
      hungerRate *= impacts.hungerMod;
      fatigueRate *= impacts.fatigueMod;
    }

    attrs.hunger = clamp(attrs.hunger + hungerRate * deltaMinutes);
    attrs.fatigue = clamp(attrs.fatigue + fatigueRate * deltaMinutes);
    attrs.hygiene = clamp(attrs.hygiene - RATES.HYGIENE_DECREASE * deltaMinutes);

    attrs = this._applyActivityEffects(maiden, attrs, deltaMinutes, carriageFunc, hexaco, facets, RATES);

    if (carriage.category === 'abyss') {
      attrs.sanity = clamp(attrs.sanity - deltaMinutes * RATES.SANITY_ABYSS_DRAIN * sanityMod);
      attrs.stress = clamp(attrs.stress + deltaMinutes * RATES.STRESS_ABYSS_GAIN * stressMod);
      if (behaviorWeights.riskTolerance > 0.5 && hexaco.O > 55) {
        attrs.corruption = clamp(attrs.corruption + 0.15 * deltaMinutes, 0, 100);
      }
    }

    const discomfort = 1 - carriageFunc.comfortLevel;
    attrs.stress = clamp(attrs.stress + discomfort * 0.05 * deltaMinutes);

    const statusSet = this._updateStatusTags(maiden, attrs, THRESHOLDS);
    const updatedPhysiology = this._updatePhysiology(syncedMaiden, deltaMinutes, gameTimePassed);
    const isshex = this._updatePersonalityState(maiden, attrs, deltaMinutes);

    return {
      ...maiden,
      attributes: attrs,
      status: Array.from(statusSet),
      physiology: updatedPhysiology,
      isshex,
      lastUpdateTime: gameTimePassed,
    };
  }

  private _applyActivityEffects(
    maiden: Maiden,
    attrs: Maiden['attributes'],
    deltaMinutes: number,
    carriageFunc: typeof CARRIAGE_FUNCTIONS[keyof typeof CARRIAGE_FUNCTIONS],
    hexaco: Maiden['isshex']['hexaco'],
    facets: Maiden['isshex']['facets'],
    RATES: typeof GAME_CONFIG.RATES
  ): Maiden['attributes'] {
    const activity = maiden.behavior.currentActivity;
    switch (activity) {
      case 'sleeping': {
        const sleepBonus = carriageFunc.canSleep ? 1.0 : 0.5;
        const cBonus = 1 + (hexaco.C - 50) * 0.005;
        attrs.fatigue = clamp(attrs.fatigue - RATES.FATIGUE_SLEEP_REGEN * deltaMinutes * sleepBonus * cBonus, 0, 100);
        attrs.sanity = clamp(attrs.sanity + RATES.SANITY_SLEEP_REGEN * deltaMinutes * sleepBonus, 0, 100);
        attrs.stress = clamp(attrs.stress - 0.2 * deltaMinutes * sleepBonus, 0, 100);
        break;
      }
      case 'eating': {
        const eatBonus = carriageFunc.canEat ? 1.0 : 0.3;
        attrs.hunger = clamp(attrs.hunger - RATES.HUNGER_EAT_REGEN * deltaMinutes * eatBonus, 0, 100);
        break;
      }
      case 'bathing': {
        const bathBonus = carriageFunc.canBathe ? 1.0 : 0.2;
        attrs.hygiene = clamp(attrs.hygiene + RATES.HYGIENE_BATH_REGEN * deltaMinutes * bathBonus, 0, 100);
        attrs.stress = clamp(attrs.stress - RATES.STRESS_BATH_REGEN * deltaMinutes * bathBonus, 0, 100);
        if (facets.aestheticAppreciation > 60) attrs.stress = clamp(attrs.stress - 0.1 * deltaMinutes, 0, 100);
        if (facets.sentimentality > 55 && facets.prudence < 45) attrs.lust = clamp(attrs.lust + 0.3 * deltaMinutes, 0, 100);
        break;
      }
      case 'confessing': {
        const prayBonus = carriageFunc.canPray ? 1.0 : 0.5;
        const devotionGain = 0.5 * (1 + maiden.isshex.behaviorWeights.devotionTendency);
        attrs.devotion = clamp(attrs.devotion + devotionGain * deltaMinutes * prayBonus, 0, 100);
        if (maiden.isshex.behaviorWeights.devotionTendency > 0.5) {
          attrs.stress = clamp(attrs.stress - 0.3 * deltaMinutes, 0, 100);
          attrs.sanity = clamp(attrs.sanity - 0.1 * deltaMinutes, 0, 100);
        }
        break;
      }
      case 'chatting': {
        const socialBonus = 1 + (hexaco.X - 50) * PERSONALITY_MODS.FATIGUE_CHAT_LOW_X;
        attrs.stress = clamp(attrs.stress - 0.2 * deltaMinutes * socialBonus, 0, 100);
        if (hexaco.X > 55) attrs.sanity = clamp(attrs.sanity + 0.1 * deltaMinutes, 0, 100);
        if (hexaco.X < 40) attrs.stress = clamp(attrs.stress + 0.1 * deltaMinutes, 0, 100);
        break;
      }
      case 'observing': {
        const sanityDrain = 1.5 * (1 + (hexaco.O - 50) * PERSONALITY_MODS.ABYSS_PEEK_O_MOD);
        const stressGain = 1.0 * (1 + (facets.fearfulness - 50) * PERSONALITY_MODS.ABYSS_PEEK_FEAR_MOD);
        attrs.sanity = clamp(attrs.sanity - sanityDrain * deltaMinutes, 0, 100);
        attrs.stress = clamp(attrs.stress + stressGain * deltaMinutes, 0, 100);
        attrs.corruption = clamp(attrs.corruption + 0.2 * deltaMinutes, 0, 100);
        if (attrs.corruption > 50) attrs.lust = clamp(attrs.lust + 0.5 * deltaMinutes, 0, 100);
        break;
      }
    }
    return attrs;
  }

  private _updateStatusTags(
    maiden: Maiden,
    attrs: Maiden['attributes'],
    THRESHOLDS: typeof GAME_CONFIG.THRESHOLDS
  ): Set<CharacterStatus> {
    const statusSet = new Set(maiden.status);
    const activity = maiden.behavior.currentActivity;

    // 严格限制为基础合规的 ActivityStatus 集合枚举，去除无关属性避免篡改数据
    const activityStatuses: CharacterStatus[] = [
      'performing', 'confessing', 'anchoring', 'sleeping', 'eating', 'bathing', 'wandering', 'chatting', 'observing', 'normal'
    ];

    activityStatuses.forEach((s: CharacterStatus) => { if (s !== activity) statusSet.delete(s); });
    statusSet.add(activity);

    if (attrs.sanity < THRESHOLDS.SANITY_CRITICAL) statusSet.add('broken');
    else statusSet.delete('broken');
    if (attrs.lust > THRESHOLDS.LUST_HIGH) statusSet.add('aroused');
    else if (attrs.lust <= THRESHOLDS.LUST_NORMAL) statusSet.delete('aroused');
    if (attrs.stress > THRESHOLDS.STRESS_HIGH) statusSet.add('panicked');
    else if (attrs.stress <= CHANGE_THRESHOLDS.stressRelieved) statusSet.delete('panicked');
    if (attrs.devotion > THRESHOLDS.DEVOTION_FANATIC) statusSet.add('devoted');
    if (attrs.corruption > THRESHOLDS.CORRUPTION_COMPLICIT) statusSet.add('complicit');
    return statusSet;
  }

  private _updatePhysiology(maiden: Maiden, deltaMinutes: number, gameTimePassed: number): Maiden['physiology'] {
    const physiology = { ...maiden.physiology };
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const gameDeltaMs = deltaMinutes * 60 * 1000;
    const previousTime = gameTimePassed - gameDeltaMs;
    const daysToAdvance = Math.floor(gameTimePassed / MS_PER_DAY) - Math.floor(previousTime / MS_PER_DAY);
    if (daysToAdvance > 0) {
      physiology.cycleDay = ((physiology.cycleDay - 1 + daysToAdvance) % 28) + 1;
      physiology.isOvulating = physiology.cycleDay >= 12 && physiology.cycleDay <= 16;
      physiology.sensitivityMultiplier = this._calcSensitivity(physiology.cycleDay);
    }
    return physiology;
  }

  private _calcSensitivity(cycleDay: number): number {
    if (cycleDay >= 12 && cycleDay <= 16) {
      const distance = Math.abs(cycleDay - 14);
      return PERSONALITY_MODS.OVULATION_PEAK_SENSITIVITY - (distance * 0.1);
    } else if (cycleDay >= 1 && cycleDay <= 4) {
      return 0.8 + (cycleDay * 0.025);
    } else if (cycleDay >= 25 && cycleDay <= 28) {
      return 0.85 + ((cycleDay - 25) * 0.033);
    }
    return 0.95 + (Math.sin((cycleDay - 4) * Math.PI / 21) * 0.15);
  }

  private _updatePersonalityState(maiden: Maiden, newAttrs: Maiden['attributes'], deltaMinutes: number): Maiden['isshex'] {
    const isshex = deepCopy(maiden.isshex);
    const { hexaco, metaTraits } = isshex;
    const activity = maiden.behavior.currentActivity;

    let fatigueGain = 0;
    if (activity === 'chatting' && hexaco.X < 40) fatigueGain += (50 - hexaco.X) * PERSONALITY_MODS.FATIGUE_CHAT_LOW_X * deltaMinutes;
    // 孤独惩罚：当外向性高的角色长时间无社交互动时疲劳累积
    const isIdle = !TRACKABLE_ACTIVITIES.includes(activity) && activity !== 'chatting';
    if (isIdle && hexaco.X > 60 && maiden.behavior.lastInteractionTime > 0) fatigueGain += (hexaco.X - 50) * PERSONALITY_MODS.FATIGUE_LONELY_HIGH_X * deltaMinutes;
    if (hexaco.C > 60 && maiden.status.includes('observing')) fatigueGain += (hexaco.C - 50) * PERSONALITY_MODS.FATIGUE_OBSERVE_HIGH_C * deltaMinutes;

    isshex.traitFatigue = Math.min(100, isshex.traitFatigue + fatigueGain);
    const fatigueRecovery = activity === 'sleeping' ? PERSONALITY_MODS.FATIGUE_RECOVERY_SLEEP : PERSONALITY_MODS.FATIGUE_RECOVERY_NORMAL;
    isshex.traitFatigue = Math.max(0, isshex.traitFatigue - fatigueRecovery * deltaMinutes);

    if (metaTraits.alpha < 40 && newAttrs.stress > 70) {
      isshex.shadowActivation = Math.min(100, isshex.shadowActivation + PERSONALITY_MODS.SHADOW_ACTIVATION_LOW_ALPHA * deltaMinutes);
    } else if (metaTraits.alpha > 50 && newAttrs.stress < 50) {
      isshex.shadowActivation = Math.max(0, isshex.shadowActivation - PERSONALITY_MODS.SHADOW_RECOVERY_HIGH_ALPHA * deltaMinutes);
    }

    const effectiveAlpha = metaTraits.alpha - isshex.traitFatigue * 0.3 - isshex.shadowActivation * 0.2;
    const newState = determinePersonalityState(effectiveAlpha);
    if (newState !== isshex.currentState) {
      const isWorsening = this._isWorseState(newState, isshex.currentState);
      const transitionChance = isWorsening ? PERSONALITY_MODS.STATE_TRANSITION_WORSENING : PERSONALITY_MODS.STATE_TRANSITION_IMPROVING;
      if (Math.random() < clamp(transitionChance * deltaMinutes, 0, 1)) isshex.currentState = newState;
    }
    return isshex;
  }

  private _isWorseState(newState: PersonalityState, oldState: PersonalityState): boolean {
    const order: PersonalityState[] = ['integrated', 'adaptive', 'stressed', 'dissociated'];
    return order.indexOf(newState) > order.indexOf(oldState);
  }

  // ==========================================
  // 动态系统 - 变化追踪
  // ==========================================

  compareStates(before: Maiden, after: Maiden): StateChange[] {
    const changes: StateChange[] = [];
    const currentCarriageId = getCurrentCarriageId(after);
    const base = { maidenId: after.id, maidenName: after.name, carriageId: currentCarriageId };

    const { sanityCritical, sanityRecovered } = CHANGE_THRESHOLDS;
    if (before.attributes.sanity >= sanityCritical && after.attributes.sanity < sanityCritical) {
      changes.push({ ...base, changeType: 'sanity_critical', description: `${after.name} 的理智跌破临界值，陷入崩溃边缘`, logType: 'abyss', oldValue: before.attributes.sanity, newValue: after.attributes.sanity });
    } else if (before.attributes.sanity < sanityRecovered && after.attributes.sanity >= sanityRecovered) {
      changes.push({ ...base, changeType: 'sanity_recovered', description: `${after.name} 的理智逐渐恢复`, logType: 'system', oldValue: before.attributes.sanity, newValue: after.attributes.sanity });
    }

    const { stressHigh, stressRelieved } = CHANGE_THRESHOLDS;
    if (before.attributes.stress < stressHigh && after.attributes.stress >= stressHigh) {
      changes.push({ ...base, changeType: 'stress_high', description: `${after.name} 压力过大，开始颤抖`, logType: 'narrative', oldValue: before.attributes.stress, newValue: after.attributes.stress });
    } else if (before.attributes.stress >= stressRelieved && after.attributes.stress < stressRelieved) {
      changes.push({ ...base, changeType: 'stress_relieved', description: `${after.name} 的压力得到缓解`, logType: 'system' });
    }

    if (before.attributes.lust < CHANGE_THRESHOLDS.lustHigh && after.attributes.lust >= CHANGE_THRESHOLDS.lustHigh) {
      changes.push({ ...base, changeType: 'lust_high', description: `${after.name} 面色潮红，呼吸急促`, logType: 'narrative' });
    }
    if (before.attributes.hunger < CHANGE_THRESHOLDS.hungerUrgent && after.attributes.hunger >= CHANGE_THRESHOLDS.hungerUrgent) {
      changes.push({ ...base, changeType: 'hunger_urgent', description: `${after.name} 饥肠辘辘，急需进食`, logType: 'system' });
    }
    if (before.attributes.fatigue < CHANGE_THRESHOLDS.fatigueExhausted && after.attributes.fatigue >= CHANGE_THRESHOLDS.fatigueExhausted) {
      changes.push({ ...base, changeType: 'fatigue_exhausted', description: `${after.name} 疲惫不堪，几乎无法站立`, logType: 'system' });
    }
    if (before.attributes.hygiene > CHANGE_THRESHOLDS.hygieneDirty && after.attributes.hygiene <= CHANGE_THRESHOLDS.hygieneDirty) {
      changes.push({ ...base, changeType: 'hygiene_dirty', description: `${after.name} 急需清洁`, logType: 'system' });
    }

    // 活动变化
    if (before.behavior.currentActivity !== after.behavior.currentActivity) {
      if (TRACKABLE_ACTIVITIES.includes(before.behavior.currentActivity)) {
        const endDesc = this._getActivityEndDesc(before, after);
        if (endDesc) changes.push({ ...base, changeType: 'activity_ended', description: endDesc, logType: this._activityLogType(before.behavior.currentActivity), oldValue: before.behavior.currentActivity });
      }
      if (TRACKABLE_ACTIVITIES.includes(after.behavior.currentActivity)) {
        changes.push({ ...base, changeType: 'activity_started', description: this._getActivityStartDesc(after), logType: this._activityLogType(after.behavior.currentActivity), newValue: after.behavior.currentActivity });
      }
    }

    // 社交结束
    const bc = before.behavior.socialContext, ac = after.behavior.socialContext;
    if (bc?.targetId && !ac?.targetId && bc?.targetName) {
      const endDesc = this._getSocialEndDesc(before);
      if (endDesc) changes.push({ ...base, changeType: 'social_ended', description: endDesc, logType: 'social', oldValue: bc.targetId });
    }

    // 位置变化
    const oldLoc = getCurrentCarriageId(before), newLoc = getCurrentCarriageId(after);
    if (oldLoc !== newLoc) {
      changes.push({ ...base, changeType: 'location_changed', description: `${after.name} 移动到了新的车厢`, logType: 'movement', oldValue: oldLoc, newValue: newLoc });
    }

    // 排卵
    if (!before.physiology.isOvulating && after.physiology.isOvulating) {
      changes.push({ ...base, changeType: 'ovulation_start', description: `${after.name} 进入排卵期`, logType: 'system' });
    } else if (before.physiology.isOvulating && !after.physiology.isOvulating) {
      changes.push({ ...base, changeType: 'ovulation_end', description: `${after.name} 排卵期结束`, logType: 'system' });
    }

    // 状态标签
    const beforeStatus = new Set(before.status), afterStatus = new Set(after.status);
    for (const status of afterStatus) {
      if (!beforeStatus.has(status) && !INSIGNIFICANT_STATUSES.includes(status)) {
        changes.push({ ...base, changeType: 'status_added', description: `${after.name} ${this._statusDesc(status, true)}`, logType: this._statusLogType(status), newValue: status });
      }
    }
    for (const status of beforeStatus) {
      if (!afterStatus.has(status) && !INSIGNIFICANT_STATUSES.includes(status)) {
        changes.push({ ...base, changeType: 'status_removed', description: `${after.name} ${this._statusDesc(status, false)}`, logType: 'system', oldValue: status });
      }
    }

    return changes;
  }

  private _activityLogType(activity: CharacterStatus): LogType {
    switch (activity) {
      case 'confessing': case 'devoted': return 'ritual';
      case 'observing': return 'abyss';
      case 'performing': return 'narrative';
      default: return 'movement';
    }
  }

  private _getActivityStartDesc(maiden: Maiden): string {
    const activity = maiden.behavior.currentActivity;
    const options = ACTIVITY_START_DESCRIPTIONS[activity];
    if (options?.length) return options[Math.floor(Math.random() * options.length)].replace(/\${name}/g, maiden.name);
    return `${maiden.name} 开始${CHARACTER_STATUS_NAMES[activity] || '活动'}`;
  }

  private _getActivityEndDesc(before: Maiden, after: Maiden): string | null {
    const activity = before.behavior.currentActivity;
    const durationMinutes = Math.floor(before.behavior.activityDuration / 60000);
    const options = ACTIVITY_END_DESCRIPTIONS[activity];
    if (options?.length) {
      const base = options[Math.floor(Math.random() * options.length)].replace(/\${name}/g, after.name);
      return durationMinutes > 30 ? `${base}（持续了约${durationMinutes}分钟）` : base;
    }
    return null;
  }

  private _getSocialEndDesc(maiden: Maiden): string | null {
    const context = maiden.behavior.socialContext;
    if (!context?.targetName) return null;
    const { targetName, interactionType } = context;
    const descriptions: Partial<Record<SocialInteractionType, string[]>> = {
      chat: [`${maiden.name} 与 ${targetName} 结束了交谈`, `${maiden.name} 和 ${targetName} 的对话告一段落`],
      comfort: [`${maiden.name} 轻轻拍了拍 ${targetName}，安慰结束`],
      gossip: [`${maiden.name} 和 ${targetName} 停止了窃窃私语`],
      argue: [`${maiden.name} 与 ${targetName} 的争执平息了`, `${maiden.name} 和 ${targetName} 不再争吵`],
      bully: [`${maiden.name} 终于放过了 ${targetName}`],
      seduce: [`${maiden.name} 与 ${targetName} 之间的暧昧气氛消散了`],
      confide: [`${maiden.name} 向 ${targetName} 的倾诉结束了`],
      pray: [`${maiden.name} 与 ${targetName} 结束了共同祈祷`],
      huddle: [`${maiden.name} 和 ${targetName} 分开了`, `${maiden.name} 与 ${targetName} 不再依偎`],
    };
    if (interactionType && descriptions[interactionType]) {
      const opts = descriptions[interactionType]!;
      return opts[Math.floor(Math.random() * opts.length)];
    }
    return `${maiden.name} 与 ${targetName} 的互动结束了`;
  }

  private _statusDesc(status: CharacterStatus, added: boolean): string {
    const descriptions: Record<CharacterStatus, [string, string]> = {
      'panicked': ['陷入惊恐', '从惊恐中恢复'], 'aroused': ['情欲高涨', '欲望平息'],
      'broken': ['精神崩溃', '精神逐渐恢复'], 'injured': ['受伤了', '伤势痊愈'],
      'pregnant': ['怀孕了', '不再怀孕'], 'euphoric': ['陷入极度愉悦', '从愉悦中清醒'],
      'dissociated': ['意识开始游离', '意识恢复清醒'], 'complicit': ['成为堕落共犯', '不再是共犯'],
      'devoted': ['变得虔诚', '虔诚消退'], 'voyeur': ['成为窥视者', '不再窥视'],
      'deaconess': ['晋升为执事', '失去执事身份'], 'gestating': ['开始孕育', '孕育结束'],
      'performing': ['开始表演', '表演结束'], 'confessing': ['开始忏悔', '忏悔结束'],
      'anchoring': ['开始锚定', '锚定结束'], 'normal': ['恢复正常', '状态异常'],
      'sleeping': ['开始睡眠', '醒来'], 'eating': ['开始进食', '进食结束'],
      'bathing': ['开始沐浴', '沐浴结束'], 'wandering': ['开始游荡', '停止游荡'],
      'chatting': ['开始交谈', '交谈结束'], 'observing': ['开始观测深渊', '停止观测深渊'],
    };
    const [addDesc, removeDesc] = descriptions[status] || ['状态变化', '状态恢复'];
    return added ? addDesc : removeDesc;
  }

  private _statusLogType(status: CharacterStatus): LogType {
    switch (status) {
      case 'broken': case 'dissociated': case 'observing': return 'abyss';
      case 'devoted': case 'deaconess': return 'ritual';
      case 'aroused': case 'euphoric': return 'narrative';
      default: return 'system';
    }
  }

  // 委托给 AI 服务 - 立绘更新判定
  shouldUpdatePortrait(before: Maiden, after: Maiden, carriageType?: CarriageType) {
    return aiService.shouldUpdatePortrait(before, after, carriageType);
  }

  // 委托给行为决策器
  decideMaidenBehavior(
    maiden: Maiden,
    currentCarriage: Carriage,
    allCarriages: Map<string, Carriage>,
    allMaidens: Map<string, Maiden>,
    gameTimePassed: number
  ) {
    return this.behavior.decideMaidenBehavior(
      maiden, currentCarriage, allCarriages, allMaidens, gameTimePassed
    );
  }

  // 委托给事件系统
  processSocialInteractions(
    maiden: Maiden,
    othersInCarriage: string[],
    allMaidens: Map<string, Maiden>,
    carriage: Carriage,
    gameTimePassed: number
  ) {
    return this.socialization.processSocialInteractions(
      maiden, othersInCarriage, allMaidens, carriage, gameTimePassed
    );
  }

  // 处理水仙协议逻辑
  // 返回 log（可选）与 maidenUpdate（已离开者的褪色状态更新）
  processNarcissusLogic(
    maiden: Maiden,
    gameTimePassed: number
  ): { log?: string; maidenUpdate?: Partial<Maiden> } {
    const state = this.narcissus.getState(maiden);

    // 已在协议中：处理离开后的褪色演进
    if (this.narcissus.isInProtocol(maiden)) {
      if (state?.stage === 'departed' || state?.stage === 'fading' || state?.stage === 'invitation') {
        const fadingResult = this.narcissus.updateFading(maiden, gameTimePassed);
        if (fadingResult.updatedState) {
          const maidenUpdate: Partial<Maiden> = { narcissusState: fadingResult.updatedState };
          if (fadingResult.stageChanged && fadingResult.description) {
            return { log: `>>> 水仙平原 >>> ${fadingResult.description}`, maidenUpdate };
          }
          return { maidenUpdate };
        }
      }
      return {};
    }

    // 未在协议中：检查是否应自动触发
    if (this.narcissus.shouldAutonomousTrigger(maiden, gameTimePassed)) {
      const result = this.narcissus.initiateProtocol(maiden, gameTimePassed);
      if (result.success) {
        return {
          log: `>>> 异常波动检测 >>> ${result.description}`,
          maidenUpdate: result.maidenUpdate,
        };
      }
    }
    return {};
  }

  // 获取少女摘要列表
  getMaidenSummaries(maidens: Map<string, Maiden>): MaidenSummary[] {
    return Array.from(maidens.values()).map(m => ({
      id: m.id,
      name: m.name,
      carriageId: m.movement.currentCarriageId,
      status: m.status,
      sanity: m.attributes.sanity,
      currentActivity: m.behavior.currentActivity,
    }));
  }

  // 获取少女状态描述
  getMaidenStatusDescription(maiden: Maiden): string {
    const { attributes: a, behavior: b } = maiden;
    const parts: string[] = [];

    parts.push(ACTIVITY_STATUS_NAMES[b.currentActivity] || '状态未知');

    if (a.hunger > NEED_THRESHOLDS.URGENT) parts.push('饥肠辘辘');
    if (a.fatigue > NEED_THRESHOLDS.URGENT) parts.push('疲惫不堪');
    if (a.hygiene < CHANGE_THRESHOLDS.hygieneDirty) parts.push('急需清洁');
    if (a.stress > NEED_THRESHOLDS.HIGH) parts.push('压力过大');
    if (a.lust > NEED_THRESHOLDS.HIGH) parts.push('欲望难耐');

    return parts.join('，');
  }

  // 获取IS-SHEX人格描述（用于UI显示）
  // 简化版，去除不必要的排序和过滤逻辑，使用核心特征
  getPersonalityDescription(maiden: Maiden): string {
    const { archetype, metaTraits } = maiden.isshex;

    // 优先显示主要原型
    if (archetype.dominated.length > 0) {
      const archetypeLabels: Record<string, string> = {
        machiavellian: '操纵者',
        narcissist: '自恋者',
        psychopath: '冷血者',
        sadist: '施虐者',
        kantian: '原则者',
        humanist: '人道者',
        faithful: '信任者',
        benevolent_manipulator: '仁慈操纵者',
        vulnerable_narcissist: '脆弱自恋者',
        chaotic_innovator: '混乱创新者',
        cold_executive: '冷酷执行者',
        savior_complex: '救世主',
        righteous_punisher: '正义惩罚者',
      };

      const primary = archetype.dominated[0];
      if (archetypeLabels[primary]) return archetypeLabels[primary];
    }

    // 其次显示稳定性状态
    if (metaTraits.alpha < 40) return '不稳定型';
    if (metaTraits.alpha > 65) return '稳定型';

    // 默认
    return '平衡型';
  }
}

// 单例导出
export const maidenSystem = new MaidenSystem();