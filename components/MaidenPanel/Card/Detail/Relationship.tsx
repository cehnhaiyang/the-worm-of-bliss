
// ============================================
// 关系面板 - 全屏版本
// ============================================

import React, { useMemo, memo } from 'react';
import { Maiden, RelationType } from '../../../../meta';
import { getCurrentCarriageId } from '../../../../const';

import { useGameEngine } from '../../../../engines';

interface RelationshipProps {
  maiden: Maiden;
  allMaidens: Map<string, Maiden>;
  onClose: () => void;
  onMaidenSelect: (maidenId: string) => void;
}

const RELATION_STYLES: Record<RelationType, { color: string; bgColor: string; label: string }> = {
  [RelationType.STRANGER]: { color: 'text-zinc-500', bgColor: 'bg-zinc-800/50', label: '陌生' },
  [RelationType.ACQUAINTANCE]: { color: 'text-zinc-400', bgColor: 'bg-zinc-800/50', label: '认识' },
  [RelationType.FRIEND]: { color: 'text-green-400', bgColor: 'bg-green-900/30', label: '朋友' },
  [RelationType.CLOSE_FRIEND]: { color: 'text-emerald-400', bgColor: 'bg-emerald-900/30', label: '密友' },
  [RelationType.RIVAL]: { color: 'text-orange-400', bgColor: 'bg-orange-900/30', label: '对手' },
  [RelationType.ENEMY]: { color: 'text-red-400', bgColor: 'bg-red-900/30', label: '敌人' },
  [RelationType.PROTECTOR]: { color: 'text-blue-400', bgColor: 'bg-blue-900/30', label: '保护者' },
  [RelationType.DEPENDENT]: { color: 'text-purple-400', bgColor: 'bg-purple-900/30', label: '依赖' },
  [RelationType.ACCOMPLICE]: { color: 'text-pink-400', bgColor: 'bg-pink-900/30', label: '共犯' },
};

interface RelationshipItemProps {
  targetMaiden: Maiden;
  relationType: RelationType;
  affinity: number;
  trust: number;
  sharedTrauma: boolean;
  onSelect: (id: string) => void;
}

const RelationshipItem = memo<RelationshipItemProps>(({ targetMaiden, relationType, affinity, trust, sharedTrauma, onSelect }) => {
  const style = RELATION_STYLES[relationType];
  const affinityColor = affinity > 0 ? 'text-green-400' : affinity < 0 ? 'text-red-400' : 'text-zinc-400';

  return (
    <button
      onClick={() => onSelect(targetMaiden.id)}
      className="w-full p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-all text-left"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-mono text-sm">
            {targetMaiden.name.charAt(0)}
          </div>
          <div>
            <div className="text-zinc-200 font-medium">{targetMaiden.name}</div>
            <div className="text-[10px] text-zinc-500 font-mono">{getCurrentCarriageId(targetMaiden)}</div>

          </div>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${style.color} ${style.bgColor}`}>
          {style.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-zinc-500 mb-1">好感度</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${affinity >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.abs(affinity)}%`, marginLeft: affinity < 0 ? 'auto' : 0 }}
              />
            </div>
            <span className={`text-xs font-mono ${affinityColor}`}>
              {affinity > 0 ? '+' : ''}{affinity}
            </span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 mb-1">信任</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${trust}%` }} />
            </div>
            <span className="text-xs font-mono text-blue-400">{trust}</span>
          </div>
        </div>
      </div>

      {sharedTrauma && (
        <div className="mt-3 px-2 py-1 rounded bg-purple-900/20 border border-purple-800/30 text-center">
          <span className="text-purple-400 text-[10px]">创伤纽带</span>
        </div>
      )}
    </button>
  );
});

RelationshipItem.displayName = 'RelationshipItem';

export const Relationship: React.FC<RelationshipProps> = ({ maiden, allMaidens, onClose, onMaidenSelect }) => {
  const { getRelationshipsOf, getRelationshipStats, getMaidenView } = useGameEngine();

  const relationships = useMemo(
    () => getRelationshipsOf(maiden),
    [getRelationshipsOf, maiden]
  );

  const stats = useMemo(
    () => getRelationshipStats(maiden),
    [getRelationshipStats, maiden]
  );

  const weights = getMaidenView(maiden).weights;

  // 计算社交状态标签
  const socialStatus = useMemo(() => {
    if (relationships.length === 0) return { label: '孤立者', color: 'text-zinc-500' };
    if (stats.enemies > stats.friends * 2) return { label: '被排斥者', color: 'text-red-400' };
    if (stats.friends > 5) return { label: '社交中心', color: 'text-green-400' };
    if (stats.accomplices > 0) return { label: '阴谋家', color: 'text-pink-400' };
    if (stats.dependents > 2) return { label: '照顾者', color: 'text-blue-400' };
    return { label: '普通', color: 'text-zinc-400' };
  }, [relationships, stats]);

  const groupedRelations = useMemo(() => {
    const groups: Record<string, typeof relationships> = {
      positive: relationships.filter(r => [RelationType.FRIEND, RelationType.CLOSE_FRIEND, RelationType.PROTECTOR].includes(r.type as any)),
      negative: relationships.filter(r => [RelationType.RIVAL, RelationType.ENEMY].includes(r.type as any)),
      special: relationships.filter(r => [RelationType.ACCOMPLICE, RelationType.DEPENDENT].includes(r.type as any)),
      neutral: relationships.filter(r => r.type === RelationType.ACQUAINTANCE),
    };
    return groups;
  }, [relationships]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* 顶部栏 */}
      <div className="h-14 border-b border-emerald-900/30 bg-zinc-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-header text-zinc-100 tracking-wider">SOCIAL NETWORK</h2>
          <span className="text-sm text-zinc-500 font-mono">关系网络</span>
          <span className="px-2 py-1 rounded bg-emerald-900/30 text-emerald-400 text-xs font-mono">{relationships.length} CONNECTIONS</span>
        </div>
        <button onClick={onClose} className="btn btn-ghost hover:text-red-400">CLOSE</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：当前少女信息 */}
        <div className="w-96 border-r border-zinc-800 bg-zinc-900/50 p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h3 className="text-lg font-header text-zinc-200 mb-1">{maiden.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 font-mono">{maiden.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded bg-zinc-800 ${socialStatus.color}`}>{socialStatus.label}</span>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="p-3 rounded bg-green-900/20 border border-green-800/30">
              <div className="text-[10px] text-zinc-500 uppercase mb-1">友好</div>
              <div className="text-2xl font-mono text-green-400">{stats.friends}</div>
            </div>
            <div className="p-3 rounded bg-red-900/20 border border-red-800/30">
              <div className="text-[10px] text-zinc-500 uppercase mb-1">敌对</div>
              <div className="text-2xl font-mono text-red-400">{stats.enemies}</div>
            </div>
            <div className="p-3 rounded bg-pink-900/20 border border-pink-800/30">
              <div className="text-[10px] text-zinc-500 uppercase mb-1">共犯</div>
              <div className="text-2xl font-mono text-pink-400">{stats.accomplices}</div>
            </div>
            <div className="p-3 rounded bg-purple-900/20 border border-purple-800/30">
              <div className="text-[10px] text-zinc-500 uppercase mb-1">创伤纽带</div>
              <div className="text-2xl font-mono text-purple-400">{stats.traumaBonds}</div>
            </div>
          </div>

          {/* 人格特征影响：权重为 0–1，展示时换算为 0–100 */}
          {maiden.isshex && (
            <div className="p-4 rounded bg-zinc-800/30 border border-zinc-700/50">
              <div className="text-[10px] text-zinc-500 uppercase mb-3">社交倾向</div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">社交寻求</span>
                  <span className="text-cyan-400 font-mono">{Math.round(weights.socialSeek * 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">独处倾向</span>
                  <span className="text-blue-400 font-mono">{Math.round(weights.solitudeSeek * 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">共情能力</span>
                  <span className="text-green-400 font-mono">{Math.round(weights.empathy * 100)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">攻击性</span>
                  <span className="text-red-400 font-mono">{Math.round(weights.aggressiveness * 100)}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 右侧：关系列表 */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {relationships.length > 0 ? (
            <div className="space-y-8">
              {/* 正面关系 */}
              {groupedRelations.positive.length > 0 && (
                <div>
                  <h4 className="text-sm font-tech text-green-400 uppercase mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    友好关系 ({groupedRelations.positive.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedRelations.positive.map(rel => {
                      const target = allMaidens.get(rel.targetId);
                      if (!target) return null;
                      return (
                        <RelationshipItem
                          key={rel.targetId}
                          targetMaiden={target}
                          relationType={rel.type}
                          affinity={rel.affinity}
                          trust={rel.trust}
                          sharedTrauma={rel.sharedTrauma}
                          onSelect={onMaidenSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 负面关系 */}
              {groupedRelations.negative.length > 0 && (
                <div>
                  <h4 className="text-sm font-tech text-red-400 uppercase mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    敌对关系 ({groupedRelations.negative.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedRelations.negative.map(rel => {
                      const target = allMaidens.get(rel.targetId);
                      if (!target) return null;
                      return (
                        <RelationshipItem
                          key={rel.targetId}
                          targetMaiden={target}
                          relationType={rel.type}
                          affinity={rel.affinity}
                          trust={rel.trust}
                          sharedTrauma={rel.sharedTrauma}
                          onSelect={onMaidenSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 特殊关系 */}
              {groupedRelations.special.length > 0 && (
                <div>
                  <h4 className="text-sm font-tech text-pink-400 uppercase mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-pink-400" />
                    特殊关系 ({groupedRelations.special.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedRelations.special.map(rel => {
                      const target = allMaidens.get(rel.targetId);
                      if (!target) return null;
                      return (
                        <RelationshipItem
                          key={rel.targetId}
                          targetMaiden={target}
                          relationType={rel.type}
                          affinity={rel.affinity}
                          trust={rel.trust}
                          sharedTrauma={rel.sharedTrauma}
                          onSelect={onMaidenSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 普通关系 */}
              {groupedRelations.neutral.length > 0 && (
                <div>
                  <h4 className="text-sm font-tech text-zinc-400 uppercase mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-400" />
                    认识 ({groupedRelations.neutral.length})
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {groupedRelations.neutral.map(rel => {
                      const target = allMaidens.get(rel.targetId);
                      if (!target) return null;
                      return (
                        <RelationshipItem
                          key={rel.targetId}
                          targetMaiden={target}
                          relationType={rel.type}
                          affinity={rel.affinity}
                          trust={rel.trust}
                          sharedTrauma={rel.sharedTrauma}
                          onSelect={onMaidenSelect}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <div className="w-20 h-20 rounded-full bg-zinc-800/30 flex items-center justify-center mb-4">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm">{maiden.name} 尚未与他人建立联系</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
