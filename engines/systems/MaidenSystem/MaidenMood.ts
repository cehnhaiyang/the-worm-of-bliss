// ============================================
// 少女情绪系统 - 情绪计算与自发行为
// Maiden Mood System - Mood calculation & spontaneous actions
// 基于 IS-SHEX 六维层级人格模型
// ============================================

import { Maiden, MoodState, LogType, ISShexPersonality, MoodChangeEvent, SpontaneousActionEvent, SpontaneousAction, getCurrentCarriageId } from '../../../meta';

// 情绪对行为的影响权重
const MOOD_BEHAVIOR_MODIFIERS: Record<MoodState, {
  socialChance: number;      // 社交概率修正
  moveChance: number;        // 移动概率修正
  restPreference: number;    // 休息偏好
  riskTolerance: number;     // 风险容忍修正
}> = {
  'content': { socialChance: 1.0, moveChance: 1.0, restPreference: 1.0, riskTolerance: 1.0 },
  'anxious': { socialChance: 0.6, moveChance: 1.5, restPreference: 0.5, riskTolerance: 0.3 },
  'melancholy': { socialChance: 0.4, moveChance: 0.5, restPreference: 1.5, riskTolerance: 0.5 },
  'irritable': { socialChance: 0.7, moveChance: 1.2, restPreference: 0.8, riskTolerance: 1.2 },
  'lustful': { socialChance: 1.5, moveChance: 1.3, restPreference: 0.3, riskTolerance: 1.5 },
  'fearful': { socialChance: 1.2, moveChance: 0.3, restPreference: 0.5, riskTolerance: 0.1 },
  'euphoric': { socialChance: 1.8, moveChance: 1.0, restPreference: 0.5, riskTolerance: 1.3 },
  'numb': { socialChance: 0.2, moveChance: 0.3, restPreference: 1.0, riskTolerance: 0.8 },
};

// 自发行为触发条件和描述
const SPONTANEOUS_ACTION_CONFIG: Record<SpontaneousAction, {
  triggerCondition: (attrs: { sanity: number; stress: number; lust: number; devotion: number; fatigue: number }) => boolean;
  probability: number;  // 基础触发概率
  descriptions: string[];
}> = {
  'daydream': {
    triggerCondition: (a) => a.fatigue > 40 && a.stress < 50,
    probability: 0.08,
    descriptions: ['眼神变得迷离，似乎陷入了回忆', '目光空洞地望向远方', '嘴角微微上扬，沉浸在某个遥远的记忆中'],
  },
  'stretch': {
    triggerCondition: (a) => a.fatigue > 30,
    probability: 0.05,
    descriptions: ['伸了个懒腰', '舒展了一下僵硬的身体', '轻轻活动着肩膀'],
  },
  'sigh': {
    triggerCondition: (a) => a.stress > 40 || a.sanity < 60,
    probability: 0.1,
    descriptions: ['轻轻叹了口气', '发出一声几不可闻的叹息', '深深地呼出一口气'],
  },
  'hum': {
    triggerCondition: (a) => a.sanity > 60 && a.stress < 40,
    probability: 0.03,
    descriptions: ['轻声哼着不知名的曲调', '嘴里哼着断断续续的旋律', '无意识地哼起了歌'],
  },
  'pace': {
    triggerCondition: (a) => a.stress > 60,
    probability: 0.06,
    descriptions: ['焦躁地来回踱步', '在原地不安地走动', '脚步急促地走来走去'],
  },
  'fidget': {
    triggerCondition: (a) => a.stress > 50 || a.lust > 60,
    probability: 0.07,
    descriptions: ['坐立不安地扭动身体', '不停地变换姿势', '手指无意识地绞在一起'],
  },
  'cry_quietly': {
    triggerCondition: (a) => a.sanity < 40 || a.stress > 80,
    probability: 0.04,
    descriptions: ['眼眶泛红，泪水无声滑落', '默默地流着眼泪', '肩膀微微颤抖，压抑着哭泣'],
  },
  'laugh_nervously': {
    triggerCondition: (a) => a.sanity < 35 && a.stress > 70,
    probability: 0.02,
    descriptions: ['突然发出一阵神经质的笑声', '嘴角抽搐着笑了起来', '发出令人不安的轻笑'],
  },
  'tremble': {
    triggerCondition: (a) => a.sanity < 30 || a.stress > 85,
    probability: 0.05,
    descriptions: ['身体不受控制地颤抖', '双手微微发抖', '浑身轻颤，像是受了寒'],
  },
  'stare_blankly': {
    triggerCondition: (a) => a.sanity < 50,
    probability: 0.06,
    descriptions: ['目光呆滞地盯着某处', '眼神空洞，似乎灵魂出窍', '一动不动地凝视着虚空'],
  },
  'mutter': {
    triggerCondition: (a) => a.sanity < 40,
    probability: 0.04,
    descriptions: ['嘴唇微动，喃喃自语', '低声说着听不清的话', '自言自语着什么'],
  },
  'observe_others': {
    triggerCondition: (a) => a.stress < 60,
    probability: 0.08,
    descriptions: ['悄悄观察着周围的人', '目光在人群中游移', '默默注视着其他人的举动'],
  },
  'avoid_eye_contact': {
    triggerCondition: (a) => a.stress > 50 || a.sanity < 50,
    probability: 0.06,
    descriptions: ['刻意避开他人的目光', '低下头，不敢与人对视', '眼神闪躲'],
  },
  'seek_attention': {
    triggerCondition: (a) => a.lust > 50 || a.devotion > 60,
    probability: 0.04,
    descriptions: ['有意无意地吸引他人注意', '做出引人注目的小动作', '渴望被关注的眼神'],
  },
  'touch_collar': {
    triggerCondition: (a) => a.devotion > 30,
    probability: 0.05,
    descriptions: ['手指轻轻抚过颈间的项圈', '下意识地触摸着项圈', '指尖描绘着项圈的轮廓'],
  },
  'kneel_briefly': {
    triggerCondition: (a) => a.devotion > 70,
    probability: 0.03,
    descriptions: ['突然跪下，又很快站起', '短暂地屈膝跪地', '不由自主地跪了一下'],
  },
  'whisper_prayer': {
    triggerCondition: (a) => a.devotion > 50 || (a.stress > 70 && a.sanity < 50),
    probability: 0.04,
    descriptions: ['嘴唇微动，似在祈祷', '低声念诵着什么', '闭眼默默祈祷'],
  },
  'hug_self': {
    triggerCondition: (a) => a.stress > 60 || a.sanity < 45,
    probability: 0.05,
    descriptions: ['双臂环抱自己', '紧紧抱住自己的身体', '蜷缩着抱紧自己'],
  },
  'rock_back_forth': {
    triggerCondition: (a) => a.sanity < 30,
    probability: 0.03,
    descriptions: ['身体前后轻轻摇晃', '像个孩子一样摇晃着', '不停地前后摇摆'],
  },
  'bite_lip': {
    triggerCondition: (a) => a.stress > 50 || a.lust > 60,
    probability: 0.06,
    descriptions: ['轻咬着下唇', '牙齿咬住嘴唇', '不安地咬着唇'],
  },
};

export class MaidenMood {
  // 情绪持续时间阈值（毫秒）
  private readonly MOOD_MIN_DURATION = 5 * 60 * 1000; // 5分钟

  // 自发行为冷却时间（毫秒）
  private readonly SPONTANEOUS_COOLDOWN = 2 * 60 * 1000; // 2分钟

  /**
   * 根据属性和复合状态机计算当前应有的情绪状态
   * 严格遵循 CharacterStatus 优先级覆写机制
   */
  calculateMood(maiden: Maiden): MoodState {
    const { attributes: a, physiology: p, isshex, status } = maiden;
    const { hexaco, facets, currentState } = isshex;

    // 0. 最高优先级异常状态拦截
    if (status.includes('broken')) {
      return 'numb';
    }

    if (currentState === 'dissociated' || status.includes('dissociated')) {
      return a.sanity < 30 ? 'fearful' : 'numb';
    }

    if (status.includes('euphoric')) {
      return 'euphoric';
    }

    if (status.includes('panicked')) {
      return 'fearful';
    }

    // 1. 麻木：长期高压力 + 低理智 + 高E（情绪性）
    const numbThreshold = 85 - (hexaco.E - 50) * 0.2;
    if (a.stress > numbThreshold && a.sanity < 35) {
      return 'numb';
    }

    // 2. 恐惧：极低理智或高E.恐惧
    const fearSanityThreshold = 25 + (50 - facets.fearfulness) * 0.2;
    if (a.sanity < fearSanityThreshold) {
      return 'fearful';
    }

    // 3. 狂喜：高虔诚 + 低压力 + 高E.感伤
    const euphoricDevotionThreshold = 80 - (facets.sentimentality - 50) * 0.3;
    if (a.devotion > euphoricDevotionThreshold && a.stress < 30) {
      return 'euphoric';
    }

    // 4. 欲求：高欲望，受E.感伤和C.审慎影响
    const lustThreshold = 70 - (50 - facets.prudence) * 0.2 - (facets.sentimentality - 50) * 0.1;
    if (a.lust > lustThreshold || (a.lust > 50 && p.isOvulating)) {
      return 'lustful';
    }

    // 5. 焦虑：高压力，受E.焦虑影响
    const anxiousThreshold = 70 - (facets.anxiety - 50) * 0.3;
    if (a.stress > anxiousThreshold) {
      return 'anxious';
    }

    // 6. 易怒：饥饿或疲劳，受A.耐心影响
    const irritableThreshold = 75 - (50 - facets.patience) * 0.3;
    if (a.hunger > irritableThreshold || a.fatigue > 80) {
      return 'irritable';
    }

    // 7. 忧郁：低理智，受E.感伤影响
    const melancholyThreshold = 50 + (50 - facets.sentimentality) * 0.2;
    if (a.sanity < melancholyThreshold) {
      return 'melancholy';
    }

    // 8. 默认：满足
    return 'content';
  }

  /**
   * 更新少女情绪状态
   * 状态防劣化：始终返回完整的同步实体快照
   */
  updateMood(maiden: Maiden, gameDeltaMs: number): {
    updatedMaiden: Maiden;
    moodChange?: MoodChangeEvent;
  } {
    const newMood = this.calculateMood(maiden);
    const newDuration = maiden.moodDuration + gameDeltaMs;

    if (newMood === maiden.mood) {
      return {
        updatedMaiden: { ...maiden, moodDuration: newDuration },
      };
    }

    const minDuration = this.MOOD_MIN_DURATION * (1 - (maiden.isshex.hexaco.E - 50) * 0.005);
    if (maiden.moodDuration < minDuration) {
      return {
        updatedMaiden: { ...maiden, moodDuration: newDuration },
      };
    }

    const moodChange: MoodChangeEvent = {
      maidenId: maiden.id,
      maidenName: maiden.name,
      carriageId: getCurrentCarriageId(maiden),
      oldMood: maiden.mood,
      newMood,
      description: this.getMoodChangeDescription(maiden.name, maiden.mood, newMood, maiden.isshex),
      logType: this.getMoodLogType(newMood),
    };

    return {
      updatedMaiden: {
        ...maiden,
        mood: newMood,
        moodDuration: 0,
      },
      moodChange,
    };
  }

  /**
   * 检查并触发自发行为
   * 状态收敛重构：返回更新后的实体状态与行为事件，杜绝外部悬空修改
   */
  checkSpontaneousAction(maiden: Maiden, gameTimePassed: number): {
    updatedMaiden: Maiden;
    actionEvent?: SpontaneousActionEvent;
  } {
    if (maiden.lastSpontaneousTime &&
      gameTimePassed - maiden.lastSpontaneousTime < this.SPONTANEOUS_COOLDOWN) {
      return { updatedMaiden: maiden };
    }

    // 修正领域模型游离，适配 UnifiedMovementState
    if (maiden.movement?.isMoving ||
      maiden.status.includes('sleeping') ||
      maiden.status.includes('broken')) {
      return { updatedMaiden: maiden };
    }

    const attrs = maiden.attributes;
    const attrCheck = {
      sanity: attrs.sanity,
      stress: attrs.stress,
      lust: attrs.lust,
      devotion: attrs.devotion,
      fatigue: attrs.fatigue,
    };

    const possibleActions: { action: SpontaneousAction; config: typeof SPONTANEOUS_ACTION_CONFIG[SpontaneousAction] }[] = [];

    for (const [actionKey, config] of Object.entries(SPONTANEOUS_ACTION_CONFIG)) {
      const action = actionKey as SpontaneousAction;
      if (config.triggerCondition(attrCheck)) {
        possibleActions.push({ action, config });
      }
    }

    if (possibleActions.length === 0) {
      return { updatedMaiden: maiden };
    }

    for (const { action, config } of possibleActions) {
      const moodMod = this.getMoodActionModifier(maiden.mood, action);
      const personalityMod = this.getPersonalityActionModifier(maiden.isshex, action);
      const finalProb = config.probability * moodMod * personalityMod;

      if (Math.random() < finalProb) {
        const descriptions = config.descriptions;
        const description = `${maiden.name} ${descriptions[Math.floor(Math.random() * descriptions.length)]}`;

        const actionEvent: SpontaneousActionEvent = {
          maidenId: maiden.id,
          maidenName: maiden.name,
          carriageId: getCurrentCarriageId(maiden),
          action,
          description,
          logType: this.getActionLogType(action),
        };

        return {
          updatedMaiden: {
            ...maiden,
            lastSpontaneousAction: action,
            lastSpontaneousTime: gameTimePassed,
          },
          actionEvent,
        };
      }
    }

    return { updatedMaiden: maiden };
  }

  /**
   * 获取情绪对行为的修正
   */
  getMoodBehaviorModifier(mood: MoodState): typeof MOOD_BEHAVIOR_MODIFIERS[MoodState] {
    return MOOD_BEHAVIOR_MODIFIERS[mood];
  }

  /**
   * IS-SHEX人格对自发行为概率的修正
   */
  private getPersonalityActionModifier(isshex: ISShexPersonality, action: SpontaneousAction): number {
    const { hexaco, facets } = isshex;

    const modifiers: Partial<Record<SpontaneousAction, () => number>> = {
      'pace': () => 1 + (facets.anxiety - 50) * 0.02,
      'fidget': () => 1 + (facets.anxiety - 50) * 0.02,
      'cry_quietly': () => 1 + (facets.sentimentality - 50) * 0.025,
      'sigh': () => 1 + (facets.sentimentality - 50) * 0.015,
      'laugh_nervously': () => 1 + (50 - facets.prudence) * 0.02,
      'mutter': () => 1 + (50 - facets.prudence) * 0.015,
      'tremble': () => 1 + (facets.fearfulness - 50) * 0.025,
      'hug_self': () => 1 + (facets.fearfulness - 50) * 0.02,
      'avoid_eye_contact': () => 1 + (50 - hexaco.X) * 0.02,
      'seek_attention': () => 1 + (hexaco.X - 50) * 0.02,
      'touch_collar': () => 1 + isshex.behaviorWeights.devotionTendency * 0.5,
      'kneel_briefly': () => 1 + isshex.behaviorWeights.devotionTendency * 0.8,
      'whisper_prayer': () => 1 + isshex.behaviorWeights.devotionTendency * 0.6,
      'daydream': () => 1 + (hexaco.O - 50) * 0.015,
      'hum': () => 1 + (facets.liveliness - 50) * 0.02,
      'rock_back_forth': () => 1 + (50 - isshex.metaTraits.alpha) * 0.02,
    };

    const modifier = modifiers[action];
    return modifier ? Math.max(0.1, modifier()) : 1.0;
  }

  /**
   * 情绪对自发行为概率的修正
   */
  private getMoodActionModifier(mood: MoodState, action: SpontaneousAction): number {
    const modifiers: Partial<Record<MoodState, Partial<Record<SpontaneousAction, number>>>> = {
      'anxious': { 'pace': 2.0, 'fidget': 2.0, 'bite_lip': 1.5 },
      'melancholy': { 'cry_quietly': 2.0, 'sigh': 2.0, 'stare_blankly': 1.5 },
      'fearful': { 'tremble': 2.5, 'hug_self': 2.0, 'avoid_eye_contact': 2.0 },
      'lustful': { 'fidget': 1.5, 'bite_lip': 2.0, 'seek_attention': 2.0 },
      'numb': { 'stare_blankly': 3.0, 'rock_back_forth': 2.0 },
      'euphoric': { 'hum': 2.0, 'touch_collar': 1.5, 'kneel_briefly': 2.0 },
    };

    return modifiers[mood]?.[action] ?? 1.0;
  }

  /**
   * 获取情绪变化描述（基于IS-SHEX人格定制）
   */
  private getMoodChangeDescription(
    name: string,
    oldMood: MoodState,
    newMood: MoodState,
    isshex: ISShexPersonality
  ): string {
    const { hexaco, facets } = isshex;

    const descriptions: Record<MoodState, string[]> = {
      'content': [
        `${name} 的神情逐渐平静下来`,
        `${name} 看起来放松了一些`,
        facets.liveliness > 60 ? `${name} 的眼中重新有了光彩` : `${name} 的呼吸变得平稳`,
      ],
      'anxious': [
        `${name} 变得焦躁不安`,
        `${name} 的眼神中透出焦虑`,
        facets.anxiety > 60 ? `${name} 的手指开始不自觉地颤抖` : `${name} 的表情变得紧绷`,
      ],
      'melancholy': [
        `${name} 陷入了忧郁`,
        `${name} 的眼中蒙上一层阴霾`,
        facets.sentimentality > 60 ? `${name} 的眼眶微微泛红` : `${name} 变得沉默寡言`,
      ],
      'irritable': [
        `${name} 变得易怒起来`,
        `${name} 的表情变得不耐烦`,
        facets.patience < 40 ? `${name} 的眉头紧锁，似乎随时会爆发` : `${name} 的语气变得生硬`,
      ],
      'lustful': [
        `${name} 的呼吸变得急促`,
        `${name} 的眼神变得迷离`,
        hexaco.X > 60 ? `${name} 的目光开始游移，寻找着什么` : `${name} 的脸颊泛起红晕`,
      ],
      'fearful': [
        `${name} 陷入了恐惧`,
        `${name} 的身体开始发抖`,
        facets.fearfulness > 60 ? `${name} 蜷缩起来，眼中满是惊恐` : `${name} 的瞳孔骤然收缩`,
      ],
      'euphoric': [
        `${name} 的脸上浮现出狂喜`,
        `${name} 沉浸在某种极乐之中`,
        facets.sentimentality > 60 ? `${name} 的眼中闪烁着近乎疯狂的光芒` : `${name} 露出了恍惚的微笑`,
      ],
      'numb': [
        `${name} 的表情变得麻木`,
        `${name} 似乎对一切都失去了感觉`,
        hexaco.E > 60 ? `${name} 的眼神变得空洞，仿佛灵魂已经离开` : `${name} 变得如同行尸走肉`,
      ],
    };

    const options = descriptions[newMood];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 获取情绪对应的日志类型
   */
  private getMoodLogType(mood: MoodState): LogType {
    switch (mood) {
      case 'fearful':
      case 'numb': return 'abyss';
      case 'euphoric': return 'ritual';
      case 'lustful': return 'narrative';
      default: return 'system';
    }
  }

  /**
   * 获取自发行为对应的日志类型
   */
  private getActionLogType(action: SpontaneousAction): LogType {
    const ritualActions = ['touch_collar', 'kneel_briefly', 'whisper_prayer'];
    const abyssActions = ['laugh_nervously', 'rock_back_forth', 'mutter'];

    if (ritualActions.includes(action)) return 'ritual';
    if (abyssActions.includes(action)) return 'abyss';
    return 'narrative';
  }
}

export const maidenMood = new MaidenMood();