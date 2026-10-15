// ============================================
// 私密层常量导出
// ============================================

import { IntimateLayer } from '../../../meta';

export * from './bra';
export * from './panties';

/** 裸露私密层 */
export const NAKED_INTIMATE_LAYER: IntimateLayer = {
  bra: { type: { id: 'none', name: '无' } },
  panties: { type: { id: 'none', name: '无' } },
};
