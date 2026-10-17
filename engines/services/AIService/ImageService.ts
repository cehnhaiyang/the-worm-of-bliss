
// ============================================
// AI 图像服务 - Pollinations API
// 提示词优先级：主体 > 身体 > 外貌 > 表情 > 服装 > 环境 > 风格
// API 文档：https://enter.pollinations.ai/api/docs
// ============================================

import { Maiden, CharacterRank, ISShexPersonality, PhysicalStats, NameOrigin, AttireState, AppearanceData, ClothingState, ItemDef, CharacterStatus, PortraitSnapshot, CUP_SIZES } from '../../../meta';
import { getCarriageTemplate, isAbyssTemplate, STATUS_VISUALS, calculateDressLevel, PORTRAIT_THRESHOLDS, PORTRAIT_PREGNANCY_MILESTONES, GAME_CONFIG } from '../../../constants';
import { PersonalityView, personalityView } from '../../systems';
import { hashCode } from '../../../const';

// ============================================
// 配置常量
// ============================================

const POLLINATIONS_API_KEY = 'sk_frApAL0jeDBArPbnOZDfAQtqKC5n8XuN';

// 可用图像模型列表
export const AVAILABLE_IMAGE_MODELS = {
  FLUX: 'flux',
} as const;

const CONFIG = {
  // Pollinations API 网关（新版）
  pollinationsUrl: 'https://gen.pollinations.ai/image',
  defaultModel: 'flux' as string,
  portrait: { width: 768, height: 1024 },
  thumbnail: { size: 128 },
  scene: { width: 1024, height: 576 },
};

/** 影响立绘的显著状态 */
const PORTRAIT_SIGNIFICANT_STATUSES: CharacterStatus[] = [
  'panicked',
  'aroused',
  'broken',
  'injured',
  'pregnant',
  'gestating',
  'euphoric',
  'dissociated',
  'devoted',
  'complicit',
  'deaconess',
];

// 等级视觉 - 项圈 + 光效
const RANK_VISUALS: Record<CharacterRank, string> = {
  unranked: '',
  copper: 'wearing a rustic copper collar, warm subtle rim lighting',
  silver: 'wearing a polished silver collar, cold clinical lighting',
  gold: 'wearing an ornate golden collar, radiant divine aura',
  obsidian: 'wearing a black obsidian collar pulsating with purple veins, void energy aura',
};

// 孕期视觉 - 键必须与 PORTRAIT_PREGNANCY_MILESTONES 的档位一致，
// 否则里程碑判定触发了重算，产出的提示词却与上一档逐字相同（图不变）
const PREGNANCY_VISUALS: Record<number, string> = {
  [GAME_CONFIG.PREGNANCY.DISCOVERY_WEEK]: 'slightly soft belly',
  [GAME_CONFIG.PREGNANCY.VISIBLE_WEEK]: 'visible small baby bump, hand gently resting on stomach',
  [GAME_CONFIG.PREGNANCY.LATE_WEEK]: 'heavily pregnant, large round belly, stretch marks, glowing maternal skin',
  [GAME_CONFIG.PREGNANCY.IMMINENT_WEEK]: 'extremely pregnant, massive belly, swollen figure, expression of endurance',
};

// 种族特征映射 - 键集必须覆盖 NameOrigin 全部取值：
// 写成 Partial 时漏掉的语源会静默丢掉族群描述，提示词里就只剩一个无名少女
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

// 服装状态映射
const CLOTHING_STATE_MAP: Record<AttireState, string | null> = {
  intact: null,
  torn: 'clothes are torn and shredded, exposing skin underneath',
  wet: 'clothes are soaking wet and clinging to the body, translucent fabric',
  disheveled: 'clothes are disheveled and messy, buttons undone, straps falling',
  transparent: 'wearing semi-transparent sheer fabric',
  dirty: 'clothes are covered in grime and dirt, distressed texture',
  bloody: 'clothes stained with blood splatters',
};

// ============================================
// 图像服务类
// ============================================

export class ImageService {
  private currentModel: string = CONFIG.defaultModel;

  // ============================================
  // 立绘更新判定逻辑
  // ============================================

  generatePortraitHash(maiden: Maiden, carriageTemplateId?: string): string {
    return JSON.stringify(this.createPortraitSnapshot(maiden, carriageTemplateId));
  }

  private createPortraitSnapshot(maiden: Maiden, carriageTemplateId?: string): PortraitSnapshot {
    const attrs = maiden.attributes;
    const dressLevel = calculateDressLevel(maiden.clothing);

    let pregnancyMilestone = 0;
    const pregnancyWeek = maiden.physiology.pregnancy?.weekNumber ?? 0;
    for (const milestone of PORTRAIT_PREGNANCY_MILESTONES) {
      if (pregnancyWeek >= milestone) pregnancyMilestone = milestone;
    }

    const significantStatuses = maiden.status
      .filter(s => PORTRAIT_SIGNIFICANT_STATUSES.includes(s))
      .sort();

    return {
      lustBracket: this.getBracket(attrs.lust, PORTRAIT_THRESHOLDS.lust),
      sanityBracket: this.getBracket(attrs.sanity, PORTRAIT_THRESHOLDS.sanity),
      obedienceBracket: this.getBracket(attrs.obedience, PORTRAIT_THRESHOLDS.obedience),
      stressBracket: this.getBracket(attrs.stress, PORTRAIT_THRESHOLDS.stress),
      corruptionBracket: this.getBracket(attrs.corruption, PORTRAIT_THRESHOLDS.corruption),
      devotionBracket: this.getBracket(attrs.devotion, PORTRAIT_THRESHOLDS.devotion),
      significantStatuses,
      dressLevel,
      clothingState: maiden.clothing.state,
      pregnancyMilestone,
      isInAbyss: carriageTemplateId ? isAbyssTemplate(carriageTemplateId) : false,
      personalityState: personalityView(maiden).state,
      rank: maiden.rank,
    };
  }

  private getBracket(value: number, thresholds: readonly number[]): number {
    for (let i = 0; i < thresholds.length; i++) {
      if (value < thresholds[i]) return i;
    }
    return thresholds.length;
  }

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
   * 生成角色立绘
   * 使用 Pollinations API (gen.pollinations.ai)
   * 返回图片URL和使用的模型名称
   *
   * 纯字符串拼装，无网络 I/O——真正的请求发生在调用方把 `url` 交给浏览器加载时。
   */
  generateCharacterImage(maiden: Maiden, carriageTemplateId?: string): { url: string; model: string } {
    return {
      url: this.getPollinationsUrl(maiden, carriageTemplateId),
      model: this.currentModel
    };
  }

  // ============================================
  // Pollinations URL 生成
  // ============================================

  getPollinationsUrl(maiden: Maiden, carriageTemplateId?: string): string {
    const parts: string[] = [];
    const ethnicity = ETHNICITY_MAP[maiden.nameOrigin] || '';
    parts.push(`(1girl:1.4), ${this.getAgeTag(maiden.age)}, ${ethnicity}`);
    if (maiden.physical) parts.push(this.buildBodyPrompt(maiden.physical));
    parts.push(maiden.appearance ? this.buildAppearancePrompt(maiden.appearance) : maiden.description);
    const expression = this.buildExpressionPrompt(maiden);
    if (expression) parts.push(expression);
    const pregnancy = this.getPregnancyTag(maiden.physiology.pregnancy?.weekNumber ?? 0);
    if (pregnancy) parts.push(pregnancy);
    const clothing = this.buildClothingPrompt(maiden.clothing);
    parts.push(clothing || 'nude, bare skin');
    const rank = RANK_VISUALS[maiden.rank];
    if (rank) parts.push(rank);
    parts.push(this.buildBackgroundPrompt(carriageTemplateId));
    parts.push('portrait, cinematic lighting, dark fantasy, gothic, 8k');

    return this.buildUrl(parts, CONFIG.portrait, this.generateSeed(maiden, carriageTemplateId));
  }

  getThumbnailUrl(maiden: Maiden): string {
    const ethnicity = ETHNICITY_MAP[maiden.nameOrigin] || '';
    const face = maiden.appearance
      ? `${maiden.appearance.hair.color.id} ${maiden.appearance.hair.length.id} hair, ${maiden.appearance.eyes.color.id} eyes`
      : maiden.description.split(',').slice(0, 2).join(',');

    const prompt = `close-up portrait, (1girl:1.3), ${this.getAgeTag(maiden.age)}, ${ethnicity}, ${face}, soft lighting, neutral background`;
    const seed = Math.abs(hashCode(maiden.id)) % 10000;

    return this.buildUrl([prompt], { width: CONFIG.thumbnail.size, height: CONFIG.thumbnail.size }, seed);
  }

  getSceneImageUrl(carriageTemplateId: string, description?: string): string {
    const template = getCarriageTemplate(carriageTemplateId);
    const isAbyss = isAbyssTemplate(carriageTemplateId);

    const parts = [
      'wide shot, interior',
      template?.visualTheme || 'dark train corridor',
      description,
      isAbyss ? 'eldritch horror, cosmic void, surreal, purple red tones' : 'gothic interior, dim lighting, elegant',
      'cinematic, 8k'
    ].filter(Boolean) as string[];

    const seed = Math.abs(hashCode(carriageTemplateId + (description || ''))) % 10000;
    return this.buildUrl(parts, CONFIG.scene, seed);
  }

  // ============================================
  // 提示词构建器 (Prompt Helpers)
  // ============================================

  /**
   * 年龄标签。
   *
   * 年龄下限由 `GAME_CONFIG.MAIDEN_AGE.MIN` 保证为成年，因此这里不再有
   * "young girl" 之类的未成年措辞分支——那种分支只会让下限失效时无人察觉。
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

    // 腰臀比的分界取 0.70：实测分布 p50≈0.698、极值 0.637~0.763，
    // 因此两侧各约占一半。原实现的上侧阈值 0.85 落在分布之外，
    // 那一支永远不会执行（且措辞把"腰更粗"写成了"腰更细"）。
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

  private buildExpressionPrompt(maiden: Maiden): string {
    const extreme = this.getExtremeExpression(maiden);
    if (extreme) return extreme;

    const effects: string[] = [];
    effects.push(...this.getAttributeExpressions(maiden).slice(0, 2));

    if (effects.length < 3) {
      const statusEffects = maiden.status
        .map(s => STATUS_VISUALS[s])
        .filter(Boolean)
        .slice(0, 3 - effects.length);
      effects.push(...statusEffects);
    }

    if (!effects.length) {
      const personality = this.getPersonalityExpression(maiden.isshex);
      if (personality) effects.push(personality);
    }

    return effects.join(', ');
  }

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

    if (a.sanity < T.sanity[2]) effects.push('insane expression, frantic eyes');
    else if (a.sanity < T.sanity[1]) effects.push('unstable look, dilated pupils');
    else if (a.sanity < T.sanity[0]) effects.push('anxious, nervous, furrowed brows');

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
   * 只使用维度与构型，不使用光明/黑暗代理：代理未经验证门槛，据此生成
   * "傲慢的冷笑""残忍的微笑"这类表情等于对个体下判断（personality.md §7.2）。
   */
  private getPersonalityExpression(isshex: ISShexPersonality): string {
    const view = new PersonalityView(isshex);
    const state = view.state;
    if (state === 'extreme') return 'vacant stare, hollow eyes';
    if (state === 'atypical') return 'strained expression, tense';

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

    if (dressLevel === 'naked' && !parts.length) return 'nude, bare skin';

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

  private generateSeed(maiden: Maiden, carriageTemplateId?: string): number {
    const seedStr = maiden.id +
      maiden.status.slice().sort().join('') +
      (carriageTemplateId || '') +
      maiden.clothing.state;
    return Math.abs(hashCode(seedStr)) % 10000;
  }

  private buildUrl(parts: string[], size: { width: number; height: number }, seed: number): string {
    const prompt = encodeURIComponent(parts.filter(Boolean).join(', '));
    const params = new URLSearchParams({
      width: String(size.width),
      height: String(size.height),
      seed: String(seed),
      model: this.currentModel,
      key: POLLINATIONS_API_KEY,
      negative_prompt: 'worst quality, blurry',
      safe: 'false',
    });
    return `${CONFIG.pollinationsUrl}/${prompt}?${params.toString()}`;
  }
}
