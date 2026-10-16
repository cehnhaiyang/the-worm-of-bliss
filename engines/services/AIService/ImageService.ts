
// ============================================
// AI 图像服务 - Pollinations API
// 提示词优先级：主体 > 身体 > 外貌 > 表情 > 服装 > 环境 > 风格
// API 文档：https://enter.pollinations.ai/api/docs
// ============================================

import { Maiden, CarriageType, ISShexPersonality, PhysicalStats, NameOrigin, AppearanceData, ClothingState, ItemDef, CharacterStatus, PortraitSnapshot } from '../../../meta';
import { CARRIAGE_TYPE_INFO, ABYSS_TYPES, STATUS_VISUALS, calculateDressLevel, PORTRAIT_THRESHOLDS, PORTRAIT_PREGNANCY_MILESTONES, MIN_PORTRAIT_UPDATE_INTERVAL } from '../../../constants';
import { hashCode } from '../../../meta';

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
const RANK_VISUALS: Record<string, string> = {
  unranked: '',
  copper: 'wearing a rustic copper collar, warm subtle rim lighting',
  silver: 'wearing a polished silver collar, cold clinical lighting',
  gold: 'wearing an ornate golden collar, radiant divine aura',
  obsidian: 'wearing a black obsidian collar pulsating with purple veins, void energy aura',
};

// 孕期视觉
const PREGNANCY_VISUALS: Record<number, string> = {
  4: 'slightly soft belly',
  13: 'visible small baby bump, hand gently resting on stomach',
  28: 'heavily pregnant, large round belly, stretch marks, glowing maternal skin',
  36: 'extremely pregnant, massive belly, swollen figure, expression of endurance',
};

// 种族特征映射
const ETHNICITY_MAP: Partial<Record<NameOrigin, string>> = {
  chinese: 'East Asian woman, delicate porcelain skin, elegant features',
  japanese: 'Japanese woman, soft facial features, anime-esque aesthetic',
  korean: 'Korean woman, flawless glass skin, trendy makeup',
  vietnamese: 'Southeast Asian woman, elegant and slender',
  english: 'British Caucasian woman, pale fair skin, aristocratic features',
  american: 'Caucasian woman, sun-kissed skin',
  irish: 'Irish woman, pale skin, light freckles',
  scottish: 'Scottish woman, pale skin, sharp defined features',
  french: 'French woman, sophisticated chic look',
  german: 'German woman, strong facial structure',
  russian: 'Russian woman, cold Slavic beauty, pale skin',
  indian: 'Indian woman, rich tan skin, sharp eyes',
  brazilian: 'Brazilian woman, mixed heritage, sun-kissed skin',
  mexican: 'Mexican woman, warm olive skin tone',
  nigerian: 'Nigerian woman, dark ebony skin, striking features',
  egyptian: 'Egyptian woman, olive skin, cat-like eyes',
};

// 服装状态映射
const CLOTHING_STATE_MAP: Record<string, string> = {
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

  shouldUpdatePortrait(before: Maiden, after: Maiden, carriageType?: CarriageType): boolean {
    if (after.lastPortraitUpdate && Date.now() - after.lastPortraitUpdate < MIN_PORTRAIT_UPDATE_INTERVAL) {
      return false;
    }
    const beforeSnapshot = this.createPortraitSnapshot(before, carriageType);
    const afterSnapshot = this.createPortraitSnapshot(after, carriageType);
    return this.hasSignificantPortraitChange(beforeSnapshot, afterSnapshot);
  }

  generatePortraitHash(maiden: Maiden, carriageType?: CarriageType): string {
    return JSON.stringify(this.createPortraitSnapshot(maiden, carriageType));
  }

  private createPortraitSnapshot(maiden: Maiden, carriageType?: CarriageType): PortraitSnapshot {
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
      isInAbyss: carriageType ? ABYSS_TYPES.includes(carriageType) : false,
      personalityState: maiden.isshex.currentState,
    };
  }

  private getBracket(value: number, thresholds: readonly number[]): number {
    for (let i = 0; i < thresholds.length; i++) {
      if (value < thresholds[i]) return i;
    }
    return thresholds.length;
  }

  private hasSignificantPortraitChange(before: PortraitSnapshot, after: PortraitSnapshot): boolean {
    if (before.lustBracket !== after.lustBracket) return true;
    if (before.sanityBracket !== after.sanityBracket) return true;
    if (before.obedienceBracket !== after.obedienceBracket) return true;
    if (before.stressBracket !== after.stressBracket) return true;
    if (before.corruptionBracket !== after.corruptionBracket) return true;
    if (before.devotionBracket !== after.devotionBracket) return true;
    if (before.significantStatuses.join(',') !== after.significantStatuses.join(',')) return true;
    if (before.dressLevel !== after.dressLevel) return true;
    if (before.clothingState !== after.clothingState) return true;
    if (before.pregnancyMilestone !== after.pregnancyMilestone) return true;
    if (before.isInAbyss !== after.isInAbyss) return true;
    if (before.personalityState !== after.personalityState) return true;
    return false;
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
   */
  async generateCharacterImage(maiden: Maiden, carriageType?: CarriageType): Promise<{ url: string; model: string }> {
    return {
      url: this.getPollinationsUrl(maiden, carriageType),
      model: this.currentModel
    };
  }

  // ============================================
  // Pollinations URL 生成
  // ============================================

  getPollinationsUrl(maiden: Maiden, carriageType?: CarriageType): string {
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
    parts.push(this.buildBackgroundPrompt(carriageType));
    parts.push('portrait, cinematic lighting, dark fantasy, gothic, 8k');

    return this.buildUrl(parts, CONFIG.portrait, this.generateSeed(maiden, carriageType));
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

  getSceneImageUrl(carriageType: CarriageType, description?: string): string {
    const info = CARRIAGE_TYPE_INFO.find(i => i.type === carriageType);
    const isAbyss = ABYSS_TYPES.includes(carriageType);

    const parts = [
      'wide shot, interior',
      info?.visualTheme || 'dark train corridor',
      description,
      isAbyss ? 'eldritch horror, cosmic void, surreal, purple red tones' : 'gothic interior, dim lighting, elegant',
      'cinematic, 8k'
    ].filter(Boolean) as string[];

    const seed = Math.abs(hashCode(carriageType + (description || ''))) % 10000;
    return this.buildUrl(parts, CONFIG.scene, seed);
  }

  // ============================================
  // 提示词构建器 (Prompt Helpers)
  // ============================================

  private getAgeTag(age: number): string {
    if (age <= 16) return `young girl, ${age} years old`;
    if (age <= 19) return `teenage girl, ${age} years old`;
    return `young woman, ${age} years old`;
  }

  private buildBodyPrompt(phy: PhysicalStats): string {
    const parts: string[] = [];
    if (phy.height < 150) parts.push('petite stature');
    else if (phy.height > 175) parts.push('tall stature with long legs');

    parts.push(`${phy.bodyType} body type`);

    const cupIndex = ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].indexOf(phy.cupSize);
    if (cupIndex >= 8) parts.push('extremely large breasts');
    else if (cupIndex >= 6) parts.push('large breasts');
    else if (cupIndex >= 4) parts.push('medium-large breasts');
    else if (cupIndex <= 1) parts.push('flat chest');

    const whRatio = phy.waist / phy.hips;
    if (whRatio < 0.7) parts.push('wide hips, hourglass figure');
    else if (whRatio > 0.85) parts.push('slender waist');

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
    const { attributes: a, status, isshex } = maiden;
    if (status.includes('broken') || a.sanity < 20) {
      return 'broken expression with empty lifeless eyes, drooling, mental breakdown';
    }
    if (status.includes('panicked') && a.stress > 80) {
      return 'terrified expression, wide eyes, tears streaming down face, trembling';
    }
    if (a.lust > 85) {
      return 'ahegao face, eyes rolling back, tongue sticking out, flushed face, drooling, expression of ecstasy';
    }
    if (status.includes('dissociated') || isshex.currentState === 'dissociated') {
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

  private getPersonalityExpression(isshex: ISShexPersonality): string {
    const { hexaco, archetype, currentState } = isshex;
    if (currentState === 'dissociated') return 'vacant stare, hollow eyes';
    if (currentState === 'stressed') return 'strained expression, tense';

    const parts: string[] = [];
    if (archetype.primary === 'prosocial') parts.push('gentle eyes');
    else if (archetype.primary === 'antagonistic') parts.push('cold gaze');

    if (hexaco.E > 65) parts.push('sensitive expression');
    else if (hexaco.E < 35) parts.push('stoic');

    if (hexaco.X > 65) parts.push('confident');
    else if (hexaco.X < 35) parts.push('shy, averted eyes');

    if (archetype.dominated.includes('narcissist')) parts.push('arrogant smirk');
    if (archetype.dominated.includes('sadist')) parts.push('cruel smile');

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

    if (outerwear.shoes.type.id === 'barefoot') parts.push('barefoot');
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
    if (week >= 36) return PREGNANCY_VISUALS[36];
    if (week >= 28) return PREGNANCY_VISUALS[28];
    if (week >= 13) return PREGNANCY_VISUALS[13];
    if (week >= 4) return PREGNANCY_VISUALS[4];
    return null;
  }

  private buildBackgroundPrompt(carriageType?: CarriageType): string {
    if (!carriageType) return 'dark train interior background';

    const info = CARRIAGE_TYPE_INFO.find(i => i.type === carriageType);
    const theme = info?.visualTheme || 'dark corridor';
    const isAbyss = ABYSS_TYPES.includes(carriageType);

    return isAbyss
      ? `${theme} background, eldritch horror atmosphere, cosmic void, surreal purple tones`
      : `${theme} background, gothic interior, detailed background`;
  }

  private generateSeed(maiden: Maiden, carriageType?: CarriageType): number {
    const seedStr = maiden.id +
      maiden.status.slice().sort().join('') +
      (carriageType || '') +
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
