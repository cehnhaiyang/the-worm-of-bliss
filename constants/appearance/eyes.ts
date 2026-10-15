// ============================================
// 眼睛系统
// ============================================

import { ItemDef } from '../../meta';

/** 瞳色 */
export const EYE_COLORS: ItemDef[] = [
  { id: 'brown', name: '棕色' },
  { id: 'hazel', name: '榛色' },
  { id: 'amber', name: '琥珀色' },
  { id: 'emerald_green', name: '翠绿色' },
  { id: 'azure_blue', name: '蔚蓝色' },
  { id: 'smoky_gray', name: '烟灰色' },
  { id: 'deep_black', name: '深黑色' },
  { id: 'clouded', name: '浑浊色' },
  { id: 'violet', name: '紫罗兰色' },
  { id: 'golden', name: '灿金色' },
  { id: 'crimson', name: '绯红色' },
  { id: 'mercury_silver', name: '水银色' },
  { id: 'heterochromia', name: '异色瞳' },
  { id: 'pale_pink', name: '淡粉色' },
  { id: 'turquoise', name: '绿松石色' },
];

/** 眼型 */
export const EYE_SHAPES: ItemDef[] = [
  { id: 'almond', name: '杏眼' },
  { id: 'round', name: '圆眼' },
  { id: 'upturned', name: '上挑眼' },
  { id: 'downturned', name: '下垂眼' },
  { id: 'hooded', name: '内双' },
  { id: 'monolid', name: '单眼皮' },
  { id: 'cat', name: '猫眼' },
  { id: 'doe', name: '小鹿眼' },
];

/** 眼神特征 (高维情绪投射) */
export const EYE_EXPRESSIONS: ItemDef[] = [
  // 基础神态
  { id: 'bright', name: '明亮' },
  { id: 'dreamy', name: '梦幻' },
  { id: 'sharp', name: '锐利' },
  { id: 'gentle', name: '温柔' },
  { id: 'cold', name: '冷漠' },
  { id: 'innocent', name: '天真' },
  { id: 'seductive', name: '妩媚' },
  { id: 'piercing', name: '穿透力' },
  // 对应 MoodState 与系统高压环境的特化神态
  { id: 'vacant', name: '空洞' },
  { id: 'despairing', name: '绝望' },
  { id: 'crazed', name: '狂乱' },
  { id: 'pleading', name: '哀求' },
  { id: 'submissive', name: '顺从' },
  { id: 'dead', name: '死寂' },
  { id: 'devoted', name: '狂热虔诚' },
  { id: 'terrified', name: '极度恐惧' },
  { id: 'numb', name: '麻木' },
];