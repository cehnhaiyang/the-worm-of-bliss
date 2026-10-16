// ============================================
// 记忆链的 store 写回
// 记忆字段的单一写点：链的改动只经由这里落到 store。
// 摘要不再是存储字段，任何消费者都从链派生，因此不存在"链变了摘要没变"的状态。
// 回写按 id 合并到 store 中的最新对象，绝不整对象替换——请求在飞期间
// 少女的属性、孕周、位置仍在被时间循环推进，用旧快照覆盖会把这些一起回滚。
// ============================================

import { Maiden, MemoryNode } from '../../meta';
import { maidenSystem } from '../systems';

export type MaidenMapUpdater = (updater: (prev: Map<string, Maiden>) => Map<string, Maiden>) => void;

function writeChain(update: MaidenMapUpdater, maidenId: string, chain: MemoryNode[]): void {
  update(prev => {
    const current = prev.get(maidenId);
    if (!current) return prev;
    const next = new Map(prev);
    next.set(maidenId, { ...current, memoryChain: chain });
    return next;
  });
}

/** 覆盖整条链（初次生成 / 深潜）。空链表示生成失败，不得写入。 */
export function commitChain(update: MaidenMapUpdater, maidenId: string, chain: MemoryNode[]): void {
  if (chain.length === 0) return;
  writeChain(update, maidenId, chain);
}

/** 篡改或修复单个节点：替换链上的同名节点 */
export function commitNodeEdit(update: MaidenMapUpdater, maidenId: string, node: MemoryNode): void {
  update(prev => {
    const current = prev.get(maidenId);
    if (!current) return prev;
    const next = new Map(prev);
    next.set(maidenId, { ...current, memoryChain: maidenSystem.memory.replaceNode(current.memoryChain, node) });
    return next;
  });
}

/**
 * 植入单个节点：写回时按登车瞬间不变量决定落点。
 * 节点由调用方创建（这样 UI 能立刻选中它），此处只负责落链与合并 store。
 */
export function commitNodeInsert(
  update: MaidenMapUpdater,
  maidenId: string,
  node: MemoryNode,
  afterNodeId?: string
): void {
  update(prev => {
    const current = prev.get(maidenId);
    if (!current) return prev;
    const next = new Map(prev);
    next.set(maidenId, { ...current, memoryChain: maidenSystem.memory.insertNode(current.memoryChain, node, afterNodeId) });
    return next;
  });
}

/** 创世纪：用新的意识基石替换整条链，放弃旧链 */
export function commitGenesis(update: MaidenMapUpdater, maidenId: string, nodes: MemoryNode[]): void {
  update(prev => {
    const current = prev.get(maidenId);
    if (!current) return prev;
    const next = new Map(prev);
    next.set(maidenId, { ...current, memoryChain: nodes });
    return next;
  });
}
