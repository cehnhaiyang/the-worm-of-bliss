// ============================================
// 属性面板
// ============================================

import React, { memo } from 'react';
import { CharacterAttributes, PhysiologicalState } from '../../../meta';

/** 属性条的填充色，与各属性的语义色保持一致（理智蓝、欲望红、堕落橙……） */
const STAT_BAR_COLORS = {
  sanity: 'bg-blue-500',
  obedience: 'bg-purple-500',
  lust: 'bg-red-500',
  corruption: 'bg-orange-500',
  devotion: 'bg-amber-500',
  hunger: 'bg-amber-600',
  fatigue: 'bg-blue-600',
  hygiene: 'bg-cyan-600',
};

interface StatBarProps {
  label: string;
  value: number;
  colorClass: string;
  showWarning?: boolean;
}

const StatBar = memo<StatBarProps>(({ label, value, colorClass, showWarning }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1.5">
      <span className={`font-tech ${showWarning ? 'text-red-400 animate-pulse' : 'text-zinc-500'}`}>
        {label}
      </span>
      <span className={`font-mono ${showWarning ? 'text-red-400' : 'text-zinc-400'}`}>
        {Math.round(value)}%
      </span>
    </div>
    <div className="progress-bar">
      <div
        className={`progress-fill ${colorClass} ${showWarning ? 'animate-pulse' : ''}`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
));

StatBar.displayName = 'StatBar';

interface MiniStatBarProps {
  label: string;
  value: number;
  colorClass: string;
}

const MiniStatBar = memo<MiniStatBarProps>(({ label, value, colorClass }) => (
  <div className="stat-item">
    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
      <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${value}%` }} />
    </div>
    <span className="stat-label">{label}</span>
    <span className={`text-[10px] font-mono ${value > 70 ? 'text-red-400' : 'text-zinc-400'}`}>
      {Math.round(value)}
    </span>
  </div>
));

MiniStatBar.displayName = 'MiniStatBar';

interface AttributeProps {
  attributes: CharacterAttributes;
  physiology: PhysiologicalState;
}

export const Attribute = memo<AttributeProps>(({ attributes, physiology }) => {
  const isCritical = attributes.sanity < 30;

  return (
    <div className="space-y-3">
      {/* 核心属性 */}
      <div>
        <StatBar label="理智 Sanity" value={attributes.sanity} colorClass={STAT_BAR_COLORS.sanity} showWarning={isCritical} />
        <StatBar label="服从 Obedience" value={attributes.obedience} colorClass={STAT_BAR_COLORS.obedience} />
        <StatBar label="欲望 Lust" value={attributes.lust} colorClass={STAT_BAR_COLORS.lust} />
        <StatBar label="堕落 Corruption" value={attributes.corruption} colorClass={STAT_BAR_COLORS.corruption} />
        <StatBar label="虔诚 Devotion" value={attributes.devotion} colorClass={STAT_BAR_COLORS.devotion} />
      </div>

      {/* 需求属性 */}
      <div className="divider" />
      <div className="grid grid-cols-3 gap-2">
        <MiniStatBar label="饥饿" value={attributes.hunger} colorClass={STAT_BAR_COLORS.hunger} />
        <MiniStatBar label="疲劳" value={attributes.fatigue} colorClass={STAT_BAR_COLORS.fatigue} />
        <MiniStatBar label="清洁" value={100 - attributes.hygiene} colorClass={STAT_BAR_COLORS.hygiene} />
      </div>

      {/* 生理信息 */}
      <div className="divider" />
      <div className="flex justify-between items-center text-[10px]">
        <div className="flex gap-3">
          <span className="text-zinc-500">周期 <span className="text-zinc-300 font-mono">D{physiology.cycleDay}</span></span>
          <span className="text-zinc-500">受孕 <span className="text-pink-400 font-mono">{physiology.fertility}%</span></span>
          <span className="text-zinc-500">敏感 <span className="text-red-400 font-mono">{physiology.sensitivityMultiplier.toFixed(1)}x</span></span>
        </div>
      </div>

      {(physiology.pregnancy?.weekNumber ?? 0) > 0 && (
        <div className="badge badge-purple w-full justify-center py-1.5 animate-pulse">
          怀孕第 {Math.floor(physiology.pregnancy?.weekNumber ?? 0)} 周
        </div>
      )}
    </div>
  );
});

Attribute.displayName = 'Attribute';
