import {
  AIResponse,
  CarriageType,
  ChainRejection,
  CharacterRank,
  CharacterStatus,
  Maiden,
  MemoryAction,
  MemoryNode,
  RANK_ORDER,
  RawDeadNode,
  RawInsertion,
  RawMemoryNode,
  SystemState,
} from '../../../meta';
import {
  responseSchemaDesc,
  memoryChainSchemaDesc,
  deaconessGenesisSchemaDesc,
  tamperMemorySchemaDesc,
  memoryDeepeningSchemaDesc,
  GLOBAL_JSON_CONSTRAINTS,
  NARRATIVE_SOUND_EFFECTS,
  NARRATIVE_STATUSES,
} from './schema';
import * as Builder from './builder';
import { TAMPER_PERMISSIONS } from '../../../constants';
import { maidenSystem } from '../../systems';

const GROQ_API_KEY = "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const AGENT2API_KEY = "sk-a2a-f345da9360a116c54801e02675eb0c37";
const AGENT2API_URL = "http://localhost:3065/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * 模型 → 服务商的路由表。
 *
 * 唯一权威：`AVAILABLE_TEXT_MODELS` 的取值必须在这里出现，反过来这里也不许
 * 出现表外的模型。v1 把二者写成两份清单（一份 options 对象 + 一个
 * `AGENT2API_MODELS` 集合），于是新增模型时只要漏改一处，请求就会被发到
 * 不支持它的服务商——表现为 404/鉴权失败，而代码里看不出任何不一致。
 * 启动时由 `assertModelRoutingComplete` 把这条不变量钉死。
 */
const MODEL_PROVIDERS = {
  groq: {
    url: GROQ_URL,
    apiKey: GROQ_API_KEY,
    label: "Groq",
    models: [
      "qwen/qwen3-32b",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
      "llama-3.3-70b-versatile",
      "groq/compound",
    ],
  },
  agent2api: {
    url: AGENT2API_URL,
    apiKey: AGENT2API_KEY,
    label: "Agent2API",
    models: [
      "cn:glm-5.2",
      "global:glm-5.2",
      "global:step-5-preview",
      "cn:step-5-preview",
      "GLM-5.3-Flash",
      "glm-5.3",
    ],
  },
} as const;

type ProviderId = keyof typeof MODEL_PROVIDERS;

/** 可用模型列表，值即请求中直接使用的模型 id */
export const AVAILABLE_TEXT_MODELS = {
  QWEN: MODEL_PROVIDERS.groq.models[0],
  LLAMA_MAVERICK: MODEL_PROVIDERS.groq.models[1],
  LLAMA_3_3_70B: MODEL_PROVIDERS.groq.models[2],
  GROQ_COMPOUND: MODEL_PROVIDERS.groq.models[3],
  GLM_5_2_CN: MODEL_PROVIDERS.agent2api.models[0],
  GLM_5_2_GLOBAL: MODEL_PROVIDERS.agent2api.models[1],
  STEP_5_PREVIEW_GLOBAL: MODEL_PROVIDERS.agent2api.models[2],
  STEP_5_PREVIEW_CN: MODEL_PROVIDERS.agent2api.models[3],
  GLM_5_3_FLASH: MODEL_PROVIDERS.agent2api.models[4],
  GLM_5_3: MODEL_PROVIDERS.agent2api.models[5],
} as const;

/**
 * 模型 → 服务商；查不到即表示路由表漏登记，调用方必须当错误处理而不是猜一个默认值。
 * 导出以便直接断言路由表的覆盖性，而不是靠 grep 源码比对两份清单。
 */
export function resolveProvider(model: string): ProviderId | null {
  for (const [id, provider] of Object.entries(MODEL_PROVIDERS) as [ProviderId, typeof MODEL_PROVIDERS[ProviderId]][]) {
    if ((provider.models as readonly string[]).includes(model)) return id;
  }
  return null;
}

/**
 * 路由表覆盖性断言：`AVAILABLE_TEXT_MODELS` 的每个取值都必须能解析出服务商。
 * 在模块加载时执行，让"两份清单不同步"在启动瞬间就暴露，而不是等某个模型被选中。
 */
function assertModelRoutingComplete(): void {
  const unregistered = Object.values(AVAILABLE_TEXT_MODELS).filter(m => resolveProvider(m) === null);
  if (unregistered.length > 0) {
    throw new Error(`[TextService] 模型未登记服务商: ${unregistered.join(', ')}`);
  }
}

assertModelRoutingComplete();

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

export class TextService {
  private currentModel: string;

  constructor() {
    // 默认使用 glm-5.3 (Agent2API)
    this.currentModel = AVAILABLE_TEXT_MODELS.GLM_5_3;
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
    const providerId = resolveProvider(this.currentModel);
    if (providerId === null) {
      throw new Error(`[TextService] 模型未登记服务商，拒绝请求: ${this.currentModel}`);
    }
    const providerConfig = MODEL_PROVIDERS[providerId];
    const provider = providerConfig.label;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
          max_tokens: 4096
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
        ? `请求超时 (${REQUEST_TIMEOUT_MS / 1000}s)`
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
    carriageType?: CarriageType,
  ): Promise<AIResponse> {
    const systemPrompt = Builder.buildSystemPrompt(playerInput, maiden, systemState, carriageType);

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
      const prompt = Builder.buildMemoryGenerationPrompt(maiden);

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
      const prompt = Builder.buildMemoryDeepeningPrompt(maiden);

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
      const prompt = Builder.buildTamperMemoryPrompt(maiden, node, directive, permissionDesc);

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
      const prompt = Builder.buildDeaconessGenesisPrompt(maiden);

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
