
// ============================================
// AI 服务入口 (Facade)
// 组合 TextService 和 ImageService
// ============================================

import { Maiden, SystemState, AIResponse, MemoryNode, ChainRejection } from '../../../meta';
import { TextService } from './TextService';
import { ImageService } from './ImageService';

class AIService {
  private textService: TextService;
  private imageService: ImageService;

  constructor() {
    this.textService = new TextService();
    this.imageService = new ImageService();
  }

  // ============================================
  // 文本生成 (Delegate to TextService)
  // ============================================

  /** 设置文本生成模型 */
  setTextModel(model: string) {
    this.textService.setModel(model);
  }

  /** 获取当前文本生成模型 */
  getTextModel(): string {
    return this.textService.getModel();
  }

  /** 设置图像生成模型 */
  setImageModel(model: string) {
    this.imageService.setModel(model);
  }

  /** 获取当前图像生成模型 */
  getImageModel(): string {
    return this.imageService.getModel();
  }

  async generateNarrative(
    playerInput: string,
    maiden: Maiden,
    systemState: SystemState,
    carriageTemplateId?: string,
  ): Promise<AIResponse> {
    return this.textService.generateNarrative(playerInput, maiden, systemState, carriageTemplateId);
  }

  /**
   * 生成初始记忆链。空数组表示生成失败，调用方不得写入。
   */
  async generateMemories(maiden: Maiden, gameTimePassed: number): Promise<MemoryNode[]> {
    return this.textService.generateMemories(maiden, gameTimePassed);
  }

  /**
   * 记忆深潜/扩充：AI 自主决定插入点。
   * 返回完整新链与被拒绝的插叙；链的合法性由 MaidenMemory 判定，调用方不再自己拼链。
   * `null` 表示请求失败，与"没有可挖的内容"（空拒绝列表 + 原链）严格区分。
   */
  async deepenMemories(
    maiden: Maiden,
    gameTimePassed: number
  ): Promise<{ chain: MemoryNode[]; rejections: ChainRejection[] } | null> {
    return this.textService.deepenMemories(maiden, gameTimePassed);
  }

  async tamperMemory(
    maiden: Maiden,
    node: MemoryNode,
    directive: string
  ): Promise<{ narrative: string; selfOpinion: string } | null> {
    return this.textService.tamperMemory(maiden, node, directive);
  }

  /** 发起创世纪，返回写入链的节点；摘要由调用方从链派生 */
  async generateDeaconessGenesis(maiden: Maiden, gameTimePassed: number): Promise<MemoryNode[]> {
    return this.textService.generateDeaconessGenesis(maiden, gameTimePassed);
  }

  // ============================================
  // 图像生成 (Delegate to ImageService)
  // ============================================

  /**
   * 生成角色立绘（返回图片 URL 与所用模型；URL 由调用方交给浏览器加载）
   */
  generateCharacterImage(maiden: Maiden, carriageTemplateId?: string): { url: string; model: string } {
    return this.imageService.generateCharacterImage(maiden, carriageTemplateId);
  }

  /**
   * 获取 Pollinations URL (同步/回退)
   */
  getCharacterImageUrl(maiden: Maiden, carriageTemplateId?: string): string {
    return this.imageService.getPollinationsUrl(maiden, carriageTemplateId);
  }

  getThumbnailUrl(maiden: Maiden): string {
    return this.imageService.getThumbnailUrl(maiden);
  }

  getSceneImageUrl(carriageTemplateId: string, description?: string): string {
    return this.imageService.getSceneImageUrl(carriageTemplateId, description);
  }

  /**
   * 获取视觉状态哈希值 (UI优化用)
   * 结合 ID 和 视觉快照，用于前端去重请求
   */
  getPortraitHash(maiden: Maiden, carriageTemplateId?: string): string {
    return `${maiden.id}_${this.imageService.generatePortraitHash(maiden, carriageTemplateId)}`;
  }
}

// 单例导出
export const aiService = new AIService();
