
// ============================================
// 游戏引擎 Hook - 核心控制器
// 负责状态初始化和整合各个功能模块
// ============================================

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Carriage,
  Maiden,
  SystemState,
  MasterState,
  GraceEvent,
} from '../../meta';
import { GAME_CONFIG } from '../../constants';
import { mergeMaiden, rollGrace, clamp } from '../../const';

// 系统层导入
import { carriageSystem } from '../systems';

// 服务层导入
import { audioService } from '../services/AudioService';
import { persistenceService } from '../services/PersistenceService';

// Hook 导入
import { useGameLog } from './useGameLog';
import { useMaiden } from './useMaiden';
import { usePersistence } from './usePersistence';
import { useTimeLoop } from './useTimeLoop';
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
  const [systemState, setSystemState] = useState<SystemState>(createInitialSystemState);
  const [masterState, setMasterState] = useState<MasterState>(() => createInitialMasterState('R2C25'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [graceHistory, setGraceHistory] = useState<GraceEvent[]>([]);

  /**
   * 请求互斥的权威。
   *
   * 同时维护 state 与 ref：state 供 UI 渲染（按钮禁用态），ref 供异步路径判重。
   * 两者只能由 `setProcessing` 写，避免出现"按钮已禁用但闸门仍放行"的分裂。
   */
  const processingRef = useRef(false);
  const setProcessing = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((value) => {
    const next = typeof value === 'function' ? value(processingRef.current) : value;
    processingRef.current = next;
    setIsProcessing(next);
  }, []);

  // --------------------------------------------
  // 子模块 (Sub-Hooks)
  // --------------------------------------------

  // 日志系统
  const { logs, addLog, setLogs } = useGameLog();

  // 少女子系统：实体表由它持有，本 hook 只把控制器转出
  const maiden = useMaiden();
  const { maidens, setMaidens } = maiden;

  // --------------------------------------------
  // 引用状态 (Refs) - 解决闭包陷阱
  // --------------------------------------------
  const initialized = useRef(false);

  const stateRef = useRef({
    systemState,
    carriages,
    maidens,
    masterState,
    logs,
  });

  useEffect(() => {
    stateRef.current = { systemState, carriages, maidens, masterState, logs };
  }, [systemState, carriages, maidens, masterState, logs]);

  // --------------------------------------------
  // 共享逻辑: 神恩系统 (被时间循环与玩家动作共同使用)
  // --------------------------------------------

  const executeGrace = useCallback((targetId: string, manual: boolean = false) => {
    const { maidens: currMaidens, systemState: currSystem } = stateRef.current;

    if (currSystem.gracePoolSize <= 0 && manual) {
      addLog('system', '神恩池已耗尽，无法施予恩典。', 'SYSTEM');
      return;
    }

    const maiden = currMaidens.get(targetId);
    if (!maiden) return;

    // 抽奖与属性结算都是纯计算，随机性只发生在 rollGrace 内部
    const { type, reward, maiden: blessed } = rollGrace(maiden);

    setGraceHistory(prev => [...prev, {
      type,
      description: reward,
      targetId,
      timestamp: Date.now(),
    }]);
    setSystemState(prev => ({ ...prev, gracePoolSize: Math.max(0, prev.gracePoolSize - 1) }));
    setMaidens(prev => mergeMaiden(prev, targetId, () => blessed));

    addLog('grace', `【神恩降临】${maiden.name} 获得: ${reward}`, manual ? 'ME' : 'SYSTEM');
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
    setSystemState,
    setCarriages,
    setMaidens,
    setIsProcessing: setProcessing,
    addLog,
    executeGrace,
    processingRef,
  });

  // 存档管理 (Persistence)
  const { handleSave, handleLoad, handleReset } = usePersistence({
    stateRef,
    setCarriages,
    setMaidens,
    setSystemState,
    setMasterState,
    setLogs,
    addLog,
  });

  // --------------------------------------------
  // 初始化逻辑
  // --------------------------------------------

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // 1. 生成少女数据（关系网络在其中一并初始化）
    maiden.generate(carriages);

    // 2. 初始化音频系统
    audioService.init().catch((err: unknown) => console.warn("Audio init warning:", err));

    // 3. 初始日志 - 使用 stateRef 获取最新值
    const { systemState: initSys } = stateRef.current;
    addLog('system', '神躯神经中枢已连接...', 'SYSTEM');
    addLog('system', `欢迎回来。`, 'SYSTEM');
    addLog('system', `车厢矩阵: 5×50 = 250节 | 单位数量: 250`, 'SYSTEM');
    addLog('system', `关系网络已初始化 | 怀孕系统已就绪 | 事件系统已激活`, 'SYSTEM');
    addLog('narrative',
      `列车正在虚空中行驶。空气中弥漫着 ${initSys.resonanceFrequency}Hz 的低频嗡鸣，那是奇点反应堆永恒的心跳。\n\n` +
      `250个少女分散在各个车厢中，等待着我的指令。`
    );

    // 4. 设置自动存档定时器 - 从 stateRef 读最新值，不依赖闭包
    const autoSaveInterval = setInterval(() => {
      const { systemState: sys, masterState: ms, carriages: cars, maidens: mds, logs: currentLogs } = stateRef.current;
      void persistenceService.autoSave(sys, ms, cars, mds, currentLogs);
    }, GAME_CONFIG.AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(autoSaveInterval);
  }, [addLog]);


  // --------------------------------------------
  // 系统控制接口
  //
  // 副作用一律写在 updater 之外：updater 必须是纯函数，StrictMode 会双调用它，
  // 把 addLog / playEvent 放进去会让每条日志与音效都翻倍。
  // --------------------------------------------

  const updateResonance = useCallback((delta: number) => {
    const newFreq = clamp(stateRef.current.systemState.resonanceFrequency + delta, GAME_CONFIG.MIN_RESONANCE, GAME_CONFIG.MAX_RESONANCE);

    setSystemState(prev => ({ ...prev, resonanceFrequency: newFreq }));
    addLog('system', `共振圣歌频率调整为: ${newFreq} Hz`, 'SYSTEM');
    if (newFreq < 10) {
      addLog('system', `警告：极低频共振。所有单位进入高度敏感/催眠状态。`, 'SYSTEM');
    }
    audioService.playEvent('resonance');
  }, [addLog]);

  const setTimeScale = useCallback((scale: number) => {
    setSystemState(prev => ({ ...prev, timeScale: scale }));
    addLog('system', `时间倍率调整: ${scale}x`, 'SYSTEM');
    audioService.playUI('click');
  }, [addLog]);

  const togglePause = useCallback(() => {
    const newPaused = !stateRef.current.systemState.isPaused;

    setSystemState(prev => ({ ...prev, isPaused: newPaused }));
    addLog('system', newPaused ? '>>> 时间流逝暂停 <<<' : '>>> 时间流逝恢复 <<<', 'SYSTEM');
    audioService.playUI('click');
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
    const carriage = stateRef.current.carriages.get(carriageId);
    return carriage ? maiden.maidensIn(carriage) : [];
  }, [maiden]);

  // --------------------------------------------
  // API 返回
  // 只暴露 useGameEngine 一个出口：UI 不接触任何子 hook，也不导入它们的接口。
  // 少女子系统的能力在此逐项透传，调用方看到的是一套扁平 API。
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

    // 存档
    handleSave,
    handleLoad,
    handleReset,

    // 少女：派生视图
    getMaidenView: maiden.viewOf,
    allMaidenSummaries: maiden.summaries,
    getMaidensInCarriage,

    // 少女：写入
    updateMaiden: maiden.updateMaiden,

    // 少女：记忆
    setMemoryChain: maiden.setMemoryChain,
    applyGenesis: maiden.applyGenesis,
    tamperMemory: maiden.tamperMemory,
    implantMemory: maiden.implantMemory,

    // 少女：妊娠与关系
    getPregnancyOf: maiden.pregnancyOf,
    getPregnancies: maiden.getPregnancies,
    getPregnancyStats: maiden.getPregnancyStats,
    getRelationshipsOf: maiden.relationshipsOf,
    getRelationshipStats: maiden.relationshipStats,

    // 数据获取器
    getCurrentCarriage,
    getFocusedMaiden,
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
