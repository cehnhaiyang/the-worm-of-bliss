// ============================================
// 少女子系统在 React 侧的唯一门面
//
// 分层：`MaidenSystem` 是无状态、无 React 的静态对象，只提供领域算法；
// 本 hook 持有实体表这一份状态，并把系统的所有使用点收拢到这里。
// 对外只有 `useMaiden` 一个出口，入参/出参接口是本模块内部契约。
// ============================================

import { useCallback, useMemo, useState } from 'react';
import {
    Carriage,
    Maiden,
    MaidenSummary,
    MaidenView,
    MemoryNode,
    PregnancyStats,
    PregnancyState,
    Relationship,
    RelationshipStats,
} from '../../meta';
import {
    getPregnancyStats,
    getRelationshipStats,
    getSignificantRelationships,
    isAlteredMemory,
    mergeMaiden,
} from '../../const';
import { maidenSystem, personalityView, PersonalityView } from '../systems';

interface UseMaidenParams {
    /** 初始实体表；默认空表，由 `generate` 填充 */
    initialMaidens?: Map<string, Maiden>;
}

interface UseMaidenReturn {
    maidens: Map<string, Maiden>;
    /** 供读档整表替换；日常写入走下面各方法 */
    setMaidens: React.Dispatch<React.SetStateAction<Map<string, Maiden>>>;

    // --- 种群 ---
    /** 生成初始种群。会就地修改传入的 `carriages`（追加 occupants），因此必须传可变副本 */
    generate: (carriages: Map<string, Carriage>) => void;
    /** 卡片列表所需的轻量投影 */
    summaries: MaidenSummary[];
    /** 某节车厢内的实体；缺员 id 直接跳过，不产生空洞 */
    maidensIn: (carriage: Carriage) => Maiden[];

    // --- 派生视图 ---
    viewOf: (maiden: Maiden) => MaidenView;

    // --- 写入 ---
    /**
     * 按 id 归并单个实体：`updater` 收到 store 中的**最新**实体。
     *
     * 这是整实体写入的唯一入口。异步结果必须经它回写而不是写快照——请求在飞的
     * 数秒里该实体仍被时间循环推进，拿旧快照覆盖会把这些改动一起回滚。
     */
    updateMaiden: (maidenId: string, updater: (current: Maiden) => Maiden) => void;

    // --- 记忆 ---
    /** 覆盖整条链（初次生成 / 深潜）。空链表示生成失败，不写入 */
    setMemoryChain: (maidenId: string, chain: MemoryNode[]) => void;
    /** 用新的意识基石替换整条链，放弃旧链 */
    applyGenesis: (maidenId: string, nodes: MemoryNode[]) => void;
    /** 篡改或修复单个节点；返回落链后的节点供 UI 立即选中 */
    tamperMemory: (
        maidenId: string,
        node: MemoryNode,
        narrative: string,
        directive: string,
        selfOpinion?: string
    ) => MemoryNode | undefined;
    /** 植入一段并未真实发生的记忆；返回节点供 UI 立即选中 */
    implantMemory: (maidenId: string, content: string, afterNodeId?: string) => MemoryNode | undefined;

    // --- 妊娠与关系 ---
    pregnancyOf: (maiden: Maiden) => PregnancyState | undefined;
    /** 全部在孕实体及其状态；缺一边都无法渲染，因此成对给出 */
    getPregnancies: () => Array<{ maiden: Maiden; state: PregnancyState }>;
    getPregnancyStats: () => PregnancyStats;
    /** 已剔除陌生、按好感降序的关系列表 */
    relationshipsOf: (maiden: Maiden) => Relationship[];
    relationshipStats: (maiden: Maiden) => RelationshipStats;
}

export const useMaiden = ({ initialMaidens }: UseMaidenParams = {}): UseMaidenReturn => {
    const [maidens, setMaidens] = useState<Map<string, Maiden>>(() => initialMaidens ?? new Map());

    const summaries = useMemo(() => maidenSystem.getMaidenSummaries(maidens), [maidens]);

    // 在孕实体的投影：面板要的是"实体 + 状态"成对出现，缺一边都无法渲染
    const pregnancies = useMemo(() => {
        const result: Array<{ maiden: Maiden; state: PregnancyState }> = [];
        for (const maiden of maidens.values()) {
            const state = maiden.physiology.pregnancy;
            if (state) result.push({ maiden, state });
        }
        return result;
    }, [maidens]);

    const stats = useMemo(() => getPregnancyStats(maidens), [maidens]);

    // 两者都由实体表现算，因此以闭包暴露，调用点读到的永远是当前表
    const getPregnancies = useCallback(() => pregnancies, [pregnancies]);
    const getPregnancyStatsFn = useCallback(() => stats, [stats]);

    /**
     * 派生结果按权威字段的引用缓存。
     *
     * 这两个字段一律不可变写入（写入方产出新对象），因此引用不变即派生结果不变；
     * 缓存放本层而不是组件里，是因为派生规则归本层所有。
     */
    const personalityCache = useMemo(() => new WeakMap<Maiden['isshex'], PersonalityView>(), []);
    const summaryCache = useMemo(() => new WeakMap<MemoryNode[], string>(), []);

    const viewOf = useCallback((maiden: Maiden): MaidenView => {
        let personality = personalityCache.get(maiden.isshex);
        if (!personality) {
            personality = personalityView(maiden);
            personalityCache.set(maiden.isshex, personality);
        }

        let memorySummary = summaryCache.get(maiden.memoryChain);
        if (memorySummary === undefined) {
            memorySummary = maidenSystem.memory.generateSummaryFromChain(maiden.memoryChain);
            summaryCache.set(maiden.memoryChain, memorySummary);
        }

        return {
            personalityDescription: personality.label,
            memorySummary,
            alteredMemoryCount: maiden.memoryChain.filter(isAlteredMemory).length,
            weights: personality.weights,
            facets: maiden.isshex.facets,
            personality,
        };
    }, [personalityCache, summaryCache]);

    const generate = useCallback((carriages: Map<string, Carriage>) => {
        setMaidens(maidenSystem.generateMaidens(carriages));
    }, []);

    const maidensIn = useCallback(
        (carriage: Carriage) =>
            carriage.occupants
                .map(id => maidens.get(id))
                .filter((m): m is Maiden => m !== undefined),
        [maidens]
    );

    const updateMaiden = useCallback((maidenId: string, updater: (current: Maiden) => Maiden) => {
        setMaidens(prev => mergeMaiden(prev, maidenId, updater));
    }, []);

    const setMemoryChain = useCallback((maidenId: string, chain: MemoryNode[]) => {
        if (chain.length === 0) return;
        updateMaiden(maidenId, current => ({ ...current, memoryChain: chain }));
    }, [updateMaiden]);

    const applyGenesis = useCallback((maidenId: string, nodes: MemoryNode[]) => {
        updateMaiden(maidenId, current => ({ ...current, memoryChain: nodes }));
    }, [updateMaiden]);

    const tamperMemory = useCallback((
        maidenId: string,
        node: MemoryNode,
        narrative: string,
        directive: string,
        selfOpinion?: string
    ): MemoryNode | undefined => {
        const current = maidens.get(maidenId);
        if (!current) return undefined;

        const tampered = maidenSystem.memory.tamperNode(
            node, current.lastUpdateTime, narrative, directive, selfOpinion
        );
        updateMaiden(maidenId, latest => ({
            ...latest,
            memoryChain: maidenSystem.memory.replaceNode(latest.memoryChain, tampered),
        }));
        return tampered;
    }, [maidens, updateMaiden]);

    const implantMemory = useCallback((
        maidenId: string,
        content: string,
        afterNodeId?: string
    ): MemoryNode | undefined => {
        const current = maidens.get(maidenId);
        if (!current) return undefined;

        // 节点在此创建并返回，调用方才能立刻选中它；落点由链层按登车瞬间不变量决定
        const node = maidenSystem.memory.createImplantedNode(content, 'trauma', current.lastUpdateTime);
        updateMaiden(maidenId, latest => ({
            ...latest,
            memoryChain: maidenSystem.memory.insertNode(latest.memoryChain, node, afterNodeId),
        }));
        return node;
    }, [maidens, updateMaiden]);

    const pregnancyOf = useCallback(
        (maiden: Maiden) => maidenSystem.pregnancy.getPregnancyState(maiden),
        []
    );

    const relationshipsOf = useCallback((maiden: Maiden) => getSignificantRelationships(maiden), []);

    const relationshipStats = useCallback(
        (maiden: Maiden) => getRelationshipStats(relationshipsOf(maiden)),
        [relationshipsOf]
    );

    return {
        maidens,
        setMaidens,
        generate,
        summaries,
        maidensIn,
        viewOf,
        updateMaiden,
        setMemoryChain,
        applyGenesis,
        tamperMemory,
        implantMemory,
        pregnancyOf,
        getPregnancies,
        getPregnancyStats: getPregnancyStatsFn,
        relationshipsOf,
        relationshipStats,
    };
};
