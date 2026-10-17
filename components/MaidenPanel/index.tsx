// ============================================
// 少女列表组件
// 显示当前车厢或全部少女，支持搜索、过滤、排序
// ============================================

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Maiden, MaidenSummary, CharacterStatus, RANK_ORDER } from '../../meta';
import { getCurrentCarriageId } from '../../const';
import { STATUS_LABELS } from '../../constants';

/**
 * 等级徽标的颜色与罗马数字标识。
 *
 * 中文名（"黑曜""金"…）不在此列：列表只显示图标，卡片则用 `badge` 组件自己
 * 按等级选色，两处视觉本就不同，硬凑一张带名字的表只会多出一份没人读的字面量。
 */
const RANK_STYLES: Record<string, { color: string; icon: string }> = {
    obsidian: { color: 'text-purple-400', icon: 'IV' },
    gold: { color: 'text-yellow-400', icon: 'III' },
    silver: { color: 'text-gray-300', icon: 'II' },
    copper: { color: 'text-orange-400', icon: 'I' },
    unranked: { color: 'text-zinc-500', icon: '0' },
};

/** 排序下拉；value 与 `filteredMaidens` 里的 switch 分支一一对应 */
const MAIDEN_SORT_OPTIONS = [
    { value: 'name', label: '名字' },
    { value: 'sanity', label: '理智↑' },
    { value: 'sanity_desc', label: '理智↓' },
    { value: 'status', label: '状态数' },
    { value: 'rank', label: '等级' },
] as const;

/**
 * 状态过滤器；value 与 `filterMap` 的键一一对应，`all` 是唯一的非状态值。
 * `critical` 不是状态而是"理智低于临界"，故它不查 status 而查 sanity。
 */
const STATUS_FILTER_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'critical', label: '危险' },
    { value: 'pregnant', label: '怀孕' },
    { value: 'broken', label: '崩溃' },
    { value: 'sleeping', label: '睡眠' },
    { value: 'devoted', label: '虔诚' },
] as const;

/**
 * 状态标签的配色。
 *
 * 只为列表里这几个高频状态给色，其余沿用默认灰；配色是纯 UI 表达，因此留在
 * 组件里。名称取 `STATUS_LABELS`——v1 在 UI 层另存了一份带名字的同名表，
 * 于是同一个状态在列表里叫"恐惧"、在卡片里叫别的措辞。
 */
const STATUS_COLORS: Partial<Record<CharacterStatus, string>> = {
    'panicked': 'text-yellow-400',
    'aroused': 'text-pink-400',
    'injured': 'text-red-400',
    'broken': 'text-gray-400',
    'pregnant': 'text-purple-400',
    'devoted': 'text-amber-400',
    'sleeping': 'text-blue-400',
    'chatting': 'text-emerald-400',
    'observing': 'text-fuchsia-400',
};

interface MaidenListProps {
    maidens: Maiden[];
    allMaidenSummaries: MaidenSummary[];
    focusedMaidenId?: string;
    onMaidenSelect: (maidenId: string) => void;
    currentCarriageId: string;
}

interface MaidenItemProps {
    maiden: Maiden | MaidenSummary;
    isFocused: boolean;
    isInCurrentCarriage: boolean;
    viewMode: 'current' | 'all';
    onSelect: (id: string) => void;
}

const getCarriageId = (m: Maiden | MaidenSummary): string => {
    if ('movement' in m && m.movement?.currentCarriageId) {
        return m.movement.currentCarriageId;
    }
    if ('carriageId' in m && typeof m.carriageId === 'string') {
        return m.carriageId;
    }
    return '';
};

const MaidenItem = memo<MaidenItemProps>(({ maiden, isFocused, isInCurrentCarriage, viewMode, onSelect }) => {
    const sanity = 'attributes' in maiden ? maiden.attributes.sanity : maiden.sanity;
    const rank = 'rank' in maiden ? maiden.rank : 'unranked';
    const isCritical = sanity < 30;
    const rankStyle = RANK_STYLES[rank] || RANK_STYLES.unranked;

    return (
        <button
            onClick={() => onSelect(maiden.id)}
            className={`list-item w-full text-left group ${isFocused ? 'list-item-active' : ''} ${isCritical && !isFocused ? 'list-item-danger' : ''}`}
        >
            {/* 左侧：等级标识 */}
            <div className={`w-7 h-7 rounded-md flex items-center justify-center bg-zinc-900/60 border border-zinc-800/50 ${rankStyle.color} transition-colors group-hover:border-zinc-700/50`}>
                <span className="text-sm font-mono">{rankStyle.icon}</span>
            </div>

            {/* 中间：名字和状态 */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className={`font-medium truncate text-sm ${isFocused ? 'text-red-300' : isCritical ? 'text-red-400' : 'text-zinc-200'}`}>
                        {maiden.name}
                    </span>
                    <span className="text-[8px] text-zinc-600 font-mono opacity-60">
                        {maiden.id.slice(-4)}
                    </span>
                </div>

                {/* 状态标签 */}
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {maiden.status.filter(s => s !== 'normal').slice(0, 3).map(status => (
                        <span
                            key={status}
                            className={`text-[8px] px-1 py-0.5 rounded ${STATUS_COLORS[status] || 'text-zinc-400'} bg-zinc-900/60`}
                        >
                            {STATUS_LABELS[status]}
                        </span>
                    ))}
                    {maiden.status.filter(s => s !== 'normal').length > 3 && (
                        <span className="text-[8px] px-1 py-0.5 rounded text-zinc-500 bg-zinc-900/60">
                            +{maiden.status.filter(s => s !== 'normal').length - 3}
                        </span>
                    )}
                </div>
            </div>

            {/* 右侧：理智条和位置 */}
            <div className="flex flex-col items-end gap-0.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${sanity < 30 ? 'bg-red-500' : sanity < 60 ? 'bg-yellow-500' : 'bg-blue-500'} ${isCritical ? 'animate-pulse' : ''}`}
                            style={{ width: `${sanity}%` }}
                        />
                    </div>
                    <span className={`text-[9px] font-mono w-6 text-right ${sanity < 30 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {Math.round(sanity)}
                    </span>
                </div>

                {!isInCurrentCarriage && viewMode !== 'current' && (
                    <span className="text-[8px] text-zinc-600 font-mono">
                        {getCarriageId(maiden)}
                    </span>
                )}

            </div>
        </button>
    );
});

MaidenItem.displayName = 'MaidenItem';

interface EmptyStateProps {
    viewMode: 'current' | 'all';
    hasFilters: boolean;
    onClearFilters: () => void;
}

const EmptyState = memo<EmptyStateProps>(({ viewMode, hasFilters, onClearFilters }) => (
    <div className="flex flex-col items-center justify-center h-full py-8">
        <div className="w-12 h-12 rounded-full bg-zinc-800/30 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        </div>
        <p className="text-sm text-zinc-500 font-tech">
            {viewMode === 'current' ? '当前车厢无人' : '无匹配结果'}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">
            {viewMode === 'current' ? 'NO OCCUPANTS' : 'NO RESULTS'}
        </p>
        {hasFilters && (
            <button onClick={onClearFilters} className="btn btn-ghost mt-3 text-xs">清除过滤</button>
        )}
    </div>
));

EmptyState.displayName = 'EmptyState';

export const MaidenList: React.FC<MaidenListProps> = memo(({
    maidens,
    allMaidenSummaries,
    focusedMaidenId,
    onMaidenSelect,
    currentCarriageId,
}) => {
    const [viewMode, setViewMode] = useState<'current' | 'all'>('current');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<string>('name');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    const stats = useMemo(() => {
        const all = allMaidenSummaries;
        return {
            total: all.length,
            critical: all.filter(m => m.sanity < 30).length,
            pregnant: all.filter(m => m.status.includes('pregnant')).length,
            broken: all.filter(m => m.status.includes('broken')).length,
            sleeping: all.filter(m => m.status.includes('sleeping')).length,
            devoted: all.filter(m => m.status.includes('devoted')).length,
        };
    }, [allMaidenSummaries]);

    const getSanity = useCallback((m: Maiden | MaidenSummary) =>
        'attributes' in m ? m.attributes.sanity : m.sanity, []);

    const getRank = useCallback((m: Maiden | MaidenSummary) =>
        'rank' in m ? m.rank : 'unranked', []);

    const filteredMaidens = useMemo(() => {
        let list: (Maiden | MaidenSummary)[] = viewMode === 'current' ? maidens : allMaidenSummaries;

        if (statusFilter !== 'all') {
            const filterMap: Record<string, (m: Maiden | MaidenSummary) => boolean> = {
                critical: m => getSanity(m) < 30,
                pregnant: m => m.status.includes('pregnant'),
                broken: m => m.status.includes('broken'),
                sleeping: m => m.status.includes('sleeping'),
                devoted: m => m.status.includes('devoted'),
            };
            const filterFn = filterMap[statusFilter];
            if (filterFn) list = list.filter(filterFn);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            list = list.filter(m =>
                m.name.toLowerCase().includes(query) ||
                m.id.toLowerCase().includes(query) ||
                getCarriageId(m).toLowerCase().includes(query)
            );

        }

        return [...list].sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name, 'zh-CN');
                case 'sanity': return getSanity(a) - getSanity(b);
                case 'sanity_desc': return getSanity(b) - getSanity(a);
                case 'status': return b.status.length - a.status.length;
                case 'rank': return (RANK_ORDER[getRank(b)] || 0) - (RANK_ORDER[getRank(a)] || 0);
                default: return 0;
            }
        });
    }, [viewMode, maidens, allMaidenSummaries, searchQuery, sortBy, statusFilter, getSanity, getRank]);

    const clearFilters = useCallback(() => {
        setSearchQuery('');
        setStatusFilter('all');
    }, []);

    const hasFilters = !!searchQuery || statusFilter !== 'all';

    return (
        <div className="panel flex flex-col h-full">
            {/* 标题和视图切换 */}
            <div className="panel-header flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-tech text-xs text-zinc-400 uppercase tracking-wider">Units</h3>
                    <span className="badge badge-info">{viewMode === 'current' ? maidens.length : filteredMaidens.length}</span>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => setViewMode('current')}
                        className={`btn btn-ghost text-[10px] ${viewMode === 'current' ? 'bg-zinc-700/50 text-zinc-200' : ''}`}
                    >
                        当前
                    </button>
                    <button
                        onClick={() => setViewMode('all')}
                        className={`btn btn-ghost text-[10px] ${viewMode === 'all' ? 'bg-zinc-700/50 text-zinc-200' : ''}`}
                    >
                        全部
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn btn-ghost text-[10px] ${showFilters ? 'bg-blue-900/30 text-blue-400' : ''}`}
                        title="显示过滤器"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* 搜索栏 */}
            <div className="px-2 py-1.5 border-b border-zinc-800/30 flex gap-1.5">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索..."
                        className="input-dark w-full text-xs pl-7 py-1.5"
                    />
                    <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-red-400 text-xs transition-colors"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-dark text-[10px] w-16 py-1.5"
                >
                    {MAIDEN_SORT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* 状态过滤器 */}
            {showFilters && (
                <div className="px-3 py-2 border-b border-zinc-800/50 flex flex-wrap gap-1">
                    {STATUS_FILTER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={`btn btn-ghost text-[10px] ${statusFilter === opt.value ? 'bg-zinc-700/50 text-zinc-200' : ''}`}
                        >
                            <span>{opt.label}</span>
                            {opt.value !== 'all' && (
                                <span className="text-zinc-500 ml-0.5">{stats[opt.value as keyof typeof stats] || 0}</span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* 列表 */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {filteredMaidens.length === 0 ? (
                    <EmptyState viewMode={viewMode} hasFilters={hasFilters} onClearFilters={clearFilters} />
                ) : (
                    filteredMaidens.map(maiden => (
                        <MaidenItem
                            key={maiden.id}
                            maiden={maiden}
                            isFocused={maiden.id === focusedMaidenId}
                            isInCurrentCarriage={getCarriageId(maiden) === currentCarriageId}

                            viewMode={viewMode}
                            onSelect={onMaidenSelect}
                        />
                    ))
                )}
            </div>

            {/* 统计栏 */}
            <div className="px-2 py-1.5 border-t border-zinc-800/30 bg-zinc-950/50 text-[9px] text-zinc-500 flex justify-between items-center font-tech">
                <div className="flex items-center gap-2">
                    <span>
                        <span className="text-zinc-600">显示</span>
                        <span className="text-zinc-400 ml-0.5">{filteredMaidens.length}</span>
                    </span>
                    {stats.critical > 0 && <span className="badge badge-danger text-[8px]">{stats.critical} 危险</span>}
                    {stats.pregnant > 0 && <span className="badge badge-purple text-[8px]">{stats.pregnant} 孕育</span>}
                </div>
                <span className="text-zinc-600">总计 <span className="text-zinc-400">{stats.total}</span></span>
            </div>
        </div>
    );
});

MaidenList.displayName = 'MaidenList';