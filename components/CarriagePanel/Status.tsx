
// ============================================
// 系统状态组件
// 显示熵值、共振频率等关键指标
// ============================================

import React, { memo } from 'react';
import { SystemState, Carriage } from '../../meta';
import { useGameEngine } from '../../engines';

interface StatusProps {
    systemState: SystemState;
    carriages: Map<string, Carriage>;
    maidensInCarriageCount: number;
    isInAbyss: boolean;
}

export const Status: React.FC<StatusProps> = memo(({
    systemState,
    carriages,
    maidensInCarriageCount,
    isInAbyss,
}) => {
    const { getPregnancyStats } = useGameEngine();

    return (
        <div className={`panel flex flex-col shrink-0 ${isInAbyss ? 'panel-abyss' : ''}`}>
            <div className="panel-header flex items-center justify-between shrink-0">
                <h3 className="font-tech text-[10px] uppercase text-zinc-400 tracking-widest">System Status</h3>
                <span className={`w-1.5 h-1.5 rounded-full ${systemState.entropyLevel > 70 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
            </div>

            <div className="p-2.5 space-y-2.5 font-tech text-xs">
                {/* 熵值 */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-zinc-500 text-[10px]">ENTROPY</span>
                        <span className={`font-mono ${systemState.entropyLevel > 70 ? 'text-red-400' : systemState.entropyLevel > 40 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                            {systemState.entropyLevel}%
                        </span>
                    </div>
                    <div className="progress-bar-mini">
                        <div className={`progress-fill ${systemState.entropyLevel > 70 ? 'bg-red-500' : systemState.entropyLevel > 40 ? 'bg-yellow-500' : 'bg-zinc-500'}`} style={{ width: `${systemState.entropyLevel}%` }} />
                    </div>
                </div>

                {/* 共振 */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-zinc-500 text-[10px]">RESONANCE</span>
                        <span className={`font-mono ${systemState.resonanceFrequency < 20 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`}>
                            {systemState.resonanceFrequency}Hz
                        </span>
                    </div>
                    <div className="progress-bar-mini">
                        <div className="progress-fill bg-purple-500" style={{ width: `${Math.min(100, systemState.resonanceFrequency * 2)}%` }} />
                    </div>
                </div>

                {/* 同步率 */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-zinc-500 text-[10px]">FERTILITY SYNC</span>
                        <span className="text-pink-400 font-mono">{systemState.globalFertilitySync}%</span>
                    </div>
                    <div className="progress-bar-mini">
                        <div className="progress-fill bg-pink-500" style={{ width: `${systemState.globalFertilitySync}%` }} />
                    </div>
                </div>

                {/* 神恩池 */}
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-zinc-500 text-[10px]">GRACE POOL</span>
                        <span className="text-amber-400 font-mono">{systemState.gracePoolSize}</span>
                    </div>
                    <div className="progress-bar-mini">
                        <div className="progress-fill bg-amber-500" style={{ width: `${systemState.gracePoolSize}%` }} />
                    </div>
                </div>

                {/* 统计信息 - 紧凑展示 */}
                <div className="pt-2 mt-1 border-t border-zinc-800/50 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
                    <div className="flex justify-between">
                        <span className="text-zinc-600">HUB</span>
                        <span className="text-zinc-400 font-mono">{systemState.hubConfiguration}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">TIME</span>
                        <span className={`font-mono ${systemState.isPaused ? 'text-yellow-400' : 'text-zinc-400'}`}>
                            {systemState.timeScale}x{systemState.isPaused ? ' (PAUSED)' : ''}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">CURRENT</span>
                        <span className="text-zinc-300 font-mono">{maidensInCarriageCount}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">ABYSS</span>
                        <span className="text-purple-400 font-mono">{Array.from(carriages.values()).filter(c => c.category === 'abyss').length}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-600">GRAVID</span>
                        <span className="text-pink-400 font-mono">{getPregnancyStats().total}</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

Status.displayName = 'Status';
