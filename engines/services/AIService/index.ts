
// ============================================
// AI 服务入口 (Facade)
// 组合 TextService 和 ImageService
// ============================================

import { Maiden, SystemState, AIResponse, CarriageType, MemoryNode, ChainRejection } from '../../../meta';
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
    carriageType?: CarriageType,
  ): Promise<AIResponse> {
    return this.textService.generateNarrative(playerInput, maiden, systemState, carriageType);
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
   */
  async deepenMemories(
    maiden: Maiden,
    gameTimePassed: number
  ): Promise<{ chain: MemoryNode[]; rejections: ChainRejection[] }> {
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
   * 生成角色立绘（异步）
   * 使用 Pollinations API (gen.pollinations.ai)
   * 返回: { url: string, model: string }
   */
  async generateCharacterImage(maiden: Maiden, carriageType?: CarriageType): Promise<{ url: string; model: string }> {
    return this.imageService.generateCharacterImage(maiden, carriageType);
  }

  /**
   * 获取 Pollinations URL (同步/回退)
   */
  getCharacterImageUrl(maiden: Maiden, carriageType?: CarriageType): string {
    return this.imageService.getPollinationsUrl(maiden, carriageType);
  }

  getThumbnailUrl(maiden: Maiden): string {
    return this.imageService.getThumbnailUrl(maiden);
  }

  getSceneImageUrl(carriageType: CarriageType, description?: string): string {
    return this.imageService.getSceneImageUrl(carriageType, description);
  }

  /**
   * 判断是否应更新立绘
   * @param before 之前的状态
   * @param after 当前的状态
   * @param carriageType 当前车厢类型
   */
  shouldUpdatePortrait(before: Maiden, after: Maiden, carriageType?: CarriageType): boolean {
    return this.imageService.shouldUpdatePortrait(before, after, carriageType);
  }

  /**
   * 获取视觉状态哈希值 (UI优化用)
   * 结合 ID 和 视觉快照，用于前端去重请求
   */
  getPortraitHash(maiden: Maiden, carriageType?: CarriageType): string {
    return `${maiden.id}_${this.imageService.generatePortraitHash(maiden, carriageType)}`;
  }
}

// 单例导出
export const aiService = new AIService();
