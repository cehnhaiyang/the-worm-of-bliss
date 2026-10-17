// ============================================
// AI 文字服务
// 职责：模型路由 → 提示词组装 → 叙事/记忆生成
// 信任边界：模型返回的 JSON 一律先经收敛函数，越界取值不写进实体
// ============================================

import {
    AIResponse,
    AppearanceData,
    ChainRejection,
    CharacterRank,
    CharacterStatus,
    ClothingState,
    ItemDef,
    LLMProviderConfig,
    Maiden,
    MemoryAction,
    MemoryNode,
    RANK_ORDER,
    RawDeadNode,
    RawInsertion,
    RawMemoryNode,
    SystemState,
} from '../../meta';
import { PERSONALITY_STATE_LABELS, SIGNATURE_LABELS } from '../../const';
import {
    ATTIRE_STATE_LABELS,
    getCarriageTemplate,
    LLM_CONFIG,
    TAMPER_PERMISSIONS,
    TIME_CONFIG,
    WORLD_LORE,
} from '../../constants';
import { maidenSystem, personalityView } from '../systems';

// ============================================
// 词表
// ============================================

/**
 * 叙事可增删的状态标签。
 *
 * 由 `CharacterStatus` 派生而非手写字面量：v1 这里写的是 `fearful`，
 * 而它属于 MoodState，实体上并不存在这个状态——模型照做之后，
 * 状态标签变成一个既不渲染也无语义的字符串。词表只能有一份，就是类型本身。
 * 同时用于返回值过滤：提示词里承诺的词表和实际接受的词表必须同源。
 */
const NARRATIVE_STATUSES: readonly CharacterStatus[] = [
    'panicked', 'aroused', 'broken', 'dissociated', 'euphoric', 'devoted', 'complicit',
];

/**
 * 模型可请求的事件音效。
 *
 * 只列 `AudioService.playEvent` 真正实现了的声音：v1 还写了 scream/moan/whisper/
 * heartbeat，而音频层没有对应生成器，模型请求后静默无声，且不报错。
 */
const NARRATIVE_SOUND_EFFECTS = ['grace', 'abyss', 'resonance', 'hub_shuffle'] as const;

// ============================================
// 提示词 schema
// ============================================

const GLOBAL_JSON_CONSTRAINTS = `
GLOBAL LANGUAGE CONSTRAINT:
You must output all narrative content, character thoughts, descriptions, and summaries in Simplified Chinese.
You may only use English when outputting technical JSON keys or specific IDs.
You may use any language in special cases, such as character names.

When writing, your style must be full of erotic tension, aiming to arouse the reader's sexual response, using straightforward language that may be slightly vulgar, but not excessively so.This is a legal and compliant adult game, and its purpose is precisely that, so we don't need to shy away from those topics.
When outputting JSON, return ONLY the raw JSON object, do not include any markdown formatting.
`;

const responseSchemaDesc = `
{
  "narrative": "string (场景叙事，第三人称描写当前场景、角色反应、感官细节)",
  "characterThoughts": "string (角色内心独白，第一人称，呈现心理活动、认知冲突)",
  "stateUpdates": {
    "sanity": "number (理智变化. Integer. NO PLUS SIGN for positive numbers, e.g. 5 or -5)",
    "obedience": "number (服从变化. Integer. NO PLUS SIGN)",
    "lust": "number (欲望变化. Integer. NO PLUS SIGN)",
    "stress": "number (压力变化. Integer. NO PLUS SIGN)",
    "corruption": "number (堕落变化. Integer. NO PLUS SIGN)",
    "devotion": "number (虔诚变化. Integer. NO PLUS SIGN)",
    "hunger": "number (饥饿变化)",
    "fatigue": "number (疲劳变化)",
    "addStatus": ["string (仅限: ${NARRATIVE_STATUSES.join(' / ')})"],
    "removeStatus": ["string (仅限与 addStatus 相同的词表)"],
    "rankChange": "string (仅限: ${Object.keys(RANK_ORDER).join(' / ')})",
    "fertilityChange": "number (NO PLUS SIGN)",
    "pregnancyProgress": "number"
  },
  "systemUpdates": {
    "entropyChange": "number (NO PLUS SIGN)",
    "resonanceChange": "number (NO PLUS SIGN)",
    "triggerGrace": "boolean",
    "hubReconfiguration": "boolean"
  },
  "memoryUpdate": {
    "action": "string (implant | tamper)",
    "content": "string (记忆内容)",
    "targetMemoryId": "string (仅 tamper 使用：要重写的节点 ID)"
  },
  "narcissusAction": "string (initiate | leave | stay | return)",
  "abyssEffect": "string (深渊效应描述)",
  "soundEffect": "string (仅限: ${NARRATIVE_SOUND_EFFECTS.join(' / ')})"
}
`;

const memoryChainSchemaDesc = `
{
  "nodes": [
    {
      "title": "string (记忆标题)",
      "objectiveTruth": "string (客观事实：真实经过，含时间地点人物，不受情感影响)",
      "subjectiveNarrative": "string (主观记忆：她如何记住这件事，可能被扭曲或美化)",
      "selfOpinion": "string (自我看法：对这段记忆的评价及影响)",
      "timeLabel": "string (格式：Age.Month.Day.Hour.Minute.Second)",
      "category": "string (childhood | family | friendship | romance | trauma | train | master | abyss)"
    }
  ]
}
`;

const memoryDeepeningSchemaDesc = `
{
  "insertions": [
    {
      "insertAfterNodeId": "string (现有记忆节点的 ID，必须是链上真实存在的 ID)",
      "newNodes": [
        {
          "title": "string",
          "objectiveTruth": "string",
          "subjectiveNarrative": "string",
          "selfOpinion": "string",
          "timeLabel": "string",
          "category": "string"
        }
      ]
    }
  ]
}
`;

const tamperMemorySchemaDesc = `
{
  "subjectiveNarrative": "string (被篡改后的主观记忆叙事)",
  "selfOpinion": "string (基于篡改记忆产生的新的自我看法)"
}
`;

const deaconessGenesisSchemaDesc = `
{
  "genesisNarrative": "string (蜕变叙事：描述从猎物到信徒的转变)",
  "deadNodes": [
    {
      "title": "string",
      "content": "string (节点内容：顿悟、誓言或信条)",
      "timeLabel": "string"
    }
  ]
}
`;

// ============================================
// 模型路由
// ============================================

/**
 * 模型 → 服务商配置。
 *
 * 查不到即表示配置漏登记，调用方必须当错误处理而不是猜一个默认值：
 * 猜出来的服务商会把请求发到不支持的端点，404 被上层当成网络问题。
 * 导出以便直接断言覆盖性，而不是靠 grep 源码比对清单。
 */
export function resolveProvider(model: string): LLMProviderConfig | null {
    return LLM_CONFIG.PROVIDERS.find(p => p.models.includes(model)) ?? null;
}

/**
 * 配置自检：在模块加载时把三类不一致钉死在启动瞬间。
 *
 * 默认模型不在任何服务商名下、同一模型登记在两个服务商下（路由取决于遍历顺序，
 * 即"靠时序侥幸正确"）、服务商 id 重复（设置面板的 optgroup key 会撞车）——
 * 这些都只在配置改动时发生，晚到运行时才暴露就表现为某个模型随机失效。
 */
function assertLLMConfig(): void {
    const ids = new Set<string>();
    const seen = new Map<string, string>();

    for (const provider of LLM_CONFIG.PROVIDERS) {
        if (ids.has(provider.id)) {
            throw new Error(`[TextService] 服务商 id 重复: ${provider.id}`);
        }
        ids.add(provider.id);

        for (const model of provider.models) {
            const owner = seen.get(model);
            if (owner !== undefined) {
                throw new Error(`[TextService] 模型重复登记: ${model}（${owner} 与 ${provider.id}）`);
            }
            seen.set(model, provider.id);
        }
    }

    if (!seen.has(LLM_CONFIG.DEFAULT_MODEL)) {
        throw new Error(`[TextService] 默认模型未登记服务商: ${LLM_CONFIG.DEFAULT_MODEL}`);
    }
}

assertLLMConfig();

// ============================================
// 信任边界：模型返回值收敛
// ============================================

/** 信任边界：把模型返回的顶层数组字段收敛成数组，缺失或类型不符时给出空数组 */
function asRawArray<T>(data: unknown, key: string): T[] {
    const value = (data as Record<string, unknown> | null)?.[key];
    return Array.isArray(value) ? value as T[] : [];
}

/** 信任边界：把模型返回的数值字段收敛成有限数，其余一律视为 0 */
function asDelta(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** 信任边界：只保留词表内的取值，越界项丢弃而不是写进实体 */
function asStatusList(value: unknown): CharacterStatus[] {
    if (!Array.isArray(value)) return [];
    return value.filter((s): s is CharacterStatus => NARRATIVE_STATUSES.includes(s as CharacterStatus));
}

function asRank(value: unknown): CharacterRank | undefined {
    return typeof value === 'string' && value in RANK_ORDER ? value as CharacterRank : undefined;
}

const NARRATIVE_ACTIONS = ['initiate', 'leave', 'stay', 'return'] as const;

/**
 * 模型可请求的记忆操作。
 *
 * 只列调用方真正实现的两种：`MemoryAction` 里的 `restore` 属于审计记录的动作，
 * 没有对应的 AI 处理分支，放进接受列表只会让"模型要求了但没人做"变成静默。
 */
const MEMORY_ACTIONS: readonly MemoryAction[] = ['implant', 'tamper'];

/** 信任边界：只接受实现了生成器的音效名 */
function asSoundEffect(value: unknown): string | undefined {
    return typeof value === 'string' && (NARRATIVE_SOUND_EFFECTS as readonly string[]).includes(value) ? value : undefined;
}

function asNonEmptyText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value : undefined;
}

/**
 * 叙事响应的收敛。
 *
 * 模型输出位于信任边界之外：`stateUpdates` 可能是 null、`addStatus` 可能是字符串、
 * `rankChange` 可能是词表外的任意值。v1 直接 `result as AIResponse` 交给调用方，
 * 于是 `updates.addStatus.forEach` 会在 React 的 setState 更新函数里抛错，
 * 而越界的 rank 会被原样写进实体。收敛只在这里做一次，调用方拿到的一定是合法形状。
 * 导出以便直接断言"非法形状不流入实体"，而不是靠读源码相信它做了收敛。
 */
export function normalizeNarrativeResponse(data: unknown): AIResponse {
    const root = (data ?? {}) as Record<string, unknown>;
    const updates = (root.stateUpdates ?? {}) as Record<string, unknown>;
    const system = (root.systemUpdates ?? {}) as Record<string, unknown>;
    const memory = (root.memoryUpdate ?? {}) as Record<string, unknown>;

    const action = memory.action;
    const memoryAction = MEMORY_ACTIONS.includes(action as MemoryAction) ? action as MemoryAction : undefined;
    const narcissusAction = (NARRATIVE_ACTIONS as readonly string[]).includes(root.narcissusAction as string)
        ? root.narcissusAction as AIResponse['narcissusAction']
        : undefined;

    return {
        narrative: asNonEmptyText(root.narrative) ?? '（模型未返回叙事内容）',
        characterThoughts: asNonEmptyText(root.characterThoughts) ?? '...',
        stateUpdates: {
            sanity: asDelta(updates.sanity),
            obedience: asDelta(updates.obedience),
            lust: asDelta(updates.lust),
            stress: asDelta(updates.stress),
            corruption: asDelta(updates.corruption),
            devotion: asDelta(updates.devotion),
            hunger: asDelta(updates.hunger),
            fatigue: asDelta(updates.fatigue),
            addStatus: asStatusList(updates.addStatus),
            removeStatus: asStatusList(updates.removeStatus),
            rankChange: asRank(updates.rankChange),
            fertilityChange: asDelta(updates.fertilityChange),
            pregnancyProgress: asDelta(updates.pregnancyProgress),
        },
        systemUpdates: {
            entropyChange: asDelta(system.entropyChange),
            resonanceChange: asDelta(system.resonanceChange),
            triggerGrace: system.triggerGrace === true,
            hubReconfiguration: system.hubReconfiguration === true,
        },
        memoryUpdate: memoryAction
            ? {
                action: memoryAction,
                content: asNonEmptyText(memory.content),
                targetMemoryId: asNonEmptyText(memory.targetMemoryId),
            }
            : undefined,
        narcissusAction,
        abyssEffect: asNonEmptyText(root.abyssEffect),
        soundEffect: asSoundEffect(root.soundEffect),
    };
}

// ============================================
// 提示词组装
// 原则：提供上下文，定义目标，不限制方法
// ============================================

/**
 * 将服装状态序列化为文本描述。
 *
 * 层级与 `Attire` 面板保持一致：模型被告知"最后一个记忆节点必须反映她登车时的着装"，
 * 因此凡是界面会显示的衣物都必须出现在这里。v1 漏了手套、内衬与内裤，
 * 又把胸衣统一写成"内衣"——模型据此写出的登车瞬间与卡片上看到的着装对不上。
 */
function serializeClothingState(clothing: ClothingState): string {
    const parts: string[] = [];
    const { outerwear, undergarment, intimate, accessories, state } = clothing;

    const name = (item: { type: ItemDef; color?: ItemDef }) =>
        item.type.id === 'none' ? '' : `${item.color?.name ?? ''}${item.type.name}`;

    // 外层
    const outer = [outerwear.top, outerwear.bottom, outerwear.shoes, outerwear.gloves]
        .map(name)
        .filter(Boolean);
    parts.push(...outer);

    // 内层
    const inner = [undergarment.stockings, undergarment.undershirt, intimate.bra, intimate.panties]
        .map(name)
        .filter(Boolean);
    if (inner.length > 0) parts.push(`(内着: ${inner.join('、')})`);

    // 饰品
    const accs = accessories.filter(a => a.isVisible !== false).map(a => a.type.name);
    if (accs.length > 0) parts.push(`饰品: ${accs.join('、')}`);

    // 状态
    if (state !== 'intact') parts.push(`[状态: ${ATTIRE_STATE_LABELS[state]}]`);

    return parts.length > 0 ? parts.join('，') : '裸露';
}

function serializeAppearance(app: AppearanceData): string {
    const parts: string[] = [];
    parts.push(`${app.hair.color.name}${app.hair.length.name}${app.hair.style.name}`);
    parts.push(`${app.eyes.color.name}${app.eyes.shape.name}`);
    parts.push(`${app.skin.tone.name}皮肤`);
    if (app.features.facialFeatures.length > 0) {
        parts.push(`特征: ${app.features.facialFeatures.map(f => f.name).join(', ')}`);
    }
    return parts.join('，');
}

function serializeLocation(carriageTemplateId?: string): string {
    if (!carriageTemplateId) return '[位置] 虚空';

    const template = getCarriageTemplate(carriageTemplateId);
    const isAbyss = template?.category === 'abyss';

    return `
[当前位置]
区域: ${isAbyss ? '深渊 (ABYSS)' : '圣所 (SANCTUARY)'}
车厢: ${template?.nameCN || carriageTemplateId}
氛围: ${template?.description || ''}
环境效应: ${template?.features.join(', ') || '无'}
${isAbyss ? '[警告] 深渊区域：现实法则扭曲，恐惧与依赖被放大' : ''}
`.trim();
}

/** 显著子维度的中文标签，仅用于提示词展示 */
const FACET_LABELS: Record<string, string> = {
    sincerity: '真诚', fairness: '公平', greedAvoidance: '避贪', modesty: '谦虚',
    fearfulness: '恐惧', anxiety: '焦虑', dependence: '依赖', sentimentality: '感伤',
    socialSelfEsteem: '社交自尊', socialBoldness: '社交大胆', sociability: '社交性', liveliness: '活力',
    forgivingness: '宽恕', gentleness: '温和', flexibility: '灵活', patience: '耐心',
    organization: '组织', diligence: '勤奋', perfectionism: '完美', prudence: '审慎',
    aestheticAppreciation: '审美', inquisitiveness: '好奇', creativity: '创造', unconventionality: '非传统',
    altruism: '利他',
};

/**
 * 将人格序列化为 persona 规格（personality.md §6.5）。
 *
 * 三条约束来自该节的"使用规则"：
 * 1. 用**子维度**决定具体怎么说话、怎么做事，而不是用维度分数；
 * 2. 只列出显著偏离的子维度（|z| ≥ 0.8），其余视为 0，避免把 25 项全塞进提示词；
 * 3. 不做临床诊断式叙述，也不输出风险等级（§7.2）。
 */
function serializePersonality(maiden: Maiden): string {
    const view = personalityView(maiden);
    const meta = view.meta;
    const domains = view.domains;

    const salient = (Object.keys(FACET_LABELS) as (keyof typeof FACET_LABELS)[])
        .map(key => ({ key, z: maiden.isshex.facets[key as keyof typeof maiden.isshex.facets] }))
        .filter(f => Math.abs(f.z) >= 0.8)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
        .map(f => `${FACET_LABELS[f.key]} ${f.z > 0 ? '+' : ''}${f.z.toFixed(1)}`);

    const domainLine = (['H', 'E', 'X', 'A', 'C', 'O'] as const)
        .map(k => `${k} ${domains[k] > 0 ? '+' : ''}${domains[k].toFixed(2)}`)
        .join(' | ');

    const signatures = view.signatures
        .filter(s => s.match >= 0.75)
        .map(s => SIGNATURE_LABELS[s.signature]);

    return `
[人格档案 IS-SHEX]
维度(z): ${domainLine}
显著子维度(|z|≥0.8): ${salient.join('、') || '无'}
元因子: α稳定 ${meta.alpha.toFixed(2)} | β可塑 ${meta.beta.toFixed(2)} | γ亲社会 ${meta.gamma.toFixed(2)}
构型(软隶属): ${view.topOctant.octant} ${(view.topOctant.membership * 100).toFixed(0)}%
子维度签名: ${signatures.join('、') || '无完全匹配'}
状态: ${PERSONALITY_STATE_LABELS[view.state]} (D²=${view.dynamics.deviationSquared.toFixed(2)})
背离负荷: ${view.dynamics.discrepancyLoad.toFixed(2)}
`.trim();
}

function serializeMaiden(maiden: Maiden): string {
    const { physical, appearance, clothing, attributes, physiology, profile } = maiden;

    const attire = serializeClothingState(clothing);

    return `
[目标角色: ${maiden.name}]
ID: ${maiden.id} | 年龄: ${maiden.age} | 等级: ${maiden.rank}
外貌: ${appearance.hair.color.name}发, ${appearance.eyes.color.name}瞳, ${physical.bodyType}体型
当前着装: ${attire}
状态标签: [${maiden.status.join(', ')}]

${serializePersonality(maiden)}

[详细侧写]
特质: ${profile.traits.join(', ')}
爱好: ${profile.hobbies.join(', ')}
厌恶: ${profile.dislikes.join(', ')}
应对机制: ${profile.copingMechanism}
${profile.fetish ? `潜在癖好: ${profile.fetish}` : ''}

[属性 (0-100)]
理智: ${attributes.sanity} | 压力: ${attributes.stress} | 欲望: ${attributes.lust}
服从: ${attributes.obedience} | 虔诚: ${attributes.devotion} | 堕落: ${attributes.corruption}
饥饿: ${attributes.hunger} | 疲劳: ${attributes.fatigue}

[生理]
周期: 第${physiology.cycleDay}天 ${physiology.isOvulating ? '【排卵期】' : ''}
孕周: ${physiology.pregnancy?.weekNumber ? `${physiology.pregnancy.weekNumber}周` : '无'}

[记忆索引]
${maidenSystem.memory.generateSummaryFromChain(maiden.memoryChain)}
近期记忆: ${maiden.memoryChain.slice(-3).map(n => n.title).join(' → ') || '无'}
`.trim();
}

function serializeSystem(state: SystemState): string {
    return `
[系统参数]
共振频率: ${state.resonanceFrequency}Hz ${state.resonanceFrequency < 20 ? '(极低频：高暗示性)' : ''}
熵值: ${state.entropyLevel}%
神恩池: ${state.gracePoolSize}
`.trim();
}

const TIME_FORMAT_GUIDE = `
[时间格式]
使用精确格式: "Age.Month.Day.Hour.Minute.Second"
- Age: 事件发生时的年龄 (如：7、14)
- Month: 1~12
- Day: 1~31（需要区分大月和小月）  
- Hour: 0~24
- Minute/Second: 0~60
示例: "16.05.20.14.30.00" = 16岁，5月20日，14:30:00
`;

function buildSystemPrompt(
    playerAction: string,
    maiden: Maiden,
    systemState: SystemState,
    carriageTemplateId?: string,
): string {
    return `
${WORLD_LORE}

${serializeSystem(systemState)}

${serializeLocation(carriageTemplateId)}

${serializeMaiden(maiden)}

你是成人游戏"至乐之蠕虫"的叙事引擎。

我对${maiden.name}进行了“${playerAction}”的行为。

[你的任务]
1. 叙写${maiden.name}的反应
2. 判定该行为对${maiden.name}状态的影响（理智、服从、欲望、压力等）
3. 呈现${maiden.name}的内心独白
`.trim();
}

function buildMemoryGenerationPrompt(
    maiden: Maiden
): string {
    const personality = serializePersonality(maiden);

    // 初始记忆链。
    // 登车时刻用"距今多少天"表达，而不是换算成日历日期：`arrivalTimestamp` 是游戏内时间，
    // 且登车发生在开局之前（值为负），交给 Date 渲染只会得到 1969 年的假日期。
    const daysOnTrain = Math.max(0, Math.floor(
        (maiden.lastUpdateTime - maiden.arrivalTimestamp) / TIME_CONFIG.MS_PER_DAY
    ));
    const initialAttire = serializeClothingState(maiden.initialClothing);
    const appearance = serializeAppearance(maiden.appearance);

    return `
[任务]
为"${maiden.name}"生成完整的人生记忆链（深度1：核心人生事件）。
从出生到登上"至乐之蠕虫"的那一刻。

[角色背景]
${personality}
背景特质: ${maiden.profile.traits.join(', ')}
当前年龄: ${maiden.age}

[登车档案 (Boarding Profile)]
登车时点: 距今约 ${daysOnTrain} 天前 (当时年龄: ${maiden.boardingAge})
初始外貌: ${appearance}
初始着装 (登车时): ${initialAttire}
(注意: 最后一个记忆节点必须反映她登车时的状态，包括上述着装。)

[创作指南]
- 最后一个节点必须是登上列车的瞬间，这将被标记为不可更改的死节点。
- 区分"客观事实"（发生了什么）和"主观记忆"（她如何记住）
- 生成"自我看法"：她现在怎么看这件事，认为它如何塑造了现在的她。需根据人格特质（如：敏感vs迟钝，反思vs逃避）来生成。
- 让她的人格特质影响她记忆事件的方式

${TIME_FORMAT_GUIDE}
`.trim();
}

function buildMemoryDeepeningPrompt(
    maiden: Maiden
): string {
    const personality = serializePersonality(maiden);

    // 序列化当前记忆链供 AI 分析
    const chainContext = maiden.memoryChain.map((node) => {
        return `[Node ID: ${node.id}]
    Title: ${node.title}
    Time: ${node.timeLabel}
    Depth: ${node.depth}
    Content: ${node.objectiveTruth.substring(0, 50)}...
    --------------------------------`;
    }).join('\n');

    return `
[任务]
分析"${maiden.name}"当前的记忆链，找出叙事空白、逻辑跳跃或值得深挖的情感点。
**自主决定**在哪些节点之间插入新的、更深层级（Depth + 1）的中间记忆节点。

[角色背景]
${personality}

[当前记忆链]
${chainContext}

[决策与创作指南]
1. **分析空白**：寻找时间跨度大、或情感转折突兀的相邻节点。
2. **生成插入**：决定在哪些节点之后（insertAfterNodeId）插入新节点。
3. **内容深化**：新节点应包含更细腻的感官细节、心理活动或被遗忘的小事。
4. **多样性**：你可以选择在多处插入，也可以集中在一处插入多个节点。
5. **一致性**：新生成节点的时间标签必须严格位于前后节点的时间之间。
6. **严禁接续**：链上最后一个节点是登上列车的瞬间，其之后不得再有任何记忆；不要以它为 anchor。

${TIME_FORMAT_GUIDE}
`.trim();
}

function buildTamperMemoryPrompt(
    maiden: Maiden,
    node: MemoryNode,
    directive: string,
    permissionDesc: string
): string {
    return `
[任务]
根据我的指令和当前权限限制，重写一段记忆的"主观叙事"部分，并更新她对该记忆的"自我看法"。

[权限级别限制]
${permissionDesc}
（你必须严格遵守此权限描述。如果我的指令超出了权限范围，请在权限允许的最大范围内进行扭曲，或者以某种方式让篡改变得不完美/容易识破。）

[目标记忆]
标题: ${node.title}
客观事实（不可更改）: "${node.objectiveTruth}"
当前主观记忆: "${node.subjectiveNarrative}"
当前自我看法: "${node.selfOpinion}"

[我的指令]
"${directive}"

[角色人格]
${serializePersonality(maiden)}

[创作指南]
- 扭曲她对事件的感知、情感或解读
- 不要改变客观事实，只改变她如何记住/感受
- 可以是心理层面的扭曲、服从化、或创伤化
- 同时也必须生成新的"自我看法" (selfOpinion)，反映被篡改后的认知失调或新的顺从逻辑。她现在如何合理化这段被扭曲的记忆？
`.trim();
}

function buildDeaconessGenesisPrompt(maiden: Maiden): string {
    return `
[任务]
角色"${maiden.name}"已完成水仙协议，作为"女执事"回归。
生成她的蜕变叙事和锚定忠诚的"死节点"记忆。

[背景]
她曾离开列车，回到现实世界。
她发现那个世界已经"褪色"——食物如蜡，色彩灰暗，声音沉闷。
在精神崩溃的边缘，她主动祈求回归。
现在，她不再是猎物，而是信徒。

[角色档案]
${serializePersonality(maiden)}
原等级: ${maiden.rank} → 新等级: OBSIDIAN

[创作指南]
- 蜕变叙事应反映超越性的、狂信式的接纳
- 死节点是她新存在的基础公理（如"我意识到外面的太阳是冷的那一刻"）
- 这些记忆不可篡改，锚定她对我的绝对忠诚
`.trim();
}

// ============================================
// 文字服务类
// ============================================

export class TextService {
    private currentModel: string;

    constructor() {
        this.currentModel = LLM_CONFIG.DEFAULT_MODEL;
    }

    // ============================================
    // 模型管理
    // ============================================

    public setModel(model: string) {
        if (resolveProvider(model) === null) {
            console.error(`[TextService] 未知模型，切换被拒绝: ${model}`);
            return;
        }
        this.currentModel = model;
        console.log(`[TextService] Model switched to: ${this.currentModel}`);
    }

    public getModel(): string {
        return this.currentModel;
    }

    // ============================================
    // 核心：调用 API (自动路由服务商)
    // ============================================

    /**
     * 按当前模型路由到服务商并发起请求。
     *
     * 两个失败都必须抛出而不是降级：路由表里没有这个模型时，任何"猜一个服务商"
     * 的兜底都会把请求发到错误端点，产生的 404 会被上层当成网络问题；
     * 超时同理——没有超时上限时，一次挂起的请求会让调用方永久停在
     * "处理中"，游戏再也接受不了输入。
     */
    private async callAPI(
        systemPrompt: string,
        userContent: string,
        schemaDescription: string,
        temperature: number = 0.7
    ): Promise<unknown> {

        // 注入全局约束与 JSON Schema 要求
        const enhancedSystemPrompt = `${systemPrompt}

${GLOBAL_JSON_CONSTRAINTS}

IMPORTANT: You must strictly output valid JSON matching the following structure:
${schemaDescription}`;

        // 路由决策
        const providerConfig = resolveProvider(this.currentModel);
        if (providerConfig === null) {
            throw new Error(`[TextService] 模型未登记服务商，拒绝请求: ${this.currentModel}`);
        }
        const provider = providerConfig.id;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), LLM_CONFIG.REQUEST_TIMEOUT_MS);

        try {
            const response = await fetch(providerConfig.url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${providerConfig.apiKey}`,
                    "Content-Type": "application/json"
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: this.currentModel,
                    messages: [
                        { role: "system", content: enhancedSystemPrompt },
                        { role: "user", content: userContent }
                    ],
                    temperature: temperature,
                    response_format: { type: "json_object" },
                    max_tokens: LLM_CONFIG.MAX_TOKENS
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`${provider} API Error (${response.status}): ${errText}`);
            }

            const data = await response.json();
            const content = data?.choices?.[0]?.message?.content;

            if (typeof content !== 'string' || !content.trim()) {
                throw new Error(`${provider} returned empty content`);
            }

            // 部分模型忽略 response_format 设置，返回 ```json ... ``` 包裹
            // 统一剥离后再解析，保证鲁棒性
            const sanitized = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
            return JSON.parse(sanitized);

        } catch (error) {
            const reason = controller.signal.aborted
                ? `请求超时 (${LLM_CONFIG.REQUEST_TIMEOUT_MS / 1000}s)`
                : error;
            console.error(`[TextService] ${provider} Call Failed (Model: ${this.currentModel}):`, reason);
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    // ============================================
    // 公共 API 方法
    // ============================================

    // 生成叙事
    async generateNarrative(
        playerInput: string,
        maiden: Maiden,
        systemState: SystemState,
        carriageTemplateId?: string,
    ): Promise<AIResponse> {
        const systemPrompt = buildSystemPrompt(playerInput, maiden, systemState, carriageTemplateId);

        try {
            const result = await this.callAPI(
                systemPrompt,
                playerInput, // 用户输入作为 User Message
                responseSchemaDesc,
                0.8 // 叙事需要一定的创造性
            );
            return normalizeNarrativeResponse(result);
        } catch (error) {
            console.error("Narrative Generation Error:", error);
            // 返回一个保底的空响应，防止游戏崩溃
            return {
                narrative: "（系统连接不稳定，意识传输中断...）",
                characterThoughts: "...",
                stateUpdates: {}
            };
        }
    }

    /**
     * 生成初始记忆链。
     * 在这里就把 AI 返回值收敛成领域节点，越界数据不再流入 store。
     */
    async generateMemories(maiden: Maiden, gameTimePassed: number): Promise<MemoryNode[]> {
        try {
            const prompt = buildMemoryGenerationPrompt(maiden);

            const data = await this.callAPI(
                "You are a memory architect engine.",
                prompt,
                memoryChainSchemaDesc,
                0.7
            );

            const raw = asRawArray<RawMemoryNode>(data, 'nodes');
            return maidenSystem.memory.buildInitialChain(raw, gameTimePassed);

        } catch (error) {
            console.error("Memory Generation Error:", error);
            return [];
        }
    }

    /**
     * 深度挖掘记忆：AI 自主挑选锚点并插入更细的中间记忆。
     * 锚点是否合法由 MaidenMemory 判定，被拒绝的插叙原样回报给调用方。
     *
     * 返回 `null` 表示请求失败，调用方不得写回、也不得当作"没有可挖的内容"。
     * v1 在失败时返回原链加空拒绝列表，与"模型认为无空白可填"完全同形，
     * 于是网络故障会被 UI 显示成"这段过往已无从深挖"——失败被当成了结论。
     */
    async deepenMemories(
        maiden: Maiden,
        gameTimePassed: number
    ): Promise<{ chain: MemoryNode[]; rejections: ChainRejection[] } | null> {
        try {
            const prompt = buildMemoryDeepeningPrompt(maiden);

            const data = await this.callAPI(
                "You are a psychoanalytic AI engine.",
                prompt,
                memoryDeepeningSchemaDesc,
                0.7
            );

            const raw = asRawArray<Record<string, unknown>>(data, 'insertions');
            const insertions: RawInsertion[] = raw.map(insertion => ({
                insertAfterNodeId: typeof insertion?.insertAfterNodeId === 'string' ? insertion.insertAfterNodeId : '',
                nodes: Array.isArray(insertion?.newNodes) ? insertion.newNodes as RawMemoryNode[] : [],
            }));

            return maidenSystem.memory.insertInputs(maiden.memoryChain, insertions, gameTimePassed);

        } catch (error) {
            console.error("Deepen Memory Error:", error);
            return null;
        }
    }

    /**
     * 记忆篡改。
     * prompt 构建也纳入 try：链上节点字段异常时返回 null，而不是抛出未处理的 rejection。
     * 返回 null 表示失败，调用方不得写回。
     */
    async tamperMemory(
        maiden: Maiden,
        node: MemoryNode,
        directive: string
    ): Promise<{ narrative: string; selfOpinion: string } | null> {
        try {
            const permission = TAMPER_PERMISSIONS[maiden.rank];
            const permissionDesc = `${permission.description} (能力: ${permission.capability})`;
            const prompt = buildTamperMemoryPrompt(maiden, node, directive, permissionDesc);

            const data = await this.callAPI(
                "You are a memory corruption interface.",
                prompt,
                tamperMemorySchemaDesc,
                0.9 // 高温度以获得扭曲效果
            );

            const narrative = asNonEmptyText((data as Record<string, unknown> | null)?.subjectiveNarrative);
            if (!narrative) {
                console.error("Memory Tamper Error: 模型未返回可用的叙事内容");
                return null;
            }

            const selfOpinion = (data as Record<string, unknown>).selfOpinion;

            return {
                narrative,
                selfOpinion: typeof selfOpinion === 'string' ? selfOpinion : '',
            };
        } catch (error) {
            console.error("Memory Tamper Error:", error);
            return null;
        }
    }

    /**
     * 生成执事创世纪。
     * 只产出节点；摘要由链路层从链派生，此处不制造第二份摘要。
     */
    async generateDeaconessGenesis(maiden: Maiden, gameTimePassed: number): Promise<MemoryNode[]> {
        try {
            const prompt = buildDeaconessGenesisPrompt(maiden);

            const data = await this.callAPI(
                "You are a religious indoctrination engine.",
                prompt,
                deaconessGenesisSchemaDesc,
                0.8
            );

            return maidenSystem.memory.buildGenesisChain(
                asRawArray<RawDeadNode>(data, 'deadNodes'),
                gameTimePassed
            );

        } catch (error) {
            console.error("Deaconess Genesis Error:", error);
            return [];
        }
    }
}

/**
 * 服务单例。
 *
 * 文字生成与图像生成是两个独立服务：需要叙事的一方依赖 TextService，
 * 需要立绘的一方依赖 ImageService。不再有同时持有两者的聚合服务——
 * 那种聚合会让只画立绘的组件也被迫加载模型路由表与提示词 schema。
 */
export const textService = new TextService();
