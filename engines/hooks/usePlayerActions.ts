// ============================================
// 玩家交互 Hook
// 处理玩家的指令、移动和AI交互
// ============================================

import { useCallback } from 'react';
import {
  AttributeKey,
  Carriage,
  CharacterStatus,
  Maiden,
  MasterState,
  MemoryNode,
  NarcissusState,
  SystemState,
  AIResponse,
  LogType,
} from '../../meta';
import { clamp, getCurrentCarriageId, mergeMaiden } from '../../const';
import { ABYSS_TYPES, CARRIAGE_TYPE_INFO, GAME_CONFIG } from '../../constants';
import { carriageSystem, maidenSystem } from '../systems';
import { audioService, aiService } from '../services';

// ============================================
// 叙事响应的应用
// ============================================

/**
 * 叙事响应在实体上引起的**增量**。
 *
 * 属性一律记为增量而不是绝对值：请求在飞行的数秒里，时间循环仍在推进同一个实体，
 * 若按"请求发起时的快照 + 增量"算出绝对值再整体覆盖，这段时间的属性漂移会被静默回滚。
 * 增量归并到归并那一刻的实体上，两个来源的改动就都能留下。
 *
 * 因此"谁能改属性/状态"只有一个答案：增量叠加与集合增删。
 * 只有时间循环不触碰的字段（阶级、水仙协议状态）才允许整体写入。
 */
interface NarrativePlan {
  attributeDeltas: Partial<Record<AttributeKey, number>>;
  statusAdd: CharacterStatus[];
  statusRemove: CharacterStatus[];
  /** 时间循环不写入的字段，允许整体覆盖 */
  absolute: Partial<Pick<Maiden, 'rank' | 'rankColor' | 'legacyMemoryChain'>>;
  /** `null` 表示清除协议状态，`undefined` 表示本次不涉及 */
  narcissusState?: NarcissusState | null;
  fertilityDelta: number;
  pregnancyProgress: number;
  memoryOps: MemoryOp[];
  effects: NarrativeEffect[];
}

export type { NarrativePlan };

/**
 * 记忆改动。节点在计划阶段就构造完成（`generateId` 等一次性动作只做一次），
 * 归并阶段只做纯函数式的落链，因此更新函数被重放也不会产生第二个节点。
 */
type MemoryOp =
  | { op: 'insert'; node: MemoryNode }
  | { op: 'replace'; node: MemoryNode }
  | { op: 'clear' };

/**
 * 归并之外必须发生的事。
 *
 * 这段逻辑原本整个写在 `setMaidens(updater)` 的更新函数里，而 React 要求更新函数是纯函数：
 * StrictMode 下它会被重放（eagerState 试算 + 双调用 reducer），于是同一条指令
 * 写出重复日志、生成多个 id 不同的植入节点、并发起多次创世纪请求。
 * 把"算什么"与"做什么"分开后，副作用只在更新函数之外执行一次。
 */
type NarrativeEffect =
  | { kind: 'log'; type: LogType; content: string }
  | { kind: 'genesis'; maiden: Maiden };

/**
 * 把水仙协议的返回值翻译成增量。
 *
 * 协议层用**绝对值**描述结果（"虔诚设为 100"、"状态集合变为这些"），
 * 而归并层只认增量——两者的差异在这个边界上一次性抹平，
 * 于是"谁是权威"不需要在每个协议分支里重新判断一次。
 * `narcissusState` 单独处理：它在 `chooseToStay` 里被显式置为 `undefined` 表示清除，
 * 用 `in` 判断键是否存在，而不是用取值判断，否则清除动作会被当成"未涉及"而丢失。
 */
function planFromNarcissusUpdate(maiden: Maiden, update: Partial<Maiden>): Partial<NarrativePlan> {
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
}

/**
 * 把叙事响应翻译成增量计划。
 *
 * 纯函数：不写 store、不记日志、不发请求。副作用只被**描述**出来交给调用方执行。
 * 记忆与水仙协议的判定在这里基于请求发起时的快照完成，得到的节点与字段补丁
 * 都是确定的，因此可以在归并阶段安全重放。
 */
export function planNarrativeResponse(
  maiden: Maiden,
  response: AIResponse,
  gameTimePassed: number
): NarrativePlan {
  const effects: NarrativeEffect[] = [];
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
}

/**
 * 把计划归并到实体上。
 *
 * 纯函数：同一个 `current` 与 `plan` 重放多少次都得到相同结果，因此可以安全地
 * 放进 `setMaidens` 的更新函数。属性按增量加到**当前**值上而不是快照值上，
 * 飞行期间的漂移得以保留。
 */
export function reduceMaiden(current: Maiden, plan: NarrativePlan, gameTimePassed: number): Maiden {
  let status = plan.statusRemove.length > 0
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
}

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
  setSystemState,
  setCarriages,
  setMaidens,
  setIsProcessing,
  addLog,
  executeGrace,
  isProcessing,
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
            aiService.generateDeaconessGenesis(effect.maiden, currSystem.gameTimePassed).then(nodes => {
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
  }, [isProcessing, addLog, executeGrace, stateRef, setMaidens, setSystemState, setCarriages, setIsProcessing]);

  return {
    moveMaster,
    focusMaiden,
    handleAction
  };
};