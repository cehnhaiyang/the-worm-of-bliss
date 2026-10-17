// ============================================================================
// 基础联合类型定义 (Base Union Types)
// ============================================================================

/**
 * 罩杯型号升序表（从平胸到巨乳）。
 *
 * 这是罩杯梯级的唯一真源：类型由它派生，生成与提示词都按它取序。
 * 曾有一份写死到 H 的副本，导致 I/J/K 永远生成不出来，而存档里却存在这些值。
 */
export const CUP_SIZES = ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const;

/** 罩杯型号（升序排列） */
export type CupSize = (typeof CUP_SIZES)[number];

/**
 * 衣物破损与污浊状态
 */
export type AttireState =
  | 'intact'       // 完好
  | 'torn'         // 破损
  | 'disheveled'   // 凌乱
  | 'wet'          // 湿透
  | 'dirty'        // 污浊
  | 'bloody'       // 血迹
  | 'transparent'; // 透明（如被水浸透）

/**
 * 角色着装层级
 */
export type DressLevel =
  | 'fully_dressed'     // 着装完整
  | 'partially_dressed' // 衣衫不整
  | 'underwear_only'    // 仅着内衣
  | 'naked';            // 全裸

/**
 * 角色阶级系统（按等级升序排列）
 */
export type CharacterRank =
  | 'unranked'  // 无等级
  | 'copper'    // 铜环
  | 'silver'    // 银环
  | 'gold'      // 金环
  | 'obsidian'; // 黑曜石（最高阶）

// 阶级排序常量，供比较运算使用
export const RANK_ORDER: Record<CharacterRank, number> = {
  unranked: 0,
  copper: 1,
  silver: 2,
  gold: 3,
  obsidian: 4,
} as const;

/**
 * 角色自发行为类型（按语义分组）
 */
export type SpontaneousAction =
  // 日常行为
  | 'daydream'          // 发呆/白日梦
  | 'stretch'           // 伸懒腰
  | 'sigh'              // 叹气
  | 'hum'               // 哼歌
  | 'pace'              // 踱步
  | 'fidget'            // 坐立不安
  // 情绪表达
  | 'cry_quietly'       // 默默流泪
  | 'laugh_nervously'   // 神经质地笑
  | 'tremble'           // 颤抖
  | 'stare_blankly'     // 发呆凝视
  | 'mutter'            // 喃喃自语
  // 社交相关
  | 'observe_others'    // 观察他人
  | 'avoid_eye_contact' // 回避目光
  | 'seek_attention'    // 寻求关注
  // 宗教/仪式
  | 'touch_collar'      // 触摸项圈
  | 'kneel_briefly'     // 短暂跪下
  | 'whisper_prayer'    // 低声祈祷
  // 自我安慰
  | 'hug_self'          // 抱紧自己
  | 'rock_back_forth'   // 前后摇晃
  | 'bite_lip';         // 咬嘴唇

// ============================================================================
// 状态机类型 (State Machine Types)
// ============================================================================

/**
 * 角色复合状态机
 */
export const CharacterStatus = {
  NORMAL: 'normal',
  PANICKED: 'panicked',
  INJURED: 'injured',
  BROKEN: 'broken',
  DISSOCIATED: 'dissociated',
  AROUSED: 'aroused',
  PREGNANT: 'pregnant',
  GESTATING: 'gestating',
  EUPHORIC: 'euphoric',
  DEVOTED: 'devoted',
  COMPLICIT: 'complicit',
  VOYEUR: 'voyeur',
  DEACONESS: 'deaconess',
  PERFORMING: 'performing',
  CONFESSING: 'confessing',
  ANCHORING: 'anchoring',
  SLEEPING: 'sleeping',
  EATING: 'eating',
  BATHING: 'bathing',
  WANDERING: 'wandering',
  CHATTING: 'chatting',
  OBSERVING: 'observing',
} as const;

export type CharacterStatus = (typeof CharacterStatus)[keyof typeof CharacterStatus];

/**
 * 活动类状态子集，用于窄化 CharacterStatus 的活动语义
 */
export type ActivityStatus = Extract<CharacterStatus,
  | 'performing' | 'confessing' | 'anchoring'
  | 'sleeping' | 'eating' | 'bathing'
  | 'wandering' | 'chatting' | 'observing'
>;

/**
 * 角色核心心境状态
 */
export const MoodState = {
  CONTENT: 'content',
  ANXIOUS: 'anxious',
  MELANCHOLY: 'melancholy',
  IRRITABLE: 'irritable',
  LUSTFUL: 'lustful',
  FEARFUL: 'fearful',
  EUPHORIC: 'euphoric',
  NUMB: 'numb',
} as const;

export type MoodState = (typeof MoodState)[keyof typeof MoodState];

/**
 * 人格状态档位：由「此刻状态相对个人基线的偏离」D² 划分（personality.md §4.3.1）。
 *
 * 刻意不使用临床词汇：偏离是描述，不是诊断。特质水平 θ 是静态量，
 * 不随压力"崩溃"，因此档位只能由状态偏离给出，不能由 θ 的绝对阈值给出。
 */
export type PersonalityState =
  | 'typical'    // 常态范围：D² 在第 80 分位内
  | 'stretched'  // 拉伸：80–95 分位，通常可由情境解释
  | 'atypical'   // 非典型：95–99 分位，明显偏离个人常态
  | 'extreme';   // 极端偏离：> 99 分位，少见，应关注情境与恢复

/**
 * 移动状态枚举
 */
export type MovementState =
  | 'idle'      // 静止状态
  | 'planning'  // 规划移动路径
  | 'moving'    // 正在移动
  | 'arriving'; // 即将到达

// ============================================================================
// 世界空间类型 (World Space Types)
// ============================================================================

/**
 * 车厢可声明的功能。
 *
 * 这是本模型里唯一保持**封闭**的集合：车厢的种类由数据（`CARRIAGE_TEMPLATES`）
 * 列举，可以随时增删；而功能是行为引擎真正依赖的稳定词表。引擎只查询功能，
 * 不认识任何具体车厢，因此新增车厢不需要改动 meta、引擎或 UI。
 *
 * 分两类：
 * - **行为许可**：对应一项少女能在此执行的活动，决定需求系统能否把车厢作为目的地；
 * - **语义角色**：不产生活动，仅作为行为决策的目的地标签（例如"想独处反省"→ `memory`）。
 */
export type CarriageFunction =
  // 行为许可
  | 'sleep'      // 睡眠
  | 'eat'        // 进食
  | 'bathe'      // 沐浴
  | 'pray'       // 祈祷/忏悔
  | 'socialize'  // 社交
  // 语义角色
  | 'rest'       // 疗愈休憩：能恢复理智、消解压力
  | 'leisure'    // 消遣享受：感官刺激丰富，适合高开放度者
  | 'memory'     // 记忆与过去：重塑或否定个人历史
  | 'ritual';    // 仪式献祭：神恩与献祭的发生地

/**
 * 需求词表。
 *
 * 与 `CarriageFunction` 成对：需求系统按需求产出优先级，行为决策再按需求查车厢。
 * 声明成封闭联合而不是 `string`，是为了让"加了需求却忘了登记它的车厢映射"变成
 * 编译错误——此前两处映射（能不能就地满足 / 去哪种车厢）各写一份，已经漂移过。
 */
export type NeedKind =
  | 'sleep'      // 疲劳
  | 'eat'        // 饥饿
  | 'bathe'      // 清洁
  | 'pray'       // 压力（虔诚者）
  | 'hide'       // 压力（怯懦者）
  | 'relax'      // 压力（其余）
  | 'indulge'    // 欲望（放纵者）
  | 'confess'    // 欲望（高诚实者）
  | 'submit'     // 欲望（顺从者）
  | 'socialize'  // 社交
  | 'solitude'   // 独处
  | 'worship'    // 虔诚
  | 'rest';      // 孕期疲劳

/**
 * 全局透视观测模式
 */
export type ViewMode =
  | 'all'       // 全知视角
  | 'sanctuary' // 仅圣所视角
  | 'abyss'     // 仅深渊视角
  | 'occupied'; // 占用/焦点视角

// ============================================================================
// 叙事与记忆类型 (Narrative & Memory Types)
// ============================================================================

/**
 * 记忆溯源分类
 */
export type MemoryCategory =
  | 'childhood'  // 童年回忆
  | 'family'     // 家庭记忆
  | 'friendship' // 友谊过往
  | 'romance'    // 浪漫关系
  | 'trauma'     // 创伤体验
  | 'train'      // 列车生活
  | 'master'     // 关于主人的记忆
  | 'abyss';     // 深渊映射

/**
 * 妊娠阶段
 */
export type PregnancyStage =
  | 'none'        // 未孕
  | 'conception'  // 受孕期
  | 'early'       // 孕早期
  | 'middle'      // 孕中期
  | 'late'        // 孕晚期
  | 'labor';      // 临产/分娩期

/**
 * 人际关系映射图谱
 */
export const RelationType = {
  STRANGER: 'stranger',
  ACQUAINTANCE: 'acquaintance',
  FRIEND: 'friend',
  CLOSE_FRIEND: 'close_friend',
  RIVAL: 'rival',
  ENEMY: 'enemy',
  PROTECTOR: 'protector',
  DEPENDENT: 'dependent',
  ACCOMPLICE: 'accomplice',
} as const;

export type RelationType = (typeof RelationType)[keyof typeof RelationType];

/**
 * 水仙协议执行阶段
 */
export type NarcissusStage =
  | 'none'      // 尚未触发
  | 'choice'    // 面临抉择
  | 'departed'  // 已离去
  | 'fading'    // 意识消散中
  | 'invitation'// 收到邀请
  | 'rejected'  // 拒绝邀请
  | 'returned'; // 协议回归

// ============================================================================
// 事件与系统类型 (Event & System Types)
// ============================================================================

/**
 * 全局事件触发类型
 */
export type EventType =
  | 'nightmare'        // 触发噩梦
  | 'breakdown'        // 精神崩溃
  | 'awakening'        // 意识觉醒
  | 'confession'       // 发起告解
  | 'friendship'       // 建立羁绊
  | 'betrayal'         // 关系背叛
  | 'comfort'          // 互相慰藉
  | 'conflict'         // 物理/心理冲突
  | 'abyss_vision'     // 凝视深渊视界
  | 'grace_miracle'    // 神恩降临
  | 'rank_ceremony'    // 阶级晋升仪式
  | 'pregnancy'        // 宣布受孕
  | 'birth'            // 新生降临
  | 'hub_anomaly'      // 枢纽发生异常
  | 'resonance'        // 灵能共鸣涌动
  | 'watcher_alert';   // 守望者警告

/**
 * 神恩赐福类型
 */
export const GraceType = {
  FOOD: 'food',             // 赐予食物
  SOLITUDE: 'solitude',     // 独处庇护
  GENTLE_TOUCH: 'gentle',   // 温柔触碰
  MEMORY_GLIMPSE: 'memory', // 记忆碎片闪回
  RANK_BOOST: 'rank',       // 阶级跃升
  REST: 'rest',             // 强制安息恢复
} as const;

export type GraceType = (typeof GraceType)[keyof typeof GraceType];

/**
 * 系统状态变更事件标识
 * @remarks 分为：属性临界 | 活动生命周期 | 社交生命周期 | 位置/周期变化
 */
export type ChangeType =
  // 属性临界
  | 'sanity_critical'   // 理智临界
  | 'sanity_recovered'  // 理智恢复
  | 'stress_high'       // 压力高企
  | 'stress_relieved'   // 压力释放
  | 'lust_high'         // 欲求高涨
  | 'lust_normal'       // 欲求平复
  | 'hunger_urgent'     // 极度饥饿
  | 'fatigue_exhausted' // 极度疲劳
  | 'hygiene_dirty'     // 严重污垢
  // 状态标签
  | 'status_added'      // 新增状态附加
  | 'status_removed'    // 状态移除
  // 活动生命周期
  | 'activity_started'  // 行为开始
  | 'activity_ended'    // 行为结束
  // 社交生命周期
  | 'social_started'    // 社交发起
  | 'social_ended'      // 社交中止
  // 位置/周期
  | 'location_changed'  // 区域位移
  | 'ovulation_start'   // 排卵期开始
  | 'ovulation_end';    // 排卵期结束

/**
 * 系统日志层级拓扑
 */
export type LogType =
  | 'player'    // 玩家指令
  | 'system'    // 系统通知
  | 'narrative' // AI 生成的叙事
  | 'thought'   // 角色心声
  | 'abyss'     // 深渊现象
  | 'grace'     // 神恩事件
  | 'ritual'    // 仪式相关
  | 'movement'  // 移动记录
  | 'social';   // 社交记录

// ============================================
// 社交与互动类型 (Social & Interaction Types)
// ============================================

/**
 * 社交行为向量类型
 */
export type SocialInteractionType =
  | 'chat'    // 闲谈
  | 'comfort' // 安抚
  | 'gossip'  // 秘闻/八卦
  | 'argue'   // 争执
  | 'bully'   // 霸凌
  | 'seduce'  // 魅惑
  | 'confide' // 吐露心声
  | 'pray'    // 共祈
  | 'huddle'  // 依偎
  | 'avoid';  // 规避

// ============================================
// 媒体与音频类型 (Media & Audio Types)
// ============================================

/**
 * 音频轨道分类
 */
export const SoundCategory = {
  AMBIENT: 'ambient', // 环境底噪
  UI: 'ui',           // 界面交互音效
  EVENT: 'event',     // 事件触发音效
  VOICE: 'voice',     // 角色语音
  MUSIC: 'music',     // 背景音乐
} as const;

export type SoundCategory = (typeof SoundCategory)[keyof typeof SoundCategory];

/**
 * 抽象音频生成器工厂契约
 */
export type SoundGeneratorFn = (
  ctx: AudioContext,
  dest: AudioNode,
  reverbDest?: AudioNode,
) => {
  stop: () => void;
  nodes: AudioNode[];
};

// ============================================================================
// 命名系统类型 (Naming System Types)
// ============================================================================

/**
 * 命名语源系分类
 */
export type NameOrigin =
  // 东亚语系
  | 'chinese' | 'japanese' | 'korean' | 'vietnamese'
  // 英语文化圈
  | 'english' | 'american' | 'irish' | 'scottish'
  // 罗曼语族
  | 'french' | 'spanish' | 'italian' | 'portuguese' | 'romanian'
  // 日耳曼/北欧语族
  | 'german' | 'dutch' | 'swedish' | 'norwegian' | 'danish' | 'finnish' | 'icelandic'
  // 斯拉夫/东欧语族
  | 'russian' | 'ukrainian' | 'polish' | 'czech' | 'hungarian' | 'serbian' | 'croatian' | 'bulgarian'
  // 中东/地中海语族
  | 'greek' | 'turkish' | 'arabic' | 'persian' | 'hebrew'
  // 南亚/东南亚语族
  | 'indian' | 'thai' | 'indonesian' | 'filipino'
  // 拉美语族
  | 'brazilian' | 'mexican' | 'argentinian'
  // 非洲语族
  | 'nigerian' | 'ethiopian' | 'egyptian' | 'southafrican'
  // 神话语源
  | 'mythical';

/** 情境类型 */
export type SituationType =
  | 'threat'      // 威胁情境：人身安全受威胁、社会排斥
  | 'opportunity' // 机会/奖赏情境：晋升机会、新项目、社交场合
  | 'task'        // 任务/规则情境：工作任务、考试、合同签订
  | 'intimate'    // 亲密情境：亲密关系、家庭互动
  | 'competition' // 竞争情境：资源争夺、地位竞争
  | 'ambiguous';  // 模糊情境：不确定性高的新环境