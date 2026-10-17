
// ============================================
// 怀孕状态全屏面板
// ============================================

import React, { memo } from 'react';
import { Maiden, CharacterStatus } from '../../../../meta';
import { useGameEngine } from '../../../../engines';

interface PregnancyProps {
  maiden: Maiden;
  onClose: () => void;
  onMaidenSelect: (maidenId: string) => void;
}

const STAGE_STYLES: Record<string, { color: string; bgColor: string; label: string }> = {
  none: { color: 'text-zinc-500', bgColor: 'bg-zinc-800/50', label: '无' },
  conception: { color: 'text-blue-400', bgColor: 'bg-blue-900/30', label: '受孕' },
  early: { color: 'text-cyan-400', bgColor: 'bg-cyan-900/30', label: '早期' },
  middle: { color: 'text-green-400', bgColor: 'bg-green-900/30', label: '中期' },
  late: { color: 'text-yellow-400', bgColor: 'bg-yellow-900/30', label: '晚期' },
  labor: { color: 'text-red-400', bgColor: 'bg-red-900/30', label: '临产' },
};

interface PregnancyItemProps {
  maiden: Maiden;
  weekNumber: number;
  stage: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PregnancyItem = memo<PregnancyItemProps>(({ maiden, weekNumber, stage, isSelected, onSelect }) => {
  const stageStyle = STAGE_STYLES[stage] || STAGE_STYLES.none;
  const progress = (weekNumber / 40) * 100;
  const isLabor = stage === 'labor';

  return (
    <button
      onClick={() => onSelect(maiden.id)}
      className={`w-full p-4 rounded-lg border transition-all ${isSelected ? 'border-pink-500/50 bg-pink-900/20' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'} ${isLabor ? 'animate-pulse' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-mono text-sm">
            {maiden.name.charAt(0)}
          </div>
          <div className="text-left">
            <div className="text-zinc-200 font-medium">{maiden.name}</div>
            <div className="text-[10px] text-zinc-500 font-mono">{maiden.id}</div>
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${stageStyle.color} ${stageStyle.bgColor}`}>
          {stageStyle.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">孕周</span>
          <span className="text-pink-400 font-mono">{Math.floor(weekNumber)} / 40</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isLabor ? 'bg-red-500' : 'bg-gradient-to-r from-pink-600 to-pink-400'}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>受孕</span>
          <span>{Math.round(progress)}%</span>
          <span>分娩</span>
        </div>
      </div>
    </button>
  );
});

PregnancyItem.displayName = 'PregnancyItem';

export const Pregnancy: React.FC<PregnancyProps> = ({ maiden, onClose, onMaidenSelect }) => {
  const { getPregnancies, getPregnancyStats, getPregnancyOf } = useGameEngine();
  const pregnantMaidens = getPregnancies();
  const stats = getPregnancyStats();

  // 未显怀的妊娠不出现在详情里：'pregnant' 标签只在 isDiscovered 后由 syncToMaiden 加上
  const currentMaidenPregnancy = maiden.status.includes(CharacterStatus.PREGNANT)
    ? getPregnancyOf(maiden)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* 顶部栏 */}
      <div className="h-14 border-b border-pink-900/30 bg-zinc-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-header text-zinc-100 tracking-wider">PREGNANCY MONITOR</h2>
          <span className="text-sm text-zinc-500 font-mono">孕育监控系统</span>
          <span className="px-2 py-1 rounded bg-pink-900/30 text-pink-400 text-xs font-mono">{pregnantMaidens.length} ACTIVE</span>
        </div>
        <button onClick={onClose} className="btn btn-ghost hover:text-red-400">CLOSE</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：当前少女详情 */}
        <div className="w-96 border-r border-zinc-800 bg-zinc-900/50 p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-lg font-header text-zinc-200 mb-1">{maiden.name}</h3>
            <p className="text-xs text-zinc-500 font-mono">{maiden.id}</p>
          </div>

          {currentMaidenPregnancy ? (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-pink-900/20 border border-pink-800/30">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-zinc-400 text-sm">当前状态</span>
                  <span className={`px-2 py-1 rounded text-xs ${STAGE_STYLES[currentMaidenPregnancy.stage]?.color} ${STAGE_STYLES[currentMaidenPregnancy.stage]?.bgColor}`}>
                    {STAGE_STYLES[currentMaidenPregnancy.stage]?.label}
                  </span>
                </div>

                <div className="text-center mb-4">
                  <div className="text-5xl font-mono text-pink-400 mb-1">{Math.floor(currentMaidenPregnancy.weekNumber)}</div>
                  <div className="text-xs text-zinc-500">周</div>
                </div>

                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-pink-600 to-pink-400 rounded-full"
                    style={{ width: `${(currentMaidenPregnancy.weekNumber / 40) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>0周</span>
                  <span>40周</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">受孕率</div>
                  <div className="text-lg font-mono text-cyan-400">{maiden.physiology.fertility}%</div>
                </div>
                <div className="p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">健康</div>
                  <div className="text-lg font-mono text-green-400">{maiden.physiology.health}%</div>
                </div>
                <div className="p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">周期日</div>
                  <div className="text-lg font-mono text-zinc-300">D{maiden.physiology.cycleDay}</div>
                </div>
                <div className="p-3 rounded bg-zinc-800/50 border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase mb-1">分娩次数</div>
                  <div className="text-lg font-mono text-amber-400">{maiden.birthCount}</div>
                </div>
              </div>

              {/* 症状显示 */}
              {currentMaidenPregnancy.complications.length > 0 && (
                <div className="p-3 rounded bg-zinc-800/30 border border-zinc-700/50">
                  <div className="text-[10px] text-zinc-500 uppercase mb-2">当前症状</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentMaidenPregnancy.complications.map((symptom, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-xs bg-red-900/20 text-red-300 border border-red-800/30">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {maiden.physiology.isOvulating && (
                <div className="p-3 rounded bg-red-900/20 border border-red-800/30 text-center">
                  <span className="text-red-400 text-sm animate-pulse">排卵期</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-sm">未怀孕</p>
              <p className="text-xs text-zinc-700 mt-1">受孕率: {maiden.physiology.fertility}%</p>
            </div>
          )}
        </div>

        {/* 右侧：所有怀孕少女列表 */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-header text-zinc-300">全部孕育中</h3>
            <div className="flex gap-4 text-xs">
              <span className="text-cyan-400">早期: {stats.byStage?.early || 0}</span>
              <span className="text-green-400">中期: {stats.byStage?.middle || 0}</span>
              <span className="text-yellow-400">晚期: {stats.byStage?.late || 0}</span>
              <span className="text-red-400">临产: {stats.byStage?.labor || 0}</span>
            </div>
          </div>

          {pregnantMaidens.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {pregnantMaidens.map(({ maiden: m, state }) => (
                <PregnancyItem
                  key={m.id}
                  maiden={m}
                  weekNumber={state.weekNumber}
                  stage={state.stage}
                  isSelected={m.id === maiden.id}
                  onSelect={onMaidenSelect}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
              <div className="w-20 h-20 rounded-full bg-zinc-800/30 flex items-center justify-center mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="text-sm">当前无孕育中的单位</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
