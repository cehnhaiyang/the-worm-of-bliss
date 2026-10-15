import { Carriage, Maiden, clamp, SocialInteractionType, weightedRandom, SocialContext, ActivityStatus } from '../../../meta';
import { maidenRelationship } from './MaidenRelationship';

const SOCIAL_INTERACTION_BASE_CHANCE = 0.2;

export const SOCIAL_INTERACTION_DESCRIPTIONS: Record<SocialInteractionType, string[]> = {
  chat: [
    '{name1}和{name2}低声交谈，分享着支离破碎的过往。',
    '{name1}和{name2}靠在一起，用眼神交流着无法言说的秘密。',
  ],
  comfort: [
    '{name1}轻轻拥抱了{name2}，在她耳边低声诵念着安慰的话语。',
    '{name1}握住了{name2}的手，无声地在黑暗中传递着残存的温暖。',
  ],
  gossip: [
    '{name1}和{name2}窃窃私语，交换着关于车厢内他人的隐秘传闻。',
    '{name1}靠近{name2}的耳畔，带着揣测吐露着不可告人的秘密。',
  ],
  argue: [
    '{name1}和{name2}之间爆发了激烈的冲突，压抑的情绪终于找到了出口。',
    '{name1}和{name2}互相指责，尖锐的诘问声在幽暗的车厢中回荡。',
  ],
  bully: [
    '{name1}将{name2}逼至绝境，发出恶意的嘲弄与冰冷的恐吓。',
    '{name1}粗暴地推搡着{name2}，在支配与掠夺中攫取病态的愉悦。',
  ],
  seduce: [
    '{name1}用暧昧的姿态靠近{name2}，指尖有意无意地划过她的肌肤。',
    '{name1}在{name2}耳边吐气如兰，眼底闪烁着危险而甜腻的欲望。',
  ],
  confide: [
    '{name1}向{name2}倾诉着内心的恐惧与脆弱，理智在崩溃的边缘游走。',
    '{name1}紧紧抓住{name2}的衣角，颤抖着吐露自己最深沉的梦魇。',
  ],
  pray: [
    '{name1}与{name2}一同顺从地跪下，双手交握，向深渊祈求着微茫的救赎。',
    '{name1}和{name2}双目紧闭，在死寂中低声诵念着残缺不全的祷文。',
  ],
  huddle: [
    '{name1}和{name2}紧紧依偎在一起，试图从彼此的躯体上汲取一丝慰藉。',
    '{name1}与{name2}蜷缩在角落，相互拥抱以抵御侵蚀而来的恐惧。',
  ],
  avoid: [
    '{name1}刻意避开了{name2}的视线，如同逃避某种厄运般匆匆转身。',
    '{name1}在余光瞥见{name2}后，迅速后退拉开了冰冷的距离。',
  ]
};

/**
 * @少女社交系统 - 处理少女间的互动逻辑
 */
export class MaidenSocialization {
  // ============================================
  // 社交互动执行干道
  // ============================================

  public processSocialInteractions(
    maiden: Maiden,
    othersInCarriage: string[],
    allMaidens: Map<string, Maiden>,
    carriage: Carriage,
    gameTimePassed: number
  ): { log?: string; updatedMaiden?: Maiden; updatedTarget?: Maiden } {
    if (
      othersInCarriage.length <= 1 ||
      maiden.status.includes('sleeping') ||
      maiden.behavior.currentActivity === 'sleeping' ||
      maiden.status.includes('broken') ||
      maiden.movement?.isMoving
    ) {
      return {};
    }

    const weights = maiden.isshex.behaviorWeights;
    const socialChance = SOCIAL_INTERACTION_BASE_CHANCE * (weights.socialSeek + 0.5);

    if (Math.random() > socialChance) return {};

    const targetId = this.selectSocialTarget(maiden, othersInCarriage, allMaidens);
    if (!targetId) return {};

    const target = allMaidens.get(targetId);
    if (!target || target.status.includes('sleeping') || target.behavior.currentActivity === 'sleeping') {
      return {};
    }

    const interactionType = this.decideSocialInteractionType(maiden, target, carriage);

    if (interactionType === 'avoid') {
      return {};
    }

    return this.executeSocialInteraction(maiden, target, interactionType, carriage, gameTimePassed);
  }

  private selectSocialTarget(
    maiden: Maiden,
    othersInCarriage: string[],
    allMaidens: Map<string, Maiden>
  ): string | null {
    const candidates = othersInCarriage.filter(id => id !== maiden.id);
    if (candidates.length === 0) return null;

    const relationships = maidenRelationship.getAllRelationships(maiden);

    const weights = candidates.map(id => {
      let weight = 10;

      const rel = relationships.find(r => r.targetId === id);
      if (rel) {
        weight += Math.abs(rel.affinity) * 0.5;
        if (rel.sharedTrauma) weight += 20;
      }

      return { item: id, weight };
    });

    return weightedRandom(weights);
  }

  private decideSocialInteractionType(
    maiden: Maiden,
    target: Maiden,
    carriage: Carriage
  ): SocialInteractionType {
    const m = maiden.isshex;
    const t = target.isshex;
    const attrs = maiden.attributes;
    const tAttrs = target.attributes;

    if (carriage.type === 'ALTAR' || carriage.type === 'CONFESSIONAL') {
      if (m.behaviorWeights.devotionTendency > 0.5 || t.behaviorWeights.devotionTendency > 0.5) {
        return 'pray';
      }
    }

    if (attrs.stress > 70 || tAttrs.stress > 70) {
      if (m.facets.fearfulness > 55 || m.facets.dependence > 55) {
        return 'huddle';
      }
      if (m.facets.gentleness > 50 && m.behaviorWeights.empathy > 0.5) {
        return 'comfort';
      }
      return 'huddle';
    }

    if (m.behaviorWeights.aggressiveness > 0.5 && m.hexaco.A < 40) {
      if (t.hexaco.A > 60 && Math.random() < 0.4) {
        return 'bully';
      }
      if (t.behaviorWeights.aggressiveness > 0.4) {
        return Math.random() < 0.3 ? 'argue' : 'gossip';
      }
    }

    if (m.behaviorWeights.lustSensitivity > 0.6 && m.hexaco.X > 50) {
      if (attrs.lust > 50 || tAttrs.lust > 50) {
        return 'seduce';
      }
      return 'gossip';
    }

    if (m.facets.fearfulness > 50 && m.facets.dependence > 50 && m.hexaco.X < 50) {
      if (tAttrs.sanity > 60) {
        return 'confide';
      }
      return 'huddle';
    }

    if (m.behaviorWeights.devotionTendency > 0.5) {
      return Math.random() < 0.5 ? 'pray' : 'chat';
    }

    return 'chat';
  }

  private executeSocialInteraction(
    maiden: Maiden,
    target: Maiden,
    type: SocialInteractionType,
    carriage: Carriage,
    gameTimePassed: number
  ): { log?: string; updatedMaiden?: Maiden; updatedTarget?: Maiden } {
    // 采用浅层解构隔离修改域
    const updatedMaiden = { ...maiden, attributes: { ...maiden.attributes } };
    const updatedTarget = { ...target, attributes: { ...target.attributes } };
    const mAttrs = updatedMaiden.attributes;
    const tAttrs = updatedTarget.attributes;

    const baseDuration = this.getSocialDuration(type);
    const durationMs = baseDuration * 60 * 1000;

    switch (type) {
      case 'chat':
        mAttrs.sanity = clamp(mAttrs.sanity + 1);
        mAttrs.stress = clamp(mAttrs.stress - 2);
        tAttrs.stress = clamp(tAttrs.stress - 1);
        break;
      case 'comfort':
        mAttrs.stress = clamp(mAttrs.stress - 3);
        tAttrs.stress = clamp(tAttrs.stress - 5);
        tAttrs.sanity = clamp(tAttrs.sanity + 2);
        break;
      case 'gossip':
        mAttrs.stress = clamp(mAttrs.stress - 2);
        tAttrs.stress = clamp(tAttrs.stress - 2);
        mAttrs.corruption = clamp(mAttrs.corruption + 0.5);
        break;
      case 'argue':
        mAttrs.stress = clamp(mAttrs.stress + 5);
        tAttrs.stress = clamp(tAttrs.stress + 5);
        mAttrs.sanity = clamp(mAttrs.sanity - 1);
        break;
      case 'bully':
        mAttrs.stress = clamp(mAttrs.stress - 3);
        mAttrs.corruption = clamp(mAttrs.corruption + 2);
        tAttrs.stress = clamp(tAttrs.stress + 8);
        tAttrs.sanity = clamp(tAttrs.sanity - 2);
        tAttrs.obedience = clamp(tAttrs.obedience + 1);
        break;
      case 'seduce':
        mAttrs.lust = clamp(mAttrs.lust + 5);
        tAttrs.lust = clamp(tAttrs.lust + 8);
        mAttrs.stress = clamp(mAttrs.stress - 2);
        break;
      case 'confide':
        mAttrs.stress = clamp(mAttrs.stress - 8);
        mAttrs.sanity = clamp(mAttrs.sanity + 1);
        tAttrs.stress = clamp(tAttrs.stress + 2);
        break;
      case 'pray':
        mAttrs.devotion = clamp(mAttrs.devotion + 2);
        tAttrs.devotion = clamp(tAttrs.devotion + 2);
        mAttrs.stress = clamp(mAttrs.stress - 3);
        tAttrs.stress = clamp(tAttrs.stress - 3);
        break;
      case 'huddle':
        mAttrs.stress = clamp(mAttrs.stress - 4);
        tAttrs.stress = clamp(tAttrs.stress - 4);
        break;
    }

    const templates = SOCIAL_INTERACTION_DESCRIPTIONS[type];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const log = template.replace(/\{name1\}/g, maiden.name).replace(/\{name2\}/g, target.name);

    const initiatorSocialContext: SocialContext = {
      targetId: target.id,
      targetName: target.name,
      interactionType: type,
      startTime: gameTimePassed,
    };

    updatedMaiden.behavior = {
      ...updatedMaiden.behavior,
      lastInteractionTime: gameTimePassed,
      currentActivity: 'chatting',
      activityStartTime: gameTimePassed,
      activityDuration: durationMs,
      previousActivity: maiden.behavior.currentActivity,
      socialContext: initiatorSocialContext,
    };

    const CRITICAL_ACTIVITIES: ActivityStatus[] = [
      'sleeping',
      'eating',
      'bathing',
      'performing',
      'confessing'
    ];

    const targetSocialContext: SocialContext = {
      targetId: maiden.id,
      targetName: maiden.name,
      interactionType: type,
      startTime: gameTimePassed,
    };

    updatedTarget.behavior = {
      ...updatedTarget.behavior,
      lastInteractionTime: gameTimePassed,
      ...(CRITICAL_ACTIVITIES.includes(target.behavior.currentActivity) ? {} : {
        currentActivity: 'chatting',
        activityStartTime: gameTimePassed,
        activityDuration: durationMs,
        previousActivity: target.behavior.currentActivity,
      }),
      socialContext: targetSocialContext,
    };

    const intensity = this.getInteractionIntensity(type);

    maidenRelationship.processInteraction(
      updatedMaiden,
      updatedTarget,
      type,
      intensity,
      gameTimePassed
    );

    return { log, updatedMaiden, updatedTarget };
  }

  private getSocialDuration(type: SocialInteractionType): number {
    const durations: Record<SocialInteractionType, number> = {
      'chat': 15,
      'comfort': 10,
      'gossip': 20,
      'argue': 8,
      'bully': 5,
      'seduce': 12,
      'confide': 25,
      'pray': 30,
      'huddle': 20,
      'avoid': 0,
    };
    const base = durations[type] || 10;
    return base * (0.7 + Math.random() * 0.6);
  }

  private getInteractionIntensity(type: SocialInteractionType): number {
    const intensities: Record<SocialInteractionType, number> = {
      'chat': 0.5,
      'comfort': 1.0,
      'gossip': 0.3,
      'argue': 0.8,
      'bully': 1.2,
      'seduce': 0.7,
      'confide': 1.5,
      'pray': 0.6,
      'huddle': 0.9,
      'avoid': 0,
    };
    return intensities[type] || 1.0;
  }
}

export const maidenSocialization = new MaidenSocialization();