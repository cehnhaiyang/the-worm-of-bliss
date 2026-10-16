
// ============================================
// AI 文本生成服务 (Groq / Agent2API)
// ============================================

import { Maiden, SystemState, AIResponse, CarriageType, MemoryNode, RawInsertion, ChainRejection, generateId } from '../../../meta';
import {
  responseSchemaDesc,
  memoryChainSchemaDesc,
  deaconessGenesisSchemaDesc,
  tamperMemorySchemaDesc,
  memoryDeepeningSchemaDesc,
  GLOBAL_JSON_CONSTRAINTS
} from './schema';
import * as Builder from './builder';
import { TAMPER_PERMISSIONS } from '../../../constants';
import { maidenSystem } from '../../systems';

// ============================================
// 配置常量
// ============================================

const GROQ_API_KEY = "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Agent2API 服务商 (本地代理, 3065端口)
const AGENT2API_KEY = "sk-a2a-f345da9360a116c54801e02675eb0c37";
const AGENT2API_URL = "http://localhost:3065/v1/chat/completions";

// 归属于 Agent2API 的模型标识集合
const AGENT2API_MODELS = new Set([
  "cn:glm-5.2",
  "global:glm-5.2",
  "global:step-5-preview",
  "cn:step-5-preview",
  "GLM-5.3-Flash",
  "glm-5.3",
]);

// 可用模型列表，值即请求中直接使用的模型 id
export const AVAILABLE_TEXT_MODELS = {
  QWEN: "qwen/qwen3-32b",
  LLAMA_MAVERICK: "meta-llama/llama-4-maverick-17b-128e-instruct",
  LLAMA_3_3_70B: "llama-3.3-70b-versatile",
  GROQ_COMPOUND: "groq/compound",
  // Agent2API 模型
  GLM_5_2_CN: "cn:glm-5.2",
  GLM_5_2_GLOBAL: "global:glm-5.2",
  STEP_5_PREVIEW_GLOBAL: "global:step-5-preview",
  STEP_5_PREVIEW_CN: "cn:step-5-preview",
  GLM_5_3_FLASH: "GLM-5.3-Flash",
  GLM_5_3: "glm-5.3",
} as const;

export class TextService {
  private apiKey: string;
  private currentModel: string;

  constructor(apiKey?: string) {
    // 优先使用构造函数传入的 key，否则使用硬编码的 key
    this.apiKey = GROQ_API_KEY;
    // 默认使用 glm-5.3 (Agent2API)
    this.currentModel = AVAILABLE_TEXT_MODELS.GLM_5_3;
  }

  // ============================================
  // 模型管理
  // ============================================

  public setModel(model: string) {
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
   * 根据当前模型自动路由到对应服务商
   * - AGENT2API_MODELS 中的模型 → 本地 3065 端口
   * - 其余模型 → Groq
   */
  private async callAPI(
    systemPrompt: string,
    userContent: string,
    schemaDescription: string,
    temperature: number = 0.7
  ): Promise<any> {

    // 注入全局约束与 JSON Schema 要求
    const enhancedSystemPrompt = `${systemPrompt}

${GLOBAL_JSON_CONSTRAINTS}

IMPORTANT: You must strictly output valid JSON matching the following structure:
${schemaDescription}`;

    // 路由决策
    const isAgent2 = AGENT2API_MODELS.has(this.currentModel);
    const endpoint = isAgent2 ? AGENT2API_URL : GROQ_URL;
    const authKey = isAgent2 ? AGENT2API_KEY : this.apiKey;
    const provider = isAgent2 ? "Agent2API" : "Groq";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authKey}`,
          "Content-Type": "application/json"
        },
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
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error(`${provider} returned empty content`);
      }

      // 部分模型忽略 response_format 设置，返回 ```json ... ``` 包裹
      // 统一剥离后再解析，保证鲁棒性
      const sanitized = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      return JSON.parse(sanitized);

    } catch (error) {
      console.error(`[TextService] ${provider} Call Failed (Model: ${this.currentModel}):`, error);
      throw error;
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
      return result as AIResponse;
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

      const raw = Array.isArray(data.nodes) ? data.nodes : [];
      return maidenSystem.memory.buildInitialChain(raw, gameTimePassed);

    } catch (error) {
      console.error("Memory Generation Error:", error);
      return [];
    }
  }

  /**
   * 深度挖掘记忆：AI 自主挑选锚点并插入更细的中间记忆。
   * 锚点是否合法由 MaidenMemory 判定，被拒绝的插叙原样回报给调用方。
   */
  async deepenMemories(
    maiden: Maiden,
    gameTimePassed: number
  ): Promise<{ chain: MemoryNode[]; rejections: ChainRejection[] }> {
    try {
      const prompt = Builder.buildMemoryDeepeningPrompt(maiden);

      const data = await this.callAPI(
        "You are a psychoanalytic AI engine.",
        prompt,
        memoryDeepeningSchemaDesc,
        0.7
      );

      const raw = Array.isArray(data.insertions) ? data.insertions : [];
      const insertions: RawInsertion[] = raw.map((insertion: any) => ({
        insertAfterNodeId: String(insertion?.insertAfterNodeId ?? ''),
        nodes: Array.isArray(insertion?.newNodes) ? insertion.newNodes : [],
      }));

      return maidenSystem.memory.insertInputs(maiden.memoryChain, insertions, gameTimePassed);

    } catch (error) {
      console.error("Deepen Memory Error:", error);
      return { chain: maiden.memoryChain, rejections: [] };
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

      if (typeof data?.subjectiveNarrative !== 'string' || !data.subjectiveNarrative.trim()) {
        console.error("Memory Tamper Error: 模型未返回可用的叙事内容");
        return null;
      }

      return {
        narrative: data.subjectiveNarrative,
        selfOpinion: typeof data.selfOpinion === 'string' ? data.selfOpinion : '',
      };
    } catch (error) {
      console.error("Memory Tamper Error:", error);
      return null;
    }
  }

  /**
   * 生成执事创世纪。
   * 只产出节点；摘要由链路层的 summarizeGenesis 生成，此处不制造第二份摘要。
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

      const raw = Array.isArray(data.deadNodes) ? data.deadNodes : [];
      return raw.map((n: any, index: number) => ({
        id: generateId('node_dead'),
        title: typeof n?.title === 'string' && n.title.trim() ? n.title.trim() : `信条 ${index + 1}`,
        objectiveTruth: "这是我意志的直接投射，是新世界的基石。",
        subjectiveNarrative: typeof n?.content === 'string' && n.content.trim() ? n.content.trim() : '（内容缺失）',
        selfOpinion: "这是绝对的真理。",
        timeLabel: typeof n?.timeLabel === 'string' && n.timeLabel.trim() ? n.timeLabel.trim() : '重生时刻',
        depth: 1,
        type: 'dead_node',
        isImmutable: true,
        corruptionLevel: 0,
        category: 'master',
        timestamp: gameTimePassed,
      }));

    } catch (error) {
      console.error("Deaconess Genesis Error:", error);
      return [];
    }
  }
}
