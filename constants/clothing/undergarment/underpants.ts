import { ItemDef } from '../../../meta';

/**
 * @衬裤类型
 * 注意！！！区别于内裤，指出于保暖、防护等目的的贴身下装
 */
export const UNDERPANTS_TYPES: ItemDef[] = [
  { id: 'safety_shorts', name: '防走光裤' },
  { id: 'bloomers', name: '灯笼裤' },
  { id: 'thermal_pants', name: '保暖裤' },
  { id: 'leggings', name: '打底裤' },
  { id: 'shapewear_pants', name: '塑身裤' },
  { id: 'petticoat', name: '内衬裙' },
  { id: 'maternity_panties', name: '托腹裤' },
];

/**
 * @衬裤颜色
 */
export const UNDERPANTS_COLORS: ItemDef[] = [
  { id: 'white', name: '纯洁白' },
  { id: 'black', name: '夜幕黑' },
  { id: 'nude', name: '肉色' },
  { id: 'gray', name: '黯灰色' },
  { id: 'cream', name: '奶油色' },
  { id: 'pink', name: '樱花粉' },
  { id: 'crimson', name: '猩红色' },
  { id: 'wine_red', name: '酒红色' },
  { id: 'translucent', name: '半透明' },
];

/**
 * @衬裤材质
 */
export const UNDERPANTS_MATERIALS: ItemDef[] = [
  { id: 'cotton', name: '纯棉' },
  { id: 'spandex', name: '氨纶' },
  { id: 'thermal', name: '保暖绒' },
  { id: 'silk', name: '真丝' },
  { id: 'satin', name: '缎面' },
  { id: 'lace', name: '蕾丝' },
  { id: 'mesh', name: '半透网纱' },
  { id: 'latex', name: '紧身乳胶' },
  { id: 'leather', name: '粗糙皮革' },
  { id: 'metal', name: '冷硬金属' }
];