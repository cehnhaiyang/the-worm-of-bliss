import { ItemDef } from '../../meta';

/** 
 * @饰品类型
 */
export const ACCESSORY_TYPES: ItemDef[] = [
  // 颈部
  { id: 'collar', name: '项圈' },
  { id: 'choker', name: '颈环' },
  { id: 'necklace', name: '项链' },
  { id: 'pendant', name: '吊坠' },
  { id: 'bell_collar', name: '铃铛项圈' },
  // 耳部
  { id: 'stud_earrings', name: '耳钉' },
  { id: 'hoop_earrings', name: '圈形耳环' },
  { id: 'drop_earrings', name: '吊坠耳环' },
  { id: 'ear_cuff', name: '耳骨夹' },
  // 头部
  { id: 'headband', name: '发带' },
  { id: 'ribbon', name: '丝带' },
  { id: 'hair_clip', name: '发夹' },
  { id: 'hairpin', name: '发簪' },
  { id: 'tiara', name: '头冠' },
  { id: 'veil', name: '面纱' },
  { id: 'blindfold', name: '眼罩' },
  { id: 'mask', name: '面具' },
  // 手部
  { id: 'ring', name: '戒指' },
  { id: 'bracelet', name: '手链' },
  { id: 'bangle', name: '手镯' },
  { id: 'wrist_cuff', name: '腕带' },
  // 腿部/脚部
  { id: 'anklet', name: '脚链' },
  { id: 'ankle_cuff', name: '脚踝带' },
  { id: 'garter', name: '腿环' },
  // 身体
  { id: 'body_chain', name: '身体链' },
  { id: 'waist_chain', name: '腰链' },
  { id: 'nipple_jewelry', name: '乳饰' },
  // 束缚类
  { id: 'shackles', name: '镣铐' },
  { id: 'handcuffs', name: '手铐' },
  { id: 'ball_gag', name: '口球' },
  { id: 'leash', name: '牵引绳' },
  // 携带物
  { id: 'handbag', name: '手提包' },
  { id: 'clutch', name: '手拿包' },
  { id: 'book', name: '书籍' },
  { id: 'umbrella', name: '雨伞' },
  { id: 'fan', name: '扇子' },
  { id: 'rosary', name: '念珠' },
  { id: 'candle', name: '蜡烛' },
  { id: 'mirror', name: '镜子' },
  { id: 'doll', name: '玩偶' },
  { id: 'flower', name: '花朵' },
  { id: 'lantern', name: '提灯' },
];

/** 
 * @饰品颜色
 */
export const ACCESSORY_COLORS: ItemDef[] = [
  { id: 'gold', name: '金色' },
  { id: 'silver', name: '银色' },
  { id: 'black', name: '黑色' },
  { id: 'white', name: '白色' },
  { id: 'red', name: '红色' },
  { id: 'pink', name: '粉色' },
  { id: 'purple', name: '紫色' },
  { id: 'blue', name: '蓝色' },
  { id: 'green', name: '绿色' },
  { id: 'brown', name: '棕色' },
];

/** 
 * @饰品材质
 */
export const ACCESSORY_MATERIALS: ItemDef[] = [
  { id: 'gold', name: '黄金' },
  { id: 'silver', name: '白银' },
  { id: 'leather', name: '皮革' },
  { id: 'velvet', name: '天鹅绒' },
  { id: 'silk', name: '丝绸' },
  { id: 'lace', name: '蕾丝' },
  { id: 'metal', name: '金属' },
  { id: 'pearl', name: '珍珠' },
  { id: 'crystal', name: '水晶' },
  { id: 'rubber', name: '橡胶' },
  { id: 'rope', name: '麻绳' },
  { id: 'chain', name: '链条' },
  { id: 'fabric', name: '织物' },
  { id: 'wood', name: '木质' },
];

/** 束缚类饰品 ID 列表 */
export const BONDAGE_ACCESSORY_IDS = [
  'shackles', 'handcuffs', 'ball_gag', 'leash', 'wrist_cuff', 'ankle_cuff', 'blindfold',
];

/** 携带物 ID 列表 */
export const CARRYABLE_ITEM_IDS = [
  'handbag', 'clutch', 'book', 'umbrella', 'fan', 'candle', 'mirror', 'doll', 'flower', 'lantern',
];

/** 判断是否为束缚类饰品 */
export function isBondageAccessory(typeId: string): boolean {
  return BONDAGE_ACCESSORY_IDS.includes(typeId);
}

/** 判断是否为携带物 */
export function isCarryableItem(typeId: string): boolean {
  return CARRYABLE_ITEM_IDS.includes(typeId);
}
