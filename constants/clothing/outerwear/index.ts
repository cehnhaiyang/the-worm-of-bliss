import { OuterwearLayer } from '../../../meta';

export * from './top';
export * from './bottom';
export * from './gloves';
export * from './shoes';

/** 裸露外显层 */
export const NAKED_OUTERWEAR_LAYER: OuterwearLayer = {
  top: { type: { id: 'none', name: '无' } },
  bottom: { type: { id: 'none', name: '无' } },
  gloves: { type: { id: 'none', name: '无' } },
  shoes: { type: { id: 'none', name: '无' } },
};

/** 浴后外显层 */
export const BATHING_OUTERWEAR_LAYER: OuterwearLayer = {
  top: { type: { id: 'bath_towel', name: '浴巾' }, color: { id: 'white', name: '白色' } },
  bottom: { type: { id: 'none', name: '无' } },
  gloves: { type: { id: 'none', name: '无' } },
  shoes: { type: { id: 'slippers', name: '拖鞋' }, color: { id: 'white', name: '白色' } },
};
