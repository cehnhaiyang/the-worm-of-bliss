// ============================================
// 肤色与肤质系统
// ============================================

import { ItemDef } from '../../meta';

/** 肤色 */
export const SKIN_TONES: ItemDef[] = [
  // 常规肤色
  { id: 'porcelain', name: '瓷白' },
  { id: 'pale', name: '苍白' },
  { id: 'ivory', name: '象牙白' },
  { id: 'fair', name: '白皙' },
  { id: 'cream', name: '奶油色' },
  { id: 'light', name: '浅肤色' },
  { id: 'medium', name: '中等肤色' },
  { id: 'olive', name: '橄榄色' },
  { id: 'tan', name: '小麦色' },
  { id: 'caramel', name: '焦糖色' },
  { id: 'brown', name: '棕色' },
  { id: 'dark', name: '深色' },
  { id: 'ebony', name: '乌木色' },
  // 病态/深渊肤色
  { id: 'ashy', name: '死灰色' },
  { id: 'translucent', name: '病态半透明' },
  { id: 'livid', name: '铁青色' },
];

/** 肤质基准 */
export const SKIN_TEXTURES: ItemDef[] = [
  // 健康
  { id: 'smooth', name: '光滑' },
  { id: 'soft', name: '柔软' },
  { id: 'silky', name: '丝滑' },
  { id: 'dewy', name: '水润' },
  { id: 'matte', name: '哑光' },
  { id: 'glowing', name: '光泽' },
  // 异化与恶化
  { id: 'freckled', name: '雀斑' },
  { id: 'scarred', name: '疤痕纵横' },
  { id: 'marked', name: '印记覆盖' },
  { id: 'calloused', name: '粗糙覆茧' },
  { id: 'clammy', name: '病态湿冷' },
  { id: 'veiny', name: '青筋凸显' },
  { id: 'corrupted', name: '异化结鳞' },
];

/** 肤色状态 - 动态临时变化 */
export const SKIN_CONDITIONS: string[] = [
  '正常',       // normal
  '潮红',       // flushed (动情/高欲望)
  '惨白',       // pale (恐惧/失血)
  '出汗',       // sweaty (高压/疲劳)
  '淤青',       // bruised (受虐/战斗)
  '脏污',       // dirty (低清洁度)
  '湿润',       // wet (沐浴后/水生环境)
  '油腻',       // oily (极低清洁度)
  '发热',       // feverish (疾病/排卵期体温升高)
  '战栗',       // shivering (极寒/恐惧引发的鸡皮疙瘩)
  '黏腻',       // sticky (深渊粘液/体液残留)
  '渗血',       // bleeding (近期创伤/极低健康值)
];