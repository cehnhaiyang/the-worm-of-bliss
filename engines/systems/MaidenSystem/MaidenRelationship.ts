// 少女关系系统 - 社交网络管理与状态演化
import {
  buildRelationshipIndex,
  getRelationship,
  setRelationship,
  getAllRelationships,
  Maiden,
  RelationType,
  Relationship,
  SocialInteractionType
} from '../../../meta';

export class MaidenRelationship {

  /**
   * 初始化全局关系网络
   * 为所有实体构建基础的人际关联基线
   */
  public initializeNetwork(maidens: Map<string, Maiden>, gameTimePassed: number): void {
    for (const [id, maiden] of maidens) {
      if (!maiden.relationships) {
        maidens.set(id, { ...maiden, relationships: [] });
      }
    }

    this.generateInitialRelationships(maidens, gameTimePassed);
  }

  /**
   * 基于随机碰撞与人格契合度生成初始社交拓扑
   */
  private generateInitialRelationships(maidens: Map<string, Maiden>, gameTimePassed: number): void {
    const maidenIds = Array.from(maidens.keys());
    const totalMaidens = maidenIds.length;

    for (const id of maidenIds) {
      const maiden = maidens.get(id)!;
      const targetRelationCount = 2 + Math.floor(Math.random() * 4);

      let attempts = 0;
      while (maiden.relationships.length < targetRelationCount && attempts < 15) {
        attempts++;
        const targetIdx = Math.floor(Math.random() * totalMaidens);
        const targetId = maidenIds[targetIdx];

        if (targetId === id || getRelationship(maiden, targetId)) continue;

        const target = maidens.get(targetId)!;

        const relationship = this.createInitialRelationship(maiden, target, gameTimePassed);
        const updatedMaiden = setRelationship(maidens.get(id)!, relationship);
        maidens.set(id, updatedMaiden);

        const mirrorRel = this.createMirrorRelationship(relationship, target, maiden, gameTimePassed);
        const updatedTarget = setRelationship(maidens.get(targetId)!, mirrorRel);
        maidens.set(targetId, updatedTarget);
      }
    }
  }

  /**
   * 计算单向初始关系参数（深度计算人格耦合）
   */
  private createInitialRelationship(maiden: Maiden, target: Maiden, gameTimePassed: number): Relationship {
    let baseAffinity = Math.floor(Math.random() * 40) - 10;

    const m = maiden.isshex;
    const t = target.isshex;

    const hexacoSimilarity = (
      Math.abs(m.hexaco.H - t.hexaco.H) +
      Math.abs(m.hexaco.E - t.hexaco.E) +
      Math.abs(m.hexaco.X - t.hexaco.X) +
      Math.abs(m.hexaco.A - t.hexaco.A) +
      Math.abs(m.hexaco.C - t.hexaco.C) +
      Math.abs(m.hexaco.O - t.hexaco.O)
    ) / 6;

    if (hexacoSimilarity < 20) {
      baseAffinity += 15;
    } else if (hexacoSimilarity < 30) {
      baseAffinity += 8;
    }

    if ((m.hexaco.E > 65 && t.hexaco.E < 35) || (m.hexaco.E < 35 && t.hexaco.E > 65)) {
      baseAffinity += 12;
    }

    if ((m.hexaco.X > 70 && t.hexaco.X < 30) || (m.hexaco.X < 30 && t.hexaco.X > 70)) {
      baseAffinity -= 5;
    }
    if (m.hexaco.A < 35 && t.hexaco.A > 65) {
      baseAffinity -= 10;
    }

    const avgEmpathy = (m.behaviorWeights.empathy + t.behaviorWeights.empathy) / 2;
    baseAffinity += Math.round((avgEmpathy - 50) / 5);

    if (m.darkTetrad.psychopathy > 70) {
      baseAffinity -= 15;
    }
    if (m.darkTetrad.machiavellianism > 60 && t.hexaco.A > 60) {
      baseAffinity += 10;
    }

    const affinity = Math.max(-100, Math.min(100, baseAffinity));
    const trust = 20 + Math.floor(Math.random() * 30);
    const type = this.determineRelationType(affinity, trust, false, maiden, target);

    return {
      targetId: target.id,
      type,
      affinity,
      trust,
      interactions: Math.floor(Math.random() * 20),
      lastInteraction: gameTimePassed - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
      sharedTrauma: false,
      isSecret: false,
    };
  }

  /**
   * 构建目标的镜像反射关系
   */
  private createMirrorRelationship(
    original: Relationship,
    maiden: Maiden,
    target: Maiden,
    gameTimePassed: number
  ): Relationship {
    const affinityDiff = Math.floor(Math.random() * 20) - 10;
    const affinity = Math.max(-100, Math.min(100, original.affinity + affinityDiff));
    const trust = Math.max(0, Math.min(100, original.trust + Math.floor(Math.random() * 10) - 5));

    return {
      targetId: target.id,
      type: this.determineRelationType(affinity, trust, original.sharedTrauma, maiden, target),
      affinity,
      trust,
      interactions: original.interactions,
      lastInteraction: original.lastInteraction,
      sharedTrauma: original.sharedTrauma,
      isSecret: original.isSecret,
    };
  }

  public getRelationship(maiden: Maiden, targetId: string): Relationship | undefined {
    return getRelationship(maiden, targetId);
  }

  public getAllRelationships(maiden: Maiden): Relationship[] {
    return getAllRelationships(maiden);
  }

  public getFriends(maiden: Maiden): string[] {
    return this.getAllRelationships(maiden)
      .filter(r => r.type === 'friend' || r.type === 'close_friend')
      .map(r => r.targetId);
  }

  public getEnemies(maiden: Maiden): string[] {
    return this.getAllRelationships(maiden)
      .filter(r => r.type === 'rival' || r.type === 'enemy')
      .map(r => r.targetId);
  }

  /**
   * 细粒度更新指定单向关系参数
   */
  public updateRelationship(
    maiden: Maiden,
    target: Maiden,
    changes: {
      affinityDelta?: number;
      trustDelta?: number;
      sharedTrauma?: boolean;
      forceSecret?: boolean;
    },
    gameTimePassed: number
  ): void {
    if (!maiden.relationships) maiden.relationships = [];
    if (!target.relationships) target.relationships = [];

    let relationship = getRelationship(maiden, target.id);

    if (!relationship) {
      relationship = {
        targetId: target.id,
        type: 'stranger',
        affinity: 0,
        trust: 10,
        interactions: 0,
        lastInteraction: gameTimePassed,
        sharedTrauma: false,
        isSecret: false,
      };
    }

    let newAffinity = relationship.affinity;
    let newTrust = relationship.trust;
    let newSharedTrauma = relationship.sharedTrauma;
    let newIsSecret = relationship.isSecret;

    if (changes.affinityDelta !== undefined) {
      newAffinity = Math.max(-100, Math.min(100, newAffinity + changes.affinityDelta));
    }
    if (changes.trustDelta !== undefined) {
      newTrust = Math.max(0, Math.min(100, newTrust + changes.trustDelta));
    }
    if (changes.sharedTrauma !== undefined) {
      newSharedTrauma = changes.sharedTrauma || relationship.sharedTrauma;
    }
    if (changes.forceSecret !== undefined) {
      newIsSecret = changes.forceSecret;
    }

    const newRelationship: Relationship = {
      ...relationship,
      affinity: newAffinity,
      trust: newTrust,
      sharedTrauma: newSharedTrauma,
      isSecret: newIsSecret,
      interactions: relationship.interactions + 1,
      lastInteraction: gameTimePassed,
      type: this.determineRelationType(newAffinity, newTrust, newSharedTrauma, maiden, target),
    };

    const updatedMaiden = setRelationship(maiden, newRelationship);

    maiden.relationships = updatedMaiden.relationships;
    maiden._relationshipIndex = updatedMaiden._relationshipIndex;
  }

  /**
   * 处理具体的双向社交事件
   * 严格遵循 SocialInteractionType 向量与非对称人格结算
   */
  public processInteraction(
    initiator: Maiden,
    target: Maiden,
    interactionType: SocialInteractionType | 'trauma_shared',
    intensity: number = 1,
    gameTimePassed: number
  ): void {
    const baseVal = intensity * 5;

    let initAffinityDelta = 0;
    let initTrustDelta = 0;
    let targetAffinityDelta = 0;
    let targetTrustDelta = 0;
    let sharedTraumaFlag = false;

    const iHex = initiator.isshex.hexaco;
    const tHex = target.isshex.hexaco;
    const iDark = initiator.isshex.darkTetrad;

    switch (interactionType) {
      case 'chat':
        initAffinityDelta = baseVal * 0.5;
        targetAffinityDelta = baseVal * 0.5;
        initTrustDelta = baseVal * 0.2;
        targetTrustDelta = baseVal * 0.2;
        // 内向者对频繁闲聊可能产生微弱反感
        if (tHex.X < 30) targetAffinityDelta -= 1;
        break;

      case 'comfort':
        initAffinityDelta = baseVal;
        targetAffinityDelta = baseVal * 1.5;
        initTrustDelta = baseVal * 0.8;
        targetTrustDelta = baseVal * 1.2;
        // 共情修正
        if (tHex.E > 60) targetTrustDelta *= 1.5;
        if (iDark.machiavellianism > 60) initAffinityDelta = 0; // 马基雅维利者仅为操纵，不产生真实亲和
        break;

      case 'gossip':
        initAffinityDelta = baseVal * 0.8;
        targetAffinityDelta = baseVal * 0.8;
        initTrustDelta = -baseVal * 0.2;
        targetTrustDelta = -baseVal * 0.2;
        break;

      case 'argue':
        initAffinityDelta = -baseVal * 1.2;
        targetAffinityDelta = -baseVal * 1.2;
        initTrustDelta = -baseVal * 0.5;
        targetTrustDelta = -baseVal * 0.5;
        // 高对抗性（低宜人性）者不易在争吵中大幅度掉信任
        if (tHex.A < 30) targetTrustDelta *= 0.5;
        break;

      case 'bully':
        initAffinityDelta = iDark.sadism > 50 ? baseVal * 0.5 : -baseVal; // 施虐者可能产生病态愉悦
        targetAffinityDelta = -baseVal * 2.5;
        initTrustDelta = -baseVal;
        targetTrustDelta = -baseVal * 3.0;
        break;

      case 'seduce':
        initAffinityDelta = baseVal;
        targetAffinityDelta = baseVal * 1.5;
        initTrustDelta = -baseVal * 0.5; // 诱惑带有欺骗性，削弱基础信任
        targetTrustDelta = baseVal * 0.5; // 目标被魅惑时可能盲目提升信任
        break;

      case 'confide':
        initAffinityDelta = baseVal * 1.2;
        targetAffinityDelta = baseVal;
        initTrustDelta = baseVal * 2.0;
        targetTrustDelta = baseVal * 1.5;
        if (tHex.A > 70) targetTrustDelta *= 1.2;
        break;

      case 'pray':
        initAffinityDelta = baseVal;
        targetAffinityDelta = baseVal;
        initTrustDelta = baseVal;
        targetTrustDelta = baseVal;
        break;

      case 'huddle':
        initAffinityDelta = baseVal * 1.5;
        targetAffinityDelta = baseVal * 1.5;
        initTrustDelta = baseVal * 2.0;
        targetTrustDelta = baseVal * 2.0;
        break;

      case 'avoid':
        initAffinityDelta = -baseVal * 0.5;
        targetAffinityDelta = -baseVal * 0.8;
        initTrustDelta = -baseVal * 0.3;
        targetTrustDelta = -baseVal * 0.5;
        break;

      case 'trauma_shared':
        sharedTraumaFlag = true;
        initAffinityDelta = baseVal * 2;
        targetAffinityDelta = baseVal * 2;
        initTrustDelta = baseVal * 1.5;
        targetTrustDelta = baseVal * 1.5;
        break;
    }

    this.updateRelationship(initiator, target, {
      affinityDelta: initAffinityDelta,
      trustDelta: initTrustDelta,
      sharedTrauma: sharedTraumaFlag,
    }, gameTimePassed);

    this.updateRelationship(target, initiator, {
      affinityDelta: targetAffinityDelta,
      trustDelta: targetTrustDelta,
      sharedTrauma: sharedTraumaFlag,
    }, gameTimePassed);
  }

  /**
   * 执行关系定性推断（状态机核心基准）
   */
  private determineRelationType(
    affinity: number,
    trust: number,
    sharedTrauma: boolean = false,
    maiden?: Maiden,
    target?: Maiden
  ): RelationType {
    if (maiden && target && affinity >= 30) {
      const mHex = maiden.isshex.hexaco;
      const tHex = target.isshex.hexaco;
      const mDark = maiden.isshex.darkTetrad;

      if (mHex.E > 60 && mHex.A < 40 && tHex.E < 40 && tHex.A > 60 && trust >= 50) {
        return 'protector';
      }

      if (mHex.E < 40 && mHex.A > 60 && tHex.E > 60 && tHex.A < 40 && trust >= 40) {
        return 'dependent';
      }

      if (sharedTrauma && mDark.machiavellianism > 60 && trust >= 30) {
        return 'accomplice';
      }
    }

    if (sharedTrauma && affinity > 0 && trust >= 30) {
      return 'accomplice';
    }

    if (affinity >= 70 && trust >= 60) return 'close_friend';
    if (affinity >= 40) return 'friend';
    if (affinity >= 10) return 'acquaintance';
    if (affinity <= -60) return 'enemy';
    if (affinity <= -30) return 'rival';

    return 'stranger';
  }

  /**
   * 关系自然演化与熵增衰减机制
   */
  public decayRelationships(maidens: Map<string, Maiden>, deltaMs: number): void {
    const baseDecayRate = 0.1 / (24 * 60 * 60 * 1000);
    const baseDecayAmount = deltaMs * baseDecayRate;

    if (baseDecayAmount <= 0) return;

    for (const [id, maiden] of maidens) {
      if (!maiden.relationships || maiden.relationships.length === 0) continue;

      const mHex = maiden.isshex.hexaco;
      const updatedRelationships: Relationship[] = [];
      let changed = false;

      for (const relationship of maiden.relationships) {
        let { affinity, trust, sharedTrauma, targetId } = relationship;
        const oldAffinity = affinity;
        const oldTrust = trust;

        let dampingFactor = 1.0;

        if (affinity > 50) dampingFactor *= 0.6;
        if (sharedTrauma) dampingFactor *= 0.2; // 强化共享创伤的抗遗忘性

        // 依赖性强（高情绪性+高依附倾向）的角色遗忘正向关系更慢
        if (mHex.E > 70 && affinity > 0) dampingFactor *= 0.7;
        // 孤僻倾向（极低外向性）加速泛泛之交的衰退
        if (mHex.X < 30 && affinity < 30 && affinity > 0) dampingFactor *= 1.3;

        const currentDecay = baseDecayAmount * dampingFactor;

        if (affinity > 0) {
          affinity = Math.max(0, affinity - currentDecay);
        } else if (affinity < 0) {
          affinity = Math.min(0, affinity + currentDecay);
        }

        const trustDecay = sharedTrauma ? currentDecay * 0.1 : currentDecay * 0.6;
        trust = Math.max(0, trust - trustDecay);

        if (sharedTrauma && affinity > 20) {
          affinity = Math.max(-100, Math.min(100, affinity + currentDecay * 0.15));
        }

        if (affinity !== oldAffinity || trust !== oldTrust) {
          changed = true;
        }

        const target = maidens.get(targetId);
        updatedRelationships.push({
          ...relationship,
          affinity,
          trust,
          type: this.determineRelationType(affinity, trust, sharedTrauma, maiden, target),
        });
      }

      if (changed) {
        const newMaiden: Maiden = {
          ...maiden,
          relationships: updatedRelationships,
          _relationshipIndex: buildRelationshipIndex(updatedRelationships)
        };
        maidens.set(id, newMaiden);
      }
    }
  }

  /**
   * 提取当前时空切片下的全景社交拓扑统计
   */
  public getNetworkStats(maidens: Map<string, Maiden>): {
    totalRelationships: number;
    friendships: number;
    rivalries: number;
    averageAffinity: number;
  } {
    let total = 0;
    let friendships = 0;
    let rivalries = 0;
    let totalAffinity = 0;

    for (const maiden of maidens.values()) {
      if (!maiden.relationships) continue;

      for (const rel of maiden.relationships) {
        total++;
        totalAffinity += rel.affinity;
        if (rel.type === 'friend' || rel.type === 'close_friend') friendships++;
        if (rel.type === 'rival' || rel.type === 'enemy') rivalries++;
      }
    }

    return {
      totalRelationships: Math.floor(total / 2),
      friendships: Math.floor(friendships / 2),
      rivalries: Math.floor(rivalries / 2),
      averageAffinity: total > 0 ? totalAffinity / total : 0,
    };
  }
}

export const maidenRelationship = new MaidenRelationship();