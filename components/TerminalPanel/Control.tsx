
// ============================================
// 控制面板组件
// 处理玩家输入、系统控制及快捷指令
// ============================================

import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import { SystemState } from '../../meta';

/**
 * 快捷指令分类。
 *
 * 指令文案是提示词的一部分而不是可调参数，只有本组件消费，故留在组件内。
 * 前 4 类默认展示，其余收在 [CMD] 展开后——这个切分靠对象键序表达，
 * 因此分类顺序本身就是"重要程度"的声明，改动顺序会改变默认可见的按钮。
 */
const QUICK_COMMANDS = {
  basic: {
    label: '基础',
    commands: [
      { label: '观察', cmd: '仔细观察她现在的状态和表情。' },
      { label: '对话', cmd: '和她说话，询问她的感受。' },
      { label: '抚摸', cmd: '轻轻抚摸她的头发。' },
      { label: '安慰', cmd: '给她一个拥抱，安慰她。' },
    ]
  },
  control: {
    label: '控制',
    commands: [
      { label: '命令', cmd: '命令她跪下。' },
      { label: '惩罚', cmd: '她需要被惩罚。' },
      { label: '训诫', cmd: '严厉地训斥她的不服从。' },
      { label: '奖励', cmd: '因为她的顺从给予奖励。' },
    ]
  },
  intimate: {
    label: '亲密',
    commands: [
      { label: '亲吻', cmd: '吻她。' },
      { label: '爱抚', cmd: '爱抚她的身体。' },
      { label: '侵犯', cmd: '侵犯她。' },
      { label: '标记', cmd: '在她身上留下印记。' },
    ]
  },
  psychological: {
    label: '心理',
    commands: [
      { label: '审视', cmd: '审视她的内心，探究她的恐惧。' },
      { label: '暗示', cmd: '在她耳边低语，植入暗示。' },
      { label: '记忆', cmd: '触发她的记忆，让她回忆过去。' },
      { label: '崩溃', cmd: '打破她最后的心理防线。' },
    ]
  },
  movement: {
    label: '移动',
    commands: [
      { label: '带走', cmd: '带她去另一个车厢。' },
      { label: '隔离', cmd: '把她单独关起来。' },
      { label: '召唤', cmd: '命令她来到我面前。' },
      { label: '驱逐', cmd: '把她赶到深渊区域。' },
    ]
  },
  ritual: {
    label: '仪式',
    commands: [
      { label: '献祭', cmd: '开始献祭仪式。' },
      { label: '洗礼', cmd: '为她进行洗礼仪式。' },
      { label: '晋升', cmd: '提升她的等级。' },
      { label: '净化', cmd: '净化她的记忆。' },
    ]
  },
  memory: {
    label: '记忆',
    commands: [
      { label: '唤醒', cmd: '唤醒她的某段记忆。' },
      { label: '篡改', cmd: '篡改她的记忆。' },
      { label: '植入', cmd: '植入一段虚假的记忆。' },
      { label: '抹除', cmd: '抹除她的某段记忆。' },
    ]
  },
  social: {
    label: '社交',
    commands: [
      { label: '引见', cmd: '让她认识另一个少女。' },
      { label: '分离', cmd: '拆散她和她的朋友。' },
      { label: '对质', cmd: '让她和另一个少女对质。' },
      { label: '共犯', cmd: '让她成为我的共犯。' },
    ]
  },
};

/** 时间倍速档位；label 直接显示在按钮上，value 是传给时间系统的倍数 */
const TIME_SCALE_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 5, label: '5x' },
  { value: 10, label: '10x' },
] as const;

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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 数据转换
  const categories = useMemo(() => Object.entries(QUICK_COMMANDS), []);

  const currentCommands = useMemo(() => {
    const cat = QUICK_COMMANDS[activeCategory as keyof typeof QUICK_COMMANDS];
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
        </div>
      </form>
    </div>
  );
});

Control.displayName = 'Control';
