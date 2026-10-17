import {
  CarriageFunction, EventType, ActivityStatus, PersonalityState, RelationType, PregnancyStage, GraceType,
  Carriage,
  UnifiedMovementState,
  MovementIntent,
  Relationship,
  PregnancyState,
  NarcissusState,
  RelationshipNetworkData,
  PregnancyData,
  NarcissusData,
  EventTimestampData,
  Maiden,
  CharacterAttributes,
  MemoryNode,
  HexacoFacets,
  HexacoProfile,
  OctantId,
  SignatureId,
  TimePeriod,
  BehaviorWeights,
  PregnancyStats,
  RelationshipStats
} from './meta';
import { getCarriageTemplate, isTemplateAccessible, GRACE_REWARDS, GAME_CONFIG } from './constants';

// ============================================
// 1. 基础数学与概率
// ============================================

/**
 * 将数值限制在指定阈值范围内
 */
export const clamp = (value: number, min: number = 0, max: number = 100): number =>
  Math.min(max, Math.max(min, value));

/**
 * 生成指定范围内的随机整数 [min, max]
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * 生成指定范围内的随机浮点数 [min, max)
 */
export const randomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

/**
 * 依据权重执行随机抽取
 */
export const weightedRandom = <T,>(items: { item: T; weight: number }[]): T => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('weightedRandom: 权重数组为空或类型非法');
  }

  const validItems = items.filter(item => item.weight > 0);

  if (validItems.length === 0) {
    return items[0].item;
  }

  const totalWeight = validItems.reduce((sum, i) => sum + i.weight, 0);

  if (totalWeight <= 0) {
    return validItems[0].item;
  }

  let random = Math.random() * totalWeight;

  for (const { item, weight } of validItems) {
    random -= weight;
    if (random <= 0) return item;
  }

  return validItems[validItems.length - 1].item;
};

/**
 * 绝对概率判定
 */
export const probabilityCheck = (probability: number): boolean => Math.random() < probability;

/**
 * 基于角色属性特征的概率乘区修正
 */
export const modifiedProbability = (
  baseProbability: number,
  modifiers: { value: number; weight: number }[]
): number => {
  let modifier = 1;
  for (const { value, weight } of modifiers) {
    modifier *= 1 + (value / 100 - 0.5) * weight;
  }
  return clamp(baseProbability * modifier, 0, 1);
};

/**
 * 判断记忆节点是否"被改动过"——篡改或植入。
 * 登车瞬间（死节点）只是不可编辑，不属于被污染的记忆，故不计入。
 */
export const isAlteredMemory = (node: MemoryNode): boolean =>
  node.type === 'corrupted' || node.type === 'implanted';

// ============================================
// 2. 字符串处理与标识生成
// ============================================

/**
 * 生成系统级唯一标识符（优先调用高熵原生接口）
 */
export const generateId = (prefix: string = ''): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix ? `${prefix}_${crypto.randomUUID()}` : crypto.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 11);
  const random2 = Math.random().toString(36).substring(2, 11);
  const performanceCounter = (typeof performance !== 'undefined' ? performance.now() * 1000 : 0).toString(36);

  const id = `${timestamp}_${random1}_${random2}_${performanceCounter}`;
  return prefix ? `${prefix}_${id}` : id;
};

/**
 * 计算字符串的32位特征哈希码
 */
export const hashCode = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
};

/**
 * 基于字典的动态模板注入
 */
export const formatTemplate = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key) => values[key] !== undefined ? values[key] : match);

// ============================================
// 3. 数组变换矩阵
// ============================================

/**
 * 提取数组随机元素
 */
export const randomElement = <T,>(array: T[]): T | undefined => {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * 数组混淆重排
 */
export const shuffleArray = <T,>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * 数组分块切片
 */
export const chunkArray = <T,>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// ============================================
// 4. 时序流转处理
// ============================================

/**
 * 格式化世界运行时钟展示
 */
export const formatGameTimeDisplay = (gameTimePassed: number, startTime?: number, includeSeconds: boolean = true): string => {
  const currentTotal = startTime ? startTime + gameTimePassed : gameTimePassed;
  const days = Math.floor(currentTotal / (24 * 60 * 60 * 1000)) + 1;
  const totalSeconds = Math.floor(currentTotal / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const hourStr = hours.toString().padStart(2, '0');
  const minStr = minutes.toString().padStart(2, '0');

  if (includeSeconds) {
    const seconds = totalSeconds % 60;
    return `Day ${days} - ${hourStr}:${minStr}:${seconds.toString().padStart(2, '0')}`;
  }
  return `Day ${days} - ${hourStr}:${minStr}`;
};

/**
 * 把游戏时间毫秒格式化为 HH:MM:SS（24 小时制回绕）
 */
export const formatGameTime = (gameTimeMs: number): string => {
  const totalSeconds = Math.floor(gameTimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * 格式化实体精确年龄标识。
 *
 * 六个字段是同一段时长的定位切分：年恒为 365 天（与 `maiden.age` 同源），月取年的 1/12。
 * 月不能独立取 30 天——12×30=360≠365 时"1 年"与"12 个月"会互斥地描述同一段时长，
 * 真实存档里确实出现过 `16.12.1.17.49.46` 这种登车年龄。
 */
export const formatPreciseAge = (ageInMs: number): string => {
  // 单位只在本函数内使用，且每个都用两次，因此就地命名
  const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
  const MS_PER_MONTH = MS_PER_YEAR / 12;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const MS_PER_HOUR = 60 * 60 * 1000;
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_SECOND = 1000;

  const years = Math.floor(ageInMs / MS_PER_YEAR);
  let remaining = ageInMs % MS_PER_YEAR;

  const months = Math.floor(remaining / MS_PER_MONTH);
  remaining %= MS_PER_MONTH;

  const days = Math.floor(remaining / MS_PER_DAY);
  remaining %= MS_PER_DAY;

  const hours = Math.floor(remaining / MS_PER_HOUR);
  remaining %= MS_PER_HOUR;

  const minutes = Math.floor(remaining / MS_PER_MINUTE);
  remaining %= MS_PER_MINUTE;

  const seconds = Math.floor(remaining / MS_PER_SECOND);

  return `${years}.${months}.${days}.${hours}.${minutes}.${seconds}`;
};

/**
 * 登车时的精确年龄。
 *
 * `arrivalTimestamp` 是相对开局的游戏时刻，而登车发生在开局之前，所以它恒为负
 * （唯一调用点 `generateMaidens` 传的是 gameTimePassed = 0），登车年龄即 `initialAgeMs`
 * 加上这个偏移。曾经落盘的 `boardingAge` 字段就是这个值的快照——格式一改便永久过期，
 * 没有任何代码会重算它，故改为现算。
 *
 * 非正值一概不接受：那说明该戳属于另一套时钟（旧存档里存的是墙上时钟 epoch），
 * 当偏移用会算出七十多岁的登车年龄。这类数据没有可用的游戏时刻，只能按"开局即登车"处理。
 */
export const formatBoardingAge = (maiden: Maiden): string =>
  formatPreciseAge(maiden.initialAgeMs + Math.min(0, maiden.arrivalTimestamp));

export const msToMinutes = (ms: number): number => ms / (60 * 1000);

export const minutesToMs = (minutes: number): number => minutes * (60 * 1000);

export const getGameHour = (gameTimeMs: number): number => {
  const totalSeconds = Math.floor(gameTimeMs / 1000);
  return Math.floor(totalSeconds / 3600) % 24;
};

export const isRestTime = (gameTimeMs: number): boolean => {
  const hour = getGameHour(gameTimeMs);
  return hour >= 22 || hour < 6;
};

/**
 * 当前时段。
 *
 * 时刻边界只此一份：`TimePeriod` 只给名字，划分点全部落在这个函数里。
 */
export const getTimePeriod = (hour: number): TimePeriod => {
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 14) return 'noon';
  if (hour >= 14 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
};

// ============================================
// 5. 坐标网络与寻径
// ============================================

/**
 * 曼哈顿距离测算
 */
export const manhattanDistance = (
  pos1: { row: number; col: number },
  pos2: { row: number; col: number }
): number => Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);

/**
 * 逆向解析拓扑坐标标识
 */
export const parseCarriageId = (id: string): { row: number; col: number } | null => {
  const match = id.match(/R(\d+)C(\d+)/);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
};

/**
 * 构建拓扑坐标标识
 */
export const makeCarriageId = (row: number, col: number): string => `R${row}C${col}`;

const seededRandom = (seed: number): number => {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * 按功能获取临近车厢。
 *
 * 行为决策挑选目的地的唯一入口。车厢种类是开放集合，因此这里只匹配功能、不匹配
 * 具体车厢——新增车厢只要声明了功能就被自动纳入候选。
 *
 * **可能返回 `current` 本身**：距离为 0 也算最近。要"换一节车厢"的调用方必须自己
 * 判 `!== current.id`；只想"确保她待在能做这件事的地方"的调用方不必判——拿着当前
 * 车厢去移动会被就地开始活动处理。
 */
export const findNearestCarriageByFunction = (
  current: Carriage,
  allCarriages: Map<string, Carriage>,
  fn: CarriageFunction,
  options: { fuzzFactor?: number; seed?: number } = {}
): string | undefined => {
  const { fuzzFactor = 3, seed } = options;
  let nearest: string | undefined;
  let minDistance = Infinity;

  for (const [id, carriage] of allCarriages) {
    if (!isTemplateAccessible(carriage.templateId)) continue;
    if (!getCarriageTemplate(carriage.templateId)?.function.includes(fn)) continue;

    const distance = manhattanDistance(current.position, carriage.position);
    const fuzz = seed !== undefined ? seededRandom(seed + distance) * fuzzFactor : Math.random() * fuzzFactor;
    const fuzzyDistance = distance + fuzz;

    if (fuzzyDistance < minDistance) {
      minDistance = fuzzyDistance;
      nearest = id;
    }
  }

  return nearest;
};

// ============================================
// 6. 深层约束与流控
// ============================================

/**
 * 实体状态全量深度拷贝（优先原生层结构化克隆）
 */
export const deepCopy = <T,>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {
      // 静默降级
    }
  }

  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  if (obj instanceof Map) {
    const copy = new Map();
    obj.forEach((value, key) => copy.set(key, deepCopy(value)));
    return copy as T;
  }
  if (obj instanceof Set) {
    const copy = new Set();
    obj.forEach(value => copy.add(deepCopy(value)));
    return copy as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepCopy(item)) as T;
  }

  const copy = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      copy[key] = deepCopy(obj[key]);
    }
  }
  return copy;
};

/**
 * 执行频次防抖节流阀
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * 流量控制节流阀
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ============================================
// 7. 领域属性校验工具
// ============================================

/**
 * 核心维生基准属性边界收敛验证
 */
export const clampAttributes = (attributes: Partial<CharacterAttributes>): Partial<CharacterAttributes> => {
  const clamped: Partial<CharacterAttributes> = {};
  for (const key of Object.keys(attributes) as Array<keyof CharacterAttributes>) {
    const val = attributes[key];
    if (typeof val === 'number') {
      clamped[key] = clamp(val, 0, 100);
    }
  }
  return clamped;
};

// ============================================
// 8. 移动与空间导航枢纽
// ============================================

/**
 * 解析并提取当前动态目标车厢意图
 */
export const getTargetCarriageId = (movement: UnifiedMovementState): string | undefined =>
  movement.intent?.targetCarriageId;

/**
 * 读取实体当前锁定的物理所在车厢标识
 */
export const getCurrentCarriageId = (maiden: Maiden): string =>
  maiden.movement?.currentCarriageId ?? '';

/**
 * 基于不可变模式同步更新实体的物理落点网络
 */
export const setCurrentCarriageId = (maiden: Maiden, carriageId: string): Maiden => ({
  ...maiden,
  movement: {
    ...(maiden.movement || {}),
    currentCarriageId: carriageId,
  },
});

/**
 * 构建初始化运动流转聚合状态机
 */
export const createUnifiedMovementState = (
  currentCarriageId: string
): UnifiedMovementState => ({
  currentCarriageId,
  isMoving: false,
});

/**
 * 合并刷新统一运动状态
 */
export const updateMovementState = (
  movement: UnifiedMovementState,
  updates: Partial<UnifiedMovementState>
): UnifiedMovementState => ({
  ...movement,
  ...updates,
});

/**
 * 触发路径巡游意图。
 *
 * `movementPath` 是**剩余跳数且不含起点**：首元素即下一跳，空数组表示已在目的地。
 * 含起点会让每个 tick 的第一跳落在自己身上，而终点又由 completeMovement 一次性坍缩，
 * 于是整段路程在一帧内走完，`occupants` 却只记了一跳。
 */
export const startMovement = (
  movement: UnifiedMovementState,
  targetCarriageId: string,
  intendedActivity: ActivityStatus,
  movementPath: string[]
): UnifiedMovementState => {
  const intent: MovementIntent = {
    targetCarriageId,
    intendedActivity,
    movementPath,
  };

  return updateMovementState(movement, {
    intent,
    isMoving: movementPath.length > 0,
  });
};

/**
 * 消耗一步移动：把落点推进到下一跳并缩短剩余路径。
 * 只推进一格，因此实体在网格上的位置与 `occupants` 始终逐跳同步。
 */
export const stepMovement = (
  movement: UnifiedMovementState
): { nextCarriageId?: string; movement: UnifiedMovementState } => {
  const intent = movement.intent;
  if (!intent || intent.movementPath.length === 0) return { movement };

  const [nextCarriageId, ...rest] = intent.movementPath;

  return {
    nextCarriageId,
    movement: updateMovementState(movement, {
      currentCarriageId: nextCarriageId,
      intent: { ...intent, movementPath: rest },
      isMoving: rest.length > 0,
    }),
  };
};

/**
 * 闭合验证巡游到达，执行状态坍缩。
 * 只清除意图，位置在逐跳推进时已经同步，不在此处再改写。
 */
export const completeMovement = (movement: UnifiedMovementState): UnifiedMovementState => {
  if (!movement.intent) {
    return movement;
  }

  return updateMovementState(movement, {
    intent: undefined,
    isMoving: false,
  });
};

/**
 * 强行剥离当前运动意图并中止流转
 */
export const cancelMovement = (movement: UnifiedMovementState): UnifiedMovementState =>
  updateMovementState(movement, {
    intent: undefined,
    isMoving: false,
  });

// ============================================
// 9. 时光逆流转换器（存档向后兼容层）
// ============================================

export const convertRelationshipsFromLegacy = (legacy: [string, [string, Relationship][]][]): RelationshipNetworkData[] =>
  legacy.map(([maidenId, relationships]) => ({
    maidenId,
    relationships: relationships.map(([targetId, relationship]) => ({
      targetId,
      relationship
    }))
  }));

export const convertRelationshipsToLegacy = (data: RelationshipNetworkData[]): [string, [string, Relationship][]][] =>
  data.map(({ maidenId, relationships }) => [
    maidenId,
    relationships.map(({ targetId, relationship }) => [targetId, relationship])
  ]);

export const convertPregnancyFromLegacy = (legacy: [string, PregnancyState][]): PregnancyData[] =>
  legacy.map(([maidenId, pregnancyState]) => ({ maidenId, pregnancyState }));

export const convertPregnancyToLegacy = (data: PregnancyData[]): [string, PregnancyState][] =>
  data.map(({ maidenId, pregnancyState }) => [maidenId, pregnancyState]);

export const convertNarcissusFromLegacy = (legacy: [string, NarcissusState][]): NarcissusData[] =>
  legacy.map(([maidenId, narcissusState]) => ({ maidenId, narcissusState }));

export const convertNarcissusToLegacy = (data: NarcissusData[]): [string, NarcissusState][] =>
  data.map(({ maidenId, narcissusState }) => [maidenId, narcissusState]);

export const convertEventsFromLegacy = (legacy: [EventType, number][]): EventTimestampData[] =>
  legacy.map(([eventType, timestamp]) => ({ eventType, timestamp }));

export const convertEventsToLegacy = (data: EventTimestampData[]): [EventType, number][] =>
  data.map(({ eventType, timestamp }) => [eventType, timestamp]);

// ============================================
// 10. 命运交织：关系系统边界操作
// ============================================

/**
 * 构建高优实体连接寻址索引
 */
export const buildRelationshipIndex = (relationships: Relationship[]): Map<string, number> => {
  const index = new Map<string, number>();
  for (let i = 0; i < relationships.length; i++) {
    index.set(relationships[i].targetId, i);
  }
  return index;
};

/**
 * 取用惰性关系索引。
 *
 * 不能以"字段是否存在"判断可用性：存档是 JSON，Map 会被写成 `{}`，
 * 读档后该字段为真值却不是 Map，`get` 会在第一次关系结算时抛 TypeError。
 * 索引是纯派生物，因此这里只认"确实是 Map"，其余一律重建。
 */
const ensureRelationshipIndex = (maiden: Maiden): Map<string, number> => {
  if (maiden._relationshipIndex instanceof Map) return maiden._relationshipIndex;

  const index = buildRelationshipIndex(maiden.relationships || []);
  maiden._relationshipIndex = index;
  return index;
};

/**
 * 单向提取关系边快照
 */
export const getRelationship = (maiden: Maiden, targetId: string): Relationship | undefined => {
  if (!maiden.relationships) return undefined;

  const idx = ensureRelationshipIndex(maiden).get(targetId);
  return idx !== undefined ? maiden.relationships[idx] : undefined;
};

/**
 * 并发安全的关系状态写入流（遵循深度不可变克隆原则）
 */
export const setRelationship = (maiden: Maiden, rel: Relationship): Maiden => {
  const relationships = [...(maiden.relationships || [])];
  // 位置从当前数组现算，不读缓存索引：关系数组被整体替换过时，
  // 旧索引会指向错误的下标，写回就落到别人的边上。
  const idx = relationships.findIndex(r => r.targetId === rel.targetId);

  if (idx !== -1) {
    relationships[idx] = rel;
  } else {
    relationships.push(rel);
  }

  return {
    ...maiden,
    relationships,
    _relationshipIndex: buildRelationshipIndex(relationships),
  };
};

/**
 * 按 id 归并单个实体，返回新表。
 *
 * 这是整实体写入的唯一合并点：`updater` 收到**当前表里**的实体，因此异步结果
 * 不会覆盖请求在飞期间时间循环对该实体做的推进。实体已不存在时原样返回，不复活它。
 */
export const mergeMaiden = (
  maidens: Map<string, Maiden>,
  maidenId: string,
  updater: (current: Maiden) => Maiden
): Map<string, Maiden> => {
  const current = maidens.get(maidenId);
  if (!current) return maidens;
  const next = new Map(maidens);
  next.set(maidenId, updater(current));
  return next;
};

/**
 * 神恩结算的纯计算部分：抽一个奖励并算出受恩实体的新状态。
 *
 * 随机性被限制在这里，因此结果可以被单独断言；副作用（写池、记日志、播音效）
 * 留在调用方。属性按**当前值**增减而非绝对值，与叙事归并遵循同一条原则。
 */
export const rollGrace = (
  maiden: Maiden
): { type: GraceType; reward: string; maiden: Maiden } => {
  const types = Object.values(GraceType);
  const type = types[Math.floor(Math.random() * types.length)];
  const rewards = GRACE_REWARDS[type];
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  const effects = GAME_CONFIG.GRACE;

  return {
    type,
    reward,
    maiden: {
      ...maiden,
      graceReceived: maiden.graceReceived + 1,
      attributes: {
        ...maiden.attributes,
        stress: Math.max(0, maiden.attributes.stress - effects.STRESS_REDUCTION),
        devotion: Math.min(100, maiden.attributes.devotion + effects.DEVOTION_INCREASE),
        sanity: Math.min(100, maiden.attributes.sanity + effects.SANITY_INCREASE),
      },
      // 神恩带来安慰：恐惧状态就此解除
      status: maiden.status.filter(s => s !== 'panicked'),
    },
  };
};

/**
 * 全量输出关联投影数组隔离副本
 */
export const getAllRelationships = (maiden: Maiden): Relationship[] =>
  [...(maiden.relationships || [])];

/**
 * 真实关系边，按好感降序。
 *
 * 陌生关系不构成"联系"：`initializeNetwork` 会给同车厢的所有配对建边，
 * 若把它算进去，关系面板里每个人都会显示几十条"陌生"。
 */
export const getSignificantRelationships = (maiden: Maiden): Relationship[] =>
  getAllRelationships(maiden)
    .filter(r => r.type !== RelationType.STRANGER)
    .sort((a, b) => b.affinity - a.affinity);

/** 关系分组统计；判据只此一份，面板与摘要都读它 */
export const getRelationshipStats = (relationships: Relationship[]): RelationshipStats => ({
  friends: relationships.filter(r => r.type === RelationType.FRIEND || r.type === RelationType.CLOSE_FRIEND).length,
  enemies: relationships.filter(r => r.type === RelationType.RIVAL || r.type === RelationType.ENEMY).length,
  accomplices: relationships.filter(r => r.type === RelationType.ACCOMPLICE).length,
  protectors: relationships.filter(r => r.type === RelationType.PROTECTOR).length,
  dependents: relationships.filter(r => r.type === RelationType.DEPENDENT).length,
  traumaBonds: relationships.filter(r => r.sharedTrauma).length,
});

/**
 * 妊娠群体统计。
 *
 * 按 `physiology.pregnancy` 判定而不是按 `pregnant` 标签：标签要等 isDiscovered
 * 之后才由 `syncToMaiden` 加上，未显怀的妊娠同样是妊娠。
 */
export const getPregnancyStats = (maidens: Map<string, Maiden>): PregnancyStats => {
  const byStage: Record<PregnancyStage, number> = {
    none: 0, conception: 0, early: 0, middle: 0, late: 0, labor: 0,
  };
  let total = 0;
  let totalWeeks = 0;

  for (const maiden of maidens.values()) {
    const state = maiden.physiology.pregnancy;
    if (!state) continue;
    total++;
    byStage[state.stage]++;
    totalWeeks += state.weekNumber;
  }

  return { total, byStage, averageWeek: total > 0 ? totalWeeks / total : 0 };
};

// ============================================
// 11. 人格派生（权威为 HexacoFacets）
// ============================================

/**
 * 维度分数：仅在各维度子维度齐备时取均值再重标准化（personality.md §2.6 末段，标为近似）
 */
export const DOMAIN_FACETS: Record<keyof HexacoProfile, (keyof HexacoFacets)[]> = {
  H: ['sincerity', 'fairness', 'greedAvoidance', 'modesty'],
  E: ['fearfulness', 'anxiety', 'dependence', 'sentimentality'],
  X: ['socialSelfEsteem', 'socialBoldness', 'sociability', 'liveliness'],
  A: ['forgivingness', 'gentleness', 'flexibility', 'patience'],
  C: ['organization', 'diligence', 'perfectionism', 'prudence'],
  O: ['aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality'],
};

/** 子维度间平均符号相关（§6.3 示例采用 .35；仅用于维度折算的 sd_c 近似） */
const DOMAIN_INTERCORRELATION = 0.35;

/**
 * 合成的重标准化算子 z̃（§2.6）。
 *
 * k 个不完全相关的 z 取平均后 SD 会明显小于 1（k=4、r̄=.35 时约 0.72），
 * 不重标准化就套用分档会让所有合成分数挤在中间档、极端档永远触发不了。
 * `meanSignedCorrelation` 即 r̄ₛ，缺完整相关矩阵时的近似。
 */
export const restandardize = (components: number[], meanSignedCorrelation: number): number => {
  const k = components.length;
  if (k === 0) return 0;
  const mean = components.reduce((sum, z) => sum + z, 0) / k;
  const sd = Math.sqrt((1 + (k - 1) * meanSignedCorrelation) / k);
  return sd > 0 ? mean / sd : 0;
};

/** 由子维度折算六个维度分数 */
export const deriveDomains = (facets: HexacoFacets): HexacoProfile => {
  const domains = {} as HexacoProfile;
  for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
    const values = DOMAIN_FACETS[key].map(f => facets[f]);
    domains[key] = Math.round(restandardize(values, DOMAIN_INTERCORRELATION) * 100) / 100;
  }
  return domains;
};

/**
 * 把 z 线性映射到 0–1（`(z + 3) / 6`，±3σ 覆盖全量程），
 * 使下游既有的 `> 0.5` 类比较保持含义（0.5 即人群均值）。
 */
const normalized = (z: number): number => Math.max(0, Math.min(1, (z + 3) / 6));

/** 由子维度派生行为权重 */
export const deriveBehaviorWeights = (facets: HexacoFacets): BehaviorWeights => {
  const {
    sociability, dependence, socialBoldness, fearfulness, prudence,
    anxiety, patience, sentimentality, unconventionality, liveliness,
    socialSelfEsteem, gentleness, organization, diligence, modesty, sincerity,
  } = facets;

  return {
    socialSeek: normalized((sociability + dependence * 0.5) / 1.5),
    solitudeSeek: normalized((-socialBoldness - dependence * 0.5) / 1.5),
    riskTolerance: normalized((-fearfulness + socialBoldness - prudence) / 3),
    // 服从性：宜人-诚实-审慎的组合，输出为相对均值的 ±50 修正量
    obedienceBase: Math.round(normalized((patience + sincerity + prudence) / 3) * 100 - 50),
    stressResistance: normalized((-anxiety + organization + diligence + patience) / 4),
    lustSensitivity: normalized((sentimentality - prudence + liveliness) / 3),
    devotionTendency: normalized((sincerity + modesty + gentleness - unconventionality) / 4),
    aggressiveness: normalized((-patience - sincerity + socialBoldness) / 3),
    empathy: normalized((sentimentality + gentleness) / 2),
    impulsivity: normalized((-prudence + liveliness + socialSelfEsteem) / 3),
  };
};

/** 档位的中文描述，用于日志与卡片（§6.2：报告区间与不确定性，不下结论） */
export const PERSONALITY_STATE_LABELS: Record<PersonalityState, string> = {
  typical: '常态范围',
  stretched: '拉伸',
  atypical: '非典型',
  extreme: '极端偏离',
};

/**
 * 八分构型速记名（§3.4.1）。
 *
 * 与 `PERSONALITY_STATE_LABELS` 同理，是构型词汇的一部分而非配色：卡片、系统层
 * 与提示词三处都要显示同一个名字，各存一份必然漂移。颜色只属于 UI，留在组件里。
 */
export const OCTANT_LABELS: Record<OctantId, string> = {
  PPP: '建设型引领者',
  PPN: '策略型竞争者',
  PNP: '守护型维系者',
  PNN: '审慎型独行者',
  NPP: '热忱型探索者',
  NPN: '冲动型挑战者',
  NNP: '敏感型照护者',
  NNN: '疏离型防御者',
};

/** 子维度签名速记名（§3.4.2） */
export const SIGNATURE_LABELS: Record<SignatureId, string> = {
  benevolent_strategist: '仁慈的策略者',
  vulnerable_superiority: '易受伤的优越感',
  chaotic_innovator: '混乱的创新者',
  calm_executor: '冷静的执行者',
  needed_helper: '需要被需要的助人者',
  rule_enforcer: '规则的执法者',
  steady_caregiver: '稳健的照护者',
  quiet_principled: '沉静的原则者',
};
