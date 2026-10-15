
// ============================================
// 启动画面组件
// 显示游戏标题和加载状态
// ============================================

import React, { useState, useEffect, useRef, memo } from 'react';

// ============================================
// Props 接口
// ============================================

interface SplashScreenProps {
  onComplete: () => void;
  isLoading: boolean;
}

// ============================================
// 加载阶段常量
// ============================================

const LOADING_STAGES = [
  { progress: 10, text: '连接奇点反应堆...', textEn: 'Connecting to Singularity Reactor...' },
  { progress: 25, text: '校准共振圣歌频率...', textEn: 'Calibrating Resonance Hymn...' },
  { progress: 40, text: '加载车厢矩阵 [5×50]...', textEn: 'Loading Carriage Matrix [5×50]...' },
  { progress: 55, text: '初始化250个单位档案...', textEn: 'Initializing 250 Unit Profiles...' },
  { progress: 70, text: '同步全知之眼传感器...', textEn: 'Syncing Omniscient Eye Sensors...' },
  { progress: 85, text: '激活神恩算法...', textEn: 'Activating Grace Algorithm...' },
  { progress: 95, text: '权限确认中...', textEn: 'Verifying Authority...' },
  { progress: 100, text: '系统就绪', textEn: 'System Ready' },
] as const;

// ============================================
// 主组件
// ============================================

export const SplashScreen: React.FC<SplashScreenProps> = memo(({ onComplete, isLoading }) => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('初始化神经链接...');
  const [statusTextEn, setStatusTextEn] = useState('Initializing Neural Link...');
  const [isReady, setIsReady] = useState(false);
  const stageIndex = useRef(0);

  // 模拟加载进度
  useEffect(() => {
    const interval = setInterval(() => {
      if (stageIndex.current < LOADING_STAGES.length) {
        const stage = LOADING_STAGES[stageIndex.current];
        setProgress(stage.progress);
        setStatusText(stage.text);
        setStatusTextEn(stage.textEn);
        stageIndex.current++;
      } else {
        clearInterval(interval);
        if (!isLoading) {
          setIsReady(true);
        }
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isLoading]);

  // 当外部加载状态变为 false 且动画未完成时，不立即就绪，等待动画
  useEffect(() => {
    if (!isLoading && progress === 100) {
      setIsReady(true);
    }
  }, [isLoading, progress]);

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0">
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-black to-red-950/20" />
        
        {/* 扫描线 */}
        <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)]" />
        
        {/* 动态光晕 */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-900/8 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-red-900/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* 边缘暗角 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>

      {/* 主内容 */}
      <div className="relative z-10 text-center px-8">
        {/* 标题 */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-red-600/60 text-2xl">◈</span>
          </div>
          <h1 className="font-header text-4xl md:text-5xl text-zinc-100 tracking-[0.25em] mb-3 drop-shadow-[0_0_40px_rgba(220,38,38,0.25)]">
            THE WORM OF BLISS
          </h1>
          <p className="text-zinc-600 text-xs tracking-[0.4em] font-tech uppercase">
            至乐之蠕虫
          </p>
        </div>

        {/* 装饰线 */}
        <div className="flex items-center justify-center gap-4 my-6">
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
          <span className="text-red-900/40 text-sm">✧</span>
          <div className="w-20 h-px bg-gradient-to-r from-transparent via-red-900/40 to-transparent" />
        </div>

        {/* 引言 */}
        <div className="max-w-lg mx-auto mb-10">
          <p className="text-zinc-600 text-sm italic leading-relaxed font-serif">
            "欢迎来到我的天堂。一个以侵犯为基石，以怀孕为使命，以食子为圣餐的，绝对完美的世界。"
          </p>
        </div>

        {/* 加载条区域 */}
        <div className="w-72 mx-auto min-h-[90px] flex flex-col justify-center">
          {!isReady ? (
            <>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-red-800 via-red-600 to-red-800 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(220,38,38,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="space-y-1">
                <p className="text-zinc-500 text-xs font-tech tracking-wide">
                  {statusText}
                </p>
                <p className="text-zinc-700 text-[9px] font-mono uppercase tracking-wider">
                  {statusTextEn}
                </p>
              </div>
              
              <p className="text-zinc-800 text-[10px] font-mono mt-3">
                {progress}%
              </p>
            </>
          ) : (
            <button
              onClick={onComplete}
              className="group relative px-8 py-3 bg-transparent overflow-hidden rounded transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-red-950/30 group-hover:bg-red-900/40 transition-colors" />
              <div className="absolute inset-0 border border-red-800/50 group-hover:border-red-600/70 transition-colors rounded" />
              <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
              
              <span className="relative font-header text-base text-red-100 tracking-[0.2em] group-hover:text-white transition-colors">
                ENTER SYSTEM
              </span>
            </button>
          )}
        </div>

        {/* 警告 */}
        <div className="mt-12 space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-950/20 border border-red-900/30 rounded text-red-400/80 text-xs">
            <span>⚠</span>
            <span>本作品包含成人内容，仅供18岁以上用户</span>
          </div>
          <p className="text-zinc-800 text-[9px] font-tech uppercase tracking-wider">
            MATURE CONTENT - 18+ ONLY
          </p>
        </div>
      </div>

      {/* 版本信息 */}
      <div className="absolute bottom-5 left-5 text-zinc-800 text-[9px] font-mono">
        <p className="text-zinc-700">v0.2.1</p>
        <p className="text-zinc-900">React 19 + Gemini 2.5 Flash</p>
      </div>

      {/* 装饰角标 */}
      <div className="absolute top-5 left-5 w-6 h-6 border-l border-t border-red-900/20" />
      <div className="absolute top-5 right-5 w-6 h-6 border-r border-t border-red-900/20" />
      <div className="absolute bottom-5 left-5 w-6 h-6 border-l border-b border-red-900/20" />
      <div className="absolute bottom-5 right-5 w-6 h-6 border-r border-b border-red-900/20" />
    </div>
  );
});

SplashScreen.displayName = 'SplashScreen';
