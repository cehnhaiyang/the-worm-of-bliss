import {
  AttireState, DressLevel, CharacterRank, CharacterStatus, ActivityStatus,
  MoodState, CarriageType, MemoryCategory, PregnancyStage, RelationType,
  NarcissusStage, EventType, SoundCategory, GraceType, ChangeType, LogType,
  NameOrigin, SocialInteractionType, PersonalityState, SpontaneousAction,
  MovementState, CupSize,
} from './type';

// ============================================================================
// 1. 基础原语 (Base Primitives)
// ============================================================================

/**
 * 具名条目的最小定义契约（ID + 显示名）
 */
export interface ItemDef {
  id: string;
  name: string;
}

/**
 * 命名生成数据集
 */
export interface NameData {
  surnames: string[];
  givenNames: string[];
  format: 'eastern' | 'western';
}

// ============================================================================
// 2. 外观与生理 (Appearance & Physical)
// ============================================================================

/**
 * 生理面板数据
 */
export interface PhysicalStats {
  height: number;    // 身高 cm
  weight: number;    // 体重 kg
  bust: number;      // 胸围 cm
  waist: number;     // 腰围 cm
  hips: number;      // 臀围 cm
  cupSize: CupSize;
  bodyType: string;  // 体型描述语义标签
}

/**
 * 头发特征描述
 */
export interface HairDescription {
  color: ItemDef;
  style: ItemDef;
  texture: ItemDef;
  length: ItemDef;
}

/**
 * 眼部特征描述
 */
export interface EyeDescription {
  color: ItemDef;
  shape: ItemDef;
  expression: ItemDef;
  secondaryColor?: ItemDef; // 异色瞳副色
}

/**
 * 皮肤特征描述
 */
export interface SkinDescription {
  tone: ItemDef;
  texture: ItemDef;
  condition?: string; // 特殊状况（疤痕、临时伤痕等）
}

/**
 * 细节特征描述
 */
export interface FeatureDescription {
  facialFeatures: ItemDef[];
  birthmark: ItemDef;
  bodyMarks: ItemDef[];
}

/**
 * 全局外观聚合
 */
export interface AppearanceData {
  hair: HairDescription;
  eyes: EyeDescription;
  skin: SkinDescription;
  features: FeatureDescription;
}

/**
 * 体型生成权重配置
 */
export interface BodyArchetypeConfig {
  weight: number;
  heightRange: [number, number];  // cm
  bustModifier: number;           // 相对身高基数的修正系数
  waistModifier: number;
  hipModifier: number;
  cupRange: [number, number];     // 罩杯随机索引区间
  descriptions: string[];
}

// ============================================================================
// 3. 服装系统 (Clothing System)
// ============================================================================

/**
 * 衣物基类（款式 + 可选颜色/材质）
 */
export interface ClothingItemBase {
  type: ItemDef;
  color?: ItemDef;
  material?: ItemDef;
}

// 衣物分类别名——保留语义区分，复用基类结构
export type BraDescription = ClothingItemBase;
export type PantyDescription = ClothingItemBase;
export type StockingDescription = ClothingItemBase;
export type UndershirtDescription = ClothingItemBase;
export type UnderpantsDescription = ClothingItemBase;
export type TopDescription = ClothingItemBase;
export type BottomDescription = ClothingItemBase;
export type GloveDescription = ClothingItemBase;
export type ShoeDescription = ClothingItemBase;

/**
 * 配饰单品（含可交互标志）
 */
export interface AccessoryItem extends ClothingItemBase {
  isRemovable?: boolean;
  isVisible?: boolean;
}

/**
 * 贴身内衣层
 */
export interface IntimateLayer {
  bra: BraDescription;
  panties: PantyDescription;
}

/**
 * 基础内搭层
 */
export interface UndergarmentLayer {
  stockings: StockingDescription;
  undershirt: UndershirtDescription;
  underpants: UnderpantsDescription;
}

/**
 * 外部穿着层
 */
export interface OuterwearLayer {
  top: TopDescription;
  bottom: BottomDescription;
  gloves: GloveDescription;
  shoes: ShoeDescription;
}

/**
 * 全局着装状态拓扑
 */
export interface ClothingState {
  intimate: IntimateLayer;
  undergarment: UndergarmentLayer;
  outerwear: OuterwearLayer;
  accessories: AccessoryItem[];
  state: AttireState;           // 当前衣物战损/污浊状态
  dressLevel: DressLevel;       // 整体着装层级（与 state 联动，避免外部计算）
}

// ============================================================================
// 4. 心理与人格模型 (Psychology & Personality)
// ============================================================================

/**
 * 旧日人格与背景侧写
 */
export interface PersonalityProfile {
  traits: string[];
  hobbies: string[];
  dislikes: string[];
  copingMechanism: string;
  fetish?: string;
}

/**
 * HEXACO 六维度基准（值域建议 0–100）
 */
export interface HexacoProfile {
  H: number; // Honesty-Humility  诚实-谦逊
  E: number; // Emotionality      情绪性
  X: number; // eXtraversion      外向性
  A: number; // Agreeableness     宜人性
  C: number; // Conscientiousness 尽责性
  O: number; // Openness          开放性
}

/**
 * HEXACO 二十四子维度切面（值域同上）
 */
export interface HexacoFacets {
  // H 维度
  sincerity: number;
  fairness: number;
  greedAvoidance: number;
  modesty: number;
  // E 维度
  fearfulness: number;
  anxiety: number;
  dependence: number;
  sentimentality: number;
  // X 维度
  socialSelfEsteem: number;
  socialBoldness: number;
  sociability: number;
  liveliness: number;
  // A 维度
  forgivingness: number;
  gentleness: number;
  flexibility: number;
  patience: number;
  // C 维度
  organization: number;
  diligence: number;
  perfectionism: number;
  prudence: number;
  // O 维度
  aestheticAppreciation: number;
  inquisitiveness: number;
  creativity: number;
  unconventionality: number;
}

/**
 * 人格元特质（高阶聚合指标）
 */
export interface MetaTraits {
  alpha: number;  // 稳定性：归拢 H, E(反转), A, C
  beta: number;   // 可塑性：归拢 X, O
  delta: number;  // 去抑制/对抗性：暗黑人格指标基础
  gamma: number;  // 亲社会整合：光明人格指标基础
  pabi: number;   // 亲社会-对抗平衡指数
}

/**
 * 暗黑四分体指标
 */
export interface DarkTetrad {
  machiavellianism: number; // 马基雅维利主义（操纵）
  narcissism: number;
  psychopathy: number;      // 精神病态（冷酷）
  sadism: number;
}

/**
 * 光明三分体指标
 */
export interface LightTriad {
  kantianism: number;      // 不以人为手段
  humanism: number;        // 尊重人类尊严
  faithInHumanity: number; // 相信人性本善
}

/**
 * 复合人格原型定位
 */
export interface PersonalityArchetype {
  primary:
  | 'prosocial' | 'antagonistic' | 'adaptive_leader' | 'reliable_guardian'
  | 'chaotic_explorer' | 'impaired' | 'balanced';
  dominated: (
    | 'machiavellian' | 'narcissist' | 'psychopath' | 'sadist'
    | 'kantian' | 'humanist' | 'faithful'
    | 'benevolent_manipulator' | 'vulnerable_narcissist'
    | 'chaotic_innovator' | 'cold_executive'
    | 'savior_complex' | 'righteous_punisher'
  )[];
}

/**
 * 行为驱动权重矩阵（修正系数，值域 0–2 建议）
 */
export interface PersonalityWeight {
  socialSeek: number;       // 社交诉求修正
  solitudeSeek: number;     // 独处诉求修正
  riskTolerance: number;    // 风险承受阈值
  obedienceBase: number;    // 基础服从性修正
  stressResistance: number; // 压力抗性
  lustSensitivity: number;  // 欲求敏感度
  devotionTendency: number; // 信仰皈依倾向
  aggressiveness: number;   // 攻击性阈值
  empathy: number;          // 共情共鸣修正
  impulsivity: number;      // 冲动阈值
}

/**
 * ISShex 完备人格架构体系
 */
export interface ISShexPersonality {
  hexaco: HexacoProfile;
  facets: HexacoFacets;
  metaTraits: MetaTraits;
  darkTetrad: DarkTetrad;
  lightTriad: LightTriad;
  archetype: PersonalityArchetype;
  currentState: PersonalityState;
  traitFatigue: number;        // 特质疲劳度 0–100，长期违背本性的惩罚累积
  shadowActivation: number;    // 阴暗面激活度 0–100，深渊影响指标
  behaviorWeights: PersonalityWeight;
}

// ============================================================================
// 5. 角色状态与动态属性 (Status & Attributes)
// ============================================================================

/**
 * 核心维生与精神属性（值域 0–100）
 */
export interface CharacterAttributes {
  sanity: number;     // 理智值
  obedience: number;  // 服从度
  lust: number;       // 欲求度
  stress: number;     // 压力值
  corruption: number; // 堕落值
  devotion: number;   // 虔诚度
  hunger: number;     // 饥饿度
  fatigue: number;    // 疲劳度
  hygiene: number;    // 清洁度
}

/** 属性键名联合（便于泛型操作） */
export type AttributeKey = keyof CharacterAttributes;

/**
 * 生理周期与妊娠状态向量
 */
export interface PhysiologicalState {
  fertility: number;              // 基础受孕率
  cycleDay: number;               // 生理周期当前天数
  isOvulating: boolean;
  sensitivityMultiplier: number;  // 感官敏感度乘区
  health: number;                 // 基础健康值
  pregnancy: PregnancyState | null; // null = 未孕
}

/**
 * 当前社交上下文快照
 * @remarks 从 BehaviorState 中抽出，使社交状态可独立读写
 */
export interface SocialContext {
  targetId: string;
  targetName: string;
  interactionType: SocialInteractionType;
  startTime: number;
}

/**
 * 角色实时行为状态机
 */
export interface BehaviorState {
  currentActivity: ActivityStatus;      // 当前执行的活动
  activityStartTime: number;
  activityDuration: number;
  lastInteractionTime: number;
  previousActivity?: ActivityStatus;    // 被中断的前置活动
  socialContext?: SocialContext;        // 社交上下文（无社交时为 undefined）
}

// ============================================================================
// 6. 移动与导航 (Movement & Navigation)
// ============================================================================

/**
 * 移动意图载体
 */
export interface MovementIntent {
  targetCarriageId: string;
  intendedActivity: ActivityStatus;
  movementState: MovementState;
  movementPath: string[];
  estimatedArrivalTime?: number;
}

/**
 * 统一移动状态（合并位置信息与移动意图）
 * @remarks 替代原 BehaviorState.targetCarriageId 与 Maiden.carriageId 的分离状态
 */
export interface UnifiedMovementState {
  currentCarriageId: string;
  isMoving: boolean;
  intent?: MovementIntent; // undefined 表示静止
}

// ============================================================================
// 7. 记忆、关系与特定机制 (Memory, Relations & Special Mechanics)
// ============================================================================

/**
 * 记忆篡改操作类型
 */
export type MemoryAction = 'tamper' | 'implant' | 'restore';

/**
 * 记忆篡改审计条目
 */
export interface MemoryHistoryEntry {
  timestamp: number;            // 游戏内时间 (gameTimePassed)，非墙钟时间
  previousNarrative: string;
  action: MemoryAction;
  directive?: string;
}

/**
 * 单体记忆节点
 */
export interface MemoryNode {
  id: string;
  title: string;
  objectiveTruth: string;       // 客观真相（不可变基准）
  subjectiveNarrative: string;  // 主观认知（受堕落/篡改影响）
  selfOpinion: string;
  timeLabel: string;            // 模糊时间标签，如"登车前夕"
  depth: number;                // 记忆层级：1=核心事件，N=在第 N-1 层节点之间插叙的细节，由锚点推导
  type: 'original' | 'corrupted' | 'implanted' | 'dead_node';
  corruptionLevel: number;
  category: MemoryCategory;
  timestamp: number;            // 游戏内时间 (gameTimePassed)，非墙钟时间
  /** 仅"登车瞬间"为 true，由 MaidenMemory 独占维护；不可编辑 ≠ 被污染 */
  isImmutable?: boolean;
  history?: MemoryHistoryEntry[];
}

// ---------------------------------------------------------------------------
// 记忆链的写入契约
// 这些形状描述"外部交给记忆系统的原始数据"，因此与 MemoryNode 同处类型层，
// 而不是留在实现里——AI 服务层需要它们，但不该依赖记忆系统的实现模块。
// ---------------------------------------------------------------------------

/** AI 返回的原始节点：位于信任边界之外，字段可能缺失或类型错误 */
export interface RawMemoryNode {
  title?: unknown;
  objectiveTruth?: unknown;
  subjectiveNarrative?: unknown;
  selfOpinion?: unknown;
  timeLabel?: unknown;
  category?: unknown;
}

/** 一次插叙请求。层级（depth）不在其中：新节点层级由锚点推导 */
export interface RawInsertion {
  insertAfterNodeId: string;
  nodes: RawMemoryNode[];
}

/** 被拒绝的插叙及其原因，供调用方汇总后告知玩家 */
export interface ChainRejection {
  anchorId: string;
  titles: string[];
  reason: string;
}

/**
 * 人际关系双向边
 */
export interface Relationship {
  targetId: string;
  type: RelationType;
  affinity: number;       // 好感度 -100～100
  trust: number;          // 信任阈值
  interactions: number;   // 累计交互次数
  lastInteraction: number;
  sharedTrauma: boolean;
  isSecret: boolean;
}

/**
 * 妊娠阶段宏观追踪对象
 */
export interface PregnancyState {
  stage: PregnancyStage;
  weekNumber: number;
  healthRisk: number;
  isDiscovered: boolean;
  conceptionTime: number;
  expectedBirthTime: number;
  complications: string[];
}

/**
 * 水仙协议运行状态
 */
export interface NarcissusState {
  stage: NarcissusStage;
  departureTime?: number;
  fadingLevel: number;
  daysOutside: number;
  hasReceivedInvitation: boolean;
  returnTime?: number;
  rejectionTime?: number;
}

/**
 * 水仙协议候选资质测算
 */
export interface NarcissusEligibility {
  eligible: boolean;
  reasons: string[];
  requirements: {
    minDaysOnTrain: number;
    minAbyssExposure: number;
    sanityRange: [number, number];
    hasExperiencedGrace: boolean;
  };
}

// ============================================================================
// 8. 子系统存档模型 (Subsystems Data)
// ============================================================================

/** 关系网络存档节点 */
export interface RelationshipNetworkData {
  maidenId: string;
  relationships: Array<{ targetId: string; relationship: Relationship }>;
}

/** 妊娠状态存档节点 */
export interface PregnancyData {
  maidenId: string;
  pregnancyState: PregnancyState;
}

/** 水仙协议状态存档节点 */
export interface NarcissusData {
  maidenId: string;
  narcissusState: NarcissusState;
}

/** 事件时间戳存档节点 */
export interface EventTimestampData {
  eventType: EventType;
  timestamp: number;
}

/**
 * 子系统数据聚合（存档序列化用）
 */
export interface SubsystemsData {
  relationships: RelationshipNetworkData[];
  pregnancy: PregnancyData[];
  narcissus: NarcissusData[];
  events: EventTimestampData[];
}

// ============================================================================
// 9. 核心实体模型 (Core Entities)
// ============================================================================

/**
 * 角色核心聚合根 (Aggregate Root)
 */
export interface Maiden {
  // --- 身份基础 ---
  id: string;
  name: string;
  nameOrigin: NameOrigin;
  age: number;
  initialAgeMs: number;       // 初始化年龄时间戳偏移
  boardingAge: string;        // 登车时表现年龄段
  birthTimestamp: number;
  description: string;

  // --- 外观与服装 ---
  physical: PhysicalStats;
  appearance: AppearanceData;
  clothing: ClothingState;
  initialClothing: ClothingState; // 基准着装（防腐参考）

  // --- 肖像缓存 ---
  lastPortraitHash?: string;
  lastPortraitUpdate?: number;

  // --- 人格 ---
  isshex: ISShexPersonality;
  profile: PersonalityProfile;

  // --- 动态状态 ---
  status: CharacterStatus[];
  attributes: CharacterAttributes;
  physiology: PhysiologicalState;
  behavior: BehaviorState;
  movement: UnifiedMovementState; // 原 unifiedMovement，缩短字段名
  mood: MoodState;
  moodDuration: number;

  // --- 记忆 ---
  memoryChain: MemoryNode[];
  legacyMemoryChain?: MemoryNode[]; // 废弃/遗忘的记忆（仅执事旧档查看，不参与任何总结）

  // --- 阶级与统计 ---
  rank: CharacterRank;
  rankColor: string;
  abyssExposureCount: number;
  graceReceived: number;
  birthCount: number;

  // --- 时间戳 ---
  arrivalTimestamp: number;
  lastUpdateTime: number;
  lastSpontaneousAction?: string;
  lastSpontaneousTime?: number;

  // --- 关系与协议 ---
  relationships: Relationship[];
  /** @internal 运行时索引，不参与序列化 */
  _relationshipIndex?: Map<string, number>;
  narcissusState?: NarcissusState;
}

/**
 * 角色摘要（列表/轻量渲染用）
 */
export interface MaidenSummary {
  id: string;
  name: string;
  carriageId: string;
  status: CharacterStatus[];
  sanity: number;
  currentActivity: ActivityStatus;
}

// ============================================================================
// 10. 世界观与设施配置 (World & Facilities)
// ============================================================================

/** 车厢矩阵坐标 */
export interface CarriagePosition {
  row: number;
  col: number;
}

/**
 * 车厢类型归属
 */
export type CarriageCategory = 'sanctuary' | 'abyss';

/**
 * 列车车厢实例
 */
export interface Carriage {
  id: string;
  position: CarriagePosition;
  type: CarriageType;
  name: string;
  category: CarriageCategory;  // 替代原 isAbyss boolean，语义更明确
  occupants: string[];
  isAccessible: boolean;
  lastHubShuffle: number;
  ambientSoundId?: string;
}

/**
 * 车厢静态类型元数据
 */
export interface CarriageTypeInfo {
  type: CarriageType;
  name: string;
  nameCN: string;
  category: CarriageCategory;
  subcategory: string;
  description: string;
  functions: string[];
  visualTheme: string;
  ambientSound: string;
  /** 每周期属性影响偏移量 */
  periodicEffects: {
    sanity: number;
    lust: number;
    stress: number;
  };
}

/**
 * 车厢交互功能许可与效能配置
 */
export interface CarriageFunction {
  canSleep: boolean;
  canEat: boolean;
  canBathe: boolean;
  canPray: boolean;
  canSocialize: boolean;
  comfortLevel: number;
}

// ============================================================================
// 11. 系统管理与存档 (System, Master & Save)
// ============================================================================

/**
 * 系统底层宏观变量
 */
export interface SystemState {
  resonanceFrequency: number;  // 深渊灵能共鸣频率
  entropyLevel: number;        // 全局系统熵值
  cycleCount: number;
  gameTimePassed: number;
  hubConfiguration: string;   // 枢纽空间配置指纹
  globalFertilitySync: number; // 强制排卵同步修正
  watcherAlertLevel: number;
  gracePoolSize: number;
  gameStartTime: number;
  lastTickTime: number;
  timeScale: number;
  isPaused: boolean;
}

/**
 * 玩家控制与观测焦距状态
 */
export interface MasterState {
  carriageId: string;
  focusedMaidenId?: string;
}

/**
 * 音频管理总线上下文
 */
export interface AudioState {
  masterVolume: number;
  categoryVolumes: Record<SoundCategory, number>;
  currentAmbient?: string;
  currentMusic?: string;
  isMuted: boolean;
}

/**
 * 游玩统计黑盒
 */
export interface GameStats {
  totalGraceGiven: number;
  totalAbyssExposures: number;
  totalBirths: number;
  totalDeaths: number;
  hubShuffleCount: number;
  commandsIssued: number;
  daysElapsed: number;
  totalPregnancies: number;
  totalRankPromotions: number;
  totalBreakdowns: number;
  totalRelationshipsFormed: number;
  totalMemoriesCorrupted: number;
  longestPlaySession: number;
  playTimeMs?: number;
  sessionCount?: number;
  highestDevotionReached?: number;
  longestPregnancy?: number;
  mostCorruptedMemories?: number;
}

/**
 * 序列化根节点存档模型
 */
export interface SaveData {
  version: string;
  timestamp: number;
  playTime: number;
  slotName?: string;
  systemState: SystemState;
  masterState: MasterState;
  carriages: [string, Carriage][];
  maidens: [string, Maiden][];
  logs: GameLog[];
  stats: GameStats;
  subsystems?: SubsystemsData;
  checksum?: string;
}

/**
 * 存档槽位预览元数据
 */
export interface SaveSlotInfo {
  slot: number | 'auto';
  timestamp: number;
  daysElapsed: number;
  playTime: number;
  slotName?: string;
  maidenCount: number;
  version: string;
  cycleDay?: number;
}

/**
 * 内存运行时顶层根状态
 */
export interface WorldState {
  carriages: Map<string, Carriage>;
  maidens: Map<string, Maiden>;
  system: SystemState;
  master: MasterState;
  audio: AudioState;
  logs: GameLog[];
}

// ============================================================================
// 12. 事件、日志与音视频反馈 (Events, Logs & AV Feedback)
// ============================================================================

/**
 * 音频播放实例描述符
 */
export interface SoundEffect {
  id: string;
  category: SoundCategory;
  url: string;
  volume: number;
  loop: boolean;
  fadeIn?: number;
  fadeOut?: number;
}

/**
 * Web Audio 活跃节点追踪包装器
 */
export interface ActiveSound {
  id: string;
  sourceNodes: AudioNode[];
  gainNode: GainNode;
  startTime: number;
  stop: (fadeOut?: number) => void;
}

/**
 * 全局日志数据节点
 */
export interface GameLog {
  id: string;
  timestamp: number;
  type: LogType;
  content: string;
  speaker?: string;
  carriageId?: string;
}

/**
 * AI 生成肖像的提示词注入快照
 * @remarks 所有字段均为量化区间，不含原始数值，供提示词插值用
 */
export interface PortraitSnapshot {
  lustBracket: number;
  sanityBracket: number;
  obedienceBracket: number;
  stressBracket: number;
  corruptionBracket: number;
  devotionBracket: number;
  significantStatuses: CharacterStatus[];
  dressLevel: DressLevel;
  clothingState: AttireState;
  pregnancyMilestone: number;
  isInAbyss: boolean;
  personalityState: PersonalityState;
}

/**
 * 神恩赐予记录
 */
export interface GraceEvent {
  type: GraceType;
  description: string;
  targetId: string;
  timestamp: number;
}

/**
 * 事件效果标量结算指令（判别联合）
 */
export type EventEffect =
  | { type: 'attribute'; target: 'maiden' | 'secondary'; key: AttributeKey; value: number; add?: boolean }
  | { type: 'status'; target: 'maiden' | 'secondary'; key: CharacterStatus; add: boolean }
  | { type: 'memory'; target: 'maiden'; key: MemoryAction; value?: string }
  | { type: 'rank'; target: 'maiden'; value: CharacterRank }
  | { type: 'pregnancy'; target: 'maiden'; key: 'reset' }
  | { type: 'system'; target: 'system'; key: string; value?: number | boolean };

/**
 * 宏观游戏系统事件
 */
export interface GameEvent {
  type: EventType;
  targetMaidenId?: string;
  secondaryMaidenId?: string;
  carriageId?: string;
  description: string;
  effects: EventEffect[];
  logType: LogType;
}

/**
 * 妊娠系统专项事件
 */
export interface PregnancyEvent {
  type: 'conception' | 'discovery' | 'milestone' | 'complication' | 'labor' | 'birth' | 'progress';
  maidenId: string;
  description: string;
  weekNumber: number;
  logType: LogType;
  newState?: PregnancyState | null;
}

/**
 * 平台无关的状态更新回调接口
 */
export interface StateUpdaters {
  updateSystemState: (updater: SystemState | ((prev: SystemState) => SystemState)) => void;
  updateCarriages: (updater: Map<string, Carriage> | ((prev: Map<string, Carriage>) => Map<string, Carriage>)) => void;
  addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
}

/**
 * 引擎向事件发射器暴露的依赖注入上下文
 */
export interface EventEffectContext {
  maidens: Map<string, Maiden>;
  stateUpdaters: StateUpdaters;
  gameTimePassed: number;
}

/**
 * 心境跃迁追踪事件
 */
export interface MoodChangeEvent {
  maidenId: string;
  maidenName: string;
  carriageId: string;
  oldMood: MoodState;
  newMood: MoodState;
  description: string;
  logType: LogType;
}

/**
 * 自发行为触发事件
 */
export interface SpontaneousActionEvent {
  maidenId: string;
  maidenName: string;
  carriageId: string;
  action: SpontaneousAction;
  description: string;
  logType: LogType;
}

/**
 * 广义系统状态变动记录
 */
export interface StateChange {
  maidenId: string;
  maidenName: string;
  carriageId: string;
  changeType: ChangeType;
  description: string;
  logType: LogType;
  oldValue?: number | string;
  newValue?: number | string;
}

/**
 * AI 叙事与指令响应数据结构
 */
export interface AIResponse {
  narrative: string;
  characterThoughts: string;
  stateUpdates: {
    sanity?: number;
    obedience?: number;
    lust?: number;
    stress?: number;
    corruption?: number;
    devotion?: number;
    hunger?: number;
    fatigue?: number;
    addStatus?: CharacterStatus[];
    removeStatus?: CharacterStatus[];
    rankChange?: CharacterRank;
    fertilityChange?: number;
    pregnancyProgress?: number;
  };
  systemUpdates?: {
    entropyChange?: number;
    resonanceChange?: number;
    triggerGrace?: boolean;
    hubReconfiguration?: boolean;
  };
  memoryUpdate?: {
    action: MemoryAction;
    content?: string;
    targetMemoryId?: string;
  };
  narcissusAction?: 'initiate' | 'leave' | 'stay' | 'return';
  visualPromptModifier?: string;
  abyssEffect?: string;
  soundEffect?: string;
}