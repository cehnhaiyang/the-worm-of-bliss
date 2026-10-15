import { UndergarmentLayer } from '../../../meta';

export * from './stockings';
export * from './undershirt';
export * from './underpants';

/** 裸露贴身层 */
export const NAKED_UNDERGARMENT_LAYER: UndergarmentLayer = {
  stockings: { type: { id: 'none', name: '无' } },
  undershirt: { type: { id: 'none', name: '无' } },
  underpants: { type: { id: 'none', name: '无' } },
};
