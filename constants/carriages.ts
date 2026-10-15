import type { CarriageType, CarriageTypeInfo } from '../meta';

/** 圣所类型列表 (11种) */
export const SANCTUARY_TYPES: CarriageType[] = [
  // 社会性剥离
  'POOLS',           // 月光浴池
  'ATRIUM',          // 中庭
  'VEIL',            // 薄纱车厢
  // 个体性瓦解
  'CONFESSIONAL',    // 忏情室
  'ARCHIVE',         // 回声档案馆
  'MUSE_THEATRE',    // 苦痛缪斯剧场
  // 价值观重塑
  'SCALES_CONSERVATORY', // 天秤温室
  'GARDEN',          // 永绽花园
  // 循环
  'NURSERY',         // 育婴室
  'ALTAR',           // 祭坛
  'CAULDRON',        // 熔炉 (永远关闭)
];

/** 深渊类型列表 (12种) */
export const ABYSS_TYPES: CarriageType[] = [
  // 层级一：感官与逻辑扭曲
  'SILENT_SALON',    // 静默雅集
  'ORACLE_WHISPER',  // 神谕之声
  'NEGATIVE_GALLERY', // 负空间画廊
  'ESCHER_STAIRS',   // 埃舍尔阶梯
  // 层级二：时空与存在悖论
  'MIRROR_HALL',     // 异变映厅
  'TIME_INFIRMARY',  // 时滞病房
  'DISSOLUTION_CHAMBER', // 自我消融室
  // 层级三：宇宙级虚无与终极恐怖
  'FLESH_HIVE',      // 血肉巢穴
  'INVERTED_TREE',   // 倒生之树
  'SYMBIOTIC_GALLERY', // 共生回廊
  'VOID_WINDOW',     // 利维坦之窗
  'ENTROPY_CLOCK',   // 零熵之钟
];

// ============================================
// 车厢生成配置
// ============================================

/** 圣所车厢配置 - 按功能分类设定数量范围 */
export const SANCTUARY_CONFIG: {
  type: CarriageType;
  minCount: number;
  maxCount: number;
  category: string;
}[] = [
    // 社会性剥离 - 日常活动区，数量较多
    { type: 'POOLS', minCount: 8, maxCount: 15, category: '社会性剥离' },
    { type: 'ATRIUM', minCount: 20, maxCount: 35, category: '社会性剥离' },
    { type: 'VEIL', minCount: 6, maxCount: 12, category: '社会性剥离' },
    // 个体性瓦解 - 精神控制区，数量中等
    { type: 'CONFESSIONAL', minCount: 8, maxCount: 15, category: '个体性瓦解' },
    { type: 'ARCHIVE', minCount: 3, maxCount: 6, category: '个体性瓦解' },
    { type: 'MUSE_THEATRE', minCount: 2, maxCount: 4, category: '个体性瓦解' },
    // 价值观重塑 - 阶级与美学区
    { type: 'SCALES_CONSERVATORY', minCount: 4, maxCount: 8, category: '价值观重塑' },
    { type: 'GARDEN', minCount: 6, maxCount: 12, category: '价值观重塑' },
    // 循环 - 核心仪式区，数量稀少
    { type: 'NURSERY', minCount: 3, maxCount: 6, category: '循环' },
    { type: 'ALTAR', minCount: 1, maxCount: 2, category: '循环' },
    { type: 'CAULDRON', minCount: 1, maxCount: 1, category: '循环' }, // 唯一，永远关闭
  ];

/** 深渊层级配置 - 层级越高越稀少 */
export const ABYSS_TIERS: {
  tier: number;
  name: string;
  types: CarriageType[];
  totalCount: { min: number; max: number };
}[] = [
    // 层级一：感官与逻辑扭曲 - 较多，作为深渊的"入门"
    {
      tier: 1,
      name: '感官与逻辑扭曲',
      types: [
        'SILENT_SALON',
        'ORACLE_WHISPER',
        'NEGATIVE_GALLERY',
        'ESCHER_STAIRS'
      ],
      totalCount: { min: 15, max: 25 },
    },
    // 层级二：时空与存在悖论 - 中等
    {
      tier: 2,
      name: '时空与存在悖论',
      types: [
        'MIRROR_HALL',
        'TIME_INFIRMARY',
        'DISSOLUTION_CHAMBER'
      ],
      totalCount: { min: 8, max: 15 },
    },
    // 层级三：宇宙级虚无与终极恐怖 - 稀少，最危险
    {
      tier: 3,
      name: '宇宙级虚无',
      types: [
        'FLESH_HIVE',
        'INVERTED_TREE',
        'SYMBIOTIC_GALLERY',
        'VOID_WINDOW',
        'ENTROPY_CLOCK'
      ],
      totalCount: { min: 5, max: 10 },
    },
  ];

/** 填充剩余空位时可用的圣所类型 */
export const FILLER_SANCTUARY_TYPES: CarriageType[] = [
  'ATRIUM',  // 中庭 - 主要填充类型
  'GARDEN',  // 永绽花园
  'VEIL',    // 薄纱车厢
];

/** 车厢类型分布权重 (用于随机生成) */
export const CARRIAGE_DISTRIBUTION: { type: CarriageType; weight: number }[] = [
  // 圣所 - 权重较高
  { type: 'ATRIUM', weight: 15 },
  { type: 'POOLS', weight: 10 },
  { type: 'VEIL', weight: 8 },
  { type: 'CONFESSIONAL', weight: 8 },
  { type: 'GARDEN', weight: 6 },
  { type: 'SCALES_CONSERVATORY', weight: 5 },
  { type: 'ARCHIVE', weight: 4 },
  { type: 'MUSE_THEATRE', weight: 3 },
  { type: 'NURSERY', weight: 3 },
  { type: 'ALTAR', weight: 2 },
  { type: 'CAULDRON', weight: 1 },
  // 深渊 - 权重较低
  { type: 'SILENT_SALON', weight: 3 },
  { type: 'ORACLE_WHISPER', weight: 2 },
  { type: 'NEGATIVE_GALLERY', weight: 2 },
  { type: 'ESCHER_STAIRS', weight: 2 },
  { type: 'MIRROR_HALL', weight: 2 },
  { type: 'TIME_INFIRMARY', weight: 1 },
  { type: 'DISSOLUTION_CHAMBER', weight: 1 },
  { type: 'FLESH_HIVE', weight: 1 },
  { type: 'INVERTED_TREE', weight: 1 },
  { type: 'SYMBIOTIC_GALLERY', weight: 1 },
  { type: 'VOID_WINDOW', weight: 1 },
  { type: 'ENTROPY_CLOCK', weight: 1 },
];

// ============================================
// 车厢详细信息
// ============================================

export const CARRIAGE_TYPE_INFO: Array<CarriageTypeInfo> = [
  {
    // ========== 圣所 - 社会性剥离 ==========
    type: 'POOLS',
    name: 'Lustral Pools',
    nameCN: '月光浴池',
    category: 'sanctuary',
    subcategory: '社会性剥离',
    description: '如同古罗马浴场般的设计，由乳白色大理石建成。蒸汽缭绕，水声潺潺，穹顶投射着变幻的星空。没有隔间，只有一个巨大的、温度恒定的中央浴池和周边的淋浴区。',
    functions: ['消除个体差异', '强制亲密', '清洁身体'],
    visualTheme: 'marble roman bath, steam, starry ceiling',
    ambientSound: 'ambient_water',
    periodicEffects: {
      sanity: 0,
      lust: 2,
      stress: -1,
    }
  },
  {
    type: 'ATRIUM',
    name: 'Atrium',
    nameCN: '中庭',
    category: 'sanctuary',
    subcategory: '社会性剥离',
    description: '光线明亮、通透，永远播放着外部世界最流行、最舒缓的音乐。内部设计如顶级的私人会所，有舒适的沙发、飘着香气的咖啡吧和摆满无害读物的书架。',
    functions: ['认知失调', '日常活动', '休息', '用餐'],
    visualTheme: 'luxury lounge, sunlight, velvet sofa, coffee bar',
    ambientSound: 'ambient_train',
    periodicEffects: {
      sanity: 1,
      lust: 0,
      stress: -2,
    }
  },
  {
    type: 'VEIL',
    name: 'Veil',
    nameCN: '薄纱车厢',
    category: 'sanctuary',
    subcategory: '社会性剥离',
    description: '与中庭直接相连，没有门，只是光线逐渐黯淡下去的区域。空间被无数层半透明的黑色纱幔隔开，形成一个个私密性极高的卡座与角落。',
    functions: ['窥伺', '共犯化', '欲望宣泄'],
    visualTheme: 'dark curtains, dim lighting, shadows, private alcoves',
    ambientSound: 'ambient_whisper',
    periodicEffects: {
      sanity: -1,
      lust: 5,
      stress: -10,
    }
  },

  // ========== 圣所 - 个体性瓦解 ==========
  {
    type: 'CONFESSIONAL',
    name: 'Confessional Booths',
    nameCN: '忏情室',
    category: 'sanctuary',
    subcategory: '个体性瓦解',
    description: '一节光线昏暗的车厢，被分割成数十个独立的狭小隔间。隔间内只有一个柔软的跪垫、一个用于自慰的硅胶模具，和一块单向玻璃。',
    functions: ['数据采集', '隐私幻觉', '欲望量化'],
    visualTheme: 'dark booth, mirror glass, red light, kneeling pad',
    ambientSound: 'ambient_whisper',
    periodicEffects: {
      sanity: -2,
      lust: 3,
      stress: 2,
    }
  },
  {
    type: 'ARCHIVE',
    name: 'Echo Archive',
    nameCN: '回声档案馆',
    category: 'sanctuary',
    subcategory: '个体性瓦解',
    description: '一节如同古典图书馆的车厢，书架上陈列着数以千计储存着记忆的水晶棱柱。车厢中央有一个华丽鸟笼般的读取装置。',
    functions: ['记忆篡改', '历史重塑', '过去否定'],
    visualTheme: 'library, crystal prisms, birdcage reader',
    ambientSound: 'ambient_train',
    periodicEffects: {
      sanity: -3,
      lust: 0,
      stress: 3,
    }
  },
  {
    type: 'MUSE_THEATRE',
    name: 'Theatre of Agonizing Muses',
    nameCN: '苦痛缪斯剧场',
    category: 'sanctuary',
    subcategory: '个体性瓦解',
    description: '一个小型的、巴洛克风格的剧院，有天鹅绒幕布和鎏金雕饰。舞台中央永远有一束冰冷的追光。',
    functions: ['创伤艺术化', '自我解构', '强制表演'],
    visualTheme: 'baroque theatre, spotlight, velvet curtain, gilded',
    ambientSound: 'ambient_train',
    periodicEffects: {
      sanity: -4,
      lust: 1,
      stress: 4,
    }
  },

  // ========== 圣所 - 价值观重塑 ==========
  {
    type: 'SCALES_CONSERVATORY',
    name: "Scales' Conservatory",
    nameCN: '天秤温室',
    category: 'sanctuary',
    subcategory: '价值观重塑',
    description: '一节明亮的玻璃花房，垂下无数闪烁着不同颜色光芒的藤蔓。空气中弥漫着根据"等级"而变化的独特香气。',
    functions: ['阶级建立', '竞争', '价值量化'],
    visualTheme: 'greenhouse, glowing vines, flowers, hierarchy',
    ambientSound: 'ambient_train',
    periodicEffects: {
      sanity: -1,
      lust: 0,
      stress: 2,
    }
  },
  {
    type: 'GARDEN',
    name: 'Garden of Perpetual Bloom',
    nameCN: '永绽花园',
    category: 'sanctuary',
    subcategory: '价值观重塑',
    description: '一节巨大的玻璃穹顶车厢，内部是一个恒温恒湿的室内花园，种植着永不凋谢的珍奇花卉。灌溉这些花朵的，正是来自熔炉的再循环营养液。',
    functions: ['循环之美', '休憩', '死亡美学'],
    visualTheme: 'glass dome, eternal flowers, recycled beauty',
    ambientSound: 'ambient_water',
    periodicEffects: {
      sanity: 2,
      lust: 1,
      stress: -3,
    }
  },

  // ========== 圣所 - 循环 ==========
  {
    type: 'NURSERY',
    name: 'Nursery',
    nameCN: '育婴室',
    category: 'sanctuary',
    subcategory: '循环',
    description: '充满了数百个悬浮在半空的透明凝胶维生舱。环境绝对安静，只有维生系统循环"羊水花蜜"时低沉的嗡鸣。',
    functions: ['孕育', '梦境控制', '情绪管理'],
    visualTheme: 'womb tanks, sterile white, floating capsules',
    ambientSound: 'ambient_heartbeat',
    periodicEffects: {
      sanity: -2,
      lust: 0,
      stress: -5,
    }
  },
  {
    type: 'ALTAR',
    name: 'Altar',
    nameCN: '祭坛',
    category: 'sanctuary',
    subcategory: '循环',
    description: '纯白色的、如同未来主义教堂般的无菌房间。穹顶是一块完整的显示屏，实时投射着利维坦之窗的宇宙虚空。中央是一张由黑曜石制成的产床。',
    functions: ['分娩', '圣餐仪式', '生命循环'],
    visualTheme: 'white room, obsidian bed, void window projection',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -5,
      lust: 0,
      stress: 5,
    }
  },
  {
    type: 'CAULDRON',
    name: 'Cauldron',
    nameCN: '熔炉',
    category: 'sanctuary',
    subcategory: '循环',
    description: '冰冷的、充满管道与反应釜的工业车厢，高温高压的能量核心发出令人敬畏的低吼。一切有机物与无机物都将被还原为最基本的元素。唯一一节永远对少女们关闭的车厢。',
    functions: ['物质回收', '永远关闭', '循环终点'],
    visualTheme: 'industrial, pipes, energy core, high pressure',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -10,
      lust: 0,
      stress: 10,
    }
  },

  // ========== 深渊 - 层级一：感官与逻辑扭曲 ==========
  {
    type: 'SILENT_SALON',
    name: 'Silent Salon',
    nameCN: '静默雅集',
    category: 'abyss',
    subcategory: '感官扭曲',
    description: '一节维多利亚风格的沙龙，坐满了栩栩如生的人偶。车厢内绝对静默。每一次连接时，人偶的姿态、朝向、甚至表情都会发生无法解释的细微变化。',
    functions: ['恐怖谷', '现实质疑', '绝对静默'],
    visualTheme: 'victorian salon, mannequins, absolute silence',
    ambientSound: 'ambient_whisper',
    periodicEffects: {
      sanity: -5,
      lust: 0,
      stress: 5,
    }
  },
  {
    type: 'ORACLE_WHISPER',
    name: "Oracle's Whisper",
    nameCN: '神谕之声',
    category: 'abyss',
    subcategory: '感官扭曲',
    description: '完全漆黑的车厢，会持续播放混乱的声音。观测者会清晰地听到自己的名字，被一种非人的、冰冷的声音，用自己母亲的语调反复低语。',
    functions: ['听觉侵蚀', '身份动摇', '母亲幻听'],
    visualTheme: 'pitch black, whispers, mothers voice',
    ambientSound: 'ambient_whisper',
    periodicEffects: {
      sanity: -7,
      lust: 0,
      stress: 6,
    }
  },
  {
    type: 'NEGATIVE_GALLERY',
    name: 'Negative-Space Gallery',
    nameCN: '负空间画廊',
    category: 'abyss',
    subcategory: '感官扭曲',
    description: '纯白色的画廊，墙上挂着许多内部是纯粹虚无的画框。观测者走过时，自己的影子会被"剥离"并"投影"进画框里，独立地扭曲活动。',
    functions: ['影子剥离', '自我分裂', '虚无画框'],
    visualTheme: 'white gallery, void frames, living shadows',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -6,
      lust: 0,
      stress: 5,
    }
  },
  {
    type: 'ESCHER_STAIRS',
    name: 'Escherian Stairwell',
    nameCN: '埃舍尔阶梯',
    category: 'abyss',
    subcategory: '感官扭曲',
    description: '车厢内部是无数互相连接、违反重力与空间逻辑的楼梯。一些面目模糊的身影，在楼梯上永恒地、没有目的地行走着。',
    functions: ['空间崩坏', '方向丧失', '无限循环'],
    visualTheme: 'impossible stairs, faceless figures, gravity defying',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -8,
      lust: 0,
      stress: 7,
    }
  },

  // ========== 深渊 - 层级二：时空与存在悖论 ==========
  {
    type: 'MIRROR_HALL',
    name: 'Hall of Aberrant Reflections',
    nameCN: '异变映厅',
    category: 'abyss',
    subcategory: '时空悖论',
    description: '一节由无数镜面构成的车厢。起初，所有镜子都正常映照。但其中一个或多个倒影的动作会与自己并不同步——它们会微笑、会哭泣，甚至会做出割喉的手势。',
    functions: ['自我认知崩坏', '身份分裂', '倒影独立'],
    visualTheme: 'infinite mirrors, distorted reflections, hostile self',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -9,
      lust: 0,
      stress: 8,
    }
  },
  {
    type: 'TIME_INFIRMARY',
    name: 'Time-Lag Infirmary',
    nameCN: '时滞病房',
    category: 'abyss',
    subcategory: '时空悖论',
    description: '一节古典疗养院病房。透过玻璃门，观测者会看到其中一个病床上躺着衰老了几十岁的、垂死的自己；而在另一个摇篮里，则躺着婴儿时期的自己。',
    functions: ['时间恐惧', '死亡预见', '生命全景'],
    visualTheme: 'hospital ward, aged self, baby self, time paradox',
    ambientSound: 'ambient_clock',
    periodicEffects: {
      sanity: -10,
      lust: 0,
      stress: 9,
    }
  },
  {
    type: 'DISSOLUTION_CHAMBER',
    name: 'Chamber of Self-Dissolution',
    nameCN: '自我消融室',
    category: 'abyss',
    subcategory: '时空悖论',
    description: '车厢内充满了浓厚的、闪烁着微光的雾气。任何窥探其中的少女，都会在雾中看到一个与自己身形一致的轮廓，但那轮廓的"脸"却是所有她认识的同伴的面容如流水般不断融合、变换。',
    functions: ['自我攻击', '身份模糊', '面容融合'],
    visualTheme: 'glowing mist, morphing faces, identity dissolution',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -8,
      lust: 0,
      stress: 7,
    }
  },

  // ========== 深渊 - 层级三：宇宙级虚无与终极恐怖 ==========
  {
    type: 'FLESH_HIVE',
    name: 'Flesh Hive',
    nameCN: '血肉巢穴',
    category: 'abyss',
    subcategory: '宇宙虚无',
    description: '车厢的墙壁、天花板和地板，都是由缓慢搏动的、温热的、粉红色活体血肉构成，布满了巨大的血管和随机开合的、如同瞳孔般的孔洞。',
    functions: ['生物恐惧', '被吞噬感', '血肉共鸣'],
    visualTheme: 'living meat walls, veins, eyes, pulsating flesh',
    ambientSound: 'ambient_flesh',
    periodicEffects: {
      sanity: -12,
      lust: 2,
      stress: 10,
    }
  },
  {
    type: 'INVERTED_TREE',
    name: 'Inverted Progenitor',
    nameCN: '倒生之树',
    category: 'abyss',
    subcategory: '宇宙虚无',
    description: '一棵巨大的、由苍白骨质构成的"树"从天花板倒生下来，树枝上结着一颗颗缓慢搏动的、内含畸形器官的半透明"果实"。整棵树会发出一种类似无数人濒死时喉咙中嗬嗬作响的低语。',
    functions: ['生命扭曲', '起源恐惧', '濒死低语'],
    visualTheme: 'bone tree, organ fruits, death rattle whispers',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -11,
      lust: 0,
      stress: 9,
    }
  },
  {
    type: 'SYMBIOTIC_GALLERY',
    name: 'Symbiotic Gallery',
    nameCN: '共生回廊',
    category: 'abyss',
    subcategory: '宇宙虚无',
    description: '一条洁白的长廊，墙壁上"镶嵌"着数十个与墙壁融为一体的人类躯体，表情平静幸福。当观测者靠近时，一个沉睡者会睁开眼睛，其瞳孔已变成万花筒般的晶体，对着她露出极乐的微笑。',
    functions: ['融合诱惑', '自我放弃', '极乐孢子'],
    visualTheme: 'merged bodies, peaceful faces, spores, kaleidoscope eyes',
    ambientSound: 'ambient_flesh',
    periodicEffects: {
      sanity: -10,
      lust: 3,
      stress: 6,
    }
  },
  {
    type: 'VOID_WINDOW',
    name: "Leviathan's Window",
    nameCN: '利维坦之窗',
    category: 'abyss',
    subcategory: '宇宙虚无',
    description: '这节车厢只有一面巨大的落地窗，窗外是纯粹的、深不见底的宇宙虚空。偶尔，毫无征兆地，一只比整列火车还要巨大的、由纯粹几何光影构成的眼睛，会从虚空中缓缓睁开。',
    functions: ['宇宙恐惧', '渺小感', '利维坦凝视'],
    visualTheme: 'giant window, cosmic eye, void, geometric entity',
    ambientSound: 'ambient_horror',
    periodicEffects: {
      sanity: -15,
      lust: 0,
      stress: 12,
    }
  },
  {
    type: 'ENTROPY_CLOCK',
    name: 'Clock of Zero Entropy',
    nameCN: '零熵之钟',
    category: 'abyss',
    subcategory: '宇宙虚无',
    description: '车厢中央，悬浮着一个由暗物质构成的巨大钟摆，无声地缓慢摆动。车厢内的时间流速是混乱的。观测者会看到自己的双手在瞬间化为枯骨又恢复原状。',
    functions: ['时间恐惧', '热寂预见', '存在虚无'],
    visualTheme: 'dark matter pendulum, time distortion, entropy visualization',
    ambientSound: 'ambient_clock',
    periodicEffects: {
      sanity: -13,
      lust: 0,
      stress: 11,
    }
  }
];