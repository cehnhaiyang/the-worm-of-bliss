// ============================================
// 少女记忆系统 - 记忆管理与篡改
// Maiden Memory - Memory management & corruption
// ============================================

import { Maiden, MemoryCategory, MemoryNode, generateId, deepCopy } from '../../../meta';

export class MaidenMemory {

  // --------------------------------------------
  // 记忆链管理 (Memory Chain Management)
  // --------------------------------------------

  // 插入新节点到链中
  insertNodes(chain: MemoryNode[], newNodes: MemoryNode[], insertAfterId?: string): MemoryNode[] {
    if (!chain) return [...deepCopy(newNodes)];
    const newChain = deepCopy(chain);
    const nodesToInsert = deepCopy(newNodes);

    if (insertAfterId) {
      const index = newChain.findIndex(n => n.id === insertAfterId);
      if (index !== -1) {
        newChain.splice(index + 1, 0, ...nodesToInsert);
      } else {
        newChain.push(...nodesToInsert);
      }
    } else {
      newChain.push(...nodesToInsert);
    }

    return newChain;
  }

  // 批量插入节点 (针对 AI Deepening 返回的结果)
  batchInsertNodes(chain: MemoryNode[], insertions: { insertAfterId: string; nodes: MemoryNode[] }[]): MemoryNode[] {
    if (!chain) return [];
    const newChain = deepCopy(chain);

    const insertionMap = new Map<string, MemoryNode[]>();
    for (const ins of insertions) {
      if (!insertionMap.has(ins.insertAfterId)) {
        insertionMap.set(ins.insertAfterId, []);
      }
      insertionMap.get(ins.insertAfterId)!.push(...deepCopy(ins.nodes));
    }

    const result: MemoryNode[] = [];
    for (const node of newChain) {
      result.push(node);
      if (insertionMap.has(node.id)) {
        result.push(...insertionMap.get(node.id)!);
      }
    }

    return result;
  }

  // 创建并追加一个植入记忆节点
  createImplantedNode(
    content: string,
    category: MemoryCategory = 'romance',
    gameTimePassed: number = 0,
    depth: number = 1,
    corruptionLevel: number = 100
  ): MemoryNode {
    return {
      id: generateId('node_implant'),
      title: '植入的记忆',
      objectiveTruth: '这段记忆并未真实发生，是由外部意志植入的虚构片段。',
      subjectiveNarrative: content,
      selfOpinion: "这感觉...有些不对劲，但我无法否认它的存在。",
      timeLabel: '未知时刻',
      depth: depth,
      type: 'implanted',
      corruptionLevel: Math.min(100, Math.max(0, corruptionLevel)),
      category: category,
      timestamp: gameTimePassed,
      history: [{
        timestamp: gameTimePassed,
        previousNarrative: '',
        action: 'implant',
        directive: '系统强制植入'
      }],
    };
  }

  // 篡改特定节点
  // 支持增量篡改与明确的防劣化隔离
  tamperNode(
    node: MemoryNode,
    gameTimePassed: number,
    newNarrative: string,
    directive: string = "未指定篡改指令",
    newSelfOpinion?: string,
    corruptionIncrement: number = 100
  ): MemoryNode {
    if (node.isImmutable || node.type === 'dead_node') return node;

    const safeNode = deepCopy(node);
    const previousNarrative = safeNode.subjectiveNarrative;

    const historyEntry = {
      timestamp: gameTimePassed,
      previousNarrative: previousNarrative,
      action: 'tamper' as const,
      directive,
    };

    const newCorruptionLevel = Math.min(100, safeNode.corruptionLevel + corruptionIncrement);
    const isFullyCorrupted = newCorruptionLevel >= 100;

    let newTitle = safeNode.title;
    if (isFullyCorrupted && !newTitle.includes('(已篡改)')) {
      newTitle += ' (已篡改)';
    }

    return {
      ...safeNode,
      type: 'corrupted',
      corruptionLevel: newCorruptionLevel,
      title: newTitle,
      subjectiveNarrative: newNarrative,
      selfOpinion: newSelfOpinion || safeNode.selfOpinion,
      history: [...(safeNode.history || []), historyEntry],
    };
  }

  // 修复/重塑特定节点 (新增补全状态机)
  // 用于神恩净化或解离抵抗
  restoreNode(
    node: MemoryNode,
    gameTimePassed: number,
    newNarrative: string,
    recoveryAmount: number = 50,
    newSelfOpinion?: string
  ): MemoryNode {
    if (node.isImmutable || node.type === 'dead_node' || (node.type === 'original' && node.corruptionLevel === 0)) {
      return node;
    }

    const safeNode = deepCopy(node);
    const previousNarrative = safeNode.subjectiveNarrative;

    const historyEntry = {
      timestamp: gameTimePassed,
      previousNarrative: previousNarrative,
      action: 'restore' as const,
      directive: '意识净化/记忆重塑',
    };

    const newCorruptionLevel = Math.max(0, safeNode.corruptionLevel - recoveryAmount);
    const isFullyRestored = newCorruptionLevel === 0;

    let newTitle = safeNode.title;
    if (isFullyRestored) {
      newTitle = newTitle.replace(' (已篡改)', '');
    }

    return {
      ...safeNode,
      type: isFullyRestored && safeNode.type === 'corrupted' ? 'original' : safeNode.type,
      corruptionLevel: newCorruptionLevel,
      title: newTitle,
      subjectiveNarrative: newNarrative,
      selfOpinion: newSelfOpinion || safeNode.selfOpinion,
      history: [...(safeNode.history || []), historyEntry],
    };
  }

  // 归档当前记忆链 (转化为旧人格)
  archiveMemoryChain(maiden: Maiden): Maiden {
    const safeMaiden = deepCopy(maiden);
    return {
      ...safeMaiden,
      legacyMemoryChain: [...(safeMaiden.legacyMemoryChain || []), ...safeMaiden.memoryChain],
      memoryChain: [],
      memorySummary: "旧日人格已封存。正在等待新意识写入...",
    };
  }

  // 生成记忆链摘要 (用于 Prompt Context 和 UI 展示)
  generateSummaryFromChain(chain: MemoryNode[]): string {
    if (!chain || chain.length === 0) return '记忆一片空白，如同新生儿般纯净。';

    const corruptedCount = chain.filter(n => n.type === 'corrupted').length;
    const implantedCount = chain.filter(n => n.type === 'implanted').length;
    const deadCount = chain.filter(n => n.type === 'dead_node').length;
    const lastNode = chain[chain.length - 1];

    let summary = `她当前承载着${chain.length}段关键人生记忆。`;

    if (corruptedCount > 0 || implantedCount > 0 || deadCount > 0) {
      const totalAlteredCount = corruptedCount + implantedCount + deadCount;
      const percentage = Math.round((totalAlteredCount / chain.length) * 100);

      const details: string[] = [];
      if (corruptedCount > 0) details.push(`${corruptedCount}段原有记忆被扭曲篡改`);
      if (implantedCount > 0) details.push(`${implantedCount}段虚假记忆被强行植入`);
      if (deadCount > 0) details.push(`${deadCount}段记忆已彻底死亡固化`);

      summary += ` 约${percentage}%的记忆锚点已被污染（${details.join('，')}）。现实与虚幻的界限在她脑海中正在崩解。`;
    } else {
      summary += ' 她的过往记忆目前保持着脆弱的完整，这在这个地狱中是一种残酷的负担，让她时刻痛苦地意识到自己失去了什么。';
    }

    if (lastNode) {
      const stateDesc = lastNode.corruptionLevel >= 80 ? '扭曲而混沌的' : '清晰的';
      summary += ` 她脑海中最近回荡着的是"${lastNode.title}"那一刻${stateDesc}画面，这是她灵魂当前最浅层的烙印。`;
    }

    return summary;
  }
}

export const maidenMemory = new MaidenMemory();