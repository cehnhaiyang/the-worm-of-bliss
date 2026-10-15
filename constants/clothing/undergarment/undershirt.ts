import { ItemDef } from '../../../meta';

/**
 * @衬衣
 * 注意！！！这是上装内衣，需要区别于胸罩、抹胸等与“胸部”强相关的服装！
 */
export const UNDERSHIRT_TYPES: ItemDef[] = [
  { id: 'tank_top', name: '工字背心' },
  { id: 'camisole', name: '吊带衫' },
  { id: 'undershirt', name: '基础打底衫' },
  { id: 'thermal_shirt', name: '保暖内衣' },
  { id: 'slip', name: '全杯衬裙' },
  { id: 'straitjacket_top', name: '拘束上衣' },
  { id: 'crop_top', name: '超短脐上衣' },
  { id: 'open_bust_corset', name: '露乳束腰' },
  { id: 'babydoll', name: '半透情趣睡裙' },
];

/**
 * @衬衣颜色
 */
export const UNDERSHIRT_COLORS: ItemDef[] = [
  { id: 'white', name: '献祭白' },
  { id: 'black', name: '深渊黑' },
  { id: 'nude', name: '肉色' },
  { id: 'gray', name: '囚徒灰' },
  { id: 'cream', name: '象牙白' },
  { id: 'pink', name: '肉粉色' },
  { id: 'blood_red', name: '暗血红' }, 
  { id: 'gold', name: '灿金色' },
  { id: 'translucent', name: '半透明' }, 
];

/**
 * @衬衣材质
 */
export const UNDERSHIRT_MATERIALS: ItemDef[] = [
  { id: 'cotton', name: '棉质' },
  { id: 'linen', name: '粗麻' },
  { id: 'thermal', name: '保暖面料' },
  { id: 'silk', name: '丝绸' },
  { id: 'satin', name: '缎面' },
  { id: 'velvet', name: '天鹅绒' },
  { id: 'lace', name: '精工蕾丝' },
  { id: 'mesh', name: '透视网纱' },
  { id: 'gauze', name: '轻薄薄纱' },
  { id: 'latex', name: '密闭乳胶' }, 
  { id: 'leather', name: '厚重皮革' },
];