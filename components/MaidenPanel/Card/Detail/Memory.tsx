
// ============================================
// 记忆页面
// 横向卷轴 - 神经漫游体验
// ============================================

import React, { useState, useEffect, memo, useMemo, useRef } from 'react';
import { Maiden, MemoryNode, MemoryHistoryEntry } from '../../../../meta';
import { formatGameTimeDisplay, isAlteredMemory } from '../../../../const';
import { aiService } from '../../../../engines/services';
import { useGameEngine } from '../../../../engines';
import { TAMPER_PERMISSIONS } from '../../../../constants';

interface MemoryProps {
  maiden: Maiden;
  onClose: () => void;
  /** 会话起始墙钟时间：记忆历史里的时间戳是游戏内时间，需要它换算成日期 */
  gameStartTime: number;
}

/** 布局可容纳的最大层级：更深的节点不再继续下移，避免溢出与负 z-index */
const MAX_VISUAL_DEPTH = 8;

const HistoryModal = memo<{
  history: MemoryHistoryEntry[];
  gameStartTime: number;
  onClose: () => void;
}>(({ history, gameStartTime, onClose }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
    <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-lg w-[500px] max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
        <h4 className="font-header text-zinc-200">档案修改记录</h4>
        <button onClick={onClose} className="text-zinc-500 hover:text-white w-6 h-6 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto custom-scrollbar space-y-3 p-1">
        {[...history].reverse().map((entry, idx) => (
          <div key={idx} className="bg-black/30 p-2 rounded border border-zinc-800/50 text-xs">
            <div className="flex justify-between text-zinc-500 mb-1 font-mono text-[10px]">
              <span>{formatGameTimeDisplay(entry.timestamp, gameStartTime)}</span>
              <span className="uppercase">{entry.action}</span>
            </div>
            {entry.directive && <div className="text-purple-400 mb-1">指令: "{entry.directive}"</div>}
            <div className="text-zinc-400 italic border-l-2 border-zinc-700 pl-2 mt-1">"{entry.previousNarrative}"</div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

HistoryModal.displayName = 'HistoryModal';

interface MemoryNodeItemProps {
  node: MemoryNode;
  nextNode: MemoryNode | undefined;
  onSelect: (node: MemoryNode) => void;
  isSelected: boolean;
  viewLegacy: boolean;
}

const MemoryNodeItem = memo<MemoryNodeItemProps>(({ node, nextNode, onSelect, isSelected, viewLegacy }) => {
  const getTypeColor = (type: string, isImmutable?: boolean) => {
    if (isImmutable) return 'border-red-900 bg-red-950/20 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    switch (type) {
      case 'corrupted': return 'border-purple-500 bg-purple-900/10 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
      case 'implanted': return 'border-red-500 bg-red-900/10 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      default: return 'border-cyan-500/50 bg-black/40 text-cyan-100 hover:border-cyan-400';
    }
  };

  // 根据深度计算视觉变换，制造纵深感。
  // 反复深潜会让 depth 无限增长，而布局只能容纳有限层级：
  // 超出部分不再继续下移/缩小，否则会算出负 z-index 并把节点推出可视区。
  const visualDepth = Math.min(node.depth, MAX_VISUAL_DEPTH);
  const depthScale = Math.max(0.7, 1 - (visualDepth - 1) * 0.1);
  const depthY = (visualDepth - 1) * 40;
  const opacity = Math.max(0.6, 1 - (visualDepth - 1) * 0.15);

  return (
    <div
      className="relative flex flex-col items-center group shrink-0 mx-6 transition-all duration-500"
      style={{
        transform: `translateY(${depthY}px) scale(${isSelected ? 1.1 : depthScale})`,
        zIndex: isSelected ? 50 : 10 - visualDepth,
        opacity: isSelected ? 1 : opacity,
      }}
    >
      {/* 连接线 (仅向右连接) */}
      {nextNode && (
        <div className="absolute top-1/2 left-full w-12 h-px bg-gradient-to-r from-zinc-600 to-transparent -z-10 opacity-50 flex items-center justify-center">
        </div>
      )}

      <div
        onClick={() => onSelect(node)}
        className={`
          w-64 p-4 rounded-lg border backdrop-blur-md cursor-pointer transition-all duration-300 
          hover:scale-105 hover:z-20 relative overflow-hidden
          ${getTypeColor(node.type, node.isImmutable)} 
          ${isSelected ? 'ring-2 ring-white shadow-2xl bg-zinc-900' : ''}
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-mono opacity-70 px-1.5 py-0.5 rounded bg-white/10">{node.timeLabel}</span>
          <div className="flex gap-1 items-center">
            {node.history && node.history.length > 0 && <span className="text-[9px] text-yellow-500">REV:{node.history.length}</span>}
            {node.isImmutable && <span className="text-[9px] text-red-500 font-bold">LOCKED</span>}
            <span className="text-[9px] opacity-50">D{node.depth}</span>
          </div>
        </div>

        <h4 className="font-header text-sm mb-2 text-zinc-100 truncate" title={node.title}>{node.title}</h4>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-current opacity-30" />
          <p className="pl-2 text-xs opacity-80 line-clamp-3 italic font-serif leading-relaxed">
            "{node.subjectiveNarrative}"
          </p>
        </div>
      </div>

      {/* 倒影效果 */}
      <div
        className="absolute top-full left-0 w-full h-full opacity-10 pointer-events-none transform scale-y-[-1] blur-sm bg-gradient-to-t from-transparent to-current mt-2"
        style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)' }}
      >
      </div>
    </div>
  );
});

MemoryNodeItem.displayName = 'MemoryNodeItem';

export const Memory: React.FC<MemoryProps> = ({ maiden, onClose, gameStartTime }) => {
  const { setMemoryChain, tamperMemory, implantMemory } = useGameEngine();
  const [selectedNode, setSelectedNode] = useState<MemoryNode | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isDeepening, setIsDeepening] = useState(false);
  const [isTampering, setIsTampering] = useState(false);
  const [tamperDirective, setTamperDirective] = useState('');
  const [viewLegacy, setViewLegacy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // 记录已经尝试过初始生成的少女：Strict Mode 的双重调用与反复挂载都只触发一次。
  // 失败时置回空串，使再次打开面板可以重试，而不是永久停在"无记忆数据"。
  const lastAttemptedId = useRef<string>('');

  const permission = TAMPER_PERMISSIONS[maiden.rank] || TAMPER_PERMISSIONS.unranked;
  const activeChain = viewLegacy ? (maiden.legacyMemoryChain || []) : maiden.memoryChain;
  const isDeaconess = maiden.rank === 'obsidian';

  // 神经稳定性
  const stabilityStats = useMemo(() => {
    if (!activeChain || activeChain.length === 0) return { total: 0, corrupted: 0, percentage: 100 };
    const total = activeChain.length;
    const corrupted = activeChain.filter(isAlteredMemory).length;
    const percentage = Math.round(((total - corrupted) / total) * 100);
    return { total, corrupted, percentage };
  }, [activeChain]);

  // 初始化：懒生成。记忆链只在玩家第一次打开本面板时生成，
  // 此处只需防 Strict Mode 的重入与"生成失败后反复重试"。
  // 依赖里必须带上 activeChain.length 与 isDeaconess：否则生成成功的那一刻
  // 组件不会重跑，而这条 effect 又只认 maiden.id，切换少女后旧 id 会一直挡住新目标。
  useEffect(() => {
    if (isDeaconess) return;
    if (activeChain.length > 0) return;
    if (lastAttemptedId.current === maiden.id) return;

    lastAttemptedId.current = maiden.id;
    let cancelled = false;
    setIsInitializing(true);

    aiService.generateMemories(maiden, maiden.lastUpdateTime)
      .then(chain => {
        if (cancelled) return;
        if (chain.length === 0) {
          lastAttemptedId.current = '';   // 允许重试
          setNotice('记忆解密失败，重新打开本面板可再次尝试。');
          return;
        }
        setMemoryChain(maiden.id, chain);
      })
      .catch(err => {
        console.error('[Memory] Init generation failed:', err);
        if (!cancelled) {
          lastAttemptedId.current = '';
          setNotice('神经链接中断，重新打开本面板可再次尝试。');
        }
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => { cancelled = true; };
  }, [maiden.id, maiden.lastUpdateTime, activeChain.length, isDeaconess, setMemoryChain]);

  // 滚轮横向滚动
  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleDeepDive = async () => {
    if (viewLegacy || isDeepening) return;
    setIsDeepening(true);
    setNotice(null);
    try {
      // 只提交请求：插入位置由 AI 选择，合法性由链层判定，不在 UI 里拼链
      const result = await aiService.deepenMemories(maiden, maiden.lastUpdateTime);

      // null 是请求失败，必须与"模型认为无空白可填"区分开：
      // 两者都表现为"链没有变化"，但只有一个该让玩家重试。
      if (!result) {
        setNotice('追忆中断：神经链接不稳定。');
        return;
      }

      const { chain, rejections } = result;
      const inserted = chain.length - activeChain.length;
      if (inserted > 0) {
        setMemoryChain(maiden.id, chain);
        setNotice(`追忆完成：新增 ${inserted} 段记忆。`);
      } else if (rejections.length > 0) {
        setNotice(`追忆失败：${rejections[0].reason}（${rejections.length} 处插入被拒绝）。`);
      } else {
        setNotice('追忆完成：这段过往已无从深挖。');
      }
    } catch (err) {
      console.error('[Memory] Deepen failed:', err);
      setNotice('追忆中断：神经链接不稳定。');
    } finally {
      setIsDeepening(false);
    }
  };

  const handleTamper = async () => {
    if (!selectedNode || viewLegacy || isTampering) return;
    setIsTampering(true);
    setNotice(null);
    try {
      const directive = tamperDirective.trim() || "使其变得模糊、扭曲，充满不安的杂音。";
      const result = await aiService.tamperMemory(maiden, selectedNode, directive);

      if (!result) {
        setNotice('篡改失败：神经链接不稳定。');
        return;
      }

      const tamperedNode = tamperMemory(
        maiden.id,
        selectedNode,
        result.narrative,
        directive,
        result.selfOpinion
      );
      if (tamperedNode) setSelectedNode(tamperedNode);
      setTamperDirective('');
    } catch (err) {
      console.error('[Memory] Tamper failed:', err);
      setNotice('篡改中断：神经链接不稳定。');
    } finally {
      setIsTampering(false);
    }
  };

  const handleImplant = () => {
    if (!permission.canImplant || viewLegacy || !tamperDirective.trim()) return;
    // 节点由控制器创建并返回，这样能立刻选中它；落点由链层按登车瞬间不变量决定
    const newNode = implantMemory(maiden.id, tamperDirective.trim(), selectedNode?.id);
    if (!newNode) return;
    setTamperDirective('');
    setNotice('记忆已植入。');
    setSelectedNode(newNode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col font-serif overflow-hidden">
      {/* 顶部栏 */}
      <div className={`h-14 border-b shrink-0 flex items-center justify-between px-6 z-20 ${viewLegacy ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-900/50 border-purple-900/30'}`}>
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-header text-zinc-100 tracking-wider flex items-center gap-2">
            <span className="text-2xl opacity-50">🧠</span>
            {viewLegacy ? 'LEGACY ARCHIVE' : 'MEMORY CORRIDOR'}
          </h2>
          <div className="flex flex-col text-xs">
            <span className="text-zinc-400 font-mono">{maiden.name} [{maiden.rank.toUpperCase()}]</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-zinc-600 uppercase text-[9px]">Neural Integrity</span>
              <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stabilityStats.percentage > 70 ? 'bg-emerald-500' : stabilityStats.percentage > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${stabilityStats.percentage}%` }}
                />
              </div>
              <span className={`text-[9px] font-mono ${stabilityStats.percentage > 70 ? 'text-emerald-400' : 'text-red-400'}`}>{stabilityStats.percentage}%</span>
            </div>
          </div>

          {/* 模式切换 (执事专用) */}
          {isDeaconess && (
            <div className="flex bg-black/50 rounded p-1 border border-zinc-800">
              <button onClick={() => { setViewLegacy(false); setSelectedNode(null); }} className={`px-3 py-1 text-xs rounded ${!viewLegacy ? 'bg-purple-900 text-white' : 'text-zinc-500'}`}>当前</button>
              <button onClick={() => { setViewLegacy(true); setSelectedNode(null); }} className={`px-3 py-1 text-xs rounded ${viewLegacy ? 'bg-zinc-700 text-white' : 'text-zinc-500'}`}>旧档</button>
            </div>
          )}

          {/* 深潜按钮 (新功能) */}
          {!viewLegacy && !isDeaconess && (
            <button
              onClick={handleDeepDive}
              disabled={isDeepening || activeChain.length === 0}
              className={`ml-4 px-4 py-1.5 rounded text-xs flex items-center gap-2 border transition-all ${isDeepening
                  ? 'bg-cyan-900/30 border-cyan-800 text-cyan-500 cursor-wait'
                  : 'bg-cyan-950/50 border-cyan-700/50 text-cyan-400 hover:bg-cyan-900/80 hover:border-cyan-500'
                }`}
            >
              {isDeepening ? (
                <>
                  <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span>正在追忆...</span>
                </>
              ) : (
                <>
                  <span>⚡ 深度追忆</span>
                  <span className="text-[9px] opacity-60">(Auto-Expand)</span>
                </>
              )}
            </button>
          )}
        </div>
        <button onClick={onClose} className="btn btn-ghost hover:text-red-400">CLOSE</button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧：横向滚动的记忆链 */}
        <div
          className={`flex-1 relative flex flex-col items-center justify-center overflow-hidden 
            ${viewLegacy ? 'bg-zinc-950' : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-black to-black'}`}
        >
          {/* 背景网格 */}
          <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />

          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-x-auto overflow-y-hidden custom-scrollbar flex items-center px-10 relative scroll-smooth"
            onWheel={handleWheel}
          >
            {isInitializing ? (
              <div className="flex flex-col items-center gap-4 m-auto">
                <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-cyan-500 font-tech animate-pulse text-sm tracking-widest">NEURAL LINK INITIALIZING...</p>
              </div>
            ) : (
              <div className="flex items-center min-w-max h-[60vh] pt-10">
                {activeChain.map((node, idx) => (
                  <MemoryNodeItem
                    key={node.id}
                    node={node}
                    nextNode={activeChain[idx + 1]}
                    onSelect={setSelectedNode}
                    isSelected={selectedNode?.id === node.id}
                    viewLegacy={viewLegacy}
                  />
                ))}
                {activeChain.length === 0 && !isInitializing && <div className="text-zinc-500 m-auto">无记忆数据</div>}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：详情面板 */}
        <div className="w-96 shrink-0 border-l border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-0 flex flex-col overflow-hidden shadow-2xl relative z-30">
          {notice && (
            <div className="shrink-0 px-4 py-2 border-b border-cyan-900/40 bg-cyan-950/20 text-[11px] text-cyan-300 font-tech">
              {notice}
            </div>
          )}
          {selectedNode ? (
            <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-6">
              {/* 头部信息 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono text-zinc-500">{selectedNode.timeLabel}</span>
                  <div className="flex gap-2">
                    {selectedNode.history && selectedNode.history.length > 0 &&
                      <button onClick={() => setShowHistory(true)} className="text-[10px] text-yellow-500 hover:text-yellow-400 border border-yellow-500/30 px-1.5 rounded">历史记录</button>
                    }
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase border ${selectedNode.type === 'original' ? 'border-cyan-900 text-cyan-500' : selectedNode.type === 'corrupted' ? 'border-purple-900 text-purple-500' : 'border-red-900 text-red-500'}`}>{selectedNode.type}</span>
                  </div>
                </div>
                <h3 className="text-xl font-header text-zinc-100 mb-2">{selectedNode.title}</h3>
              </div>

              {/* 主观记忆 */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase flex items-center gap-1">
                  <span>Subjective Memory</span>
                  <span className="w-full h-px bg-zinc-800"></span>
                </label>
                <div className="p-4 bg-black/40 rounded border border-zinc-800 text-sm text-zinc-300 italic leading-relaxed shadow-inner">
                  "{selectedNode.subjectiveNarrative}"
                </div>
              </div>

              {/* 客观事实 */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase flex items-center gap-1">
                  <span>Objective Truth</span>
                  <span className="w-full h-px bg-zinc-800"></span>
                </label>
                <div className="p-3 bg-zinc-900/30 rounded border border-zinc-800/50 text-xs text-zinc-500 leading-relaxed">
                  {selectedNode.objectiveTruth}
                </div>
              </div>

              {/* 自我看法 */}
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-700 uppercase flex items-center gap-1">
                  <span>Inner Reflection</span>
                  <span className="w-full h-px bg-cyan-900/30"></span>
                </label>
                <div className="p-3 bg-cyan-950/20 rounded border border-cyan-900/30 text-xs text-cyan-400/90 italic">
                  {selectedNode.selfOpinion || "（暂无自我反思）"}
                </div>
              </div>

              {/* 编辑区 */}
              {!viewLegacy && (
                <div className="space-y-4 pt-6 border-t border-zinc-800 mt-auto">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-tech text-zinc-500 uppercase">Neural Editing</h4>
                    <div className="text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {permission.description}
                    </div>
                  </div>

                  <div className="space-y-3 bg-zinc-900/50 p-3 rounded border border-zinc-800/50">
                    <textarea
                      value={tamperDirective}
                      onChange={(e) => setTamperDirective(e.target.value)}
                      placeholder={selectedNode.isImmutable ? "死节点无法修改" : permission.canTamper ? "输入重写方向..." : "权限不足"}
                      className="w-full h-24 bg-black/60 border border-zinc-700 rounded p-2 text-xs text-zinc-300 focus:border-purple-500 focus:outline-none resize-none disabled:opacity-50 placeholder-zinc-600"
                      disabled={isTampering || selectedNode.isImmutable || !permission.canTamper}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleTamper}
                        disabled={isTampering || selectedNode.isImmutable || !permission.canTamper}
                        className={`flex-1 btn ${isTampering || selectedNode.isImmutable || !permission.canTamper ? 'border-zinc-700 text-zinc-500' : 'border-purple-900/50 text-purple-400 hover:bg-purple-900/20 hover:border-purple-500'}`}
                      >
                        {isTampering ? '正在重写...' : '篡改'}
                      </button>
                      {permission.canImplant && (
                        <button
                          onClick={handleImplant}
                          disabled={!tamperDirective.trim()}
                          className="flex-1 btn border-red-900/50 text-red-400 hover:bg-red-900/20 hover:border-red-500 disabled:opacity-50"
                        >
                          植入
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
              <div className="w-20 h-20 rounded-full bg-zinc-800/30 flex items-center justify-center animate-pulse-slow">
                <div className="w-2 h-2 bg-zinc-600 rounded-full" />
              </div>
              <p className="text-sm font-tech tracking-widest">SELECT NODE</p>
            </div>
          )}
        </div>
      </div>

      {showHistory && selectedNode?.history && (
        <HistoryModal
          history={selectedNode.history}
          gameStartTime={gameStartTime}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};
