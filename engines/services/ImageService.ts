// ============================================
// AI 图像服务 - Pollinations API
// 提示词优先级（越靠前权重越高）：主体 > 身体 > 外貌 > 表情 > 孕期 > 服装 > 等级 > 环境 > 风格
// API 文档：https://enter.pollinations.ai/api/docs
// ============================================

import { Maiden, CharacterStatus, PhysicalStats, NameOrigin, AttireState, AppearanceData, ClothingState, ItemDef, CUP_SIZES } from '../../meta';
import { getCarriageTemplate, isAbyssTemplate, calculateDressLevel, PORTRAIT_THRESHOLDS, PORTRAIT_PREGNANCY_MILESTONES, RANK_DEFINITIONS, GAME_CONFIG } from '../../constants';
import { personalityView } from '../systems';
import { hashCode } from '../../const';

export const AVAILABLE_IMAGE_MODELS = {
    FLUX: 'flux',
} as const;

const CONFIG = {
    // Pollinations API 网关（新版）
    pollinationsUrl: 'https://gen.pollinations.ai/image',
    // 该 key 随图片 URL 一起交给浏览器加载，对客户端本就是可见的，故不当作机密处理
    apiKey: 'sk_frApAL0jeDBArPbnOZDfAQtqKC5n8XuN',
    // 3:4，与卡片立绘区比例一致
    portrait: { width: 768, height: 1024 },
};

const STATUS_VISUALS: Record<CharacterStatus, string> = {
    'normal': '',
    'panicked': 'tears, trembling, scared expression, wide eyes',
    'aroused': 'blushing, heavy breathing, sweaty skin, glazed eyes, flushed cheeks',
    'injured': 'bruises, messy hair, bandaged, blood stains',
    'broken': 'empty eyes, lifeless expression, drooling, despair',
    'pregnant': 'pregnant belly, holding stomach, swollen breasts',
    'euphoric': 'ecstatic expression, dilated pupils, blissful smile',
    'dissociated': 'distant gaze, unfocused eyes, hollow look',
    'devoted': 'worshipping pose, adoring eyes, hands clasped',
    'complicit': 'guilty expression, conflicted eyes, shameful blush',
    'voyeur': 'peeking pose, hidden in shadows, curious eyes',
    'deaconess': 'elegant pose, confident expression, dark elegance',
    'gestating': 'floating in liquid, peaceful sleep, serene',
    'performing': 'on stage, spotlight, theatrical pose, forced smile',
    'confessing': 'kneeling, head bowed, dim red light',
    'anchoring': 'desperate expression, reaching out, vulnerable',
    'sleeping': 'sleeping peacefully, closed eyes, relaxed',
    'eating': 'eating, sitting at table',
    'bathing': 'in water, wet skin, steam',
    'wandering': 'walking, looking around',
    'chatting': 'talking, whispering, interacting with others',
    'observing': 'leaning on window, staring into void, wide eyes',
};

const PREGNANCY_VISUALS: Record<number, string> = {
    [GAME_CONFIG.PREGNANCY.DISCOVERY_WEEK]: 'slightly soft belly',
    [GAME_CONFIG.PREGNANCY.VISIBLE_WEEK]: 'visible small baby bump, hand gently resting on stomach',
    [GAME_CONFIG.PREGNANCY.LATE_WEEK]: 'heavily pregnant, large round belly, stretch marks, glowing maternal skin',
    [GAME_CONFIG.PREGNANCY.IMMINENT_WEEK]: 'extremely pregnant, massive belly, swollen figure, expression of endurance',
};

const ETHNICITY_MAP: Record<NameOrigin, string> = {
    // 东亚
    chinese: 'East Asian maiden, delicate porcelain skin, elegant features',
    japanese: 'Japanese maiden, soft facial features, anime-esque aesthetic',
    korean: 'Korean maiden, flawless glass skin, trendy makeup',
    vietnamese: 'Southeast Asian maiden, elegant and slender',
    // 英语文化圈
    english: 'British Caucasian maiden, pale fair skin, aristocratic features',
    american: 'Caucasian maiden, sun-kissed skin',
    irish: 'Irish maiden, pale skin, light freckles',
    scottish: 'Scottish maiden, pale skin, sharp defined features',
    // 罗曼语族
    french: 'French maiden, sophisticated chic look',
    spanish: 'Spanish maiden, olive skin, dark wavy hair',
    italian: 'Italian maiden, warm olive skin, expressive features',
    portuguese: 'Portuguese maiden, olive skin, dark eyes',
    romanian: 'Romanian maiden, olive complexion, striking features',
    // 日耳曼/北欧
    german: 'German maiden, strong facial structure',
    dutch: 'Dutch maiden, fair skin, light brown hair',
    swedish: 'Swedish maiden, blonde hair, pale blue eyes',
    norwegian: 'Norwegian maiden, fair skin, light hair',
    danish: 'Danish maiden, fair complexion, soft features',
    finnish: 'Finnish maiden, pale skin, light eyes, high cheekbones',
    icelandic: 'Icelandic maiden, very pale skin, light hair',
    // 斯拉夫/东欧
    russian: 'Russian maiden, cold Slavic beauty, pale skin',
    ukrainian: 'Ukrainian maiden, fair skin, Slavic features',
    polish: 'Polish maiden, fair skin, light eyes',
    czech: 'Czech maiden, fair skin, delicate features',
    hungarian: 'Hungarian maiden, dark hair, olive complexion',
    serbian: 'Serbian maiden, dark hair, strong features',
    croatian: 'Croatian maiden, olive skin, dark hair',
    bulgarian: 'Bulgarian maiden, dark hair, olive complexion',
    // 中东/地中海
    greek: 'Greek maiden, olive skin, dark curly hair',
    turkish: 'Turkish maiden, olive skin, dark expressive eyes',
    arabic: 'Arab maiden, olive skin, dark eyes, elegant features',
    persian: 'Persian maiden, olive skin, thick dark hair, striking eyes',
    hebrew: 'Middle Eastern maiden, olive skin, dark wavy hair',
    // 南亚/东南亚
    indian: 'Indian maiden, rich tan skin, sharp eyes',
    thai: 'Thai maiden, warm tan skin, delicate features',
    indonesian: 'Southeast Asian maiden, warm tan skin, dark hair',
    filipino: 'Filipina maiden, warm tan skin, dark hair',
    // 拉美
    brazilian: 'Brazilian maiden, mixed heritage, sun-kissed skin',
    mexican: 'Mexican maiden, warm olive skin tone',
    argentinian: 'Argentinian maiden, olive skin, European features',
    // 非洲
    nigerian: 'Nigerian maiden, dark ebony skin, striking features',
    ethiopian: 'Ethiopian maiden, dark skin, fine features, high cheekbones',
    egyptian: 'Egyptian maiden, olive skin, cat-like eyes',
    southafrican: 'South African maiden, warm brown skin, striking features',
    // 神话语源
    mythical: 'ethereal maiden, otherworldly beauty, faintly luminous skin',
};

const CLOTHING_STATE_MAP: Record<AttireState, string | null> = {
    intact: null,
    torn: 'clothes are torn and shredded, exposing skin underneath',
    wet: 'clothes are soaking wet and clinging to the body, translucent fabric',
    disheveled: 'clothes are disheveled and messy, buttons undone, straps falling',
    transparent: 'wearing semi-transparent sheer fabric',
    dirty: 'clothes are covered in grime and dirt, distressed texture',
    bloody: 'clothes stained with blood splatters',
};

export class ImageService {
    private currentModel: string = AVAILABLE_IMAGE_MODELS.FLUX;

    // ============================================
    // 模型管理
    // ============================================

    setModel(model: string) {
        this.currentModel = model;
        console.log(`[ImageService] 模型切换至: ${this.currentModel}`);
    }

    getModel(): string {
        return this.currentModel;
    }

    // ============================================
    // 核心生成逻辑 (Pollinations API)
    // ============================================

    /**
     * 生成角色立绘。
     *
     * 纯字符串拼装，无网络 I/O——真正的请求发生在调用方把 `url` 交给浏览器加载时。
     * 返回的 `url` 同时是**请求键**：提示词、身份种子与模型都写在里面，因此调用方
     * 只需比对新旧 URL 就能判断要不要重新请求，不必再另算一份"视觉状态"。
     */
    generateCharacterImage(maiden: Maiden, carriageTemplateId?: string): { url: string; model: string } {
        return {
            url: this.buildRequestUrl(maiden, carriageTemplateId),
            model: this.currentModel
        };
    }

    // ============================================
    // Pollinations URL 生成
    // ============================================

    /**
     * 按头部注释的优先级拼装提示词并合成请求 URL。
     *
     * 主体拆成三段分别入列，而不是先拼成一个字符串：语源表按 `NameOrigin` 全量声明，
     * 但存档是外部输入，各自成段才能在缺项时被空段过滤掉，不留悬空的分隔符。
     */
    private buildRequestUrl(maiden: Maiden, carriageTemplateId?: string): string {
        const parts: string[] = [];
        parts.push('(1girl:1.4)', this.getAgeTag(maiden.age), ETHNICITY_MAP[maiden.nameOrigin]);
        if (maiden.physical) parts.push(this.buildBodyPrompt(maiden.physical));
        parts.push(maiden.appearance ? this.buildAppearancePrompt(maiden.appearance) : maiden.description);
        const expression = this.buildExpressionPrompt(maiden);
        if (expression) parts.push(expression);
        const pregnancy = this.getPregnancyTag(maiden.physiology.pregnancy?.weekNumber ?? 0);
        if (pregnancy) parts.push(pregnancy);
        // 裸体兜底由 buildClothingPrompt 负责：它返回的字符串恒非空
        parts.push(this.buildClothingPrompt(maiden.clothing));
        const rank = RANK_DEFINITIONS[maiden.rank].portraitPrompt;
        if (rank) parts.push(rank);
        parts.push(this.buildBackgroundPrompt(carriageTemplateId));
        parts.push('portrait, cinematic lighting, dark fantasy, gothic, 8k');

        return this.buildUrl(parts, CONFIG.portrait, this.generateSeed(maiden));
    }

    // ============================================
    // 提示词构建器 (Prompt Helpers)
    // ============================================

    /**
     * 年龄标签。
     *
     * 登车年龄区间是 `GAME_CONFIG.MAIDEN_AGE` 的 14~22 岁，措辞按档给出；
     * 这里不对"下限即成年"作任何假设，低龄档也不省略——省略只会让实际年龄
     * 与提示词悄悄脱节。
     */
    private getAgeTag(age: number): string {
        if (age <= 16) return `young girl, ${age} years old`;
        if (age <= 19) return `teenage girl, ${age} years old`;
        return `young maiden, ${age} years old`;
    }

    private buildBodyPrompt(phy: PhysicalStats): string {
        const parts: string[] = [];
        if (phy.height < 150) parts.push('petite stature');
        else if (phy.height > 175) parts.push('tall stature with long legs');

        parts.push(`${phy.bodyType} body type`);

        const cupIndex = CUP_SIZES.indexOf(phy.cupSize);
        if (cupIndex >= 8) parts.push('extremely large breasts');
        else if (cupIndex >= 6) parts.push('large breasts');
        else if (cupIndex >= 4) parts.push('medium-large breasts');
        else if (cupIndex <= 1) parts.push('flat chest');

        // 腰臀比分界取 0.70：实测分布 p50≈0.698、极值 0.637~0.763，两侧各约一半
        const whRatio = phy.waist / phy.hips;
        if (whRatio < 0.70) parts.push('narrow waist, hourglass figure');
        else parts.push('fuller waist, soft figure');

        return parts.join(', ');
    }

    private buildAppearancePrompt(app: AppearanceData): string {
        const parts: string[] = [];
        const fmt = (s: string) => s.replace(/_/g, ' ');

        parts.push(`${fmt(app.hair.length.id)} ${fmt(app.hair.color.id)} ${fmt(app.hair.style.id)} hair`);

        const eyeColor = fmt(app.eyes.color.id);
        parts.push(app.eyes.secondaryColor
            ? `heterochromia (${eyeColor} and ${fmt(app.eyes.secondaryColor.id)}) eyes`
            : `${eyeColor} eyes`
        );

        parts.push(`${fmt(app.skin.tone.id)} skin`);

        const facials = app.features.facialFeatures.slice(0, 2).map(f => fmt(f.id));
        if (facials.length) parts.push(facials.join(', '));

        return parts.join(', ');
    }

    /**
     * 表情修饰：极端档独占，否则「属性 + 状态」合计最多三条，都没有时才退回人格。
     *
     * 三条是刻意的上限：属性有六个维度，全塞进提示词会让表情盖过主体与外貌。
     */
    private buildExpressionPrompt(maiden: Maiden): string {
        const extreme = this.getExtremeExpression(maiden);
        if (extreme) return extreme;

        // 属性表情在 getAttributeExpressions 里已按固定优先级排列，只取前两条
        const effects = this.getAttributeExpressions(maiden).slice(0, 2);
        for (const status of maiden.status) {
            if (effects.length >= 3) break;
            const visual = STATUS_VISUALS[status];
            if (visual) effects.push(visual);
        }

        if (!effects.length) {
            const personality = this.getPersonalityExpression(maiden);
            if (personality) effects.push(personality);
        }

        return effects.join(', ');
    }

    /** 极端档整段替换表情，不再叠加属性与状态：命中即返回，先判者优先 */
    private getExtremeExpression(maiden: Maiden): string | null {
        const { attributes: a, status } = maiden;
        if (status.includes('broken') || a.sanity < 20) {
            return 'broken expression with empty lifeless eyes, drooling, mental breakdown';
        }
        if (status.includes('panicked') && a.stress > 80) {
            return 'terrified expression, wide eyes, tears streaming down face, trembling';
        }
        if (a.lust > 85) {
            return 'ahegao face, eyes rolling back, tongue sticking out, flushed face, drooling, expression of ecstasy';
        }
        if (status.includes('dissociated') || personalityView(maiden).state === 'extreme') {
            return 'dissociated expression, vacant stare, hollow eyes, emotionless';
        }
        if (status.includes('euphoric') && a.devotion > 80) {
            return 'ecstatic blissful smile, glowing with divine joy, tears of happiness';
        }
        return null;
    }

    private getAttributeExpressions(maiden: Maiden): string[] {
        const effects: string[] = [];
        const a = maiden.attributes;
        const T = PORTRAIT_THRESHOLDS;

        if (a.sanity < T.sanity[0]) effects.push('insane expression, frantic eyes');
        else if (a.sanity < T.sanity[1]) effects.push('unstable look, dilated pupils');
        else if (a.sanity < T.sanity[2]) effects.push('anxious, nervous, furrowed brows');

        if (a.lust > T.lust[2]) effects.push('heavily aroused, flushed face, glazed eyes');
        else if (a.lust > T.lust[1]) effects.push('aroused, flushed cheeks, parted lips');
        else if (a.lust > T.lust[0]) effects.push('slightly flushed, shy glance');

        if (a.stress > T.stress[2]) effects.push('crying, tears, expression of despair');
        else if (a.stress > T.stress[1]) effects.push('exhausted, dark circles under eyes, distressed');
        else if (a.stress > T.stress[0]) effects.push('tense, worried look');

        if (a.devotion > T.devotion[2]) effects.push('worshipful gaze, serene smile, praying');
        else if (a.devotion > T.devotion[1]) effects.push('reverent, adoring look');

        if (a.corruption > T.corruption[2]) effects.push('dark aura, twisted smile, predatory gaze');
        else if (a.corruption > T.corruption[1]) effects.push('knowing smile, dangerous gaze');

        if (a.obedience > T.obedience[2]) effects.push('submissive, empty eyes, doll-like');
        else if (a.obedience > T.obedience[1]) effects.push('submissive, head bowed');

        return effects;
    }

    /**
     * 由人格得出立绘的表情修饰。
     *
     * 只用维度与构型，不用光明/黑暗代理：代理未经验证门槛，据此生成
     * "傲慢的冷笑""残忍的微笑"这类表情等于对个体下判断（personality.md §7.2）。
     */
    private getPersonalityExpression(maiden: Maiden): string {
        const view = personalityView(maiden);
        // 'extreme' 档到不了这里：getExtremeExpression 已先行接管
        if (view.state === 'atypical') return 'strained expression, tense';

        const domains = view.domains;
        const parts: string[] = [];

        if (view.meta.gamma > 0.5) parts.push('gentle eyes');
        else if (view.meta.gamma < -0.5) parts.push('cold gaze');

        if (domains.E > 1.0) parts.push('sensitive expression');
        else if (domains.E < -1.0) parts.push('stoic');

        if (domains.X > 1.0) parts.push('confident');
        else if (domains.X < -1.0) parts.push('shy, averted eyes');

        return parts.slice(0, 2).join(', ');
    }

    private buildClothingPrompt(clothing: ClothingState): string {
        const parts: string[] = [];
        const dressLevel = calculateDressLevel(clothing);

        const describe = (item: { type: ItemDef; color?: ItemDef }): string | null => {
            if (!item || item.type.id === 'none') return null;
            const type = item.type.id.replace(/_/g, ' ');
            const color = item.color?.id.replace(/_/g, ' ') || '';
            return `${color} ${type}`.trim();
        };

        const { outerwear, undergarment, intimate, accessories, state } = clothing;
        const showInner = outerwear.top.type.id === 'none' ||
            state === 'transparent' || state === 'wet' || state === 'torn' ||
            dressLevel !== 'fully_dressed';

        const top = describe(outerwear.top);
        const bottom = describe(outerwear.bottom);
        const isDress = top?.includes('dress');

        if (top) parts.push(top);
        if (bottom && !isDress) parts.push(bottom);

        // 鞋子只有 'none' 表示赤脚（SHOE_TYPES 没有 barefoot 这个 id）
        if (outerwear.shoes.type.id === 'none') parts.push('barefoot');
        else {
            const shoes = describe(outerwear.shoes);
            if (shoes) parts.push(shoes);
        }

        if (showInner) {
            [undergarment.stockings, intimate.bra, intimate.panties]
                .map(describe)
                .filter(Boolean)
                .forEach(d => parts.push(d!));
        }

        accessories
            .filter(acc => acc.isVisible !== false)
            .slice(0, 2)
            .map(describe)
            .filter(Boolean)
            .forEach(d => parts.push(d!));

        // 全裸必须写出裸体描述，衣物状态也无从附着在并不存在的衣服上。判据不能用
        // `parts` 是否为空：赤脚会先塞进 'barefoot'，全裸时数组非空，立绘只剩一双鞋。
        if (dressLevel === 'naked' || !parts.length) {
            return ['nude, bare skin', ...parts].join(', ');
        }

        const stateTag = CLOTHING_STATE_MAP[state];
        if (stateTag) parts.push(stateTag);

        return parts.join(', ');
    }

    private getPregnancyTag(week: number): string | null {
        if (week <= 0) return null;
        // 从高到低取第一个已达成的档位。里程碑表比视觉表多一个 TOTAL_WEEKS
        // （终孕期沿用临产档），因此跳过没有视觉定义的档位而不是返回空。
        for (let i = PORTRAIT_PREGNANCY_MILESTONES.length - 1; i >= 0; i--) {
            const milestone = PORTRAIT_PREGNANCY_MILESTONES[i];
            const visual = PREGNANCY_VISUALS[milestone];
            if (week >= milestone && visual) return visual;
        }
        return null;
    }

    private buildBackgroundPrompt(carriageTemplateId?: string): string {
        if (!carriageTemplateId) return 'dark train interior background';

        const template = getCarriageTemplate(carriageTemplateId);
        const theme = template?.visualTheme || 'dark corridor';
        const isAbyss = isAbyssTemplate(carriageTemplateId);

        return isAbyss
            ? `${theme} background, eldritch horror atmosphere, cosmic void, surreal purple tones`
            : `${theme} background, gothic interior, detailed background`;
    }

    /**
     * 种子只取身份。
     *
     * 它决定"这张脸长什么样"，而状态与服装已经写在提示词里；把它们混进种子，
     * 同一少女会因为换个状态标签就换一张脸，且这个变化对请求键完全不可见。
     */
    private generateSeed(maiden: Maiden): number {
        return Math.abs(hashCode(maiden.id)) % 10000;
    }

    private buildUrl(parts: string[], size: { width: number; height: number }, seed: number): string {
        // 空段一并丢弃：任何可选描述缺失，都不该在提示词里留下 ", , "
        const prompt = encodeURIComponent(parts.filter(Boolean).join(', '));
        const params = new URLSearchParams({
            width: String(size.width),
            height: String(size.height),
            seed: String(seed),
            model: this.currentModel,
            key: CONFIG.apiKey,
            negative_prompt: 'worst quality, blurry',
            safe: 'false',
        });
        return `${CONFIG.pollinationsUrl}/${prompt}?${params.toString()}`;
    }
}

export const imageService = new ImageService();
