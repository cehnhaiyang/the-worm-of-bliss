// ============================================
// 少女行为决策 - 需求计算与行为选择
// Maiden Behavior - Need calculation & behavior decisions
// 基于 IS-SHEX 六维层级人格模型
// ============================================

import {
  Carriage,
  CarriageType,
  Maiden,
  BehaviorState,
  MoodState,
  ISShexPersonality,
  ActivityStatus,
  UnifiedMovementState,
  HexacoProfile,
  SituationType,
  findNearestCarriageByType,
  findNearestCarriageByFunction,
  parseCarriageId,
  makeCarriageId,
  isRestTime,
  startMovement,
  getCurrentCarriageId
} from '../../../meta';

import {
  GAME_CONFIG,
  CARRIAGE_FUNCTIONS,
  NEED_THRESHOLDS,
  PERSONALITY_MODS,
} from '../../../constants';

/** 情境-特质激活映射 */
const SITUATION_TRAIT_ACTIVATION: Record<SituationType, {
  primary: keyof HexacoProfile;
  secondary: keyof HexacoProfile;
  description: string;
}> = {
  threat: { primary: 'E', secondary: 'A', description: '威胁敏感度与对抗反应' },
  opportunity: { primary: 'X', secondary: 'O', description: '奖赏追求与探索倾向' },
  task: { primary: 'C', secondary: 'H', description: '执行力与规则遵守' },
  intimate: { primary: 'E', secondary: 'A', description: '情感共鸣与温和度' },
  competition: { primary: 'X', secondary: 'A', description: '社交大胆与对抗性' },
  ambiguous: { primary: 'O', secondary: 'E', description: '认知开放与焦虑反应' },
};

// 情绪对行为的影响权重
export const MOOD_BEHAVIOR_MODIFIERS: Record<MoodState, {
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

/** 车厢类型到情境类型的映射 */
const CARRIAGE_SITUATION_MAP: Record<CarriageType, SituationType> = {
  // 圣所
  'POOLS': 'intimate',
  'ATRIUM': 'opportunity',
  'VEIL': 'intimate',
  'CONFESSIONAL': 'task',
  'ARCHIVE': 'ambiguous',
  'MUSE_THEATRE': 'competition',
  'SCALES_CONSERVATORY': 'competition',
  'GARDEN': 'opportunity',
  'NURSERY': 'intimate',
  'ALTAR': 'task',
  'CAULDRON': 'threat',
  // 深渊
  'SILENT_SALON': 'ambiguous',
  'ORACLE_WHISPER': 'ambiguous',
  'NEGATIVE_GALLERY': 'ambiguous',
  'ESCHER_STAIRS': 'threat',
  'MIRROR_HALL': 'threat',
  'TIME_INFIRMARY': 'threat',
  'DISSOLUTION_CHAMBER': 'threat',
  'FLESH_HIVE': 'threat',
  'INVERTED_TREE': 'threat',
  'SYMBIOTIC_GALLERY': 'threat',
  'VOID_WINDOW': 'threat',
  'ENTROPY_CLOCK': 'threat',
};

export class MaidenBehavior {
  // 当前游戏时间（毫秒累计），确保行为决策基于游戏逻辑流转时间
  private currentGameTime: number = 0;

  private getGameNow(): number {
    return this.currentGameTime;
  }

  // 获取情境对人格特质的激活修正
  private getTraitActivationMultiplier(personality: ISShexPersonality, situation: SituationType): number {
    const activation = SITUATION_TRAIT_ACTIVATION[situation];
    const primaryTrait = personality.hexaco[activation.primary];
    // 特质极端值（偏离50）在对应情境下反应更剧烈，修正系数在 0.85 - 1.25 之间
    return 0.85 + Math.abs(primaryTrait - 50) * 0.008;
  }

  // 获取行为权重映射矩阵
  private getWeights(personality: ISShexPersonality) {
    return personality.behaviorWeights;
  }

  // 计算需求优先级（基于IS-SHEX人格与当前情境）
  calculateNeedPriorities(
    maiden: Maiden,
    currentCarriage?: Carriage,
    gameTime?: number
  ): { need: string; urgency: number; activity: ActivityStatus; targetType: CarriageType }[] {
    const { attributes: a, physiology, isshex } = maiden;
    const weights = this.getWeights(isshex);
    const { hexaco, facets } = isshex;
    const needs: { need: string; urgency: number; activity: ActivityStatus; targetType: CarriageType }[] = [];

    const situation: SituationType = currentCarriage ? CARRIAGE_SITUATION_MAP[currentCarriage.type] : 'ambiguous';
    const traitMod = this.getTraitActivationMultiplier(isshex, situation);

    // 疲劳需求 - 睡眠
    if (a.fatigue > NEED_THRESHOLDS.LOW) {
      let urgency = a.fatigue;
      if (a.fatigue > NEED_THRESHOLDS.CRITICAL) urgency += 50;
      urgency *= (1 + (hexaco.C - 50) * 0.01);

      if (situation === 'task') urgency *= (0.8 / traitMod);
      if (situation === 'threat') urgency *= (1.2 * traitMod);

      needs.push({ need: 'sleep', urgency, activity: 'sleeping', targetType: 'ATRIUM' });
    }

    // 饥饿需求 - 进食
    if (a.hunger > NEED_THRESHOLDS.LOW) {
      let urgency = a.hunger;
      if (a.hunger > NEED_THRESHOLDS.CRITICAL) urgency += 50;
      needs.push({ need: 'eat', urgency, activity: 'eating', targetType: 'ATRIUM' });
    }

    // 清洁需求 - 沐浴
    if (a.hygiene < 100 - NEED_THRESHOLDS.LOW) {
      let urgency = 100 - a.hygiene;
      if (a.hygiene < 100 - NEED_THRESHOLDS.HIGH) urgency += 20;
      urgency *= (1 + (facets.organization - 50) * 0.015);
      urgency *= (1 + (facets.aestheticAppreciation - 50) * 0.01);

      if (situation === 'intimate') urgency *= 1.3;

      needs.push({ need: 'bathe', urgency, activity: 'bathing', targetType: 'POOLS' });
    }

    // 压力需求 - 休憩/祈祷
    if (a.stress > NEED_THRESHOLDS.MODERATE) {
      let urgency = a.stress * (1 / weights.stressResistance);

      if (situation === 'threat') urgency *= (1.4 * traitMod);
      if (situation === 'competition') urgency *= 1.2;

      if (weights.devotionTendency > 0.5) {
        needs.push({ need: 'pray', urgency: urgency * 1.5, activity: 'confessing', targetType: 'ALTAR' });
      } else if (facets.fearfulness > 60 && hexaco.X < 40) {
        needs.push({ need: 'hide', urgency: urgency * 1.2, activity: 'wandering', targetType: 'GARDEN' });
      } else {
        needs.push({ need: 'relax', urgency, activity: 'wandering', targetType: 'GARDEN' });
      }
    }

    // 欲望需求
    if (a.lust > NEED_THRESHOLDS.MODERATE * (1 / weights.lustSensitivity)) {
      let urgency = a.lust * weights.lustSensitivity;

      if (hexaco.O > 60 && facets.prudence < 40) {
        needs.push({ need: 'indulge', urgency: urgency * 1.5, activity: 'wandering', targetType: 'VEIL' });
      } else if (hexaco.H > 60) {
        needs.push({ need: 'confess', urgency: urgency * 1.2, activity: 'confessing', targetType: 'CONFESSIONAL' });
      } else if (hexaco.A < 40 && hexaco.H < 40) {
        needs.push({ need: 'submit', urgency, activity: 'wandering', targetType: 'VEIL' });
      }
    }

    // 社交需求
    const now = gameTime ?? this.getGameNow();
    const timeSinceInteraction = maiden.behavior.lastInteractionTime > 0
      ? Math.min(30, (now - maiden.behavior.lastInteractionTime) / 60000)
      : 20;
    let socialNeed = weights.socialSeek * 80 - timeSinceInteraction;

    if (situation === 'opportunity') socialNeed *= (1.2 * traitMod);
    if (situation === 'intimate') socialNeed *= 1.1;

    if (socialNeed > 20) {
      needs.push({ need: 'socialize', urgency: socialNeed, activity: 'chatting', targetType: 'ATRIUM' });
    }

    // 独处需求
    const solitudeNeed = weights.solitudeSeek * 60;
    if (solitudeNeed > 25 && a.stress > 40) {
      needs.push({ need: 'solitude', urgency: solitudeNeed, activity: 'wandering', targetType: 'ARCHIVE' });
    }

    // 虔诚需求
    if (weights.devotionTendency > 0.6 && a.devotion > 30) {
      needs.push({ need: 'worship', urgency: a.devotion * 0.8, activity: 'confessing', targetType: 'ALTAR' });
    }

    // 怀孕特殊需求
    if (physiology.pregnancy && physiology.pregnancy.stage !== 'none') {
      const pregnancyFatigue = physiology.pregnancy.weekNumber * 2;
      needs.push({ need: 'rest', urgency: 50 + pregnancyFatigue, activity: 'sleeping', targetType: 'NURSERY' });
    }

    return needs.sort((a, b) => b.urgency - a.urgency);
  }

  // 核心决策入口
  decideMaidenBehavior(
    maiden: Maiden,
    currentCarriage: Carriage,
    allCarriages: Map<string, Carriage>,
    allMaidens: Map<string, Maiden>,
    gameTimePassed: number
  ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
    const behavior = { ...maiden.behavior };
    this.currentGameTime = gameTimePassed;
    const now = gameTimePassed;
    const attrs = maiden.attributes;

    const moodMod = MOOD_BEHAVIOR_MODIFIERS[maiden.mood];

    // 意图锁定：正在移动中的实体不允许中断当前轨迹规划
    if (maiden.movement.isMoving) {
      return { behavior };
    }

    const timeElapsed = now - behavior.activityStartTime;
    const isEmergency = attrs.hunger > NEED_THRESHOLDS.CRITICAL ||
      attrs.fatigue > NEED_THRESHOLDS.CRITICAL ||
      attrs.sanity < 20;

    const adjustedDuration = behavior.activityDuration * moodMod.restPreference;

    if (timeElapsed < adjustedDuration && !isEmergency) {
      return { behavior };
    }

    const needs = this.calculateNeedPriorities(maiden, currentCarriage, gameTimePassed);
    const isNight = isRestTime(gameTimePassed);
    const carriageFunc = CARRIAGE_FUNCTIONS[currentCarriage.type];
    const situation = CARRIAGE_SITUATION_MAP[currentCarriage.type];

    // 威胁应激与状态崩溃校验
    if (attrs.sanity < 20 ||
      maiden.isshex.currentState === 'dissociated' ||
      (situation === 'threat' && attrs.sanity < 35 && Math.random() < 0.25)) {
      return this.createPanicBehavior(maiden, currentCarriage, allCarriages, behavior, gameTimePassed);
    }

    // 深渊观测强引力校验
    if (currentCarriage.category !== 'abyss' && !isNight) {
      const observeAction = this.checkForAbyssObservation(maiden, currentCarriage, allCarriages, behavior, gameTimePassed);
      if (observeAction) {
        return observeAction;
      }
    }

    // 周期性夜间强制休眠指令
    if (isNight && attrs.fatigue > 40) {
      if (carriageFunc.canSleep) {
        return {
          behavior: this.createActivityBehavior(
            'sleeping',
            GAME_CONFIG.DURATIONS.SLEEP,
            behavior,
            gameTimePassed
          )
        };
      }
      const sleepCarriageId = findNearestCarriageByFunction(currentCarriage, allCarriages, 'canSleep');
      if (sleepCarriageId) {
        return this.executeMovement(maiden, sleepCarriageId, 'sleeping', allCarriages, gameTimePassed);
      }
    }

    // 需求满足逻辑树
    if (needs.length > 0) {
      const topNeed = needs[0];

      if (this.canSatisfyNeed(currentCarriage, topNeed.need)) {
        return {
          behavior: this.createActivityBehavior(
            topNeed.activity,
            this.getDurationForActivity(topNeed.activity),
            behavior,
            gameTimePassed
          )
        };
      }

      const targetCarriageId = findNearestCarriageByType(
        currentCarriage,
        allCarriages,
        topNeed.targetType
      );

      if (targetCarriageId && targetCarriageId !== currentCarriage.id) {
        return this.executeMovement(maiden, targetCarriageId, topNeed.activity, allCarriages, gameTimePassed);
      }
    }

    // 默认空闲状态巡游
    return this.createDefaultBehavior(maiden, currentCarriage, allCarriages, allMaidens, behavior, gameTimePassed, moodMod);
  }

  // 深渊诱惑计算系统
  private checkForAbyssObservation(
    maiden: Maiden,
    currentCarriage: Carriage,
    allCarriages: Map<string, Carriage>,
    behavior: BehaviorState,
    gameTimePassed: number
  ): { behavior: BehaviorState; movement?: UnifiedMovementState } | null {
    const currentId = getCurrentCarriageId(maiden);
    const coords = parseCarriageId(currentId);
    if (!coords) return null;

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    let adjacentAbyssId: string | null = null;

    for (const [dr, dc] of directions) {
      const nr = coords.row + dr;
      const nc = coords.col + dc;
      const neighborId = makeCarriageId(nr, nc);
      const neighbor = allCarriages.get(neighborId);

      if (neighbor && neighbor.category === 'abyss') {
        adjacentAbyssId = neighborId;
        break;
      }
    }

    if (!adjacentAbyssId) return null;

    const attrs = maiden.attributes;
    const { hexaco, facets, darkTetrad } = maiden.isshex;
    const weights = this.getWeights(maiden.isshex);

    let peekChance = PERSONALITY_MODS.ABYSS_PEEK_BASE;

    if (attrs.sanity < 50) peekChance += PERSONALITY_MODS.ABYSS_PEEK_LOW_SANITY;
    if (attrs.sanity < 30) peekChance += PERSONALITY_MODS.ABYSS_PEEK_VERY_LOW_SANITY;
    if (attrs.corruption > 40) peekChance += PERSONALITY_MODS.ABYSS_PEEK_HIGH_CORRUPTION;
    if (attrs.corruption > 70) peekChance += PERSONALITY_MODS.ABYSS_PEEK_VERY_HIGH_CORRUPTION;
    if (attrs.stress > 80) peekChance += PERSONALITY_MODS.ABYSS_PEEK_HIGH_STRESS;

    peekChance *= (1 + (hexaco.O - 50) * PERSONALITY_MODS.ABYSS_PEEK_O_MOD);
    peekChance *= (1 + (50 - facets.fearfulness) * PERSONALITY_MODS.ABYSS_PEEK_FEAR_MOD);
    peekChance *= (1 + weights.riskTolerance * PERSONALITY_MODS.ABYSS_PEEK_RISK_MOD);
    peekChance *= (1 + (darkTetrad.psychopathy - 50) * PERSONALITY_MODS.ABYSS_PEEK_PSYCHOPATHY_MOD);

    if (maiden.status.includes('voyeur')) peekChance += PERSONALITY_MODS.ABYSS_PEEK_VOYEUR_BONUS;

    const clampedPeekChance = Math.min(1, Math.max(0, peekChance));
    if (Math.random() < clampedPeekChance) {
      return {
        behavior: this.createActivityBehavior('observing', 10, behavior, gameTimePassed)
      };
    }

    return null;
  }

  // 应激与恐慌行为代理
  private createPanicBehavior(
    maiden: Maiden,
    currentCarriage: Carriage,
    allCarriages: Map<string, Carriage>,
    behavior: BehaviorState,
    gameTimePassed: number
  ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
    const { hexaco, facets } = maiden.isshex;
    const weights = this.getWeights(maiden.isshex);

    if (facets.fearfulness > 60 && hexaco.X < 40) {
      return { behavior: this.createActivityBehavior('wandering', 10, behavior, gameTimePassed) };
    }
    else if (weights.devotionTendency > 0.6) {
      const altar = findNearestCarriageByType(currentCarriage, allCarriages, 'ALTAR');
      if (altar) return this.executeMovement(maiden, altar, 'confessing', allCarriages, gameTimePassed);
    }
    else if (hexaco.X > 50 && facets.fearfulness < 50) {
      const safeCarriages = Array.from(allCarriages.values())
        .filter(c => c.category !== 'abyss' && c.isAccessible);
      if (safeCarriages.length > 0) {
        const target = safeCarriages[Math.floor(Math.random() * safeCarriages.length)];
        return this.executeMovement(maiden, target.id, 'wandering', allCarriages, gameTimePassed);
      }
    }

    const garden = findNearestCarriageByType(currentCarriage, allCarriages, 'GARDEN');
    if (garden) {
      return this.executeMovement(maiden, garden, 'wandering', allCarriages, gameTimePassed);
    }

    return { behavior: this.createActivityBehavior('wandering', 5, behavior, gameTimePassed) };
  }

  // 默认游荡状态路由计算
  private createDefaultBehavior(
    maiden: Maiden,
    currentCarriage: Carriage,
    allCarriages: Map<string, Carriage>,
    allMaidens: Map<string, Maiden>,
    behavior: BehaviorState,
    gameTimePassed: number,
    moodMod: typeof MOOD_BEHAVIOR_MODIFIERS[MoodState]
  ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
    const { hexaco, facets } = maiden.isshex;
    const weights = this.getWeights(maiden.isshex);
    const rand = Math.random();

    if (weights.devotionTendency > 0.6 && rand < 0.4) {
      const altar = findNearestCarriageByType(currentCarriage, allCarriages, 'ALTAR');
      if (altar && altar !== currentCarriage.id) {
        return this.executeMovement(maiden, altar, 'confessing', allCarriages, gameTimePassed);
      }
    }
    else if (hexaco.O > 60 && facets.liveliness > 55 && rand < 0.4) {
      const targets: CarriageType[] = ['POOLS', 'VEIL', 'ATRIUM'];
      const targetType = targets[Math.floor(Math.random() * targets.length)];
      const carriage = findNearestCarriageByType(currentCarriage, allCarriages, targetType);
      if (carriage && carriage !== currentCarriage.id) {
        return this.executeMovement(maiden, carriage, 'wandering', allCarriages, gameTimePassed);
      }
    }
    else if (hexaco.X < 45 && facets.inquisitiveness > 55 && rand < 0.3) {
      const archive = findNearestCarriageByType(currentCarriage, allCarriages, 'ARCHIVE');
      if (archive && archive !== currentCarriage.id) {
        return this.executeMovement(maiden, archive, 'wandering', allCarriages, gameTimePassed);
      }
    }
    else if (facets.dependence > 55 && facets.fearfulness > 50 && rand < 0.3) {
      const crowdedSafe = this.findCrowdedSafeCarriage(allCarriages);
      if (crowdedSafe && crowdedSafe !== currentCarriage.id) {
        return this.executeMovement(maiden, crowdedSafe, 'wandering', allCarriages, gameTimePassed);
      }
    }
    else if (weights.riskTolerance > 0.5 && facets.fearfulness < 40 && rand < 0.15) {
      const abyssEdge = this.findSafeAbyssCarriage(allCarriages);
      if (abyssEdge && abyssEdge !== currentCarriage.id) {
        return this.executeMovement(maiden, abyssEdge, 'wandering', allCarriages, gameTimePassed);
      }
    }

    const socialChance = weights.socialSeek * moodMod.socialChance;
    if (rand < socialChance && currentCarriage.occupants.length > 1) {
      return { behavior: this.createActivityBehavior('chatting', 20, behavior, gameTimePassed) };
    }

    const safeTypes: CarriageType[] = ['ATRIUM', 'GARDEN', 'POOLS'];
    const targetType = safeTypes[Math.floor(Math.random() * safeTypes.length)];
    const target = findNearestCarriageByType(currentCarriage, allCarriages, targetType);

    const moveChance = 0.3 * moodMod.moveChance;
    if (target && target !== currentCarriage.id && Math.random() < moveChance) {
      return this.executeMovement(maiden, target, 'wandering', allCarriages, gameTimePassed);
    }

    return { behavior: this.createActivityBehavior('wandering', 15, behavior, gameTimePassed) };
  }

  // 纯净状态机切面隔离构建
  private createActivityBehavior(
    activity: ActivityStatus,
    durationMinutes: number,
    oldBehavior: BehaviorState,
    gameTime: number
  ): BehaviorState {
    const variance = GAME_CONFIG.DURATIONS.DURATION_VARIANCE;
    const actualDuration = durationMinutes * (1 - variance / 2 + Math.random() * variance);

    // 社交上下文状态清理，保证孤立活动不留存脏数据
    const isSocialActivity = activity === 'chatting';

    return {
      currentActivity: activity,
      activityStartTime: gameTime,
      activityDuration: actualDuration * 60 * 1000,
      lastInteractionTime: oldBehavior.lastInteractionTime,
      previousActivity: oldBehavior.currentActivity,
      socialContext: isSocialActivity ? oldBehavior.socialContext : undefined,
    };
  }

  // 跨节点拓扑路由计算与移动意图封装
  private executeMovement(
    maiden: Maiden,
    targetCarriageId: string,
    intendedActivity: ActivityStatus,
    allCarriages: Map<string, Carriage>,
    gameTime: number
  ): { behavior: BehaviorState; movement: UnifiedMovementState } {
    const currentId = getCurrentCarriageId(maiden);
    const movementPath = this.findPath(currentId, targetCarriageId, allCarriages);

    // 启动物理移动流转，分配预期消耗时间基准常量
    const estimatedDuration = movementPath.length * GAME_CONFIG.DURATIONS.WANDER * 60 * 1000;
    const movement = startMovement(maiden.movement, targetCarriageId, intendedActivity, movementPath, estimatedDuration);

    // 在抵达意图前处于默认的游荡状态机中
    const behavior = this.createActivityBehavior('wandering', 5, maiden.behavior, gameTime);

    return { behavior, movement };
  }

  // BFS寻路算法拓扑推导
  private findPath(
    startCarriageId: string,
    targetCarriageId: string,
    allCarriages: Map<string, Carriage>
  ): string[] {
    if (startCarriageId === targetCarriageId) {
      return [startCarriageId];
    }

    const start = parseCarriageId(startCarriageId);
    const target = parseCarriageId(targetCarriageId);

    if (!start || !target) {
      return [targetCarriageId];
    }

    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startCarriageId, path: [startCarriageId] }];
    visited.add(startCarriageId);

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.id === targetCarriageId) {
        return current.path;
      }

      const currentPos = parseCarriageId(current.id);
      if (!currentPos) continue;

      for (const [dr, dc] of directions) {
        const nr = currentPos.row + dr;
        const nc = currentPos.col + dc;
        const neighborId = makeCarriageId(nr, nc);

        if (visited.has(neighborId)) continue;

        const neighbor = allCarriages.get(neighborId);
        if (neighbor && neighbor.isAccessible) {
          visited.add(neighborId);
          queue.push({
            id: neighborId,
            path: [...current.path, neighborId]
          });
        }
      }
    }

    return [targetCarriageId];
  }

  // 验证目标设施物理机能可行性
  private canSatisfyNeed(carriage: Carriage, need: string): boolean {
    const func = CARRIAGE_FUNCTIONS[carriage.type];
    switch (need) {
      case 'sleep': case 'rest': return func.canSleep;
      case 'eat': return func.canEat;
      case 'bathe': return func.canBathe;
      case 'pray': case 'worship': case 'confess': return func.canPray;
      case 'socialize': return func.canSocialize && carriage.category !== 'abyss';
      case 'solitude': return !func.canSocialize || carriage.occupants.length <= 1;
      default: return true;
    }
  }

  // 社交热点安全区扫描
  private findCrowdedSafeCarriage(allCarriages: Map<string, Carriage>): string | null {
    let best: string | null = null;
    let maxOccupants = 2;

    for (const [id, c] of allCarriages) {
      if (c.category === 'abyss' || !c.isAccessible) continue;
      if (c.occupants.length > maxOccupants) {
        maxOccupants = c.occupants.length;
        best = id;
      }
    }
    return best;
  }

  // 深渊边缘锚点提取 (T1级隔离区)
  private findSafeAbyssCarriage(allCarriages: Map<string, Carriage>): string | null {
    const tier1Abyss = [
      'SILENT_SALON',
      'ORACLE_WHISPER',
      'NEGATIVE_GALLERY',
    ];

    for (const [id, c] of allCarriages) {
      if (c.isAccessible && tier1Abyss.includes(c.type)) {
        return id;
      }
    }
    return null;
  }

  // 状态机时间轴基数测算
  getDurationForActivity(activity: string): number {
    const { DURATIONS } = GAME_CONFIG;
    switch (activity) {
      case 'sleeping': return DURATIONS.SLEEP;
      case 'eating': return DURATIONS.EAT;
      case 'bathing': return DURATIONS.BATH;
      case 'confessing': return DURATIONS.CONFESS;
      case 'devoted': return DURATIONS.CONFESS * 1.5;
      case 'chatting': return 20;
      case 'observing': return 10;
      default: return DURATIONS.WANDER;
    }
  }
}

export const maidenBehavior = new MaidenBehavior();