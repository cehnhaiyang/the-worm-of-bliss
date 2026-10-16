
// ============================================
// UI 常量与样式映射
// ============================================

import { CarriageType, CharacterStatus, LogType } from '../meta';

// ============================================
// 颜色映射
// ============================================

export const RANK_COLORS = {
  unranked: 'dim gray',
  copper: 'copper orange',
  silver: 'silver white',
  gold: 'golden yellow',
  obsidian: 'obsidian black with purple shimmer',
};

export const TYPE_COLORS: Partial<Record<CarriageType, string>> = {
  // 圣所 - 社会性剥离
  ['ATRIUM']: 'bg-emerald-900/50',
  ['POOLS']: 'bg-cyan-900/50',
  ['VEIL']: 'bg-pink-900/50',
  ['CONFESSIONAL']: 'bg-purple-900/50',
  ['GARDEN']: 'bg-green-900/50',
  ['SCALES_CONSERVATORY']: 'bg-yellow-900/50',
  ['ARCHIVE']: 'bg-orange-900/50',
  ['MUSE_THEATRE']: 'bg-rose-900/50',
  ['NURSERY']: 'bg-teal-900/50',
  ['ALTAR']: 'bg-red-900/50',
  ['CAULDRON']: 'bg-red-950/50',
  // 深渊
  ['SILENT_SALON']: 'bg-violet-900/70',
  ['ORACLE_WHISPER']: 'bg-violet-900/70',
  ['NEGATIVE_GALLERY']: 'bg-violet-900/70',
  ['ESCHER_STAIRS']: 'bg-violet-900/70',
  ['MIRROR_HALL']: 'bg-fuchsia-900/70',
  ['TIME_INFIRMARY']: 'bg-fuchsia-900/70',
  ['DISSOLUTION_CHAMBER']: 'bg-fuchsia-900/70',
  ['FLESH_HIVE']: 'bg-purple-950/80',
  ['INVERTED_TREE']: 'bg-purple-950/80',
  ['SYMBIOTIC_GALLERY']: 'bg-purple-950/80',
  ['VOID_WINDOW']: 'bg-purple-950/80',
  ['ENTROPY_CLOCK']: 'bg-purple-950/80',
};

export const STATUS_COLORS: Partial<Record<CharacterStatus, string>> = {
  'panicked': 'text-yellow-400',
  'aroused': 'text-pink-400',
  'injured': 'text-red-400',
  'broken': 'text-gray-400',
  'pregnant': 'text-purple-400',
  'devoted': 'text-amber-400',
  'sleeping': 'text-blue-400',
  'chatting': 'text-emerald-400',
  'observing': 'text-fuchsia-400',
};

export const STATUS_STYLES: Record<CharacterStatus, { color: string; name: string }> = {
  'normal': { color: 'bg-zinc-700 text-zinc-300', name: '正常' },
  'panicked': { color: 'bg-yellow-900/60 text-yellow-400', name: '恐惧' },
  'aroused': { color: 'bg-pink-900/60 text-pink-400', name: '动情' },
  'injured': { color: 'bg-red-900/60 text-red-400', name: '受伤' },
  'broken': { color: 'bg-gray-900/60 text-gray-400', name: '崩溃' },
  'pregnant': { color: 'bg-purple-900/60 text-purple-400', name: '怀孕' },
  'euphoric': { color: 'bg-fuchsia-900/60 text-fuchsia-400', name: '极乐' },
  'dissociated': { color: 'bg-blue-900/60 text-blue-400', name: '解离' },
  'devoted': { color: 'bg-amber-900/60 text-amber-400', name: '虔诚' },
  'complicit': { color: 'bg-orange-900/60 text-orange-400', name: '共犯' },
  'voyeur': { color: 'bg-indigo-900/60 text-indigo-400', name: '窥伺' },
  'deaconess': { color: 'bg-violet-900/60 text-violet-400', name: '执事' },
  'gestating': { color: 'bg-teal-900/60 text-teal-400', name: '孕育' },
  'performing': { color: 'bg-rose-900/60 text-rose-400', name: '表演' },
  'confessing': { color: 'bg-slate-900/60 text-slate-400', name: '忏悔' },
  'anchoring': { color: 'bg-cyan-900/60 text-cyan-400', name: '锚定' },
  'sleeping': { color: 'bg-blue-900/60 text-blue-400', name: '睡眠' },
  'eating': { color: 'bg-amber-900/60 text-amber-400', name: '进食' },
  'bathing': { color: 'bg-cyan-900/60 text-cyan-400', name: '沐浴' },
  'wandering': { color: 'bg-zinc-700 text-zinc-400', name: '游荡' },
  'chatting': { color: 'bg-emerald-900/60 text-emerald-400', name: '交谈' },
  'observing': { color: 'bg-fuchsia-900/40 text-fuchsia-400 border border-fuchsia-500/30 animate-pulse', name: '观测' },
};

/*
  获取状态的中文名称
  @param status 状态枚举值
  @returns 中文名称
*/
export const getStatusName = (status: CharacterStatus): string => {
  return STATUS_STYLES[status]?.name ?? '未知';
};

// ============================================
// 日志样式
// ============================================

export const LOG_STYLES: Record<LogType, { container: string; label: string; labelText: string }> = {
  player: {
    container: 'bg-blue-900/20 text-blue-100 border-l-2 border-blue-500',
    label: 'text-blue-400',
    labelText: 'ME'
  },
  system: {
    container: 'text-yellow-500 font-mono text-xs bg-yellow-900/10 border-l-2 border-yellow-600/50',
    label: 'text-yellow-600',
    labelText: 'SYSTEM'
  },
  narrative: {
    container: 'text-zinc-300 bg-zinc-900/30 border-l-2 border-zinc-600',
    label: 'text-zinc-500',
    labelText: 'NARRATIVE'
  },
  thought: {
    container: 'bg-pink-900/10 text-pink-200 italic font-serif border-r-2 border-pink-500',
    label: 'text-pink-400',
    labelText: ''
  },
  abyss: {
    container: 'bg-purple-900/20 text-purple-300 border-l-2 border-purple-500 font-mono',
    label: 'text-purple-400',
    labelText: 'ABYSS'
  },
  grace: {
    container: 'bg-amber-900/20 text-amber-200 border-l-2 border-amber-500',
    label: 'text-amber-400',
    labelText: 'GRACE'
  },
  ritual: {
    container: 'bg-red-900/20 text-red-200 border-l-2 border-red-500',
    label: 'text-red-400',
    labelText: 'RITUAL'
  },
  movement: {
    container: 'text-cyan-400 font-mono text-xs bg-cyan-900/10 border-l-2 border-cyan-600/50',
    label: 'text-cyan-600',
    labelText: 'MOVE'
  },
  social: {
    container: 'text-emerald-400 font-serif text-xs bg-emerald-900/10 border-l-2 border-emerald-600/50',
    label: 'text-emerald-600',
    labelText: 'SOCIAL'
  }
};

// ============================================
// 快捷指令
// ============================================

export const QUICK_COMMAND_CATEGORIES = {
  basic: {
    label: '基础',
    commands: [
      { label: '观察', cmd: '仔细观察她现在的状态和表情。' },
      { label: '对话', cmd: '和她说话，询问她的感受。' },
      { label: '抚摸', cmd: '轻轻抚摸她的头发。' },
      { label: '安慰', cmd: '给她一个拥抱，安慰她。' },
    ]
  },
  control: {
    label: '控制',
    commands: [
      { label: '命令', cmd: '命令她跪下。' },
      { label: '惩罚', cmd: '她需要被惩罚。' },
      { label: '训诫', cmd: '严厉地训斥她的不服从。' },
      { label: '奖励', cmd: '因为她的顺从给予奖励。' },
    ]
  },
  intimate: {
    label: '亲密',
    commands: [
      { label: '亲吻', cmd: '吻她。' },
      { label: '爱抚', cmd: '爱抚她的身体。' },
      { label: '侵犯', cmd: '侵犯她。' },
      { label: '标记', cmd: '在她身上留下印记。' },
    ]
  },
  psychological: {
    label: '心理',
    commands: [
      { label: '审视', cmd: '审视她的内心，探究她的恐惧。' },
      { label: '暗示', cmd: '在她耳边低语，植入暗示。' },
      { label: '记忆', cmd: '触发她的记忆，让她回忆过去。' },
      { label: '崩溃', cmd: '打破她最后的心理防线。' },
    ]
  },
};

export const EXTENDED_QUICK_COMMANDS = {
  movement: {
    label: '移动',
    commands: [
      { label: '带走', cmd: '带她去另一个车厢。' },
      { label: '隔离', cmd: '把她单独关起来。' },
      { label: '召唤', cmd: '命令她来到我面前。' },
      { label: '驱逐', cmd: '把她赶到深渊区域。' },
    ]
  },
  ritual: {
    label: '仪式',
    commands: [
      { label: '献祭', cmd: '开始献祭仪式。' },
      { label: '洗礼', cmd: '为她进行洗礼仪式。' },
      { label: '晋升', cmd: '提升她的等级。' },
      { label: '净化', cmd: '净化她的记忆。' },
    ]
  },
  memory: {
    label: '记忆',
    commands: [
      { label: '唤醒', cmd: '唤醒她的某段记忆。' },
      { label: '篡改', cmd: '篡改她的记忆。' },
      { label: '植入', cmd: '植入一段虚假的记忆。' },
      { label: '抹除', cmd: '抹除她的某段记忆。' },
    ]
  },
  social: {
    label: '社交',
    commands: [
      { label: '引见', cmd: '让她认识另一个少女。' },
      { label: '分离', cmd: '拆散她和她的朋友。' },
      { label: '对质', cmd: '让她和另一个少女对质。' },
      { label: '共犯', cmd: '让她成为我的共犯。' },
    ]
  },
};

export const ALL_QUICK_COMMANDS = {
  ...QUICK_COMMAND_CATEGORIES,
  ...EXTENDED_QUICK_COMMANDS,
};

export const ATTRIBUTE_ICONS = {
  sanity: 'SAN',
  obedience: 'OBD',
  lust: 'LST',
  stress: 'STR',
  corruption: 'CRP',
  devotion: 'DVT',
  hunger: 'HGR',
  fatigue: 'FTG',
  hygiene: 'HYG',
};

export const ATTRIBUTE_COLORS = {
  sanity: {
    low: 'text-red-400',
    medium: 'text-yellow-400',
    high: 'text-green-400',
  },
  obedience: {
    low: 'text-red-400',
    medium: 'text-yellow-400',
    high: 'text-purple-400',
  },
  lust: {
    low: 'text-zinc-400',
    medium: 'text-pink-400',
    high: 'text-red-400',
  },
  stress: {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-red-400',
  },
  corruption: {
    low: 'text-zinc-400',
    medium: 'text-purple-400',
    high: 'text-fuchsia-400',
  },
  devotion: {
    low: 'text-zinc-400',
    medium: 'text-amber-400',
    high: 'text-yellow-400',
  },
};

export const CARRIAGE_ICONS: Partial<Record<string, string>> = {
  ['POOLS']: 'P',
  ['ATRIUM']: 'A',
  ['VEIL']: 'V',
  ['CONFESSIONAL']: 'C',
  ['ARCHIVE']: 'R',
  ['MUSE_THEATRE']: 'M',
  ['SCALES_CONSERVATORY']: 'S',
  ['GARDEN']: 'G',
  ['NURSERY']: 'N',
  ['ALTAR']: 'T',
  ['CAULDRON']: 'X',
  ['SILENT_SALON']: 'I',
  ['ORACLE_WHISPER']: 'O',
  ['NEGATIVE_GALLERY']: 'E',
  ['ESCHER_STAIRS']: 'H',
  ['MIRROR_HALL']: 'L',
  ['TIME_INFIRMARY']: 'F',
  ['DISSOLUTION_CHAMBER']: 'D',
  ['FLESH_HIVE']: 'B',
  ['INVERTED_TREE']: 'Y',
  ['SYMBIOTIC_GALLERY']: 'W',
  ['VOID_WINDOW']: 'Z',
  ['ENTROPY_CLOCK']: 'K',
};

// ============================================
// 等级样式
// ============================================

export const RANK_STYLES: Record<string, { color: string; icon: string; name: string }> = {
  obsidian: { color: 'text-purple-400', icon: 'IV', name: '黑曜' },
  gold: { color: 'text-yellow-400', icon: 'III', name: '金' },
  silver: { color: 'text-gray-300', icon: 'II', name: '银' },
  copper: { color: 'text-orange-400', icon: 'I', name: '铜' },
  unranked: { color: 'text-zinc-500', icon: '0', name: '无' },
};

// ============================================
// IS-SHEX 人格构型样式
// 构型是对多个分数组合的"速记描述"，不是类别、更不是诊断（personality.md §3.4）
// ============================================

/** 八分构型样式与速记名（§3.4.1） */
export const OCTANT_STYLES: Record<string, { color: string; name: string }> = {
  PPP: { color: 'bg-emerald-900/50 text-emerald-400', name: '建设型引领者' },
  PPN: { color: 'bg-amber-900/50 text-amber-400', name: '策略型竞争者' },
  PNP: { color: 'bg-blue-900/50 text-blue-400', name: '守护型维系者' },
  PNN: { color: 'bg-slate-900/50 text-slate-400', name: '审慎型独行者' },
  NPP: { color: 'bg-cyan-900/50 text-cyan-400', name: '热忱型探索者' },
  NPN: { color: 'bg-orange-900/50 text-orange-400', name: '冲动型挑战者' },
  NNP: { color: 'bg-teal-900/50 text-teal-400', name: '敏感型照护者' },
  NNN: { color: 'bg-violet-900/50 text-violet-400', name: '疏离型防御者' },
};

/** 子维度签名样式与名称（§3.4.2） */
export const SIGNATURE_STYLES: Record<string, { color: string; name: string }> = {
  benevolent_strategist: { color: 'bg-violet-900/50 text-violet-400', name: '仁慈的策略者' },
  vulnerable_superiority: { color: 'bg-rose-900/50 text-rose-400', name: '易受伤的优越感' },
  chaotic_innovator: { color: 'bg-orange-900/50 text-orange-400', name: '混乱的创新者' },
  calm_executor: { color: 'bg-slate-900/50 text-slate-400', name: '冷静的执行者' },
  needed_helper: { color: 'bg-pink-900/50 text-pink-400', name: '需要被需要的助人者' },
  rule_enforcer: { color: 'bg-yellow-900/50 text-yellow-400', name: '规则的执法者' },
  steady_caregiver: { color: 'bg-emerald-900/50 text-emerald-400', name: '稳健的照护者' },
  quiet_principled: { color: 'bg-cyan-900/50 text-cyan-400', name: '沉静的原则者' },
};

// 人格状态样式
export const PERSONALITY_STATE_STYLES: Record<string, { color: string; name: string }> = {
  typical: { color: 'text-emerald-400', name: '常态范围' },
  stretched: { color: 'text-cyan-400', name: '拉伸' },
  atypical: { color: 'text-orange-400', name: '非典型' },
  extreme: { color: 'text-red-400', name: '极端偏离' },
};

// ============================================
// 属性条样式
// ============================================

export const STAT_BAR_COLORS: Record<string, string> = {
  sanity: 'bg-blue-500',
  obedience: 'bg-purple-500',
  lust: 'bg-red-500',
  corruption: 'bg-orange-500',
  devotion: 'bg-amber-500',
  stress: 'bg-yellow-500',
  hunger: 'bg-amber-600',
  fatigue: 'bg-blue-600',
  hygiene: 'bg-cyan-600',
};

// ============================================
// 时间倍速选项
// ============================================

export const TIME_SCALE_OPTIONS = [
  { value: 1, label: '1x', description: '正常速度 (1秒=1分钟)' },
  { value: 5, label: '5x', description: '快进 (1秒=5分钟)' },
  { value: 10, label: '10x', description: '极速 (1秒=10分钟)' },
] as const;

// ============================================
// 排序选项
// ============================================

export const MAIDEN_SORT_OPTIONS = [
  { value: 'name', label: '名字' },
  { value: 'sanity', label: '理智↑' },
  { value: 'sanity_desc', label: '理智↓' },
  { value: 'status', label: '状态数' },
  { value: 'rank', label: '等级' },
] as const;

// ============================================
// 状态过滤选项
// ============================================

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'critical', label: '危险' },
  { value: 'pregnant', label: '怀孕' },
  { value: 'broken', label: '崩溃' },
  { value: 'sleeping', label: '睡眠' },
  { value: 'devoted', label: '虔诚' },
] as const;

// ============================================
// 日志过滤选项
// ============================================

export const LOG_FILTER_OPTIONS: { value: LogType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'narrative', label: '叙事' },
  { value: 'thought', label: '心声' },
  { value: 'player', label: '指令' },
  { value: 'system', label: '系统' },
  { value: 'abyss', label: '深渊' },
  { value: 'grace', label: '神恩' },
  { value: 'ritual', label: '仪式' },
  { value: 'movement', label: '移动' },
  { value: 'social', label: '社交' },
];

// ============================================
// 地图视图模式
// ============================================

export const MAP_VIEW_MODES = [
  { mode: 'all' as const, label: '全部' },
  { mode: 'sanctuary' as const, label: '圣所' },
  { mode: 'abyss' as const, label: '深渊' },
  { mode: 'occupied' as const, label: '有人' },
];
