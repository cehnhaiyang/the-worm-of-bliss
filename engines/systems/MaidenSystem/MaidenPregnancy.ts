import {
    Maiden,
    PregnancyStage,
    PregnancyState,
    PregnancyEvent,
    clamp,
    probabilityCheck,
    randomElement
} from '../../../meta';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const TOTAL_PREGNANCY_WEEKS = 40;
const ABORTION_RISK_THRESHOLD = 85;

/**
 * @少女怀孕系统 - 生育循环模拟
 */
export class MaidenPregnancy {
    /**
     * 受孕检测
     * 结合生理特征与当前维生属性，测算是否触发新循环。
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
        const expectedBirthTime = gameTimePassed + TOTAL_PREGNANCY_WEEKS * MS_PER_WEEK;

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
     * 获取妊娠对基础维生属性的平滑影响乘区
     */
    getPregnancyImpacts(weekNumber: number): { hungerMod: number; fatigueMod: number; mobilityMod: number } {
        if (weekNumber <= 0) return { hungerMod: 1, fatigueMod: 1, mobilityMod: 1 };

        let hungerMod = 1.0;
        let fatigueMod = 1.0;
        let mobilityMod = 1.0;

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
            // 晚期：负担极重，移动受限
            const progress = Math.min(1.0, (weekNumber - 28) / 12);
            hungerMod = 1.5 - (progress * 0.3);   // 降至 1.2
            fatigueMod = 1.1 + (progress * 0.5);  // 升至 1.6
            mobilityMod = 1.0 - (progress * 0.5); // 最低 0.5
        }

        return { hungerMod, fatigueMod, mobilityMod };
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
        if (weekNumber >= 4 && !state.isDiscovered) {
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
        if (weekNumber === 12) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}的下腹部已经微微隆起，孕育的痕迹无法再被隐瞒。`,
                weekNumber,
                logType: 'narrative',
            };
        }

        if (weekNumber === 20) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}第一次真切地感受到了腹中生命的反叛悸动。`,
                weekNumber,
                logType: 'narrative',
            };
        }

        if (weekNumber === 36) {
            return {
                type: 'milestone',
                maidenId: maiden.id,
                description: `${maiden.name}沉重的身躯已经为即将到来的分娩做好了祭献的准备。`,
                weekNumber,
                logType: 'ritual',
            };
        }

        if (weekNumber >= 40 && state.stage !== 'labor') {
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
        if (probabilityCheck(0.03) && state.healthRisk > 40) {
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
            healthRisk = clamp(state.healthRisk + 15, 0, 100);
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

    // ============================================
    // 状态查询器
    // ============================================

    isPregnant(maiden: Maiden): boolean {
        return maiden.physiology.pregnancy !== null && maiden.physiology.pregnancy !== undefined;
    }

    getPregnancyState(maiden: Maiden): PregnancyState | undefined {
        return maiden.physiology.pregnancy || undefined;
    }

    getPregnancyWeek(maiden: Maiden): number {
        const state = maiden.physiology.pregnancy;
        return state ? Math.floor(state.weekNumber) : 0;
    }

    isInLabor(maiden: Maiden): boolean {
        return maiden.physiology.pregnancy?.stage === 'labor';
    }

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
     * 同步状态至 Maiden 对象层
     * 保障属性与外部状态机的绝对一致性，严格遵循防劣化约束。
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
        if (state.isDiscovered) {
            newStatus.add('pregnant');
        }
        if (state.stage === 'late' || state.stage === 'labor') {
            newStatus.add('gestating');
        }

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

export const maidenPregnancy = new MaidenPregnancy();