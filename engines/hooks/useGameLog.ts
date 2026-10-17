// ============================================
// 游戏日志 Hook
// 管理游戏内的文本日志记录
// ============================================

import { useState, useCallback } from 'react';
import { GameLog, LogType } from '../../meta';
import { GAME_CONFIG } from '../../constants';
import { generateId } from '../../const';

export const useGameLog = () => {
  const [logs, setLogs] = useState<GameLog[]>([]);

  const addLog = useCallback((type: LogType, content: string, speaker?: string, carriageId?: string) => {
    setLogs(prev => [
      ...prev,
      { id: generateId(), timestamp: Date.now(), type, content, speaker, carriageId },
    ].slice(-GAME_CONFIG.MAX_LOGS));
  }, []);

  return { logs, addLog, setLogs };
};