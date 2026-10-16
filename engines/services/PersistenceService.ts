
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
  SaveSlotInfo,
  SubsystemsData,
  NarcissusData,
  NarcissusState
} from '../../meta';
import { maidenSystem, normalizePersonality } from '../systems';

// ============================================
// 存档配置
// ============================================

const SAVE_CONFIG = {
  maxSlots: 5,
  maxLogEntries: 100,
  maxMemoriesPerMaiden: 5,
  currentVersion: '0.2.1',
  compatibleVersions: ['0.2.0', '0.2.1'],
};

// ============================================
// Electron API 声明
// ============================================

declare global {
  interface Window {
    electronAPI?: {
      saveGame: (slot: number | 'auto', saveData: any) => Promise<{ success: boolean; error?: string }>;
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
      const saveData = {
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
        subsystems: {
          // 关系与妊娠状态嵌入 Maiden 对象；serialize 在此仅提取并二次归档，
          // 主要恢复路径为 maidens 字段还原（deserialize 为空操作）。
          relationships: maidenSystem.relationship.serialize(maidens),
          pregnancy: maidenSystem.pregnancy.serialize(maidens),
          narcissus: maidenSystem.narcissus.serialize(maidens),
          events: maidenSystem.event.serialize(),
        }
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

      const migratedData = this.migrateData(saveData);

      this.stats = { ...this.createDefaultStats(), ...migratedData.stats };
      this.playStartTime = Date.now() - migratedData.playTime;
      this.sessionStartTime = Date.now();

      // 子系统反序列化将在 restoreSubsystems 方法中处理

      console.log(`[PersistenceService] 从主进程加载成功 (槽位 ${slot})`);
      return { data: migratedData };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[PersistenceService] 加载失败:', error);
      return { data: null, error: `加载失败: ${errorMessage}` };
    }
  }

  // ============================================
  // 数据版本迁移
  // ============================================

  private migrateData(saveData: SaveData): SaveData {
    const migrated = { ...saveData };

    migrated.stats = {
      ...this.createDefaultStats(),
      ...(saveData.stats || {}),
    };

    if (saveData.version !== SAVE_CONFIG.currentVersion) {
      migrated.version = SAVE_CONFIG.currentVersion;
      if (!migrated.systemState.gameTimePassed) {
        migrated.systemState.gameTimePassed = 0;
      }
    }

    return migrated;
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

    for (const [id, maiden] of saveData.maidens) {
      maidens.set(id, { ...maiden, isshex: normalizePersonality(maiden.isshex) });
    }

    return {
      carriages: new Map(saveData.carriages),
      maidens,
    };
  }

  // ============================================
  // 恢复子系统数据
  // ============================================

  restoreSubsystems(subsystems: SubsystemsData, maidens: Map<string, Maiden>): void {
    if (!subsystems) return;

    maidenSystem.relationship.deserialize(subsystems.relationships);
    maidenSystem.pregnancy.deserialize(subsystems.pregnancy);
    
    // 将 NarcissusData[] 转换为 [string, NarcissusState][]
    const narcissusData: [string, NarcissusState][] = subsystems.narcissus.map(
      (item: NarcissusData) => [item.maidenId, item.narcissusState]
    );
    maidenSystem.narcissus.deserialize(narcissusData, maidens);
    
    maidenSystem.event.deserialize(subsystems.events);
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
