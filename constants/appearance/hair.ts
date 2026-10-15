// ============================================
// 发型与发色系统
// ============================================

import { ItemDef } from '../../meta';

export const HAIR_COLORS: ItemDef[] = [
  { id: 'black', name: '黑色' },
  { id: 'brown', name: '棕色' },
  { id: 'chestnut', name: '栗色' },
  { id: 'auburn', name: '赤褐色' },
  { id: 'blonde', name: '金色' },
  { id: 'platinum', name: '铂金色' },
  { id: 'copper', name: '铜色' },
  { id: 'raven', name: '乌黑色' },
  { id: 'white', name: '雪白色' },
  { id: 'silver', name: '银色' },
  { id: 'ash_grey', name: '灰白色' },
  { id: 'faded_blonde', name: '褪色暗金' },
  { id: 'dull_black', name: '枯黑色' },
  { id: 'sakura_pink', name: '樱粉色' },
  { id: 'lavender', name: '淡紫色' },
  { id: 'dark_blue', name: '深蓝色' },
  { id: 'teal', name: '青色' },
  { id: 'crimson', name: '绯红色' },
  { id: 'mint_green', name: '薄荷绿' },
  { id: 'abyssal_purple', name: '暗紫' },
  { id: 'blood_crimson', name: '猩红血色' }
];

/** 发型 */
export const HAIR_STYLES: ItemDef[] = [
  // 披发
  { id: 'straight', name: '直发' },
  { id: 'wavy', name: '波浪' },
  { id: 'curly', name: '卷发' },
  { id: 'drill', name: '螺旋卷' },
  // 短发
  { id: 'bob', name: '波波头' },
  { id: 'pixie', name: '精灵短发' },
  // 扎发
  { id: 'ponytail', name: '马尾' },
  { id: 'twintails', name: '双马尾' },
  { id: 'braid', name: '编发' },
  { id: 'bun', name: '丸子头' },
  { id: 'updo', name: '盘发' },
  // 特殊/创伤状态
  { id: 'hime_cut', name: '姬发式' },
  { id: 'side_swept', name: '侧分' },
  { id: 'messy', name: '凌乱散发' },
  { id: 'chopped', name: '粗暴断发' },
  { id: 'shaved', name: '剃发' },
];

/** 发质 */
export const HAIR_TEXTURES: ItemDef[] = [
  // 健康
  { id: 'silky', name: '丝滑' },
  { id: 'glossy', name: '光泽' },
  { id: 'fluffy', name: '蓬松' },
  { id: 'thick', name: '浓密' },
  { id: 'fine', name: '细软' },
  // 异常/恶化
  { id: 'coarse', name: '粗硬' },
  { id: 'frizzy', name: '毛躁' },
  { id: 'withered', name: '干枯' },
  { id: 'greasy', name: '油腻' },
  { id: 'matted', name: '板结打结' },
];

/** 发长 */
export const HAIR_LENGTHS: ItemDef[] = [
  { id: 'shaved', name: '寸头' },
  { id: 'very_short', name: '超短' },
  { id: 'short', name: '短发' },
  { id: 'medium_length', name: '中长' },
  { id: 'long', name: '长发' },
  { id: 'very_long', name: '超长' },
  { id: 'floor_length', name: '及地长发' },
];