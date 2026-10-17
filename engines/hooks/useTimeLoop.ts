import { useEffect, useRef, useCallback } from 'react';
import { Carriage, Maiden, SystemState, MasterState, LogType, StateChange } from '../../meta';
import { GAME_CONFIG, TIME_CONFIG, formatGameTime, getTimePeriod, TimePeriod } from '../../constants';
import { maidenSystem, carriageSystem } from '../systems';
import { audioService } from '../services';
import { getCurrentCarriageId, setCurrentCarriageId, completeMovement } from '../../meta/utils';

// 入参契约
interface UseTimeLoopParams {
  stateRef: React.RefObject<{
    systemState: SystemState;
    carriages: Map<string, Carriage>;
    maidens: Map<string, Maiden>;
    masterState: MasterState;
  }>;
  setSystemState: React.Dispatch<React.SetStateAction<SystemState>>;
  setCarriages: React.Dispatch<React.SetStateAction<Map<string, Carriage>>>;
  setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;
  addLog: (type: LogType, content: string, speaker?: string, carriageId?: string) => void;
  executeGrace: (targetId: string, manual: boolean) => void;
}

// 出参契约
interface UseTimeLoopReturn {
  getFormattedGameTime: () => string;
}

export const useTimeLoop = ({
  stateRef,
  setSystemState,
  setCarriages,
  setMaidens,
  addLog,
  executeGrace
}: UseTimeLoopParams): UseTimeLoopReturn => {
  const tickRef = useRef<number | null>(null);
  const lastHubShuffle = useRef(Date.now());
  const lastGraceCheck = useRef(Date.now());
  const lastTimePeriod = useRef<TimePeriod | null>(null);
  const pendingChanges = useRef<StateChange[]>([]);
  const lastLogFlush = useRef(Date.now());

  // 批量输出日志
  const flushChangeLogs = useCallback(() => {
    if (!stateRef.current) return;

    const changes = pendingChanges.current;
    if (changes.length === 0) return;

    const { masterState } = stateRef.current;
    const grouped = new Map<string, StateChange[]>();

    for (const change of changes) {
      const key = change.changeType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(change);
    }

    for (const [, typeChanges] of grouped) {
      const localChanges = typeChanges.filter(c => c.carriageId === masterState.carriageId);
      const otherChanges = typeChanges.filter(c => c.carriageId !== masterState.carriageId);

      for (const change of localChanges) {
        addLog(change.logType, change.description, undefined, change.carriageId);
      }

      if (otherChanges.length > 3) {
        const names = otherChanges.slice(0, 3).map(c => c.maidenName).join('、');
        const extra = otherChanges.length - 3;
        const desc = otherChanges[0].description.replace(otherChanges[0].maidenName, '');
        addLog('system', `${names} 等${extra > 0 ? `${extra + 3}人` : ''}${desc}`, undefined, 'SYSTEM');
      } else {
        for (const change of otherChanges) {
          addLog(change.logType, change.description, undefined, change.carriageId);
        }
      }
    }

    pendingChanges.current = [];
  }, [addLog, stateRef]);

  useEffect(() => {
    // 全局事件处理
    const handleSystemEvents = (now: number, system: SystemState, carriages: Map<string, Carriage>) => {
      // --- 枢纽定时重组 (手动计时，独立于 CarriageSystem.checkSystemAnomalies) ---
      if (now - lastHubShuffle.current > GAME_CONFIG.HUB_SHUFFLE_INTERVAL_MS) {
        lastHubShuffle.current = now;
        if (Math.random() < GAME_CONFIG.HUB_SHUFFLE_CHANCE) {
          setCarriages(prev => {
            const newMap = new Map(prev);
            carriageSystem.shuffle(newMap);
            return newMap;
          });
          addLog('system', '>>> 枢纽重组 >>> 空间折叠完成，车厢位置已重新排列', undefined, 'SYSTEM');
          audioService.playEvent('hub_shuffle');

          setSystemState(prev => ({
            ...prev,
            entropyLevel: Math.max(0, prev.entropyLevel - 10)
          }));
        }
      }

      // --- 熵值/共振异常检测（委托给 CarriageSystem，结果并入主事件流）---
      const systemAnomalies = carriageSystem.checkSystemAnomalies(system);
      for (const anomaly of systemAnomalies) {
        addLog(anomaly.logType, anomaly.description, 'SYSTEM', 'SYSTEM');
        for (const effect of anomaly.effects) {
          if (effect.type === 'system') {
            const sounds = carriageSystem.applySystemEffect(effect.key, effect.value, {
              updateSystemState: setSystemState,
              updateCarriages: setCarriages,
              addLog,
            });
            for (const sound of sounds) audioService.playEvent(sound);
          }
        }
      }

      // --- 自动神恩发放 ---
      if (now - lastGraceCheck.current > GAME_CONFIG.GRACE_CHECK_INTERVAL_MS) {
        lastGraceCheck.current = now;
        if (system.gracePoolSize > 0 && Math.random() < GAME_CONFIG.AUTO_GRACE_CHANCE) {
          if (!stateRef.current) return;
          const allMaidens = Array.from(stateRef.current.maidens.values());
          const stressedMaidens = allMaidens.filter(m => m.attributes.stress > 60);
          const candidates = stressedMaidens.length > 0 ? stressedMaidens : allMaidens;

          if (candidates.length > 0) {
            const luckyOne = candidates[Math.floor(Math.random() * candidates.length)];
            executeGrace(luckyOne.id, false);
          }
        }
      }
    };

    // 时间段变化检测
    const checkTimePeriodChange = (gameTimeMs: number) => {
      const hours = Math.floor((gameTimeMs / TIME_CONFIG.MS_PER_HOUR) % 24);
      const currentPeriod = getTimePeriod(hours);

      if (lastTimePeriod.current !== null && lastTimePeriod.current !== currentPeriod) {
        const periodNames: Record<TimePeriod, string> = {
          [TimePeriod.DAWN]: '黎明降临，微光穿透虚空',
          [TimePeriod.MORNING]: '晨曦初现，新的一天开始',
          [TimePeriod.NOON]: '正午时分，列车在虚空中穿行',
          [TimePeriod.AFTERNOON]: '午后时光，空气中弥漫着慵懒',
          [TimePeriod.EVENING]: '暮色降临，阴影开始蔓延',
          [TimePeriod.NIGHT]: '夜幕笼罩，深渊的低语愈发清晰',
        };
        addLog('narrative', periodNames[currentPeriod], undefined, 'SYSTEM');
      }
      lastTimePeriod.current = currentPeriod;
    };

    // 单个实体处理管道
    const processMaiden = (
      id: string,
      maiden: Maiden,
      nextCarriages: Map<string, Carriage>,
      nextMaidens: Map<string, Maiden>,
      gameDeltaMs: number,
      newGameTime: number,
      sys: SystemState,
      now: number
    ): { updatedMaiden: Maiden; changes: StateChange[]; carriagesChanged: boolean } => {
      const currentCarriageId = getCurrentCarriageId(maiden);
      const carriage = nextCarriages.get(currentCarriageId);
      if (!carriage) return { updatedMaiden: maiden, changes: [], carriagesChanged: false };

      let carriagesChanged = false;
      const beforeMaiden = maiden;

      // --- 1. 属性/状态更新 ---
      let updatedMaiden = maidenSystem.updateMaidenState(
        maiden, carriage, gameDeltaMs, sys.resonanceFrequency, newGameTime
      );

      // --- 2. 行为决策 ---
      const behaviorResult = maidenSystem.decideMaidenBehavior(
        updatedMaiden, carriage, nextCarriages, nextMaidens, newGameTime
      );

      updatedMaiden = { ...updatedMaiden, behavior: behaviorResult.behavior };

      if (behaviorResult.movement) {
        updatedMaiden = { ...updatedMaiden, movement: behaviorResult.movement };
      }

      // --- 3. 移动执行（单步推进）---
      // movement.intent.movementPath[0] 是下一跳目标，完成移动后由 completeMovement 清理
      if (
        updatedMaiden.movement?.isMoving &&
        updatedMaiden.movement?.intent?.movementPath &&
        updatedMaiden.movement.intent.movementPath.length > 0
      ) {
        const targetId = updatedMaiden.movement.intent.movementPath[0];
        const targetCarriage = nextCarriages.get(targetId);

        if (targetCarriage && targetCarriage.isAccessible) {
          // 从旧车厢移除
          const oldOccupants = carriage.occupants.filter(oid => oid !== id);
          nextCarriages.set(carriage.id, { ...carriage, occupants: oldOccupants });

          // 加入新车厢
          const newOccupants = [...targetCarriage.occupants, id];
          nextCarriages.set(targetCarriage.id, { ...targetCarriage, occupants: newOccupants });

          updatedMaiden = setCurrentCarriageId(updatedMaiden, targetId);
          updatedMaiden = { ...updatedMaiden, movement: completeMovement(updatedMaiden.movement) };
          carriagesChanged = true;
        }
      }

      // --- 4. 着装同步（活动与车厢此时均已确定）---
      // 着装是派生态：由当前活动 + 所在车厢现算，无变化时返回 null，避免每 tick 产生新引用
      {
        const currentCarriageAfterMove = nextCarriages.get(getCurrentCarriageId(updatedMaiden));
        if (currentCarriageAfterMove) {
          const derivedClothing = maidenSystem.clothing.deriveClothing(updatedMaiden, currentCarriageAfterMove.type);
          if (derivedClothing) {
            updatedMaiden = { ...updatedMaiden, clothing: derivedClothing };
          }
        }
      }

      // --- 5. 社交超时/目标离场清理 ---
      if (updatedMaiden.behavior.socialContext) {
        const socialElapsed = now - updatedMaiden.behavior.socialContext.startTime;
        const socialDuration = updatedMaiden.behavior.activityDuration || 10 * 60 * 1000;
        // 获取当前最新车厢（移动后位置可能已变）
        const currentOccupants = nextCarriages.get(getCurrentCarriageId(updatedMaiden))?.occupants ?? [];
        const targetStillHere = currentOccupants.includes(updatedMaiden.behavior.socialContext.targetId);

        if (socialElapsed >= socialDuration || !targetStillHere) {
          updatedMaiden = {
            ...updatedMaiden,
            behavior: {
              ...updatedMaiden.behavior,
              socialContext: undefined,
              currentActivity: 'wandering',
            }
          };
        }
      }

      // --- 6. 社交互动（静止且无当前社交上下文时触发）---
      const updatedCarriage = nextCarriages.get(getCurrentCarriageId(updatedMaiden));
      if (
        updatedCarriage &&
        !updatedMaiden.movement?.isMoving &&
        !updatedMaiden.behavior.socialContext &&
        updatedCarriage.occupants.length > 1
      ) {
        const result = maidenSystem.processSocialInteractions(
          updatedMaiden, updatedCarriage.occupants, nextMaidens, updatedCarriage, gameDeltaMs
        );
        if (result.updatedMaiden) {
          updatedMaiden = result.updatedMaiden;
          if (result.log) addLog('social', result.log, undefined, updatedCarriage.id);
          if (result.updatedTarget) nextMaidens.set(result.updatedTarget.id, result.updatedTarget);
        }
      }

      // --- 7. 水仙协议（新版同时返回 log 和 maidenUpdate）---
      const narcissusResult = maidenSystem.processNarcissusLogic(updatedMaiden, newGameTime);
      if (narcissusResult.log) {
        addLog('system', narcissusResult.log, 'SYSTEM', getCurrentCarriageId(updatedMaiden));
      }
      if (narcissusResult.maidenUpdate && Object.keys(narcissusResult.maidenUpdate).length > 0) {
        updatedMaiden = { ...updatedMaiden, ...narcissusResult.maidenUpdate };
      }

      // --- 8. 妊娠更新 ---
      const pregEvent = maidenSystem.pregnancy.updatePregnancy(updatedMaiden, gameDeltaMs);
      if (pregEvent && pregEvent.description) {
        addLog(pregEvent.logType, pregEvent.description, undefined, getCurrentCarriageId(updatedMaiden));

        if (pregEvent.type === 'labor') {
          const birthEvent = maidenSystem.pregnancy.processBirth(updatedMaiden);
          addLog(birthEvent.logType, birthEvent.description, undefined, getCurrentCarriageId(updatedMaiden));

          audioService.playEvent('grace');
          const postBirthMaiden = maidenSystem.pregnancy.syncToMaiden(updatedMaiden, birthEvent);
          updatedMaiden = {
            ...postBirthMaiden,
            attributes: {
              ...postBirthMaiden.attributes,
              devotion: Math.min(100, postBirthMaiden.attributes.devotion + 10),
            },
            birthCount: postBirthMaiden.birthCount + 1,
          };
          setSystemState(prev => ({ ...prev, gracePoolSize: prev.gracePoolSize + 5 }));
        } else {
          updatedMaiden = maidenSystem.pregnancy.syncToMaiden(updatedMaiden, pregEvent);
        }
      } else if (pregEvent) {
        updatedMaiden = maidenSystem.pregnancy.syncToMaiden(updatedMaiden, pregEvent);
      }

      // --- 9. 心境更新 ---
      const moodResult = maidenSystem.mood.updateMood(updatedMaiden, gameDeltaMs);
      updatedMaiden = moodResult.updatedMaiden;
      if (moodResult.moodChange) {
        addLog(
          moodResult.moodChange.logType,
          moodResult.moodChange.description,
          undefined,
          moodResult.moodChange.carriageId
        );
      }

      // --- 10. 自发行为 ---
      const spontaneousAction = maidenSystem.mood.checkSpontaneousAction(updatedMaiden, newGameTime);
      if (spontaneousAction.actionEvent) {
        addLog(spontaneousAction.actionEvent.logType, spontaneousAction.actionEvent.description, undefined, spontaneousAction.actionEvent.carriageId);
        updatedMaiden = spontaneousAction.updatedMaiden;
      }

      // --- 11. 状态 diff ---
      const changes = maidenSystem.compareStates(beforeMaiden, updatedMaiden);

      return { updatedMaiden, changes, carriagesChanged };
    };

    // 核心流转时钟
    const tick = () => {
      if (!stateRef.current) return;

      const { systemState: sys, carriages: cars, maidens: mds, masterState: master } = stateRef.current;

      if (sys.isPaused) return;

      const now = Date.now();
      const realDeltaMs = now - sys.lastTickTime;
      const gameDeltaMs = realDeltaMs * sys.timeScale;
      const newGameTime = sys.gameTimePassed + gameDeltaMs;

      setSystemState(prev => ({ ...prev, lastTickTime: now, gameTimePassed: newGameTime }));
      checkTimePeriodChange(newGameTime);
      handleSystemEvents(now, sys, cars);

      const nextMaidens = new Map(mds);
      const nextCarriages = new Map(cars);
      const allChanges: StateChange[] = [];
      const updatedMaidenIds: string[] = [];
      let carriagesChanged = false;

      for (const [id, maiden] of mds) {
        const result = processMaiden(id, maiden, nextCarriages, nextMaidens, gameDeltaMs, newGameTime, sys, now);
        nextMaidens.set(id, result.updatedMaiden);
        if (result.changes.length > 0) {
          allChanges.push(...result.changes);
          updatedMaidenIds.push(id);
        }
        if (result.carriagesChanged) carriagesChanged = true;
      }

      if (updatedMaidenIds.length > 0) {
        const events = maidenSystem.event.checkForEvents(
          nextMaidens, nextCarriages, newGameTime, updatedMaidenIds
        );
        for (const event of events) {
          addLog(event.logType, event.description, undefined, event.carriageId);
          const changedMaidens = maidenSystem.eventEffects.applyEventEffects(event, {
            maidens: nextMaidens,
            stateUpdaters: { updateSystemState: setSystemState, updateCarriages: setCarriages, addLog },
            gameTimePassed: newGameTime,
          });
          for (const [mid, m] of changedMaidens) {
            nextMaidens.set(mid, m);
          }
        }
        maidenSystem.relationship.decayRelationships(nextMaidens, gameDeltaMs);
      }

      pendingChanges.current.push(...allChanges);

      if (now - lastLogFlush.current > 5000) {
        flushChangeLogs();
        lastLogFlush.current = now;
      }

      setMaidens(nextMaidens);
      if (carriagesChanged) {
        setCarriages(nextCarriages);
      }
    };

    tickRef.current = window.setInterval(tick, TIME_CONFIG.TICK_INTERVAL_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      flushChangeLogs();
    };
  }, [executeGrace, stateRef, setSystemState, setCarriages, setMaidens, addLog, flushChangeLogs]);

  const getFormattedGameTime = useCallback(() => {
    if (!stateRef.current) return '';
    const { systemState } = stateRef.current;
    return formatGameTime(systemState.gameTimePassed);
  }, [stateRef]);

  return {
    getFormattedGameTime
  };
};