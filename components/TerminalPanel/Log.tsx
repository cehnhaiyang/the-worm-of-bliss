
// ============================================
// 终端日志组件
// 显示游戏日志，支持多种日志类型过滤和搜索
// ============================================

import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { GameLog, LogType } from '../../meta';

/**
 * 日志类型的视觉样式：容器底色、标签行颜色、标签文字。
 *
 * 只有本组件消费，故不再经 constants 中转；标签文字与配色是同一处设计决定，
 * 拆开放会让"改配色时忘了改标签"这类不一致无从对照。
 */
const LOG_STYLES: Record<LogType, { container: string; label: string; labelText: string }> = {
  player: {
    container: 'bg-blue-900/20 text-blue-100 border-l-2 border-blue-500',
    label: 'text-blue-400',
    labelText: 'ME'
  },
  system: {
    container: 'text-yellow-500 font-mono text-xs bg-yellow-900/10 border-l-2 border-yellow-600/50',
    label: 'text-yellow-600',
    labelText: 'SYSTEM'
  },
  narrative: {
    container: 'text-zinc-300 bg-zinc-900/30 border-l-2 border-zinc-600',
    label: 'text-zinc-500',
    labelText: 'NARRATIVE'
  },
  thought: {
    container: 'bg-pink-900/10 text-pink-200 italic font-serif border-r-2 border-pink-500',
    label: 'text-pink-400',
    labelText: ''
  },
  abyss: {
    container: 'bg-purple-900/20 text-purple-300 border-l-2 border-purple-500 font-mono',
    label: 'text-purple-400',
    labelText: 'ABYSS'
  },
  grace: {
    container: 'bg-amber-900/20 text-amber-200 border-l-2 border-amber-500',
    label: 'text-amber-400',
    labelText: 'GRACE'
  },
  ritual: {
    container: 'bg-red-900/20 text-red-200 border-l-2 border-red-500',
    label: 'text-red-400',
    labelText: 'RITUAL'
  },
  movement: {
    container: 'text-cyan-400 font-mono text-xs bg-cyan-900/10 border-l-2 border-cyan-600/50',
    label: 'text-cyan-600',
    labelText: 'MOVE'
  },
  social: {
    container: 'text-emerald-400 font-serif text-xs bg-emerald-900/10 border-l-2 border-emerald-600/50',
    label: 'text-emerald-600',
    labelText: 'SOCIAL'
  }
};

/** 过滤器按钮的取值与文案；顺序即按钮顺序，前 6 个是默认展示的一行 */
const LOG_FILTER_OPTIONS: { value: LogType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'narrative', label: '叙事' },
  { value: 'thought', label: '心声' },
  { value: 'player', label: '指令' },
  { value: 'system', label: '系统' },
  { value: 'abyss', label: '深渊' },
  { value: 'grace', label: '神恩' },
  { value: 'ritual', label: '仪式' },
  { value: 'movement', label: '移动' },
  { value: 'social', label: '社交' },
];

// ============================================
// 类型定义
// ============================================

interface LogProps {
  logs: GameLog[];
  onClearLogs?: () => void;
}

interface LogFilterButtonProps {
  value: LogType | 'all';
  label: string;
  isActive: boolean;
  count?: number;
  onClick: (value: LogType | 'all') => void;
}

interface LogItemProps {
  log: GameLog;
  compactMode: boolean;
}

interface LogEmptyStateProps {
  hasFilters: boolean;
  onClearSearch: () => void;
}

// ============================================
// 工具函数
// ============================================

const formatLogTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// ============================================
// 子组件：过滤按钮
// ============================================

const LogFilterButton = memo<LogFilterButtonProps>(({ value, label, isActive, count, onClick }) => (
  <button
    onClick={() => onClick(value)}
    className={`px-2 py-0.5 text-[10px] border rounded transition-colors font-mono ${isActive
        ? 'bg-zinc-800 border-zinc-600 text-zinc-200'
        : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
      }`}
    title={`${label} (${count ?? 0})`}
  >
    {label}
    {count !== undefined && count > 0 && <span className="ml-1 opacity-50">{count}</span>}
  </button>
));

LogFilterButton.displayName = 'LogFilterButton';

// ============================================
// 子组件：日志条目
// ============================================

const LogItem = memo<LogItemProps>(({ log, compactMode }) => {
  const style = LOG_STYLES[log.type];
  const isThought = log.type === 'thought';
  const isAbyss = log.type === 'abyss';
  const isRitual = log.type === 'ritual';
  const isGrace = log.type === 'grace';

  // 替换特定的视觉标记为文本标记
  const renderPrefix = () => {
    if (isAbyss) return <span className="text-purple-500 mr-1">[ABYSS]</span>;
    if (isRitual) return <span className="text-red-500 mr-1">[RITUAL]</span>;
    if (isGrace) return <span className="text-amber-500 mr-1">[GRACE]</span>;
    return null;
  };

  return (
    <div className={`font-mono text-xs ${isThought ? 'flex justify-end' : ''}`}>
      {!compactMode && (
        <div className={`flex items-center gap-2 text-[10px] mb-0.5 opacity-60 ${style.label}`}>
          <span className="text-zinc-600">[{formatLogTime(log.timestamp)}]</span>
          {log.speaker ? (
            <span className="font-bold uppercase">{log.speaker}</span>
          ) : style.labelText && (
            <span className="uppercase tracking-wider">{style.labelText}</span>
          )}
          {log.carriageId && (
            <span className="text-zinc-700">@{log.carriageId}</span>
          )}
        </div>
      )}

      <div className={`
        relative rounded border
        ${compactMode ? 'py-1 px-2' : 'py-2 px-3'}
        ${style.container}
        ${isThought ? 'max-w-[90%] text-right border-r-2 border-r-zinc-600 border-y-0 border-l-0 bg-zinc-900/30' : 'max-w-full border-l-2 border-l-zinc-700 border-y-0 border-r-0 bg-zinc-900/20'}
      `}>
        {renderPrefix()}
        <span className="whitespace-pre-wrap leading-relaxed">{log.content}</span>
      </div>
    </div>
  );
});

LogItem.displayName = 'LogItem';

// ============================================
// 子组件：空状态
// ============================================

const LogEmptyState = memo<LogEmptyStateProps>(({ hasFilters, onClearSearch }) => (
  <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-10 font-mono">
    <div className="mb-2 text-2xl opacity-20">NO_DATA</div>
    <p className="text-xs">{hasFilters ? 'NO MATCHING LOGS FOUND' : 'AWAITING SYSTEM DATA...'}</p>
    {hasFilters && (
      <button
        onClick={onClearSearch}
        className="mt-4 text-[10px] px-3 py-1 border border-zinc-700 rounded hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
      >
        [CLEAR FILTERS]
      </button>
    )}
  </div>
));

LogEmptyState.displayName = 'LogEmptyState';

// ============================================
// 主组件：日志面板
// ============================================

export const Log: React.FC<LogProps> = memo(({ logs, onClearLogs }) => {
  // 引用与状态
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // 数据处理
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filter !== 'all') {
      result = result.filter(log => log.type === filter);
    }

    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(log =>
        log.content.toLowerCase().includes(searchLower) ||
        (log.speaker && log.speaker.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [logs, filter, searchText]);

  const logStats = useMemo(() => {
    const stats: Partial<Record<LogType, number>> = {};
    for (const log of logs) {
      stats[log.type] = (stats[log.type] || 0) + 1;
    }
    return stats;
  }, [logs]);

  // 滚动逻辑
  useEffect(() => {
    if (autoScroll && filteredLogs.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    if (isAtBottom && !autoScroll) setAutoScroll(true);
    else if (!isAtBottom && autoScroll) setAutoScroll(false);
  }, [autoScroll]);

  // 动作处理
  const exportLogs = useCallback(() => {
    const content = filteredLogs.map(log =>
      `[${formatLogTime(log.timestamp)}] [${log.type.toUpperCase()}] ${log.speaker ? `<${log.speaker}> ` : ''}${log.content}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOG_${new Date().toISOString().slice(0, 10)}.TXT`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    setAutoScroll(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  }, []);

  const clearSearch = useCallback(() => setSearchText(''), []);

  // ============================================
  // 渲染
  // ============================================

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black/40 border border-zinc-800/50 rounded-md font-mono">
      {/* 工具栏 */}
      <div className="flex flex-col border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex items-center justify-between p-1.5">
          {/* 过滤器 */}
          <div className="flex items-center gap-1 flex-wrap">
            {LOG_FILTER_OPTIONS.slice(0, 6).map(opt => (
              <LogFilterButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                isActive={filter === opt.value}
                count={opt.value === 'all' ? logs.length : logStats[opt.value as LogType]}
                onClick={setFilter}
              />
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`btn btn-ghost px-1.5 py-0.5 text-[10px] ${showSearch ? 'text-blue-400' : 'text-zinc-500'}`}
              title="搜索"
            >
              [SEARCH]
            </button>
            <button
              onClick={() => setCompactMode(!compactMode)}
              className={`btn btn-ghost px-1.5 py-0.5 text-[10px] ${compactMode ? 'text-purple-400' : 'text-zinc-500'}`}
              title="紧凑模式"
            >
              {compactMode ? '[COMPACT]' : '[NORMAL]'}
            </button>
            <button onClick={exportLogs} className="btn btn-ghost px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300" title="导出">
              [EXP]
            </button>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`btn btn-ghost px-1.5 py-0.5 text-[10px] ${autoScroll ? 'text-emerald-500' : 'text-yellow-600'}`}
              title="自动滚动"
            >
              {autoScroll ? '[AUTO]' : '[PAUSE]'}
            </button>
          </div>
        </div>

        {/* 搜索栏 */}
        {showSearch && (
          <div className="flex items-center gap-2 p-1.5 bg-zinc-900/50 border-t border-zinc-800/30">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-[10px]"></span>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="SEARCH QUERY..."
                className="w-full bg-black/50 border border-zinc-800 rounded py-1 pl-5 pr-6 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                autoFocus
              />
              {searchText && (
                <button
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 hover:text-red-400"
                >
                  [X]
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 日志列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-2 custom-scrollbar ${compactMode ? 'space-y-1' : 'space-y-2'}`}
      >
        {filteredLogs.length === 0 ? (
          <LogEmptyState hasFilters={!!(filter !== 'all' || searchText)} onClearSearch={clearSearch} />
        ) : (
          filteredLogs.map(log => (
            <LogItem key={log.id} log={log} compactMode={compactMode} />
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* 底部状态栏 */}
      <div className="flex justify-between items-center px-2 py-1 bg-zinc-950 border-t border-zinc-800/50 text-[9px] text-zinc-600">
        <div className="flex gap-2">
          <span>TOTAL: {logs.length}</span>
          <span>DISPLAY: {filteredLogs.length}</span>
          {searchText && <span className="text-blue-500">FILTERING</span>}
          {!autoScroll && <span className="text-yellow-600">SCROLL LOCKED</span>}
        </div>

        <div className="flex gap-1">
          <button onClick={scrollToTop} className="hover:text-zinc-300" title="顶部">[TOP]</button>
          <button onClick={scrollToBottom} className="hover:text-zinc-300" title="底部">[BTM]</button>
          {onClearLogs && (
            <button onClick={onClearLogs} className="hover:text-red-400 ml-2" title="清空">[CLR]</button>
          )}
        </div>
      </div>
    </div>
  );
});

Log.displayName = 'Log';
