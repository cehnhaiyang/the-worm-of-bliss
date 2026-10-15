export * from './intimate';
export * from './undergarment';
export * from './outerwear';
export * from './accessories';

import { ClothingState, DressLevel, AttireState } from '../../meta';

export const ATTIRE_STATE_LABELS: Record<AttireState, string> = {
  intact: '完好',
  torn: '破损',
  disheveled: '凌乱',
  wet: '湿透',
  dirty: '污浊',
  bloody: '血迹',
  transparent: '透光',
};

export const DRESS_LEVEL_LABELS: Record<DressLevel, string> = {
  fully_dressed: '着装完整',
  partially_dressed: '衣衫不整',
  underwear_only: '仅着内衣',
  naked: '全裸',
};

export function calculateDressLevel(clothing: ClothingState): DressLevel {
  const hasOuterwear = clothing.outerwear.top.type.id !== 'none' || clothing.outerwear.bottom.type.id !== 'none';
  const hasUndergarment = clothing.undergarment.undershirt.type.id !== 'none' || clothing.undergarment.underpants.type.id !== 'none';
  const hasIntimate = clothing.intimate.bra.type.id !== 'none' || clothing.intimate.panties.type.id !== 'none';

  if (hasOuterwear) return 'fully_dressed';
  if (hasUndergarment || hasIntimate) return hasIntimate && !hasUndergarment ? 'underwear_only' : 'partially_dressed';
  return 'naked';
}