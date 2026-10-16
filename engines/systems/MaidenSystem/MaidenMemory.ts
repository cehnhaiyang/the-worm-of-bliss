// ============================================
// 少女记忆系统 - 记忆链的唯一权威
// Maiden Memory - the single authority over the chain
// ============================================

import { Maiden, MemoryCategory, MemoryNode, generateId, deepCopy } from '../../../meta';

/** AI 返回的原始节点：位于信任边界之外，字段可能缺失或类型错误 */
export interface RawMemoryNode {
  title?: unknown;
  objectiveTruth?: unknown;
  subjectiveNarrative?: unknown;
  selfOpinion?: unknown;
  timeLabel?: unknown;
  category?: unknown;
}

/** 一次插叙请求。`depth` 不在其中：新节点层级由锚点推导 */
export interface RawInsertion {
  insertAfterNodeId: string;
  nodes: RawMemoryNode[];
}

/** 被拒绝的插叙及其原因，供调用方汇总后告知玩家 */
export interface ChainRejection {
  anchorId: string;
  titles: string[];
  reason: string;
}

const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
  'childhood', 'family', 'friendship', 'romance', 'trauma', 'train', 'master', 'abyss',
];

function asText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asCategory(value: unknown, fallback: MemoryCategory): MemoryCategory {
  return MEMORY_CATEGORIES.includes(value as MemoryCategory) ? value as MemoryCategory : fallback;
}

/**
 * 判断节点是否"被改动过"——篡改或植入。
 * 登车瞬间（死节点）只是不可编辑，不属于被污染的记忆，故不计入。
 */
export function isAlteredMemory(node: MemoryNode): boolean {
  return node.type === 'corrupted' || node.type === 'implanted';
}

export class MaidenMemory {

  // --------------------------------------------
  // 链构建与不变量
  // --------------------------------------------

  /**
   * 载入 AI 生成的初始记忆链。
   * 深度固定为 1；空数组表示生成失败，调用方不应写入链。
   */
  buildInitialChain(raw: RawMemoryNode[], timestamp: number): MemoryNode[] {
    const nodes: MemoryNode[] = raw.map((node, index) => ({
      id: generateId('mem_node'),
      title: asText(node.title, `记忆 ${index + 1}`),
      objectiveTruth: asText(node.objectiveTruth, '（内容缺失）'),
      subjectiveNarrative: asText(node.subjectiveNarrative, '（内容缺失）'),
      selfOpinion: asText(node.selfOpinion, '...'),
      timeLabel: asText(node.timeLabel, '未知时刻'),
      depth: 1,
      type: 'original',
      corruptionLevel: 0,
      category: asCategory(node.category, 'childhood'),
      timestamp,
    }));
    return this.syncTail(nodes);
  }

  /**
   * 链尾不变量：最后一个节点是"登车瞬间"，不可编辑。
   * 该不变量只在本模块维护，外部不得自行标记死节点——否则链尾会与 type/isImmutable 脱节。
   */
  private syncTail(chain: MemoryNode[]): MemoryNode[] {
    return chain.map((node, index) => {
      const isTail = index === chain.length - 1;
      const type: MemoryNode['type'] = isTail ? 'dead_node' : node.type === 'dead_node' ? 'original' : node.type;
      const category: MemoryCategory = isTail ? 'train' : node.category;
      const isImmutable = isTail ? true : undefined;
      if (node.type === type && node.category === category && node.isImmutable === isImmutable) return node;
      return { ...node, type, category, isImmutable };
    });
  }

  /** 插入新节点后重整链尾标记，返回新链 */
  private commit(chain: MemoryNode[]): MemoryNode[] {
    return this.syncTail(chain);
  }

  /**
   * 按锚点写入一批插叙节点。
   * - 层级由锚点推导（锚点 depth + 1），不采信 AI 返回值
   * - 未知锚点与"登车之后"的插入被拒绝并回报，而不是静默丢弃
   */
  insertInputs(
    chain: MemoryNode[],
    insertions: RawInsertion[],
    timestamp: number
  ): { chain: MemoryNode[]; rejections: ChainRejection[] } {
    const next = deepCopy(chain);
    const rejections: ChainRejection[] = [];

    for (const insertion of insertions) {
      const titles = insertion.nodes.map(n => asText(n.title, '未命名记忆'));
      const index = next.findIndex(n => n.id === insertion.insertAfterNodeId);
      if (index === -1) {
        rejections.push({ anchorId: insertion.insertAfterNodeId, titles, reason: '引用了不存在的锚点' });
        continue;
      }
      if (next[index].isImmutable) {
        rejections.push({ anchorId: insertion.insertAfterNodeId, titles, reason: '不能接续在登车瞬间之后' });
        continue;
      }

      const depth = next[index].depth + 1;
      const nodes: MemoryNode[] = insertion.nodes.map((node, offset) => ({
        id: generateId('mem_node_deep'),
        title: asText(node.title, `插叙 ${offset + 1}`),
        objectiveTruth: asText(node.objectiveTruth, '（内容缺失）'),
        subjectiveNarrative: asText(node.subjectiveNarrative, '（内容缺失）'),
        selfOpinion: asText(node.selfOpinion, '...'),
        timeLabel: asText(node.timeLabel, '未知时刻'),
        depth,
        type: 'original',
        corruptionLevel: 0,
        category: asCategory(node.category, 'childhood'),
        timestamp,
      }));
      next.splice(index + 1, 0, ...nodes);
    }

    return { chain: this.commit(next), rejections };
  }

  /**
   * 写入单个植入节点。
   * 植入内容不属于她的人生，因此绝不落在登车瞬间之后：
   * 有合法锚点则接在锚点之后，否则落在登车瞬间之前。
   */
  insertNode(chain: MemoryNode[], node: MemoryNode, afterNodeId?: string): MemoryNode[] {
    const next = deepCopy(chain);
    const anchorIndex = afterNodeId ? next.findIndex(n => n.id === afterNodeId) : -1;
    const tailIndex = next.findIndex(n => n.isImmutable);

    if (anchorIndex !== -1 && !next[anchorIndex].isImmutable) {
      next.splice(anchorIndex + 1, 0, node);
    } else if (tailIndex === -1) {
      next.push(node);
    } else {
      next.splice(tailIndex, 0, node);
    }

    return this.commit(next);
  }

  /** 用编辑后的节点替换链中的同名节点（篡改与修复的共同写回路径） */
  replaceNode(chain: MemoryNode[], node: MemoryNode): MemoryNode[] {
    return this.commit(chain.map(n => (n.id === node.id ? node : n)));
  }

  // --------------------------------------------
  // 摘要（由链派生）
  // --------------------------------------------

  /**
   * 记忆链 -> 紧凑摘要，供 AI 上下文与卡片展示共用。
   * 摘要不是独立字段：唯一来源是 `chain` 本身，因此任何写入链的路径都自动保持一致。
   */
  generateSummaryFromChain(chain: MemoryNode[]): string {
    if (!chain || chain.length === 0) return '记忆一片空白，如同新生儿般纯净。';

    const corruptedCount = chain.filter(n => n.type === 'corrupted').length;
    const implantedCount = chain.filter(n => n.type === 'implanted').length;
    const alteredCount = corruptedCount + implantedCount;

    let summary = `她当前承载着${chain.length}段关键人生记忆。`;

    if (alteredCount > 0) {
      const percentage = Math.round((alteredCount / chain.length) * 100);
      const details: string[] = [];
      if (corruptedCount > 0) details.push(`${corruptedCount}段原有记忆被扭曲篡改`);
      if (implantedCount > 0) details.push(`${implantedCount}段虚假记忆被强行植入`);

      summary += ` 约${percentage}%的记忆锚点已被污染（${details.join('，')}）。现实与虚幻的界限在她脑海中正在崩解。`;
    } else {
      summary += ' 她的过往记忆目前保持着脆弱的完整，这在这个地狱中是一种残酷的负担，让她时刻痛苦地意识到自己失去了什么。';
    }

    const lastNode = chain[chain.length - 1];
    if (lastNode) {
      const stateDesc = lastNode.corruptionLevel >= 80 ? '扭曲而混沌的' : '清晰的';
      summary += ` 她脑海中最近回荡着的是"${lastNode.title}"那一刻${stateDesc}画面，这是她灵魂当前最浅层的烙印。`;
    }

    return summary;
  }

  // --------------------------------------------
  // 植入与篡改
  // --------------------------------------------

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
    if (node.isImmutable) return node;

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
    if (node.isImmutable || (node.type === 'original' && node.corruptionLevel === 0)) {
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
    };
  }
}

export const maidenMemory = new MaidenMemory();
