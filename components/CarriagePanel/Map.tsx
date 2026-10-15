
// ============================================
// 车厢地图组件
// 显示5x50车厢网格，支持导航和筛选
// ============================================

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { Carriage, ViewMode } from '../../meta';
import { CARRIAGE_TYPE_INFO, ABYSS_TYPES, SANCTUARY_TYPES, TYPE_COLORS, CARRIAGE_ICONS, MAP_VIEW_MODES, UI_CONFIG } from '../../constants';

// ============================================
// Props 接口
// ============================================

interface MapProps {
  carriages: Map<string, Carriage>;
  masterCarriageId: string;
  onCarriageClick: (carriageId: string) => void;
  focusedMaidenCarriageId?: string;
  onHubShuffle?: () => void;
}

// ============================================
// 车厢单元格组件 (Memoized)
// ============================================

interface CarriageCellProps {
  carriage: Carriage | null;
  isMasterHere: boolean;
  isFocusedMaidenHere: boolean;
  isHighlighted: boolean;
  onClick: (id: string) => void;
  onHover: (carriage: Carriage | null) => void;
}

const CarriageCell = memo<CarriageCellProps>(({
  carriage,
  isMasterHere,
  isFocusedMaidenHere,
  isHighlighted,
  onClick,
  onHover
}) => {
  if (!carriage) return <div className="aspect-square rounded bg-zinc-950/50" />;

  const isAbyss = ABYSS_TYPES.includes(carriage.type);
  const occupantCount = carriage.occupants.length;
  const typeInfo = CARRIAGE_TYPE_INFO.find(info => info.type === carriage.type);
  const bgColor = TYPE_COLORS[carriage.type] || 'bg-zinc-800';
  const icon = CARRIAGE_ICONS[carriage.type];

  return (
    <button
      onClick={() => onClick(carriage.id)}
      onMouseEnter={() => onHover(carriage)}
      onMouseLeave={() => onHover(null)}
      className={`
        relative w-full aspect-square rounded text-[8px] font-tech
        border transition-all duration-150 group
        ${bgColor}
        ${isMasterHere ? 'ring-2 ring-red-500 border-red-500 z-10 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-zinc-800/60'}
        ${isFocusedMaidenHere && !isMasterHere ? 'ring-1 ring-pink-500 z-10 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : ''}
        ${!isHighlighted ? 'opacity-15' : 'opacity-100'}
        hover:brightness-130 hover:scale-105 hover:z-20 hover:border-zinc-600
        ${!carriage.isAccessible ? 'opacity-10 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={`${typeInfo?.nameCN || carriage.type} [${carriage.id}]\n占用: ${occupantCount}人`}
      disabled={!carriage.isAccessible}
    >
      {/* 观测者标记 */}
      {isMasterHere && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-red-500 text-xs font-bold font-mono drop-shadow-[0_0_10px_rgba(239,68,68,0.9)]">●</span>
        </div>
      )}

      {/* 车厢图标 */}
      {!isMasterHere && icon && (
        <div className="absolute inset-0 flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity text-[9px]">
          {icon}
        </div>
      )}

      {/* 占用人数 */}
      {occupantCount > 0 && !isMasterHere && (
        <div className={`absolute -bottom-0.5 -right-0.5 min-w-[12px] h-3 px-0.5 flex items-center justify-center rounded text-[7px] font-bold ${occupantCount > 5 ? 'bg-red-600 text-white shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-zinc-800 text-zinc-300'
          }`}>
          {occupantCount}
        </div>
      )}

      {/* 深渊标记 */}
      {isAbyss && (
        <div className="absolute top-0 left-0 w-1.5 h-1.5 bg-purple-500/60 rounded-full shadow-[0_0_4px_rgba(147,51,234,0.8)]" />
      )}

      {/* 目标少女标记 */}
      {isFocusedMaidenHere && !isMasterHere && (
        <div className="absolute top-0 right-0 text-pink-400 text-[6px]">♀</div>
      )}
    </button>
  );
});

CarriageCell.displayName = 'CarriageCell';

// ============================================
// 小地图组件 (Memoized)
// ============================================

interface MinimapProps {
  grid: (Carriage | null)[][];
  masterCol: number;
  viewportStart: number;
  onJump: (col: number) => void;
}

const Minimap = memo<MinimapProps>(({ grid, masterCol, viewportStart, onJump }) => (
  <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
    <div className="flex gap-[1px]">
      {Array.from({ length: UI_CONFIG.MAP_TOTAL_COLUMNS }).map((_, col) => {
        const hasOccupants = grid.some(row => row[col]?.occupants.length);
        const hasAbyss = grid.some(row => row[col] && ABYSS_TYPES.includes(row[col]!.type));
        const isMasterCol = masterCol === col;
        const isInViewport = col >= viewportStart && col < viewportStart + UI_CONFIG.MAP_VIEWPORT_SIZE;

        return (
          <button
            key={col}
            onClick={() => onJump(Math.max(0, Math.min(UI_CONFIG.MAP_TOTAL_COLUMNS - UI_CONFIG.MAP_VIEWPORT_SIZE, col - Math.floor(UI_CONFIG.MAP_VIEWPORT_SIZE / 2))))}
            className={`w-1 h-2.5 rounded-sm transition-all ${isMasterCol ? 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]' :
                hasAbyss ? 'bg-purple-500/80' :
                  hasOccupants ? 'bg-blue-500/60' :
                    'bg-zinc-700/50'
              } ${isInViewport ? 'ring-1 ring-white/40 scale-y-125' : 'hover:bg-zinc-600'}`}
            title={`列 ${col + 1}`}
          />
        );
      })}
    </div>
  </div>
));

Minimap.displayName = 'Minimap';

// ============================================
// 悬停信息卡片组件 (Memoized)
// ============================================

interface HoverCardProps {
  carriage: Carriage;
}

const HoverCard = memo<HoverCardProps>(({ carriage }) => {
  const isAbyss = ABYSS_TYPES.includes(carriage.type);
  const typeInfo = CARRIAGE_TYPE_INFO.find(info => info.type === carriage.type);

  return (
    <div className={`p-2.5 rounded-lg border text-xs ${isAbyss
        ? 'bg-purple-950/80 border-purple-700/50'
        : 'bg-zinc-800/90 border-zinc-700/50'
      }`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium ${isAbyss ? 'text-purple-300' : 'text-zinc-200'}`}>
          {CARRIAGE_ICONS[carriage.type]} {typeInfo?.nameCN || carriage.type}
        </span>
        <span className="text-zinc-500 font-mono text-[10px]">{carriage.id}</span>
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span className="text-zinc-400">
          占用 <span className={carriage.occupants.length > 0 ? 'text-zinc-200' : 'text-zinc-500'}>{carriage.occupants.length}</span> 人
        </span>
        <span className={isAbyss ? 'badge badge-purple' : 'badge badge-info'}>
          {isAbyss ? '深渊' : '圣所'}
        </span>
      </div>
    </div>
  );
});

HoverCard.displayName = 'HoverCard';

// ============================================
// 主组件
// ============================================

export const Map: React.FC<MapProps> = memo(({
  carriages,
  masterCarriageId,
  onCarriageClick,
  focusedMaidenCarriageId,
  onHubShuffle,
}) => {
  const [viewportStart, setViewportStart] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showMinimap, setShowMinimap] = useState(false);
  const [hoveredCarriage, setHoveredCarriage] = useState<Carriage | null>(null);

  // 将车厢转换为网格数组
  const grid = useMemo(() => {
    const result: (Carriage | null)[][] = [];
    for (let row = 0; row < UI_CONFIG.MAP_TOTAL_ROWS; row++) {
      result[row] = [];
      for (let col = 0; col < UI_CONFIG.MAP_TOTAL_COLUMNS; col++) {
        result[row][col] = carriages.get(`R${row}C${col}`) || null;
      }
    }
    return result;
  }, [carriages]);

  // 统计信息
  const stats = useMemo(() => {
    let totalOccupants = 0, abyssCount = 0, sanctuaryCount = 0;
    carriages.forEach(c => {
      totalOccupants += c.occupants.length;
      if (ABYSS_TYPES.includes(c.type)) abyssCount++;
      if (SANCTUARY_TYPES.includes(c.type)) sanctuaryCount++;
    });
    return { totalOccupants, abyssCount, sanctuaryCount };
  }, [carriages]);

  // 我位置
  const masterCol = useMemo(() =>
    carriages.get(masterCarriageId)?.position.col ?? 0,
    [carriages, masterCarriageId]
  );

  // 当前视口的车厢（带过滤）
  const visibleGrid = useMemo(() => {
    return grid.map(row => {
      const sliced = row.slice(viewportStart, viewportStart + UI_CONFIG.MAP_VIEWPORT_SIZE);
      return sliced.map(carriage => {
        if (!carriage) return { carriage: null, isHighlighted: true };

        let isHighlighted = true;
        switch (viewMode) {
          case 'sanctuary': isHighlighted = SANCTUARY_TYPES.includes(carriage.type); break;
          case 'abyss': isHighlighted = ABYSS_TYPES.includes(carriage.type); break;
          case 'occupied': isHighlighted = carriage.occupants.length > 0; break;
        }

        return { carriage, isHighlighted };
      });
    });
  }, [grid, viewportStart, viewMode]);

  // 导航
  const canScrollLeft = viewportStart > 0;
  const canScrollRight = viewportStart + UI_CONFIG.MAP_VIEWPORT_SIZE < UI_CONFIG.MAP_TOTAL_COLUMNS;

  const scrollLeft = useCallback(() => {
    setViewportStart(prev => Math.max(0, prev - UI_CONFIG.MAP_VIEWPORT_SIZE));
  }, []);

  const scrollRight = useCallback(() => {
    setViewportStart(prev => Math.min(UI_CONFIG.MAP_TOTAL_COLUMNS - UI_CONFIG.MAP_VIEWPORT_SIZE, prev + UI_CONFIG.MAP_VIEWPORT_SIZE));
  }, []);

  const jumpToMaster = useCallback(() => {
    setViewportStart(Math.max(0, Math.min(UI_CONFIG.MAP_TOTAL_COLUMNS - UI_CONFIG.MAP_VIEWPORT_SIZE, masterCol - Math.floor(UI_CONFIG.MAP_VIEWPORT_SIZE / 2))));
  }, [masterCol]);

  const jumpToFocusedMaiden = useCallback(() => {
    if (!focusedMaidenCarriageId) return;
    const carriage = carriages.get(focusedMaidenCarriageId);
    if (carriage) {
      setViewportStart(Math.max(0, Math.min(UI_CONFIG.MAP_TOTAL_COLUMNS - UI_CONFIG.MAP_VIEWPORT_SIZE, carriage.position.col - Math.floor(UI_CONFIG.MAP_VIEWPORT_SIZE / 2))));
    }
  }, [carriages, focusedMaidenCarriageId]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && e.ctrlKey) scrollLeft();
      else if (e.key === 'ArrowRight' && e.ctrlKey) scrollRight();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scrollLeft, scrollRight]);

  return (
    <div className="panel">
      {/* 标题栏 */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-500">::</span>
          <h3 className="font-tech text-xs text-zinc-400 uppercase tracking-wider">Train Map</h3>
          <span className="badge badge-info text-[9px]">
            {viewportStart + 1}-{viewportStart + UI_CONFIG.MAP_VIEWPORT_SIZE}/{UI_CONFIG.MAP_TOTAL_COLUMNS}
          </span>
        </div>
        <div className="flex items-center gap-1 font-tech">
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`btn btn-ghost text-[10px] px-1.5 py-0.5 ${showMinimap ? 'bg-blue-900/30 text-blue-400' : ''}`}
            title="显示小地图"
          >
            MINI
          </button>
          {focusedMaidenCarriageId && (
            <button
              onClick={jumpToFocusedMaiden}
              className="btn btn-ghost text-[10px] px-1.5 py-0.5 text-pink-400 hover:bg-pink-900/30"
              title="定位目标少女"
            >
              TARGET
            </button>
          )}
          <button
            onClick={jumpToMaster}
            className="btn btn-ghost text-[10px] px-1.5 py-0.5 text-red-400 hover:bg-red-900/30"
            title="定位我"
          >
            LOCATE
          </button>
          {onHubShuffle && (
            <button
              onClick={onHubShuffle}
              className="btn btn-ghost text-[10px] px-1.5 py-0.5 text-purple-400 hover:bg-purple-900/30"
              title="枢纽重组"
            >
              SHUFFLE
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* 视图模式切换 */}
        <div className="flex items-center gap-1">
          {MAP_VIEW_MODES.map(({ mode, label, }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`btn btn-ghost text-[10px] ${viewMode === mode ? 'bg-zinc-700/50 text-zinc-200' : ''
                }`}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 导航按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className="btn btn-secondary p-2"
          >
            ◀
          </button>

          {/* 快速跳转 */}
          <div className="flex-1 flex gap-1">
            {[0, 10, 20, 30, 40].map(start => (
              <button
                key={start}
                onClick={() => setViewportStart(start)}
                className={`btn btn-ghost flex-1 text-[10px] ${viewportStart === start ? 'bg-zinc-700/50 text-zinc-200' : ''
                  }`}
              >
                {start + 1}-{start + 10}
              </button>
            ))}
          </div>

          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="btn btn-secondary p-2"
          >
            ▶
          </button>
        </div>

        {/* 小地图 */}
        {showMinimap && (
          <Minimap
            grid={grid}
            masterCol={masterCol}
            viewportStart={viewportStart}
            onJump={setViewportStart}
          />
        )}

        {/* 车厢网格 */}
        <div className="grid grid-rows-5 gap-1 p-2 bg-zinc-950/50 rounded-md border border-zinc-800/30">
          {visibleGrid.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-10 gap-1">
              {row.map(({ carriage, isHighlighted }, colIdx) => (
                <CarriageCell
                  key={carriage?.id || `empty-${rowIdx}-${colIdx}`}
                  carriage={carriage}
                  isMasterHere={carriage?.id === masterCarriageId}
                  isFocusedMaidenHere={carriage?.id === focusedMaidenCarriageId}
                  isHighlighted={isHighlighted}
                  onClick={onCarriageClick}
                  onHover={setHoveredCarriage}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 悬停信息 */}
        {hoveredCarriage && <HoverCard carriage={hoveredCarriage} />}

        {/* 图例和统计 */}
        <div className="flex flex-wrap justify-between items-center gap-2 text-[9px] text-zinc-500 pt-2 border-t border-zinc-800/50">
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-zinc-800 rounded-sm border border-zinc-700" /> 走廊
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-blue-900/50 rounded-sm border border-blue-800/50" /> 宿舍
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-cyan-900/50 rounded-sm border border-cyan-800/50" /> 浴池
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-violet-900/70 rounded-sm border border-violet-700/50 animate-pulse" /> 深渊
            </span>
          </div>
          <div className="flex gap-3 font-tech">
            <span>圣所 <span className="text-zinc-300">{stats.sanctuaryCount}</span></span>
            <span className="text-purple-400">深渊 <span className="text-purple-300">{stats.abyssCount}</span></span>
            <span>人数 <span className="text-zinc-300">{stats.totalOccupants}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
});

Map.displayName = 'Map';
