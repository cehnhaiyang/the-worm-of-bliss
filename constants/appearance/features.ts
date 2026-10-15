
// ============================================
// 面部与体表特征系统
// ============================================

import { ItemDef } from '../../meta';

/** 面部特征 */
export const FACIAL_FEATURES: ItemDef[] = [
  { id: 'high_cheekbones', name: '高颧骨' },
  { id: 'dimples', name: '酒窝' },
  { id: 'beauty_mark', name: '美人痣' },
  { id: 'freckles', name: '雀斑' },
  { id: 'full_lips', name: '丰唇' },
  { id: 'thin_lips', name: '薄唇' },
  { id: 'button_nose', name: '小巧鼻' },
  { id: 'aquiline_nose', name: '鹰钩鼻' },
  { id: 'sharp_jawline', name: '锐利下颌' },
  { id: 'soft_jawline', name: '柔和下颌' },
  { id: 'pointed_chin', name: '尖下巴' },
  { id: 'round_face', name: '圆脸' },
  { id: 'oval_face', name: '鹅蛋脸' },
  { id: 'heart_face', name: '心形脸' },
  { id: 'long_face', name: '长脸' },
];

/** 体表特征 - 先天 */
export const BIRTHMARKS: ItemDef[] = [
  { id: 'none', name: '无' },
  { id: 'small_mole', name: '小痣' },
  { id: 'birthmark', name: '胎记' },
  { id: 'beauty_spot', name: '美人痣' },
  { id: 'freckles', name: '雀斑' },
];

/** 体表特征 - 后天 */
export const BODY_MARKS: ItemDef[] = [
  { id: 'none', name: '无' },
  { id: 'scars', name: '疤痕' },
  { id: 'tattoo', name: '纹身' },
  { id: 'brand', name: '烙印' },
  { id: 'whip_marks', name: '鞭痕' },
  { id: 'bite_marks', name: '咬痕' },
  { id: 'rope_marks', name: '勒痕' },
  { id: 'needle_marks', name: '针孔' },
  { id: 'bruises', name: '淤青' },
];

/** 体型描述 */
export const BODY_TYPES = [
  '娇小',         // petite
  '纤细',         // slender
  '纤弱',         // delicate
  '优雅',         // graceful
  '健美',         // athletic
  '丰满',         // curvy
  '丰腴',         // voluptuous
  '柔软',         // soft
  '高挑',         // tall
  '柔韧',         // lithe
] as const;
