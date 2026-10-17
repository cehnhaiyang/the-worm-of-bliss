// ============================================
// 角色阶级定义 (Rank Definitions)
// ============================================

import { CharacterRank, RankDefinition } from '../meta';

/**
 * 七个档位的全部内容。
 *
 * 键的书写顺序即等级升序，`order` 与之一致：提示词与列表都直接按这个顺序消费。
 * 篡改权限沿档位单调扩张，每一级新增一类可改写的要素：
 * 词汇 → 情绪评价 → 细节 → 对象 → 主客体 → 现实。
 */
export const RANK_DEFINITIONS: Record<CharacterRank, RankDefinition> = {
    unranked: {
        order: 0,
        nameCN: '无环',
        icon: '0',
        listColor: 'text-zinc-500',
        badgeClass: 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40',
        portraitPrompt: '',
        tamper: {
            canTamper: false,
            canImplant: false,
            capability: 'none',
            description: '权限不足 (需锡环及以上)',
        },
        ceremonyText: [],
    },
    tin: {
        order: 1,
        nameCN: '锡环',
        icon: 'I',
        listColor: 'text-slate-400',
        badgeClass: 'bg-slate-800/70 text-slate-400 border border-slate-600/40',
        portraitPrompt: 'wearing a plain tin collar, flat cold lighting',
        tamper: {
            canTamper: true,
            canImplant: false,
            capability: 'lexical',
            description: '词汇替换：只能替换形容词、称谓与语气词。不能增删任何事件要素。',
        },
        ceremonyText: [
            '{name}被套上锡环。最廉价的金属贴着她的喉咙，提醒她连被伤害的资格都要争取。',
            '锡环在{name}的颈上留下一道浅痕。她学会了低头，因为抬头没有用。',
        ],
        promotionBroadcast: '【系统广播】锡环已下发。她第一次拥有了被记录的资格。',
    },
    iron: {
        order: 2,
        nameCN: '铁环',
        icon: 'II',
        listColor: 'text-stone-400',
        badgeClass: 'bg-stone-800/70 text-stone-300 border border-stone-600/40',
        portraitPrompt: 'wearing a heavy iron collar with rivets, harsh industrial lighting',
        tamper: {
            canTamper: true,
            canImplant: false,
            capability: 'emotional',
            description: '情绪着色：可以重写事件的情绪色彩与主观评价。不能改变事件要素本身。',
        },
        ceremonyText: [
            '{name}换上了铁环。比锡重，比锡冷，也比锡更不容易取下。',
            '铁环扣紧时{name}没有挣扎。她已开始把疼痛理解成一种秩序。',
        ],
        promotionBroadcast: '【系统广播】铁环已下发。该单位已纳入常规服从序列。',
    },
    copper: {
        order: 3,
        nameCN: '铜环',
        icon: 'III',
        listColor: 'text-orange-400',
        badgeClass: 'bg-orange-900/40 text-orange-300 border border-orange-700/40',
        portraitPrompt: 'wearing a rustic copper collar, warm subtle rim lighting',
        tamper: {
            canTamper: true,
            canImplant: false,
            capability: 'semantic',
            description: '语义微调：仅限修改情绪色彩、模糊细节或改变形容词。不能改变事件主体。',
        },
        ceremonyText: [
            '{name}被授予铜环。她的眼中闪过一丝复杂的光芒——这是她在这里的第一个"成就"。',
            '铜色的光环在{name}的手腕上闪烁。她已经开始适应这里的规则了。',
        ],
        promotionBroadcast: '【系统广播】铜环已下发。她获准修改自己的记忆——只限于形容词。',
    },
    silver: {
        order: 4,
        nameCN: '银环',
        icon: 'IV',
        listColor: 'text-gray-300',
        badgeClass: 'bg-zinc-700/60 text-zinc-200 border border-zinc-500/40',
        portraitPrompt: 'wearing a polished silver collar, cold clinical lighting',
        tamper: {
            canTamper: true,
            canImplant: false,
            capability: 'object',
            description: '对象替换：可以修改事件中的物品、地点或次要人物。不能改变核心事件的因果。',
        },
        ceremonyText: [
            '{name}的铜环被银环取代。她的服从已经成为本能，不再需要思考。',
            '银色的光芒笼罩着{name}。她已经忘记了抵抗的意义。',
        ],
        promotionBroadcast: '【系统广播】银环已下发。她可以替换记忆里的对象：人、物、地点。',
    },
    gold: {
        order: 5,
        nameCN: '金环',
        icon: 'V',
        listColor: 'text-yellow-400',
        badgeClass: 'badge-warning',
        portraitPrompt: 'wearing an ornate golden collar, radiant divine aura',
        tamper: {
            canTamper: true,
            canImplant: true,
            capability: 'subject_object',
            description: '主客体重置：可以颠倒受害者与施害者的关系，修改事件的核心起因。',
        },
        ceremonyText: [
            '{name}被授予金环——这是最高的荣耀。她的眼中只剩下对我的崇拜。',
            '金色的光环在{name}身上闪耀。她已经完全属于这里了。',
        ],
        promotionBroadcast: '【系统广播】金环已下发。主客体权限开放，因果可被重写。',
    },
    obsidian: {
        order: 6,
        nameCN: '黑曜石环',
        icon: 'VI',
        listColor: 'text-purple-400',
        badgeClass: 'badge-purple',
        portraitPrompt: 'wearing a black obsidian collar pulsating with purple veins, void energy aura',
        tamper: {
            canTamper: true,
            canImplant: true,
            capability: 'reality_rewrite',
            description: '现实重写：神之权限，定义真理。',
        },
        ceremonyText: [
            '{name}被授予黑曜石环。她不再是受害者——她已经成为了系统的一部分。',
            '黑曜石的光芒吞噬了{name}最后的自我。她现在是我意志的延伸。',
        ],
        promotionBroadcast: '【系统广播】黑曜石环已下发。现实重写权限开放，新的真理正在诞生。',
    },
};

/**
 * 晋升广播词：仅当等级确实上升、且目标档位声明了广播词时返回，否则 null。
 *
 * 判据取 order 之差而非"档位变了"：平调与降级都不该被说成晋升。
 * 新增晋升路径时调用本函数，不要在各自的写入点重拼广播词。
 */
export function rankPromotionBroadcast(from: CharacterRank, to: CharacterRank): string | null {
    if (RANK_DEFINITIONS[to].order <= RANK_DEFINITIONS[from].order) return null;
    return RANK_DEFINITIONS[to].promotionBroadcast ?? null;
}
