// ============================================
// 车厢系统 - 负责网格生成与管理
// Carriage System - Grid generation & management
// ============================================

import {
    Carriage,
    SystemState,
    GameEvent,
    StateUpdaters,
} from '../../meta';
import { randomInt, shuffleArray } from '../../const';
import {
    BASE_FILL_TEMPLATE_ID,
    SANCTUARY_CONFIG,
    ABYSS_TIERS,
    GAME_CONFIG,
    getCarriageTemplate,
    isAbyssTemplate,
    isTemplateAccessible,
} from '../../constants';

/**
 * 连通性校验期间把待测格临时标为深渊用的占位值。
 * 用哨兵而不是借用某个深渊模板 id，避免"删掉那个模板后这里静默失效"。
 */
const ABYSS_PLACEHOLDER = '__ABYSS__';

/** 该格是不是圣所；连通性计算与邻居扫描都以此为准 */
const isSanctuaryCell = (templateId: string): boolean =>
    templateId !== ABYSS_PLACEHOLDER && !isAbyssTemplate(templateId);


/**
 * 系统事件触发概率配置
 */
export const SYSTEM_EVENT_PROBABILITIES = {
    // 基础系统事件检查概率（每帧调用时的触发概率）
    BASE_SYSTEM_EVENT_CHECK: 0.02, // 2% 概率检查是否触发系统事件

    // 具体系统事件的触发条件概率
    HUB_ANOMALY: {
        // 触发条件：熵值 > 80
        ENTROPY_THRESHOLD: 80,
        // 触发概率：当满足条件时的触发概率
        TRIGGER_PROBABILITY: 0.08, // 8% 概率
    },

    RESONANCE_SURGE: {
        // 触发条件：共振频率 < 10
        RESONANCE_THRESHOLD: 10,
        // 触发概率：当满足条件时的触发概率
        TRIGGER_PROBABILITY: 0.04, // 4% 概率
    },

    // 个人事件概率
    BREAKDOWN: {
        // 触发条件：理智 < 20 且未处于崩溃状态
        SANITY_THRESHOLD: 20,
        // 触发概率：当满足条件时的触发概率
        TRIGGER_PROBABILITY: 0.03, // 3% 概率
    },
};

/**
 * 检查是否应该触发系统事件
 * @param systemState 系统状态
 * @returns 是否应该触发系统事件检查
 */
export function shouldCheckSystemEvents(systemState: any): boolean {
    return Math.random() < SYSTEM_EVENT_PROBABILITIES.BASE_SYSTEM_EVENT_CHECK;
}

/**
 * 检查是否应该触发枢纽异常事件
 * @param entropyLevel 当前熵值
 * @returns 是否应该触发枢纽异常
 */
export function shouldTriggerHubAnomaly(entropyLevel: number): boolean {
    const config = SYSTEM_EVENT_PROBABILITIES.HUB_ANOMALY;
    return entropyLevel > config.ENTROPY_THRESHOLD && Math.random() < config.TRIGGER_PROBABILITY;
}

/**
 * 检查是否应该触发共振激增事件
 * @param resonanceFrequency 当前共振频率
 * @returns 是否应该触发共振激增
 */
export function shouldTriggerResonanceSurge(resonanceFrequency: number): boolean {
    const config = SYSTEM_EVENT_PROBABILITIES.RESONANCE_SURGE;
    return resonanceFrequency < config.RESONANCE_THRESHOLD && Math.random() < config.TRIGGER_PROBABILITY;
}


class CarriageSystem {

    // ============================================
    // 生成车厢网格 - 雕刻法
    // 1. 全盘填充基准圣所
    // 2. 替换特殊圣所
    // 3. 雕刻深渊：替换圣所为深渊，确保不破坏连通性
    // ============================================

    generateGrid(): Map<string, Carriage> {
        const carriages = new Map<string, Carriage>();
        const rows = GAME_CONFIG.GRID_ROWS;
        const cols = GAME_CONFIG.GRID_COLS;

        // 初始化网格基底
        const grid: string[][] = Array(rows).fill(null).map(() => Array(cols).fill(BASE_FILL_TEMPLATE_ID));

        this.distributeSpecialSanctuaries(grid, rows, cols);
        this.carveAbyss(grid, rows, cols);
        this.buildMap(grid, carriages, rows, cols);

        return carriages;
    }

    // ============================================
    // 分布特殊圣所
    // ============================================

    private distributeSpecialSanctuaries(grid: string[][], rows: number, cols: number): void {
        const configs = SANCTUARY_CONFIG.filter(c => c.templateId !== BASE_FILL_TEMPLATE_ID);

        for (const config of configs) {
            const count = randomInt(config.minCount, config.maxCount);
            let placed = 0;
            let attempts = 0;

            // 限定最高尝试阈值阻断死循环
            while (placed < count && attempts < 200) {
                const r = randomInt(0, rows - 1);
                const c = randomInt(0, cols - 1);

                if (grid[r][c] === BASE_FILL_TEMPLATE_ID) {
                    grid[r][c] = config.templateId;
                    placed++;
                }
                attempts++;
            }
        }
    }

    // ============================================
    // 雕刻深渊 (核心约束逻辑)
    // ============================================

    private carveAbyss(grid: string[][], rows: number, cols: number): void {
        // 预计算基准圣所总数水位线
        let currentSanctuaryCount = rows * cols;

        for (const tier of ABYSS_TIERS) {
            const totalCount = randomInt(tier.totalCount.min, tier.totalCount.max);
            const types = shuffleArray([...tier.templateIds]);

            let placedTotal = 0;
            let typeIndex = 0;
            let attempts = 0;

            while (placedTotal < totalCount && attempts < 500) {
                const abyssType = types[typeIndex % types.length];
                const r = randomInt(0, rows - 1);
                const c = randomInt(0, cols - 1);

                if (isSanctuaryCell(grid[r][c])) {
                    if (this.canPlaceAbyss(grid, r, c, rows, cols, currentSanctuaryCount - 1)) {
                        grid[r][c] = abyssType;
                        currentSanctuaryCount--;
                        placedTotal++;
                        typeIndex++;
                    }
                }
                attempts++;
            }
        }
    }

    /**
     * 拓扑破坏安全校验
     */
    private canPlaceAbyss(
        grid: string[][],
        r: number,
        c: number,
        rows: number,
        cols: number,
        expectedSanctuaryCount: number
    ): boolean {
        const originalType = grid[r][c];
        grid[r][c] = ABYSS_PLACEHOLDER;

        let hasSanctuaryNeighbor = false;
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                if (isSanctuaryCell(grid[nr][nc])) {
                    hasSanctuaryNeighbor = true;
                    break;
                }
            }
        }

        if (!hasSanctuaryNeighbor) {
            grid[r][c] = originalType;
            return false;
        }

        const isConnected = this.checkSanctuaryConnectivity(grid, rows, cols, expectedSanctuaryCount);
        grid[r][c] = originalType;

        return isConnected;
    }

    /**
     * 基于预期容量断言的连通性泛洪扫描
     */
    private checkSanctuaryConnectivity(
        grid: string[][],
        rows: number,
        cols: number,
        expectedCount: number
    ): boolean {
        if (expectedCount === 0) return true;

        let startNode: { r: number; c: number } | null = null;

        // 定位首个活跃圣所切入点
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (isSanctuaryCell(grid[r][c])) {
                    startNode = { r, c };
                    break;
                }
            }
            if (startNode) break;
        }

        if (!startNode) return false;

        const visited = new Set<string>();
        const queue = [startNode];
        visited.add(`${startNode.r},${startNode.c}`);

        let visitedCount = 1;
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        let head = 0;

        while (head < queue.length) {
            const curr = queue[head++];

            for (const [dr, dc] of directions) {
                const nr = curr.r + dr;
                const nc = curr.c + dc;

                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (isSanctuaryCell(grid[nr][nc])) {
                        const key = `${nr},${nc}`;
                        if (!visited.has(key)) {
                            visited.add(key);
                            visitedCount++;
                            queue.push({ r: nr, c: nc });
                        }
                    }
                }
            }
        }

        return visitedCount === expectedCount;
    }

    // ============================================
    // 构建域模型 Map
    // ============================================

    private buildMap(grid: string[][], carriages: Map<string, Carriage>, rows: number, cols: number): void {
        const typeCounters = new Map<string, number>();

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const id = `R${row}C${col}`;
                const templateId = grid[row][col];
                const template = getCarriageTemplate(templateId);

                if (!template) continue;

                const currentCount = (typeCounters.get(templateId) || 0) + 1;
                typeCounters.set(templateId, currentCount);

                carriages.set(id, {
                    id,
                    position: { row, col },
                    templateId,
                    name: `${template.nameCN} #${currentCount}`,
                    category: template.category,
                    occupants: [],
                    isAccessible: isTemplateAccessible(templateId),
                    lastHubShuffle: Date.now(),
                    ambientSoundId: template.ambientSound,
                });
            }
        }
    }

    // ============================================
    // 拓扑隔离重组 (Hub Shuffle)
    // ============================================

    /**
     * 执行同态矩阵置换，保障网格物理连通性
     */
    shuffle(carriages: Map<string, Carriage>): void {
        const keys = Array.from(carriages.keys());
        const shuffleCount = 10 + Math.floor(Math.random() * 20);

        const sanctuaryKeys = keys.filter(k => carriages.get(k)!.category === 'sanctuary');
        const abyssKeys = keys.filter(k => carriages.get(k)!.category === 'abyss');

        const swapInGroup = (groupKeys: string[]) => {
            if (groupKeys.length < 2) return;
            const idx1 = Math.floor(Math.random() * groupKeys.length);
            let idx2 = Math.floor(Math.random() * groupKeys.length);
            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * groupKeys.length);
            }
            this.swapCarriageAttributes(carriages, groupKeys[idx1], groupKeys[idx2]);
        };

        for (let i = 0; i < shuffleCount; i++) {
            // 偏向圣所重组
            if (Math.random() > 0.3 && sanctuaryKeys.length >= 2) {
                swapInGroup(sanctuaryKeys);
            } else if (abyssKeys.length >= 2) {
                swapInGroup(abyssKeys);
            }
        }
    }

    private swapCarriageAttributes(carriages: Map<string, Carriage>, key1: string, key2: string): void {
        const c1 = carriages.get(key1)!;
        const c2 = carriages.get(key2)!;

        const updatedC1 = { ...c1, occupants: [...c1.occupants], position: { ...c1.position } };
        const updatedC2 = { ...c2, occupants: [...c2.occupants], position: { ...c2.position } };

        const tempType = updatedC1.templateId;
        const tempName = updatedC1.name;
        const tempCategory = updatedC1.category;
        const tempAmbient = updatedC1.ambientSoundId;
        const tempIsAccessible = updatedC1.isAccessible;

        updatedC1.templateId = updatedC2.templateId;
        updatedC1.name = updatedC2.name;
        updatedC1.category = updatedC2.category;
        updatedC1.ambientSoundId = updatedC2.ambientSoundId;
        updatedC1.isAccessible = updatedC2.isAccessible;
        updatedC1.lastHubShuffle = Date.now();

        updatedC2.templateId = tempType;
        updatedC2.name = tempName;
        updatedC2.category = tempCategory;
        updatedC2.ambientSoundId = tempAmbient;
        updatedC2.isAccessible = tempIsAccessible;
        updatedC2.lastHubShuffle = Date.now();

        carriages.set(key1, updatedC1);
        carriages.set(key2, updatedC2);
    }

    // ============================================
    // 空间寻径与网格导航 (Pathfinding)
    // ============================================

    /**
     * 获取安全可达的最短网格拓扑路径
     */
    findPath(
        carriages: Map<string, Carriage>,
        startId: string,
        targetId: string,
        avoidAbyss: boolean = true
    ): string[] | null {
        if (!carriages.has(startId) || !carriages.has(targetId)) return null;
        if (startId === targetId) return [startId];

        const targetCarriage = carriages.get(targetId)!;
        const startCarriage = carriages.get(startId)!;

        const forceAllowAbyss = !avoidAbyss || targetCarriage.category === 'abyss' || startCarriage.category === 'abyss';

        const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
        const visited = new Set<string>([startId]);
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        let head = 0;
        while (head < queue.length) {
            const { id, path } = queue[head++];
            if (id === targetId) return path;

            const carriage = carriages.get(id)!;
            const { row, col } = carriage.position;

            for (const [dr, dc] of directions) {
                const nr = row + dr;
                const nc = col + dc;
                const nextId = `R${nr}C${nc}`;

                if (!visited.has(nextId) && carriages.has(nextId)) {
                    const nextCarriage = carriages.get(nextId)!;

                    if (nextCarriage.isAccessible) {
                        // 深渊阻断验证
                        if (!forceAllowAbyss && nextCarriage.category === 'abyss' && nextId !== targetId) {
                            continue;
                        }

                        visited.add(nextId);
                        queue.push({ id: nextId, path: [...path, nextId] });
                    }
                }
            }
        }

        return null;
    }

    // ============================================
    // 域方法
    // ============================================

    getTemplate(templateId: string) {
        return getCarriageTemplate(templateId);
    }

    isAbyss(templateId: string): boolean {
        return isAbyssTemplate(templateId);
    }

    // ============================================
    // 系统异常检测 (System Anomaly Detection)
    // ============================================

    checkSystemAnomalies(systemState: SystemState): GameEvent[] {
        const events: GameEvent[] = [];

        if (shouldCheckSystemEvents(systemState)) {
            if (shouldTriggerHubAnomaly(systemState.entropyLevel)) {
                events.push(this.createHubAnomalyEvent());
            }

            if (shouldTriggerResonanceSurge(systemState.resonanceFrequency)) {
                events.push(this.createResonanceSurgeEvent());
            }
        }

        return events;
    }

    private createHubAnomalyEvent(): GameEvent {
        return {
            type: 'hub_anomaly',
            description: '警告：熵值过高。枢纽系统检测到空间异常，即将进行强制重组。',
            effects: [
                { type: 'system', target: 'system', key: 'hubShuffle', value: true },
            ],
            logType: 'system',
        };
    }

    private createResonanceSurgeEvent(): GameEvent {
        return {
            type: 'resonance',
            description: '共振圣歌达到临界频率。所有单位进入高度敏感状态。',
            effects: [
                { type: 'system', target: 'system', key: 'resonanceSurge', value: true },
            ],
            logType: 'system',
        };
    }

    // ============================================
    // 系统效果应用 (System Effect Application)
    // ============================================

    /**
     * 应用一条系统效果。
     *
     * 返回需要播放的音效名，由调用方交给音频服务——系统层不得依赖服务层，
     * 否则 `systems → services → systems` 成环，模块初始化顺序一变就取到
     * 尚未定义的单例。音效是副作用，本来就该由驱动方播放。
     *
     * 另外：数值更新与副作用必须分开。`updateSystemState` 的更新函数会被
     * React 重放（StrictMode 下的 eagerState 试算与双调用），把 addLog 与
     * 音频播放写在里面会让同一事件重复播报、重复发声。
     */
    applySystemEffect(
        key: string,
        value: any,
        updaters: StateUpdaters
    ): string[] {
        const sounds: string[] = [];

        updaters.updateSystemState(prev => {
            const newState = { ...prev };

            // 基础数值更新
            if (key === 'gracePoolSize' && typeof value === 'number') {
                newState.gracePoolSize = Math.max(0, newState.gracePoolSize + value);
            }

            // 处理共振激增 (resonanceSurge)
            if (key === 'resonanceSurge' && value === true) {
                newState.resonanceFrequency = 35;
            }

            // 处理枢纽重组带来的熵值减少
            if (key === 'hubShuffle' && value === true) {
                newState.entropyLevel = Math.max(0, newState.entropyLevel - 20);
            }

            return newState;
        });

        if (key === 'resonanceSurge' && value === true) {
            sounds.push('resonance');
            updaters.addLog('system', '>>> 共振激增 >>> 频率已自动重置为安全水平 (35Hz)', 'SYSTEM');
        }

        // 处理枢纽重组 (Hub Shuffle)
        if (key === 'hubShuffle' && value === true) {
            updaters.updateCarriages(prev => {
                const newMap = new Map(prev);
                this.shuffle(newMap);
                return newMap;
            });
            sounds.push('hub_shuffle');
            updaters.addLog('system', '>>> 枢纽异常 >>> 熵值过载引发空间强制重组', 'SYSTEM');
        }

        return sounds;
    }
}

export const carriageSystem = new CarriageSystem();