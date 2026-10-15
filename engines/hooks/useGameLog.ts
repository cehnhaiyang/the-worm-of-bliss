// ============================================
// 游戏日志 Hook
// 管理游戏内的文本日志记录
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { GameLog, LogType } from '../../meta';

export const useGameLog = () => {
  const [logs, setLogs] = useState<GameLog[]>([]);
  const logsRef = useRef<GameLog[]>([]);

  // 保持 logsRef 与 logs 同步
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const addLog = useCallback((type: LogType, content: string, speaker?: string, carriageId?: string) => {
    setLogs(prev => {
      const newLogs = [...prev, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type,
        content,
        speaker,
        carriageId,
      }];
      // 仅保留最近500条日志以优化性能
      return newLogs.slice(-500);
    });
  }, []);

  return { logs, logsRef, addLog, setLogs };
};