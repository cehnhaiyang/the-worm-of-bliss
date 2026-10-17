// ============================================
// 车厢详情组件
// 显示当前车厢的详细信息和效果
// ============================================

import React, { memo } from 'react';
import { Carriage } from '../../meta';
import { getCarriageTemplate } from '../../constants';

// ============================================
// Props 接口
// ============================================

interface DetailProps {
    carriage: Carriage | undefined;
    occupantCount: number;
}

// ============================================
// 效果数值显示组件 (Memoized)
// ============================================

interface EffectValueProps {
    label: string;
    value: number;
    positiveColor: string;
    negativeColor: string;
}

const EffectValue = memo<EffectValueProps>(({ label, value, positiveColor, negativeColor }) => (
    <div className="stat-item">
        <span className={`stat-value ${value > 0 ? positiveColor : value < 0 ? negativeColor : 'text-zinc-500'
            }`}>
            {value > 0 ? '+' : ''}{value}
        </span>
        <span className="stat-label">{label}/min</span>
    </div>
));

EffectValue.displayName = 'EffectValue';

// ============================================
// 空状态组件
// ============================================

const EmptyState = memo(() => (
    <div className="panel p-4 text-center">
        <div className="text-xs mb-2 text-zinc-600 font-tech">[---]</div>
        <p className="text-sm text-zinc-500 font-tech">未知位置</p>
        <p className="text-[10px] text-zinc-600">UNKNOWN LOCATION</p>
    </div>
));

EmptyState.displayName = 'EmptyState';

// ============================================
// 主组件
// ============================================

export const Detail: React.FC<DetailProps> = memo(({ carriage, occupantCount }) => {
    if (!carriage) return <EmptyState />;

    const info = getCarriageTemplate(carriage.templateId);
    const isAbyss = carriage.category === 'abyss';

    if (!info) return <EmptyState />;

    return (
        <div className={`panel ${isAbyss ? 'panel-abyss' : ''}`}>
            {/* 标题 */}
            <div className="panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className={`font-header text-sm ${isAbyss ? 'text-purple-300 abyss-text' : 'text-zinc-200'}`}>
                        {info.nameCN}
                    </h3>
                </div>
                <span className={`badge text-[9px] ${isAbyss ? 'badge-purple' : 'badge-info'}`}>
                    {isAbyss ? '深渊' : '圣所'}
                </span>
            </div>

            <div className="p-2.5 space-y-2.5">
                {/* 英文名和ID */}
                <div className="flex items-center justify-between text-[9px]">
                    <span className="text-zinc-600 font-tech uppercase tracking-wider">{info.name}</span>
                    <span className="text-zinc-700 font-mono">{carriage.id}</span>
                </div>

                {/* 描述 */}
                <p className="text-[11px] text-zinc-500 leading-relaxed">{info.description}</p>

                {/* 效果标签 */}
                <div className="flex flex-wrap gap-1">
                    {(info.features || []).map((effect, idx) => (
                        <span
                            key={idx}
                            className={`text-[9px] px-1.5 py-0.5 rounded ${isAbyss ? 'bg-purple-900/30 text-purple-400 border border-purple-800/30' : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/30'}`}
                        >
                            {effect}
                        </span>
                    ))}
                </div>

                {/* 属性影响 */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-zinc-800/30">
                    <EffectValue label="理智" value={info.periodicEffects?.sanity ?? 0} positiveColor="text-green-400" negativeColor="text-red-400" />
                    <EffectValue label="欲望" value={info.periodicEffects?.lust ?? 0} positiveColor="text-pink-400" negativeColor="text-cyan-400" />
                    <EffectValue label="压力" value={info.periodicEffects?.stress ?? 0} positiveColor="text-orange-400" negativeColor="text-blue-400" />
                </div>

                {/* 占用信息 */}
                <div className="flex justify-between items-center text-[10px] pt-2 border-t border-zinc-800/30">
                    <span className="text-zinc-600 uppercase font-tech">占用</span>
                    <span className={`font-mono font-bold ${occupantCount > 0 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {occupantCount} 人
                    </span>
                </div>

                {/* 深渊警告 */}
                {isAbyss && (
                    <div className="text-[9px] text-center py-1.5 bg-red-950/20 border border-red-900/30 rounded text-red-400/80">
                        [警告] 现实稳定性下降
                    </div>
                )}
            </div>
        </div>
    );
});

Detail.displayName = 'Detail';