import {
  CharacterAttributes, PhysiologicalState, BehaviorState, PhysicalStats, ClothingState,
  PersonalityProfile, ISShexPersonality, AppearanceData, ItemDef, Maiden, CupSize,
  NameOrigin, weightedRandom, randomInt, randomFloat, randomElement,
  formatPreciseAge, deepCopy, HexacoProfile, HexacoFacets, MetaTraits, DarkTetrad,
  LightTriad, PersonalityArchetype, createUnifiedMovementState,
  DressLevel
} from '../../../meta';

import {
  HAIR_COLORS, HAIR_STYLES, HAIR_TEXTURES, HAIR_LENGTHS,
  EYE_COLORS, EYE_SHAPES, EYE_EXPRESSIONS,
  SKIN_TONES, SKIN_TEXTURES,
  FACIAL_FEATURES, BIRTHMARKS, BODY_MARKS, BODY_ARCHETYPES,
  CUP_SIZES,
  POSITIVE_TRAITS, NEGATIVE_TRAITS,
  HOBBIES, DISLIKES, COPING_MECHANISMS, FETISHES,
  TOP_TYPES, TOP_COLORS, TOP_MATERIALS,
  BOTTOM_TYPES, BOTTOM_COLORS, BOTTOM_MATERIALS,
  BRA_TYPES, BRA_COLORS, BRA_MATERIALS,
  PANTY_TYPES, PANTY_COLORS, PANTY_MATERIALS,
  STOCKING_TYPES, STOCKING_COLORS, STOCKING_MATERIALS,
  UNDERSHIRT_TYPES, UNDERSHIRT_COLORS, UNDERSHIRT_MATERIALS,
  UNDERPANTS_TYPES, UNDERPANTS_COLORS, UNDERPANTS_MATERIALS,
  SHOE_TYPES, SHOE_COLORS, SHOE_MATERIALS,
  GLOVE_TYPES, GLOVE_COLORS, GLOVE_MATERIALS,
  ACCESSORY_TYPES, ACCESSORY_COLORS, ACCESSORY_MATERIALS,
  ALL_NAME_DATASETS
} from '../../../constants';

/** 生成完整姓名 */
function generateFullName(): { fullName: string; origin: NameOrigin } {
  const dataset = ALL_NAME_DATASETS[Math.floor(Math.random() * ALL_NAME_DATASETS.length)];
  const { origin, data } = dataset;
  const surname = data.surnames[Math.floor(Math.random() * data.surnames.length)];
  const givenName = data.givenNames[Math.floor(Math.random() * data.givenNames.length)];
  const fullName = data.format === 'eastern' ? `${surname}${givenName}` : `${givenName} ${surname}`;
  return { fullName, origin };
}

// ============================================
// 行为权重计算
// ============================================

/** 从HEXACO档案计算行为权重 */
function calculateBehaviorWeights(profile: HexacoProfile, facets: HexacoFacets) {
  const { H, E, X, A, C, O } = profile;

  return {
    socialSeek: (facets.sociability + facets.dependence * 0.5) / 150,
    solitudeSeek: ((100 - X) + (100 - facets.dependence) * 0.5) / 150,
    riskTolerance: ((100 - facets.fearfulness) + facets.socialBoldness + (100 - facets.prudence)) / 300,
    obedienceBase: Math.round((A * 0.4 + H * 0.3 + facets.prudence * 0.3) - 50),
    stressResistance: ((100 - facets.anxiety) + C + facets.patience) / 200,
    lustSensitivity: (facets.sentimentality + (100 - facets.prudence) + O) / 200,
    devotionTendency: (H + A + (100 - facets.unconventionality)) / 300,
    aggressiveness: ((100 - A) + (100 - H) + facets.socialBoldness) / 300,
    empathy: (facets.sentimentality + facets.gentleness) / 200,
    impulsivity: ((100 - facets.prudence) + facets.liveliness) / 200,
  };
}

// ============================================
// HEXACO 人格生成函数
// ============================================

function generateHexacoScore(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const score = 50 + z * 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function generateFacetScore(domainScore: number): number {
  const variance = 15;
  const offset = (Math.random() - 0.5) * variance * 2;
  const score = domainScore + offset;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function generateHexacoProfile(): HexacoProfile {
  return {
    H: generateHexacoScore(),
    E: generateHexacoScore(),
    X: generateHexacoScore(),
    A: generateHexacoScore(),
    C: generateHexacoScore(),
    O: generateHexacoScore(),
  };
}

function generateHexacoFacets(profile: HexacoProfile): HexacoFacets {
  return {
    sincerity: generateFacetScore(profile.H),
    fairness: generateFacetScore(profile.H),
    greedAvoidance: generateFacetScore(profile.H),
    modesty: generateFacetScore(profile.H),
    fearfulness: generateFacetScore(profile.E),
    anxiety: generateFacetScore(profile.E),
    dependence: generateFacetScore(profile.E),
    sentimentality: generateFacetScore(profile.E),
    socialSelfEsteem: generateFacetScore(profile.X),
    socialBoldness: generateFacetScore(profile.X),
    sociability: generateFacetScore(profile.X),
    liveliness: generateFacetScore(profile.X),
    forgivingness: generateFacetScore(profile.A),
    gentleness: generateFacetScore(profile.A),
    flexibility: generateFacetScore(profile.A),
    patience: generateFacetScore(profile.A),
    organization: generateFacetScore(profile.C),
    diligence: generateFacetScore(profile.C),
    perfectionism: generateFacetScore(profile.C),
    prudence: generateFacetScore(profile.C),
    aestheticAppreciation: generateFacetScore(profile.O),
    inquisitiveness: generateFacetScore(profile.O),
    creativity: generateFacetScore(profile.O),
    unconventionality: generateFacetScore(profile.O),
  };
}

function calculateMetaTraits(profile: HexacoProfile): MetaTraits {
  const { H, E, X, A, C, O } = profile;

  const alpha = 0.30 * C + 0.30 * A + 0.25 * H + 0.15 * (100 - E);
  const beta = 0.60 * X + 0.40 * O;
  const delta = 0.35 * (100 - H) + 0.30 * (100 - C) + 0.20 * (100 - A) + 0.15 * X;
  const gamma = 0.40 * H + 0.35 * A + 0.25 * E;
  const pabi = gamma / (delta + 5);

  return {
    alpha: Math.round(alpha),
    beta: Math.round(beta),
    delta: Math.round(delta),
    gamma: Math.round(gamma),
    pabi: Math.round(pabi * 100) / 100,
  };
}

function calculateDarkTetrad(profile: HexacoProfile, facets: HexacoFacets): DarkTetrad {
  const { H, A } = profile;

  const machiavellianism = 0.40 * (100 - H) + 0.30 * facets.prudence +
    0.20 * (100 - facets.gentleness) + 0.10 * (100 - facets.sentimentality);

  const narcissism = 0.40 * facets.socialBoldness + 0.35 * (100 - facets.modesty) +
    0.15 * (100 - A) + 0.10 * facets.creativity;

  const psychopathy = 0.35 * (100 - facets.fearfulness) + 0.30 * (100 - facets.sincerity) +
    0.25 * (100 - facets.prudence) + 0.10 * (100 - A);

  const sadism = 0.50 * (100 - facets.gentleness) + 0.30 * (100 - facets.sentimentality) +
    0.20 * facets.socialBoldness;

  return {
    machiavellianism: Math.round(machiavellianism),
    narcissism: Math.round(narcissism),
    psychopathy: Math.round(psychopathy),
    sadism: Math.round(sadism),
  };
}

function calculateLightTriad(profile: HexacoProfile, facets: HexacoFacets): LightTriad {
  const kantianism = 0.50 * facets.fairness + 0.25 * facets.prudence +
    0.15 * facets.patience + 0.10 * facets.sincerity;

  const humanism = 0.40 * facets.gentleness + 0.30 * facets.modesty +
    0.20 * facets.sentimentality + 0.10 * facets.inquisitiveness;

  const faithInHumanity = 0.50 * facets.forgivingness + 0.30 * facets.sincerity +
    0.20 * (100 - facets.anxiety);

  return {
    kantianism: Math.round(kantianism),
    humanism: Math.round(humanism),
    faithInHumanity: Math.round(faithInHumanity),
  };
}

function identifyArchetype(
  profile: HexacoProfile,
  meta: MetaTraits,
  dark: DarkTetrad,
  light: LightTriad
): PersonalityArchetype {
  const dominated: PersonalityArchetype['dominated'] = [];

  if (dark.machiavellianism > 65) dominated.push('machiavellian');
  if (dark.narcissism > 65) dominated.push('narcissist');
  if (dark.psychopathy > 65) dominated.push('psychopath');
  if (dark.sadism > 65) dominated.push('sadist');

  if (light.kantianism > 65) dominated.push('kantian');
  if (light.humanism > 65) dominated.push('humanist');
  if (light.faithInHumanity > 65) dominated.push('faithful');

  if (dark.machiavellianism > 55 && meta.gamma > 55) dominated.push('benevolent_manipulator');
  if (dark.narcissism > 55 && profile.E > 60 && profile.X < 40) dominated.push('vulnerable_narcissist');
  if (profile.O > 75 && profile.X > 70 && profile.C < 30) dominated.push('chaotic_innovator');
  if (profile.C > 70 && profile.E < 30 && profile.A < 40) dominated.push('cold_executive');
  if (light.humanism > 60 && dark.narcissism > 50) dominated.push('savior_complex');
  if (light.kantianism > 60 && dark.sadism > 50) dominated.push('righteous_punisher');

  let primary: PersonalityArchetype['primary'] = 'balanced';

  if (meta.pabi > 2.0) primary = 'prosocial';
  else if (meta.pabi < 0.5) primary = 'antagonistic';
  else if (meta.alpha > 65 && meta.beta > 55) primary = 'adaptive_leader';
  else if (meta.alpha > 65 && meta.beta < 45) primary = 'reliable_guardian';
  else if (meta.alpha < 40 && meta.beta > 55) primary = 'chaotic_explorer';
  else if (meta.alpha < 40 && meta.beta < 45) primary = 'impaired';

  return { primary, dominated };
}

export class MaidenGenerator {

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

    const isshex = this.generateISShexPersonality();
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
      movement: createUnifiedMovementState(carriageId), // 修正为对齐接口
      isshex,
      profile,
      mood: 'content',
      moodDuration: 0,
      rank: 'unranked',
      rankColor: 'dim gray',
      relationships: [],
      memoryChain: [],
      memorySummary: '【档案封存】等待我接入回声档案馆以解密...',
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
    const validCupSizes = CUP_SIZES.filter(size => ['AAA', 'AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].includes(size));
    const cupSize = validCupSizes[Math.min(cupIndex, validCupSizes.length - 1)] as CupSize;

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
      dressLevel, // 补全着装层级字段
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

  generateISShexPersonality(): ISShexPersonality {
    const hexaco = generateHexacoProfile();
    const facets = generateHexacoFacets(hexaco);
    const metaTraits = calculateMetaTraits(hexaco);
    const darkTetrad = calculateDarkTetrad(hexaco, facets);
    const lightTriad = calculateLightTriad(hexaco, facets);
    const archetype = identifyArchetype(hexaco, metaTraits, darkTetrad, lightTriad);
    const behaviorWeights = calculateBehaviorWeights(hexaco, facets);

    let currentState: ISShexPersonality['currentState'] = 'adaptive';
    if (metaTraits.alpha > 65) currentState = 'integrated';
    else if (metaTraits.alpha < 40) currentState = 'stressed';

    return {
      hexaco,
      facets,
      metaTraits,
      darkTetrad,
      lightTriad,
      archetype,
      currentState,
      traitFatigue: 0,
      shadowActivation: 0,
      behaviorWeights,
    };
  }

  generateAttributes(isshex: ISShexPersonality): CharacterAttributes {
    const { hexaco, facets, behaviorWeights } = isshex;

    const sanityBase = 70 + Math.floor(Math.random() * 30);
    const sanityMod = (hexaco.C - 50) * 0.2 - (hexaco.E - 50) * 0.1;

    const obedienceBase = 30 + Math.floor(Math.random() * 20);
    const obedienceMod = behaviorWeights.obedienceBase;

    const lustBase = 5 + Math.floor(Math.random() * 15);
    const lustMod = (behaviorWeights.lustSensitivity - 0.5) * 20;

    const stressBase = 20 + Math.floor(Math.random() * 30);
    const stressMod = (facets.anxiety - 50) * 0.3;

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
      currentActivity: 'wandering', // 对齐合法的 ActivityStatus 定义
      activityStartTime: gameTimePassed,
      activityDuration: 30 * 60 * 1000,
      lastInteractionTime: 0,
      // 废弃原有的独立空间导航逻辑与散装社交对象结构，遵照元契约精简
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
    const ageYears = randomInt(14, 22);
    const now = gameTimePassed;
    const msPerYear = 365 * 24 * 60 * 60 * 1000;
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

export const maidenGenerator = new MaidenGenerator();