
// ============================================
// 控制面板组件
// 处理玩家输入、系统控制及快捷指令
// ============================================

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { SystemState } from '../../meta';
import { ALL_QUICK_COMMANDS, TIME_SCALE_OPTIONS, UI_CONFIG } from '../../constants';

// ============================================
// 类型定义
// ============================================

interface ControlProps {
  onSend: (text: string) => void;
  disabled: boolean;
  systemState: SystemState;
  onResonanceChange: (delta: number) => void;
  onGrace: () => void;
  onTimeScaleChange: (scale: number) => void;
  onTogglePause: () => void;
  hasFocusedMaiden: boolean;
  focusedMaidenName?: string;
  gameTimeDisplay?: string;
}

interface ControlMetricProps {
  label: string;
  value: string | number;
  colorClass: string;
  isWarning?: boolean;
}

interface ControlCommandButtonProps {
  label: string;
  cmd: string;
  disabled: boolean;
  onSend: (cmd: string) => void;
}

// ============================================
// 子组件：系统指标显示
// ============================================

const ControlMetric = memo<ControlMetricProps>(({ label, value, colorClass, isWarning }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/60 rounded border border-zinc-800/50 font-mono">
    <span className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</span>
    <span className={`text-xs font-bold ${colorClass} ${isWarning ? 'animate-pulse' : ''}`}>
      {value}
    </span>
    {isWarning && <span className="text-red-500 text-[10px] font-bold">[WARN]</span>}
  </div>
));

ControlMetric.displayName = 'ControlMetric';

// ============================================
// 子组件：快捷指令按钮
// ============================================

const ControlCommandButton = memo<ControlCommandButtonProps>(({ label, cmd, disabled, onSend }) => (
  <button
    onClick={() => onSend(cmd)}
    className="btn btn-secondary text-[10px] px-2 py-1 font-mono hover:bg-zinc-800 border-zinc-700/50"
    disabled={disabled}
    title={cmd}
  >
    [{label}]
  </button>
));

ControlCommandButton.displayName = 'ControlCommandButton';

// ============================================
// 主组件：控制面板
// ============================================

export const Control: React.FC<ControlProps> = memo(({
  onSend,
  disabled,
  systemState,
  onResonanceChange,
  onGrace,
  onTimeScaleChange,
  onTogglePause,
  hasFocusedMaiden,
  focusedMaidenName,
}) => {
  // 内部状态
  const [input, setInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('basic');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 数据转换
  const categories = useMemo(() => Object.entries(ALL_QUICK_COMMANDS), []);

  const currentCommands = useMemo(() => {
    const cat = ALL_QUICK_COMMANDS[activeCategory as keyof typeof ALL_QUICK_COMMANDS];
    return cat?.commands || [];
  }, [activeCategory]);

  const canSubmit = !disabled && input.trim().length > 0 && hasFocusedMaiden;
  const canUseCommands = !disabled && hasFocusedMaiden;

  // 样式计算
  const resonanceColor = systemState.resonanceFrequency < 10 ? 'text-red-500' :
    systemState.resonanceFrequency < 20 ? 'text-red-400' :
      systemState.resonanceFrequency < 30 ? 'text-orange-400' : 'text-zinc-400';

  const entropyColor = systemState.entropyLevel > 80 ? 'text-purple-400' :
    systemState.entropyLevel > 60 ? 'text-purple-400' :
      systemState.entropyLevel > 40 ? 'text-yellow-400' : 'text-zinc-400';

  // ============================================
  // 事件处理
  // ============================================

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      setCommandHistory(prev => {
        const newHistory = [input, ...prev.filter(h => h !== input)].slice(0, UI_CONFIG.MAX_COMMAND_HISTORY);
        return newHistory;
      });
      setHistoryIndex(-1);
      onSend(input);
      setInput('');
      // 保持焦点
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [input, canSubmit, onSend]);

  const handleQuickCommand = useCallback((cmd: string) => {
    if (canUseCommands) {
      onSend(cmd);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [canUseCommands, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      setInput('');
      setHistoryIndex(-1);
    }
  }, [commandHistory, historyIndex]);

  // 全局快捷键监听
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ============================================
  // 渲染
  // ============================================

  return (
    <div className="bg-zinc-950 border-t border-zinc-800/60 p-2.5 space-y-2.5 font-mono">
      {/* 顶部控制栏 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* 共振频率调节 */}
        <div className="flex items-center bg-zinc-900/70 rounded border border-zinc-800/50">
          <button
            onClick={() => onResonanceChange(-5)}
            className="px-2 py-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30"
            disabled={disabled}
            title="降低频率"
          >
            [-]
          </button>
          <div className="px-2 py-1 min-w-[5rem] text-center border-x border-zinc-800/30 flex flex-col justify-center">
            <span className="text-[8px] text-zinc-600 leading-none mb-0.5">RESONANCE</span>
            <span className={`font-bold leading-none ${resonanceColor}`}>
              {systemState.resonanceFrequency}Hz
            </span>
          </div>
          <button
            onClick={() => onResonanceChange(5)}
            className="px-2 py-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30"
            disabled={disabled}
            title="提高频率"
          >
            [+]
          </button>
        </div>

        {/* 核心指标 */}
        <ControlMetric
          label="ENTROPY"
          value={`${systemState.entropyLevel}%`}
          colorClass={entropyColor}
          isWarning={systemState.entropyLevel > 70}
        />

        <ControlMetric
          label="GRACE"
          value={systemState.gracePoolSize}
          colorClass="text-amber-400"
        />

        <div className="flex-1" />

        {/* 工具栏 */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn btn-ghost text-[10px] px-2 py-1 border ${showAdvanced ? 'bg-zinc-800 border-zinc-600 text-zinc-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            title="切换高级指令"
          >
            [CMD]
          </button>

          <button
            onClick={onTogglePause}
            className={`btn px-2 py-1 text-[10px] border ${systemState.isPaused ? 'btn-primary border-red-900' : 'btn-secondary border-zinc-700'}`}
            title="暂停/继续 (Space)"
          >
            {systemState.isPaused ? '[RESUME]' : '[PAUSE]'}
          </button>

          <div className="flex items-center bg-zinc-900/70 rounded border border-zinc-800/50 overflow-hidden">
            {TIME_SCALE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onTimeScaleChange(opt.value)}
                className={`px-2 py-1 text-[10px] transition-colors ${systemState.timeScale === opt.value
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={onGrace}
            className="btn px-2 py-1 text-[10px] bg-amber-950/30 text-amber-500 border border-amber-900/50 hover:bg-amber-900/40 hover:text-amber-400"
            disabled={disabled || systemState.gracePoolSize <= 0}
            title="施予神恩"
          >
            [GRACE]
          </button>
        </div>
      </div>

      {/* 指令分类 */}
      <div className="flex gap-1 border-b border-zinc-800/30 pb-1.5 overflow-x-auto scrollbar-hidden">
        {categories.slice(0, showAdvanced ? categories.length : 4).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${activeCategory === key
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 快捷指令区 */}
      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
        {currentCommands.length > 0 ? (
          currentCommands.map(({ label, cmd }) => (
            <ControlCommandButton
              key={label}
              label={label}
              cmd={cmd}
              disabled={!canUseCommands}
              onSend={handleQuickCommand}
            />
          ))
        ) : (
          <span className="text-[10px] text-zinc-700 italic px-1">NO COMMANDS AVAILABLE</span>
        )}
      </div>

      {/* 输入区域 */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center">
          {/* 提示符 */}
          <span className={`absolute left-3 text-xs pointer-events-none ${hasFocusedMaiden ? 'text-green-500' : 'text-zinc-600'}`}>
            {hasFocusedMaiden ? '>' : '#'}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!hasFocusedMaiden ? "WAITING FOR TARGET..." : disabled ? "PROCESSING..." : "ENTER COMMAND..."}
            className={`w-full bg-zinc-900/50 border border-zinc-800 rounded py-2 pl-6 pr-16 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-zinc-600 focus:bg-zinc-900 transition-colors ${!hasFocusedMaiden ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled || !hasFocusedMaiden}
            autoFocus
            autoComplete="off"
          />

          <button
            type="submit"
            disabled={!canSubmit}
            className="absolute right-1 px-3 py-1 text-[10px] bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            SEND
          </button>
        </div>

        {/* 状态栏 */}
        <div className="flex justify-between items-center text-[9px] text-zinc-600 mt-1 px-1">
          <div className="flex gap-2">
            <span>{hasFocusedMaiden ? 'TARGET LOCKED' : 'NO TARGET'}</span>
            {focusedMaidenName && <span className="text-zinc-500">[{focusedMaidenName}]</span>}
          </div>
          {commandHistory.length > 0 && historyIndex >= 0 && (
            <span className="text-zinc-500">HIST: {historyIndex + 1}/{commandHistory.length}</span>
          )}
        </div>
      </form>
    </div>
  );
});

Control.displayName = 'Control';
