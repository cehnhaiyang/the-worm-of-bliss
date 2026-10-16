
// ============================================
// AI 文本生成服务 (Groq / Agent2API)
// ============================================

import { Maiden, SystemState, AIResponse, CarriageType, MemoryNode, MemoryCategory, generateId } from '../../../meta';
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

// ============================================
// 配置常量
// ============================================

// 全局唯一并发锁 — 所有触发点（focusMaiden / Memory.tsx）共享同一状态
// 防止同一少女在不同路径下同时触发多次记忆生成
export const memoryGeneratingIds = new Set<string>();

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
  "GLM-5.2",
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
  GLM_5_2: "GLM-5.2",
} as const;

export class TextService {
  private apiKey: string;
  private currentModel: string;

  constructor(apiKey?: string) {
    // 优先使用构造函数传入的 key，否则使用硬编码的 key
    this.apiKey = GROQ_API_KEY;
    // 默认使用 GLM-5.2 (Agent2API)
    this.currentModel = AVAILABLE_TEXT_MODELS.GLM_5_2;
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
   * 记忆生成 (仅限初始 Depth=1)
   */
  async generateMemories(
    maiden: Maiden,
    targetDepth: number
  ): Promise<MemoryNode[]> {
    if (targetDepth !== 1) return [];

    const prompt = Builder.buildMemoryGenerationPrompt(maiden, 1);

    try {
      const data = await this.callAPI(
        "You are a memory architect engine.",
        prompt,
        memoryChainSchemaDesc,
        0.7
      );

      const nodes: MemoryNode[] = (data.nodes || []).map((node: any) => ({
        id: generateId('mem_node'),
        title: node.title,
        objectiveTruth: node.objectiveTruth,
        subjectiveNarrative: node.subjectiveNarrative,
        selfOpinion: node.selfOpinion || "...",
        timeLabel: node.timeLabel,
        depth: 1,
        type: 'original',
        corruptionLevel: 0,
        category: node.category,
        timestamp: Date.now(),
      }));

      // 最后一个节点设为死节点（登车）
      if (nodes.length > 0) {
        const lastNode = nodes[nodes.length - 1];
        lastNode.type = 'dead_node';
        lastNode.isImmutable = true;
        lastNode.category = 'train';
      }

      return nodes;

    } catch (error) {
      console.error("Memory Generation Error:", error);
      return [];
    }
  }

  /**
   * 深度挖掘记忆
   */
  async deepenMemories(maiden: Maiden): Promise<{ insertAfterId: string; nodes: MemoryNode[] }[]> {
    const prompt = Builder.buildMemoryDeepeningPrompt(maiden);

    try {
      const data = await this.callAPI(
        "You are a psychoanalytic AI engine.",
        prompt,
        memoryDeepeningSchemaDesc,
        0.7
      );

      const result = (data.insertions || []).map((insertion: any) => ({
        insertAfterId: insertion.insertAfterNodeId,
        nodes: (insertion.newNodes || []).map((node: any) => ({
          id: generateId('mem_node_deep'),
          title: node.title,
          objectiveTruth: node.objectiveTruth,
          subjectiveNarrative: node.subjectiveNarrative,
          selfOpinion: node.selfOpinion,
          timeLabel: node.timeLabel,
          depth: node.depth,
          type: 'original',
          corruptionLevel: 0,
          category: node.category,
          timestamp: Date.now(),
        }))
      }));

      return result;

    } catch (error) {
      console.error("Deepen Memory Error:", error);
      return [];
    }
  }

  // 篡改记忆
  async tamperMemory(
    maiden: Maiden,
    node: MemoryNode,
    directive: string
  ): Promise<{ narrative: string; selfOpinion: string } | null> {
    const permission = TAMPER_PERMISSIONS[maiden.rank];
    const permissionDesc = `${permission.description} (能力: ${permission.capability})`;
    const prompt = Builder.buildTamperMemoryPrompt(maiden, node, directive, permissionDesc);

    try {
      const data = await this.callAPI(
        "You are a memory corruption interface.",
        prompt,
        tamperMemorySchemaDesc,
        0.9 // 高温度以获得扭曲效果
      );

      return {
        narrative: data.subjectiveNarrative,
        selfOpinion: data.selfOpinion
      };
    } catch (error) {
      console.error("Memory Tamper Error:", error);
      return null;
    }
  }

  // 生成执事创世纪
  async generateDeaconessGenesis(maiden: Maiden): Promise<{ summary: string; nodes: MemoryNode[] }> {
    const prompt = Builder.buildDeaconessGenesisPrompt(maiden);

    try {
      const data = await this.callAPI(
        "You are a religious indoctrination engine.",
        prompt,
        deaconessGenesisSchemaDesc,
        0.8
      );

      const nodes = (data.deadNodes || []).map((n: any) => ({
        id: generateId('node_dead'),
        title: n.title,
        objectiveTruth: "这是我意志的直接投射，是新世界的基石。",
        subjectiveNarrative: n.content,
        selfOpinion: "这是绝对的真理。",
        timeLabel: n.timeLabel,
        depth: 1,
        type: 'dead_node',
        isImmutable: true,
        corruptionLevel: 0,
        category: 'master',
        timestamp: Date.now(),
      }));

      return { summary: data.genesisNarrative, nodes };

    } catch (error) {
      console.error("Deaconess Genesis Error:", error);
      return { summary: "神经重构失败...", nodes: [] };
    }
  }
}
