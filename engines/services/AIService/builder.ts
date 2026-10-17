// ============================================
// AI 提示词构建器 (Optimized)
// 原则：提供上下文，定义目标，不限制方法
// ============================================

import { Maiden, SystemState, CarriageType, MemoryNode, ClothingState, AppearanceData, ItemDef, SIGNATURE_LABELS, PERSONALITY_STATE_LABELS } from '../../../meta';
import { ATTIRE_STATE_LABELS, CARRIAGE_TYPE_INFO, ABYSS_TYPES, TIME_CONFIG, WORLD_LORE } from '../../../constants';
import { maidenSystem, personalityView } from '../../systems';

// ============================================
// Helper Functions
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

// ============================================
// Context Serializers
// ============================================

function serializeLocation(carriageType?: CarriageType): string {
  if (!carriageType) return '[位置] 虚空';

  const info = CARRIAGE_TYPE_INFO.find(i => i.type === carriageType);
  const isAbyss = ABYSS_TYPES.includes(carriageType);

  return `
[当前位置]
区域: ${isAbyss ? '深渊 (ABYSS)' : '圣所 (SANCTUARY)'}
车厢: ${info?.nameCN || carriageType}
氛围: ${info?.description || ''}
环境效应: ${info?.functions.join(', ') || '无'}
${isAbyss ? '[警告] 深渊区域：现实法则扭曲，恐惧与依赖被放大' : ''}
`.trim();
}

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

  const FACET_LABELS: Record<string, string> = {
    sincerity: '真诚', fairness: '公平', greedAvoidance: '避贪', modesty: '谦虚',
    fearfulness: '恐惧', anxiety: '焦虑', dependence: '依赖', sentimentality: '感伤',
    socialSelfEsteem: '社交自尊', socialBoldness: '社交大胆', sociability: '社交性', liveliness: '活力',
    forgivingness: '宽恕', gentleness: '温和', flexibility: '灵活', patience: '耐心',
    organization: '组织', diligence: '勤奋', perfectionism: '完美', prudence: '审慎',
    aestheticAppreciation: '审美', inquisitiveness: '好奇', creativity: '创造', unconventionality: '非传统',
    altruism: '利他',
  };

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

// ============================================
// 1. 叙事生成 Prompt
// ============================================

export function buildSystemPrompt(
  playerAction: string,
  maiden: Maiden,
  systemState: SystemState,
  carriageType?: CarriageType,
): string {
  return `
${WORLD_LORE}

${serializeSystem(systemState)}

${serializeLocation(carriageType)}

${serializeMaiden(maiden)}

你是成人游戏"至乐之蠕虫"的叙事引擎。

我对${maiden.name}进行了“${playerAction}”的行为。

[你的任务]
1. 叙写${maiden.name}的反应
2. 判定该行为对${maiden.name}状态的影响（理智、服从、欲望、压力等）
3. 呈现${maiden.name}的内心独白
`.trim();
}

// ============================================
// 2. 记忆生成 Prompt
// ============================================

export function buildMemoryGenerationPrompt(
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

// ============================================
// 3. 记忆深潜/扩充 Prompt (New)
// ============================================

export function buildMemoryDeepeningPrompt(
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

// ============================================
// 4. 记忆篡改 Prompt
// ============================================

export function buildTamperMemoryPrompt(
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

// ============================================
// 5. 执事创世纪 Prompt
// ============================================

export function buildDeaconessGenesisPrompt(maiden: Maiden): string {
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