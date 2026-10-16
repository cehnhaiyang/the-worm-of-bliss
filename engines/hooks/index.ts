
// ============================================
// 游戏引擎 Hook - 核心控制器
// 负责状态初始化和整合各个功能模块
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Carriage,
  Maiden,
  MaidenSummary,
  SystemState,
  MasterState,
  GraceType,
  GraceEvent,
  CharacterStatus,
  MemoryNode,
} from '../../meta';
import { GRACE_REWARDS, GAME_CONFIG } from '../../constants';

// 系统层导入
import { carriageSystem, maidenSystem } from '../systems';

// 服务层导入
import { audioService, persistenceService } from '../services';

// Hook 导入
import { useGameLog } from './useGameLog';
import { useTimeLoop } from './useTimeLoop';
import { commitChain, commitNodeEdit, commitNodeInsert } from './maidenUpdates';
import { usePlayerActions } from './usePlayerActions';

// ============================================
// 初始状态工厂
// ============================================

const createInitialSystemState = (): SystemState => ({
  resonanceFrequency: GAME_CONFIG.INITIAL_RESONANCE,
  entropyLevel: GAME_CONFIG.INITIAL_ENTROPY,
  cycleCount: 1,
  gameTimePassed: 0,
  hubConfiguration: 'ALPHA-7',
  globalFertilitySync: 45,
  watcherAlertLevel: 1,
  gracePoolSize: GAME_CONFIG.INITIAL_GRACE_POOL,
  gameStartTime: new Date().setHours(8, 0, 0, 0),
  lastTickTime: Date.now(),
  timeScale: 1,
  isPaused: false,
});

const createInitialMasterState = (startCarriageId: string): MasterState => ({
  carriageId: startCarriageId,
  focusedMaidenId: undefined,
});

// ============================================
// Hook 实现
// ============================================

export const useGameEngine = () => {
  // --------------------------------------------
  // 核心状态 (Core State)
  // --------------------------------------------
  const [carriages, setCarriages] = useState<Map<string, Carriage>>(() => carriageSystem.generateGrid());
  const [maidens, setMaidens] = useState<Map<string, Maiden>>(() => new Map());
  const [systemState, setSystemState] = useState<SystemState>(createInitialSystemState);
  const [masterState, setMasterState] = useState<MasterState>(() => createInitialMasterState('R2C25'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [graceHistory, setGraceHistory] = useState<GraceEvent[]>([]);

  // --------------------------------------------
  // 引用状态 (Refs) - 解决闭包陷阱
  // --------------------------------------------
  const initialized = useRef(false);

  const stateRef = useRef({
    systemState,
    carriages,
    maidens,
    masterState
  });

  useEffect(() => {
    stateRef.current = { systemState, carriages, maidens, masterState };
  }, [systemState, carriages, maidens, masterState]);

  // --------------------------------------------
  // 子模块 (Sub-Hooks)
  // --------------------------------------------

  // 日志系统
  const { logs, logsRef, addLog, setLogs } = useGameLog();

  // --------------------------------------------
  // 共享逻辑: 神恩系统 (定义在此处因为被多个模块使用)
  // --------------------------------------------

  const executeGrace = useCallback((targetId: string, manual: boolean = false) => {
    const { maidens: currMaidens, systemState: currSystem } = stateRef.current;

    if (currSystem.gracePoolSize <= 0 && manual) {
      addLog('system', '神恩池已耗尽，无法施予恩典。', 'SYSTEM');
      return;
    }

    const maiden = currMaidens.get(targetId);
    if (!maiden) return;

    // 随机选择奖励
    const graceTypes = Object.values(GraceType);
    const selectedType = graceTypes[Math.floor(Math.random() * graceTypes.length)];
    const rewards = GRACE_REWARDS[selectedType];
    const selectedReward = rewards[Math.floor(Math.random() * rewards.length)];

    // 记录事件
    const graceEvent: GraceEvent = {
      type: selectedType,
      description: selectedReward,
      targetId,
      timestamp: Date.now(),
    };

    setGraceHistory(prev => [...prev, graceEvent]);
    setSystemState(prev => ({
      ...prev,
      gracePoolSize: Math.max(0, prev.gracePoolSize - 1)
    }));

    // 更新少女状态 (Update maiden state with grace effects)
    setMaidens(prev => {
      const newMap = new Map(prev);
      const m = newMap.get(targetId);
      if (m) {
        // 使用配置的神恩效果值
        const graceEffects = GAME_CONFIG.GRACE;

        newMap.set(targetId, {
          ...m,
          graceReceived: m.graceReceived + 1,
          attributes: {
            ...m.attributes,
            stress: Math.max(0, m.attributes.stress - graceEffects.STRESS_REDUCTION),
            devotion: Math.min(100, m.attributes.devotion + graceEffects.DEVOTION_INCREASE),
            sanity: Math.min(100, m.attributes.sanity + graceEffects.SANITY_INCREASE),
          },
          // 移除恐惧状态，神恩带来安慰
          status: m.status.filter(s => s !== 'panicked')
        });
      }
      return newMap;
    });

    addLog('grace', `【神恩降临】${maiden.name} 获得: ${selectedReward}`, manual ? 'ME' : 'SYSTEM');
    audioService.playEvent('grace');
  }, [addLog]);

  // 公开给UI的触发器
  const triggerGrace = useCallback((targetMaidenId?: string) => {
    const { maidens: currMaidens, masterState: currMaster } = stateRef.current;
    let targetId = targetMaidenId || currMaster.focusedMaidenId;

    if (!targetId) {
      const keys = Array.from(currMaidens.keys());
      if (keys.length > 0) {
        targetId = keys[Math.floor(Math.random() * keys.length)];
      }
    }

    if (targetId) {
      executeGrace(targetId, true);
    }
  }, [executeGrace]);

  // --------------------------------------------
  // 加载更多子模块
  // --------------------------------------------

  // 真实时间游戏循环 (Real-Time Tick)
  const { getFormattedGameTime } = useTimeLoop({
    stateRef,
    setSystemState,
    setCarriages,
    setMaidens,
    addLog,
    executeGrace
  });

  // 玩家交互 (Actions)
  const { moveMaster, focusMaiden, handleAction } = usePlayerActions({
    stateRef,
    setMasterState,
    setMaidens,
    setSystemState,
    setCarriages,
    setIsProcessing,
    addLog,
    executeGrace,
    isProcessing
  });

  // --------------------------------------------
  // 初始化逻辑
  // --------------------------------------------

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. 生成少女数据
    const newMaidens = maidenSystem.generateMaidens(carriages);
    setMaidens(newMaidens);

    // 2. 初始化关系网络（已在 maidenSystem.generateMaidens 中完成）

    // 3. 初始化音频系统
    audioService.init().catch((err: unknown) => console.warn("Audio init warning:", err));

    // 4. 初始日志 - 使用 stateRef 获取最新值
    const { systemState: initSys } = stateRef.current;
    addLog('system', '神躯神经中枢已连接...', 'SYSTEM');
    addLog('system', `欢迎回来。`, 'SYSTEM');
    addLog('system', `车厢矩阵: 5×50 = 250节 | 单位数量: 250`, 'SYSTEM');
    addLog('system', `关系网络已初始化 | 怀孕系统已就绪 | 事件系统已激活`, 'SYSTEM');
    addLog('narrative',
      `列车正在虚空中行驶。空气中弥漫着 ${initSys.resonanceFrequency}Hz 的低频嗡鸣，那是奇点反应堆永恒的心跳。\n\n` +
      `250个少女分散在各个车厢中，等待着我的指令。`
    );

    // 5. 设置自动存档定时器 - 使用 stateRef 和 logsRef 获取最新值
    const autoSaveInterval = setInterval(() => {
      const { systemState: sys, masterState: ms, carriages: cars, maidens: mds } = stateRef.current;
      void persistenceService.autoSave(sys, ms, cars, mds, logsRef.current);
    }, GAME_CONFIG.AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(autoSaveInterval);
  }, [addLog]);


  // --------------------------------------------
  // 系统控制接口
  // --------------------------------------------

  const updateResonance = useCallback((delta: number) => {
    setSystemState(prev => {
      const newFreq = Math.max(0, Math.min(50, prev.resonanceFrequency + delta));
      addLog('system', `共振圣歌频率调整为: ${newFreq} Hz`, 'SYSTEM');
      if (newFreq < 10) {
        addLog('system', `警告：极低频共振。所有单位进入高度敏感/催眠状态。`, 'SYSTEM');
      }
      audioService.playEvent('resonance');
      return { ...prev, resonanceFrequency: newFreq };
    });
  }, [addLog]);

  const setTimeScale = useCallback((scale: number) => {
    setSystemState(prev => ({ ...prev, timeScale: scale }));
    addLog('system', `时间倍率调整: ${scale}x`, 'SYSTEM');
    audioService.playUI('click');
  }, [addLog]);

  const togglePause = useCallback(() => {
    setSystemState(prev => {
      const newPaused = !prev.isPaused;
      addLog('system', newPaused ? '>>> 时间流逝暂停 <<<' : '>>> 时间流逝恢复 <<<', 'SYSTEM');
      audioService.playUI('click');
      return { ...prev, isPaused: newPaused };
    });
  }, [addLog]);

  // --------------------------------------------
  // 数据获取接口 (Getters)
  // --------------------------------------------

  const getCurrentCarriage = useCallback((): Carriage | undefined => {
    return stateRef.current.carriages.get(stateRef.current.masterState.carriageId);
  }, []);

  const getFocusedMaiden = useCallback((): Maiden | undefined => {
    const { focusedMaidenId } = stateRef.current.masterState;
    return focusedMaidenId
      ? stateRef.current.maidens.get(focusedMaidenId)
      : undefined;
  }, []);

  const getMaidensInCarriage = useCallback((carriageId: string): Maiden[] => {
    const { carriages: currCarriages, maidens: currMaidens } = stateRef.current;
    const carriage = currCarriages.get(carriageId);
    if (!carriage) return [];
    return carriage.occupants
      .map(id => currMaidens.get(id))
      .filter((m): m is Maiden => m !== undefined);
  }, []);

  const getAllMaidenSummaries = useCallback((): MaidenSummary[] => {
    return maidenSystem.getMaidenSummaries(stateRef.current.maidens);
  }, []);

  // --------------------------------------------
  // 记忆写回 (Memory Chain Writes)
  // 记忆链的写点集中在这里：面板与叙事路径都经由它回写，
  // 每次都只按 id 合并记忆字段，绝不整对象替换。
  // --------------------------------------------

  const setMemoryChain = useCallback((maidenId: string, chain: MemoryNode[]) => {
    commitChain(setMaidens, maidenId, chain);
  }, [setMaidens]);

  const replaceMemoryNode = useCallback((maidenId: string, node: MemoryNode) => {
    commitNodeEdit(setMaidens, maidenId, node);
  }, [setMaidens]);

  const implantMemory = useCallback((maidenId: string, node: MemoryNode, afterNodeId?: string) => {
    commitNodeInsert(setMaidens, maidenId, node, afterNodeId);
  }, [setMaidens]);

  // --------------------------------------------
  // API 返回
  // --------------------------------------------

  return {
    // 状态
    carriages,
    maidens,
    systemState,
    masterState,
    logs,
    isProcessing,
    graceHistory,

    // 动作
    handleAction,
    moveMaster,
    focusMaiden,
    updateResonance,
    triggerGrace,
    setTimeScale,
    togglePause,
    setMemoryChain,
    replaceMemoryNode,
    implantMemory,

    // 数据获取器
    getCurrentCarriage,
    getFocusedMaiden,
    getMaidensInCarriage,
    getAllMaidenSummaries,
    getFormattedGameTime,

    // 状态设置器 (供Load使用)
    setCarriages,
    setMaidens,
    setSystemState,
    setMasterState,
    setLogs,
    addLog,
  };
};

export * from './useGameLog';
export * from './usePersistence';
export * from './usePlayerActions';
export * from './useTimeLoop';
