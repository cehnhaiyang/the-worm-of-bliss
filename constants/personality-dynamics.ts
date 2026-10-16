/**
 * IS-SHEX 2.0 人格模型 —— 纯函数层。
 *
 * 本文件不含任何状态：所有函数都是「输入 → 输出」。唯一权威是子维度 z 分
 * （`HexacoFacets`），维度、元因子、构型、代理、行为权重、状态表达全部由此算出。
 * 之所以不缓存这些派生值，是因为它们一旦各存一份就必须有人维护一致性；v1 正是
 * 因为没有这个所有者，导致 α 与状态档位常年互相矛盾（personality.md §4.3.1）。
 *
 * 单位约定：内部一律使用 z 分（参考人群 M=0, SD=1）。0–100 与 T 分仅用于展示，
 * 换算见 `toDisplayScore` / `toTScore`。
 */

import {
  HexacoProfile,
  HexacoFacets,
  MetaTraits,
  ProxyId,
  OctantId,
  OctantAffinity,
  SignatureId,
  SignatureMatch,
  StateExpression,
  PersonalityState,
  MoodState,
  SituationType,
} from '../meta';

// ============================================================================
// 测量与标准化（§2.2、§2.6）
// ============================================================================

/** 五点分档边界（§2.3），对称且每端人群占比一致 */
export const GRADE_BOUNDARIES = [
  { grade: '极低', min: -Infinity, max: -1.5 },
  { grade: '偏低', min: -1.5, max: -0.5 },
  { grade: '中间', min: -0.5, max: 0.5 },
  { grade: '偏高', min: 0.5, max: 1.5 },
  { grade: '极高', min: 1.5, max: Infinity },
] as const;

export type Grade = (typeof GRADE_BOUNDARIES)[number]['grade'];

/** 分档语言模板（§2.3）：描述倾向，不贴标签 */
export function gradeOf(z: number): Grade {
  for (const band of GRADE_BOUNDARIES) {
    if (z >= band.min && z < band.max) return band.grade;
  }
  return '中间';
}

/** T 分仅用于展示，且是无界的（§2.2，不再截断在 [0,100]） */
export function toTScore(z: number): number {
  return 50 + 10 * z;
}

/** 把 z 映射到 0–100 供既有 UI 条使用；这是展示变换，不是模型的内部单位 */
export function toDisplayScore(z: number): number {
  return Math.max(0, Math.min(100, 50 + z * 10));
}

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

/** 维度分数：仅在各维度子维度齐备时取均值再重标准化（§2.6 末段，标为近似） */
const DOMAIN_FACETS: Record<keyof HexacoProfile, (keyof HexacoFacets)[]> = {
  H: ['sincerity', 'fairness', 'greedAvoidance', 'modesty'],
  E: ['fearfulness', 'anxiety', 'dependence', 'sentimentality'],
  X: ['socialSelfEsteem', 'socialBoldness', 'sociability', 'liveliness'],
  A: ['forgivingness', 'gentleness', 'flexibility', 'patience'],
  C: ['organization', 'diligence', 'perfectionism', 'prudence'],
  O: ['aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality'],
};

/** 子维度间平均符号相关（§6.3 示例采用 .35；仅用于维度折算的 sd_c 近似） */
const DOMAIN_INTERCORRELATION = 0.35;

/** 由子维度折算六个维度分数 */
export function deriveDomains(facets: HexacoFacets): HexacoProfile {
  const domains = {} as HexacoProfile;
  for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
    const values = DOMAIN_FACETS[key].map(f => facets[f]);
    domains[key] = Math.round(restandardize(values, DOMAIN_INTERCORRELATION) * 100) / 100;
  }
  return domains;
}

/** 全部子维度键名，顺序与 HexacoFacets 声明一致 */
export const FACET_KEYS = [
  'sincerity', 'fairness', 'greedAvoidance', 'modesty',
  'fearfulness', 'anxiety', 'dependence', 'sentimentality',
  'socialSelfEsteem', 'socialBoldness', 'sociability', 'liveliness',
  'forgivingness', 'gentleness', 'flexibility', 'patience',
  'organization', 'diligence', 'perfectionism', 'prudence',
  'aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality',
  'altruism',
] as const satisfies readonly (keyof HexacoFacets)[];

/**
 * 把任意来源的人格数据规范化为当前模型的 z 分。
 *
 * 这是**唯一**的读档人格入口。两种输入形状：
 * - 现行形状：有 `dynamics`，直接取 `facets`；
 * - v1 形状：有 `hexaco` 而无 `dynamics`，量纲是「M=50, SD=10」的 0–100 分，
 *   需按 `z = (score − 50) / 10` 换算（否则数值会被放大十倍）。
 *
 * v1 的 `metaTraits`/`darkTetrad`/`lightTriad`/`archetype`/`currentState` 等派生副本
 * 一律丢弃：它们读取时由 `facets` 重算，保留会让两套数字并存并互相漂移。
 *
 * 判定依据是字段形状而非存档版本号，因此可重复调用（幂等）。
 * 缺失的子维度按人群中位（z = 0）补足，利他即属此类——它是 v2 新增的间质子维度。
 */
export function normalizeFacets(raw: unknown): HexacoFacets {
  const source = (raw ?? {}) as {
    facets?: Record<string, unknown>;
    hexaco?: unknown;
    dynamics?: unknown;
  };

  const rawFacets = source.facets ?? {};
  // v1 无 dynamics，且分数在 0–100 量表上
  const isLegacyScale = !source.dynamics && source.hexaco != null;
  const convert = (score: unknown): number => {
    if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
    const z = isLegacyScale ? (score - 50) / 10 : score;
    return Math.round(z * 1000) / 1000;
  };

  const facets = {} as HexacoFacets;
  for (const key of FACET_KEYS) {
    facets[key] = convert(rawFacets[key]);
  }
  return facets;
}

// ============================================================================
// 元因子（§3.3.2）
// ============================================================================

/**
 * 三个元因子的成分与符号。三个集合**互不重叠**，保证公式层面可区分。
 *
 * 刻意排除：C.PER（与焦虑相关，载荷不稳）、E.FEA（与情绪稳定关系不稳）、
 * E.DEP（含依恋成分，方向含混）、E 整域（v1 的错误是把焦虑与依赖也算作"亲社会"）、
 * X.SSE（已归入 α 的低退缩）。
 */
const META_COMPONENTS = {
  alpha: {
    positive: ['patience', 'flexibility', 'organization', 'diligence', 'prudence', 'socialSelfEsteem'],
    negative: ['anxiety'],
  },
  beta: {
    positive: ['socialBoldness', 'liveliness', 'sociability', 'aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality'],
    negative: [],
  },
  gamma: {
    positive: ['sincerity', 'fairness', 'greedAvoidance', 'modesty', 'forgivingness', 'gentleness', 'sentimentality', 'altruism'],
    negative: [],
  },
} as const satisfies Record<keyof MetaTraits, { positive: readonly (keyof HexacoFacets)[]; negative: readonly (keyof HexacoFacets)[] }>;

/**
 * 各元因子的预期平均符号相关（§3.3.2 标 [D]）。
 * 三个因子分数之间仍预期中等相关，不假定正交。
 */
const META_INTERCORRELATION: Record<keyof MetaTraits, number> = {
  alpha: 0.20,
  beta: 0.15,
  gamma: 0.30,
};

function metaComponents(facets: HexacoFacets, key: keyof MetaTraits): number[] {
  const spec = META_COMPONENTS[key];
  return [
    ...spec.positive.map(f => facets[f]),
    ...spec.negative.map(f => -facets[f]),
  ];
}

/** 计算三个元因子（单位权重 → 重标准化，§2.6） */
export function deriveMetaTraits(facets: HexacoFacets): MetaTraits {
  const meta = {} as MetaTraits;
  for (const key of Object.keys(META_COMPONENTS) as (keyof MetaTraits)[]) {
    meta[key] = Math.round(restandardize(metaComponents(facets, key), META_INTERCORRELATION[key]) * 100) / 100;
  }
  return meta;
}

// ============================================================================
// 构型（§3.4）
// ============================================================================

/** 构型判定阈值：档位 ±0.5，签名 ±0.5 / ±1.0（§3.4.1、§3.4.2） */
const OCTANT_BAND = 0.5;

/** 八分构型的原型向量 p_k ∈ {±1}³ */
const OCTANT_PROTOTYPES: Record<OctantId, [number, number, number]> = {
  PPP: [1, 1, 1], PPN: [1, 1, -1], PNP: [1, -1, 1], PNN: [1, -1, -1],
  NPP: [-1, 1, 1], NPN: [-1, 1, -1], NNP: [-1, -1, 1], NNN: [-1, -1, -1],
};

/** 软隶属带宽 τ（§附录 B，默认 1.0） */
const OCTANT_BANDWIDTH = 1.0;

/**
 * 软隶属度（§3.4.1）：`w_k = exp(−‖m − p_k‖² / 2τ²)`，归一化。
 *
 * 用软隶属而非硬分类，是因为一个人可以同时部分匹配多个构型——
 * β≈0 时"+ − +"与"+ + +"本就该接近并列。
 */
export function deriveOctantAffinities(meta: MetaTraits): OctantAffinity[] {
  const m = [meta.alpha, meta.beta, meta.gamma];
  const raw = (Object.keys(OCTANT_PROTOTYPES) as OctantId[]).map(octant => {
    const p = OCTANT_PROTOTYPES[octant];
    const distanceSquared = m.reduce((sum, value, i) => sum + (value - p[i]) ** 2, 0);
    return { octant, weight: Math.exp(-distanceSquared / (2 * OCTANT_BANDWIDTH ** 2)) };
  });

  const total = raw.reduce((sum, r) => sum + r.weight, 0);
  return raw
    .map(r => ({ octant: r.octant, membership: total > 0 ? r.weight / total : 0 }))
    .sort((a, b) => b.membership - a.membership);
}

/**
 * 子维度签名的判据（§3.4.2）。
 *
 * 签名的价值在于刻画"矛盾的人"：角色的矛盾感应来自子维度分离
 * （如 H.FAI 高而 H.SIN 低），而不是随意的人设冲突。
 */
type SignatureCondition = { facet: keyof HexacoFacets; min?: number; max?: number };

const SIGNATURE_CONDITIONS: Record<SignatureId, SignatureCondition[]> = {
  benevolent_strategist: [
    { facet: 'prudence', min: 0.5 }, { facet: 'sincerity', max: -0.5 },
    { facet: 'gentleness', min: 0.5 }, { facet: 'altruism', min: 0.5 },
  ],
  vulnerable_superiority: [
    { facet: 'modesty', max: -0.5 }, { facet: 'anxiety', min: 0.5 },
    { facet: 'socialSelfEsteem', max: -0.5 }, { facet: 'patience', max: -0.5 },
  ],
  chaotic_innovator: [
    { facet: 'creativity', min: 1.0 }, { facet: 'liveliness', min: 0.5 },
    { facet: 'organization', max: -0.5 }, { facet: 'prudence', max: -0.5 },
  ],
  calm_executor: [
    { facet: 'diligence', min: 0.5 }, { facet: 'organization', min: 0.5 },
    { facet: 'sentimentality', max: -0.5 }, { facet: 'gentleness', max: -0.5 },
  ],
  needed_helper: [
    { facet: 'altruism', min: 1.0 }, { facet: 'gentleness', min: 0.5 },
    { facet: 'dependence', min: 0.5 }, { facet: 'modesty', max: -0.5 },
  ],
  rule_enforcer: [
    { facet: 'fairness', min: 1.0 }, { facet: 'forgivingness', max: -0.5 },
    { facet: 'gentleness', max: -0.5 }, { facet: 'sentimentality', max: -0.5 },
  ],
  steady_caregiver: [
    { facet: 'altruism', min: 0.5 }, { facet: 'sentimentality', min: 0.5 },
    { facet: 'anxiety', max: -0.5 }, { facet: 'diligence', min: 0.5 },
  ],
  quiet_principled: [
    { facet: 'fairness', min: 1.0 }, { facet: 'modesty', min: 0.5 },
    { facet: 'socialBoldness', max: -0.5 },
  ],
};

function conditionMet(condition: SignatureCondition, facets: HexacoFacets): boolean {
  const value = facets[condition.facet];
  if (condition.min !== undefined && value < condition.min) return false;
  if (condition.max !== undefined && value > condition.max) return false;
  return true;
}

/** 签名匹配度（§3.4.2）：match = 满足条件数 / 条件总数；仅返回 match > 0 的项，按匹配度降序 */
export function deriveSignatureMatches(facets: HexacoFacets): SignatureMatch[] {
  return (Object.keys(SIGNATURE_CONDITIONS) as SignatureId[])
    .map(signature => {
      const conditions = SIGNATURE_CONDITIONS[signature];
      const met = conditions.filter(c => conditionMet(c, facets)).length;
      return { signature, match: met / conditions.length };
    })
    .filter(m => m.match > 0)
    .sort((a, b) => b.match - a.match);
}

// ============================================================================
// 代理指标（§3.4.3）
// ============================================================================

/**
 * 光明/黑暗构念的近似代理成分（单位权重，符号内建）。
 *
 * 使用限制（§3.4.3、§7.2）：这些代理**未**通过验证门槛（与专用量表 r ≥ .50），
 * 因此不对个体作诊断式判断，也不输出风险等级；Sad_proxy 置信最低。
 */
const PROXY_COMPONENTS: Record<ProxyId, { positive: (keyof HexacoFacets)[]; negative: (keyof HexacoFacets)[] }> = {
  machiavellianism: { positive: ['prudence'], negative: ['sincerity', 'fairness', 'greedAvoidance', 'sentimentality'] },
  narcissism: { positive: ['socialBoldness', 'socialSelfEsteem'], negative: ['modesty', 'flexibility'] },
  psychopathy: { positive: [], negative: ['fearfulness', 'sentimentality', 'fairness', 'prudence', 'gentleness'] },
  sadism: { positive: ['socialBoldness'], negative: ['gentleness', 'sentimentality'] },
  kantianism: { positive: ['sincerity', 'fairness', 'greedAvoidance'], negative: [] },
  humanism: { positive: ['gentleness', 'sentimentality', 'altruism', 'inquisitiveness'], negative: [] },
  faithInHumanity: { positive: ['forgivingness', 'flexibility'], negative: ['anxiety'] },
};

/**
 * 各代理合成时的平均符号相关 r̄ₛ。
 *
 * §6.3 的示例对操纵倾向取 .25、康德主义取 .35；其余构念文档未给值，
 * 取两者之间。该参数只影响 z̃ 的缩放，不改变符号与排序。
 */
const PROXY_INTERCORRELATION: Record<ProxyId, number> = {
  machiavellianism: 0.25,
  narcissism: 0.30,
  psychopathy: 0.30,
  sadism: 0.30,
  kantianism: 0.35,
  humanism: 0.30,
  faithInHumanity: 0.30,
};

/** 计算全部代理指标（z 分） */
export function deriveProxies(facets: HexacoFacets): Record<ProxyId, number> {
  const proxies = {} as Record<ProxyId, number>;
  for (const key of Object.keys(PROXY_COMPONENTS) as ProxyId[]) {
    const spec = PROXY_COMPONENTS[key];
    const components = [
      ...spec.positive.map(f => facets[f]),
      ...spec.negative.map(f => -facets[f]),
    ];
    proxies[key] = Math.round(restandardize(components, PROXY_INTERCORRELATION[key]) * 100) / 100;
  }
  return proxies;
}

// ============================================================================
// 过程平面 P1：情境激活与状态表达（§4.1）
// ============================================================================

/** 情境对特质 j 的线索相关度 r_jt ∈ [0,1]，0.5 为中性 */
export type CueRelevance = Partial<Record<keyof HexacoFacets, number>>;

/** 情境对特质 j 所要求/期待的表达水平 n_jt（z 分） */
export type SituationalNorm = Partial<Record<keyof HexacoFacets, number>>;

/** 特质激活增益 κ_j 默认 0.5（§附录 B） */
const TRAIT_ACTIVATION_GAIN = 0.5;

/** 个人内 SD σ_w 默认 0.7（§附录 B） */
const WITHIN_PERSON_SD = 0.7;

/** 一游戏年按 365 天计，用于把按年给出的漂移率换算到按天的调用 */
const DAYS_PER_YEAR = 365;

/**
 * 情境特征 → 被激活的子维度（§4.1）。
 *
 * 情境分类取自 DIAMONDS 八维模型的假设映射。与 v1 的差别在于：这里给出的是
 * **线索相关度** r（该情境是否与这个特质有关），而不是"特质越极端反应越大"——
 * 后者与线索无关，是 v1 "情境-特质激活"表的误用。
 */
const SITUATION_CUE_RELEVANCE: Record<SituationType, CueRelevance> = {
  // Duty 责任/任务
  task: { diligence: 0.9, organization: 0.85, prudence: 0.85, fairness: 0.7 },
  // Intellect 智性
  ambiguous: { inquisitiveness: 0.85, creativity: 0.8, aestheticAppreciation: 0.7 },
  // Adversity 逆境/威胁
  threat: { anxiety: 0.85, fearfulness: 0.8, patience: 0.7 },
  // pOsitivity 愉悦
  opportunity: { liveliness: 0.8, sociability: 0.8 },
  // Negativity 冲突/负面 + Sociality 社交
  competition: { patience: 0.8, forgivingness: 0.75, gentleness: 0.7, socialBoldness: 0.7 },
  // Mating 亲密/吸引
  intimate: { socialBoldness: 0.8, socialSelfEsteem: 0.8, sentimentality: 0.85 },
};

/** 情境对表达水平的期待 n_jt：以"该情境是否要求高于常态"给出（z 分） */
const SITUATION_NORM_PRESSURE: Record<SituationType, SituationalNorm> = {
  task: { diligence: 1.0, organization: 1.0, prudence: 0.7, liveliness: -0.5 },
  ambiguous: { unconventionality: 0.5, organization: -0.4 },
  threat: { anxiety: -0.3, patience: 0.5, fearfulness: -0.5 },
  opportunity: { liveliness: 0.5, sociability: 0.6 },
  competition: { socialBoldness: 0.8, gentleness: -0.5, patience: 0.5 },
  intimate: { sentimentality: 0.6, gentleness: 0.6, socialBoldness: 0.3 },
};

/** 标准正态取样（Box-Muller），供状态表达的 ε_jt 使用 */
function sampleStandardNormal(): number {
  const u1 = Math.max(Number.EPSILON, Math.random());
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * 计算一次情境下的**子维度**状态表达（§4.1）。
 *
 * `x_jt = (1 − ς)·g_jt·θ_j + ς·n_jt + ε_jt`，`g_jt = 1 + κ·(r_jt − 0.5)`。
 * 弱情境下状态由特质主导、并在相关线索下放大（特质激活）；
 * 强情境下状态向规范收敛、个体差异被压缩。
 *
 * 子维度级表达用于叙事与背离负荷；状态偏离 D² 走 `expressDomains`——
 * 两者不可互换，见该函数的说明。
 *
 * @param withNoise 是否注入 ε ~ N(0, σ_w²)；传 false 得到期望值（用于展示与测试）
 */
export function expressState(
  facets: HexacoFacets,
  situation: SituationType,
  situationalStrength: number,
  withNoise = true
): StateExpression {
  const strength = Math.max(0, Math.min(1, situationalStrength));
  const cues = SITUATION_CUE_RELEVANCE[situation];
  const norms = SITUATION_NORM_PRESSURE[situation];

  const expressed = {} as HexacoFacets;
  let deviationSum = 0;

  for (const key of Object.keys(facets) as (keyof HexacoFacets)[]) {
    const theta = facets[key];
    const relevance = cues[key] ?? 0.5;              // 未列出的子维度视为中性线索
    const gain = 1 + TRAIT_ACTIVATION_GAIN * (relevance - 0.5);
    const norm = norms[key] ?? 0;
    const expected = (1 - strength) * gain * theta + strength * norm;
    const noise = withNoise ? sampleStandardNormal() * WITHIN_PERSON_SD : 0;
    const value = expected + noise;

    expressed[key] = value;
    deviationSum += Math.abs(value - theta);
  }

  return { facets: expressed, deviationSum, situationalStrength: strength };
}

/** 情境在某个维度上的线索相关度：取该维度内子维度线索的均值 */
export function domainCueRelevance(situation: SituationType, domain: keyof HexacoProfile): number {
  const cues = SITUATION_CUE_RELEVANCE[situation];
  const keys = DOMAIN_FACETS[domain];
  return keys.reduce((sum, key) => sum + (cues[key] ?? 0.5), 0) / keys.length;
}

/**
 * 情境对某个维度的特质激活增益 g = 1 + κ·(r − 0.5)（§4.1）。
 * 增益只取决于线索相关度，与特质本身的极端程度无关。
 */
export function traitActivationGain(situation: SituationType, domain: keyof HexacoProfile): number {
  return 1 + TRAIT_ACTIVATION_GAIN * (domainCueRelevance(situation, domain) - 0.5);
}

/** 情境对某个维度的期待水平：取该维度内子维度规范的均值 */
function domainNormPressure(situation: SituationType, domain: keyof HexacoProfile): number {
  const norms = SITUATION_NORM_PRESSURE[situation];
  const keys = DOMAIN_FACETS[domain];
  return keys.reduce((sum, key) => sum + (norms[key] ?? 0), 0) / keys.length;
}

/**
 * 计算一次情境下的**维度**状态表达（§4.1），供状态偏离 D² 使用。
 *
 * 刻意与子维度级表达分开：D² 的卡方判据是针对 p = 6 个维度给出的
 * （§4.3.1 的分档表按 p = 6 与 p = 4 列出 80/95/99 分位）。若在 25 个子维度上
 * 累加，χ²₂₅ 的期望值就是 25，远超"常态范围"的 8.56，所有实体都会常驻极端档。
 *
 * 这里的线索与规范由子维度表按维度取均值得到，不另建一张表——两张表必然漂移。
 */
export function expressDomains(
  facets: HexacoFacets,
  situation: SituationType,
  situationalStrength: number,
  withNoise = true
): HexacoProfile {
  const strength = Math.max(0, Math.min(1, situationalStrength));
  const theta = deriveDomains(facets);
  const expressed = {} as HexacoProfile;

  for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
    const relevance = domainCueRelevance(situation, key);
    const gain = 1 + TRAIT_ACTIVATION_GAIN * (relevance - 0.5);
    const expected = (1 - strength) * gain * theta[key] + strength * domainNormPressure(situation, key);
    expressed[key] = expected + (withNoise ? sampleStandardNormal() * WITHIN_PERSON_SD : 0);
  }

  return expressed;
}

// ============================================================================
// 过程平面 P2：特质背离负荷与恢复（§4.2）
// ============================================================================

/**
 * 负荷递推参数（§附录 B，全部为 [D] 默认值）。
 *
 * 与 v1 的"特质疲劳"的关键区别：不再假设某种可耗尽的资源（自我损耗模型的
 * 实验证据存在重大复现争议），而是把负荷定义为"持续、被监控、非自选的背离"
 * 所带来**主观负担**；背离若服务于个人自选的核心项目则折扣，由恢复性生态位降低。
 */
export const LOAD_PARAMS = {
  /** ρ 负荷的日际保持 */
  retention: 0.7,
  /** λ 恢复效率 */
  recoveryEfficiency: 0.6,
  /** φ 自选目标的负荷折扣 */
  chosenDiscount: 0.4,
} as const;

/**
 * 单次背离负荷 L（§4.2）。
 *
 * `L = ς · [Σ r·d / Σ r] · (1 − φ·Chosen)`，d_j = |n_j − θ_j|。
 * 用线索相关度加权，是因为与本人特质无关的规范并不构成背离。
 *
 * @param facets 个人特质水平 θ
 * @param situation 情境类型
 * @param situationalStrength 情境强度 ς
 * @param chosen 该背离在多大程度上服务于自选的核心项目 ∈ [0,1]
 */
export function computeDiscrepancyLoad(
  facets: HexacoFacets,
  situation: SituationType,
  situationalStrength: number,
  chosen = 0
): number {
  const strength = Math.max(0, Math.min(1, situationalStrength));
  const cues = SITUATION_CUE_RELEVANCE[situation];
  const norms = SITUATION_NORM_PRESSURE[situation];

  let weightedSum = 0;
  let weightTotal = 0;

  for (const key of Object.keys(facets) as (keyof HexacoFacets)[]) {
    const relevance = cues[key] ?? 0;
    if (relevance <= 0) continue;
    const deviation = Math.abs((norms[key] ?? 0) - facets[key]);
    weightedSum += relevance * deviation;
    weightTotal += relevance;
  }

  if (weightTotal === 0) return 0;
  return strength * (weightedSum / weightTotal) * (1 - LOAD_PARAMS.chosenDiscount * chosen);
}

/**
 * 负荷递推 `F_t = max(0, ρ·F_{t−1} + L_t − λ·N_t)`（§4.2）。
 *
 * @param previousLoad 上一时点的累积负荷 F
 * @param load 本时点新增负荷 L
 * @param restorativeAccess 恢复性生态位可及度 N ∈ [0,1]
 */
export function accumulateLoad(previousLoad: number, load: number, restorativeAccess: number): number {
  const recovery = LOAD_PARAMS.recoveryEfficiency * Math.max(0, Math.min(1, restorativeAccess));
  return Math.max(0, LOAD_PARAMS.retention * previousLoad + load - recovery);
}

// ============================================================================
// 过程平面 P3：状态偏离与档位（§4.3.1）
// ============================================================================

/**
 * D² 的档位判据：多元正态近似下 D² ~ χ²_p，阈值取卡方分位（§4.3.1）。
 *
 * 这里用 p = 6（维度数）的分位值：80% = 8.56、95% = 12.59、99% = 16.81。
 */
const DEVIATION_BANDS: { state: PersonalityState; max: number }[] = [
  { state: 'typical', max: 8.56 },
  { state: 'stretched', max: 12.59 },
  { state: 'atypical', max: 16.81 },
  { state: 'extreme', max: Infinity },
];

/**
 * 状态偏离 D²（§4.3.1）：以**个人自己的分布**为参照。
 *
 * `D² = Σ_j ((x_j − θ_j) / σ_w,j)²`，在**维度**层求和使 D² ~ χ²₆，
 * 与 §4.3.1 的分档分位（8.56 / 12.59 / 16.81）对应。
 *
 * v1 用 α 的绝对阈值划分状态。α 是由特质算出的静态量，不可能在压力中"崩溃"，
 * 因此状态必须由"此刻相对个人基线的偏离"给出，而不是由 θ 的档位给出。
 *
 * @param expressed 维度级状态表达（`expressDomains` 的输出）
 * @param theta 维度级个人基线（`deriveDomains` 的输出）
 */
export function computeDeviationSquared(expressed: HexacoProfile, theta: HexacoProfile): number {
  let total = 0;
  for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
    const delta = (expressed[key] - theta[key]) / WITHIN_PERSON_SD;
    total += delta * delta;
  }
  return Math.round(total * 100) / 100;
}

/** 由 D² 分档得到人格状态（§4.3.1） */
export function stateFromDeviation(deviationSquared: number): PersonalityState {
  for (const band of DEVIATION_BANDS) {
    if (deviationSquared <= band.max) return band.state;
  }
  return 'extreme';
}

/** 档位的中文描述，用于日志与卡片（§6.2：报告区间与不确定性，不下结论） */
export const PERSONALITY_STATE_LABELS: Record<PersonalityState, string> = {
  typical: '常态范围',
  stretched: '拉伸',
  atypical: '非典型',
  extreme: '极端偏离',
};

// ============================================================================
// 过程平面 P4：长期变化（§4.4）
// ============================================================================

/**
 * 特质漂移参数（§4.4）。
 *
 * 量级受研究约束：特质变化缓慢而小，变化最活跃的年段每十年约 0.1–0.3 SD；
 * 遗传度约 40%，意味着变化是在"设定点"附近移动而非重写。干预类效应在
 * 数周到数月内约 0.3–0.4 SD。以下数值按"每年"给出，直接对应这些结论。
 */
export const DRIFT_PARAMS = {
  /** 年龄漂移（z/年）。十年前进 0.1–0.3 SD，取中值即 0.02/年 */
  ageDriftPerYear: 0.02,
  /** 单次生活事件的最大漂移（z），对应"多数事件影响小到中且不持久" */
  eventDriftMax: 0.25,
  /** 主动练习/目标驱动的最大漂移（z） */
  volitionalDriftMax: 0.3,
  /**
   * 向均值回归的比例（每年）。相互强化原则会放大偏离，需要一项与之平衡的稳定项；
   * 它必须按时间线性缩放，否则长时间跨度下会把特质瞬间压回 0。
   */
  regressionToMeanPerYear: 0.02,
  /** 特质水平的硬边界（z）：超出此范围已不属于人群分布，属模型外 */
  clamp: 3.5,
} as const;

/** 年龄漂移方向：成熟原则（§4.4）——成年期趋向更情绪稳定、更宜人、更尽责 */
const AGE_DRIFT_DIRECTION: Partial<Record<keyof HexacoFacets, number>> = {
  anxiety: -1, fearfulness: -0.5,
  patience: 1, flexibility: 1, gentleness: 1, forgivingness: 0.8,
  organization: 0.7, diligence: 0.7, prudence: 0.6,
  sincerity: 0.4, fairness: 0.4, modesty: 0.3,
};

/**
 * 长期特质漂移（§4.4 P4）：`θ(τ+1) = θ(τ) + a(age) + Σψ·E + ν·V + e`。
 *
 * 由于 facets 是唯一权威、其余派生值读取时重算，写回 θ 之后整条链
 * （维度 → 元因子 → 构型 → 代理 → 行为权重）会自动一致——这正是
 * "派生值不持久化"要买到的东西。
 *
 * @param facets 当前特质水平
 * @param elapsedDays 距上次漂移经过的游戏日
 * @param eventImpulse 生活事件冲量（-1..1 的取向向量），键为子维度
 * @param volitionalImpulse 主动练习/目标冲量（-1..1），键为子维度
 * @param ageDriftScale 年龄漂移强度（0 = 已停止变化），可塑性随年龄下降
 */
export function applyTraitDrift(
  facets: HexacoFacets,
  elapsedDays: number,
  eventImpulse: Partial<Record<keyof HexacoFacets, number>> = {},
  volitionalImpulse: Partial<Record<keyof HexacoFacets, number>> = {},
  ageDriftScale = 1
): HexacoFacets {
  const drifted = {} as HexacoFacets;
  const elapsedYears = elapsedDays / DAYS_PER_YEAR;

  for (const key of Object.keys(facets) as (keyof HexacoFacets)[]) {
    const current = facets[key];
    const ageDrift = (AGE_DRIFT_DIRECTION[key] ?? 0) * DRIFT_PARAMS.ageDriftPerYear * elapsedYears * ageDriftScale;
    const eventDrift = (eventImpulse[key] ?? 0) * DRIFT_PARAMS.eventDriftMax;
    const volitionalDrift = (volitionalImpulse[key] ?? 0) * DRIFT_PARAMS.volitionalDriftMax;
    // 向均值回归同样按年缩放，否则长时间跨度下会一次性抹平特质
    const regression = -current * DRIFT_PARAMS.regressionToMeanPerYear * elapsedYears;
    const drift = ageDrift + eventDrift + volitionalDrift + regression;

    // 不在此处做小数位取整：单帧漂移量约 1e-6，取整会把每一帧都抹回原值，
    // 于是漂移永远累积不起来（P4 静默失效）。显示时才取整。
    drifted[key] = Math.max(-DRIFT_PARAMS.clamp, Math.min(DRIFT_PARAMS.clamp, current + drift));
  }

  return drifted;
}

// ============================================================================
// 行为权重（由子维度派生，供需求优先级与事件判定使用）
// ============================================================================

/** 行为驱动权重；值域 0–1（obedienceBase 为 −50–50 的修正量） */
export interface BehaviorWeights {
  socialSeek: number;
  solitudeSeek: number;
  riskTolerance: number;
  obedienceBase: number;
  stressResistance: number;
  lustSensitivity: number;
  devotionTendency: number;
  aggressiveness: number;
  empathy: number;
  impulsivity: number;
}

/**
 * 由子维度派生行为权重。
 *
 * 一律以 z 分输入：此处把 z 线性映射到 0–1（`(z + 3) / 6`，±3σ 覆盖全量程），
 * 使下游既有的 `> 0.5` 类比较保持含义（0.5 即人群均值）。
 */
function normalized(z: number): number {
  return Math.max(0, Math.min(1, (z + 3) / 6));
}

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

// ============================================================================
// 情绪倾向（由子维度与当前压力/理智预测，替代 v1 的绝对阈值版本）
// ============================================================================

/** 由人格与当前状态预测情绪倾向；personality 为 z 分，stress/sanity 为 0–100 */
export function predictMoodTendency(
  facets: HexacoFacets,
  stress: number,
  sanity: number
): MoodState {
  // 麻木：长期高压 + 低理智 + 高情绪性
  if (stress > 85 && sanity < 35 && facets.anxiety > 0.5) return MoodState.NUMB;

  // 恐惧：极低理智，或理智偏低且恐惧特质突出
  if (sanity < 25 || (sanity < 40 && facets.fearfulness > 1.0)) return MoodState.FEARFUL;

  // 狂喜：高活力 + 低压力 + 高感伤
  if (facets.liveliness > 1.0 && stress < 30 && facets.sentimentality > 0.5) return MoodState.EUPHORIC;

  // 焦虑：高焦虑 + 高压力
  if (facets.anxiety > 0.5 && stress > 50) return MoodState.ANXIOUS;

  // 易怒：低耐心 + 高压力
  if (facets.patience < -0.5 && stress > 60) return MoodState.IRRITABLE;

  // 忧郁：高感伤 + 低理智
  if (facets.sentimentality > 0.5 && sanity < 50) return MoodState.MELANCHOLY;

  return MoodState.CONTENT;
}
