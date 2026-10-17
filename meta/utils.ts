import { CarriageType, EventType, ActivityStatus, PersonalityState } from './type';
import {
  Carriage,
  CarriageFunction,
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
  BehaviorWeights
} from './interface';
import { CARRIAGE_FUNCTIONS, TIME_CONFIG } from '../constants';

// ============================================
// 1. 基础数学与概率
// ============================================

/**
 * 将数值限制在指定阈值范围内
 */
export function clamp(value: number, min: number = 0, max: number = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * 生成指定范围内的随机整数 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成指定范围内的随机浮点数 [min, max)
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 依据权重执行随机抽取
 */
export function weightedRandom<T>(items: { item: T; weight: number }[]): T {
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
}

/**
 * 绝对概率判定
 */
export function probabilityCheck(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * 基于角色属性特征的概率乘区修正
 */
export function modifiedProbability(
  baseProbability: number,
  modifiers: { value: number; weight: number }[]
): number {
  let modifier = 1;
  for (const { value, weight } of modifiers) {
    modifier *= 1 + (value / 100 - 0.5) * weight;
  }
  return clamp(baseProbability * modifier, 0, 1);
}

/**
 * 判断记忆节点是否"被改动过"——篡改或植入。
 * 登车瞬间（死节点）只是不可编辑，不属于被污染的记忆，故不计入。
 */
export function isAlteredMemory(node: MemoryNode): boolean {
  return node.type === 'corrupted' || node.type === 'implanted';
}

// ============================================
// 2. 字符串处理与标识生成
// ============================================

/**
 * 生成系统级唯一标识符（优先调用高熵原生接口）
 */
export function generateId(prefix: string = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return prefix ? `${prefix}_${crypto.randomUUID()}` : crypto.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 11);
  const random2 = Math.random().toString(36).substring(2, 11);
  const performanceCounter = (typeof performance !== 'undefined' ? performance.now() * 1000 : 0).toString(36);

  const id = `${timestamp}_${random1}_${random2}_${performanceCounter}`;
  return prefix ? `${prefix}_${id}` : id;
}

/**
 * 计算字符串的32位特征哈希码
 */
export function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * 基于字典的动态模板注入
 */
export function formatTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => values[key] !== undefined ? values[key] : match);
}

// ============================================
// 3. 数组变换矩阵
// ============================================

/**
 * 提取数组随机元素
 */
export function randomElement<T>(array: T[]): T | undefined {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 数组混淆重排
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 数组分块切片
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============================================
// 4. 时序流转处理
// ============================================

/**
 * 格式化世界运行时钟展示
 */
export function formatGameTimeDisplay(gameTimePassed: number, startTime?: number, includeSeconds: boolean = true): string {
  const currentTotal = startTime ? startTime + gameTimePassed : gameTimePassed;
  const days = Math.floor(currentTotal / TIME_CONFIG.MS_PER_DAY) + 1;
  const totalSeconds = Math.floor(currentTotal / TIME_CONFIG.MS_PER_SECOND);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const hourStr = hours.toString().padStart(2, '0');
  const minStr = minutes.toString().padStart(2, '0');

  if (includeSeconds) {
    const seconds = totalSeconds % 60;
    return `Day ${days} - ${hourStr}:${minStr}:${seconds.toString().padStart(2, '0')}`;
  }
  return `Day ${days} - ${hourStr}:${minStr}`;
}

/**
 * 格式化实体精确年龄标识
 */
export function formatPreciseAge(ageInMs: number): string {
  const { MS_PER_YEAR, MS_PER_MONTH, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } = TIME_CONFIG;

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
}

export function msToMinutes(ms: number): number {
  return ms / TIME_CONFIG.MS_PER_MINUTE;
}

export function minutesToMs(minutes: number): number {
  return minutes * TIME_CONFIG.MS_PER_MINUTE;
}

export function getGameHour(gameTimeMs: number): number {
  const totalSeconds = Math.floor(gameTimeMs / 1000);
  return Math.floor(totalSeconds / 3600) % 24;
}

export function isRestTime(gameTimeMs: number): boolean {
  const hour = getGameHour(gameTimeMs);
  return hour >= TIME_CONFIG.REST_START_HOUR || hour < TIME_CONFIG.REST_END_HOUR;
}

// ============================================
// 5. 坐标网络与寻径
// ============================================

/**
 * 曼哈顿距离测算
 */
export function manhattanDistance(
  pos1: { row: number; col: number },
  pos2: { row: number; col: number }
): number {
  return Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
}

/**
 * 逆向解析拓扑坐标标识
 */
export function parseCarriageId(id: string): { row: number; col: number } | null {
  const match = id.match(/R(\d+)C(\d+)/);
  if (!match) return null;
  return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
}

/**
 * 构建拓扑坐标标识
 */
export function makeCarriageId(row: number, col: number): string {
  return `R${row}C${col}`;
}

function seededRandom(seed: number): number {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * 获取临近的特定类型设施空间
 */
export function findNearestCarriageByType(
  current: Carriage,
  allCarriages: Map<string, Carriage>,
  type: CarriageType,
  options: { fuzzFactor?: number; seed?: number } = {}
): string | undefined {
  const { fuzzFactor = 5, seed } = options;
  let nearest: string | undefined;
  let minDistance = Infinity;

  for (const [id, carriage] of allCarriages) {
    if (carriage.type === type && carriage.isAccessible) {
      const distance = manhattanDistance(current.position, carriage.position);
      const fuzz = seed !== undefined ? seededRandom(seed + distance) * fuzzFactor : Math.random() * fuzzFactor;
      const fuzzyDistance = distance + fuzz;

      if (fuzzyDistance < minDistance) {
        minDistance = fuzzyDistance;
        nearest = id;
      }
    }
  }

  return nearest;
}

/**
 * 根据交互许可功能获取临近设施空间
 */
export function findNearestCarriageByFunction(
  current: Carriage,
  allCarriages: Map<string, Carriage>,
  funcName: keyof CarriageFunction,
  options: { fuzzFactor?: number; seed?: number } = {}
): string | null {
  const { fuzzFactor = 3, seed } = options;
  let nearest: string | null = null;
  let minDistance = Infinity;

  for (const [id, carriage] of allCarriages) {
    if (!carriage.isAccessible) continue;

    const func = CARRIAGE_FUNCTIONS[carriage.type];
    if (func && func[funcName]) {
      const distance = manhattanDistance(current.position, carriage.position);
      const fuzz = seed !== undefined ? seededRandom(seed + distance) * fuzzFactor : Math.random() * fuzzFactor;
      const fuzzyDistance = distance + fuzz;

      if (fuzzyDistance < minDistance) {
        minDistance = fuzzyDistance;
        nearest = id;
      }
    }
  }

  return nearest;
}

// ============================================
// 6. 深层约束与流控
// ============================================

/**
 * 实体状态全量深度拷贝（优先原生层结构化克隆）
 */
export function deepCopy<T>(obj: T): T {
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
}

/**
 * 执行频次防抖节流阀
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 流量控制节流阀
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================
// 7. 领域属性校验工具
// ============================================

/**
 * 核心维生基准属性边界收敛验证
 */
export function clampAttributes(attributes: Partial<CharacterAttributes>): Partial<CharacterAttributes> {
  const clamped: Partial<CharacterAttributes> = {};
  for (const key of Object.keys(attributes) as Array<keyof CharacterAttributes>) {
    const val = attributes[key];
    if (typeof val === 'number') {
      clamped[key] = clamp(val, 0, 100);
    }
  }
  return clamped;
}

// ============================================
// 8. 移动与空间导航枢纽
// ============================================

/**
 * 解析并提取当前动态目标车厢意图
 */
export function getTargetCarriageId(movement: UnifiedMovementState): string | undefined {
  return movement.intent?.targetCarriageId;
}

/**
 * 读取实体当前锁定的物理所在车厢标识
 */
export function getCurrentCarriageId(maiden: Maiden): string {
  return maiden.movement?.currentCarriageId ?? '';
}

/**
 * 基于不可变模式同步更新实体的物理落点网络
 */
export function setCurrentCarriageId(maiden: Maiden, carriageId: string): Maiden {
  return {
    ...maiden,
    movement: {
      ...(maiden.movement || {}),
      currentCarriageId: carriageId,
    },
  };
}

/**
 * 构建初始化运动流转聚合状态机
 */
export function createUnifiedMovementState(
  currentCarriageId: string,
  intent?: MovementIntent
): UnifiedMovementState {
  return {
    currentCarriageId,
    intent,
    isMoving: intent?.movementState === 'moving' || intent?.movementState === 'planning',
  };
}

/**
 * 合并刷新统一运动状态
 */
export function updateMovementState(
  movement: UnifiedMovementState,
  updates: Partial<UnifiedMovementState>
): UnifiedMovementState {
  return {
    ...movement,
    ...updates,
  };
}

/**
 * 触发路径巡游意图
 */
export function startMovement(
  movement: UnifiedMovementState,
  targetCarriageId: string,
  intendedActivity: ActivityStatus,
  movementPath: string[],
  estimatedDuration?: number
): UnifiedMovementState {
  const intent: MovementIntent = {
    targetCarriageId,
    intendedActivity,
    movementState: 'moving',
    movementPath,
    estimatedArrivalTime: estimatedDuration ? Date.now() + estimatedDuration : undefined,
  };

  return updateMovementState(movement, {
    intent,
    isMoving: true,
  });
}

/**
 * 闭合验证巡游到达，执行状态坍缩
 */
export function completeMovement(movement: UnifiedMovementState): UnifiedMovementState {
  if (!movement.intent) {
    return movement;
  }

  return updateMovementState(movement, {
    currentCarriageId: movement.intent.targetCarriageId,
    intent: undefined,
    isMoving: false,
  });
}

/**
 * 强行剥离当前运动意图并中止流转
 */
export function cancelMovement(movement: UnifiedMovementState): UnifiedMovementState {
  return updateMovementState(movement, {
    intent: undefined,
    isMoving: false,
  });
}

// ============================================
// 9. 时光逆流转换器（存档向后兼容层）
// ============================================

export function convertRelationshipsFromLegacy(legacy: [string, [string, Relationship][]][]): RelationshipNetworkData[] {
  return legacy.map(([maidenId, relationships]) => ({
    maidenId,
    relationships: relationships.map(([targetId, relationship]) => ({
      targetId,
      relationship
    }))
  }));
}

export function convertRelationshipsToLegacy(data: RelationshipNetworkData[]): [string, [string, Relationship][]][] {
  return data.map(({ maidenId, relationships }) => [
    maidenId,
    relationships.map(({ targetId, relationship }) => [targetId, relationship])
  ]);
}

export function convertPregnancyFromLegacy(legacy: [string, PregnancyState][]): PregnancyData[] {
  return legacy.map(([maidenId, pregnancyState]) => ({ maidenId, pregnancyState }));
}

export function convertPregnancyToLegacy(data: PregnancyData[]): [string, PregnancyState][] {
  return data.map(({ maidenId, pregnancyState }) => [maidenId, pregnancyState]);
}

export function convertNarcissusFromLegacy(legacy: [string, NarcissusState][]): NarcissusData[] {
  return legacy.map(([maidenId, narcissusState]) => ({ maidenId, narcissusState }));
}

export function convertNarcissusToLegacy(data: NarcissusData[]): [string, NarcissusState][] {
  return data.map(({ maidenId, narcissusState }) => [maidenId, narcissusState]);
}

export function convertEventsFromLegacy(legacy: [EventType, number][]): EventTimestampData[] {
  return legacy.map(([eventType, timestamp]) => ({ eventType, timestamp }));
}

export function convertEventsToLegacy(data: EventTimestampData[]): [EventType, number][] {
  return data.map(({ eventType, timestamp }) => [eventType, timestamp]);
}

// ============================================
// 10. 命运交织：关系系统边界操作
// ============================================

/**
 * 构建高优实体连接寻址索引
 */
export function buildRelationshipIndex(relationships: Relationship[]): Map<string, number> {
  const index = new Map<string, number>();
  for (let i = 0; i < relationships.length; i++) {
    index.set(relationships[i].targetId, i);
  }
  return index;
}

/**
 * 单向提取关系边快照
 */
export function getRelationship(maiden: Maiden, targetId: string): Relationship | undefined {
  if (!maiden.relationships) return undefined;

  if (!maiden._relationshipIndex) {
    maiden._relationshipIndex = buildRelationshipIndex(maiden.relationships);
  }
  const idx = maiden._relationshipIndex.get(targetId);
  return idx !== undefined ? maiden.relationships[idx] : undefined;
}

/**
 * 并发安全的关系状态写入流（遵循深度不可变克隆原则）
 */
export function setRelationship(maiden: Maiden, rel: Relationship): Maiden {
  const relationships = [...(maiden.relationships || [])];
  const index = maiden._relationshipIndex ?? buildRelationshipIndex(relationships);
  const idx = index.get(rel.targetId);

  if (idx !== undefined) {
    relationships[idx] = rel;
  } else {
    relationships.push(rel);
  }

  return {
    ...maiden,
    relationships,
    _relationshipIndex: buildRelationshipIndex(relationships),
  };
}

/**
 * 全量输出关联投影数组隔离副本
 */
export function getAllRelationships(maiden: Maiden): Relationship[] {
  return [...(maiden.relationships || [])];
}

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
export function restandardize(components: number[], meanSignedCorrelation: number): number {
  const k = components.length;
  if (k === 0) return 0;
  const mean = components.reduce((sum, z) => sum + z, 0) / k;
  const sd = Math.sqrt((1 + (k - 1) * meanSignedCorrelation) / k);
  return sd > 0 ? mean / sd : 0;
}

/** 由子维度折算六个维度分数 */
export function deriveDomains(facets: HexacoFacets): HexacoProfile {
  const domains = {} as HexacoProfile;
  for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
    const values = DOMAIN_FACETS[key].map(f => facets[f]);
    domains[key] = Math.round(restandardize(values, DOMAIN_INTERCORRELATION) * 100) / 100;
  }
  return domains;
}

/**
 * 把 z 线性映射到 0–1（`(z + 3) / 6`，±3σ 覆盖全量程），
 * 使下游既有的 `> 0.5` 类比较保持含义（0.5 即人群均值）。
 */
function normalized(z: number): number {
  return Math.max(0, Math.min(1, (z + 3) / 6));
}

/** 由子维度派生行为权重 */
export function deriveBehaviorWeights(facets: HexacoFacets): BehaviorWeights {
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
}

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