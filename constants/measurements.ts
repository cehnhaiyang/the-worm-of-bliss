
// ============================================
// 身体数值生成规则 (Measurement Rules)
// 用于生成逼真的身高和三围数据
// ============================================

import { BodyArchetypeConfig } from '../meta';

/** 罩杯列表 (从平胸到巨乳) */
export const CUP_SIZES = ['AA', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

/** 身体原型配置 - 用于保证数值的一致性 */
export const BODY_ARCHETYPES: Record<string, BodyArchetypeConfig> = {
  'petite': {
    weight: 20,
    heightRange: [145, 158],
    bustModifier: 0.51,
    waistModifier: 0.38,
    hipModifier: 0.53,
    cupRange: [0, 2], // AA - B
    descriptions: ['娇小', '骨架小', '纤弱', '矮小'],
  },
  'slender': {
    weight: 25,
    heightRange: [158, 172],
    bustModifier: 0.52,
    waistModifier: 0.37,
    hipModifier: 0.54,
    cupRange: [1, 3], // A - C
    descriptions: ['纤细', '柳腰', '瘦削', '精瘦'],
  },
  'average': {
    weight: 25,
    heightRange: [155, 170],
    bustModifier: 0.54,
    waistModifier: 0.40,
    hipModifier: 0.56,
    cupRange: [2, 5], // B - E
    descriptions: ['匀称', '柔软', '健康', '中等身材'],
  },
  'curvy': {
    weight: 15,
    heightRange: [155, 175],
    bustModifier: 0.58,
    waistModifier: 0.41,
    hipModifier: 0.60,
    cupRange: [4, 8], // D - H
    descriptions: ['丰满', '肉感', '沙漏型', '丰润'],
  },
  'tall': {
    weight: 10,
    heightRange: [172, 185],
    bustModifier: 0.53,
    waistModifier: 0.39,
    hipModifier: 0.55,
    cupRange: [2, 6], // B - F
    descriptions: ['高挑', '雕塑般', '长腿', '模特身材'],
  },
  'busty': {
    weight: 5,
    heightRange: [150, 170],
    bustModifier: 0.62,
    waistModifier: 0.40,
    hipModifier: 0.58,
    cupRange: [6, 11], // F - K
    descriptions: ['巨乳', '丰硕', '爆乳', '上围丰满'],
  }
};
