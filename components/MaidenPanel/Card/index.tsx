
// ============================================
// 角色卡片组件 - 入口文件
// 显示选中少女的详细信息和立绘；
// 并协调所有Card模块下的UI组件
// ============================================

import React, { useState, useEffect, memo, useRef } from 'react';
import { Maiden, CharacterStatus, CarriageType } from '../../../meta';
import { STATUS_STYLES, ABYSS_TYPES } from '../../../constants';
import { aiService, maidenSystem, useGameEngine } from '../../../engines';
import { formatPreciseAge, isAlteredMemory } from '../../../meta';
import { Appearance } from './Appearance';
import { Attire } from './Attire';
import { Attribute } from './Attribute';
import { Personality } from './Personality';

interface MaidenCardProps {
  maiden: Maiden | undefined;
  carriageType?: CarriageType;
  onClose?: () => void;
  onOpenMemory?: () => void;
  onOpenPregnancy?: () => void;
  onOpenRelationship?: () => void;
}

interface StatusTagProps {
  status: CharacterStatus;
}

const StatusTag = memo<StatusTagProps>(({ status }) => {
  const style = STATUS_STYLES[status];
  if (!style) return null;
  return <span className={`status-tag ${style.color}`}>{style.name}</span>;
});

StatusTag.displayName = 'StatusTag';

const EmptyState = memo(() => (
  <div className="panel h-full flex items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-800/50 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-zinc-600 rounded-full" />
      </div>
      <p className="text-sm text-zinc-500 font-tech">选择一个目标</p>
      <p className="text-[10px] text-zinc-600 mt-1">SELECT A TARGET</p>
    </div>
  </div>
));

EmptyState.displayName = 'EmptyState';

export const MaidenCard: React.FC<MaidenCardProps> = memo(({
  maiden,
  carriageType,
  onClose,
  onOpenMemory,
  onOpenPregnancy,
  onOpenRelationship
}) => {
  const [imageUrl, setImageUrl] = useState('');
  const [usedModel, setUsedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showPreciseAge, setShowPreciseAge] = useState(false);

  // 使用 ref 存储上一次的视觉哈希，防止因对象引用变化导致的重复请求
  const lastVisualHashRef = useRef<string>('');
  const mountedRef = useRef(true);

  const { systemState } = useGameEngine();

  const isInAbyss = carriageType ? ABYSS_TYPES.includes(carriageType) : false;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!maiden) {
      setImageUrl('');
      setUsedModel('');
      setLoadError(false);
      lastVisualHashRef.current = '';
      return;
    }

    // 计算当前视觉状态的哈希值 (包含 ID、服装、关键状态、理智区间等)
    const currentHash = aiService.getPortraitHash(maiden, carriageType);

    // 关键优化：如果视觉哈希没有变化，且已经有图片，则完全跳过请求
    if (currentHash === lastVisualHashRef.current && imageUrl && !loadError) {
      return;
    }

    // 更新哈希记录
    lastVisualHashRef.current = currentHash;

    setLoading(true);
    setLoadError(false); // 重置错误状态

    // 使用异步生成接口，支持 SD3.5 Large (HF API)
    aiService.generateCharacterImage(maiden, carriageType)
      .then(({ url, model }) => {
        if (!mountedRef.current) return;

        // 预加载图片
        const img = new Image();
        img.src = url;
        img.onload = () => {
          // 再次检查哈希，防止竞态条件（比如网络慢时切换了角色）
          // 只有当加载完成的图片对应当前的视觉状态时才更新
          if (mountedRef.current && currentHash === lastVisualHashRef.current) {
            setImageUrl(url);
            setUsedModel(model);
            setLoading(false);
            setLoadError(false);
          }
        };
        img.onerror = () => {
          if (mountedRef.current && currentHash === lastVisualHashRef.current) {
            setLoading(false);
            setLoadError(true); // 标记加载失败
            console.error("Image load failed for URL:", url);
          }
        };
      })
      .catch(err => {
        console.error("Image generation service error:", err);
        if (mountedRef.current) {
          setLoading(false);
          setLoadError(true);
        }
      });

  }, [maiden, carriageType]); // 依赖项保持宽泛，由内部哈希比对进行节流

  const handleRetry = () => {
    // 强制重置哈希以触发重新加载
    lastVisualHashRef.current = '';
    // 强制刷新组件
    setLoadError(false);
    setLoading(true);
    // 再次调用副作用逻辑（依赖变化会触发）
    // 这里我们实际上只需要让上面的 useEffect 重新执行
    // 通过清空哈希，下次渲染时（如果我们能触发重渲染）会重新加载
    // 但更好的方式是直接在这里调用加载逻辑，或者利用 state 变化
    // 由于 lastVisualHashRef 改变不会触发重渲染，我们使用 setLoadError 触发一次
    // 但 useEffect 依赖项没变。
    // 简单 hack: 传入一个计数器作为依赖，或者直接复制 useEffect 逻辑
    if (maiden) {
      aiService.generateCharacterImage(maiden, carriageType)
        .then(({ url, model }) => {
          if (!mountedRef.current) return;
          const img = new Image();
          img.src = url;
          img.onload = () => {
            setImageUrl(url);
            setUsedModel(model);
            setLoading(false);
            setLoadError(false);
          };
          img.onerror = () => {
            setLoading(false);
            setLoadError(true);
          };
        });
    }
  };

  if (!maiden) return <EmptyState />;

  const { attributes, physiology, status, clothing, isshex } = maiden;
  const personalityDescription = maidenSystem.getPersonalityDescription(maiden);
  const corruptedMemoryCount = maiden.memoryChain.filter(isAlteredMemory).length;
  // 摘要由链派生，卡片不持有第二份记忆状态
  const memorySummary = maidenSystem.memory.generateSummaryFromChain(maiden.memoryChain);
  const isCritical = attributes.sanity < 30;
  const currentAgeMs = (maiden.initialAgeMs || 0) + (systemState?.gameTimePassed || 0);
  const preciseAgeString = formatPreciseAge(currentAgeMs);

  return (
    <div className={`panel flex flex-col h-full overflow-hidden ${isInAbyss ? 'panel-abyss' : ''} ${isCritical ? 'border-red-800/40' : ''}`}>

      {/* 立绘区域 */}
      <div className={`relative aspect-[3/4] shrink-0 bg-zinc-950 overflow-hidden rounded-t-lg ${isInAbyss ? 'ring-1 ring-purple-500/30' : isCritical ? 'ring-1 ring-red-500/40' : ''}`}>
        {/* 图片层 */}
        {imageUrl && !loadError && (
          <img
            src={imageUrl}
            alt={maiden.name}
            className={`w-full h-full object-cover transition-all duration-500 ${loading ? 'opacity-40 blur-sm scale-105' : 'opacity-100 scale-100'}`}
          />
        )}

        {/* 错误状态层 - 解决黑屏问题 */}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10">
            <div className="text-center p-4 border border-red-900/30 bg-red-950/20 rounded">
              <div className="text-red-500 mb-2">⚠ 视觉链接中断</div>
              <div className="text-[10px] text-zinc-500 font-mono mb-2">SIGNAL_LOST</div>
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded border border-zinc-600 transition-colors"
              >
                重试链接
              </button>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none" />

        {isInAbyss && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-purple-900/10 pointer-events-none" />
        )}

        {isCritical && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-red-900/10 animate-pulse" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          </div>
        )}

        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-2 right-2 z-50 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-red-900/80 text-white/70 hover:text-white border border-white/10 rounded-md transition-all backdrop-blur-sm"
            title="返回列表 (ESC)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[70%]">
          {status.filter(s => s !== CharacterStatus.NORMAL).slice(0, 4).map(s => (
            <StatusTag key={s} status={s} />
          ))}
          {status.filter(s => s !== CharacterStatus.NORMAL).length > 4 && (
            <span className="status-tag bg-zinc-900/80 text-zinc-400 backdrop-blur-sm">
              +{status.filter(s => s !== CharacterStatus.NORMAL).length - 4}
            </span>
          )}
        </div>

        {maiden.rank !== 'unranked' && (
          <div className={`absolute top-11 right-2 badge ${maiden.rank === 'obsidian' ? 'badge-purple' :
            maiden.rank === 'gold' ? 'badge-warning' :
              maiden.rank === 'silver' ? 'bg-zinc-700/60 text-zinc-200 border border-zinc-500/40' :
                'bg-orange-900/40 text-orange-300 border border-orange-700/40'
            }`}>
            {maiden.rank.toUpperCase()}
          </div>
        )}

        {/* 模型标识 */}
        {imageUrl && usedModel && !loadError && (
          <div className="absolute top-16 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[7px] text-zinc-500/70 font-mono border border-white/5 pointer-events-none uppercase tracking-wider">
            {usedModel}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black/95 to-transparent pt-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-header text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">{maiden.name}</h2>
              <div
                className="text-[10px] text-zinc-400 font-mono mt-0.5 cursor-pointer hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                onClick={() => setShowPreciseAge(!showPreciseAge)}
                title="点击切换精确年龄显示"
              >
                <span className="opacity-60">{maiden.id}</span>
                <span className="opacity-40">·</span>
                <span>Age {showPreciseAge ? <span className="text-cyan-400">{preciseAgeString}</span> : maiden.age}</span>
              </div>
            </div>
            {physiology.isOvulating && (
              <span className="badge badge-danger animate-pulse text-[9px]">排卵期</span>
            )}
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-red-500/60 border-t-red-500 rounded-full animate-spin" />
              <span className="text-[10px] text-zinc-500 font-tech">GENERATING...</span>
            </div>
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">

        <Appearance maiden={maiden} />
        <Attire clothing={clothing} />
        <Attribute attributes={attributes} physiology={physiology} />

        <div className="divider" />
        <Personality
          isshex={isshex}
          profile={maiden.profile}
          personalityDescription={personalityDescription}
        />

        {/* 记忆摘要 */}
        <div className="divider" />
        <div className="text-[10px] text-zinc-500 mb-1">
          记忆 <span className={corruptedMemoryCount > 0 ? 'text-purple-400' : 'text-zinc-400'}>
            {corruptedMemoryCount} 段异常
          </span>
        </div>
        {memorySummary && (
          <p className="text-[10px] text-zinc-600 leading-relaxed line-clamp-2 italic">
            "{memorySummary}"
          </p>
        )}

        {/* 三个全屏面板入口按钮 */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {onOpenMemory && (
            <button
              onClick={onOpenMemory}
              className="py-2 px-1 btn btn-secondary text-[10px] border border-zinc-700 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex flex-col items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>记忆</span>
            </button>
          )}
          {onOpenPregnancy && (
            <button
              onClick={onOpenPregnancy}
              className="py-2 px-1 btn btn-secondary text-[10px] border border-zinc-700 hover:border-pink-500/50 hover:text-pink-400 transition-colors flex flex-col items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>孕育</span>
            </button>
          )}
          {onOpenRelationship && (
            <button
              onClick={onOpenRelationship}
              className="py-2 px-1 btn btn-secondary text-[10px] border border-zinc-700 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex flex-col items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>关系</span>
            </button>
          )}
        </div>

        {/* 额外统计 */}
        <div className="divider" />
        <div className="grid grid-cols-3 gap-2 text-[10px]">
          <div className="stat-item">
            <span className="stat-value text-purple-400">{maiden.abyssExposureCount}</span>
            <span className="stat-label">深渊暴露</span>
          </div>
          <div className="stat-item">
            <span className="stat-value text-amber-400">{maiden.graceReceived}</span>
            <span className="stat-label">神恩次数</span>
          </div>
          <div className="stat-item">
            <span className="stat-value text-pink-400">{maiden.birthCount}</span>
            <span className="stat-label">分娩次数</span>
          </div>
        </div>
      </div>
    </div>
  );
});

MaidenCard.displayName = 'MaidenCard';

export { Appearance } from './Appearance';
export { Attire } from './Attire';
export { Attribute } from './Attribute';
export { Personality } from './Personality';
export { Memory, Pregnancy, Relationship } from './Detail';
