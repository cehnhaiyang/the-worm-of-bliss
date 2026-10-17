
// ============================================
// 存档服务 - 游戏状态持久化
// 完全重构为 Electron 原生架构，所有文件切分与读写均在主进程 (main.js) 中完成
// ============================================

import {
  Carriage,
  Maiden,
  SystemState,
  MasterState,
  GameLog,
  SaveData,
  GameStats,
  SaveSlotInfo
} from '../../meta';
import { normalizePersonality } from '../systems';

// ============================================
// 存档配置
// ============================================

const SAVE_CONFIG = {
  maxSlots: 5,
  maxLogEntries: 100,
  maxMemoriesPerMaiden: 5,
  currentVersion: '0.3.0',
  compatibleVersions: ['0.3.0'],
};

// ============================================
// Electron API 声明
// ============================================

declare global {
  interface Window {
    electronAPI?: {
      saveGame: (slot: number | 'auto', saveData: SaveData) => Promise<{ success: boolean; error?: string }>;
      loadGame: (slot: number | 'auto') => Promise<{ success: boolean; data?: SaveData; error?: string }>;
      deleteSave: (slot: number | 'auto') => Promise<{ success: boolean; error?: string }>;
      getSaveSlots: () => Promise<{ success: boolean; slots?: SaveSlotInfo[]; error?: string }>;
      appendLog: (path: string, line: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.electronAPI?.saveGame;

// ============================================
// 存档服务类
// ============================================

class PersistenceService {
  private stats: GameStats = this.createDefaultStats();
  private playStartTime: number = Date.now();
  private sessionStartTime: number = Date.now();

  // ============================================
  // 创建默认统计
  // ============================================

  private createDefaultStats(): GameStats {
    return {
      totalGraceGiven: 0,
      totalAbyssExposures: 0,
      totalBirths: 0,
      totalDeaths: 0,
      hubShuffleCount: 0,
      commandsIssued: 0,
      daysElapsed: 0,
      totalPregnancies: 0,
      totalRankPromotions: 0,
      totalBreakdowns: 0,
      totalRelationshipsFormed: 0,
      totalMemoriesCorrupted: 0,
      longestPlaySession: 0,
    };
  }

  // ============================================
  // 保存游戏 (通过高级 IPC 委托给主进程处理分片写入)
  // ============================================

  async save(
    slot: number | 'auto',
    systemState: SystemState,
    masterState: MasterState,
    carriages: Map<string, Carriage>,
    maidens: Map<string, Maiden>,
    logs: GameLog[],
    slotName?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!isElectron()) {
      return { success: false, error: '非 Electron 环境不支持存档功能' };
    }

    try {
      const currentSession = Date.now() - this.sessionStartTime;
      if (currentSession > this.stats.longestPlaySession) {
        this.stats.longestPlaySession = currentSession;
      }

      // 组装传给主进程的完整数据结构
      const saveData: SaveData = {
        version: SAVE_CONFIG.currentVersion,
        timestamp: Date.now(),
        playTime: Date.now() - this.playStartTime,
        slotName: slotName || (slot === 'auto' ? '自动存档' : `存档 ${slot}`),
        stats: { ...this.stats },
        maidenCount: maidens.size,

        systemState,
        masterState,
        carriages: Array.from(carriages.entries()),
        maidens: Array.from(maidens.entries()),
        logs: logs.slice(-SAVE_CONFIG.maxLogEntries),
      };

      const result = await window.electronAPI!.saveGame(slot, saveData);

      if (result.success) {
        console.log(`[PersistenceService] 存档已保存到主进程 (槽位 ${slot})`);
        await this.writeGameLog(`SAVE slot=${slot} completed.`);
      } else {
        console.error('[PersistenceService] 存档失败:', result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[PersistenceService] 存档异常:', error);
      return { success: false, error: errorMessage };
    }
  }

  // ============================================
  // 加载游戏 (从主进程获取重组后的分片数据)
  // ============================================

  async load(slot: number | 'auto'): Promise<{ data: SaveData | null; error?: string }> {
    if (!isElectron()) {
      return { data: null, error: '非 Electron 环境不支持读取功能' };
    }

    try {
      const result = await window.electronAPI!.loadGame(slot);

      if (!result.success || !result.data) {
        return { data: null, error: result.error || '存档不存在' };
      }

      const saveData = result.data;

      if (!this.isCompatible(saveData.version)) {
        return {
          data: null,
          error: `存档版本不兼容 (${saveData.version} vs ${SAVE_CONFIG.currentVersion})`
        };
      }

      if (!this.isWellFormed(saveData)) {
        return { data: null, error: '存档结构不符合当前格式（关键分片缺失或类型不符）' };
      }

      const normalizedData = this.normalizeSaveData(saveData);

      this.stats = { ...this.createDefaultStats(), ...normalizedData.stats };
      this.playStartTime = Date.now() - normalizedData.playTime;
      this.sessionStartTime = Date.now();

      console.log(`[PersistenceService] 从主进程加载成功 (槽位 ${slot})`);
      return { data: normalizedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[PersistenceService] 加载失败:', error);
      return { data: null, error: `加载失败: ${errorMessage}` };
    }
  }

  // ============================================
  // 读档规范化
  // ============================================

  /** 只补 `stats` 的缺省字段：版本门已挡住其他形状，这里不做迁移 */
  private normalizeSaveData(saveData: SaveData): SaveData {
    return {
      ...saveData,
      stats: { ...this.createDefaultStats(), ...(saveData.stats || {}) },
    };
  }

  /**
   * 读档的结构门：关键分片必须是数组/对象。
   *
   * 形状不符就当场拒绝，不放它进实体表：否则错误会退化成某处的 `undefined`，
   * 一路静默到很久以后才以玩法异常的形式浮出来。
   */
  private isWellFormed(saveData: SaveData): boolean {
    return Array.isArray(saveData.maidens)
      && Array.isArray(saveData.carriages)
      && Array.isArray(saveData.logs)
      && !!saveData.systemState
      && !!saveData.masterState;
  }

  // ============================================
  // 自动存档
  // ============================================

  async autoSave(
    systemState: SystemState,
    masterState: MasterState,
    carriages: Map<string, Carriage>,
    maidens: Map<string, Maiden>,
    logs: GameLog[]
  ): Promise<{ success: boolean; error?: string }> {
    return this.save('auto', systemState, masterState, carriages, maidens, logs, '自动存档');
  }

  // ============================================
  // 获取存档槽位信息 (委托主进程扫描文件夹)
  // ============================================

  async getSaveSlots(): Promise<SaveSlotInfo[]> {
    if (!isElectron()) return [];

    try {
      const result = await window.electronAPI!.getSaveSlots();
      return result.success && result.slots ? result.slots : [];
    } catch (error) {
      console.error('[PersistenceService] 获取存档列表失败:', error);
      return [];
    }
  }

  // ============================================
  // 删除存档
  // ============================================

  async deleteSave(slot: number | 'auto'): Promise<boolean> {
    if (!isElectron()) return false;

    try {
      const result = await window.electronAPI!.deleteSave(slot);
      if (result.success) {
        console.log(`[PersistenceService] 存档已删除: 槽位 ${slot}`);
      } else {
        console.error('[PersistenceService] 删除存档失败:', result.error);
      }
      return result.success;
    } catch (error) {
      console.error('[PersistenceService] 删除存档异常:', error);
      return false;
    }
  }

  // ============================================
  // 写入游戏日志
  // ============================================

  async writeGameLog(entry: string): Promise<void> {
    if (!isElectron()) return;
    const line = `[${new Date().toISOString()}] ${entry}`;
    await window.electronAPI!.appendLog(`logs/game.log`, line);
  }

  // ============================================
  // 统计更新
  // ============================================

  incrementStat(stat: keyof GameStats, amount: number = 1): void {
    if (typeof this.stats[stat] === 'number') {
      (this.stats[stat] as number) += amount;
    }
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = this.createDefaultStats();
    this.playStartTime = Date.now();
    this.sessionStartTime = Date.now();
  }

  // ============================================
  // 工具方法
  // ============================================

  private isCompatible(version: string): boolean {
    return SAVE_CONFIG.compatibleVersions.includes(version);
  }

  /**
   * 从存档还原实体表。
   *
   * 人格在这里统一规范化：`normalizePersonality` 负责把 v1 的 0–100 分量表
   * 换算为现行模型的 z 分，并丢弃全部派生副本（见该函数的说明）。
   */
  restoreMaps(saveData: SaveData): {
    carriages: Map<string, Carriage>;
    maidens: Map<string, Maiden>;
  } {
    const maidens = new Map<string, Maiden>();

    for (let index = 0; index < saveData.maidens.length; index++) {
      const entry = saveData.maidens[index] as unknown as [string, Maiden] | undefined;
      const [id, maiden] = Array.isArray(entry) ? entry : [];
      if (typeof id !== 'string' || !maiden) {
        throw new Error(`存档中的少女记录形状非法（第 ${index} 条）`);
      }
      // 传入实体自己的游戏时钟：老存档没有 dynamics，lastDriftTime 需由它播种，
      // 否则会被当成"从时间原点起就没漂移过"
      maidens.set(id, { ...maiden, isshex: normalizePersonality(maiden.isshex, maiden.lastUpdateTime) });
    }

    return {
      carriages: new Map(saveData.carriages),
      maidens,
    };
  }

  static formatPlayTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟`;
    } else {
      return `${seconds}秒`;
    }
  }
}

export const persistenceService = new PersistenceService();
