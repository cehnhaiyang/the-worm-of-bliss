// ============================================
// 
// ============================================

import {
  Maiden,
  EventType,
  GameEvent,
  getCurrentCarriageId,
  Carriage,
  CharacterStatus,
  EventEffectContext,
  CharacterRank,
  AttributeKey,
  MemoryAction, clamp, probabilityCheck, randomElement
} from '../../../meta';

import { maidenMemory } from './MaidenMemory';

/**
 * 随机事件概率与冷却时间基准配置
 */
const EVENT_CONFIG = {
  COOLDOWNS: {
    nightmare: 60000,
    breakdown: 120000,
    abyss_vision: 180000,
    rank_ceremony: 300000,
    awakening: 240000,
    pregnancy: 300000,
    friendship: 300000,
    conflict: 300000,
    comfort: 300000,
    hub_anomaly: 600000,
    resonance: 600000,
  } as Partial<Record<EventType, number>>,
  PROBABILITY: {
    nightmare: 0.02,
    awakening: 0.03,
    abyss_vision: 0.04,
    friendship: 0.03,
    conflict: 0.02,
    comfort: 0.04,
    hub_anomaly: 0.005,
    resonance: 0.008,
  }
} as const;

/**
 * @少女随机事件系统 - 核心领域服务
 * 负责处理少女的随机事件，包括事件的触发、结算和效果应用。
 */
export class MaidenRandomEvent {
  // ============================================
  // 系统全局时序状态
  // ============================================
  private globalEventTimestamps: Map<EventType, number> = new Map();

  // ============================================
  // [核心 API] 随机事件轮询调度
  // ============================================
  public checkForEvents(
    maidens: Map<string, Maiden>,
    carriages: Map<string, Carriage>,
    gameTimePassed: number,
    targetIds?: string[]
  ): GameEvent[] {
    const events: GameEvent[] = [];
    const now = gameTimePassed;

    // 1. 系统级宏观事件判定
    if (probabilityCheck(EVENT_CONFIG.PROBABILITY.hub_anomaly) && this.canTriggerGlobal('hub_anomaly', now)) {
      events.push(this.createHubAnomalyEvent());
    }
    if (probabilityCheck(EVENT_CONFIG.PROBABILITY.resonance) && this.canTriggerGlobal('resonance', now)) {
      events.push(this.createResonanceSurgeEvent());
    }

    const candidates = targetIds
      ? targetIds.reduce<Maiden[]>((acc, id) => {
        const m = maidens.get(id);
        if (m) acc.push(m);
        return acc;
      }, [])
      : Array.from(maidens.values());

    // 预处理车厢拓扑映射，用于高效匹配同区域实体
    const carriageMaidenMap = new Map<string, Maiden[]>();
    for (const maiden of candidates) {
      const cid = getCurrentCarriageId(maiden);
      if (!carriageMaidenMap.has(cid)) {
        carriageMaidenMap.set(cid, []);
      }
      carriageMaidenMap.get(cid)!.push(maiden);
    }

    for (const maiden of candidates) {
      const carriageId = getCurrentCarriageId(maiden);
      const carriage = carriages.get(carriageId);
      if (!carriage) continue;

      // 2. 梦魇侵袭 (睡眠状态异常)
      if (
        maiden.behavior.currentActivity === 'sleeping' &&
        maiden.attributes.sanity < 50 &&
        probabilityCheck(EVENT_CONFIG.PROBABILITY.nightmare) &&
        this.canTriggerGlobal('nightmare', now)
      ) {
        events.push(this.createNightmareEvent(maiden, carriage));
      }

      // 3. 精神崩溃 (临界理智熔断)
      if (
        this.shouldTriggerBreakdown(maiden.attributes.sanity, maiden.status.includes('broken')) &&
        this.canTriggerGlobal('breakdown', now)
      ) {
        events.push(this.createBreakdownEvent(maiden, carriage));
      }

      // 4. 堕落觉醒 (高欲求与高堕落共振)
      if (
        maiden.attributes.corruption > 60 &&
        maiden.attributes.lust > 70 &&
        !maiden.status.includes('complicit') &&
        probabilityCheck(EVENT_CONFIG.PROBABILITY.awakening) &&
        this.canTriggerGlobal('awakening', now)
      ) {
        events.push(this.createAwakeningEvent(maiden, carriage));
      }

      // 5. 深渊幻视 (深渊空间负面效应)
      if (
        carriage.category === 'abyss' &&
        maiden.attributes.sanity < 60 &&
        probabilityCheck(EVENT_CONFIG.PROBABILITY.abyss_vision) &&
        this.canTriggerGlobal('abyss_vision', now)
      ) {
        events.push(this.createAbyssVisionEvent(maiden, carriage));
      }

      // 6. 妊娠表征显化 (孕期推进里程碑)
      const pregnancyInfo = maiden.physiology.pregnancy;
      if (
        pregnancyInfo &&
        pregnancyInfo.weekNumber >= 4 &&
        pregnancyInfo.weekNumber <= 8 &&
        !maiden.status.includes('pregnant') &&
        this.canTriggerGlobal('pregnancy', now)
      ) {
        events.push(this.createPregnancyEvent(maiden, carriage));
      }

      // 7. 社交动态事件判定
      const peers = carriageMaidenMap.get(carriageId)?.filter(m => m.id !== maiden.id) || [];
      if (peers.length > 0) {
        const randomPeer = randomElement(peers);
        if (randomPeer) {
          // 互相慰藉 (一方高压，一方低压容纳)
          if (
            maiden.attributes.stress > 60 && randomPeer.attributes.stress < 40 &&
            probabilityCheck(EVENT_CONFIG.PROBABILITY.comfort) &&
            this.canTriggerGlobal('comfort', now)
          ) {
            events.push(this.createComfortEvent(maiden, randomPeer, carriage));
          }
          // 冲突爆发 (双边高压应激)
          else if (
            maiden.attributes.stress > 70 && randomPeer.attributes.stress > 70 &&
            probabilityCheck(EVENT_CONFIG.PROBABILITY.conflict) &&
            this.canTriggerGlobal('conflict', now)
          ) {
            events.push(this.createConflictEvent(maiden, randomPeer, carriage));
          }
          // 建立友谊 (双边基础理智在线)
          else if (
            maiden.attributes.sanity > 40 && randomPeer.attributes.sanity > 40 &&
            probabilityCheck(EVENT_CONFIG.PROBABILITY.friendship) &&
            this.canTriggerGlobal('friendship', now)
          ) {
            events.push(this.createFriendshipEvent(maiden, randomPeer, carriage));
          }
        }
      }
    }

    return events;
  }

  // ============================================
  // [核心 API] 领域事件效能结算
  // ============================================
  public applyEventEffects(
    event: GameEvent,
    ctx: EventEffectContext
  ): Map<string, Maiden> {
    const { maidens, stateUpdaters, gameTimePassed } = ctx;
    const changedMaidens = new Map<string, Maiden>();

    for (const effect of event.effects) {
      switch (effect.type) {
        case 'attribute': {
          const targetId = effect.target === 'secondary' ? event.secondaryMaidenId : event.targetMaidenId;
          if (targetId) {
            this.applyAttributeEffect(maidens, changedMaidens, targetId, effect.key, effect.value);
          }
          break;
        }
        case 'status': {
          const targetId = effect.target === 'secondary' ? event.secondaryMaidenId : event.targetMaidenId;
          if (targetId) {
            this.applyStatusEffect(maidens, changedMaidens, targetId, effect.key, effect.add);
          }
          break;
        }
        case 'memory': {
          if (event.targetMaidenId) {
            this.applyMemoryEffect(maidens, changedMaidens, event.targetMaidenId, effect.key, effect.value, gameTimePassed);
          }
          break;
        }
        case 'rank': {
          if (event.targetMaidenId) {
            this.applyRankEffect(maidens, changedMaidens, event.targetMaidenId, effect.value);
          }
          break;
        }
        case 'pregnancy': {
          if (effect.key === 'reset' && event.targetMaidenId) {
            this.applyPregnancyReset(maidens, changedMaidens, event.targetMaidenId);
          }
          break;
        }
      }
    }

    return changedMaidens;
  }

  // ============================================
  // [私有辅助] 单体事件实例构造工厂
  // ============================================

  private createNightmareEvent(maiden: Maiden, carriage: Carriage): GameEvent {
    const descriptions = [
      `${maiden.name}在睡梦中惊醒，浑身冷汗。她梦见了那扇通往深渊的门。`,
      `${maiden.name}发出压抑的呜咽，噩梦中她看见了自己的倒影在镜中微笑。`,
      `${maiden.name}猛然坐起，眼中满是恐惧。她梦见了那永不停歇的钟摆。`,
    ];

    return {
      type: 'nightmare',
      targetMaidenId: maiden.id,
      carriageId: carriage.id,
      description: randomElement(descriptions) || descriptions[0],
      effects: [
        { type: 'attribute', target: 'maiden', key: 'sanity', value: -5 },
        { type: 'attribute', target: 'maiden', key: 'stress', value: 10 },
        { type: 'status', target: 'maiden', key: 'panicked', add: true },
      ],
      logType: 'narrative',
    };
  }

  private createBreakdownEvent(maiden: Maiden, carriage: Carriage): GameEvent {
    const descriptions = [
      `${maiden.name}突然跪倒在地，开始不受控制地颤抖和哭泣。她的精神防线彻底崩溃了。`,
      `${maiden.name}的眼神变得空洞，嘴角挂着诡异的微笑。她已经不再是原来的她了。`,
      `${maiden.name}发出一声尖叫，然后陷入了可怕的沉默。她的理智已经支离破碎。`,
    ];

    return {
      type: 'breakdown',
      targetMaidenId: maiden.id,
      carriageId: carriage.id,
      description: randomElement(descriptions) || descriptions[0],
      effects: [
        { type: 'status', target: 'maiden', key: 'broken', add: true },
        { type: 'attribute', target: 'maiden', key: 'sanity', value: -10 },
      ],
      logType: 'narrative',
    };
  }

  private createAwakeningEvent(maiden: Maiden, carriage: Carriage): GameEvent {
    return {
      type: 'awakening',
      targetMaidenId: maiden.id,
      carriageId: carriage.id,
      description: `${maiden.name}的眼中闪过一丝异样的光芒。她不再抗拒，而是开始主动迎合。`,
      effects: [
        { type: 'status', target: 'maiden', key: 'complicit', add: true },
        { type: 'attribute', target: 'maiden', key: 'corruption', value: 10 },
        { type: 'attribute', target: 'maiden', key: 'obedience', value: 15 },
      ],
      logType: 'narrative',
    };
  }

  private createAbyssVisionEvent(maiden: Maiden, carriage: Carriage): GameEvent {
    const visions = [
      `${maiden.name}看见了不应存在的东西——虚空中有无数只眼睛在注视着她。`,
      `${maiden.name}的影子开始独立移动，向她伸出了手。`,
      `${maiden.name}听见了自己的声音，但那声音来自镜子的另一边。`,
      `${maiden.name}感觉到时间在她周围扭曲，她看见了自己的过去和未来同时存在。`,
    ];

    return {
      type: 'abyss_vision',
      targetMaidenId: maiden.id,
      carriageId: carriage.id,
      description: randomElement(visions) || visions[0],
      effects: [
        { type: 'attribute', target: 'maiden', key: 'sanity', value: -8 },
        { type: 'attribute', target: 'maiden', key: 'stress', value: 15 },
        { type: 'attribute', target: 'maiden', key: 'devotion', value: 3 },
      ],
      logType: 'abyss',
    };
  }

  private createPregnancyEvent(maiden: Maiden, carriage: Carriage): GameEvent {
    return {
      type: 'pregnancy',
      targetMaidenId: maiden.id,
      carriageId: carriage.id,
      description: `${maiden.name}感到了身体的变化。她的腹部开始隆起——生命已经在她体内生根。`,
      effects: [
        { type: 'status', target: 'maiden', key: 'pregnant', add: true },
        { type: 'attribute', target: 'maiden', key: 'stress', value: 20 },
      ],
      logType: 'ritual',
    };
  }

  // ============================================
  // [私有辅助] 社交动态与系统事件构造工厂
  // ============================================

  private createFriendshipEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
    const descriptions = [
      `${maiden.name}和${peer.name}在黑暗中找到了彼此，她们在${carriage.name}中低声交谈，建立起脆弱的联系。`,
      `${maiden.name}靠在${peer.name}肩上，两人无声地分享着彼此的温暖。`,
    ];
    return {
      type: 'friendship',
      targetMaidenId: maiden.id,
      secondaryMaidenId: peer.id,
      carriageId: carriage.id,
      description: randomElement(descriptions) || descriptions[0],
      effects: [
        { type: 'attribute', target: 'maiden', key: 'sanity', value: 3 },
        { type: 'attribute', target: 'maiden', key: 'stress', value: -5 },
        { type: 'attribute', target: 'secondary', key: 'sanity', value: 3 },
        { type: 'attribute', target: 'secondary', key: 'stress', value: -5 },
      ],
      logType: 'social',
    };
  }

  private createConflictEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
    const descriptions = [
      `${maiden.name}和${peer.name}之间爆发了激烈的冲突。压抑的情绪在${carriage.name}中找到了失控的出口。`,
      `${maiden.name}狠狠地推了${peer.name}一把，积累在深渊中的怨恨在这一刻彻底爆发。`,
    ];
    return {
      type: 'conflict',
      targetMaidenId: maiden.id,
      secondaryMaidenId: peer.id,
      carriageId: carriage.id,
      description: randomElement(descriptions) || descriptions[0],
      effects: [
        { type: 'attribute', target: 'maiden', key: 'stress', value: 10 },
        { type: 'attribute', target: 'maiden', key: 'sanity', value: -2 },
        { type: 'attribute', target: 'secondary', key: 'stress', value: 10 },
        { type: 'attribute', target: 'secondary', key: 'sanity', value: -2 },
      ],
      logType: 'social',
    };
  }

  private createComfortEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
    const descriptions = [
      `${peer.name}轻轻拥抱了颤抖的${maiden.name}，在她耳边低声安慰。`,
      `${peer.name}握住了${maiden.name}的手，无声地向她传递着抵御深渊的力量。`,
    ];
    return {
      type: 'comfort',
      targetMaidenId: maiden.id,
      secondaryMaidenId: peer.id,
      carriageId: carriage.id,
      description: randomElement(descriptions) || descriptions[0],
      effects: [
        { type: 'attribute', target: 'maiden', key: 'stress', value: -15 },
        { type: 'attribute', target: 'maiden', key: 'sanity', value: 5 },
      ],
      logType: 'social',
    };
  }

  private createHubAnomalyEvent(): GameEvent {
    return {
      type: 'hub_anomaly',
      description: '警告：检测到空间异常。列车枢纽拓扑结构正在发生不可逆的随机重组。',
      effects: [
        { type: 'system', target: 'system', key: 'entropyLevel', value: 10 }
      ],
      logType: 'system',
    };
  }

  private createResonanceSurgeEvent(): GameEvent {
    return {
      type: 'resonance',
      description: '共振圣歌达到临界频率。所有单位的感官被强行剥夺，生理同步率急剧上升。',
      effects: [
        { type: 'system', target: 'system', key: 'resonanceFrequency', value: 15 }
      ],
      logType: 'system',
    };
  }

  // ============================================
  // [私有辅助] 算子变动写入策略
  // ============================================

  private applyAttributeEffect(
    sourceMaidens: Map<string, Maiden>,
    changedMaidens: Map<string, Maiden>,
    maidenId: string,
    key: AttributeKey,
    value: number
  ): void {
    const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
    if (!maiden || value === 0) return;

    const currentVal = maiden.attributes[key];
    if (typeof currentVal !== 'number') return;

    const nextVal = clamp(currentVal + value, 0, 100);
    if (currentVal === nextVal) return;

    const newMaiden: Maiden = {
      ...maiden,
      attributes: {
        ...maiden.attributes,
        [key]: nextVal
      }
    };

    changedMaidens.set(maidenId, newMaiden);
  }

  private applyStatusEffect(
    sourceMaidens: Map<string, Maiden>,
    changedMaidens: Map<string, Maiden>,
    maidenId: string,
    statusKey: CharacterStatus,
    add: boolean
  ): void {
    const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
    if (!maiden) return;

    const hasStatus = maiden.status.includes(statusKey);
    if (add && hasStatus) return;
    if (!add && !hasStatus) return;

    const newStatus = add
      ? [...maiden.status, statusKey]
      : maiden.status.filter(s => s !== statusKey);

    const newMaiden: Maiden = {
      ...maiden,
      status: newStatus
    };

    changedMaidens.set(maidenId, newMaiden);
  }

  private applyMemoryEffect(
    sourceMaidens: Map<string, Maiden>,
    changedMaidens: Map<string, Maiden>,
    maidenId: string,
    action: MemoryAction,
    value: string | undefined,
    gameTimePassed: number
  ): void {
    const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
    if (!maiden) return;

    const newMaiden: Maiden = { ...maiden, memoryChain: [...maiden.memoryChain] };

    switch (action) {
      case 'tamper': {
        const targetNodes = newMaiden.memoryChain.filter(n => n.type === 'original');
        const candidatePool = targetNodes.length > 0 ? targetNodes : newMaiden.memoryChain;
        const targetNode = randomElement(candidatePool);

        if (targetNode) {
          const corruptedNode = maidenMemory.tamperNode(
            targetNode,
            gameTimePassed,
            value || "记忆被深渊的雾霾吞没...",
            "深渊共鸣篡改"
          );
          newMaiden.memoryChain = newMaiden.memoryChain.map(n =>
            n.id === corruptedNode.id ? corruptedNode : n
          );
        }
        break;
      }
      case 'implant': {
        const content = typeof value === 'string' ? value : "不可名状的幻象植入";
        const newNode = maidenMemory.createImplantedNode(content, 'trauma', gameTimePassed);
        newMaiden.memoryChain.push(newNode);
        break;
      }
      case 'restore': {
        const corruptedNodes = newMaiden.memoryChain.filter(n => n.type === 'corrupted');
        const targetNode = randomElement(corruptedNodes);

        if (targetNode) {
          const restoredNode = maidenMemory.restoreNode(
            targetNode,
            gameTimePassed,
            value || targetNode.history?.[targetNode.history.length - 1]?.previousNarrative || targetNode.objectiveTruth
          );
          newMaiden.memoryChain = newMaiden.memoryChain.map(n =>
            n.id === restoredNode.id ? restoredNode : n
          );
        }
        break;
      }
    }

    newMaiden.memorySummary = maidenMemory.generateSummaryFromChain(newMaiden.memoryChain);
    changedMaidens.set(maidenId, newMaiden);
  }

  private applyRankEffect(
    sourceMaidens: Map<string, Maiden>,
    changedMaidens: Map<string, Maiden>,
    maidenId: string,
    rank: CharacterRank
  ): void {
    const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
    if (!maiden || maiden.rank === rank) return;

    changedMaidens.set(maidenId, { ...maiden, rank });
  }

  private applyPregnancyReset(
    sourceMaidens: Map<string, Maiden>,
    changedMaidens: Map<string, Maiden>,
    maidenId: string
  ): void {
    const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
    if (!maiden) return;

    const newMaiden: Maiden = {
      ...maiden,
      status: maiden.status.filter(s => s !== 'pregnant' && s !== 'gestating'),
      physiology: {
        ...maiden.physiology,
        pregnancy: null
      },
      birthCount: maiden.birthCount + 1
    };

    changedMaidens.set(maidenId, newMaiden);
  }

  // ============================================
  // [私有计算] 机制校验与状态探测
  // ============================================

  private shouldTriggerBreakdown(sanity: number, isCurrentlyBroken: boolean): boolean {
    if (isCurrentlyBroken) return false;
    if (sanity <= 0) return probabilityCheck(0.8);
    if (sanity < 15) return probabilityCheck(0.15);
    return false;
  }

  private canTriggerGlobal(type: EventType, now: number): boolean {
    const lastTime = this.globalEventTimestamps.get(type) || 0;
    const cooldown = EVENT_CONFIG.COOLDOWNS[type] || 30000;

    if (now - lastTime < cooldown) return false;

    this.globalEventTimestamps.set(type, now);
    return true;
  }

  // ============================================
  // 时序追踪持久化
  // ============================================

  public serialize(): [string, number][] {
    return Array.from(this.globalEventTimestamps.entries());
  }

  public deserialize(data: [string, number][]): void {
    this.globalEventTimestamps = new Map(data as [EventType, number][]);
  }
}

// ============================================
// 单例领域服务实例暴露
// ============================================
export const maidenRandomEvent = new MaidenRandomEvent();