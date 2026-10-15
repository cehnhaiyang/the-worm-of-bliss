// ============================================
// 玩家交互 Hook
// 处理玩家的指令、移动和AI交互
// ============================================

import { useCallback } from 'react';
import {
  Carriage,
  Maiden,
  SystemState,
  MasterState,
  AIResponse,
  LogType,
  clamp,
  getCurrentCarriageId
} from '../../meta';
import { CARRIAGE_TYPE_INFO, ABYSS_TYPES } from '../../constants';
import { carriageSystem, maidenSystem } from '../systems';
import { audioService, aiService } from '../services';

interface UsePlayerActionsParams {
  stateRef: React.RefObject<{
    systemState: SystemState;
    carriages: Map<string, Carriage>;
    maidens: Map<string, Maiden>;
    masterState: MasterState;
  }>;
  setMasterState: React.Dispatch<React.SetStateAction<MasterState>>;
  setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
  setCarriages: React.Dispatch<React.SetStateAction<Map<string, Carriage>>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
  executeGrace: (targetId: string, manual: boolean) => void;
  isProcessing: boolean;
}

interface UsePlayerActionsReturn {
  moveMaster: (targetCarriageId: string) => void;
  focusMaiden: (maidenId: string) => void;
  handleAction: (input: string) => Promise<void>;
}

export const usePlayerActions = ({
  stateRef,
  setMasterState,
  setMaidens,
  setSystemState,
  setCarriages,
  setIsProcessing,
  addLog,
  executeGrace,
  isProcessing
}: UsePlayerActionsParams): UsePlayerActionsReturn => {

  // --------------------------------------------
  // 移动我 (Move Master)
  // --------------------------------------------
  const moveMaster = useCallback((targetCarriageId: string) => {
    const { carriages: currCarriages, masterState: currMaster, maidens: currMaidens } = stateRef.current!;
    const targetCarriage = currCarriages.get(targetCarriageId);

    if (!targetCarriage || !targetCarriage.isAccessible) {
      addLog('system', '无法进入该车厢：区域已封锁或不存在。');
      audioService.playUI('cancel');
      return;
    }

    // 检查当前聚焦的少女是否在目标车厢，如果不在则清除聚焦
    let newFocusedMaidenId: string | undefined = currMaster.focusedMaidenId;
    if (newFocusedMaidenId) {
      const focusedMaiden = currMaidens.get(newFocusedMaidenId);
      if (!focusedMaiden || getCurrentCarriageId(focusedMaiden) !== targetCarriageId) {
        newFocusedMaidenId = undefined;
      }
    }

    setMasterState(prev => ({
      ...prev,
      carriageId: targetCarriageId,
      focusedMaidenId: newFocusedMaidenId
    }));

    // FIX: CARRIAGE_TYPE_INFO 已变为数组，必须用 .find() 而非对象索引
    const typeInfo = CARRIAGE_TYPE_INFO.find(info => info.type === targetCarriage.type);
    const isAbyss = ABYSS_TYPES.includes(targetCarriage.type);

    addLog('movement',
      `>>> 传送至 ${typeInfo?.nameCN ?? targetCarriage.type} [${targetCarriage.id}] ${isAbyss ? '【深渊区域】' : ''}`,
      'player'
    );

    audioService.playUI('confirm');

    if (isAbyss) {
      audioService.playEvent('abyss_vision');
      addLog('abyss', `警告：进入深渊区域。现实稳定性下降，理智检定中...`);
    }
  }, [addLog, stateRef, setMasterState]);

  // --------------------------------------------
  // 聚焦少女 (Focus Maiden)
  // --------------------------------------------
  const focusMaiden = useCallback((maidenId: string) => {
    const { maidens: currMaidens, masterState: currMaster } = stateRef.current!;
    const maiden = currMaidens.get(maidenId);
    if (!maiden) return;

    setMasterState(prev => ({ ...prev, focusedMaidenId: maidenId }));

    // 如果不在同一车厢，自动移动我
    const mCarriageId = getCurrentCarriageId(maiden);
    if (mCarriageId !== currMaster.carriageId) {
      moveMaster(mCarriageId);
    }

    addLog('system', `聚焦目标: ${maiden.name} [${maiden.id}]`);
    audioService.playUI('click');

  }, [moveMaster, addLog, stateRef, setMasterState]);

  // --------------------------------------------
  // 处理玩家动作 (Handle Action / AI API)
  // --------------------------------------------
  const handleAction = useCallback(async (input: string) => {
    if (!input.trim() || isProcessing) return;

    const {
      maidens: currMaidens,
      masterState: currMaster,
      systemState: currSystem,
      carriages: currCarriages
    } = stateRef.current!;

    const focusedMaiden = currMaster.focusedMaidenId
      ? currMaidens.get(currMaster.focusedMaidenId)
      : null;

    if (!focusedMaiden) {
      addLog('system', '错误：未选定目标。请先选择一名少女。');
      audioService.playUI('cancel');
      return;
    }

    addLog('player', input, 'MASTER');
    setIsProcessing(true);

    try {
      const currentCarriage = currCarriages.get(currMaster.carriageId);

      // 调用 AI API
      const aiResponse: AIResponse = await aiService.generateNarrative(
        input,
        focusedMaiden,
        currSystem,
        currentCarriage?.type,
      );

      // 更新少女状态
      setMaidens(prev => {
        const newMap = new Map(prev);
        let maiden = newMap.get(focusedMaiden.id);

        if (maiden) {
          const updates = aiResponse.stateUpdates;
          let newStatus = [...maiden.status];

          // 处理状态标签增删
          if (updates.addStatus) {
            updates.addStatus.forEach(s => {
              if (!newStatus.includes(s)) newStatus.push(s);
            });
          }
          if (updates.removeStatus) {
            newStatus = newStatus.filter(s => !updates.removeStatus?.includes(s));
          }

          // 修复领域模型：穿透至正确的深层妊娠对象
          let newPregnancy = maiden.physiology.pregnancy;
          if (updates.pregnancyProgress && newPregnancy) {
            newPregnancy = {
              ...newPregnancy,
              weekNumber: newPregnancy.weekNumber + updates.pregnancyProgress
            };
          }

          // 更新实体核心属性簇
          maiden = {
            ...maiden,
            status: newStatus,
            attributes: {
              ...maiden.attributes,
              sanity: clamp(maiden.attributes.sanity + (updates.sanity || 0)),
              obedience: clamp(maiden.attributes.obedience + (updates.obedience || 0)),
              lust: clamp(maiden.attributes.lust + (updates.lust || 0)),
              stress: clamp(maiden.attributes.stress + (updates.stress || 0)),
              corruption: clamp(maiden.attributes.corruption + (updates.corruption || 0)),
              devotion: clamp(maiden.attributes.devotion + (updates.devotion || 0)),
              hunger: clamp(maiden.attributes.hunger + (updates.hunger || 0)),
              fatigue: clamp(maiden.attributes.fatigue + (updates.fatigue || 0)),
            },
            physiology: {
              ...maiden.physiology,
              fertility: clamp(maiden.physiology.fertility + (updates.fertilityChange || 0)),
              pregnancy: newPregnancy
            },
            rank: updates.rankChange || maiden.rank,
            behavior: {
              ...maiden.behavior,
              lastInteractionTime: Date.now(),
            },
          };

          // 处理记忆更新
          if (aiResponse.memoryUpdate) {
            const { action, content, targetMemoryId } = aiResponse.memoryUpdate;
            if (action === 'implant' && content) {
              // FIX: 传入 gameTimePassed 确保节点 timestamp 正确，而非默认 0
              const newNode = maidenSystem.memory.createImplantedNode(
                content,
                'trauma',
                currSystem.gameTimePassed
              );
              const newChain = [...maiden.memoryChain, newNode];
              maiden = {
                ...maiden,
                memoryChain: newChain,
                memorySummary: maidenSystem.memory.generateSummaryFromChain(newChain),
              };
              addLog('system', `>>> 记忆植入: [${content}]`);
            } else if (action === 'tamper') {
              // 优先查找指定ID，否则降级寻找第一个原始节点
              const nodeToCorrupt = maiden.memoryChain.find(n => n.id === targetMemoryId) ||
                maiden.memoryChain.find(n => n.type === 'original');

              if (nodeToCorrupt && content) {
                const corruptedNode = maidenSystem.memory.tamperNode(
                  nodeToCorrupt,
                  currSystem.gameTimePassed,
                  content,
                  "AI 自动篡改"
                );
                const newChain = maiden.memoryChain.map(n =>
                  n.id === corruptedNode.id ? corruptedNode : n
                );
                maiden = {
                  ...maiden,
                  memoryChain: newChain,
                  memorySummary: maidenSystem.memory.generateSummaryFromChain(newChain),
                };
                addLog('system', `>>> 记忆篡改: ${nodeToCorrupt.title} 已被重写`);
              }
            }
          }

          // 处理水仙协议动作
          if (aiResponse.narcissusAction) {
            const action = aiResponse.narcissusAction;

            if (action === 'initiate') {
              const res = maidenSystem.narcissus.initiateProtocol(maiden, currSystem.gameTimePassed);
              if (res.success) {
                maiden = { ...maiden, ...res.maidenUpdate };
                addLog('system', `>>> 水仙协议触发: 门已开启。`);
              }

            } else if (action === 'leave') {
              const res = maidenSystem.narcissus.chooseToDeparture(maiden, currSystem.gameTimePassed);
              maiden = { ...maiden, ...res.maidenUpdate };
              addLog('system', `>>> 水仙协议: ${maiden.name} 选择离开。`);

            } else if (action === 'stay') {
              const res = maidenSystem.narcissus.chooseToStay(maiden);
              maiden = { ...maiden, ...res.maidenUpdate };
              addLog('system', `>>> 水仙协议: ${maiden.name} 选择留下。`);

            } else if (action === 'return') {
              const res = maidenSystem.narcissus.acceptInvitation(maiden, currSystem.gameTimePassed);
              maiden = { ...maiden, ...res.maidenUpdate };
              addLog('system', `>>> 水仙协议: ${maiden.name} 已归来，晋升为执事。正在重构意识...`);

              // 捕获当前值用于异步回调，防止闭包逃逸
              const currentMaidenForGenesis = { ...maiden };

              // 触发执事创世纪 (异步更新)
              aiService.generateDeaconessGenesis(currentMaidenForGenesis).then(({ summary, nodes }) => {
                setMaidens(prevMaidens => {
                  const map = new Map(prevMaidens);
                  const m = map.get(currentMaidenForGenesis.id);
                  if (m) {
                    map.set(currentMaidenForGenesis.id, {
                      ...m,
                      memoryChain: nodes,
                      memorySummary: summary
                    });
                  }
                  return map;
                });
                addLog('system', `>>> 意识重构完成: ${currentMaidenForGenesis.name} 的新档案已生效。`, 'SYSTEM');
              });
            }
          }

          newMap.set(maiden.id, maiden);
        }
        return newMap;
      });

      // 更新系统状态
      if (aiResponse.systemUpdates) {
        setSystemState(prev => ({
          ...prev,
          entropyLevel: clamp(prev.entropyLevel + (aiResponse.systemUpdates?.entropyChange || 0)),
          resonanceFrequency: Math.max(0, prev.resonanceFrequency + (aiResponse.systemUpdates?.resonanceChange || 0)),
        }));

        if (aiResponse.systemUpdates.triggerGrace) {
          setTimeout(() => executeGrace(focusedMaiden.id, false), 1500);
        }

        if (aiResponse.systemUpdates.hubReconfiguration) {
          setTimeout(() => {
            setCarriages(prev => {
              const newMap = new Map(prev);
              carriageSystem.shuffle(newMap);
              return newMap;
            });
            addLog('system', '警告：我意志引发了强制枢纽重组。');
            audioService.playEvent('hub_anomaly');
          }, 2000);
        }
      }

      // 记录日志
      addLog('narrative', aiResponse.narrative);
      addLog('thought', aiResponse.characterThoughts, focusedMaiden.name);

      if (aiResponse.abyssEffect) {
        addLog('abyss', aiResponse.abyssEffect);
      }

      if (aiResponse.soundEffect) {
        audioService.playEvent(aiResponse.soundEffect);
      }

    } catch (error) {
      console.error(error);
      addLog('system', '神经链接中断: 请检查 API 密钥或网络连接。');
      audioService.playUI('cancel');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, addLog, executeGrace, stateRef, setMaidens, setSystemState, setCarriages, setIsProcessing]);

  return {
    moveMaster,
    focusMaiden,
    handleAction
  };
};