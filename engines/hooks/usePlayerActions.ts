// ============================================
// 玩家交互 Hook
// 处理玩家的指令、移动和AI交互
// ============================================

import { useCallback } from 'react';
import {
  AttributeKey,
  Carriage,
  Maiden,
  MasterState,
  NarrativePlan,
  SystemState,
  AIResponse,
  LogType,
} from '../../meta';
import { clamp, getCurrentCarriageId, mergeMaiden } from '../../const';
import { GAME_CONFIG, getCarriageTemplate, isAbyssTemplate, isTemplateAccessible } from '../../constants';
import { carriageSystem, maidenSystem } from '../systems';
import { audioService } from '../services/AudioService';
import { textService } from '../services/TextService';

interface UsePlayerActionsParams {
  stateRef: React.RefObject<{
    systemState: SystemState;
    carriages: Map<string, Carriage>;
    maidens: Map<string, Maiden>;
    masterState: MasterState;
  }>;
  setMasterState: React.Dispatch<React.SetStateAction<MasterState>>;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
  setCarriages: React.Dispatch<React.SetStateAction<Map<string, Carriage>>>;
  setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
  executeGrace: (targetId: string, manual: boolean) => void;
  /**
   * 进行中的请求句柄。
   *
   * 互斥判定必须读 ref 而不是渲染期的值：`handleAction` 是异步的，两次快速提交之间
   * 不会发生重渲染，闭包里捕获的 `isProcessing` 仍是 false，两道闸门会同时放行。
   */
  processingRef: React.RefObject<boolean>;
}

interface UsePlayerActionsReturn {
  moveMaster: (targetCarriageId: string) => void;
  focusMaiden: (maidenId: string) => void;
  handleAction: (input: string) => Promise<void>;
}

export const usePlayerActions = ({
  stateRef,
  setMasterState,
  setSystemState,
  setCarriages,
  setMaidens,
  setIsProcessing,
  addLog,
  executeGrace,
  processingRef,
}: UsePlayerActionsParams): UsePlayerActionsReturn => {

  /**
   * 把水仙协议的返回值翻译成增量。
   *
   * 协议层用**绝对值**描述结果（"虔诚设为 100"、"状态集合变为这些"），而归并层只认
   * 增量——两者的差异在这个边界上一次性抹平，于是"谁是权威"不需要在每个协议分支里
   * 重新判断一次。`narcissusState` 单独处理：`chooseToStay` 里把它显式置为
   * `undefined` 表示清除，因此用 `in` 判断键是否存在，而不是用取值判断，
   * 否则清除动作会被当成"未涉及"而丢失。
   */
  const planFromNarcissusUpdate = (
    maiden: Maiden,
    update: Partial<Maiden>
  ): Partial<NarrativePlan> => {
    const plan: Partial<NarrativePlan> = {};

    if ('narcissusState' in update) {
      plan.narcissusState = update.narcissusState ?? null;
    }

    if (update.status) {
      const next = new Set(update.status);
      const current = new Set(maiden.status);
      plan.statusAdd = update.status.filter(s => !current.has(s));
      plan.statusRemove = maiden.status.filter(s => !next.has(s));
    }

    if (update.attributes) {
      const deltas: Partial<Record<AttributeKey, number>> = {};
      for (const key of Object.keys(update.attributes) as AttributeKey[]) {
        const delta = update.attributes[key] - maiden.attributes[key];
        if (delta) deltas[key] = delta;
      }
      plan.attributeDeltas = deltas;
    }

    if (update.rank) plan.absolute = { ...plan.absolute, rank: update.rank };
    if (update.rankColor) plan.absolute = { ...plan.absolute, rankColor: update.rankColor };
    if (update.legacyMemoryChain) plan.absolute = { ...plan.absolute, legacyMemoryChain: update.legacyMemoryChain };
    // 归档后的链是空的：把它当作"清空当前链"的意图转成一次覆盖
    if (update.memoryChain && update.memoryChain.length === 0) plan.memoryOps = [{ op: 'clear' }];

    return plan;
  };

  /**
   * 把叙事响应翻译成增量计划。
   *
   * 纯函数：不写 store、不记日志、不发请求，副作用只被**描述**出来交给调用方执行。
   * 记忆与水仙协议的判定基于请求发起时的快照完成，得到的节点与字段补丁都是确定的，
   * 因此可以在归并阶段安全重放。
   */
  const planNarrativeResponse = (
    maiden: Maiden,
    response: AIResponse,
    gameTimePassed: number
  ): NarrativePlan => {
    const effects: NarrativePlan['effects'] = [];
    const updates = response.stateUpdates;

    const plan: NarrativePlan = {
      attributeDeltas: {
        sanity: updates.sanity || 0,
        obedience: updates.obedience || 0,
        lust: updates.lust || 0,
        stress: updates.stress || 0,
        corruption: updates.corruption || 0,
        devotion: updates.devotion || 0,
        hunger: updates.hunger || 0,
        fatigue: updates.fatigue || 0,
      },
      statusAdd: updates.addStatus ?? [],
      statusRemove: updates.removeStatus ?? [],
      absolute: updates.rankChange ? { rank: updates.rankChange } : {},
      fertilityDelta: updates.fertilityChange || 0,
      pregnancyProgress: updates.pregnancyProgress || 0,
      memoryOps: [],
      effects,
    };

    if (response.memoryUpdate) {
      const { action, content, targetMemoryId } = response.memoryUpdate;
      if (action === 'implant' && content) {
        // 植入内容不属于她的人生，落链位置由 insertNode 按登车瞬间不变量决定
        const node = maidenSystem.memory.createImplantedNode(content, 'trauma', gameTimePassed);
        plan.memoryOps.push({ op: 'insert', node });
        effects.push({ kind: 'log', type: 'system', content: `>>> 记忆植入: [${content}]` });
      } else if (action === 'tamper' && content) {
        // 优先按指定 ID，否则降级到第一个原始节点
        const target = maiden.memoryChain.find(n => n.id === targetMemoryId)
          ?? maiden.memoryChain.find(n => n.type === 'original');

        if (target) {
          const corrupted = maidenSystem.memory.tamperNode(
            target,
            gameTimePassed,
            content,
            'AI 自动篡改'
          );
          plan.memoryOps.push({ op: 'replace', node: corrupted });
          effects.push({ kind: 'log', type: 'system', content: `>>> 记忆篡改: ${target.title} 已被重写` });
        }
      }
    }

    if (response.narcissusAction) {
      const apply = (update: Partial<Maiden>) => Object.assign(plan, planFromNarcissusUpdate(maiden, update));

      switch (response.narcissusAction) {
        case 'initiate': {
          const res = maidenSystem.narcissus.initiateProtocol(maiden, gameTimePassed);
          if (res.success) {
            apply(res.maidenUpdate);
            effects.push({ kind: 'log', type: 'system', content: '>>> 水仙协议触发: 门已开启。' });
          }
          break;
        }
        case 'leave': {
          const res = maidenSystem.narcissus.chooseToDeparture(maiden, gameTimePassed);
          apply(res.maidenUpdate);
          effects.push({ kind: 'log', type: 'system', content: `>>> 水仙协议: ${maiden.name} 选择离开。` });
          break;
        }
        case 'stay': {
          const res = maidenSystem.narcissus.chooseToStay(maiden);
          apply(res.maidenUpdate);
          effects.push({ kind: 'log', type: 'system', content: `>>> 水仙协议: ${maiden.name} 选择留下。` });
          break;
        }
        case 'return': {
          const res = maidenSystem.narcissus.acceptInvitation(maiden, gameTimePassed);
          apply(res.maidenUpdate);
          effects.push({ kind: 'log', type: 'system', content: `>>> 水仙协议: ${maiden.name} 已归来，晋升为执事。正在重构意识...` });
          // 创世纪耗时数秒，用它自己的快照发起；写回时只按 id 合并记忆字段
          effects.push({ kind: 'genesis', maiden: { ...maiden, ...res.maidenUpdate } });
          break;
        }
      }
    }

    return plan;
  };

  /**
   * 把计划归并到实体上。
   *
   * 纯函数：同一个 `current` 与 `plan` 重放多少次都得到相同结果，因此可以安全地放进
   * `setMaidens` 的更新函数。属性按增量加到**当前**值上而不是快照值上，
   * 飞行期间的漂移得以保留。
   */
  const reduceMaiden = (current: Maiden, plan: NarrativePlan, gameTimePassed: number): Maiden => {
    const status = plan.statusRemove.length > 0
      ? current.status.filter(s => !plan.statusRemove.includes(s))
      : [...current.status];
    for (const s of plan.statusAdd) {
      if (!status.includes(s)) status.push(s);
    }

    const attributes = { ...current.attributes };
    for (const key of Object.keys(plan.attributeDeltas) as AttributeKey[]) {
      const delta = plan.attributeDeltas[key];
      if (delta) attributes[key] = clamp(attributes[key] + delta);
    }

    // 穿透至深层妊娠对象：孕周由 AI 推进，其余字段保持不变
    let pregnancy = current.physiology.pregnancy;
    if (plan.pregnancyProgress && pregnancy) {
      pregnancy = { ...pregnancy, weekNumber: pregnancy.weekNumber + plan.pregnancyProgress };
    }

    let memoryChain = current.memoryChain;
    for (const op of plan.memoryOps) {
      if (op.op === 'clear') memoryChain = [];
      else if (op.op === 'insert') memoryChain = maidenSystem.memory.insertNode(memoryChain, op.node);
      else memoryChain = maidenSystem.memory.replaceNode(memoryChain, op.node);
    }

    const next: Maiden = {
      ...current,
      ...plan.absolute,
      status,
      attributes,
      physiology: {
        ...current.physiology,
        fertility: clamp(current.physiology.fertility + plan.fertilityDelta),
        pregnancy,
      },
      memoryChain,
      // 与实体其余时间字段共用游戏时钟：此处曾写入墙钟 Date.now()，
      // 而消费者按游戏时间做差，得到的是负数，于是该少女此后永远偏向社交。
      behavior: { ...current.behavior, lastInteractionTime: gameTimePassed },
    };

    if (plan.narcissusState === null) {
      const { narcissusState: _cleared, ...rest } = next;
      return rest;
    }
    return plan.narcissusState ? { ...next, narcissusState: plan.narcissusState } : next;
  };

  // --------------------------------------------
  // 移动我 (Move Master)
  // --------------------------------------------
  const moveMaster = useCallback((targetCarriageId: string) => {
    const { carriages: currCarriages, maidens: currMaidens } = stateRef.current!;
    const targetCarriage = currCarriages.get(targetCarriageId);

    if (!targetCarriage || !isTemplateAccessible(targetCarriage.templateId)) {
      addLog('system', '无法进入该车厢：区域已封锁或不存在。');
      audioService.playUI('cancel');
      return;
    }

    // 聚焦是否保留必须在 updater 里按 prev 判断：focusMaiden 会在同一次事件里先写入
    // 新聚焦对象再调到这里，而 stateRef 要等渲染后才更新，读它拿到的是写入之前的快照。
    // 快照里没有聚焦时，这里会把刚设好的聚焦一并清成 undefined。
    setMasterState(prev => {
      const focused = prev.focusedMaidenId ? currMaidens.get(prev.focusedMaidenId) : undefined;
      const keepFocus = !!focused && getCurrentCarriageId(focused) === targetCarriageId;

      return {
        ...prev,
        carriageId: targetCarriageId,
        focusedMaidenId: keepFocus ? prev.focusedMaidenId : undefined,
      };
    });

    const template = getCarriageTemplate(targetCarriage.templateId);
    const isAbyss = isAbyssTemplate(targetCarriage.templateId);

    addLog('movement',
      `>>> 传送至 ${template?.nameCN ?? targetCarriage.templateId} [${targetCarriage.id}] ${isAbyss ? '【深渊区域】' : ''}`,
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
    if (!input.trim() || processingRef.current) return;

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
      const aiResponse: AIResponse = await textService.generateNarrative(
        input,
        focusedMaiden,
        currSystem,
        currentCarriage?.templateId,
      );

      // 翻译成增量计划：纯计算，可在更新函数里安全重放
      const plan = planNarrativeResponse(
        focusedMaiden,
        aiResponse,
        currSystem.gameTimePassed
      );

      // 写回：更新函数只做纯归并。请求在飞期间该少女仍被时间循环推进，
      // 增量归并到"归并那一刻"的实体上，两个来源的改动都不会被覆盖。
      setMaidens(prev => mergeMaiden(
        prev,
        focusedMaiden.id,
        current => reduceMaiden(current, plan, currSystem.gameTimePassed)
      ));

      // 副作用在更新函数之外执行，因此无论 React 如何重放更新都只发生一次
      for (const effect of plan.effects) {
        switch (effect.kind) {
          case 'log':
            addLog(effect.type, effect.content);
            break;
          case 'genesis':
            // 创世纪耗时数秒，期间该少女仍被时间循环推进，因此写回只按 id 合并记忆字段
            textService.generateDeaconessGenesis(effect.maiden, currSystem.gameTimePassed).then(nodes => {
              if (nodes.length === 0) {
                addLog('system', `>>> 意识重构失败: ${effect.maiden.name} 的旧档案仍被封存。`, 'SYSTEM');
                return;
              }
              setMaidens(prev => mergeMaiden(
                prev,
                effect.maiden.id,
                current => ({ ...current, memoryChain: nodes })
              ));
              addLog('system', `>>> 意识重构完成: ${effect.maiden.name} 的新档案已生效。`, 'SYSTEM');
            }).catch(err => {
              console.error('[Genesis] 意识重构中断:', err);
              addLog('system', `>>> 意识重构中断: 神经链接不稳定。`, 'SYSTEM');
            });
            break;
        }
      }

      // 更新系统状态
      const systemUpdates = aiResponse.systemUpdates;
      if (systemUpdates) {
        setSystemState(prev => ({
          ...prev,
          entropyLevel: clamp(prev.entropyLevel + (systemUpdates.entropyChange || 0)),
          resonanceFrequency: clamp(
            prev.resonanceFrequency + (systemUpdates.resonanceChange || 0),
            GAME_CONFIG.MIN_RESONANCE,
            GAME_CONFIG.MAX_RESONANCE
          ),
        }));

        if (systemUpdates.triggerGrace) {
          setTimeout(() => executeGrace(focusedMaiden.id, false), 1500);
        }

        if (systemUpdates.hubReconfiguration) {
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
  }, [addLog, executeGrace, stateRef, setMaidens, setSystemState, setCarriages, setIsProcessing, processingRef]);

  return {
    moveMaster,
    focusMaiden,
    handleAction
  };
};