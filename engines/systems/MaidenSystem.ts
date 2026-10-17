import {
    AccessoryItem,
    ActivityStatus,
    AppearanceData,
    AttireState,
    AttributeKey,
    BehaviorState,
    BehaviorWeights,
    Carriage,
    CarriageType,
    ChainRejection,
    CharacterAttributes,
    CharacterRank,
    CharacterStatus,
    ClothingState,
    CUP_SIZES,
    DressLevel,
    EventEffectContext,
    EventTimestampData,
    EventType,
    GameEvent,
    HexacoFacets,
    HexacoProfile,
    ISShexPersonality,
    ItemDef,
    LogType,
    Maiden,
    MaidenSummary,
    MemoryAction,
    MemoryCategory,
    MemoryNode,
    MetaTraits,
    MoodChangeEvent,
    MoodState,
    NameOrigin,
    NarcissusEligibility,
    NarcissusStage,
    NarcissusState,
    OctantAffinity,
    OctantId,
    PersonalityDynamics,
    PersonalityProfile,
    PersonalityState,
    PhysicalStats,
    PhysiologicalState,
    PregnancyData,
    PregnancyEvent,
    PregnancyStage,
    PregnancyState,
    ProxyId,
    RawInsertion,
    RawDeadNode,
    RawMemoryNode,
    RelationType,
    Relationship,
    RelationshipNetworkData,
    SignatureMatch,
    SignatureId,
    SituationType,
    SocialContext,
    SocialInteractionType,
    SpontaneousAction,
    SpontaneousActionEvent,
    StateChange,
    UnifiedMovementState,
} from '../../meta';
import {
    OCTANT_LABELS,
    SIGNATURE_LABELS,
    buildRelationshipIndex,
    clamp,
    createUnifiedMovementState,
    deepCopy,
    deriveBehaviorWeights,
    deriveDomains,
    DOMAIN_FACETS,
    findNearestCarriageByFunction,
    findNearestCarriageByType,
    formatPreciseAge,
    generateId,
    getAllRelationships,
    getCurrentCarriageId,
    getRelationship,
    isAlteredMemory,
    isRestTime,
    makeCarriageId,
    parseCarriageId,
    probabilityCheck,
    randomElement,
    randomFloat,
    randomInt,
    restandardize,
    setRelationship,
    startMovement,
    weightedRandom,
} from '../../const';
import {
    ACCESSORY_COLORS,
    ACCESSORY_MATERIALS,
    ACCESSORY_TYPES,
    ALL_NAME_DATASETS,
    BATHING_OUTERWEAR_LAYER,
    BIRTHMARKS,
    BODY_ARCHETYPES,
    BODY_MARKS,
    BOTTOM_COLORS,
    BOTTOM_MATERIALS,
    BOTTOM_TYPES,
    BRA_COLORS,
    BRA_MATERIALS,
    BRA_TYPES,
    CARRIAGE_FUNCTIONS,
    CARRIAGE_TYPE_INFO,
    CHANGE_THRESHOLDS,
    COPING_MECHANISMS,
    DISLIKES,
    EYE_COLORS,
    EYE_EXPRESSIONS,
    EYE_SHAPES,
    FACIAL_FEATURES,
    FETISHES,
    GAME_CONFIG,
    GLOVE_COLORS,
    GLOVE_MATERIALS,
    GLOVE_TYPES,
    HAIR_COLORS,
    HAIR_LENGTHS,
    HAIR_STYLES,
    HAIR_TEXTURES,
    HOBBIES,
    NAKED_INTIMATE_LAYER,
    NAKED_UNDERGARMENT_LAYER,
    NEED_THRESHOLDS,
    NEGATIVE_TRAITS,
    PANTY_COLORS,
    PANTY_MATERIALS,
    PANTY_TYPES,
    POSITIVE_TRAITS,
    SHOE_COLORS,
    SHOE_MATERIALS,
    SHOE_TYPES,
    SKIN_TEXTURES,
    SKIN_TONES,
    STOCKING_COLORS,
    STOCKING_MATERIALS,
    STOCKING_TYPES,
    TIME_CONFIG,
    TOP_COLORS,
    TOP_MATERIALS,
    TOP_TYPES,
    UNDERPANTS_COLORS,
    UNDERPANTS_MATERIALS,
    UNDERPANTS_TYPES,
    UNDERSHIRT_COLORS,
    UNDERSHIRT_MATERIALS,
    UNDERSHIRT_TYPES,
    calculateDressLevel,
    isBondageAccessory,
    isCarryableItem,
} from '../../constants';

const MEMORY_CATEGORIES: readonly MemoryCategory[] = [
    'childhood', 'family', 'friendship', 'romance', 'trauma', 'train', 'master', 'abyss',
];

/**
 * 记忆文本字段的强制收敛。
 * AI 返回的字段可能缺失、为空串或类型不符，未收敛的空串会被 UI 当作有效内容渲染，
 * 因此每个落库字段都必须经此降级后再写入链。
 */
function asText(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** 记忆分类合法性校验，越界时回落到调用方指定的类别 */
function asCategory(value: unknown, fallback: MemoryCategory): MemoryCategory {
    return MEMORY_CATEGORIES.includes(value as MemoryCategory) ? value as MemoryCategory : fallback;
}

/**
 * 记忆链子系统。
 * 链是记忆的唯一权威数据，摘要、污染统计等一切派生量都从链现算，不额外持久化。
 */
class MaidenMemory {

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
     * 链的不变量：链尾永远不可编辑；已存在的死节点永远保持不可编辑。
     *
     * 只有这一条规则，同时覆盖两种链：
     * - 初始链/深潜链：只有链尾（登车瞬间）是死节点，其余为 original；
     * - 创世纪链：每一节都是"新存在的公理"，全部已是死节点。
     *
     * v1 写死了"非链尾的死节点一律降级为 original"。创世纪之后只要再植入一段记忆，
     * 其余公理就被降级成可篡改的 original——提示词向模型承诺的"这些记忆不可篡改"
     * 在第一次植入后就不成立了，而代码里看不出任何不一致。
     * 因此 `isImmutable` 是权威，链尾只负责"补上"不可变标记，从不撤销它。
     */
    private syncTail(chain: MemoryNode[]): MemoryNode[] {
        return chain.map((node, index) => {
            const isTail = index === chain.length - 1;
            const isImmutable = node.isImmutable === true || isTail;
            // 新晋升为链尾的节点就是登车瞬间；已存在的死节点保留自己的类别
            const isNewTail = isTail && node.type !== 'dead_node';
            const type: MemoryNode['type'] = isImmutable
                ? 'dead_node'
                : node.type === 'dead_node' ? 'original' : node.type;
            const category: MemoryCategory = isNewTail ? 'train' : node.category;
            const immutableFlag = isImmutable ? true : undefined;

            if (node.type === type && node.category === category && node.isImmutable === immutableFlag) return node;
            return { ...node, type, category, isImmutable: immutableFlag };
        });
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

        return { chain: this.syncTail(next), rejections };
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

        return this.syncTail(next);
    }

    /** 用编辑后的节点替换链中的同名节点（篡改与修复的共同写回路径） */
    replaceNode(chain: MemoryNode[], node: MemoryNode): MemoryNode[] {
        return this.syncTail(chain.map(n => (n.id === node.id ? node : n)));
    }

    /**
     * 记忆链 -> 紧凑摘要，供 AI 上下文与卡片展示共用。
     * 摘要不是独立字段：唯一来源是 `chain` 本身，因此任何写入链的路径都自动保持一致。
     */
    generateSummaryFromChain(chain: MemoryNode[]): string {
        if (!chain || chain.length === 0) return '记忆一片空白，如同新生儿般纯净。';

        const corruptedCount = chain.filter(n => n.type === 'corrupted').length;
        const implantedCount = chain.filter(n => n.type === 'implanted').length;
        // 污染总量复用 meta 的判定，避免"被改动过"在此处出现第二份定义
        const alteredCount = chain.filter(isAlteredMemory).length;

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

    /**
     * 构造执事创世纪链。
     *
     * 与初始链的区别在于"不可变"的含义：初始链只有链尾（登车瞬间）不可变，
     * 而创世纪链的每一节都是她新存在的公理，整条链都不可篡改。
     * 这条差异必须留在链层——`isImmutable` 的唯一维护者是本模块，
     * 让服务层自己拼节点会造出"整条链都是不可变节点"却不经过任何校验的链，
     * 之后 `insertNode` 找不到唯一的链尾，落点就变成了猜。
     */
    buildGenesisChain(raw: RawDeadNode[], timestamp: number): MemoryNode[] {
        return raw.map((node, index) => ({
            id: generateId('node_dead'),
            title: asText(node?.title, `信条 ${index + 1}`),
            objectiveTruth: '这是我意志的直接投射，是新世界的基石。',
            subjectiveNarrative: asText(node?.content, '（内容缺失）'),
            selfOpinion: '这是绝对的真理。',
            timeLabel: asText(node?.timeLabel, '重生时刻'),
            depth: 1,
            type: 'dead_node',
            isImmutable: true,
            corruptionLevel: 0,
            category: 'master',
            timestamp,
        }));
    }

    /**
     * 构造一个"植入"节点：内容并非真实发生过，是外部意志捏造的记忆。
     * 默认污染度 100（她无法分辨真伪），并由 insertNode 决定落点——植入物永不越过登车瞬间。
     */
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

    /**
     * 篡改节点：累加污染度并改写叙事，同时把旧叙事记入 history 以便还原。
     * 登车瞬间不可篡改，直接原样返回；污染度满值时在标题追加标记（不重复追加）。
     */
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

    /**
     * 修复被篡改或植入的节点，降低污染度并回退叙事。
     * 污染度归零时清除类型与标题上的篡改标记；不动登车瞬间与未受污染的原始记忆。
     */
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

    /**
     * 封存当前记忆链为"旧日人格"。
     * 用于水仙协议回归：她带着旧人生的记录离开，作为女执事重新开始，因此链被清空而非删除。
     */
    archiveMemoryChain(maiden: Maiden): Maiden {
        const safeMaiden = deepCopy(maiden);
        return {
            ...safeMaiden,
            legacyMemoryChain: [...(safeMaiden.legacyMemoryChain || []), ...safeMaiden.memoryChain],
            memoryChain: [],
        };
    }
}

/**
 * 关系网络子系统：维护少女之间单向关系边的生成、结算与自然衰减。
 * 关系边挂在各自的 `maiden.relationships` 上，因此不存在可脱节的独立副本。
 */
class MaidenRelationship {

    /**
     * 初始化全局关系网络。
     * 为尚无关系数据的实体补空数组，再据人格契合度生成初始社交拓扑。
     */
    public initializeNetwork(maidens: Map<string, Maiden>, gameTimePassed: number): void {
        for (const [id, maiden] of maidens) {
            if (!maiden.relationships) {
                maidens.set(id, { ...maiden, relationships: [] });
            }
        }

        this.generateInitialRelationships(maidens, gameTimePassed);
    }

    /**
     * 基于随机碰撞与人格契合度生成初始社交拓扑
     */
    private generateInitialRelationships(maidens: Map<string, Maiden>, gameTimePassed: number): void {
        const maidenIds = Array.from(maidens.keys());
        const totalMaidens = maidenIds.length;

        for (const id of maidenIds) {
            const targetRelationCount = 2 + Math.floor(Math.random() * 4);

            // 每轮重读实体：setRelationship 返回新对象而非就地追加，
            // 在循环外持有快照会让计数永远停在初值，每条边都填满重试上限。
            for (let attempts = 0; attempts < 15; attempts++) {
                const maiden = maidens.get(id)!;
                if (maiden.relationships.length >= targetRelationCount) break;

                const targetId = maidenIds[Math.floor(Math.random() * totalMaidens)];
                if (targetId === id || getRelationship(maiden, targetId)) continue;

                const target = maidens.get(targetId)!;

                const relationship = this.createInitialRelationship(maiden, target, gameTimePassed);
                maidens.set(id, setRelationship(maiden, relationship));

                const mirrorRel = this.createMirrorRelationship(relationship, target, maiden, gameTimePassed);
                maidens.set(targetId, setRelationship(maidens.get(targetId)!, mirrorRel));
            }
        }
    }

    /**
     * 计算单向初始关系参数（深度计算人格耦合）。
     *
     * 全部阈值以 z 为单位：v1 里的 20/30/65/35/70 是 0–100 量表上的刻度，
     * 换算后即 2σ/3σ/±1.5σ/±2σ。
     */
    private createInitialRelationship(maiden: Maiden, target: Maiden, gameTimePassed: number): Relationship {
        let baseAffinity = Math.floor(Math.random() * 40) - 10;

        const m = personalityView(maiden);
        const t = personalityView(target);
        const mDomain = m.domains;
        const tDomain = t.domains;

        const domainDistance = (
            Math.abs(mDomain.H - tDomain.H) +
            Math.abs(mDomain.E - tDomain.E) +
            Math.abs(mDomain.X - tDomain.X) +
            Math.abs(mDomain.A - tDomain.A) +
            Math.abs(mDomain.C - tDomain.C) +
            Math.abs(mDomain.O - tDomain.O)
        ) / 6;

        // 相似度按平均域间距离（z）分档
        if (domainDistance < 1.0) {
            baseAffinity += 15;
        } else if (domainDistance < 2.0) {
            baseAffinity += 8;
        }

        // 情绪性互补：一方高一方低时相互补足
        if ((mDomain.E > 1.5 && tDomain.E < -1.5) || (mDomain.E < -1.5 && tDomain.E > 1.5)) {
            baseAffinity += 12;
        }

        if ((mDomain.X > 2 && tDomain.X < -2) || (mDomain.X < -2 && tDomain.X > 2)) {
            baseAffinity -= 5;
        }
        if (mDomain.A < -1.5 && tDomain.A > 1.5) {
            baseAffinity -= 10;
        }

        // 共情差异：权重为 0–1（0.5 即人群均值），换算为对好感度的修正
        const avgEmpathy = (m.weights.empathy + t.weights.empathy) / 2;
        baseAffinity += Math.round((avgEmpathy - 0.5) * 20);

        // 诚信极低者与被剥削倾向者之间更易形成依附型关系
        const mHonesty = (maiden.isshex.facets.sincerity + maiden.isshex.facets.fairness
            + maiden.isshex.facets.greedAvoidance + maiden.isshex.facets.modesty) / 4;
        if (mHonesty < -1.0) {
            baseAffinity -= 15;
        }
        if (mHonesty < -0.5 && tDomain.A > 1.0) {
            baseAffinity += 10;
        }

        const affinity = Math.max(-100, Math.min(100, baseAffinity));
        const trust = 20 + Math.floor(Math.random() * 30);
        const type = this.determineRelationType(affinity, trust, false, maiden, target);

        return {
            targetId: target.id,
            type,
            affinity,
            trust,
            interactions: Math.floor(Math.random() * 20),
            lastInteraction: gameTimePassed - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
            sharedTrauma: false,
            isSecret: false,
        };
    }

    /**
     * 构建目标的镜像反射关系
     */
    private createMirrorRelationship(
        original: Relationship,
        maiden: Maiden,
        target: Maiden,
        gameTimePassed: number
    ): Relationship {
        const affinityDiff = Math.floor(Math.random() * 20) - 10;
        const affinity = Math.max(-100, Math.min(100, original.affinity + affinityDiff));
        const trust = Math.max(0, Math.min(100, original.trust + Math.floor(Math.random() * 10) - 5));

        return {
            targetId: target.id,
            type: this.determineRelationType(affinity, trust, original.sharedTrauma, maiden, target),
            affinity,
            trust,
            interactions: original.interactions,
            lastInteraction: original.lastInteraction,
            sharedTrauma: original.sharedTrauma,
            isSecret: original.isSecret,
        };
    }

    /** 读取单向关系边；不存在时返回 undefined（不隐式创建） */
    public getRelationship(maiden: Maiden, targetId: string): Relationship | undefined {
        return getRelationship(maiden, targetId);
    }

    /** 关系边的隔离副本，调用方改写它不会影响实体 */
    public getAllRelationships(maiden: Maiden): Relationship[] {
        return getAllRelationships(maiden);
    }

    /**
     * 细粒度更新单向关系。
     * 关系不存在时以 'stranger' 基线创建；每次调用都会累加互动次数并刷新 lastInteraction，
     * 因此不要用它做"只读探测"。
     *
     * 注意：本方法**就地修改**传入的两个实体（沿用社交结算的浅拷贝隔离约定），
     * 而本文件其余部分一律返回新对象。
     */
    /**
     * 细粒度更新单向关系。
     * 关系不存在时以 'stranger' 基线创建；每次调用都会累加互动次数并刷新 lastInteraction，
     * 因此不要用它做"只读探测"。
     *
     * 本方法**就地写入** `maiden`（沿用社交结算的浅拷贝隔离约定），
     * 而本文件其余部分一律返回新对象——调用方传入的必须是自己的浅拷贝，
     * 否则会改到实体表里仍在被他人读取的那一份。
     */
    public updateRelationship(
        maiden: Maiden,
        target: Maiden,
        changes: {
            affinityDelta?: number;
            trustDelta?: number;
            sharedTrauma?: boolean;
            forceSecret?: boolean;
        },
        gameTimePassed: number
    ): void {
        const existing = getRelationship(maiden, target.id);

        const relationship: Relationship = existing ?? {
            targetId: target.id,
            type: 'stranger',
            affinity: 0,
            trust: 10,
            interactions: 0,
            lastInteraction: gameTimePassed,
            sharedTrauma: false,
            isSecret: false,
        };

        let newAffinity = relationship.affinity;
        let newTrust = relationship.trust;
        let newSharedTrauma = relationship.sharedTrauma;
        let newIsSecret = relationship.isSecret;

        if (changes.affinityDelta !== undefined) {
            newAffinity = Math.max(-100, Math.min(100, newAffinity + changes.affinityDelta));
        }
        if (changes.trustDelta !== undefined) {
            newTrust = Math.max(0, Math.min(100, newTrust + changes.trustDelta));
        }
        if (changes.sharedTrauma !== undefined) {
            newSharedTrauma = changes.sharedTrauma || relationship.sharedTrauma;
        }
        if (changes.forceSecret !== undefined) {
            newIsSecret = changes.forceSecret;
        }

        const newRelationship: Relationship = {
            ...relationship,
            affinity: newAffinity,
            trust: newTrust,
            sharedTrauma: newSharedTrauma,
            isSecret: newIsSecret,
            interactions: relationship.interactions + 1,
            lastInteraction: gameTimePassed,
            type: this.determineRelationType(newAffinity, newTrust, newSharedTrauma, maiden, target),
        };

        const updatedMaiden = setRelationship(maiden, newRelationship);

        maiden.relationships = updatedMaiden.relationships;
        maiden._relationshipIndex = updatedMaiden._relationshipIndex;
    }

    /**
     * 结算一次双向社交事件。
     * 双方各按自身人格得到不同的增减（非对称），因此同一场互动对两人的意义并不相同。
     */
    public processInteraction(
        initiator: Maiden,
        target: Maiden,
        interactionType: SocialInteractionType | 'trauma_shared',
        intensity: number = 1,
        gameTimePassed: number
    ): void {
        const baseVal = intensity * 5;

        let initAffinityDelta = 0;
        let initTrustDelta = 0;
        let targetAffinityDelta = 0;
        let targetTrustDelta = 0;
        let sharedTraumaFlag = false;

        const tDomains = personalityView(target).domains;
        const iProxies = personalityView(initiator).proxies;

        switch (interactionType) {
            case 'chat':
                initAffinityDelta = baseVal * 0.5;
                targetAffinityDelta = baseVal * 0.5;
                initTrustDelta = baseVal * 0.2;
                targetTrustDelta = baseVal * 0.2;
                // 内向者对频繁闲聊可能产生微弱反感
                if (tDomains.X < -2) targetAffinityDelta -= 1;
                break;

            case 'comfort':
                initAffinityDelta = baseVal;
                targetAffinityDelta = baseVal * 1.5;
                initTrustDelta = baseVal * 0.8;
                targetTrustDelta = baseVal * 1.2;
                // 共情修正
                if (tDomains.E > 1.0) targetTrustDelta *= 1.5;
                // 操纵倾向高者仅为操纵，不产生真实亲和
                if (iProxies.machiavellianism > 1.0) initAffinityDelta = 0;
                break;

            case 'gossip':
                initAffinityDelta = baseVal * 0.8;
                targetAffinityDelta = baseVal * 0.8;
                initTrustDelta = -baseVal * 0.2;
                targetTrustDelta = -baseVal * 0.2;
                break;

            case 'argue':
                initAffinityDelta = -baseVal * 1.2;
                targetAffinityDelta = -baseVal * 1.2;
                initTrustDelta = -baseVal * 0.5;
                targetTrustDelta = -baseVal * 0.5;
                // 低宜人性者不易在争吵中大幅度掉信任
                if (tDomains.A < -2) targetTrustDelta *= 0.5;
                break;

            case 'bully':
                // 施虐倾向高者可能产生病态愉悦
                initAffinityDelta = iProxies.sadism > 0.5 ? baseVal * 0.5 : -baseVal;
                targetAffinityDelta = -baseVal * 2.5;
                initTrustDelta = -baseVal;
                targetTrustDelta = -baseVal * 3.0;
                break;

            case 'seduce':
                initAffinityDelta = baseVal;
                targetAffinityDelta = baseVal * 1.5;
                initTrustDelta = -baseVal * 0.5; // 诱惑带有欺骗性，削弱基础信任
                targetTrustDelta = baseVal * 0.5; // 目标被魅惑时可能盲目提升信任
                break;

            case 'confide':
                initAffinityDelta = baseVal * 1.2;
                targetAffinityDelta = baseVal;
                initTrustDelta = baseVal * 2.0;
                targetTrustDelta = baseVal * 1.5;
                if (tDomains.A > 2) targetTrustDelta *= 1.2;
                break;

            case 'pray':
                initAffinityDelta = baseVal;
                targetAffinityDelta = baseVal;
                initTrustDelta = baseVal;
                targetTrustDelta = baseVal;
                break;

            case 'huddle':
                initAffinityDelta = baseVal * 1.5;
                targetAffinityDelta = baseVal * 1.5;
                initTrustDelta = baseVal * 2.0;
                targetTrustDelta = baseVal * 2.0;
                break;

            case 'avoid':
                initAffinityDelta = -baseVal * 0.5;
                targetAffinityDelta = -baseVal * 0.8;
                initTrustDelta = -baseVal * 0.3;
                targetTrustDelta = -baseVal * 0.5;
                break;

            case 'trauma_shared':
                sharedTraumaFlag = true;
                initAffinityDelta = baseVal * 2;
                targetAffinityDelta = baseVal * 2;
                initTrustDelta = baseVal * 1.5;
                targetTrustDelta = baseVal * 1.5;
                break;
        }

        this.updateRelationship(initiator, target, {
            affinityDelta: initAffinityDelta,
            trustDelta: initTrustDelta,
            sharedTrauma: sharedTraumaFlag,
        }, gameTimePassed);

        this.updateRelationship(target, initiator, {
            affinityDelta: targetAffinityDelta,
            trustDelta: targetTrustDelta,
            sharedTrauma: sharedTraumaFlag,
        }, gameTimePassed);
    }

    /**
     * 执行关系定性推断（状态机核心基准）
     */
    private determineRelationType(
        affinity: number,
        trust: number,
        sharedTrauma: boolean = false,
        maiden?: Maiden,
        target?: Maiden
    ): RelationType {
        if (maiden && target && affinity >= 30) {
            const mView = personalityView(maiden);
            const tDomains = personalityView(target).domains;
            const mDomains = mView.domains;
            const mMachiavellianism = mView.proxies.machiavellianism;

            if (mDomains.E > 1.0 && mDomains.A < -0.5 && tDomains.E < -0.5 && tDomains.A > 1.0 && trust >= 50) {
                return 'protector';
            }

            if (mDomains.E < -0.5 && mDomains.A > 1.0 && tDomains.E > 1.0 && tDomains.A < -0.5 && trust >= 40) {
                return 'dependent';
            }

            if (sharedTrauma && mMachiavellianism > 1.0 && trust >= 30) {
                return 'accomplice';
            }
        }

        if (sharedTrauma && affinity > 0 && trust >= 30) {
            return 'accomplice';
        }

        if (affinity >= 70 && trust >= 60) return 'close_friend';
        if (affinity >= 40) return 'friend';
        if (affinity >= 10) return 'acquaintance';
        if (affinity <= -60) return 'enemy';
        if (affinity <= -30) return 'rival';

        return 'stranger';
    }

    /**
     * 关系随时间的自然衰退。
     * 正负好感都向 0 收敛（遗忘而非恶化），共享创伤与高情绪性会显著减缓衰减；
     * 仅在确有数值变化时才替换实体，避免每 tick 产生无意义的新引用。
     */
    public decayRelationships(maidens: Map<string, Maiden>, deltaMs: number): void {
        const baseDecayRate = 0.1 / (24 * 60 * 60 * 1000);
        const baseDecayAmount = deltaMs * baseDecayRate;

        if (baseDecayAmount <= 0) return;

        for (const [id, maiden] of maidens) {
            if (!maiden.relationships || maiden.relationships.length === 0) continue;

            const mDomains = personalityView(maiden).domains;
            const updatedRelationships: Relationship[] = [];
            let changed = false;

            for (const relationship of maiden.relationships) {
                let { affinity, trust, sharedTrauma, targetId } = relationship;
                const oldAffinity = affinity;
                const oldTrust = trust;

                let dampingFactor = 1.0;

                if (affinity > 50) dampingFactor *= 0.6;
                if (sharedTrauma) dampingFactor *= 0.2; // 强化共享创伤的抗遗忘性

                // 情绪性高（依恋深）的角色遗忘正向关系更慢
                if (mDomains.E > 2 && affinity > 0) dampingFactor *= 0.7;
                // 孤僻倾向（极低外向性）加速泛泛之交的衰退
                if (mDomains.X < -2 && affinity < 30 && affinity > 0) dampingFactor *= 1.3;

                const currentDecay = baseDecayAmount * dampingFactor;

                if (affinity > 0) {
                    affinity = Math.max(0, affinity - currentDecay);
                } else if (affinity < 0) {
                    affinity = Math.min(0, affinity + currentDecay);
                }

                const trustDecay = sharedTrauma ? currentDecay * 0.1 : currentDecay * 0.6;
                trust = Math.max(0, trust - trustDecay);

                if (sharedTrauma && affinity > 20) {
                    affinity = Math.max(-100, Math.min(100, affinity + currentDecay * 0.15));
                }

                if (affinity !== oldAffinity || trust !== oldTrust) {
                    changed = true;
                }

                const target = maidens.get(targetId);
                updatedRelationships.push({
                    ...relationship,
                    affinity,
                    trust,
                    type: this.determineRelationType(affinity, trust, sharedTrauma, maiden, target),
                });
            }

            if (changed) {
                const newMaiden: Maiden = {
                    ...maiden,
                    relationships: updatedRelationships,
                    _relationshipIndex: buildRelationshipIndex(updatedRelationships)
                };
                maidens.set(id, newMaiden);
            }
        }
    }
}

const SOCIAL_INTERACTION_BASE_CHANCE = 0.2;

const SOCIAL_INTERACTION_DESCRIPTIONS: Record<SocialInteractionType, string[]> = {
    chat: [
        '{name1}和{name2}低声交谈，分享着支离破碎的过往。',
        '{name1}和{name2}靠在一起，用眼神交流着无法言说的秘密。',
    ],
    comfort: [
        '{name1}轻轻拥抱了{name2}，在她耳边低声诵念着安慰的话语。',
        '{name1}握住了{name2}的手，无声地在黑暗中传递着残存的温暖。',
    ],
    gossip: [
        '{name1}和{name2}窃窃私语，交换着关于车厢内他人的隐秘传闻。',
        '{name1}靠近{name2}的耳畔，带着揣测吐露着不可告人的秘密。',
    ],
    argue: [
        '{name1}和{name2}之间爆发了激烈的冲突，压抑的情绪终于找到了出口。',
        '{name1}和{name2}互相指责，尖锐的诘问声在幽暗的车厢中回荡。',
    ],
    bully: [
        '{name1}将{name2}逼至绝境，发出恶意的嘲弄与冰冷的恐吓。',
        '{name1}粗暴地推搡着{name2}，在支配与掠夺中攫取病态的愉悦。',
    ],
    seduce: [
        '{name1}用暧昧的姿态靠近{name2}，指尖有意无意地划过她的肌肤。',
        '{name1}在{name2}耳边吐气如兰，眼底闪烁着危险而甜腻的欲望。',
    ],
    confide: [
        '{name1}向{name2}倾诉着内心的恐惧与脆弱，理智在崩溃的边缘游走。',
        '{name1}紧紧抓住{name2}的衣角，颤抖着吐露自己最深沉的梦魇。',
    ],
    pray: [
        '{name1}与{name2}一同顺从地跪下，双手交握，向深渊祈求着微茫的救赎。',
        '{name1}和{name2}双目紧闭，在死寂中低声诵念着残缺不全的祷文。',
    ],
    huddle: [
        '{name1}和{name2}紧紧依偎在一起，试图从彼此的躯体上汲取一丝慰藉。',
        '{name1}与{name2}蜷缩在角落，相互拥抱以抵御侵蚀而来的恐惧。',
    ],
    avoid: [
        '{name1}刻意避开了{name2}的视线，如同逃避某种厄运般匆匆转身。',
        '{name1}在余光瞥见{name2}后，迅速后退拉开了冰冷的距离。',
    ]
};

/** 社交互动的基础时长（游戏分钟），实际时长再乘 0.7–1.3 的抖动 */
const SOCIAL_DURATION_MINUTES: Record<SocialInteractionType, number> = {
    chat: 15,
    comfort: 10,
    gossip: 20,
    argue: 8,
    bully: 5,
    seduce: 12,
    confide: 25,
    pray: 30,
    huddle: 20,
    avoid: 0,
};

/** 社交互动的强度系数，作为关系结算的基础增量倍率 */
const SOCIAL_INTERACTION_INTENSITY: Record<SocialInteractionType, number> = {
    chat: 0.5,
    comfort: 1.0,
    gossip: 0.3,
    argue: 0.8,
    bully: 1.2,
    seduce: 0.7,
    confide: 1.5,
    pray: 0.6,
    huddle: 0.9,
    avoid: 0,
};

/** 目标正在进行的活动若属此类，社交不会打断它 */
const CRITICAL_ACTIVITIES: readonly CharacterStatus[] = [
    'sleeping',
    'eating',
    'bathing',
    'performing',
    'confessing',
];

/**
 * 社交互动子系统：决定同车厢少女之间是否互动、互动类型及其属性结算。
 * 互动类型由情境（车厢、压力、人格）推导，不依赖随机表。
 */
class MaidenSocialization {
    /**
     * 单帧社交尝试。
     *
     * 依次过闸：同车厢人数、自身状态（睡眠/崩溃/移动中）、概率门、目标选取、目标状态。
     * 任一不满足即返回空对象；`updatedMaiden`/`updatedTarget` 由调用方写回实体表。
     */
    public processSocialInteractions(
        maiden: Maiden,
        othersInCarriage: string[],
        allMaidens: Map<string, Maiden>,
        carriage: Carriage,
        gameTimePassed: number
    ): { log?: string; updatedMaiden?: Maiden; updatedTarget?: Maiden } {
        if (
            othersInCarriage.length <= 1 ||
            maiden.status.includes('sleeping') ||
            maiden.behavior.currentActivity === 'sleeping' ||
            maiden.status.includes('broken') ||
            maiden.movement?.isMoving
        ) {
            return {};
        }

        const weights = personalityView(maiden).weights;
        const socialChance = SOCIAL_INTERACTION_BASE_CHANCE * (weights.socialSeek + 0.5);

        if (Math.random() > socialChance) return {};

        const targetId = this.selectSocialTarget(maiden, othersInCarriage, allMaidens);
        if (!targetId) return {};

        const target = allMaidens.get(targetId);
        if (!target || target.status.includes('sleeping') || target.behavior.currentActivity === 'sleeping') {
            return {};
        }

        const interactionType = this.decideSocialInteractionType(maiden, target, carriage);

        if (interactionType === 'avoid') {
            return {};
        }

        return this.executeSocialInteraction(maiden, target, interactionType, carriage, gameTimePassed);
    }

    private selectSocialTarget(
        maiden: Maiden,
        othersInCarriage: string[],
        allMaidens: Map<string, Maiden>
    ): string | null {
        const candidates = othersInCarriage.filter(id => id !== maiden.id);
        if (candidates.length === 0) return null;

        const relationships = maidenRelationship.getAllRelationships(maiden);

        const weights = candidates.map(id => {
            let weight = 10;

            const rel = relationships.find(r => r.targetId === id);
            if (rel) {
                weight += Math.abs(rel.affinity) * 0.5;
                if (rel.sharedTrauma) weight += 20;
            }

            return { item: id, weight };
        });

        return weightedRandom(weights);
    }

    private decideSocialInteractionType(
        maiden: Maiden,
        target: Maiden,
        carriage: Carriage
    ): SocialInteractionType {
        const mView = personalityView(maiden);
        const tView = personalityView(target);
        const mFacets = maiden.isshex.facets;
        const attrs = maiden.attributes;
        const tAttrs = target.attributes;

        if (carriage.type === 'ALTAR' || carriage.type === 'CONFESSIONAL') {
            if (mView.weights.devotionTendency > 0.5 || tView.weights.devotionTendency > 0.5) {
                return 'pray';
            }
        }

        if (attrs.stress > 70 || tAttrs.stress > 70) {
            if (mFacets.fearfulness > 0.5 || mFacets.dependence > 0.5) {
                return 'huddle';
            }
            if (mFacets.gentleness > 0 && mView.weights.empathy > 0.5) {
                return 'comfort';
            }
            return 'huddle';
        }

        if (mView.weights.aggressiveness > 0.5 && mView.domains.A < -1.0) {
            if (tView.domains.A > 1.0 && Math.random() < 0.4) {
                return 'bully';
            }
            if (tView.weights.aggressiveness > 0.4) {
                return Math.random() < 0.3 ? 'argue' : 'gossip';
            }
        }

        if (mView.weights.lustSensitivity > 0.6 && mView.domains.X > 0) {
            if (attrs.lust > 50 || tAttrs.lust > 50) {
                return 'seduce';
            }
            return 'gossip';
        }

        if (mFacets.fearfulness > 0 && mFacets.dependence > 0 && mView.domains.X < 0) {
            if (tAttrs.sanity > 60) {
                return 'confide';
            }
            return 'huddle';
        }

        if (mView.weights.devotionTendency > 0.5) {
            return Math.random() < 0.5 ? 'pray' : 'chat';
        }

        return 'chat';
    }

    private executeSocialInteraction(
        maiden: Maiden,
        target: Maiden,
        type: SocialInteractionType,
        carriage: Carriage,
        gameTimePassed: number
    ): { log?: string; updatedMaiden?: Maiden; updatedTarget?: Maiden } {
        // 采用浅层解构隔离修改域
        const updatedMaiden = { ...maiden, attributes: { ...maiden.attributes } };
        const updatedTarget = { ...target, attributes: { ...target.attributes } };
        const mAttrs = updatedMaiden.attributes;
        const tAttrs = updatedTarget.attributes;

        const baseDuration = this.getSocialDuration(type);
        const durationMs = baseDuration * 60 * 1000;

        switch (type) {
            case 'chat':
                mAttrs.sanity = clamp(mAttrs.sanity + 1);
                mAttrs.stress = clamp(mAttrs.stress - 2);
                tAttrs.stress = clamp(tAttrs.stress - 1);
                break;
            case 'comfort':
                mAttrs.stress = clamp(mAttrs.stress - 3);
                tAttrs.stress = clamp(tAttrs.stress - 5);
                tAttrs.sanity = clamp(tAttrs.sanity + 2);
                break;
            case 'gossip':
                mAttrs.stress = clamp(mAttrs.stress - 2);
                tAttrs.stress = clamp(tAttrs.stress - 2);
                mAttrs.corruption = clamp(mAttrs.corruption + 0.5);
                break;
            case 'argue':
                mAttrs.stress = clamp(mAttrs.stress + 5);
                tAttrs.stress = clamp(tAttrs.stress + 5);
                mAttrs.sanity = clamp(mAttrs.sanity - 1);
                break;
            case 'bully':
                mAttrs.stress = clamp(mAttrs.stress - 3);
                mAttrs.corruption = clamp(mAttrs.corruption + 2);
                tAttrs.stress = clamp(tAttrs.stress + 8);
                tAttrs.sanity = clamp(tAttrs.sanity - 2);
                tAttrs.obedience = clamp(tAttrs.obedience + 1);
                break;
            case 'seduce':
                mAttrs.lust = clamp(mAttrs.lust + 5);
                tAttrs.lust = clamp(tAttrs.lust + 8);
                mAttrs.stress = clamp(mAttrs.stress - 2);
                break;
            case 'confide':
                mAttrs.stress = clamp(mAttrs.stress - 8);
                mAttrs.sanity = clamp(mAttrs.sanity + 1);
                tAttrs.stress = clamp(tAttrs.stress + 2);
                break;
            case 'pray':
                mAttrs.devotion = clamp(mAttrs.devotion + 2);
                tAttrs.devotion = clamp(tAttrs.devotion + 2);
                mAttrs.stress = clamp(mAttrs.stress - 3);
                tAttrs.stress = clamp(tAttrs.stress - 3);
                break;
            case 'huddle':
                mAttrs.stress = clamp(mAttrs.stress - 4);
                tAttrs.stress = clamp(tAttrs.stress - 4);
                break;
        }

        const templates = SOCIAL_INTERACTION_DESCRIPTIONS[type];
        const template = templates[Math.floor(Math.random() * templates.length)];
        const log = template.replace(/\{name1\}/g, maiden.name).replace(/\{name2\}/g, target.name);

        const initiatorSocialContext: SocialContext = {
            targetId: target.id,
            targetName: target.name,
            interactionType: type,
            startTime: gameTimePassed,
        };

        updatedMaiden.behavior = {
            ...updatedMaiden.behavior,
            lastInteractionTime: gameTimePassed,
            currentActivity: 'chatting',
            activityStartTime: gameTimePassed,
            activityDuration: durationMs,
            previousActivity: maiden.behavior.currentActivity,
            socialContext: initiatorSocialContext,
        };

        const targetSocialContext: SocialContext = {
            targetId: maiden.id,
            targetName: maiden.name,
            interactionType: type,
            startTime: gameTimePassed,
        };

        updatedTarget.behavior = {
            ...updatedTarget.behavior,
            lastInteractionTime: gameTimePassed,
            ...(CRITICAL_ACTIVITIES.includes(target.behavior.currentActivity) ? {} : {
                currentActivity: 'chatting',
                activityStartTime: gameTimePassed,
                activityDuration: durationMs,
                previousActivity: target.behavior.currentActivity,
            }),
            socialContext: targetSocialContext,
        };

        const intensity = this.getInteractionIntensity(type);

        maidenRelationship.processInteraction(
            updatedMaiden,
            updatedTarget,
            type,
            intensity,
            gameTimePassed
        );

        return { log, updatedMaiden, updatedTarget };
    }

    private getSocialDuration(type: SocialInteractionType): number {
        const base = SOCIAL_DURATION_MINUTES[type] ?? 10;
        return base * (0.7 + Math.random() * 0.6);
    }

    private getInteractionIntensity(type: SocialInteractionType): number {
        return SOCIAL_INTERACTION_INTENSITY[type] ?? 1.0;
    }
}

/** 水仙协议：褪色速度与阶段阈值，与 GAME_CONFIG.NARCISSUS 保持一致 */
const FADING_RATE_PER_DAY = GAME_CONFIG.NARCISSUS.FADING_RATE;
const FADING_STAGE_THRESHOLD = 30;
const INVITATION_THRESHOLD = GAME_CONFIG.NARCISSUS.INVITATION_THRESHOLD;

/**
 * 水仙平原协议（Narcissus Protocol）。
 * 状态机：none → choice → departed → fading → invitation → returned / rejected。
 * 阶段推进完全由 elapsedMs 推导，不依赖调用频率。
 */
class MaidenNarcissus {

    /**
     * 资格校验。
     * 返回全部未满足项而非仅布尔值，调用方据此向玩家展示具体原因。
     */
    checkEligibility(maiden: Maiden, gameTimePassed: number): NarcissusEligibility {
        const reasons: string[] = [];

        const requirements = {
            minDaysOnTrain: GAME_CONFIG.NARCISSUS.MIN_DAYS_ON_TRAIN,
            minAbyssExposure: GAME_CONFIG.NARCISSUS.MIN_ABYSS_EXPOSURE,
            sanityRange: GAME_CONFIG.NARCISSUS.SANITY_RANGE,
            hasExperiencedGrace: true,
        };

        if (!maiden || !maiden.attributes) {
            reasons.push('实体数据结构不完整');
            return { eligible: false, reasons, requirements };
        }

        const daysOnTrain = Math.floor(gameTimePassed / TIME_CONFIG.MS_PER_DAY);

        if (daysOnTrain < requirements.minDaysOnTrain) {
            reasons.push(`在列车上的时间不足 (${daysOnTrain}/${requirements.minDaysOnTrain}天)`);
        }

        if (maiden.abyssExposureCount < requirements.minAbyssExposure) {
            reasons.push(`深渊暴露次数不足 (${maiden.abyssExposureCount}/${requirements.minAbyssExposure}次)`);
        }

        if (maiden.attributes.sanity < requirements.sanityRange[0]) {
            reasons.push('理智过低，无法做出选择');
        }

        if (maiden.attributes.sanity > requirements.sanityRange[1]) {
            reasons.push('理智过高，尚未被充分"教化"');
        }

        if (maiden.graceReceived === 0 && requirements.hasExperiencedGrace) {
            reasons.push('未曾体验过神恩');
        }

        const currentState = maiden.narcissusState;
        if (currentState && currentState.stage !== 'none') {
            reasons.push('已在水仙平原协议中');
        }

        return {
            eligible: reasons.length === 0,
            reasons,
            requirements,
        };
    }

    shouldAutonomousTrigger(maiden: Maiden, gameTimePassed: number): boolean {
        const eligibility = this.checkEligibility(maiden, gameTimePassed);
        if (!eligibility.eligible) return false;

        if (!maiden.isshex || !maiden.isshex.facets || !maiden.isshex.dynamics) {
            return false; // 阻断残缺的人格模型导致的计算错误
        }

        // 基础触发概率：每Tick极低，因为这是稀有且重大的个人觉醒事件
        let chance = 0.002;

        // 1. 理智修正
        if (maiden.attributes.sanity < 35) chance += 0.003;

        // 2. 压力修正
        if (maiden.attributes.stress > 80) chance += 0.003;

        // 3. 深渊暴露修正
        chance += maiden.abyssExposureCount * 0.0005;

        // 4. IS-SHEX人格修正：危险取舍靠风险承受与低诚信，顺从与虔诚抑制觉醒
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;

        chance *= (1 + facets.fearfulness * 0.1);

        if (view.weights.riskTolerance > 0.5 && view.domains.H < -1.0) {
            chance *= 2.0;
        }

        if (view.domains.A > 1.0 && view.weights.obedienceBase > 10) {
            chance *= 0.5;
        }

        if (view.weights.devotionTendency > 0.6) {
            chance *= 0.1;
        }

        if (view.domains.O > 1.0 && view.domains.C < -1.0) {
            chance *= 0.6;
        }

        // 稳定性低者更易被水仙协议吸引（γ 偏低即对抗性更高）
        if (view.meta.alpha < -1.0) {
            chance *= 1.3;
        }

        return Math.random() < chance;
    }

    initiateProtocol(maiden: Maiden, gameTimePassed: number): { success: boolean; description: string; maidenUpdate: Partial<Maiden> } {
        const eligibility = this.checkEligibility(maiden, gameTimePassed);

        if (!eligibility.eligible) {
            return {
                success: false,
                description: `${maiden?.name || '未知实体'}尚未满足水仙平原协议的条件：${eligibility.reasons.join('；')}`,
                maidenUpdate: {},
            };
        }

        const newState: NarcissusState = {
            stage: 'choice',
            fadingLevel: 0,
            daysOutside: 0,
            hasReceivedInvitation: false,
        };

        return {
            success: true,
            description: `${maiden.name}在恍惚中偏离了路线。在一节未被标记的车厢尽头，她发现了那扇门。\n\n它没有上锁，门缝中透出一种令她战栗的、属于"过去"的气息。\n\n水仙平原协议已触发：她站在了选择的边缘。`,
            maidenUpdate: { narcissusState: newState },
        };
    }

    chooseToDeparture(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
        const state = maiden.narcissusState;
        if (!state || state.stage !== 'choice') {
            return {
                description: '协议状态异常。',
                maidenUpdate: {},
            };
        }

        const newState: NarcissusState = {
            ...state,
            stage: 'departed',
            departureTime: gameTimePassed,
        };

        // 去重写入 dissociated 状态
        const newStatus: CharacterStatus[] = maiden.status.filter(s => s !== 'panicked' && s !== 'dissociated');
        newStatus.push('dissociated');

        return {
            description: `${maiden.name}推开了那扇门。\n\n` +
                `她发现自己站在一个普通的火车站台上。身后，列车的轮廓在晨雾中逐渐消散，仿佛从未存在过。\n\n` +
                `她"自由"了。\n\n` +
                `但当她走出车站，踏入阳光下时，她感到了一丝异样——阳光是温暖的，但她感受不到那种温度。`,
            maidenUpdate: {
                narcissusState: newState,
                status: newStatus,
            },
        };
    }

    chooseToStay(maiden: Maiden): { description: string; maidenUpdate: Partial<Maiden> } {
        const state = maiden.narcissusState;
        if (!state || state.stage !== 'choice') {
            return {
                description: '协议状态异常。',
                maidenUpdate: {},
            };
        }

        if (!maiden.attributes) {
            return { description: '实体属性异常，操作中断。', maidenUpdate: {} };
        }

        return {
            description: `${maiden.name}看着那扇门，然后缓缓地转过身去。\n\n` +
                `她选择了留下。\n\n` +
                `也许是恐惧，也许是依赖，也许是某种她自己都无法理解的渴望。但在这一刻，她做出了选择——这个世界，才是她的归属。`,
            maidenUpdate: {
                narcissusState: undefined,
                attributes: {
                    ...maiden.attributes,
                    devotion: clamp(maiden.attributes.devotion + 20, 0, 100),
                    obedience: clamp(maiden.attributes.obedience + 15, 0, 100),
                },
            },
        };
    }

    /**
     * 褪色推进。
     *
     * 两个容易写错的地方：
     * 1. 调用方传入的是**绝对游戏时间**，必须扣除 departureTime 得到"离开后经过时长"，
     *    否则读档时褪色度会随存档年龄凭空跳变。
     * 2. 阶段必须由褪色度**推导**，不能写成"当前阶段 + 单次跃迁"的 else-if 链：
     *    那样一次调用跨越多个阈值时只会走一步，而一旦阶段离开 departed 就再也不会前进，
     *    于是永远停在 fading、拿不到邀请。
     *
     * @param maiden 处于 departed/fading/invitation 的实体
     * @param gameTimePassed 当前**绝对**游戏时间
     * @returns `stageChanged` 表示阶段是否切换；`description` 仅在切换时给出；
     *          未进入可推进阶段或时间未前进时返回 `{ stageChanged: false }` 且无 `updatedState`
     */
    updateFading(maiden: Maiden, gameTimePassed: number): {
        description?: string;
        stageChanged: boolean;
        updatedState?: NarcissusState;
    } {
        const state = maiden.narcissusState;
        // 仅"人在外面"的阶段参与推进；returned/rejected/none 是终态，不再褪色
        if (!state || (state.stage !== 'departed' && state.stage !== 'fading' && state.stage !== 'invitation')) {
            return { stageChanged: false };
        }

        const departureTime = state.departureTime;
        if (typeof departureTime !== 'number' || typeof gameTimePassed !== 'number') {
            return { stageChanged: false };
        }

        const elapsedMs = gameTimePassed - departureTime;
        if (elapsedMs <= 0 || isNaN(elapsedMs)) {
            return { stageChanged: false };
        }

        const daysOutside = elapsedMs / TIME_CONFIG.MS_PER_DAY;
        const fadingLevel = clamp(daysOutside * FADING_RATE_PER_DAY, 0, 100);

        // 邀请一经发出就锁定，避免玩家尚未抉择时重复触发
        const hasReceivedInvitation = state.hasReceivedInvitation || fadingLevel >= INVITATION_THRESHOLD;

        const stage: NarcissusStage = hasReceivedInvitation
            ? 'invitation'
            : fadingLevel >= FADING_STAGE_THRESHOLD ? 'fading' : 'departed';

        const updatedState: NarcissusState = {
            ...state,
            daysOutside,
            fadingLevel,
            stage,
            hasReceivedInvitation,
        };

        if (stage === state.stage) {
            return { stageChanged: false, updatedState };
        }

        return {
            description: stage === 'invitation'
                ? '在她精神濒临崩溃的边缘，一个陌生人出现了。他没有劝说，只是静静地聆听。\n\n' +
                '"如果你愿意回去，"他最后说，"契约已经准备好了。"'
                : '世界开始褪色。食物尝起来像蜡，颜色变得灰暗，声音变得沉闷。',
            stageChanged: true,
            updatedState,
        };
    }

    acceptInvitation(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
        const state = maiden.narcissusState;
        if (!state || state.stage !== 'invitation') {
            return {
                description: '协议状态异常。',
                maidenUpdate: {},
            };
        }

        if (!maiden.attributes || !maiden.status) {
            return { description: '实体核心数据丢失，操作中断。', maidenUpdate: {} };
        }

        const updatedState: NarcissusState = {
            ...state,
            stage: 'returned',
            returnTime: gameTimePassed,
        };

        // 归档旧记忆
        const archivedMaiden = maidenMemory.archiveMemoryChain(maiden);

        // 状态原子化处理：清洗对立状态，注入归拢状态
        const newStatus: CharacterStatus[] = maiden.status.filter(s =>
            s !== 'panicked' &&
            s !== 'dissociated' &&
            s !== 'deaconess' &&
            s !== 'devoted'
        );
        newStatus.push('deaconess', 'devoted');

        return {
            description: `${maiden.name}在那份印有黑色鸢尾花徽章的契约上签下了自己的名字。\n\n` +
                `当她再次睁开眼睛时，她已经回到了列车上。但这一次，她不再是猎物。\n\n` +
                `她是信徒。是女执事。是经过现实淬炼后，证明了我的世界才是唯一"真实"的灵魂。\n` +
                `（旧日人格已封存，等待注入新的记忆与意志。）`,
            maidenUpdate: {
                ...archivedMaiden,
                narcissusState: updatedState,
                rank: 'obsidian',
                rankColor: 'obsidian black with purple shimmer',
                status: newStatus,
                attributes: {
                    ...maiden.attributes,
                    devotion: 100,
                    obedience: clamp(maiden.attributes.obedience + 90, 0, 100),
                    corruption: clamp(maiden.attributes.corruption + 30, 0, 100),
                    sanity: 60,
                },
            },
        };
    }

    /**
     * 拒绝邀请：进入 rejected 终态，此后不再推进褪色。
     * 与 acceptInvitation 互斥，仅在 invitation 阶段有效。
     */
    rejectInvitation(maiden: Maiden, gameTimePassed: number): { description: string; maidenUpdate: Partial<Maiden> } {
        const state = maiden.narcissusState;
        if (!state || state.stage !== 'invitation') {
            return {
                description: '协议状态异常。',
                maidenUpdate: {},
            };
        }

        const updatedState: NarcissusState = {
            ...state,
            stage: 'rejected',
            rejectionTime: gameTimePassed,
        };

        return {
            description: '她拒绝了邀请。\n\n' +
                '聆听者点了点头，没有说什么，转身离开了。\n\n' +
                '她继续活着，在那个褪色的世界里。但每一天，她都感觉自己在消失。' +
                '最终，她会成为一个空壳——活着，但感受不到任何活着的情感。',
            maidenUpdate: {
                narcissusState: updatedState,
            },
        };
    }

    /** 是否已进入协议（含已回归/已拒绝等终态，仅 `none` 与未初始化算作"未进入"） */
    isInProtocol(maiden: Maiden): boolean {
        const state = maiden?.narcissusState;
        return state !== undefined && state.stage !== 'none';
    }

    serialize(maidens: Map<string, Maiden>): [string, NarcissusState][] {
        if (!maidens || !(maidens instanceof Map)) return [];

        const result: [string, NarcissusState][] = [];

        for (const [id, maiden] of maidens) {
            if (maiden && maiden.narcissusState) {
                result.push([id, maiden.narcissusState]);
            }
        }

        return result;
    }

    deserialize(data: [string, NarcissusState][], maidens: Map<string, Maiden>): void {
        if (!Array.isArray(data) || !maidens || !(maidens instanceof Map)) return;

        for (const [id, state] of data) {
            if (!id || !state) continue;

            const maiden = maidens.get(id);
            if (maiden) {
                maiden.narcissusState = state;
            }
        }
    }
}

/**
 * 随机事件概率与冷却时间基准配置
 */
const EVENT_CONFIG = {
    COOLDOWNS: {
        nightmare: 60000,
        breakdown: 120000,
        abyss_vision: 180000,
        rank_ceremony: 300000,
        awakening: 240000,
        pregnancy: 300000,
        friendship: 300000,
        conflict: 300000,
        comfort: 300000,
    } as Partial<Record<EventType, number>>,
    PROBABILITY: {
        nightmare: 0.02,
        awakening: 0.03,
        abyss_vision: 0.04,
        friendship: 0.03,
        conflict: 0.02,
        comfort: 0.04,
    }
} as const;

/**
 * 随机事件子系统：按概率与冷却轮询触发梦魇、崩溃、觉醒等事件，并结算其属性/状态/记忆效果。
 * 冷却记录在 `globalEventTimestamps`，可随存档序列化，避免读档后事件连发。
 */
class MaidenRandomEvent {
    private globalEventTimestamps: Map<EventType, number> = new Map();

    // [核心 API] 随机事件轮询调度
    public checkForEvents(
        maidens: Map<string, Maiden>,
        carriages: Map<string, Carriage>,
        gameTimePassed: number,
        targetIds?: string[]
    ): GameEvent[] {
        const events: GameEvent[] = [];
        const now = gameTimePassed;

        // 系统级宏观事件（枢纽异常、共振激增）不在这里产生：
        // 它们由 CarriageSystem.checkSystemAnomalies 拥有并在同一 tick 结算，
        // 本处重复产生会得到两个矛盾的熵值效果，且本模块没有 system 效果的落地点。

        const candidates = targetIds
            ? targetIds.reduce<Maiden[]>((acc, id) => {
                const m = maidens.get(id);
                if (m) acc.push(m);
                return acc;
            }, [])
            : Array.from(maidens.values());

        // 预处理车厢拓扑映射，用于高效匹配同区域实体
        const carriageMaidenMap = new Map<string, Maiden[]>();
        for (const maiden of candidates) {
            const cid = getCurrentCarriageId(maiden);
            if (!carriageMaidenMap.has(cid)) {
                carriageMaidenMap.set(cid, []);
            }
            carriageMaidenMap.get(cid)!.push(maiden);
        }

        for (const maiden of candidates) {
            const carriageId = getCurrentCarriageId(maiden);
            const carriage = carriages.get(carriageId);
            if (!carriage) continue;

            // 2. 梦魇侵袭 (睡眠状态异常)
            if (
                maiden.behavior.currentActivity === 'sleeping' &&
                maiden.attributes.sanity < 50 &&
                probabilityCheck(EVENT_CONFIG.PROBABILITY.nightmare) &&
                this.canTriggerGlobal('nightmare', now)
            ) {
                events.push(this.createNightmareEvent(maiden, carriage));
            }

            // 3. 精神崩溃 (临界理智熔断)
            if (
                this.shouldTriggerBreakdown(maiden.attributes.sanity, maiden.status.includes('broken')) &&
                this.canTriggerGlobal('breakdown', now)
            ) {
                events.push(this.createBreakdownEvent(maiden, carriage));
            }

            // 4. 堕落觉醒 (高欲求与高堕落共振)
            if (
                maiden.attributes.corruption > 60 &&
                maiden.attributes.lust > 70 &&
                !maiden.status.includes('complicit') &&
                probabilityCheck(EVENT_CONFIG.PROBABILITY.awakening) &&
                this.canTriggerGlobal('awakening', now)
            ) {
                events.push(this.createAwakeningEvent(maiden, carriage));
            }

            // 5. 深渊幻视 (深渊空间负面效应)
            if (
                carriage.category === 'abyss' &&
                maiden.attributes.sanity < 60 &&
                probabilityCheck(EVENT_CONFIG.PROBABILITY.abyss_vision) &&
                this.canTriggerGlobal('abyss_vision', now)
            ) {
                events.push(this.createAbyssVisionEvent(maiden, carriage));
            }

            // 6. 妊娠表征显化 (孕期推进里程碑)
            // 不设周数上界：跨周结算可能一次越过多个里程碑，设了上界会让
            // "还没被察觉就已超过 8 周"的实体永远触发不到这条事件。
            const pregnancyInfo = maiden.physiology.pregnancy;
            if (
                pregnancyInfo &&
                pregnancyInfo.weekNumber >= GAME_CONFIG.PREGNANCY.DISCOVERY_WEEK &&
                !maiden.status.includes('pregnant') &&
                this.canTriggerGlobal('pregnancy', now)
            ) {
                events.push(this.createPregnancyEvent(maiden, carriage));
            }

            // 7. 社交动态事件判定
            const peers = carriageMaidenMap.get(carriageId)?.filter(m => m.id !== maiden.id) || [];
            if (peers.length > 0) {
                const randomPeer = randomElement(peers);
                if (randomPeer) {
                    // 互相慰藉 (一方高压，一方低压容纳)
                    if (
                        maiden.attributes.stress > 60 && randomPeer.attributes.stress < 40 &&
                        probabilityCheck(EVENT_CONFIG.PROBABILITY.comfort) &&
                        this.canTriggerGlobal('comfort', now)
                    ) {
                        events.push(this.createComfortEvent(maiden, randomPeer, carriage));
                    }
                    // 冲突爆发 (双边高压应激)
                    else if (
                        maiden.attributes.stress > 70 && randomPeer.attributes.stress > 70 &&
                        probabilityCheck(EVENT_CONFIG.PROBABILITY.conflict) &&
                        this.canTriggerGlobal('conflict', now)
                    ) {
                        events.push(this.createConflictEvent(maiden, randomPeer, carriage));
                    }
                    // 建立友谊 (双边基础理智在线)
                    else if (
                        maiden.attributes.sanity > 40 && randomPeer.attributes.sanity > 40 &&
                        probabilityCheck(EVENT_CONFIG.PROBABILITY.friendship) &&
                        this.canTriggerGlobal('friendship', now)
                    ) {
                        events.push(this.createFriendshipEvent(maiden, randomPeer, carriage));
                    }
                }
            }
        }

        return events;
    }

    // [核心 API] 领域事件效能结算
    public applyEventEffects(
        event: GameEvent,
        ctx: EventEffectContext
    ): Map<string, Maiden> {
        const { maidens, gameTimePassed } = ctx;
        const changedMaidens = new Map<string, Maiden>();

        for (const effect of event.effects) {
            switch (effect.type) {
                case 'attribute': {
                    const targetId = effect.target === 'secondary' ? event.secondaryMaidenId : event.targetMaidenId;
                    if (targetId) {
                        this.applyAttributeEffect(maidens, changedMaidens, targetId, effect.key, effect.value);
                    }
                    break;
                }
                case 'status': {
                    const targetId = effect.target === 'secondary' ? event.secondaryMaidenId : event.targetMaidenId;
                    if (targetId) {
                        this.applyStatusEffect(maidens, changedMaidens, targetId, effect.key, effect.add);
                    }
                    break;
                }
                case 'memory': {
                    if (event.targetMaidenId) {
                        this.applyMemoryEffect(maidens, changedMaidens, event.targetMaidenId, effect.key, effect.value, gameTimePassed);
                    }
                    break;
                }
                case 'rank': {
                    if (event.targetMaidenId) {
                        this.applyRankEffect(maidens, changedMaidens, event.targetMaidenId, effect.value);
                    }
                    break;
                }
                case 'pregnancy': {
                    if (effect.key === 'reset' && event.targetMaidenId) {
                        this.applyPregnancyReset(maidens, changedMaidens, event.targetMaidenId);
                    }
                    break;
                }
                case 'system': {
                    // 系统级效果由 CarriageSystem 自己拥有并结算，本模块只处理实体效果；
                    // 静默忽略而不是猜一个落点，避免两个模块写同一个熵值。
                    break;
                }
            }
        }

        return changedMaidens;
    }

    // [私有辅助] 单体事件实例构造工厂

    private createNightmareEvent(maiden: Maiden, carriage: Carriage): GameEvent {
        const descriptions = [
            `${maiden.name}在睡梦中惊醒，浑身冷汗。她梦见了那扇通往深渊的门。`,
            `${maiden.name}发出压抑的呜咽，噩梦中她看见了自己的倒影在镜中微笑。`,
            `${maiden.name}猛然坐起，眼中满是恐惧。她梦见了那永不停歇的钟摆。`,
        ];

        return {
            type: 'nightmare',
            targetMaidenId: maiden.id,
            carriageId: carriage.id,
            description: randomElement(descriptions) || descriptions[0],
            effects: [
                { type: 'attribute', target: 'maiden', key: 'sanity', value: -5 },
                { type: 'attribute', target: 'maiden', key: 'stress', value: 10 },
                { type: 'status', target: 'maiden', key: 'panicked', add: true },
            ],
            logType: 'narrative',
        };
    }

    private createBreakdownEvent(maiden: Maiden, carriage: Carriage): GameEvent {
        const descriptions = [
            `${maiden.name}突然跪倒在地，开始不受控制地颤抖和哭泣。她的精神防线彻底崩溃了。`,
            `${maiden.name}的眼神变得空洞，嘴角挂着诡异的微笑。她已经不再是原来的她了。`,
            `${maiden.name}发出一声尖叫，然后陷入了可怕的沉默。她的理智已经支离破碎。`,
        ];

        return {
            type: 'breakdown',
            targetMaidenId: maiden.id,
            carriageId: carriage.id,
            description: randomElement(descriptions) || descriptions[0],
            effects: [
                { type: 'status', target: 'maiden', key: 'broken', add: true },
                { type: 'attribute', target: 'maiden', key: 'sanity', value: -10 },
            ],
            logType: 'narrative',
        };
    }

    private createAwakeningEvent(maiden: Maiden, carriage: Carriage): GameEvent {
        return {
            type: 'awakening',
            targetMaidenId: maiden.id,
            carriageId: carriage.id,
            description: `${maiden.name}的眼中闪过一丝异样的光芒。她不再抗拒，而是开始主动迎合。`,
            effects: [
                { type: 'status', target: 'maiden', key: 'complicit', add: true },
                { type: 'attribute', target: 'maiden', key: 'corruption', value: 10 },
                { type: 'attribute', target: 'maiden', key: 'obedience', value: 15 },
            ],
            logType: 'narrative',
        };
    }

    private createAbyssVisionEvent(maiden: Maiden, carriage: Carriage): GameEvent {
        const visions = [
            `${maiden.name}看见了不应存在的东西——虚空中有无数只眼睛在注视着她。`,
            `${maiden.name}的影子开始独立移动，向她伸出了手。`,
            `${maiden.name}听见了自己的声音，但那声音来自镜子的另一边。`,
            `${maiden.name}感觉到时间在她周围扭曲，她看见了自己的过去和未来同时存在。`,
        ];

        return {
            type: 'abyss_vision',
            targetMaidenId: maiden.id,
            carriageId: carriage.id,
            description: randomElement(visions) || visions[0],
            effects: [
                { type: 'attribute', target: 'maiden', key: 'sanity', value: -8 },
                { type: 'attribute', target: 'maiden', key: 'stress', value: 15 },
                { type: 'attribute', target: 'maiden', key: 'devotion', value: 3 },
            ],
            logType: 'abyss',
        };
    }

    private createPregnancyEvent(maiden: Maiden, carriage: Carriage): GameEvent {
        return {
            type: 'pregnancy',
            targetMaidenId: maiden.id,
            carriageId: carriage.id,
            description: `${maiden.name}感到了身体的变化。她的腹部开始隆起——生命已经在她体内生根。`,
            effects: [
                { type: 'status', target: 'maiden', key: 'pregnant', add: true },
                { type: 'attribute', target: 'maiden', key: 'stress', value: 20 },
            ],
            logType: 'ritual',
        };
    }

    // [私有辅助] 社交动态与系统事件构造工厂

    private createFriendshipEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
        const descriptions = [
            `${maiden.name}和${peer.name}在黑暗中找到了彼此，她们在${carriage.name}中低声交谈，建立起脆弱的联系。`,
            `${maiden.name}靠在${peer.name}肩上，两人无声地分享着彼此的温暖。`,
        ];
        return {
            type: 'friendship',
            targetMaidenId: maiden.id,
            secondaryMaidenId: peer.id,
            carriageId: carriage.id,
            description: randomElement(descriptions) || descriptions[0],
            effects: [
                { type: 'attribute', target: 'maiden', key: 'sanity', value: 3 },
                { type: 'attribute', target: 'maiden', key: 'stress', value: -5 },
                { type: 'attribute', target: 'secondary', key: 'sanity', value: 3 },
                { type: 'attribute', target: 'secondary', key: 'stress', value: -5 },
            ],
            logType: 'social',
        };
    }

    private createConflictEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
        const descriptions = [
            `${maiden.name}和${peer.name}之间爆发了激烈的冲突。压抑的情绪在${carriage.name}中找到了失控的出口。`,
            `${maiden.name}狠狠地推了${peer.name}一把，积累在深渊中的怨恨在这一刻彻底爆发。`,
        ];
        return {
            type: 'conflict',
            targetMaidenId: maiden.id,
            secondaryMaidenId: peer.id,
            carriageId: carriage.id,
            description: randomElement(descriptions) || descriptions[0],
            effects: [
                { type: 'attribute', target: 'maiden', key: 'stress', value: 10 },
                { type: 'attribute', target: 'maiden', key: 'sanity', value: -2 },
                { type: 'attribute', target: 'secondary', key: 'stress', value: 10 },
                { type: 'attribute', target: 'secondary', key: 'sanity', value: -2 },
            ],
            logType: 'social',
        };
    }

    private createComfortEvent(maiden: Maiden, peer: Maiden, carriage: Carriage): GameEvent {
        const descriptions = [
            `${peer.name}轻轻拥抱了颤抖的${maiden.name}，在她耳边低声安慰。`,
            `${peer.name}握住了${maiden.name}的手，无声地向她传递着抵御深渊的力量。`,
        ];
        return {
            type: 'comfort',
            targetMaidenId: maiden.id,
            secondaryMaidenId: peer.id,
            carriageId: carriage.id,
            description: randomElement(descriptions) || descriptions[0],
            effects: [
                { type: 'attribute', target: 'maiden', key: 'stress', value: -15 },
                { type: 'attribute', target: 'maiden', key: 'sanity', value: 5 },
            ],
            logType: 'social',
        };
    }

    // [私有辅助] 算子变动写入策略

    private applyAttributeEffect(
        sourceMaidens: Map<string, Maiden>,
        changedMaidens: Map<string, Maiden>,
        maidenId: string,
        key: AttributeKey,
        value: number
    ): void {
        const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
        if (!maiden || value === 0) return;

        const currentVal = maiden.attributes[key];
        if (typeof currentVal !== 'number') return;

        const nextVal = clamp(currentVal + value, 0, 100);
        if (currentVal === nextVal) return;

        const newMaiden: Maiden = {
            ...maiden,
            attributes: {
                ...maiden.attributes,
                [key]: nextVal
            }
        };

        changedMaidens.set(maidenId, newMaiden);
    }

    private applyStatusEffect(
        sourceMaidens: Map<string, Maiden>,
        changedMaidens: Map<string, Maiden>,
        maidenId: string,
        statusKey: CharacterStatus,
        add: boolean
    ): void {
        const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
        if (!maiden) return;

        const hasStatus = maiden.status.includes(statusKey);
        if (add && hasStatus) return;
        if (!add && !hasStatus) return;

        const newStatus = add
            ? [...maiden.status, statusKey]
            : maiden.status.filter(s => s !== statusKey);

        const newMaiden: Maiden = {
            ...maiden,
            status: newStatus
        };

        changedMaidens.set(maidenId, newMaiden);
    }

    private applyMemoryEffect(
        sourceMaidens: Map<string, Maiden>,
        changedMaidens: Map<string, Maiden>,
        maidenId: string,
        action: MemoryAction,
        value: string | undefined,
        gameTimePassed: number
    ): void {
        const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
        if (!maiden) return;

        let chain = maiden.memoryChain;

        switch (action) {
            case 'tamper': {
                const targetNodes = chain.filter(n => n.type === 'original');
                const candidatePool = targetNodes.length > 0 ? targetNodes : chain;
                const targetNode = randomElement(candidatePool);

                if (targetNode) {
                    const corruptedNode = maidenMemory.tamperNode(
                        targetNode,
                        gameTimePassed,
                        value || "记忆被深渊的雾霾吞没...",
                        "深渊共鸣篡改"
                    );
                    chain = maidenMemory.replaceNode(chain, corruptedNode);
                }
                break;
            }
            case 'implant': {
                const content = typeof value === 'string' ? value : "不可名状的幻象植入";
                chain = maidenMemory.insertNode(chain, maidenMemory.createImplantedNode(content, 'trauma', gameTimePassed));
                break;
            }
            case 'restore': {
                const corruptedNodes = chain.filter(n => n.type === 'corrupted');
                const targetNode = randomElement(corruptedNodes);

                if (targetNode) {
                    const restoredNode = maidenMemory.restoreNode(
                        targetNode,
                        gameTimePassed,
                        value || targetNode.history?.[targetNode.history.length - 1]?.previousNarrative || targetNode.objectiveTruth
                    );
                    chain = maidenMemory.replaceNode(chain, restoredNode);
                }
                break;
            }
        }

        changedMaidens.set(maidenId, { ...maiden, memoryChain: chain });
    }

    private applyRankEffect(
        sourceMaidens: Map<string, Maiden>,
        changedMaidens: Map<string, Maiden>,
        maidenId: string,
        rank: CharacterRank
    ): void {
        const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
        if (!maiden || maiden.rank === rank) return;

        changedMaidens.set(maidenId, { ...maiden, rank });
    }

    private applyPregnancyReset(
        sourceMaidens: Map<string, Maiden>,
        changedMaidens: Map<string, Maiden>,
        maidenId: string
    ): void {
        const maiden = changedMaidens.get(maidenId) || sourceMaidens.get(maidenId);
        if (!maiden) return;

        const newMaiden: Maiden = {
            ...maiden,
            status: maiden.status.filter(s => s !== 'pregnant' && s !== 'gestating'),
            physiology: {
                ...maiden.physiology,
                pregnancy: null
            },
            birthCount: maiden.birthCount + 1
        };

        changedMaidens.set(maidenId, newMaiden);
    }

    // [私有计算] 机制校验与状态探测

    private shouldTriggerBreakdown(sanity: number, isCurrentlyBroken: boolean): boolean {
        if (isCurrentlyBroken) return false;
        if (sanity <= 0) return probabilityCheck(0.8);
        if (sanity < 15) return probabilityCheck(0.15);
        return false;
    }

    private canTriggerGlobal(type: EventType, now: number): boolean {
        const lastTime = this.globalEventTimestamps.get(type) || 0;
        const cooldown = EVENT_CONFIG.COOLDOWNS[type] || 30000;

        if (now - lastTime < cooldown) return false;

        this.globalEventTimestamps.set(type, now);
        return true;
    }

    public serialize(): [string, number][] {
        return Array.from(this.globalEventTimestamps.entries());
    }

    public deserialize(data: [string, number][]): void {
        this.globalEventTimestamps = new Map(data as [EventType, number][]);
    }
}

/** 情境对特质 j 的线索相关度 r_jt ∈ [0,1]，0.5 为中性 */
type CueRelevance = Partial<Record<keyof HexacoFacets, number>>;

/** 情境对特质 j 所要求/期待的表达水平 n_jt（z 分） */
type SituationalNorm = Partial<Record<keyof HexacoFacets, number>>;

/** 特质激活增益 κ_j 默认 0.5（§附录 B） */
const TRAIT_ACTIVATION_GAIN = 0.5;

/** 个人内 SD σ_w 默认 0.7（§附录 B） */
const WITHIN_PERSON_SD = 0.7;

/** 一游戏年按 365 天计，用于把按年给出的漂移率换算到按天的调用 */
const DAYS_PER_YEAR = 365;

/**
 * 情境特征 → 被激活的子维度（§4.1）。
 *
 * 情境分类取自 DIAMONDS 八维模型的假设映射。与 v1 的差别在于：这里给出的是
 * **线索相关度** r（该情境是否与这个特质有关），而不是"特质越极端反应越大"——
 * 后者与线索无关，是 v1 "情境-特质激活"表的误用。
 */
const SITUATION_CUE_RELEVANCE: Record<SituationType, CueRelevance> = {
    // Duty 责任/任务
    task: { diligence: 0.9, organization: 0.85, prudence: 0.85, fairness: 0.7 },
    // Intellect 智性
    ambiguous: { inquisitiveness: 0.85, creativity: 0.8, aestheticAppreciation: 0.7 },
    // Adversity 逆境/威胁
    threat: { anxiety: 0.85, fearfulness: 0.8, patience: 0.7 },
    // pOsitivity 愉悦
    opportunity: { liveliness: 0.8, sociability: 0.8 },
    // Negativity 冲突/负面 + Sociality 社交
    competition: { patience: 0.8, forgivingness: 0.75, gentleness: 0.7, socialBoldness: 0.7 },
    // Mating 亲密/吸引
    intimate: { socialBoldness: 0.8, socialSelfEsteem: 0.8, sentimentality: 0.85 },
};

/** 情境对表达水平的期待 n_jt：以"该情境是否要求高于常态"给出（z 分） */
const SITUATION_NORM_PRESSURE: Record<SituationType, SituationalNorm> = {
    task: { diligence: 1.0, organization: 1.0, prudence: 0.7, liveliness: -0.5 },
    ambiguous: { unconventionality: 0.5, organization: -0.4 },
    threat: { anxiety: -0.3, patience: 0.5, fearfulness: -0.5 },
    opportunity: { liveliness: 0.5, sociability: 0.6 },
    competition: { socialBoldness: 0.8, gentleness: -0.5, patience: 0.5 },
    intimate: { sentimentality: 0.6, gentleness: 0.6, socialBoldness: 0.3 },
};

/** 情境在某个维度上的线索相关度：取该维度内子维度线索的均值 */
function domainCueRelevance(situation: SituationType, domain: keyof HexacoProfile): number {
    const cues = SITUATION_CUE_RELEVANCE[situation];
    const keys = DOMAIN_FACETS[domain];
    return keys.reduce((sum, key) => sum + (cues[key] ?? 0.5), 0) / keys.length;
}

/** 情境对某个维度的期待水平：取该维度内子维度规范的均值 */
function domainNormPressure(situation: SituationType, domain: keyof HexacoProfile): number {
    const norms = SITUATION_NORM_PRESSURE[situation];
    const keys = DOMAIN_FACETS[domain];
    return keys.reduce((sum, key) => sum + (norms[key] ?? 0), 0) / keys.length;
}

/**
 * 负荷递推参数（§附录 B，全部为 [D] 默认值）。
 *
 * 与 v1 的"特质疲劳"的关键区别：不再假设某种可耗尽的资源（自我损耗模型的
 * 实验证据存在重大复现争议），而是把负荷定义为"持续、被监控、非自选的背离"
 * 所带来**主观负担**；背离若服务于个人自选的核心项目则折扣，由恢复性生态位降低。
 */
const LOAD_PARAMS = {
    /** ρ 负荷的日际保持 */
    retention: 0.7,
    /** λ 恢复效率 */
    recoveryEfficiency: 0.6,
} as const;

/**
 * D² 的档位判据：多元正态近似下 D² ~ χ²_p，阈值取卡方分位（§4.3.1）。
 *
 * 这里用 p = 6（维度数）的分位值：80% = 8.56、95% = 12.59、99% = 16.81。
 */
const DEVIATION_BANDS: { state: PersonalityState; max: number }[] = [
    { state: 'typical', max: 8.56 },
    { state: 'stretched', max: 12.59 },
    { state: 'atypical', max: 16.81 },
    { state: 'extreme', max: Infinity },
];

/**
 * 特质漂移参数（§4.4）。
 *
 * 量级受研究约束：特质变化缓慢而小，变化最活跃的年段每十年约 0.1–0.3 SD；
 * 遗传度约 40%，意味着变化是在"设定点"附近移动而非重写。干预类效应在
 * 数周到数月内约 0.3–0.4 SD。以下数值按"每年"给出，直接对应这些结论。
 */
const DRIFT_PARAMS = {
    /** 年龄漂移（z/年）。十年前进 0.1–0.3 SD，取中值即 0.02/年 */
    ageDriftPerYear: 0.02,
    /** 单次生活事件的最大漂移（z），对应"多数事件影响小到中且不持久" */
    eventDriftMax: 0.25,
    /** 主动练习/目标驱动的最大漂移（z） */
    volitionalDriftMax: 0.3,
    /**
     * 向均值回归的比例（每年）。相互强化原则会放大偏离，需要一项与之平衡的稳定项；
     * 它必须按时间线性缩放，否则长时间跨度下会把特质瞬间压回 0。
     */
    regressionToMeanPerYear: 0.02,
    /** 特质水平的硬边界（z）：超出此范围已不属于人群分布，属模型外 */
    clamp: 3.5,
} as const;

/** 年龄漂移方向：成熟原则（§4.4）——成年期趋向更情绪稳定、更宜人、更尽责 */
const AGE_DRIFT_DIRECTION: Partial<Record<keyof HexacoFacets, number>> = {
    anxiety: -1, fearfulness: -0.5,
    patience: 1, flexibility: 1, gentleness: 1, forgivingness: 0.8,
    organization: 0.7, diligence: 0.7, prudence: 0.6,
    sincerity: 0.4, fairness: 0.4, modesty: 0.3,
};

// ============================================================================
// 元因子（§3.3.2）
// ============================================================================

/**
 * 三个元因子的成分与符号。三个集合**互不重叠**，保证公式层面可区分。
 *
 * 刻意排除：C.PER（与焦虑相关，载荷不稳）、E.FEA（与情绪稳定关系不稳）、
 * E.DEP（含依恋成分，方向含混）、E 整域（v1 的错误是把焦虑与依赖也算作"亲社会"）、
 * X.SSE（已归入 α 的低退缩）。
 */
const META_COMPONENTS = {
    alpha: {
        positive: ['patience', 'flexibility', 'organization', 'diligence', 'prudence', 'socialSelfEsteem'],
        negative: ['anxiety'],
    },
    beta: {
        positive: ['socialBoldness', 'liveliness', 'sociability', 'aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality'],
        negative: [],
    },
    gamma: {
        positive: ['sincerity', 'fairness', 'greedAvoidance', 'modesty', 'forgivingness', 'gentleness', 'sentimentality', 'altruism'],
        negative: [],
    },
} as const satisfies Record<keyof MetaTraits, { positive: readonly (keyof HexacoFacets)[]; negative: readonly (keyof HexacoFacets)[] }>;

/**
 * 各元因子的预期平均符号相关（§3.3.2 标 [D]）。
 * 三个因子分数之间仍预期中等相关，不假定正交。
 */
const META_INTERCORRELATION: Record<keyof MetaTraits, number> = {
    alpha: 0.20,
    beta: 0.15,
    gamma: 0.30,
};

function metaComponents(facets: HexacoFacets, key: keyof MetaTraits): number[] {
    const spec = META_COMPONENTS[key];
    return [
        ...spec.positive.map(f => facets[f]),
        ...spec.negative.map(f => -facets[f]),
    ];
}

/** 计算三个元因子（单位权重 → 重标准化，§2.6） */
function deriveMetaTraits(facets: HexacoFacets): MetaTraits {
    const meta = {} as MetaTraits;
    for (const key of Object.keys(META_COMPONENTS) as (keyof MetaTraits)[]) {
        meta[key] = Math.round(restandardize(metaComponents(facets, key), META_INTERCORRELATION[key]) * 100) / 100;
    }
    return meta;
}

// ============================================================================
// 构型（§3.4）
// ============================================================================

/** 八分构型的原型向量 p_k ∈ {±1}³ */
const OCTANT_PROTOTYPES: Record<OctantId, [number, number, number]> = {
    PPP: [1, 1, 1], PPN: [1, 1, -1], PNP: [1, -1, 1], PNN: [1, -1, -1],
    NPP: [-1, 1, 1], NPN: [-1, 1, -1], NNP: [-1, -1, 1], NNN: [-1, -1, -1],
};

/** 软隶属带宽 τ（§附录 B，默认 1.0） */
const OCTANT_BANDWIDTH = 1.0;

/**
 * 软隶属度（§3.4.1）：`w_k = exp(−‖m − p_k‖² / 2τ²)`，归一化。
 *
 * 用软隶属而非硬分类，是因为一个人可以同时部分匹配多个构型——
 * β≈0 时"+ − +"与"+ + +"本就该接近并列。
 */
function deriveOctantAffinities(meta: MetaTraits): OctantAffinity[] {
    const m = [meta.alpha, meta.beta, meta.gamma];
    const raw = (Object.keys(OCTANT_PROTOTYPES) as OctantId[]).map(octant => {
        const p = OCTANT_PROTOTYPES[octant];
        const distanceSquared = m.reduce((sum, value, i) => sum + (value - p[i]) ** 2, 0);
        return { octant, weight: Math.exp(-distanceSquared / (2 * OCTANT_BANDWIDTH ** 2)) };
    });

    const total = raw.reduce((sum, r) => sum + r.weight, 0);
    return raw
        .map(r => ({ octant: r.octant, membership: total > 0 ? r.weight / total : 0 }))
        .sort((a, b) => b.membership - a.membership);
}

/**
 * 子维度签名的判据（§3.4.2）。
 *
 * 签名的价值在于刻画"矛盾的人"：角色的矛盾感应来自子维度分离
 * （如 H.FAI 高而 H.SIN 低），而不是随意的人设冲突。
 */
type SignatureCondition = { facet: keyof HexacoFacets; min?: number; max?: number };

const SIGNATURE_CONDITIONS: Record<SignatureId, SignatureCondition[]> = {
    benevolent_strategist: [
        { facet: 'prudence', min: 0.5 }, { facet: 'sincerity', max: -0.5 },
        { facet: 'gentleness', min: 0.5 }, { facet: 'altruism', min: 0.5 },
    ],
    vulnerable_superiority: [
        { facet: 'modesty', max: -0.5 }, { facet: 'anxiety', min: 0.5 },
        { facet: 'socialSelfEsteem', max: -0.5 }, { facet: 'patience', max: -0.5 },
    ],
    chaotic_innovator: [
        { facet: 'creativity', min: 1.0 }, { facet: 'liveliness', min: 0.5 },
        { facet: 'organization', max: -0.5 }, { facet: 'prudence', max: -0.5 },
    ],
    calm_executor: [
        { facet: 'diligence', min: 0.5 }, { facet: 'organization', min: 0.5 },
        { facet: 'sentimentality', max: -0.5 }, { facet: 'gentleness', max: -0.5 },
    ],
    needed_helper: [
        { facet: 'altruism', min: 1.0 }, { facet: 'gentleness', min: 0.5 },
        { facet: 'dependence', min: 0.5 }, { facet: 'modesty', max: -0.5 },
    ],
    rule_enforcer: [
        { facet: 'fairness', min: 1.0 }, { facet: 'forgivingness', max: -0.5 },
        { facet: 'gentleness', max: -0.5 }, { facet: 'sentimentality', max: -0.5 },
    ],
    steady_caregiver: [
        { facet: 'altruism', min: 0.5 }, { facet: 'sentimentality', min: 0.5 },
        { facet: 'anxiety', max: -0.5 }, { facet: 'diligence', min: 0.5 },
    ],
    quiet_principled: [
        { facet: 'fairness', min: 1.0 }, { facet: 'modesty', min: 0.5 },
        { facet: 'socialBoldness', max: -0.5 },
    ],
};

function conditionMet(condition: SignatureCondition, facets: HexacoFacets): boolean {
    const value = facets[condition.facet];
    if (condition.min !== undefined && value < condition.min) return false;
    if (condition.max !== undefined && value > condition.max) return false;
    return true;
}

/** 签名匹配度（§3.4.2）：match = 满足条件数 / 条件总数；仅返回 match > 0 的项，按匹配度降序 */
function deriveSignatureMatches(facets: HexacoFacets): SignatureMatch[] {
    return (Object.keys(SIGNATURE_CONDITIONS) as SignatureId[])
        .map(signature => {
            const conditions = SIGNATURE_CONDITIONS[signature];
            const met = conditions.filter(c => conditionMet(c, facets)).length;
            return { signature, match: met / conditions.length };
        })
        .filter(m => m.match > 0)
        .sort((a, b) => b.match - a.match);
}

// ============================================================================
// 代理指标（§3.4.3）
// ============================================================================

/**
 * 光明/黑暗构念的近似代理成分（单位权重，符号内建）。
 *
 * 使用限制（§3.4.3、§7.2）：这些代理**未**通过验证门槛（与专用量表 r ≥ .50），
 * 因此不对个体作诊断式判断，也不输出风险等级；Sad_proxy 置信最低。
 */
const PROXY_COMPONENTS: Record<ProxyId, { positive: (keyof HexacoFacets)[]; negative: (keyof HexacoFacets)[] }> = {
    machiavellianism: { positive: ['prudence'], negative: ['sincerity', 'fairness', 'greedAvoidance', 'sentimentality'] },
    narcissism: { positive: ['socialBoldness', 'socialSelfEsteem'], negative: ['modesty', 'flexibility'] },
    psychopathy: { positive: [], negative: ['fearfulness', 'sentimentality', 'fairness', 'prudence', 'gentleness'] },
    sadism: { positive: ['socialBoldness'], negative: ['gentleness', 'sentimentality'] },
    kantianism: { positive: ['sincerity', 'fairness', 'greedAvoidance'], negative: [] },
    humanism: { positive: ['gentleness', 'sentimentality', 'altruism', 'inquisitiveness'], negative: [] },
    faithInHumanity: { positive: ['forgivingness', 'flexibility'], negative: ['anxiety'] },
};

/**
 * 各代理合成时的平均符号相关 r̄ₛ。
 *
 * §6.3 的示例对操纵倾向取 .25、康德主义取 .35；其余构念文档未给值，
 * 取两者之间。该参数只影响 z̃ 的缩放，不改变符号与排序。
 */
const PROXY_INTERCORRELATION: Record<ProxyId, number> = {
    machiavellianism: 0.25,
    narcissism: 0.30,
    psychopathy: 0.30,
    sadism: 0.30,
    kantianism: 0.35,
    humanism: 0.30,
    faithInHumanity: 0.30,
};

/** 计算全部代理指标（z 分） */
function deriveProxies(facets: HexacoFacets): Record<ProxyId, number> {
    const proxies = {} as Record<ProxyId, number>;
    for (const key of Object.keys(PROXY_COMPONENTS) as ProxyId[]) {
        const spec = PROXY_COMPONENTS[key];
        const components = [
            ...spec.positive.map(f => facets[f]),
            ...spec.negative.map(f => -facets[f]),
        ];
        proxies[key] = Math.round(restandardize(components, PROXY_INTERCORRELATION[key]) * 100) / 100;
    }
    return proxies;
}

/** 由 D² 分档得到人格状态（§4.3.1） */
function stateFromDeviation(deviationSquared: number): PersonalityState {
    for (const band of DEVIATION_BANDS) {
        if (deviationSquared <= band.max) return band.state;
    }
    return 'extreme';
}

/**
 * 人格读取门面：把派生值集中到一处算出。
 *
 * `ISShexPersonality` 只存权威（facets + dynamics），因此所有读取派生值的调用点
 * 都经过这里，而不是各自重算——v1 的问题是八层派生值各存一份到存档，
 * 却没有一处维护它们与 facets 的一致性。
 *
 * 派生值按实例惰性缓存：视图构造后 `facets` 视为不可变快照（写入方一律产出新对象），
 * 因此一次读取即可复用。没有缓存时 `octants` 会连带重算 `meta`，
 * 而 `determineRelationType` 这类要读三个值的地方会构造三次视图、算九遍。
 */
export class PersonalityView {
    private cachedDomains?: HexacoProfile;
    private cachedMeta?: MetaTraits;
    private cachedOctants?: OctantAffinity[];
    private cachedSignatures?: SignatureMatch[];
    private cachedProxies?: Record<ProxyId, number>;
    private cachedWeights?: BehaviorWeights;

    constructor(private readonly isshex: ISShexPersonality) { }

    /** 六个维度分数（z） */
    get domains(): HexacoProfile {
        return this.cachedDomains ??= deriveDomains(this.isshex.facets);
    }

    /** 三个元因子 α/β/γ（z，已重标准化） */
    get meta(): MetaTraits {
        return this.cachedMeta ??= deriveMetaTraits(this.isshex.facets);
    }

    /** 八分构型软隶属度，按隶属度降序 */
    get octants(): OctantAffinity[] {
        return this.cachedOctants ??= deriveOctantAffinities(this.meta);
    }

    /** 隶属度最高的构型；β≈0 时相邻构型本就接近，故调用方应展示隶属度而非只取首位 */
    get topOctant(): OctantAffinity {
        return this.octants[0];
    }

    /** 子维度签名匹配，按匹配度降序 */
    get signatures(): SignatureMatch[] {
        return this.cachedSignatures ??= deriveSignatureMatches(this.isshex.facets);
    }

    /**
     * 光明/黑暗代理指标（z）。
     * 未通过验证门槛，仅可用于群体层面分析与创作设定，禁止据此对个体下判断（§3.4.3）。
     */
    get proxies(): Record<ProxyId, number> {
        return this.cachedProxies ??= deriveProxies(this.isshex.facets);
    }

    /** 行为驱动权重 */
    get weights(): BehaviorWeights {
        return this.cachedWeights ??= deriveBehaviorWeights(this.isshex.facets);
    }

    /** 过程平面的可变状态 */
    get dynamics(): PersonalityDynamics {
        return this.isshex.dynamics;
    }

    /** 状态档位：由 D² 分档派生，不单独存储（§4.3.1） */
    get state(): PersonalityState {
        return stateFromDeviation(this.isshex.dynamics.deviationSquared);
    }

    /**
     * 构型的速记名。
     *
     * 优先取匹配度最高的子维度签名（比元因子更具体、更适合叙事），否则退回
     * 八分构型。**只描述构型，不给诊断式标签**：v1 在此输出"操纵者/自恋者/冷血者"
     * 一类词，属于规范明确禁止的用法。
     */
    get label(): string {
        const signature = this.signatures[0];
        if (signature && signature.match >= 0.75) {
            return SIGNATURE_LABELS[signature.signature];
        }
        return OCTANT_LABELS[this.topOctant.octant];
    }
}

/** 便捷构造：调用点写作 `personalityView(maiden).meta` */
export function personalityView(maiden: Maiden): PersonalityView {
    return new PersonalityView(maiden.isshex);
}

function generateFullName(): { fullName: string; origin: NameOrigin } {
    const dataset = ALL_NAME_DATASETS[Math.floor(Math.random() * ALL_NAME_DATASETS.length)];
    const { origin, data } = dataset;
    const surname = data.surnames[Math.floor(Math.random() * data.surnames.length)];
    const givenName = data.givenNames[Math.floor(Math.random() * data.givenNames.length)];
    const fullName = data.format === 'eastern' ? `${surname}${givenName}` : `${givenName} ${surname}`;
    return { fullName, origin };
}

/**
 * 抽取标准正态 z 分，截断在 ±3σ —— 超出即已不属于人群分布，属模型外。
 */
function sampleNormalZ(): number {
    const u1 = Math.max(Number.EPSILON, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.round(Math.max(-3, Math.min(3, z)) * 100) / 100;
}

/** 子维度分数：维度位置 θ 加上子维度特有偏差（同域子维度相关约 .3–.5，故偏差不宜过大） */
function sampleFacetZ(domainZ: number): number {
    return Math.round(Math.max(-3, Math.min(3, domainZ + sampleNormalZ() * 0.75)) * 100) / 100;
}

/**
 * 生成一套自洽的子维度分数。
 *
 * 直接抽取 24 个子维度会得到彼此独立的噪声，而同一维度内的子维度本就相关；
 * 因此先抽 6 个维度位置，再在域内加偏差。利他为间质子维度，独立抽取。
 */
function generateHexacoFacets(): HexacoFacets {
    const H = sampleNormalZ(), E = sampleNormalZ(), X = sampleNormalZ();
    const A = sampleNormalZ(), C = sampleNormalZ(), O = sampleNormalZ();

    return {
        sincerity: sampleFacetZ(H),
        fairness: sampleFacetZ(H),
        greedAvoidance: sampleFacetZ(H),
        modesty: sampleFacetZ(H),
        fearfulness: sampleFacetZ(E),
        anxiety: sampleFacetZ(E),
        dependence: sampleFacetZ(E),
        sentimentality: sampleFacetZ(E),
        socialSelfEsteem: sampleFacetZ(X),
        socialBoldness: sampleFacetZ(X),
        sociability: sampleFacetZ(X),
        liveliness: sampleFacetZ(X),
        forgivingness: sampleFacetZ(A),
        gentleness: sampleFacetZ(A),
        flexibility: sampleFacetZ(A),
        patience: sampleFacetZ(A),
        organization: sampleFacetZ(C),
        diligence: sampleFacetZ(C),
        perfectionism: sampleFacetZ(C),
        prudence: sampleFacetZ(C),
        aestheticAppreciation: sampleFacetZ(O),
        inquisitiveness: sampleFacetZ(O),
        creativity: sampleFacetZ(O),
        unconventionality: sampleFacetZ(O),
        altruism: sampleNormalZ(),
    };
}

/** 全部子维度键名，顺序与 HexacoFacets 声明一致 */
const FACET_KEYS = [
    'sincerity', 'fairness', 'greedAvoidance', 'modesty',
    'fearfulness', 'anxiety', 'dependence', 'sentimentality',
    'socialSelfEsteem', 'socialBoldness', 'sociability', 'liveliness',
    'forgivingness', 'gentleness', 'flexibility', 'patience',
    'organization', 'diligence', 'perfectionism', 'prudence',
    'aestheticAppreciation', 'inquisitiveness', 'creativity', 'unconventionality',
    'altruism',
] as const satisfies readonly (keyof HexacoFacets)[];

/**
 * 把任意来源的人格数据规范化为当前模型的 z 分。
 *
 * 这是**唯一**的读档人格入口。两种输入形状：
 * - 现行形状：有 `dynamics`，直接取 `facets`；
 * - v1 形状：有 `hexaco` 而无 `dynamics`，量纲是「M=50, SD=10」的 0–100 分，
 *   需按 `z = (score − 50) / 10` 换算（否则数值会被放大十倍）。
 *
 * v1 的 `metaTraits`/`darkTetrad`/`lightTriad`/`archetype`/`currentState` 等派生副本
 * 一律丢弃：它们读取时由 `facets` 重算，保留会让两套数字并存并互相漂移。
 *
 * 判定依据是字段形状而非存档版本号，因此可重复调用（幂等）。
 * 缺失的子维度按人群中位（z = 0）补足，利他即属此类——它是 v2 新增的间质子维度。
 */
function normalizeFacets(raw: unknown): HexacoFacets {
    const source = (raw ?? {}) as {
        facets?: Record<string, unknown>;
        hexaco?: unknown;
        dynamics?: unknown;
    };

    const rawFacets = source.facets ?? {};
    // v1 无 dynamics，且分数在 0–100 量表上
    const isLegacyScale = !source.dynamics && source.hexaco != null;
    const convert = (score: unknown): number => {
        if (typeof score !== 'number' || !Number.isFinite(score)) return 0;
        const z = isLegacyScale ? (score - 50) / 10 : score;
        return Math.round(z * 1000) / 1000;
    };

    const facets = {} as HexacoFacets;
    for (const key of FACET_KEYS) {
        facets[key] = convert(rawFacets[key]);
    }
    return facets;
}

/**
 * 把任意来源的 `isshex` 规范化为当前形状：只保留权威字段，派生值一律丢弃。
 *
 * 子维度的换算与补足交给 `normalizeFacets`（唯一的人格读档入口），这里只负责
 * 过程平面：v1 的 `traitFatigue` 是 0–100 的"特质疲劳"，与背离负荷不是同一个量，
 * 故不做换算而直接归零——量纲不同，强行映射只会产生一个没有依据的初值。
 *
 * `lastDriftTime` 与 `maiden.lastUpdateTime` 共用同一条游戏时钟，缺失时必须用
 * `now` 播种而非 0：老存档没有 `dynamics`，若播成 0，首帧的 elapsedDays 会等于
 * 整个游戏时长（实测 20574 天 ≈ 56 年），于是 P4 在加载瞬间一次性漂移约 1.1 SD。
 * 没有记录的时间就当没有发生——与 `traitFatigue` 归零是同一条理由。
 *
 * @param now 该实体当前的游戏时间（`maiden.lastUpdateTime`）
 */
function normalizeIsshex(raw: unknown, now: number): ISShexPersonality {
    const source = (raw ?? {}) as { dynamics?: Partial<PersonalityDynamics> };
    const rawDynamics = source.dynamics;

    return {
        facets: normalizeFacets(raw),
        dynamics: {
            discrepancyLoad: rawDynamics?.discrepancyLoad ?? 0,
            deviationSquared: rawDynamics?.deviationSquared ?? 0,
            lastDriftTime: rawDynamics?.lastDriftTime ?? now,
        },
    };
}

/** 读档时的人格规范化门面，供持久化层调用（唯一入口） */
export function normalizePersonality(raw: unknown, now: number): ISShexPersonality {
    return normalizeIsshex(raw, now);
}

/**
 * 实体生成子系统：从人格模型出发，一次性生成完整自洽的少女实体。
 * 生成顺序有依赖：人格 → 行为权重 → 属性/生理/行为，后者读取前者。
 */
class MaidenGenerator {

    /**
     * 生成单个实体。
     * 姓名在 `usedNames` 内去重，超过重试上限时追加随机后缀以保证必然终止。
     */
    generateUnit(id: string, carriageId: string, usedNames: Set<string>, gameTimePassed: number): Maiden {
        let name: string;
        let nameOrigin: NameOrigin;
        let attempts = 0;
        const maxAttempts = 200;
        const fallbackSuffix = Math.random().toString(36).substring(2, 8);

        do {
            const nameResult = generateFullName();
            name = nameResult.fullName;
            nameOrigin = nameResult.origin;
            attempts++;

            if (attempts > maxAttempts) {
                name = `${name}${fallbackSuffix}`;
                console.warn(`名字去重尝试次数超过${maxAttempts}，使用随机后缀: ${name}`);
                break;
            }
        } while (usedNames.has(name));

        usedNames.add(name);

        const arrivalDays = Math.floor(Math.random() * 100);
        const arrivalTimestamp = gameTimePassed - arrivalDays * 24 * 60 * 60 * 1000;
        const { age, initialAgeMs, boardingAge } = this.generateAgeData(arrivalTimestamp, gameTimePassed);
        const birthTimestamp = gameTimePassed - initialAgeMs;

        const isshex = this.generateISShexPersonality(gameTimePassed);
        const physical = this.generatePhysicalStats();
        const clothing = this.generateClothing();
        const initialClothing = deepCopy(clothing);
        const appearance = this.generateAppearance();
        const description = this.generateDescription(physical, clothing, appearance);
        const profile = this.generateProfile();
        const attributes = this.generateAttributes(isshex);
        const physiology = this.generatePhysiology();
        const behavior = this.generateBehavior(gameTimePassed);

        return {
            id,
            name,
            nameOrigin,
            age,
            initialAgeMs,
            boardingAge,
            birthTimestamp,
            description,
            physical,
            appearance,
            clothing,
            initialClothing,
            status: ['normal'],
            attributes,
            physiology,
            behavior,
            movement: createUnifiedMovementState(carriageId),
            isshex,
            profile,
            mood: 'content',
            moodDuration: 0,
            rank: 'unranked',
            rankColor: 'dim gray',
            relationships: [],
            memoryChain: [],
            abyssExposureCount: 0,
            graceReceived: 0,
            birthCount: 0,
            arrivalTimestamp,
            lastUpdateTime: gameTimePassed,
            lastSpontaneousAction: undefined,
            lastSpontaneousTime: undefined,
        };
    }

    generatePhysicalStats(): PhysicalStats {
        const archetypes = Object.entries(BODY_ARCHETYPES).map(([key, config]) => ({
            item: { key, config },
            weight: config.weight
        }));
        const { config } = weightedRandom(archetypes);

        const height = randomInt(config.heightRange[0], config.heightRange[1]);

        const bustBase = height * config.bustModifier;
        const waistBase = height * config.waistModifier;
        const hipBase = height * config.hipModifier;

        const bust = Math.round(bustBase + randomFloat(-2, 3));
        const waist = Math.round(waistBase + randomFloat(-2, 2));
        const hips = Math.round(hipBase + randomFloat(-2, 3));

        const cupIndex = randomInt(config.cupRange[0], config.cupRange[1]);
        const cupSize = CUP_SIZES[Math.min(cupIndex, CUP_SIZES.length - 1)];

        return {
            height,
            bust,
            waist,
            hips,
            cupSize,
            weight: Math.round((height * 0.45) + randomFloat(-5, 5)),
            bodyType: config.descriptions[Math.floor(Math.random() * config.descriptions.length)],
        };
    }

    generateAppearance(): AppearanceData {
        const hair = {
            color: randomElement([...HAIR_COLORS])!,
            style: randomElement([...HAIR_STYLES])!,
            texture: randomElement([...HAIR_TEXTURES])!,
            length: randomElement([...HAIR_LENGTHS])!,
        };

        const eyeColor = randomElement([...EYE_COLORS])!;
        const isHeterochromia = eyeColor.id === 'heterochromia';
        const eyes = {
            color: eyeColor,
            shape: randomElement([...EYE_SHAPES])!,
            expression: randomElement([...EYE_EXPRESSIONS])!,
            secondaryColor: isHeterochromia ? randomElement([...EYE_COLORS].filter(c => c.id !== 'heterochromia'))! : undefined,
        };

        const skin = {
            tone: randomElement([...SKIN_TONES])!,
            texture: randomElement([...SKIN_TEXTURES])!,
            condition: '正常',
        };

        const facialFeatureCount = randomInt(1, 2);
        const facialFeatures: ItemDef[] = [];
        const availableFeatures = [...FACIAL_FEATURES];

        for (let i = 0; i < facialFeatureCount; i++) {
            if (availableFeatures.length === 0) break;
            const index = Math.floor(Math.random() * availableFeatures.length);
            const feature = availableFeatures[index];
            facialFeatures.push(feature);
            availableFeatures.splice(index, 1);
        }

        const birthmark = randomElement([...BIRTHMARKS])!;

        const bodyMarks: ItemDef[] = [];
        if (Math.random() < 0.2) {
            bodyMarks.push(randomElement([...BODY_MARKS])!);
        } else {
            bodyMarks.push({ id: 'none', name: '无' });
        }

        return {
            hair,
            eyes,
            skin,
            features: {
                facialFeatures,
                birthmark,
                bodyMarks
            }
        };
    }

    generateClothing(): ClothingState {
        const pickRandom = <T extends { id: string }>(list: readonly T[], noneChance: number = 0): T => {
            if (Math.random() < noneChance) {
                const noneItem = list.find(i => i.id === 'none');
                if (noneItem) return noneItem;
            }
            const valid = list.filter(i => i.id !== 'none');
            return valid[Math.floor(Math.random() * valid.length)];
        };

        const pickAttr = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

        const topType = pickRandom(TOP_TYPES, 0.05);
        const topColor = pickAttr(TOP_COLORS);
        const topMaterial = pickAttr(TOP_MATERIALS);

        const bottomType = pickRandom(BOTTOM_TYPES, 0.1);
        const bottomColor = pickAttr(BOTTOM_COLORS);
        const bottomMaterial = pickAttr(BOTTOM_MATERIALS);

        const braType = pickRandom(BRA_TYPES, 0.2);
        const braColor = pickAttr(BRA_COLORS);
        const braMaterial = pickAttr(BRA_MATERIALS);

        const pantyType = pickRandom(PANTY_TYPES, 0.2);
        const pantyColor = pickAttr(PANTY_COLORS);
        const pantyMaterial = pickAttr(PANTY_MATERIALS);

        const stockingType = pickRandom(STOCKING_TYPES, 0.4);
        const stockingColor = pickAttr(STOCKING_COLORS);
        const stockingMaterial = pickAttr(STOCKING_MATERIALS);

        const undershirtType = pickRandom(UNDERSHIRT_TYPES, 0.6);
        const undershirtColor = pickAttr(UNDERSHIRT_COLORS);
        const undershirtMaterial = pickAttr(UNDERSHIRT_MATERIALS);

        const underpantsType = pickRandom(UNDERPANTS_TYPES, 0.6);
        const underpantsColor = pickAttr(UNDERPANTS_COLORS);
        const underpantsMaterial = pickAttr(UNDERPANTS_MATERIALS);

        const shoeType = pickRandom(SHOE_TYPES, 0.1);
        const shoeColor = pickAttr(SHOE_COLORS);
        const shoeMaterial = pickAttr(SHOE_MATERIALS);

        const gloveType = pickRandom(GLOVE_TYPES, 0.7);
        const gloveColor = pickAttr(GLOVE_COLORS);
        const gloveMaterial = pickAttr(GLOVE_MATERIALS);

        const accessories: ClothingState['accessories'] = [];
        const accessoryCount = randomInt(0, 3);
        const usedTypes = new Set<string>();

        for (let i = 0; i < accessoryCount; i++) {
            const typeDef = randomElement([...ACCESSORY_TYPES]);
            if (typeDef && !usedTypes.has(typeDef.id)) {
                usedTypes.add(typeDef.id);
                accessories.push({
                    type: typeDef,
                    color: pickAttr(ACCESSORY_COLORS),
                    material: pickAttr(ACCESSORY_MATERIALS),
                    isRemovable: true,
                    isVisible: true,
                });
            }
        }

        // 动态计算着装层级
        let dressLevel: DressLevel = 'fully_dressed';
        const hasTop = topType.id !== 'none';
        const hasBottom = bottomType.id !== 'none';
        const hasBra = braType.id !== 'none';
        const hasPanties = pantyType.id !== 'none';

        if (!hasTop && !hasBottom && !hasBra && !hasPanties) {
            dressLevel = 'naked';
        } else if (!hasTop && !hasBottom) {
            dressLevel = 'underwear_only';
        } else if (!hasTop || !hasBottom) {
            dressLevel = 'partially_dressed';
        }

        return {
            intimate: {
                bra: { type: braType, color: braColor, material: braMaterial },
                panties: { type: pantyType, color: pantyColor, material: pantyMaterial },
            },
            undergarment: {
                stockings: { type: stockingType, color: stockingColor, material: stockingMaterial },
                undershirt: { type: undershirtType, color: undershirtColor, material: undershirtMaterial },
                underpants: { type: underpantsType, color: underpantsColor, material: underpantsMaterial },
            },
            outerwear: {
                top: { type: topType, color: topColor, material: topMaterial },
                bottom: { type: bottomType, color: bottomColor, material: bottomMaterial },
                gloves: { type: gloveType, color: gloveColor, material: gloveMaterial },
                shoes: { type: shoeType, color: shoeColor, material: shoeMaterial },
            },
            accessories,
            state: 'intact',
            dressLevel,
        };
    }

    generateDescription(physical: PhysicalStats, clothing: ClothingState, appearance: AppearanceData): string {
        const app = appearance;
        const parts: string[] = [];

        parts.push(`${app.hair.color.id} ${app.hair.length.id} ${app.hair.style.id} hair`);

        const eyeDesc = app.eyes.secondaryColor
            ? `heterochromia eyes (${app.eyes.color.id}/${app.eyes.secondaryColor.id})`
            : `${app.eyes.color.id} ${app.eyes.shape.id} eyes`;
        parts.push(eyeDesc);

        parts.push(`${app.skin.tone.id} skin`);
        parts.push(`${physical.bodyType} figure`);

        const top = clothing.outerwear.top;
        if (top.type.id !== 'none') {
            const topDesc = [top.color?.id, top.material?.id, top.type.id].filter(Boolean).join(' ');
            parts.push(`wearing ${topDesc}`);
        }

        const visibleAcc = clothing.accessories.filter(a => a.isVisible !== false).slice(0, 2);
        if (visibleAcc.length > 0) {
            parts.push(visibleAcc.map(a => a.type.id).join(', '));
        }

        return parts.join(', ');
    }

    /**
     * 生成人格。
     *
     * 只产出权威字段：25 个子维度与过程平面的可变状态。维度、元因子、构型、
     * 代理与行为权重都是派生值，读取时由纯函数算出，不入库（见 `normalizeIsshex`）。
     */
    generateISShexPersonality(gameTimePassed: number): ISShexPersonality {
        const facets = generateHexacoFacets();

        return {
            facets,
            dynamics: {
                discrepancyLoad: 0,
                deviationSquared: 0,
                lastDriftTime: gameTimePassed,
            },
        };
    }

    generateAttributes(isshex: ISShexPersonality): CharacterAttributes {
        const view = new PersonalityView(isshex);
        const { C, E } = view.domains;

        const sanityBase = 70 + Math.floor(Math.random() * 30);
        const sanityMod = C * 2 - E;

        const obedienceBase = 30 + Math.floor(Math.random() * 20);
        const obedienceMod = view.weights.obedienceBase;

        const lustBase = 5 + Math.floor(Math.random() * 15);
        const lustMod = (view.weights.lustSensitivity - 0.5) * 20;

        const stressBase = 20 + Math.floor(Math.random() * 30);
        const stressMod = isshex.facets.anxiety * 3;

        return {
            sanity: Math.round(Math.max(0, Math.min(100, sanityBase + sanityMod))),
            obedience: Math.round(Math.max(0, Math.min(100, obedienceBase + obedienceMod))),
            lust: Math.round(Math.max(0, Math.min(100, lustBase + lustMod))),
            stress: Math.round(Math.max(0, Math.min(100, stressBase + stressMod))),
            corruption: Math.floor(Math.random() * 10),
            devotion: Math.floor(Math.random() * 5),
            hunger: 20 + Math.floor(Math.random() * 30),
            fatigue: 20 + Math.floor(Math.random() * 30),
            hygiene: 60 + Math.floor(Math.random() * 40),
        };
    }

    generatePhysiology(): PhysiologicalState {
        const cycleDay = 1 + Math.floor(Math.random() * 28);
        return {
            fertility: 50 + Math.floor(Math.random() * 50),
            cycleDay,
            isOvulating: cycleDay >= 12 && cycleDay <= 16,
            sensitivityMultiplier: 0.8 + Math.random() * 0.4,
            health: 80 + Math.floor(Math.random() * 20),
            pregnancy: null,
        };
    }

    generateBehavior(gameTimePassed: number): BehaviorState {
        return {
            currentActivity: 'wandering',
            activityStartTime: gameTimePassed,
            activityDuration: 30 * 60 * 1000,
            lastInteractionTime: 0,
            previousActivity: undefined,
            socialContext: undefined,
        };
    }

    generateProfile(): PersonalityProfile {
        const traits = [
            randomElement(POSITIVE_TRAITS)!,
            randomElement(NEGATIVE_TRAITS)!
        ];

        if (Math.random() < 0.3) {
            const extra = Math.random() > 0.5 ? randomElement(POSITIVE_TRAITS)! : randomElement(NEGATIVE_TRAITS)!;
            if (!traits.includes(extra)) traits.push(extra);
        }

        return {
            traits,
            hobbies: [randomElement(HOBBIES)!],
            dislikes: [randomElement(DISLIKES)!],
            copingMechanism: randomElement(COPING_MECHANISMS)!,
            fetish: Math.random() < 0.4 ? randomElement(FETISHES)! : undefined,
        };
    }

    generateAgeData(arrivalTimestamp: number, gameTimePassed: number): { age: number; initialAgeMs: number; boardingAge: string } {
        const ageYears = randomInt(GAME_CONFIG.MAIDEN_AGE.MIN, GAME_CONFIG.MAIDEN_AGE.MAX);
        const now = gameTimePassed;
        const msPerYear = TIME_CONFIG.MS_PER_YEAR;
        const initialAgeMs = (ageYears * msPerYear) + randomInt(0, msPerYear);
        const timeOnTrain = Math.max(0, now - arrivalTimestamp);
        const boardingAgeMs = Math.max(0, initialAgeMs - timeOnTrain);
        const boardingAge = formatPreciseAge(boardingAgeMs);

        return {
            age: ageYears,
            initialAgeMs,
            boardingAge
        };
    }
}

// 少女行为决策 - 需求计算与行为选择
// Maiden Behavior - Need calculation & behavior decisions
// 基于 IS-SHEX 六维层级人格模型

/**
 * 情境的主激活维度。
 *
 * 只保留被读取的 `primary`：v1 的同名表还带 `secondary` 与 `description`，
 * 但增益计算只用到主维度，那两个字段是零读取的死数据，留着会让读者以为
 * 次维度参与了激活。
 */
const SITUATION_PRIMARY_DOMAIN: Record<SituationType, keyof HexacoProfile> = {
    threat: 'E',
    opportunity: 'X',
    task: 'C',
    intimate: 'E',
    competition: 'X',
    ambiguous: 'O',
};

/** 心境对行为倾向的概率修正 */
const MOOD_BEHAVIOR_MODIFIERS: Record<MoodState, {
    socialChance: number;      // 社交概率修正
    moveChance: number;        // 移动概率修正
    restPreference: number;    // 休息偏好
}> = {
    'content': { socialChance: 1.0, moveChance: 1.0, restPreference: 1.0 },
    'anxious': { socialChance: 0.6, moveChance: 1.5, restPreference: 0.5 },
    'melancholy': { socialChance: 0.4, moveChance: 0.5, restPreference: 1.5 },
    'irritable': { socialChance: 0.7, moveChance: 1.2, restPreference: 0.8 },
    'lustful': { socialChance: 1.5, moveChance: 1.3, restPreference: 0.3 },
    'fearful': { socialChance: 1.2, moveChance: 0.3, restPreference: 0.5 },
    'euphoric': { socialChance: 1.8, moveChance: 1.0, restPreference: 0.5 },
    'numb': { socialChance: 0.2, moveChance: 0.3, restPreference: 1.0 },
};

/** 车厢类型到情境类型的映射 */
const CARRIAGE_SITUATION_MAP: Record<CarriageType, SituationType> = {    // 圣所
    'POOLS': 'intimate',
    'ATRIUM': 'opportunity',
    'VEIL': 'intimate',
    'CONFESSIONAL': 'task',
    'ARCHIVE': 'ambiguous',
    'MUSE_THEATRE': 'competition',
    'SCALES_CONSERVATORY': 'competition',
    'GARDEN': 'opportunity',
    'NURSERY': 'intimate',
    'ALTAR': 'task',
    'CAULDRON': 'threat',
    'DORMITORY': 'intimate',
    'BANQUET': 'task',
    'BABEL_FOUNDRY': 'task',
    'MARIONETTE_ATELIER': 'task',
    'LOOM_OF_ATONEMENT': 'task',
    'AUCTION_OF_GRACE': 'competition',
    'RELIQUARY_OF_MOLTING': 'ambiguous',
    // 深渊
    'SILENT_SALON': 'ambiguous',
    'ORACLE_WHISPER': 'ambiguous',
    'NEGATIVE_GALLERY': 'ambiguous',
    'ESCHER_STAIRS': 'threat',
    'MIRROR_HALL': 'threat',
    'TIME_INFIRMARY': 'threat',
    'DISSOLUTION_CHAMBER': 'threat',
    'FLESH_HIVE': 'threat',
    'INVERTED_TREE': 'threat',
    'SYMBIOTIC_GALLERY': 'threat',
    'VOID_WINDOW': 'threat',
    'ENTROPY_CLOCK': 'threat',
    'SUBMERGED_OPERA': 'threat',
    'BRAILLE_CORRIDOR': 'ambiguous',
    'INVERTED_COURTYARD': 'threat',
    'QUANTUM_AMPHITHEATRE': 'threat',
    'RETROGRADE_TEA_PARTY': 'threat',
    'STATION_OF_UNBIRTH': 'threat',
    'NON_EUCLIDEAN_SHRINE': 'threat',
    'LIBRARY_OF_PERMUTATIONS': 'threat',
    'NEBULA_WOMB': 'threat',
};

/**
 * 车厢类型到情境强度的映射 ς ∈ [0,1]（§4.1 参考值）。
 *
 * 强度高表示规范清晰、后果严重、被问责、行动受限——个体差异被压缩；
 * 强度低则状态由特质主导。这与"车厢越危险越强"不是一回事：深渊车厢的规范
 * 恰恰是最模糊的，真正的强情境是祭坛与被监督的公共空间。
 */
const SITUATION_STRENGTH: Record<CarriageType, number> = {
    // 圣所：公共、有明确规约
    'ALTAR': 0.65,
    'CONFESSIONAL': 0.6,
    'MUSE_THEATRE': 0.6,
    'SCALES_CONSERVATORY': 0.55,
    'NURSERY': 0.45,
    'POOLS': 0.3,
    'VEIL': 0.3,
    'ATRIUM': 0.25,
    'GARDEN': 0.2,
    'ARCHIVE': 0.2,
    'DORMITORY': 0.2,
    'BANQUET': 0.6,
    'BABEL_FOUNDRY': 0.6,
    'MARIONETTE_ATELIER': 0.65,
    'LOOM_OF_ATONEMENT': 0.5,
    'AUCTION_OF_GRACE': 0.55,
    'RELIQUARY_OF_MOLTING': 0.45,
    // 深渊：规范失效，但后果严重——取中等强度
    'CAULDRON': 0.7,
    'ESCHER_STAIRS': 0.6,
    'MIRROR_HALL': 0.6,
    'TIME_INFIRMARY': 0.65,
    'DISSOLUTION_CHAMBER': 0.7,
    'FLESH_HIVE': 0.65,
    'INVERTED_TREE': 0.6,
    'SYMBIOTIC_GALLERY': 0.55,
    'VOID_WINDOW': 0.75,
    'ENTROPY_CLOCK': 0.7,
    'SILENT_SALON': 0.4,
    'ORACLE_WHISPER': 0.45,
    'NEGATIVE_GALLERY': 0.35,
    'SUBMERGED_OPERA': 0.55,
    'BRAILLE_CORRIDOR': 0.45,
    'INVERTED_COURTYARD': 0.5,
    'QUANTUM_AMPHITHEATRE': 0.65,
    'RETROGRADE_TEA_PARTY': 0.6,
    'STATION_OF_UNBIRTH': 0.5,
    'NON_EUCLIDEAN_SHRINE': 0.7,
    'LIBRARY_OF_PERMUTATIONS': 0.6,
    'NEBULA_WOMB': 0.55,
};

/** 各活动提供的恢复性生态位可及度 N ∈ [0,1]（§4.2），未列出的活动取低位 */
const RESTORATIVE_ACCESS: Partial<Record<ActivityStatus, number>> = {
    'sleeping': 1.0,
    'bathing': 0.8,
    'confessing': 0.7,
    'eating': 0.4,
    'chatting': 0.5,
    'wandering': 0.3,
};

/**
 * 行为决策子系统：把需求、人格与情境折算为下一次活动或移动意图。
 * 移动中的实体不重新决策，否则会在抵达前反复改写路径。
 */
class MaidenBehavior {

    /**
     * 情境的特质激活增益 g_jt（§4.1）：`g = 1 + κ·(r − 0.5)`。
     *
     * 增益取决于**线索相关度**（该情境是否与这个特质有关），而不是特质有多极端。
     * v1 用的是 `0.85 + |trait − 50|·0.008`：与线索无关，任何极端特质在
     * 任何情境下都被放大，这不是特质激活。
     */
    private getTraitActivationMultiplier(situation: SituationType): number {
        const domain = SITUATION_PRIMARY_DOMAIN[situation];
        return 1 + TRAIT_ACTIVATION_GAIN * (domainCueRelevance(situation, domain) - 0.5);
    }

    /** 计算需求优先级（基于 IS-SHEX 人格与当前情境），按紧迫度降序 */
    calculateNeedPriorities(
        maiden: Maiden,
        gameTime: number,
        currentCarriage?: Carriage
    ): { need: string; urgency: number; activity: ActivityStatus; targetType: CarriageType }[] {
        const { attributes: a, physiology } = maiden;
        const view = personalityView(maiden);
        const weights = view.weights;
        const facets = maiden.isshex.facets;
        const domains = view.domains;
        const needs: { need: string; urgency: number; activity: ActivityStatus; targetType: CarriageType }[] = [];

        const situation: SituationType = currentCarriage ? CARRIAGE_SITUATION_MAP[currentCarriage.type] : 'ambiguous';
        const traitMod = this.getTraitActivationMultiplier(situation);

        // 疲劳需求 - 睡眠
        if (a.fatigue > NEED_THRESHOLDS.LOW) {
            let urgency = a.fatigue;
            if (a.fatigue > NEED_THRESHOLDS.CRITICAL) urgency += 50;
            urgency *= (1 + domains.C * 0.1);

            if (situation === 'task') urgency *= (0.8 / traitMod);
            if (situation === 'threat') urgency *= (1.2 * traitMod);

            needs.push({ need: 'sleep', urgency, activity: 'sleeping', targetType: 'ATRIUM' });
        }

        // 饥饿需求 - 进食
        if (a.hunger > NEED_THRESHOLDS.LOW) {
            let urgency = a.hunger;
            if (a.hunger > NEED_THRESHOLDS.CRITICAL) urgency += 50;
            needs.push({ need: 'eat', urgency, activity: 'eating', targetType: 'ATRIUM' });
        }

        // 清洁需求 - 沐浴
        if (a.hygiene < 100 - NEED_THRESHOLDS.LOW) {
            let urgency = 100 - a.hygiene;
            if (a.hygiene < 100 - NEED_THRESHOLDS.HIGH) urgency += 20;
            urgency *= (1 + facets.organization * 0.15);
            urgency *= (1 + facets.aestheticAppreciation * 0.1);

            if (situation === 'intimate') urgency *= 1.3;

            needs.push({ need: 'bathe', urgency, activity: 'bathing', targetType: 'POOLS' });
        }

        // 压力需求 - 休憩/祈祷
        if (a.stress > NEED_THRESHOLDS.MODERATE) {
            let urgency = a.stress * (1 / weights.stressResistance);

            if (situation === 'threat') urgency *= (1.4 * traitMod);
            if (situation === 'competition') urgency *= 1.2;

            if (weights.devotionTendency > 0.5) {
                needs.push({ need: 'pray', urgency: urgency * 1.5, activity: 'confessing', targetType: 'ALTAR' });
            } else if (facets.fearfulness > 1.0 && domains.X < -0.5) {
                needs.push({ need: 'hide', urgency: urgency * 1.2, activity: 'wandering', targetType: 'GARDEN' });
            } else {
                needs.push({ need: 'relax', urgency, activity: 'wandering', targetType: 'GARDEN' });
            }
        }

        // 欲望需求
        if (a.lust > NEED_THRESHOLDS.MODERATE * (1 / weights.lustSensitivity)) {
            let urgency = a.lust * weights.lustSensitivity;

            if (domains.O > 1.0 && facets.prudence < -1.0) {
                needs.push({ need: 'indulge', urgency: urgency * 1.5, activity: 'wandering', targetType: 'VEIL' });
            } else if (domains.H > 1.0) {
                needs.push({ need: 'confess', urgency: urgency * 1.2, activity: 'confessing', targetType: 'CONFESSIONAL' });
            } else if (domains.A < -1.0 && domains.H < -1.0) {
                needs.push({ need: 'submit', urgency, activity: 'wandering', targetType: 'VEIL' });
            }
        }

        // 社交需求
        const timeSinceInteraction = maiden.behavior.lastInteractionTime > 0
            ? Math.min(30, (gameTime - maiden.behavior.lastInteractionTime) / 60000)
            : 20;
        let socialNeed = weights.socialSeek * 80 - timeSinceInteraction;

        if (situation === 'opportunity') socialNeed *= (1.2 * traitMod);
        if (situation === 'intimate') socialNeed *= 1.1;

        if (socialNeed > 20) {
            needs.push({ need: 'socialize', urgency: socialNeed, activity: 'chatting', targetType: 'ATRIUM' });
        }

        // 独处需求
        const solitudeNeed = weights.solitudeSeek * 60;
        if (solitudeNeed > 25 && a.stress > 40) {
            needs.push({ need: 'solitude', urgency: solitudeNeed, activity: 'wandering', targetType: 'ARCHIVE' });
        }

        // 虔诚需求
        if (weights.devotionTendency > 0.6 && a.devotion > 30) {
            needs.push({ need: 'worship', urgency: a.devotion * 0.8, activity: 'confessing', targetType: 'ALTAR' });
        }

        // 怀孕特殊需求
        if (physiology.pregnancy && physiology.pregnancy.stage !== 'none') {
            const pregnancyFatigue = physiology.pregnancy.weekNumber * 2;
            needs.push({ need: 'rest', urgency: 50 + pregnancyFatigue, activity: 'sleeping', targetType: 'NURSERY' });
        }

        return needs.sort((a, b) => b.urgency - a.urgency);
    }

    decideMaidenBehavior(
        maiden: Maiden,
        currentCarriage: Carriage,
        allCarriages: Map<string, Carriage>,
        allMaidens: Map<string, Maiden>,
        gameTimePassed: number
    ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
        const behavior = { ...maiden.behavior };
        const now = gameTimePassed;
        const attrs = maiden.attributes;

        const moodMod = MOOD_BEHAVIOR_MODIFIERS[maiden.mood];

        // 意图锁定：正在移动中的实体不允许中断当前轨迹规划
        if (maiden.movement.isMoving) {
            return { behavior };
        }

        const timeElapsed = now - behavior.activityStartTime;
        const isEmergency = attrs.hunger > NEED_THRESHOLDS.CRITICAL ||
            attrs.fatigue > NEED_THRESHOLDS.CRITICAL ||
            attrs.sanity < 20;

        const adjustedDuration = behavior.activityDuration * moodMod.restPreference;

        if (timeElapsed < adjustedDuration && !isEmergency) {
            return { behavior };
        }

        const needs = this.calculateNeedPriorities(maiden, gameTimePassed, currentCarriage);
        const isNight = isRestTime(gameTimePassed);
        const carriageFunc = CARRIAGE_FUNCTIONS[currentCarriage.type];
        const situation = CARRIAGE_SITUATION_MAP[currentCarriage.type];

        // 威胁应激与状态崩溃校验：极端偏离个人基线时进入惊恐
        if (attrs.sanity < 20 ||
            personalityView(maiden).state === 'extreme' ||
            (situation === 'threat' && attrs.sanity < 35 && Math.random() < 0.25)) {
            return this.createPanicBehavior(maiden, currentCarriage, allCarriages, behavior, gameTimePassed);
        }

        // 深渊观测强引力校验
        if (currentCarriage.category !== 'abyss' && !isNight) {
            const observeAction = this.checkForAbyssObservation(maiden, currentCarriage, allCarriages, behavior, gameTimePassed);
            if (observeAction) {
                return observeAction;
            }
        }

        // 周期性夜间强制休眠指令
        if (isNight && attrs.fatigue > 40) {
            if (carriageFunc.canSleep) {
                return {
                    behavior: this.createActivityBehavior(
                        'sleeping',
                        GAME_CONFIG.DURATIONS.SLEEP,
                        behavior,
                        gameTimePassed
                    )
                };
            }
            const sleepCarriageId = findNearestCarriageByFunction(currentCarriage, allCarriages, 'canSleep');
            if (sleepCarriageId) {
                return this.executeMovement(maiden, sleepCarriageId, 'sleeping', allCarriages, gameTimePassed);
            }
        }

        // 需求满足逻辑树
        if (needs.length > 0) {
            const topNeed = needs[0];

            if (this.canSatisfyNeed(currentCarriage, topNeed.need)) {
                return {
                    behavior: this.createActivityBehavior(
                        topNeed.activity,
                        this.getDurationForActivity(topNeed.activity),
                        behavior,
                        gameTimePassed
                    )
                };
            }

            const targetCarriageId = findNearestCarriageByType(
                currentCarriage,
                allCarriages,
                topNeed.targetType
            );

            if (targetCarriageId && targetCarriageId !== currentCarriage.id) {
                return this.executeMovement(maiden, targetCarriageId, topNeed.activity, allCarriages, gameTimePassed);
            }
        }

        // 默认空闲状态巡游
        return this.createDefaultBehavior(maiden, currentCarriage, allCarriages, allMaidens, behavior, gameTimePassed, moodMod);
    }

    private checkForAbyssObservation(
        maiden: Maiden,
        currentCarriage: Carriage,
        allCarriages: Map<string, Carriage>,
        behavior: BehaviorState,
        gameTimePassed: number
    ): { behavior: BehaviorState; movement?: UnifiedMovementState } | null {
        const currentId = getCurrentCarriageId(maiden);
        const coords = parseCarriageId(currentId);
        if (!coords) return null;

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let adjacentAbyssId: string | null = null;

        for (const [dr, dc] of directions) {
            const nr = coords.row + dr;
            const nc = coords.col + dc;
            const neighborId = makeCarriageId(nr, nc);
            const neighbor = allCarriages.get(neighborId);

            if (neighbor && neighbor.category === 'abyss') {
                adjacentAbyssId = neighborId;
                break;
            }
        }

        if (!adjacentAbyssId) return null;

        const attrs = maiden.attributes;
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;
        const weights = view.weights;

        let peekChance = 0.05;

        if (attrs.sanity < 50) peekChance += 0.1;
        if (attrs.sanity < 30) peekChance += 0.2;
        if (attrs.corruption > 40) peekChance += 0.1;
        if (attrs.corruption > 70) peekChance += 0.15;
        if (attrs.stress > 80) peekChance += 0.1;

        peekChance *= (1 + view.domains.O * 0.01 * 10);
        peekChance *= (1 - facets.fearfulness * 0.008 * 10);
        peekChance *= (1 + weights.riskTolerance * 0.5);
        // 冷酷冲动（低恐惧/低感伤/低审慎）者对深渊的吸引力更强；代理仅用于此处的倾向修正
        peekChance *= (1 + view.proxies.psychopathy * 0.005 * 10);

        if (maiden.status.includes('voyeur')) peekChance += 0.2;

        const clampedPeekChance = Math.min(1, Math.max(0, peekChance));
        if (Math.random() < clampedPeekChance) {
            return {
                behavior: this.createActivityBehavior('observing', 10, behavior, gameTimePassed)
            };
        }

        return null;
    }

    private createPanicBehavior(
        maiden: Maiden,
        currentCarriage: Carriage,
        allCarriages: Map<string, Carriage>,
        behavior: BehaviorState,
        gameTimePassed: number
    ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;
        const weights = view.weights;

        if (facets.fearfulness > 1.0 && view.domains.X < -0.5) {
            return { behavior: this.createActivityBehavior('wandering', 10, behavior, gameTimePassed) };
        }
        else if (weights.devotionTendency > 0.6) {
            const altar = findNearestCarriageByType(currentCarriage, allCarriages, 'ALTAR');
            if (altar) return this.executeMovement(maiden, altar, 'confessing', allCarriages, gameTimePassed);
        }
        else if (view.domains.X > 0 && facets.fearfulness < 0) {
            const safeCarriages = Array.from(allCarriages.values())
                .filter(c => c.category !== 'abyss' && c.isAccessible);
            if (safeCarriages.length > 0) {
                const target = safeCarriages[Math.floor(Math.random() * safeCarriages.length)];
                return this.executeMovement(maiden, target.id, 'wandering', allCarriages, gameTimePassed);
            }
        }

        const garden = findNearestCarriageByType(currentCarriage, allCarriages, 'GARDEN');
        if (garden) {
            return this.executeMovement(maiden, garden, 'wandering', allCarriages, gameTimePassed);
        }

        return { behavior: this.createActivityBehavior('wandering', 5, behavior, gameTimePassed) };
    }

    private createDefaultBehavior(
        maiden: Maiden,
        currentCarriage: Carriage,
        allCarriages: Map<string, Carriage>,
        allMaidens: Map<string, Maiden>,
        behavior: BehaviorState,
        gameTimePassed: number,
        moodMod: typeof MOOD_BEHAVIOR_MODIFIERS[MoodState]
    ): { behavior: BehaviorState; movement?: UnifiedMovementState } {
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;
        const domains = view.domains;
        const weights = view.weights;
        const rand = Math.random();

        if (weights.devotionTendency > 0.6 && rand < 0.4) {
            const altar = findNearestCarriageByType(currentCarriage, allCarriages, 'ALTAR');
            if (altar && altar !== currentCarriage.id) {
                return this.executeMovement(maiden, altar, 'confessing', allCarriages, gameTimePassed);
            }
        }
        else if (domains.O > 1.0 && facets.liveliness > 0.5 && rand < 0.4) {
            const targets: CarriageType[] = ['POOLS', 'VEIL', 'ATRIUM'];
            const targetType = targets[Math.floor(Math.random() * targets.length)];
            const carriage = findNearestCarriageByType(currentCarriage, allCarriages, targetType);
            if (carriage && carriage !== currentCarriage.id) {
                return this.executeMovement(maiden, carriage, 'wandering', allCarriages, gameTimePassed);
            }
        }
        else if (domains.X < -0.5 && facets.inquisitiveness > 0.5 && rand < 0.3) {
            const archive = findNearestCarriageByType(currentCarriage, allCarriages, 'ARCHIVE');
            if (archive && archive !== currentCarriage.id) {
                return this.executeMovement(maiden, archive, 'wandering', allCarriages, gameTimePassed);
            }
        }
        else if (facets.dependence > 0.5 && facets.fearfulness > 0 && rand < 0.3) {
            const crowdedSafe = this.findCrowdedSafeCarriage(allCarriages);
            if (crowdedSafe && crowdedSafe !== currentCarriage.id) {
                return this.executeMovement(maiden, crowdedSafe, 'wandering', allCarriages, gameTimePassed);
            }
        }
        else if (weights.riskTolerance > 0.5 && facets.fearfulness < -1.0 && rand < 0.15) {
            const abyssEdge = this.findSafeAbyssCarriage(allCarriages);
            if (abyssEdge && abyssEdge !== currentCarriage.id) {
                return this.executeMovement(maiden, abyssEdge, 'wandering', allCarriages, gameTimePassed);
            }
        }

        const socialChance = weights.socialSeek * moodMod.socialChance;
        if (rand < socialChance && currentCarriage.occupants.length > 1) {
            return { behavior: this.createActivityBehavior('chatting', 20, behavior, gameTimePassed) };
        }

        const safeTypes: CarriageType[] = ['ATRIUM', 'GARDEN', 'POOLS'];
        const targetType = safeTypes[Math.floor(Math.random() * safeTypes.length)];
        const target = findNearestCarriageByType(currentCarriage, allCarriages, targetType);

        const moveChance = 0.3 * moodMod.moveChance;
        if (target && target !== currentCarriage.id && Math.random() < moveChance) {
            return this.executeMovement(maiden, target, 'wandering', allCarriages, gameTimePassed);
        }

        return { behavior: this.createActivityBehavior('wandering', 15, behavior, gameTimePassed) };
    }

    private createActivityBehavior(
        activity: ActivityStatus,
        durationMinutes: number,
        oldBehavior: BehaviorState,
        gameTime: number
    ): BehaviorState {
        const variance = GAME_CONFIG.DURATIONS.DURATION_VARIANCE;
        const actualDuration = durationMinutes * (1 - variance / 2 + Math.random() * variance);

        // 社交上下文状态清理，保证孤立活动不留存脏数据
        const isSocialActivity = activity === 'chatting';

        return {
            currentActivity: activity,
            activityStartTime: gameTime,
            activityDuration: actualDuration * 60 * 1000,
            lastInteractionTime: oldBehavior.lastInteractionTime,
            previousActivity: oldBehavior.currentActivity,
            socialContext: isSocialActivity ? oldBehavior.socialContext : undefined,
        };
    }

    private executeMovement(
        maiden: Maiden,
        targetCarriageId: string,
        intendedActivity: ActivityStatus,
        allCarriages: Map<string, Carriage>,
        gameTime: number
    ): { behavior: BehaviorState; movement: UnifiedMovementState } {
        const currentId = getCurrentCarriageId(maiden);
        const movementPath = this.findPath(currentId, targetCarriageId, allCarriages);

        const movement = startMovement(maiden.movement, targetCarriageId, intendedActivity, movementPath);

        // 在抵达意图前处于默认的游荡状态机中
        const behavior = this.createActivityBehavior('wandering', 5, maiden.behavior, gameTime);

        return { behavior, movement };
    }

    /**
     * BFS 网格寻路，返回**不含起点**的剩余跳数。
     * 只走 `isAccessible` 的车厢；无路径或坐标非法时退化为"直达目标"，
     * 这样移动仍会推进（可被后续 tick 纠正），而不是把实体卡死在原地。
     */
    private findPath(
        startCarriageId: string,
        targetCarriageId: string,
        allCarriages: Map<string, Carriage>
    ): string[] {
        if (startCarriageId === targetCarriageId) {
            return [];
        }

        const start = parseCarriageId(startCarriageId);
        const target = parseCarriageId(targetCarriageId);

        if (!start || !target) {
            return [targetCarriageId];
        }

        const visited = new Set<string>([startCarriageId]);
        const queue: { id: string; path: string[] }[] = [{ id: startCarriageId, path: [] }];

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (queue.length > 0) {
            const current = queue.shift()!;

            if (current.id === targetCarriageId) {
                return current.path;
            }

            const currentPos = parseCarriageId(current.id);
            if (!currentPos) continue;

            for (const [dr, dc] of directions) {
                const nr = currentPos.row + dr;
                const nc = currentPos.col + dc;
                const neighborId = makeCarriageId(nr, nc);

                if (visited.has(neighborId)) continue;

                const neighbor = allCarriages.get(neighborId);
                if (neighbor && neighbor.isAccessible) {
                    visited.add(neighborId);
                    queue.push({
                        id: neighborId,
                        path: [...current.path, neighborId]
                    });
                }
            }
        }

        return [targetCarriageId];
    }

    private canSatisfyNeed(carriage: Carriage, need: string): boolean {
        const func = CARRIAGE_FUNCTIONS[carriage.type];
        switch (need) {
            case 'sleep': case 'rest': return func.canSleep;
            case 'eat': return func.canEat;
            case 'bathe': return func.canBathe;
            case 'pray': case 'worship': case 'confess': return func.canPray;
            case 'socialize': return func.canSocialize && carriage.category !== 'abyss';
            case 'solitude': return !func.canSocialize || carriage.occupants.length <= 1;
            default: return true;
        }
    }

    private findCrowdedSafeCarriage(allCarriages: Map<string, Carriage>): string | null {
        let best: string | null = null;
        let maxOccupants = 2;

        for (const [id, c] of allCarriages) {
            if (c.category === 'abyss' || !c.isAccessible) continue;
            if (c.occupants.length > maxOccupants) {
                maxOccupants = c.occupants.length;
                best = id;
            }
        }
        return best;
    }

    private findSafeAbyssCarriage(allCarriages: Map<string, Carriage>): string | null {
        const tier1Abyss = [
            'SILENT_SALON',
            'ORACLE_WHISPER',
            'NEGATIVE_GALLERY',
        ];

        for (const [id, c] of allCarriages) {
            if (c.isAccessible && tier1Abyss.includes(c.type)) {
                return id;
            }
        }
        return null;
    }

    /**
     * 活动对应的计划时长（游戏分钟）。
     * 取值始终来自 GAME_CONFIG.DURATIONS，未列出的活动回落到游荡时长。
     */
    getDurationForActivity(activity: ActivityStatus): number {
        const { DURATIONS } = GAME_CONFIG;
        switch (activity) {
            case 'sleeping': return DURATIONS.SLEEP;
            case 'eating': return DURATIONS.EAT;
            case 'bathing': return DURATIONS.BATH;
            case 'confessing': return DURATIONS.CONFESS;
            case 'chatting': return 20;
            case 'observing': return 10;
            default: return DURATIONS.WANDER;
        }
    }
}

// 情绪与自发行为

// 少女情绪系统 - 情绪计算与自发行为
// Maiden Mood System - Mood calculation & spontaneous actions
// 基于 IS-SHEX 六维层级人格模型

// 情绪对行为的影响权重
const SPONTANEOUS_ACTION_CONFIG: Record<SpontaneousAction, {
    triggerCondition: (attrs: { sanity: number; stress: number; lust: number; devotion: number; fatigue: number }) => boolean;
    probability: number;  // 基础触发概率
    descriptions: string[];
}> = {
    'daydream': {
        triggerCondition: (a) => a.fatigue > 40 && a.stress < 50,
        probability: 0.08,
        descriptions: ['眼神变得迷离，似乎陷入了回忆', '目光空洞地望向远方', '嘴角微微上扬，沉浸在某个遥远的记忆中'],
    },
    'stretch': {
        triggerCondition: (a) => a.fatigue > 30,
        probability: 0.05,
        descriptions: ['伸了个懒腰', '舒展了一下僵硬的身体', '轻轻活动着肩膀'],
    },
    'sigh': {
        triggerCondition: (a) => a.stress > 40 || a.sanity < 60,
        probability: 0.1,
        descriptions: ['轻轻叹了口气', '发出一声几不可闻的叹息', '深深地呼出一口气'],
    },
    'hum': {
        triggerCondition: (a) => a.sanity > 60 && a.stress < 40,
        probability: 0.03,
        descriptions: ['轻声哼着不知名的曲调', '嘴里哼着断断续续的旋律', '无意识地哼起了歌'],
    },
    'pace': {
        triggerCondition: (a) => a.stress > 60,
        probability: 0.06,
        descriptions: ['焦躁地来回踱步', '在原地不安地走动', '脚步急促地走来走去'],
    },
    'fidget': {
        triggerCondition: (a) => a.stress > 50 || a.lust > 60,
        probability: 0.07,
        descriptions: ['坐立不安地扭动身体', '不停地变换姿势', '手指无意识地绞在一起'],
    },
    'cry_quietly': {
        triggerCondition: (a) => a.sanity < 40 || a.stress > 80,
        probability: 0.04,
        descriptions: ['眼眶泛红，泪水无声滑落', '默默地流着眼泪', '肩膀微微颤抖，压抑着哭泣'],
    },
    'laugh_nervously': {
        triggerCondition: (a) => a.sanity < 35 && a.stress > 70,
        probability: 0.02,
        descriptions: ['突然发出一阵神经质的笑声', '嘴角抽搐着笑了起来', '发出令人不安的轻笑'],
    },
    'tremble': {
        triggerCondition: (a) => a.sanity < 30 || a.stress > 85,
        probability: 0.05,
        descriptions: ['身体不受控制地颤抖', '双手微微发抖', '浑身轻颤，像是受了寒'],
    },
    'stare_blankly': {
        triggerCondition: (a) => a.sanity < 50,
        probability: 0.06,
        descriptions: ['目光呆滞地盯着某处', '眼神空洞，似乎灵魂出窍', '一动不动地凝视着虚空'],
    },
    'mutter': {
        triggerCondition: (a) => a.sanity < 40,
        probability: 0.04,
        descriptions: ['嘴唇微动，喃喃自语', '低声说着听不清的话', '自言自语着什么'],
    },
    'observe_others': {
        triggerCondition: (a) => a.stress < 60,
        probability: 0.08,
        descriptions: ['悄悄观察着周围的人', '目光在人群中游移', '默默注视着其他人的举动'],
    },
    'avoid_eye_contact': {
        triggerCondition: (a) => a.stress > 50 || a.sanity < 50,
        probability: 0.06,
        descriptions: ['刻意避开他人的目光', '低下头，不敢与人对视', '眼神闪躲'],
    },
    'seek_attention': {
        triggerCondition: (a) => a.lust > 50 || a.devotion > 60,
        probability: 0.04,
        descriptions: ['有意无意地吸引他人注意', '做出引人注目的小动作', '渴望被关注的眼神'],
    },
    'touch_collar': {
        triggerCondition: (a) => a.devotion > 30,
        probability: 0.05,
        descriptions: ['手指轻轻抚过颈间的项圈', '下意识地触摸着项圈', '指尖描绘着项圈的轮廓'],
    },
    'kneel_briefly': {
        triggerCondition: (a) => a.devotion > 70,
        probability: 0.03,
        descriptions: ['突然跪下，又很快站起', '短暂地屈膝跪地', '不由自主地跪了一下'],
    },
    'whisper_prayer': {
        triggerCondition: (a) => a.devotion > 50 || (a.stress > 70 && a.sanity < 50),
        probability: 0.04,
        descriptions: ['嘴唇微动，似在祈祷', '低声念诵着什么', '闭眼默默祈祷'],
    },
    'hug_self': {
        triggerCondition: (a) => a.stress > 60 || a.sanity < 45,
        probability: 0.05,
        descriptions: ['双臂环抱自己', '紧紧抱住自己的身体', '蜷缩着抱紧自己'],
    },
    'rock_back_forth': {
        triggerCondition: (a) => a.sanity < 30,
        probability: 0.03,
        descriptions: ['身体前后轻轻摇晃', '像个孩子一样摇晃着', '不停地前后摇摆'],
    },
    'bite_lip': {
        triggerCondition: (a) => a.stress > 50 || a.lust > 60,
        probability: 0.06,
        descriptions: ['轻咬着下唇', '牙齿咬住嘴唇', '不安地咬着唇'],
    },
};

/**
 * 心境子系统：由属性与状态台阶推导心境，并在心境稳定期后触发自发小动作。
 * 心境切换有最短持续期，防止属性临界时每 tick 反复横跳。
 */
class MaidenMood {
    /**
     * 心境与自发行为的节流阈值。
     * 复用 GAME_CONFIG.MOOD，避免同一条规则在此处出现第二份数值。
     */
    private readonly MOOD_MIN_DURATION = GAME_CONFIG.MOOD.MIN_DURATION;
    private readonly SPONTANEOUS_COOLDOWN = GAME_CONFIG.MOOD.ACTION_COOLDOWN;

    /**
     * 根据属性和复合状态机计算当前应有的情绪状态
     * 严格遵循 CharacterStatus 优先级覆写机制
     */
    calculateMood(maiden: Maiden): MoodState {
        const { attributes: a, physiology: p, status } = maiden;
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;
        const domains = view.domains;

        // 0. 最高优先级异常状态拦截
        if (status.includes('broken')) {
            return 'numb';
        }

        if (view.state === 'extreme' || status.includes('dissociated')) {
            return a.sanity < 30 ? 'fearful' : 'numb';
        }

        if (status.includes('euphoric')) {
            return 'euphoric';
        }

        if (status.includes('panicked')) {
            return 'fearful';
        }

        // 1. 麻木：长期高压力 + 低理智 + 高情绪性
        const numbThreshold = 85 - domains.E * 2;
        if (a.stress > numbThreshold && a.sanity < 35) {
            return 'numb';
        }

        // 2. 恐惧：极低理智，恐惧特质越高阈值越高
        const fearSanityThreshold = 25 - facets.fearfulness * 2;
        if (a.sanity < fearSanityThreshold) {
            return 'fearful';
        }

        // 3. 狂喜：高虔诚 + 低压力 + 高感伤
        const euphoricDevotionThreshold = 80 - facets.sentimentality * 3;
        if (a.devotion > euphoricDevotionThreshold && a.stress < 30) {
            return 'euphoric';
        }

        // 4. 欲求：高欲望，受感伤与审慎影响
        const lustThreshold = 70 + facets.prudence * 2 - facets.sentimentality;
        if (a.lust > lustThreshold || (a.lust > 50 && p.isOvulating)) {
            return 'lustful';
        }

        // 5. 焦虑：高压力，焦虑特质越高阈值越低
        const anxiousThreshold = 70 - facets.anxiety * 3;
        if (a.stress > anxiousThreshold) {
            return 'anxious';
        }

        // 6. 易怒：饥饿或疲劳，受耐心影响（耐心越低阈值越低）
        const irritableThreshold = 75 + facets.patience * 3;
        if (a.hunger > irritableThreshold || a.fatigue > 80) {
            return 'irritable';
        }

        // 7. 忧郁：低理智，感伤特质越高阈值越高
        const melancholyThreshold = 50 + facets.sentimentality * 2;
        if (a.sanity < melancholyThreshold) {
            return 'melancholy';
        }

        // 8. 默认：满足
        return 'content';
    }

    /**
     * 更新少女情绪状态
     * 状态防劣化：始终返回完整的同步实体快照
     */
    updateMood(maiden: Maiden, gameDeltaMs: number): {
        updatedMaiden: Maiden;
        moodChange?: MoodChangeEvent;
    } {
        const newMood = this.calculateMood(maiden);
        const newDuration = maiden.moodDuration + gameDeltaMs;

        if (newMood === maiden.mood) {
            return {
                updatedMaiden: { ...maiden, moodDuration: newDuration },
            };
        }

        const minDuration = this.MOOD_MIN_DURATION * (1 - maiden.isshex.facets.sentimentality * 0.05);
        if (maiden.moodDuration < minDuration) {
            return {
                updatedMaiden: { ...maiden, moodDuration: newDuration },
            };
        }

        const moodChange: MoodChangeEvent = {
            maidenId: maiden.id,
            maidenName: maiden.name,
            carriageId: getCurrentCarriageId(maiden),
            oldMood: maiden.mood,
            newMood,
            description: this.getMoodChangeDescription(maiden.name, maiden.mood, newMood, maiden.isshex),
            logType: this.getMoodLogType(newMood),
        };

        return {
            updatedMaiden: {
                ...maiden,
                mood: newMood,
                moodDuration: 0,
            },
            moodChange,
        };
    }

    /**
     * 检查并触发自发行为
     * 状态收敛重构：返回更新后的实体状态与行为事件，杜绝外部悬空修改
     */
    checkSpontaneousAction(maiden: Maiden, gameTimePassed: number): {
        updatedMaiden: Maiden;
        actionEvent?: SpontaneousActionEvent;
    } {
        if (maiden.lastSpontaneousTime &&
            gameTimePassed - maiden.lastSpontaneousTime < this.SPONTANEOUS_COOLDOWN) {
            return { updatedMaiden: maiden };
        }

        // 移动中、睡眠或已崩溃的实体不产生自发小动作
        if (maiden.movement?.isMoving ||
            maiden.status.includes('sleeping') ||
            maiden.status.includes('broken')) {
            return { updatedMaiden: maiden };
        }

        const attrs = maiden.attributes;
        const attrCheck = {
            sanity: attrs.sanity,
            stress: attrs.stress,
            lust: attrs.lust,
            devotion: attrs.devotion,
            fatigue: attrs.fatigue,
        };

        const possibleActions: { action: SpontaneousAction; config: typeof SPONTANEOUS_ACTION_CONFIG[SpontaneousAction] }[] = [];

        for (const [actionKey, config] of Object.entries(SPONTANEOUS_ACTION_CONFIG)) {
            const action = actionKey as SpontaneousAction;
            if (config.triggerCondition(attrCheck)) {
                possibleActions.push({ action, config });
            }
        }

        if (possibleActions.length === 0) {
            return { updatedMaiden: maiden };
        }

        for (const { action, config } of possibleActions) {
            const moodMod = this.getMoodActionModifier(maiden.mood, action);
            const personalityMod = this.getPersonalityActionModifier(maiden.isshex, action);
            const finalProb = config.probability * moodMod * personalityMod;

            if (Math.random() < finalProb) {
                const descriptions = config.descriptions;
                const description = `${maiden.name} ${descriptions[Math.floor(Math.random() * descriptions.length)]}`;

                const actionEvent: SpontaneousActionEvent = {
                    maidenId: maiden.id,
                    maidenName: maiden.name,
                    carriageId: getCurrentCarriageId(maiden),
                    action,
                    description,
                    logType: this.getActionLogType(action),
                };

                return {
                    updatedMaiden: {
                        ...maiden,
                        lastSpontaneousAction: action,
                        lastSpontaneousTime: gameTimePassed,
                    },
                    actionEvent,
                };
            }
        }

        return { updatedMaiden: maiden };
    }

    /**
     * IS-SHEX人格对自发行为概率的修正
     */
    private getPersonalityActionModifier(isshex: ISShexPersonality, action: SpontaneousAction): number {
        const view = new PersonalityView(isshex);
        const facets = isshex.facets;
        const domains = view.domains;
        const weights = view.weights;
        const meta = view.meta;

        const modifiers: Partial<Record<SpontaneousAction, () => number>> = {
            'pace': () => 1 + facets.anxiety * 0.2,
            'fidget': () => 1 + facets.anxiety * 0.2,
            'cry_quietly': () => 1 + facets.sentimentality * 0.25,
            'sigh': () => 1 + facets.sentimentality * 0.15,
            'laugh_nervously': () => 1 - facets.prudence * 0.2,
            'mutter': () => 1 - facets.prudence * 0.15,
            'tremble': () => 1 + facets.fearfulness * 0.25,
            'hug_self': () => 1 + facets.fearfulness * 0.2,
            'avoid_eye_contact': () => 1 - domains.X * 0.2,
            'seek_attention': () => 1 + domains.X * 0.2,
            'touch_collar': () => 1 + weights.devotionTendency * 0.5,
            'kneel_briefly': () => 1 + weights.devotionTendency * 0.8,
            'whisper_prayer': () => 1 + weights.devotionTendency * 0.6,
            'daydream': () => 1 + domains.O * 0.15,
            'hum': () => 1 + facets.liveliness * 0.2,
            // 稳定性越低，越容易出现自我安抚式的重复动作
            'rock_back_forth': () => 1 - meta.alpha * 0.2,
        };

        const modifier = modifiers[action];
        return modifier ? Math.max(0.1, modifier()) : 1.0;
    }

    /**
     * 情绪对自发行为概率的修正
     */
    private getMoodActionModifier(mood: MoodState, action: SpontaneousAction): number {
        const modifiers: Partial<Record<MoodState, Partial<Record<SpontaneousAction, number>>>> = {
            'anxious': { 'pace': 2.0, 'fidget': 2.0, 'bite_lip': 1.5 },
            'melancholy': { 'cry_quietly': 2.0, 'sigh': 2.0, 'stare_blankly': 1.5 },
            'fearful': { 'tremble': 2.5, 'hug_self': 2.0, 'avoid_eye_contact': 2.0 },
            'lustful': { 'fidget': 1.5, 'bite_lip': 2.0, 'seek_attention': 2.0 },
            'numb': { 'stare_blankly': 3.0, 'rock_back_forth': 2.0 },
            'euphoric': { 'hum': 2.0, 'touch_collar': 1.5, 'kneel_briefly': 2.0 },
        };

        return modifiers[mood]?.[action] ?? 1.0;
    }

    /**
     * 获取情绪变化描述（基于IS-SHEX人格定制）
     */
    private getMoodChangeDescription(
        name: string,
        oldMood: MoodState,
        newMood: MoodState,
        isshex: ISShexPersonality
    ): string {
        const facets = isshex.facets;
        const domains = deriveDomains(facets);

        const descriptions: Record<MoodState, string[]> = {
            'content': [
                `${name} 的神情逐渐平静下来`,
                `${name} 看起来放松了一些`,
                facets.liveliness > 1.0 ? `${name} 的眼中重新有了光彩` : `${name} 的呼吸变得平稳`,
            ],
            'anxious': [
                `${name} 变得焦躁不安`,
                `${name} 的眼神中透出焦虑`,
                facets.anxiety > 1.0 ? `${name} 的手指开始不自觉地颤抖` : `${name} 的表情变得紧绷`,
            ],
            'melancholy': [
                `${name} 陷入了忧郁`,
                `${name} 的眼中蒙上一层阴霾`,
                facets.sentimentality > 1.0 ? `${name} 的眼眶微微泛红` : `${name} 变得沉默寡言`,
            ],
            'irritable': [
                `${name} 变得易怒起来`,
                `${name} 的表情变得不耐烦`,
                facets.patience < -1.0 ? `${name} 的眉头紧锁，似乎随时会爆发` : `${name} 的语气变得生硬`,
            ],
            'lustful': [
                `${name} 的呼吸变得急促`,
                `${name} 的眼神变得迷离`,
                domains.X > 1.0
                    ? `${name} 的目光开始游移，寻找着什么` : `${name} 的脸颊泛起红晕`,
            ],
            'fearful': [
                `${name} 陷入了恐惧`,
                `${name} 的身体开始发抖`,
                facets.fearfulness > 1.0 ? `${name} 蜷缩起来，眼中满是惊恐` : `${name} 的瞳孔骤然收缩`,
            ],
            'euphoric': [
                `${name} 的脸上浮现出狂喜`,
                `${name} 沉浸在某种极乐之中`,
                facets.sentimentality > 1.0 ? `${name} 的眼中闪烁着近乎疯狂的光芒` : `${name} 露出了恍惚的微笑`,
            ],
            'numb': [
                `${name} 的表情变得麻木`,
                `${name} 似乎对一切都失去了感觉`,
                // 情绪性高者麻木时反差更大，故用"空洞"而非"行尸走肉"
                facets.sentimentality > 1.0 ? `${name} 的眼神变得空洞，仿佛灵魂已经离开` : `${name} 变得如同行尸走肉`,
            ],
        };

        const options = descriptions[newMood];
        return options[Math.floor(Math.random() * options.length)];
    }

    /**
     * 获取情绪对应的日志类型
     */
    private getMoodLogType(mood: MoodState): LogType {
        switch (mood) {
            case 'fearful':
            case 'numb': return 'abyss';
            case 'euphoric': return 'ritual';
            case 'lustful': return 'narrative';
            default: return 'system';
        }
    }

    /**
     * 获取自发行为对应的日志类型
     */
    private getActionLogType(action: SpontaneousAction): LogType {
        const ritualActions = ['touch_collar', 'kneel_briefly', 'whisper_prayer'];
        const abyssActions = ['laugh_nervously', 'rock_back_forth', 'mutter'];

        if (ritualActions.includes(action)) return 'ritual';
        if (abyssActions.includes(action)) return 'abyss';
        return 'narrative';
    }
}

// 着装

/**
 * 洗浴时替换的外显层（浴巾 + 拖鞋）。
 * dressLevel 在派生时由 calculateDressLevel 现算，这里无需也无法预设。
 */
const BATHING_CLOTHING_STATE: ClothingState = {
    intimate: NAKED_INTIMATE_LAYER,
    undergarment: NAKED_UNDERGARMENT_LAYER,
    outerwear: BATHING_OUTERWEAR_LAYER,
    accessories: [],
    state: 'wet',
    dressLevel: 'underwear_only',
};

/** 睡眠时替换的外显层（睡裙） */
const SLEEPING_CLOTHING_STATE: ClothingState = {
    intimate: NAKED_INTIMATE_LAYER,
    undergarment: NAKED_UNDERGARMENT_LAYER,
    outerwear: {
        top: { type: { id: 'nightgown', name: '睡裙' } },
        bottom: { type: { id: 'none', name: '无' } },
        gloves: { type: { id: 'none', name: '无' } },
        shoes: { type: { id: 'none', name: '无' } },
    },
    accessories: [],
    state: 'intact',
    dressLevel: 'partially_dressed',
};

// 服装变化触发器

/** 活动对应的服装状态 */
const ACTIVITY_CLOTHING_MAP: Partial<Record<CharacterStatus, Partial<ClothingState>>> = {
    'bathing': BATHING_CLOTHING_STATE,
    'sleeping': SLEEPING_CLOTHING_STATE,
};

/** 需要放下携带物的活动 */
const DROP_CARRYABLES_ACTIVITIES: CharacterStatus[] = [
    'sleeping',
    'bathing',
    'eating',
    'confessing',
    'devoted',
    'performing',
];

/** 车厢类型对服装状态的影响 */
const CARRIAGE_CLOTHING_EFFECTS: Partial<Record<CarriageType, Partial<ClothingState>>> = {
    'POOLS': {
        state: 'wet' as AttireState,
    },
};

/**
 * 比较两份着装是否等值（按层与饰品逐项）。
 * 用于让换装成为幂等操作：无变化时返回 null，避免每 tick 都产生新的 clothing 引用，
 * 否则 Array/Map 的引用比较会判定"少女已改变"，触发无意义的重渲染与立绘更新。
 */
function isSameClothing(a: ClothingState, b: ClothingState): boolean {
    if (a.state !== b.state || a.dressLevel !== b.dressLevel) return false;
    if (a.accessories.length !== b.accessories.length) return false;

    const sameId = (x?: { id: string }, y?: { id: string }) => x?.id === y?.id;

    if (!sameId(a.intimate.bra.type, b.intimate.bra.type)) return false;
    if (!sameId(a.intimate.panties.type, b.intimate.panties.type)) return false;
    if (!sameId(a.undergarment.stockings.type, b.undergarment.stockings.type)) return false;
    if (!sameId(a.undergarment.undershirt.type, b.undergarment.undershirt.type)) return false;
    if (!sameId(a.undergarment.underpants.type, b.undergarment.underpants.type)) return false;
    if (!sameId(a.outerwear.top.type, b.outerwear.top.type)) return false;
    if (!sameId(a.outerwear.bottom.type, b.outerwear.bottom.type)) return false;
    if (!sameId(a.outerwear.gloves.type, b.outerwear.gloves.type)) return false;
    if (!sameId(a.outerwear.shoes.type, b.outerwear.shoes.type)) return false;

    return a.accessories.every((acc, i) =>
        acc.type.id === b.accessories[i].type.id &&
        sameId(acc.color, b.accessories[i].color) &&
        sameId(acc.material, b.accessories[i].material)
    );
}

/**
 * 少女着装系统。
 *
 * 着装是**派生态**：唯一权威是 `maiden.clothing`，基准是 `maiden.initialClothing`。
 * 因此不保存"进入活动前的服装副本"——那种副本无法随存档持久化，
 * 读档后必然与 clothing 脱节（这正是它此前从未被接线的根因）。
 * 一切换装都由当前活动与车厢现算，读档后自动回到正确状态。
 */
class MaidenClothing {

    /**
     * 依据当前活动与车厢推导应有的着装；无需变化时返回 null。
     *
     * - 沐浴/睡眠使用专用层级，其余活动回到基准着装
     * - 饰品按活动过滤：沐浴仅保留束缚类，其余活动只放下携带物
     * - `state`（破损/湿透等）与着装结构解耦，换装时保留现状，仅由车厢效果覆写
     */
    deriveClothing(maiden: Maiden, carriageType: CarriageType): ClothingState | null {
        const currentClothing = maiden.clothing;
        const activity = maiden.behavior.currentActivity;
        const activityClothing = ACTIVITY_CLOTHING_MAP[activity];
        // 基准着装即"正常穿着"的唯一来源；睡眠/沐浴只临时覆写层级，不修改基准
        const baseline = maiden.initialClothing ?? currentClothing;

        const target: ClothingState = activityClothing
            ? {
                intimate: activityClothing.intimate ?? baseline.intimate,
                undergarment: activityClothing.undergarment ?? baseline.undergarment,
                outerwear: activityClothing.outerwear ?? baseline.outerwear,
                accessories: this.filterAccessoriesForActivity(currentClothing.accessories, activity),
                state: activityClothing.state ?? currentClothing.state,
                dressLevel: 'fully_dressed',
            }
            : {
                ...baseline,
                accessories: this.filterAccessoriesForActivity(currentClothing.accessories, activity),
                state: currentClothing.state,
                dressLevel: 'fully_dressed',
            };

        const carriageEffect = CARRIAGE_CLOTHING_EFFECTS[carriageType];
        if (carriageEffect?.state) target.state = carriageEffect.state;

        target.dressLevel = calculateDressLevel(target);

        return isSameClothing(currentClothing, target) ? null : target;
    }

    /**
     * 覆写着装污损状态（`state` 与着装结构正交，是污损/修复动作的唯一写入口）。
     * 破损、弄湿、染血、透光、恢复整洁都通过同一参数表达。
     */
    setAttireState(clothing: ClothingState, state: AttireState): ClothingState {
        return { ...clothing, state };
    }

    /**
     * 根据活动过滤饰品：不可移除的始终保留，沐浴仅留束缚类，其余活动只放下携带物。
     */
    private filterAccessoriesForActivity(
        accessories: AccessoryItem[],
        activity: CharacterStatus
    ): AccessoryItem[] {
        return accessories.filter(acc => {
            if (acc.isRemovable === false) return true;

            if (activity === 'bathing') {
                return isBondageAccessory(acc.type.id);
            }

            if (DROP_CARRYABLES_ACTIVITIES.includes(activity)) {
                return !isCarryableItem(acc.type.id);
            }

            return true;
        });
    }
}

// 妊娠

const MS_PER_WEEK = 7 * TIME_CONFIG.MS_PER_DAY;
const ABORTION_RISK_THRESHOLD = 85;

/**
 * 妊娠子系统：受孕判定、孕期推进、并发症与分娩结算。
 * 孕周由时长推导，`Maiden.physiology.pregnancy` 是唯一状态载体。
 */
class MaidenPregnancy {
    /**
     * 受孕检测。
     * 受生理特征与维生状态共同抑制；已孕时直接返回 null。
     */
    attemptConception(maiden: Maiden, gameTimePassed: number, fertilityBonus: number = 0): PregnancyEvent | null {
        if (this.isPregnant(maiden)) return null;

        const { physiology, attributes } = maiden;

        // 基础受孕率基准
        let conceptionChance = physiology.fertility / 100;

        if (physiology.isOvulating) {
            conceptionChance *= 3.0;
        }

        // 维生状态惩罚 (极度高压、饥饿、疲劳将显著抑制受孕)
        const stressPenalty = attributes.stress > 80 ? 0.6 : 1.0;
        const hungerPenalty = attributes.hunger > 80 ? 0.3 : 1.0;
        const fatiguePenalty = attributes.fatigue > 90 ? 0.2 : 1.0;

        conceptionChance += fertilityBonus;
        conceptionChance *= physiology.sensitivityMultiplier;
        conceptionChance *= (physiology.health / 100);
        conceptionChance *= (stressPenalty * hungerPenalty * fatiguePenalty);

        // 概率阈值收敛
        conceptionChance = clamp(conceptionChance, 0, 0.95);

        if (probabilityCheck(conceptionChance)) {
            return this.initializePregnancy(maiden, gameTimePassed);
        }

        return null;
    }

    /**
     * 初始化妊娠状态
     */
    private initializePregnancy(maiden: Maiden, gameTimePassed: number): PregnancyEvent {
        const expectedBirthTime = gameTimePassed + GAME_CONFIG.PREGNANCY.TOTAL_WEEKS * MS_PER_WEEK;

        // 初始健康风险受母体当前压力与健康状况影响
        const baseRisk = 5 + Math.floor(maiden.attributes.stress * 0.2) + Math.floor((100 - maiden.physiology.health) * 0.2);

        const state: PregnancyState = {
            stage: 'conception',
            weekNumber: 0,
            healthRisk: clamp(baseRisk, 0, 100),
            isDiscovered: false,
            conceptionTime: gameTimePassed,
            expectedBirthTime,
            complications: [],
        };

        return {
            type: 'conception',
            maidenId: maiden.id,
            description: `我的种子在${maiden.name}体内生根。不可逆转的循环已经开始。`,
            weekNumber: 0,
            logType: 'ritual',
            newState: state,
        };
    }

    /**
     * 妊娠进度流转与时序更新
     */
    updatePregnancy(maiden: Maiden, deltaMs: number): PregnancyEvent | null {
        const state = maiden.physiology.pregnancy;
        if (!state) return null;

        const weekProgress = deltaMs / MS_PER_WEEK;
        const oldWeek = Math.floor(state.weekNumber);
        const newWeekNumber = state.weekNumber + weekProgress;
        const newWeek = Math.floor(newWeekNumber);
        const newStage = this.determineStage(newWeekNumber);

        let newState: PregnancyState | null = {
            ...state,
            weekNumber: newWeekNumber,
            stage: newStage,
        };

        // 随机并发症评估 (约每游戏日触发一次判定)
        if (probabilityCheck(weekProgress * 7) && newState) {
            newState = this.updateSymptoms(newState);
        }

        // 跨周里程碑检测
        if (newWeek > oldWeek) {
            let lastEvent: PregnancyEvent | null = null;
            for (let w = oldWeek + 1; w <= newWeek; w++) {
                if (!newState) break;
                const event = this.checkMilestones(maiden, newState, w);
                if (event) {
                    lastEvent = event;
                    if (event.newState !== undefined) {
                        newState = event.newState;
                        // 若流产（newState 为 null），即刻终止后续周数结算
                        if (newState === null) break;
                    }
                }
            }
            if (lastEvent) {
                return { ...lastEvent, newState };
            }
        }

        // 若无跨周关键事件，透传状态静默演进
        return {
            type: 'progress',
            maidenId: maiden.id,
            description: '',
            weekNumber: newWeek,
            logType: 'system',
            newState,
        };
    }

    /**
     * 阶段拓扑判别
     */
    private determineStage(weekNumber: number): PregnancyStage {
        if (weekNumber < 2) return 'conception';
        if (weekNumber < 12) return 'early';
        if (weekNumber < 27) return 'middle';
        if (weekNumber < 40) return 'late';
        return 'labor';
    }

    /**
     * 动态并发症演进模型
     */
    private updateSymptoms(state: PregnancyState): PregnancyState {
        const { stage } = state;
        const symptoms = new Set(state.complications);

        // 淘汰过时或由于休养好转的症状
        if (stage !== 'early') {
            symptoms.delete('孕吐');
            symptoms.delete('严重嗜睡');
        }
        if (stage !== 'middle' && stage !== 'late') {
            symptoms.delete('假性宫缩');
        }
        if (stage === 'labor') {
            symptoms.clear();
        }

        // 概率性自愈机制 (自然淘汰轻微症状)
        if (symptoms.size > 0 && probabilityCheck(0.1)) {
            const arr = Array.from(symptoms);
            const toDelete = randomElement(arr);
            if (toDelete) symptoms.delete(toDelete);
        }

        // 症状增殖池 (非均等分布概率区间排布)
        const roll = Math.random();
        if (stage === 'early') {
            if (roll < 0.15) symptoms.add('孕吐');
            else if (roll < 0.25) symptoms.add('严重嗜睡');
        } else if (stage === 'middle') {
            if (roll < 0.10) symptoms.add('异常食欲');
            else if (roll < 0.15) symptoms.add('胎动剧烈');
        } else if (stage === 'late') {
            if (roll < 0.15) symptoms.add('水肿');
            else if (roll < 0.25) symptoms.add('腰痛');
            else if (roll < 0.30) symptoms.add('假性宫缩');
            else if (roll < 0.35) symptoms.add('呼吸急促');
        }

        return {
            ...state,
            complications: Array.from(symptoms),
        };
    }

    /**
     * 妊娠对基础维生属性的平滑影响乘区。
     * 只给出被消费的两项：移动受限目前由活动时长与需求优先级表达，
     * 没有独立的移动速度通道，因此不再计算无人读取的 mobilityMod。
     */
    getPregnancyImpacts(weekNumber: number): { hungerMod: number; fatigueMod: number } {
        if (weekNumber <= 0) return { hungerMod: 1, fatigueMod: 1 };

        let hungerMod = 1.0;
        let fatigueMod = 1.0;

        if (weekNumber < 12) {
            // 早期：食欲轻微下降，疲劳感快速上升
            const progress = weekNumber / 12;
            hungerMod = 1.0 - (progress * 0.15); // 最低 0.85
            fatigueMod = 1.0 + (progress * 0.3); // 最高 1.3
        } else if (weekNumber < 28) {
            // 中期：食欲反弹激增，疲劳趋于平稳
            const progress = (weekNumber - 12) / 16;
            hungerMod = 0.85 + (progress * 0.65); // 最高 1.5
            fatigueMod = 1.3 - (progress * 0.2);  // 降至 1.1
        } else {
            // 晚期：负担极重，食欲回落、疲劳陡增
            const progress = Math.min(1.0, (weekNumber - 28) / 12);
            hungerMod = 1.5 - (progress * 0.3);   // 降至 1.2
            fatigueMod = 1.1 + (progress * 0.5);  // 升至 1.6
        }

        return { hungerMod, fatigueMod };
    }

    /**
     * 里程碑与极端状况判定
     */
    private checkMilestones(
        maiden: Maiden,
        state: PregnancyState,
        weekNumber: number
    ): PregnancyEvent | null {
        // 1. 流产熔断检测
        if (state.healthRisk >= ABORTION_RISK_THRESHOLD && probabilityCheck(0.1)) {
            return {
                type: 'complication',
                maidenId: maiden.id,
                description: `${maiden.name}的身体无法承受深渊的重压，尚未成型的赐福化作血水流逝了。`,
                weekNumber,
                logType: 'system',
                newState: null, // 强制中断妊娠
            };
        }

        // 2. 状态觉察
        if (weekNumber >= GAME_CONFIG.PREGNANCY.DISCOVERY_WEEK && !state.isDiscovered) {
            return {
                type: 'discovery',
                maidenId: maiden.id,
                description: `${maiden.name}感到了身体深处的异样。她的腹部开始有了微妙的痉挛——我的恩赐正在她体内生根。`,
                weekNumber,
                logType: 'narrative',
                newState: { ...state, isDiscovered: true },
            };
        }

        // 3. 固定时序里程碑
        if (weekNumber === GAME_CONFIG.PREGNANCY.VISIBLE_WEEK) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}的下腹部已经微微隆起，孕育的痕迹无法再被隐瞒。`,
                weekNumber,
                logType: 'narrative',
            };
        }

        if (weekNumber === GAME_CONFIG.PREGNANCY.MOVEMENT_WEEK) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}第一次真切地感受到了腹中生命的反叛悸动。`,
                weekNumber,
                logType: 'narrative',
            };
        }

        if (weekNumber === GAME_CONFIG.PREGNANCY.IMMINENT_WEEK) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}沉重的身躯已经为即将到来的分娩做好了祭献的准备。`,
                weekNumber,
                logType: 'ritual',
            };
        }

        if (weekNumber >= GAME_CONFIG.PREGNANCY.TOTAL_WEEKS && state.stage !== 'labor') {
            return {
                type: 'labor',
                maidenId: maiden.id,
                description: `${maiden.name}的羊水破裂，临产的阵痛如潮水般涌来，时刻已至。`,
                weekNumber,
                logType: 'ritual',
                newState: { ...state, stage: 'labor' },
            };
        }

        // 4. 高危并发症爆发
        if (probabilityCheck(GAME_CONFIG.PREGNANCY.COMPLICATION_CHANCE) && state.healthRisk > 40) {
            return this.generateComplication(maiden, state, weekNumber);
        }

        return null;
    }

    /**
     * 生成突发高危并发症
     */
    private generateComplication(
        maiden: Maiden,
        state: PregnancyState,
        weekNumber: number
    ): PregnancyEvent {
        const severeComplications = ['异常出血', '毒血症征兆', '剧烈宫缩', '胎位偏转'];
        const complication = randomElement(severeComplications) || severeComplications[0];

        const complicationsList = [...state.complications];
        let healthRisk = state.healthRisk;

        if (!complicationsList.includes(complication)) {
            complicationsList.push(complication);
            healthRisk = clamp(state.healthRisk + GAME_CONFIG.PREGNANCY.COMPLICATION_RISK_INCREASE, 0, 100);
        }

        const updatedState: PregnancyState = {
            ...state,
            complications: complicationsList,
            healthRisk,
        };

        return {
            type: 'complication',
            maidenId: maiden.id,
            description: `${maiden.name}突发了[${complication}]，母体承受着极大的痛苦。`,
            weekNumber,
            logType: 'system',
            newState: updatedState,
        };
    }

    /**
     * 分娩终结处理
     */
    processBirth(maiden: Maiden): PregnancyEvent {
        const state = maiden.physiology.pregnancy;
        if (!state) {
            console.warn(`[MaidenPregnancy] processBirth: ${maiden.id} 无妊娠状态，强制执行兜底逻辑`);
        }
        const weekNumber = state ? Math.floor(state.weekNumber) : 40;

        const descriptions = [
            `在深渊的注视下，${maiden.name}完成了她的献祭。新生命的第一声啼哭撕裂了纯白的寂静。`,
            `${maiden.name}的身体在痉挛中脱力，将裹挟着血污的生命带入这个疯狂的世界。`,
            `痛苦达到顶峰的瞬间，${maiden.name}宣告了新循环的诞生。`,
        ];

        return {
            type: 'birth',
            maidenId: maiden.id,
            description: randomElement(descriptions) || descriptions[0],
            weekNumber,
            logType: 'ritual',
            newState: null, // 分娩后剥离妊娠状态
        };
    }

    /** 是否处于妊娠中（唯一判定入口；`pregnancy` 为 null 表示未孕） */
    isPregnant(maiden: Maiden): boolean {
        return maiden.physiology.pregnancy !== null && maiden.physiology.pregnancy !== undefined;
    }

    getPregnancyState(maiden: Maiden): PregnancyState | undefined {
        return maiden.physiology.pregnancy || undefined;
    }

    /** 全部在孕实体的 id 列表，供统计与 UI 计数使用 */
    getAllPregnantMaidens(maidens: Map<string, Maiden>): string[] {
        const result: string[] = [];
        for (const maiden of maidens.values()) {
            if (this.isPregnant(maiden)) {
                result.push(maiden.id);
            }
        }
        return result;
    }

    getPregnancyStats(maidens: Map<string, Maiden>): {
        total: number;
        byStage: Record<PregnancyStage, number>;
        averageWeek: number;
    } {
        const stats = {
            total: 0,
            byStage: {
                'none': 0,
                'conception': 0,
                'early': 0,
                'middle': 0,
                'late': 0,
                'labor': 0,
            },
            averageWeek: 0,
        };

        let totalWeeks = 0;
        for (const maiden of maidens.values()) {
            const state = maiden.physiology.pregnancy;
            if (state) {
                stats.total++;
                stats.byStage[state.stage]++;
                totalWeeks += state.weekNumber;
            }
        }

        stats.averageWeek = stats.total > 0 ? totalWeeks / stats.total : 0;
        return stats;
    }

    /**
     * 把妊娠状态同步到实体层，并维护派生的状态标签。
     *
     * `event.newState` 优先于实体现值（用于流产/分娩这类"事件即结论"的场景，
     * 其中 `newState: null` 表示终止妊娠）；标签按 isDiscovered 与阶段推导，
     * 禁止在别处另行增删 'pregnant'/'gestating'。
     */
    syncToMaiden(maiden: Maiden, event?: PregnancyEvent): Maiden {
        const state = event?.newState !== undefined ? event.newState : maiden.physiology.pregnancy;

        if (!state) {
            // 未孕或流产/分娩后的清理
            return {
                ...maiden,
                physiology: {
                    ...maiden.physiology,
                    pregnancy: null,
                },
                status: maiden.status.filter(s =>
                    s !== 'pregnant' && s !== 'gestating'
                ),
            };
        }

        const newStatus = new Set(maiden.status);
        // 两个标签都成对增删：只增不减会让 gestating 在阶段回退后永久驻留
        if (state.isDiscovered) newStatus.add('pregnant');
        else newStatus.delete('pregnant');

        if (state.stage === 'late' || state.stage === 'labor') newStatus.add('gestating');
        else newStatus.delete('gestating');

        return {
            ...maiden,
            physiology: {
                ...maiden.physiology,
                pregnancy: { ...state },
            },
            status: Array.from(newStatus),
        };
    }
}

// 子系统实例

const maidenMemory = new MaidenMemory();
const maidenRelationship = new MaidenRelationship();
const maidenSocialization = new MaidenSocialization();
const maidenNarcissus = new MaidenNarcissus();
const maidenRandomEvent = new MaidenRandomEvent();
const maidenGenerator = new MaidenGenerator();
const maidenBehavior = new MaidenBehavior();
const maidenMood = new MaidenMood();
const maidenClothing = new MaidenClothing();
const maidenPregnancy = new MaidenPregnancy();

/** 值得追踪开始/结束的活动 */
const TRACKABLE_ACTIVITIES: CharacterStatus[] = [
    'sleeping', 'eating', 'bathing', 'confessing', 'devoted', 'performing', 'observing',
];

/** 不值得记录的普通状态 */
const INSIGNIFICANT_STATUSES: CharacterStatus[] = [
    'normal', 'sleeping', 'eating', 'bathing', 'wandering', 'chatting',
];

const ACTIVITY_END_DESCRIPTIONS: Record<CharacterStatus, string[]> = {
    'sleeping': ['醒来', '睡眠结束', '休息完毕'],
    'eating': ['进食结束', '用餐完毕', '吃饱了'],
    'bathing': ['沐浴结束', '洗浴完毕', '清洁完成'],
    'wandering': ['停止游荡', '结束游荡', '停止走动'],
    'chatting': ['交谈结束', '聊天结束', '对话完毕'],
    'confessing': ['忏悔结束', '祷告完毕', '忏悔完成'],
    'devoted': ['祈祷结束', '礼拜完毕', '虔诚消退'],
    'normal': ['状态异常', '中断活动', '停止活动'],
    'panicked': ['从惊恐中恢复', '惊恐消退', '恢复平静'],
    'aroused': ['欲望平息', '情欲消退', '恢复理智'],
    'broken': ['精神逐渐恢复', '开始恢复', '精神好转'],
    'injured': ['伤势痊愈', '伤愈', '恢复健康'],
    'pregnant': ['不再怀孕', '妊娠结束', '恢复常态'],
    'euphoric': ['从愉悦中清醒', '愉悦消退', '恢复正常'],
    'dissociated': ['意识恢复清醒', '意识回归', '精神恢复'],
    'complicit': ['不再是共犯', '脱离共犯关系', '不再同谋'],
    'voyeur': ['不再窥视', '停止观察', '结束窥视'],
    'deaconess': ['失去执事身份', '圣职被剥夺', '不再担任执事'],
    'gestating': ['孕育结束', '妊娠结束', '分娩完成'],
    'performing': ['表演结束', '演出完毕', '下台'],
    'anchoring': ['锚定结束', '稳定完成', '结束锚定'],
    'observing': ['停止观测深渊', '移开视线', '不再凝视深渊', '离开观测窗', '停止窥视'],
};

const ACTIVITY_START_DESCRIPTIONS: Record<CharacterStatus, string[]> = {
    'sleeping': ['开始休息', '准备入睡', '躺下休息'],
    'eating': ['开始进食', '开始用餐', '享用食物'],
    'bathing': ['开始沐浴', '开始洗澡', '准备清洁'],
    'wandering': ['开始游荡', '四处走动', '开始漫步'],
    'chatting': ['开始交谈', '开始聊天', '与人对话'],
    'confessing': ['开始忏悔', '开始祷告', '向神明忏悔'],
    'devoted': ['开始祈祷', '虔诚祈祷', '开始礼拜'],
    'normal': ['恢复正常活动', '状态正常', '开始日常活动'],
    'panicked': ['陷入惊恐', '开始恐慌', '惊慌失措'],
    'aroused': ['情欲高涨', '春心萌动', '欲望觉醒'],
    'broken': ['精神崩溃', '崩溃瓦解', '精神瓦解'],
    'injured': ['受伤了', '身体受伤', '遭受伤害'],
    'pregnant': ['怀孕了', '怀有身孕', '开始妊娠'],
    'euphoric': ['陷入极度愉悦', '极度愉悦', '幸福感爆棚'],
    'dissociated': ['意识开始游离', '意识游离', '精神脱离'],
    'complicit': ['成为堕落共犯', '堕入共犯', '成为同谋'],
    'voyeur': ['成为窥视者', '开始窥视', '暗中观察'],
    'deaconess': ['晋升为执事', '成为执事', '接受圣职'],
    'gestating': ['开始孕育', '开始妊娠', '孕育新生命'],
    'performing': ['开始表演', '走上舞台', '开始演出'],
    'anchoring': ['开始锚定', '开始稳定', '进行锚定'],
    'observing': ['颤抖着靠近观测窗，向深渊窥视', '被虚空吸引，趴在窗沿上凝视', '无法移开视线，直视着深渊的黑暗', '开始观测深渊', '凝视深渊', '向深渊窥视'],
};

const CHARACTER_STATUS_NAMES: Record<CharacterStatus, string> = {
    'normal': '正常活动', 'panicked': '惊恐', 'injured': '受伤', 'broken': '崩溃',
    'dissociated': '游离', 'aroused': '情欲', 'pregnant': '怀孕', 'gestating': '孕育',
    'euphoric': '愉悦', 'devoted': '虔诚', 'complicit': '共犯', 'voyeur': '窥视',
    'deaconess': '执事', 'performing': '表演', 'confessing': '忏悔', 'anchoring': '锚定',
    'sleeping': '休息', 'eating': '进食', 'bathing': '沐浴', 'wandering': '游荡',
    'chatting': '交谈', 'observing': '观测',
};

/**
 * 少女系统协调器。
 *
 * 对外唯一出口（`maidenSystem` 单例）。职责是把各子系统的调用编排进一帧的更新顺序：
 * 属性推进 → 行为决策 → 事件结算 → 心境 → 状态 diff。
 *
 * 子系统通过 `readonly` 字段暴露，但它们各自持有的数据都内嵌于 `Maiden` 实体，
 * 因此本类不持有任何需要与存档同步的独立状态。
 */
class MaidenSystem {
    readonly generator = maidenGenerator;
    private behavior = maidenBehavior;

    readonly socialization = maidenSocialization;
    readonly memory = maidenMemory;
    readonly narcissus = maidenNarcissus;
    readonly clothing = maidenClothing;
    readonly mood = maidenMood;

    /**
     * 随机事件系统门面：把事件轮询与冷却时序的序列化合并到一处。
     */
    readonly event = {
        checkForEvents: (
            maidens: Map<string, Maiden>,
            carriages: Map<string, Carriage>,
            gameTimePassed: number,
            targetIds?: string[]
        ): GameEvent[] =>
            maidenRandomEvent.checkForEvents(maidens, carriages, gameTimePassed, targetIds),
        serialize: (): EventTimestampData[] =>
            maidenRandomEvent.serialize().map(([eventType, timestamp]) => ({ eventType: eventType as EventType, timestamp })),
        deserialize: (data: EventTimestampData[]): void =>
            maidenRandomEvent.deserialize(data.map(d => [d.eventType, d.timestamp])),
    };

    /** 事件效果结算器，与 event 共用同一底层实现 */
    readonly eventEffects = {
        applyEventEffects: (event: GameEvent, ctx: EventEffectContext): Map<string, Maiden> =>
            maidenRandomEvent.applyEventEffects(event, ctx),
    };

    /**
     * 妊娠子系统（附加序列化接口）。
     * 妊娠状态内嵌于 Maiden.physiology，随 Maiden 全量存档；此处仅为满足 SubsystemsData 规范。
     */
    readonly pregnancy = Object.assign(maidenPregnancy, {
        serialize: (maidens?: Map<string, Maiden>): PregnancyData[] => {
            if (!maidens) return [];
            const result: PregnancyData[] = [];
            for (const maiden of maidens.values()) {
                if (maiden.physiology.pregnancy) {
                    result.push({ maidenId: maiden.id, pregnancyState: maiden.physiology.pregnancy });
                }
            }
            return result;
        },
        deserialize: (_data: PregnancyData[]): void => {
            // 妊娠状态通过 Maiden 全量恢复，此处为空操作
        },
    });

    /**
     * 关系子系统（附加序列化接口）。
     * 关系数据内嵌于 Maiden.relationships，随 Maiden 全量存档；此处仅为满足 SubsystemsData 规范。
     */
    readonly relationship = Object.assign(maidenRelationship, {
        serialize: (maidens?: Map<string, Maiden>): RelationshipNetworkData[] => {
            if (!maidens) return [];
            const result: RelationshipNetworkData[] = [];
            for (const maiden of maidens.values()) {
                if (maiden.relationships && maiden.relationships.length > 0) {
                    result.push({
                        maidenId: maiden.id,
                        relationships: maiden.relationships.map(r => ({ targetId: r.targetId, relationship: r })),
                    });
                }
            }
            return result;
        },
        deserialize: (_data: RelationshipNetworkData[]): void => {
            // 关系数据通过 Maiden 全量恢复，此处为空操作
        },
    });

    /**
     * 生成初始少女种群并写入车厢占用。
     * 返回值为新实体表；同时会就地修改传入的 `carriages`（追加 occupants），
     * 因此调用方必须传入本轮可变的地图副本。
     */
    generateMaidens(carriages: Map<string, Carriage>): Map<string, Maiden> {
        const maidens = new Map<string, Maiden>();
        const carriageIds = Array.from(carriages.keys()).filter(id => {
            const c = carriages.get(id)!;
            return c.isAccessible && c.category !== 'abyss';
        });

        const usedNames = new Set<string>();

        for (let i = 0; i < GAME_CONFIG.TOTAL_MAIDENS; i++) {
            const id = `Unit-${String(i + 1).padStart(3, '0')}`;
            const carriageId = carriageIds[Math.floor(Math.random() * carriageIds.length)];

            // 委托给生成器
            const maiden = this.generator.generateUnit(id, carriageId, usedNames, 0);

            // 将少女放入车厢（不可变更新）
            const carriage = carriages.get(carriageId)!;
            carriages.set(carriageId, {
                ...carriage,
                occupants: [...carriage.occupants, id],
            });

            maidens.set(id, maiden);
        }

        // 初始化关系网络
        this.relationship.initializeNetwork(maidens, 0);

        return maidens;
    }

    /** 游戏内小时（0-23），由绝对游戏时间换算 */
    getGameHour(gameTimePassed: number): number {
        return Math.floor((gameTimePassed / TIME_CONFIG.MS_PER_HOUR) % 24);
    }

    /** 是否处于夜间休息时段（跨零点，因此判定必须用"或"而非区间） */
    isRestTime(gameTimePassed: number): boolean {
        const hour = this.getGameHour(gameTimePassed);
        return hour >= TIME_CONFIG.REST_START_HOUR || hour < TIME_CONFIG.REST_END_HOUR;
    }

    /**
     * 推进单帧的属性与状态。
     *
     * 依赖顺序不可调换：车厢周期效应 → 共振 → 维生消耗 → 活动效应 → 深渊效应 →
     * 状态标签 → 生理周期 → 人格状态。
     *
     * @param maiden 本帧开始时的实体快照（不会被修改）
     * @param carriage 实体当前所在车厢；类型未知时抛错，而非静默套用默认值
     * @param gameDeltaMs 本帧推进的游戏毫秒数（已乘 timeScale）
     * @param resonanceFrequency 全局共振频率，越低越容易推高欲望
     * @param gameTimePassed 推进后的**绝对**游戏时间，用于休息时段与生理周期判定
     * @returns 新的实体快照，属性/状态/生理/人格均已更新
     */
    updateMaidenState(
        maiden: Maiden,
        carriage: Carriage,
        gameDeltaMs: number,
        resonanceFrequency: number,
        gameTimePassed: number
    ): Maiden {
        const deltaSeconds = gameDeltaMs / 1000;
        const deltaMinutes = deltaSeconds / 60;
        const typeInfo = CARRIAGE_TYPE_INFO.find(info => info.type === carriage.type);
        if (!typeInfo) {
            throw new Error(`Unknown carriage type: ${carriage.type}`);
        }
        const { RATES, THRESHOLDS } = GAME_CONFIG;
        const view = personalityView(maiden);
        const facets = maiden.isshex.facets;
        const domains = view.domains;
        const behaviorWeights = view.weights;
        const carriageFunc = CARRIAGE_FUNCTIONS[carriage.type];

        let attrs = { ...maiden.attributes };
        // 高尽责者理智流失更慢（C 每 1σ 折减 0.08 倍率）
        const sanityMod = 1 - domains.C * 0.008 * 10;
        const stressMod = 1 / behaviorWeights.stressResistance;
        const lustMod = behaviorWeights.lustSensitivity;

        attrs.sanity = clamp(attrs.sanity + typeInfo.periodicEffects.sanity * deltaMinutes * 0.1 * sanityMod);
        attrs.lust = clamp(attrs.lust + typeInfo.periodicEffects.lust * deltaMinutes * 0.1 * lustMod);
        attrs.stress = clamp(attrs.stress + typeInfo.periodicEffects.stress * deltaMinutes * 0.1 * stressMod);

        const resonanceEffect = Math.max(0, (20 - resonanceFrequency) / 20);
        attrs.lust = clamp(attrs.lust + resonanceEffect * deltaMinutes * 0.2 * lustMod);

        const isResting = this.isRestTime(gameTimePassed);
        let hungerRate = isResting ? RATES.HUNGER_INCREASE * 0.5 : RATES.HUNGER_INCREASE;
        let fatigueRate = isResting ? RATES.FATIGUE_INCREASE * 0.3 : RATES.FATIGUE_INCREASE;

        const syncedMaiden = this.pregnancy.syncToMaiden(maiden);
        const { physiology } = syncedMaiden;

        const pregnancyWeek = physiology.pregnancy?.weekNumber ?? 0;
        if (pregnancyWeek > 0) {
            const impacts = this.pregnancy.getPregnancyImpacts(pregnancyWeek);
            hungerRate *= impacts.hungerMod;
            fatigueRate *= impacts.fatigueMod;
        }

        attrs.hunger = clamp(attrs.hunger + hungerRate * deltaMinutes);
        attrs.fatigue = clamp(attrs.fatigue + fatigueRate * deltaMinutes);
        attrs.hygiene = clamp(attrs.hygiene - RATES.HYGIENE_DECREASE * deltaMinutes);

        attrs = this._applyActivityEffects(maiden, attrs, deltaMinutes, carriageFunc, domains, facets, RATES);

        if (carriage.category === 'abyss') {
            attrs.sanity = clamp(attrs.sanity - deltaMinutes * RATES.SANITY_ABYSS_DRAIN * sanityMod);
            attrs.stress = clamp(attrs.stress + deltaMinutes * RATES.STRESS_ABYSS_GAIN * stressMod);
            if (behaviorWeights.riskTolerance > 0.5 && domains.O > 0.5) {
                attrs.corruption = clamp(attrs.corruption + 0.15 * deltaMinutes, 0, 100);
            }
        }

        const discomfort = 1 - carriageFunc.comfortLevel;
        attrs.stress = clamp(attrs.stress + discomfort * 0.05 * deltaMinutes);

        // 状态标签必须从 syncedMaiden 推导：syncToMaiden 刚写入的 pregnant/gestating
        // 只存在于它的 status 上，用入参 maiden 会让这两个标签每帧被丢掉。
        const statusSet = this._updateStatusTags(syncedMaiden, attrs, THRESHOLDS);
        const updatedPhysiology = this._updatePhysiology(syncedMaiden, deltaMinutes, gameTimePassed);
        const isshex = this._updatePersonalityState(maiden, carriage);

        return {
            ...maiden,
            attributes: attrs,
            status: Array.from(statusSet),
            physiology: updatedPhysiology,
            isshex,
            lastUpdateTime: gameTimePassed,
        };
    }

    private _applyActivityEffects(
        maiden: Maiden,
        attrs: Maiden['attributes'],
        deltaMinutes: number,
        carriageFunc: typeof CARRIAGE_FUNCTIONS[keyof typeof CARRIAGE_FUNCTIONS],
        domains: HexacoProfile,
        facets: Maiden['isshex']['facets'],
        RATES: typeof GAME_CONFIG.RATES
    ): Maiden['attributes'] {
        const activity = maiden.behavior.currentActivity;
        switch (activity) {
            case 'sleeping': {
                const sleepBonus = carriageFunc.canSleep ? 1.0 : 0.5;
                const cBonus = 1 + domains.C * 0.05;
                attrs.fatigue = clamp(attrs.fatigue - RATES.FATIGUE_SLEEP_REGEN * deltaMinutes * sleepBonus * cBonus, 0, 100);
                attrs.sanity = clamp(attrs.sanity + RATES.SANITY_SLEEP_REGEN * deltaMinutes * sleepBonus, 0, 100);
                attrs.stress = clamp(attrs.stress - 0.2 * deltaMinutes * sleepBonus, 0, 100);
                break;
            }
            case 'eating': {
                const eatBonus = carriageFunc.canEat ? 1.0 : 0.3;
                attrs.hunger = clamp(attrs.hunger - RATES.HUNGER_EAT_REGEN * deltaMinutes * eatBonus, 0, 100);
                break;
            }
            case 'bathing': {
                const bathBonus = carriageFunc.canBathe ? 1.0 : 0.2;
                attrs.hygiene = clamp(attrs.hygiene + RATES.HYGIENE_BATH_REGEN * deltaMinutes * bathBonus, 0, 100);
                attrs.stress = clamp(attrs.stress - RATES.STRESS_BATH_REGEN * deltaMinutes * bathBonus, 0, 100);
                if (facets.aestheticAppreciation > 1.0) attrs.stress = clamp(attrs.stress - 0.1 * deltaMinutes, 0, 100);
                if (facets.sentimentality > 0.5 && facets.prudence < -0.5) attrs.lust = clamp(attrs.lust + 0.3 * deltaMinutes, 0, 100);
                break;
            }
            case 'confessing': {
                const prayBonus = carriageFunc.canPray ? 1.0 : 0.5;
                const devotionTendency = deriveBehaviorWeights(facets).devotionTendency;
                const devotionGain = 0.5 * (1 + devotionTendency);
                attrs.devotion = clamp(attrs.devotion + devotionGain * deltaMinutes * prayBonus, 0, 100);
                if (devotionTendency > 0.5) {
                    attrs.stress = clamp(attrs.stress - 0.3 * deltaMinutes, 0, 100);
                    attrs.sanity = clamp(attrs.sanity - 0.1 * deltaMinutes, 0, 100);
                }
                break;
            }
            case 'chatting': {
                const socialBonus = 1 + domains.X * 0.01 * 10;
                attrs.stress = clamp(attrs.stress - 0.2 * deltaMinutes * socialBonus, 0, 100);
                if (domains.X > 0.5) attrs.sanity = clamp(attrs.sanity + 0.1 * deltaMinutes, 0, 100);
                if (domains.X < -1.0) attrs.stress = clamp(attrs.stress + 0.1 * deltaMinutes, 0, 100);
                break;
            }
            case 'observing': {
                const sanityDrain = 1.5 * (1 + domains.O * 0.01 * 10);
                const stressGain = 1.0 * (1 - facets.fearfulness * 0.008 * 10);
                attrs.sanity = clamp(attrs.sanity - sanityDrain * deltaMinutes, 0, 100);
                attrs.stress = clamp(attrs.stress + stressGain * deltaMinutes, 0, 100);
                attrs.corruption = clamp(attrs.corruption + 0.2 * deltaMinutes, 0, 100);
                if (attrs.corruption > 50) attrs.lust = clamp(attrs.lust + 0.5 * deltaMinutes, 0, 100);
                break;
            }
        }
        return attrs;
    }

    private _updateStatusTags(
        maiden: Maiden,
        attrs: Maiden['attributes'],
        THRESHOLDS: typeof GAME_CONFIG.THRESHOLDS
    ): Set<CharacterStatus> {
        const statusSet = new Set(maiden.status);
        const activity = maiden.behavior.currentActivity;

        // 严格限制为基础合规的 ActivityStatus 集合枚举，去除无关属性避免篡改数据
        const activityStatuses: CharacterStatus[] = [
            'performing', 'confessing', 'anchoring', 'sleeping', 'eating', 'bathing', 'wandering', 'chatting', 'observing', 'normal'
        ];

        activityStatuses.forEach((s: CharacterStatus) => { if (s !== activity) statusSet.delete(s); });
        statusSet.add(activity);

        if (attrs.sanity < THRESHOLDS.SANITY_CRITICAL) statusSet.add('broken');
        else statusSet.delete('broken');
        if (attrs.lust > THRESHOLDS.LUST_HIGH) statusSet.add('aroused');
        else if (attrs.lust <= THRESHOLDS.LUST_NORMAL) statusSet.delete('aroused');
        if (attrs.stress > THRESHOLDS.STRESS_HIGH) statusSet.add('panicked');
        else if (attrs.stress <= CHANGE_THRESHOLDS.stressRelieved) statusSet.delete('panicked');
        // 每项状态都成对增删并留出滞回区间：只在阈值单侧增删会让标签永久驻留
        if (attrs.devotion > THRESHOLDS.DEVOTION_FANATIC) statusSet.add('devoted');
        else if (attrs.devotion <= CHANGE_THRESHOLDS.devotionCalm) statusSet.delete('devoted');
        if (attrs.corruption > THRESHOLDS.CORRUPTION_COMPLICIT) statusSet.add('complicit');
        else if (attrs.corruption <= CHANGE_THRESHOLDS.corruptionCleared) statusSet.delete('complicit');
        return statusSet;
    }

    private _updatePhysiology(maiden: Maiden, deltaMinutes: number, gameTimePassed: number): Maiden['physiology'] {
        const physiology = { ...maiden.physiology };
        const gameDeltaMs = deltaMinutes * 60 * 1000;
        const previousTime = gameTimePassed - gameDeltaMs;
        const daysToAdvance = Math.floor(gameTimePassed / TIME_CONFIG.MS_PER_DAY) - Math.floor(previousTime / TIME_CONFIG.MS_PER_DAY);
        if (daysToAdvance > 0) {
            physiology.cycleDay = ((physiology.cycleDay - 1 + daysToAdvance) % 28) + 1;
            physiology.isOvulating = physiology.cycleDay >= 12 && physiology.cycleDay <= 16;
            physiology.sensitivityMultiplier = this._calcSensitivity(physiology.cycleDay);
        }
        return physiology;
    }

    private _calcSensitivity(cycleDay: number): number {
        if (cycleDay >= 12 && cycleDay <= 16) {
            const distance = Math.abs(cycleDay - 14);
            // 排卵峰值 1.5，向两侧每天递减 0.1
            return 1.5 - (distance * 0.1);
        } else if (cycleDay >= 1 && cycleDay <= 4) {
            return 0.8 + (cycleDay * 0.025);
        } else if (cycleDay >= 25 && cycleDay <= 28) {
            return 0.85 + ((cycleDay - 25) * 0.033);
        }
        return 0.95 + (Math.sin((cycleDay - 4) * Math.PI / 21) * 0.15);
    }

    /**
     * 计算一次情境下的**维度**状态表达（§4.1），供状态偏离 D² 使用。
     *
     * 刻意与子维度级表达分开：D² 的卡方判据是针对 p = 6 个维度给出的
     * （§4.3.1 的分档表按 p = 6 与 p = 4 列出 80/95/99 分位）。若在 25 个子维度上
     * 累加，χ²₂₅ 的期望值就是 25，远超"常态范围"的 8.56，所有实体都会常驻极端档。
     *
     * 这里的线索与规范由子维度表按维度取均值得到，不另建一张表——两张表必然漂移。
     */
    private _expressDomains(
        facets: HexacoFacets,
        situation: SituationType,
        situationalStrength: number
    ): HexacoProfile {
        const strength = Math.max(0, Math.min(1, situationalStrength));
        const theta = deriveDomains(facets);
        const expressed = {} as HexacoProfile;

        for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
            const relevance = domainCueRelevance(situation, key);
            const gain = 1 + TRAIT_ACTIVATION_GAIN * (relevance - 0.5);
            expressed[key] = (1 - strength) * gain * theta[key] + strength * domainNormPressure(situation, key);
        }

        return expressed;
    }

    /**
     * 单次背离负荷 L（§4.2）。
     *
     * `L = ς · [Σ r·d / Σ r] · (1 − φ·Chosen)`，d_j = |n_j − θ_j|。
     * 用线索相关度加权，是因为与本人特质无关的规范并不构成背离。
     */
    private _computeDiscrepancyLoad(
        facets: HexacoFacets,
        situation: SituationType,
        situationalStrength: number
    ): number {
        const strength = Math.max(0, Math.min(1, situationalStrength));
        const cues = SITUATION_CUE_RELEVANCE[situation];
        const norms = SITUATION_NORM_PRESSURE[situation];

        let weightedSum = 0;
        let weightTotal = 0;

        for (const key of Object.keys(facets) as (keyof HexacoFacets)[]) {
            const relevance = cues[key] ?? 0;
            if (relevance <= 0) continue;
            const deviation = Math.abs((norms[key] ?? 0) - facets[key]);
            weightedSum += relevance * deviation;
            weightTotal += relevance;
        }

        if (weightTotal === 0) return 0;
        // 非自选场景（chosen = 0）下不折扣：调用点从不提供自选核心项目的语境
        return strength * (weightedSum / weightTotal);
    }

    /**
     * 负荷递推 `F_t = max(0, ρ·F_{t−1} + L_t − λ·N_t)`（§4.2）。
     *
     * 时间基是**游戏日**（ρ 的定义即"日际保持"），而调用方按帧推进，因此这里显式
     * 接收经过的天数并统一缩放三项。只缩放 L 会让 λ·N 以整日量级逐帧扣减，
     * 单帧净变化恒为负，`max(0, …)` 便把 F 永久钉在 0——P2 静默失效。
     *
     * 缩放方式是"保留按 ρ^Δ 指数衰减、负荷按 Δ 线性累加"。Δ = 1 天时与规范递推
     * 逐位相等；亚日步进则是把日粒度递推拆细，稳态 F* = (L − λ·N)·Δ / (1 − ρ^Δ)
     * 随 Δ 变化，Δ→0 时收敛到 (L − λ·N) / (−ln ρ)（Δ=1 时为 2.93，极限为 2.47）。
     * 这一离散化差异是规范只定义日粒度递推的必然结果，且 ρ 本身是 [D] 未校准默认值，
     * 故不做补偿；需要严格对齐规范时按整天调用即可。
     */
    private _accumulateLoad(
        previousLoad: number,
        load: number,
        restorativeAccess: number,
        elapsedDays: number
    ): number {
        if (elapsedDays <= 0) return previousLoad;
        const recovery = LOAD_PARAMS.recoveryEfficiency * Math.max(0, Math.min(1, restorativeAccess));
        const retention = Math.pow(LOAD_PARAMS.retention, elapsedDays);
        return Math.max(0, retention * previousLoad + (load - recovery) * elapsedDays);
    }

    /**
     * 状态偏离 D²（§4.3.1）：以**个人自己的分布**为参照。
     *
     * `D² = Σ_j ((x_j − θ_j) / σ_w,j)²`，在**维度**层求和使 D² ~ χ²₆，
     * 与 §4.3.1 的分档分位（8.56 / 12.59 / 16.81）对应。
     *
     * v1 用 α 的绝对阈值划分状态。α 是由特质算出的静态量，不可能在压力中"崩溃"，
     * 因此状态必须由"此刻相对个人基线的偏离"给出，而不是由 θ 的档位给出。
     */
    private _computeDeviationSquared(expressed: HexacoProfile, theta: HexacoProfile): number {
        let total = 0;
        for (const key of Object.keys(DOMAIN_FACETS) as (keyof HexacoProfile)[]) {
            const delta = (expressed[key] - theta[key]) / WITHIN_PERSON_SD;
            total += delta * delta;
        }
        return Math.round(total * 100) / 100;
    }

    /**
     * 长期特质漂移（§4.4 P4）：`θ(τ+1) = θ(τ) + a(age) + Σψ·E + ν·V + e`。
     *
     * 由于 facets 是唯一权威、其余派生值读取时重算，写回 θ 之后整条链
     * （维度 → 元因子 → 构型 → 代理 → 行为权重）会自动一致——这正是
     * "派生值不持久化"要买到的东西。
     */
    private _applyTraitDrift(facets: HexacoFacets, elapsedDays: number): HexacoFacets {
        const drifted = {} as HexacoFacets;
        const elapsedYears = elapsedDays / DAYS_PER_YEAR;

        for (const key of Object.keys(facets) as (keyof HexacoFacets)[]) {
            const current = facets[key];
            const ageDrift = (AGE_DRIFT_DIRECTION[key] ?? 0) * DRIFT_PARAMS.ageDriftPerYear * elapsedYears;
            // 向均值回归同样按年缩放，否则长时间跨度下会一次性抹平特质
            const regression = -current * DRIFT_PARAMS.regressionToMeanPerYear * elapsedYears;
            const drift = ageDrift + regression;

            // 不在此处做小数位取整：单帧漂移量约 1e-6，取整会把每一帧都抹回原值，
            // 于是漂移永远累积不起来（P4 静默失效）。显示时才取整。
            drifted[key] = Math.max(-DRIFT_PARAMS.clamp, Math.min(DRIFT_PARAMS.clamp, current + drift));
        }

        return drifted;
    }

    /**
     * 推进过程平面：背离负荷（P2）、状态偏离（P3）、长期漂移（P4）。
     *
     * 唯一的写入点：`dynamics` 只在这里被改写，其余读取派生值的调用点走
     * `PersonalityView`。v1 在此同时改写 traitFatigue 与 shadowActivation，
     * 又把 currentState 按 α 的绝对阈值迁移——α 是静态量，不可能"崩溃"，
     * 于是状态与特质长期互相矛盾（§4.3.1）。
     *
     * 推进量取自 `maiden.lastUpdateTime` 与 `dynamics.lastDriftTime` 之差，而不是
     * 本帧的 deltaMinutes：P2 的 ρ 是"日际保持"，用帧长当步长会让负荷随帧率变化。
     */
    private _updatePersonalityState(
        maiden: Maiden,
        carriage: Carriage
    ): Maiden['isshex'] {
        const view = personalityView(maiden);
        const situation = CARRIAGE_SITUATION_MAP[carriage.type];
        const strength = SITUATION_STRENGTH[carriage.type];

        // 时间基：P2 的 ρ 与 P4 的漂移率都以**游戏日**定义，因此两者共用
        // lastDriftTime 这一个时钟，按实际经过的天数推进，与调用频率无关
        const elapsedDays = (maiden.lastUpdateTime - view.dynamics.lastDriftTime) / TIME_CONFIG.MS_PER_DAY;
        if (elapsedDays <= 0) return maiden.isshex;

        // P1：本时点的状态表达与情境期待
        const expressedDomains = this._expressDomains(maiden.isshex.facets, situation, strength);
        const thetaDomains = view.domains;

        // P2：背离负荷。被监视的公开场合、且非自选时负荷最高
        const load = this._computeDiscrepancyLoad(maiden.isshex.facets, situation, strength);
        const restored = this._accumulateLoad(
            view.dynamics.discrepancyLoad,
            load,
            RESTORATIVE_ACCESS[maiden.behavior.currentActivity] ?? 0.2,
            elapsedDays
        );

        // P3：状态偏离相对个人基线分档；压力放大威胁评价（§4.3.2 的 η 项，取 0.25）
        const threatBias = 1 + 0.25 * maiden.isshex.facets.anxiety;
        const deviationSquared = this._computeDeviationSquared(expressedDomains, thetaDomains) * Math.max(0, threatBias);

        // P4：长期漂移
        const facets = this._applyTraitDrift(maiden.isshex.facets, elapsedDays);

        return {
            facets,
            dynamics: {
                discrepancyLoad: restored,
                deviationSquared,
                lastDriftTime: maiden.lastUpdateTime,
            },
        };
    }

    /**
     * 对比同一实体的前后快照，产出可直接写入日志的状态变化列表。
     * 每个变化都带 old/new 值，供日志与 UI 呈现；只在阈值被跨越时产生条目。
     */
    compareStates(before: Maiden, after: Maiden): StateChange[] {
        const changes: StateChange[] = [];
        const currentCarriageId = getCurrentCarriageId(after);
        const base = { maidenId: after.id, maidenName: after.name, carriageId: currentCarriageId };

        const { sanityCritical, sanityRecovered } = CHANGE_THRESHOLDS;
        if (before.attributes.sanity >= sanityCritical && after.attributes.sanity < sanityCritical) {
            changes.push({ ...base, changeType: 'sanity_critical', description: `${after.name} 的理智跌破临界值，陷入崩溃边缘`, logType: 'abyss', oldValue: before.attributes.sanity, newValue: after.attributes.sanity });
        } else if (before.attributes.sanity < sanityRecovered && after.attributes.sanity >= sanityRecovered) {
            changes.push({ ...base, changeType: 'sanity_recovered', description: `${after.name} 的理智逐渐恢复`, logType: 'system', oldValue: before.attributes.sanity, newValue: after.attributes.sanity });
        }

        const { stressHigh, stressRelieved } = CHANGE_THRESHOLDS;
        if (before.attributes.stress < stressHigh && after.attributes.stress >= stressHigh) {
            changes.push({ ...base, changeType: 'stress_high', description: `${after.name} 压力过大，开始颤抖`, logType: 'narrative', oldValue: before.attributes.stress, newValue: after.attributes.stress });
        } else if (before.attributes.stress >= stressRelieved && after.attributes.stress < stressRelieved) {
            changes.push({ ...base, changeType: 'stress_relieved', description: `${after.name} 的压力得到缓解`, logType: 'system' });
        }

        if (before.attributes.lust < CHANGE_THRESHOLDS.lustHigh && after.attributes.lust >= CHANGE_THRESHOLDS.lustHigh) {
            changes.push({ ...base, changeType: 'lust_high', description: `${after.name} 面色潮红，呼吸急促`, logType: 'narrative' });
        }
        if (before.attributes.hunger < CHANGE_THRESHOLDS.hungerUrgent && after.attributes.hunger >= CHANGE_THRESHOLDS.hungerUrgent) {
            changes.push({ ...base, changeType: 'hunger_urgent', description: `${after.name} 饥肠辘辘，急需进食`, logType: 'system' });
        }
        if (before.attributes.fatigue < CHANGE_THRESHOLDS.fatigueExhausted && after.attributes.fatigue >= CHANGE_THRESHOLDS.fatigueExhausted) {
            changes.push({ ...base, changeType: 'fatigue_exhausted', description: `${after.name} 疲惫不堪，几乎无法站立`, logType: 'system' });
        }
        if (before.attributes.hygiene > CHANGE_THRESHOLDS.hygieneDirty && after.attributes.hygiene <= CHANGE_THRESHOLDS.hygieneDirty) {
            changes.push({ ...base, changeType: 'hygiene_dirty', description: `${after.name} 急需清洁`, logType: 'system' });
        }

        // 活动变化
        if (before.behavior.currentActivity !== after.behavior.currentActivity) {
            if (TRACKABLE_ACTIVITIES.includes(before.behavior.currentActivity)) {
                const endDesc = this._getActivityEndDesc(before, after);
                if (endDesc) changes.push({ ...base, changeType: 'activity_ended', description: endDesc, logType: this._activityLogType(before.behavior.currentActivity), oldValue: before.behavior.currentActivity });
            }
            if (TRACKABLE_ACTIVITIES.includes(after.behavior.currentActivity)) {
                changes.push({ ...base, changeType: 'activity_started', description: this._getActivityStartDesc(after), logType: this._activityLogType(after.behavior.currentActivity), newValue: after.behavior.currentActivity });
            }
        }

        // 社交结束
        const bc = before.behavior.socialContext, ac = after.behavior.socialContext;
        if (bc?.targetId && !ac?.targetId && bc?.targetName) {
            const endDesc = this._getSocialEndDesc(before);
            if (endDesc) changes.push({ ...base, changeType: 'social_ended', description: endDesc, logType: 'social', oldValue: bc.targetId });
        }

        // 位置变化
        const oldLoc = getCurrentCarriageId(before), newLoc = getCurrentCarriageId(after);
        if (oldLoc !== newLoc) {
            changes.push({ ...base, changeType: 'location_changed', description: `${after.name} 移动到了新的车厢`, logType: 'movement', oldValue: oldLoc, newValue: newLoc });
        }

        // 排卵
        if (!before.physiology.isOvulating && after.physiology.isOvulating) {
            changes.push({ ...base, changeType: 'ovulation_start', description: `${after.name} 进入排卵期`, logType: 'system' });
        } else if (before.physiology.isOvulating && !after.physiology.isOvulating) {
            changes.push({ ...base, changeType: 'ovulation_end', description: `${after.name} 排卵期结束`, logType: 'system' });
        }

        // 状态标签
        const beforeStatus = new Set(before.status), afterStatus = new Set(after.status);
        for (const status of afterStatus) {
            if (!beforeStatus.has(status) && !INSIGNIFICANT_STATUSES.includes(status)) {
                changes.push({ ...base, changeType: 'status_added', description: `${after.name} ${this._statusDesc(status, true)}`, logType: this._statusLogType(status), newValue: status });
            }
        }
        for (const status of beforeStatus) {
            if (!afterStatus.has(status) && !INSIGNIFICANT_STATUSES.includes(status)) {
                changes.push({ ...base, changeType: 'status_removed', description: `${after.name} ${this._statusDesc(status, false)}`, logType: 'system', oldValue: status });
            }
        }

        return changes;
    }

    private _activityLogType(activity: CharacterStatus): LogType {
        switch (activity) {
            case 'confessing': case 'devoted': return 'ritual';
            case 'observing': return 'abyss';
            case 'performing': return 'narrative';
            default: return 'movement';
        }
    }

    private _getActivityStartDesc(maiden: Maiden): string {
        const activity = maiden.behavior.currentActivity;
        const options = ACTIVITY_START_DESCRIPTIONS[activity];
        if (options?.length) return options[Math.floor(Math.random() * options.length)].replace(/\${name}/g, maiden.name);
        return `${maiden.name} 开始${CHARACTER_STATUS_NAMES[activity] || '活动'}`;
    }

    private _getActivityEndDesc(before: Maiden, after: Maiden): string | null {
        const activity = before.behavior.currentActivity;
        const durationMinutes = Math.floor(before.behavior.activityDuration / 60000);
        const options = ACTIVITY_END_DESCRIPTIONS[activity];
        if (options?.length) {
            const base = options[Math.floor(Math.random() * options.length)].replace(/\${name}/g, after.name);
            return durationMinutes > 30 ? `${base}（持续了约${durationMinutes}分钟）` : base;
        }
        return null;
    }

    private _getSocialEndDesc(maiden: Maiden): string | null {
        const context = maiden.behavior.socialContext;
        if (!context?.targetName) return null;
        const { targetName, interactionType } = context;
        const descriptions: Partial<Record<SocialInteractionType, string[]>> = {
            chat: [`${maiden.name} 与 ${targetName} 结束了交谈`, `${maiden.name} 和 ${targetName} 的对话告一段落`],
            comfort: [`${maiden.name} 轻轻拍了拍 ${targetName}，安慰结束`],
            gossip: [`${maiden.name} 和 ${targetName} 停止了窃窃私语`],
            argue: [`${maiden.name} 与 ${targetName} 的争执平息了`, `${maiden.name} 和 ${targetName} 不再争吵`],
            bully: [`${maiden.name} 终于放过了 ${targetName}`],
            seduce: [`${maiden.name} 与 ${targetName} 之间的暧昧气氛消散了`],
            confide: [`${maiden.name} 向 ${targetName} 的倾诉结束了`],
            pray: [`${maiden.name} 与 ${targetName} 结束了共同祈祷`],
            huddle: [`${maiden.name} 和 ${targetName} 分开了`, `${maiden.name} 与 ${targetName} 不再依偎`],
        };
        if (interactionType && descriptions[interactionType]) {
            const opts = descriptions[interactionType]!;
            return opts[Math.floor(Math.random() * opts.length)];
        }
        return `${maiden.name} 与 ${targetName} 的互动结束了`;
    }

    private _statusDesc(status: CharacterStatus, added: boolean): string {
        const descriptions: Record<CharacterStatus, [string, string]> = {
            'panicked': ['陷入惊恐', '从惊恐中恢复'], 'aroused': ['情欲高涨', '欲望平息'],
            'broken': ['精神崩溃', '精神逐渐恢复'], 'injured': ['受伤了', '伤势痊愈'],
            'pregnant': ['怀孕了', '不再怀孕'], 'euphoric': ['陷入极度愉悦', '从愉悦中清醒'],
            'dissociated': ['意识开始游离', '意识恢复清醒'], 'complicit': ['成为堕落共犯', '不再是共犯'],
            'devoted': ['变得虔诚', '虔诚消退'], 'voyeur': ['成为窥视者', '不再窥视'],
            'deaconess': ['晋升为执事', '失去执事身份'], 'gestating': ['开始孕育', '孕育结束'],
            'performing': ['开始表演', '表演结束'], 'confessing': ['开始忏悔', '忏悔结束'],
            'anchoring': ['开始锚定', '锚定结束'], 'normal': ['恢复正常', '状态异常'],
            'sleeping': ['开始睡眠', '醒来'], 'eating': ['开始进食', '进食结束'],
            'bathing': ['开始沐浴', '沐浴结束'], 'wandering': ['开始游荡', '停止游荡'],
            'chatting': ['开始交谈', '交谈结束'], 'observing': ['开始观测深渊', '停止观测深渊'],
        };
        const [addDesc, removeDesc] = descriptions[status] || ['状态变化', '状态恢复'];
        return added ? addDesc : removeDesc;
    }

    private _statusLogType(status: CharacterStatus): LogType {
        switch (status) {
            case 'broken': case 'dissociated': case 'observing': return 'abyss';
            case 'devoted': case 'deaconess': return 'ritual';
            case 'aroused': case 'euphoric': return 'narrative';
            default: return 'system';
        }
    }

    decideMaidenBehavior(
        maiden: Maiden,
        currentCarriage: Carriage,
        allCarriages: Map<string, Carriage>,
        allMaidens: Map<string, Maiden>,
        gameTimePassed: number
    ) {
        return this.behavior.decideMaidenBehavior(
            maiden, currentCarriage, allCarriages, allMaidens, gameTimePassed
        );
    }

    processSocialInteractions(
        maiden: Maiden,
        othersInCarriage: string[],
        allMaidens: Map<string, Maiden>,
        carriage: Carriage,
        gameTimePassed: number
    ) {
        return this.socialization.processSocialInteractions(
            maiden, othersInCarriage, allMaidens, carriage, gameTimePassed
        );
    }

    /**
     * 水仙协议单帧推进：已在协议中则推进褪色，否则按稀有概率尝试触发。
     * 返回的 `maidenUpdate` 必须由调用方合并进实体——本方法不直接改写入参。
     */
    processNarcissusLogic(
        maiden: Maiden,
        gameTimePassed: number
    ): { log?: string; maidenUpdate?: Partial<Maiden> } {
        // 已在协议中：推进褪色。终态（returned/rejected）由 updateFading 自行拒绝，
        // 因此这里无需再判一次阶段。
        if (this.narcissus.isInProtocol(maiden)) {
            const fadingResult = this.narcissus.updateFading(maiden, gameTimePassed);
            if (!fadingResult.updatedState) return {};

            const maidenUpdate: Partial<Maiden> = { narcissusState: fadingResult.updatedState };
            // 仅在阶段真正切换时输出叙述，避免每帧刷屏
            if (fadingResult.stageChanged && fadingResult.description) {
                return { log: `>>> 水仙平原 >>> ${fadingResult.description}`, maidenUpdate };
            }
            return { maidenUpdate };
        }

        // 未在协议中：按稀有概率尝试触发
        if (this.narcissus.shouldAutonomousTrigger(maiden, gameTimePassed)) {
            const result = this.narcissus.initiateProtocol(maiden, gameTimePassed);
            if (result.success) {
                return {
                    log: `>>> 异常波动检测 >>> ${result.description}`,
                    maidenUpdate: result.maidenUpdate,
                };
            }
        }
        return {};
    }

    /** 卡片列表所需的轻量投影，避免把完整实体传进 UI 层 */
    getMaidenSummaries(maidens: Map<string, Maiden>): MaidenSummary[] {
        return Array.from(maidens.values()).map(m => ({
            id: m.id,
            name: m.name,
            carriageId: m.movement.currentCarriageId,
            status: m.status,
            sanity: m.attributes.sanity,
            currentActivity: m.behavior.currentActivity,
        }));
    }

}

export const maidenSystem = new MaidenSystem();
