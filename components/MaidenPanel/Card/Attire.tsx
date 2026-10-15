// ============================================
// 服装面板
// ============================================

import React, { memo } from 'react';
import { ClothingState, ItemDef } from '../../../meta';
import { ATTIRE_STATE_LABELS, calculateDressLevel, DRESS_LEVEL_LABELS } from '../../../constants';

interface AttireProps {
  clothing: ClothingState;
}

const formatClothingDesc = (item: { type: ItemDef; color?: ItemDef; material?: ItemDef }): string => {
  if (item.type.id === 'none') return '';
  const parts = [item.color?.name, item.material?.name, item.type.name].filter(Boolean);
  return parts.join('');
};

export const Attire = memo<AttireProps>(({ clothing }) => {
  const dressLevel = calculateDressLevel(clothing);
  const stateLabel = ATTIRE_STATE_LABELS[clothing.state];

  const stateColorMap: Record<string, string> = {
    torn: 'text-red-400', bloody: 'text-red-400',
    wet: 'text-cyan-400', transparent: 'text-cyan-400',
    dirty: 'text-orange-400', disheveled: 'text-orange-400',
  };
  const stateColor = stateColorMap[clothing.state] || 'text-zinc-500';

  const items: { label: string; desc: string; layer: 'outer' | 'under' | 'intimate' }[] = [];

  if (clothing.outerwear.top.type.id !== 'none')
    items.push({ label: '上装', desc: formatClothingDesc(clothing.outerwear.top), layer: 'outer' });
  if (clothing.outerwear.bottom.type.id !== 'none')
    items.push({ label: '下装', desc: formatClothingDesc(clothing.outerwear.bottom), layer: 'outer' });
  if (clothing.outerwear.shoes.type.id !== 'none')
    items.push({ label: '鞋', desc: formatClothingDesc(clothing.outerwear.shoes), layer: 'outer' });
  if (clothing.outerwear.gloves.type.id !== 'none')
    items.push({ label: '手套', desc: formatClothingDesc(clothing.outerwear.gloves), layer: 'outer' });

  if (clothing.undergarment.stockings.type.id !== 'none')
    items.push({ label: '袜', desc: formatClothingDesc(clothing.undergarment.stockings), layer: 'under' });
  if (clothing.undergarment.undershirt.type.id !== 'none')
    items.push({ label: '内衬', desc: formatClothingDesc(clothing.undergarment.undershirt), layer: 'under' });

  if (clothing.intimate.bra.type.id !== 'none')
    items.push({ label: '胸衣', desc: formatClothingDesc(clothing.intimate.bra), layer: 'intimate' });
  if (clothing.intimate.panties.type.id !== 'none')
    items.push({ label: '内裤', desc: formatClothingDesc(clothing.intimate.panties), layer: 'intimate' });

  return (
    <div className="bg-zinc-900/30 rounded border border-zinc-800/50 p-2 space-y-1.5">
      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-tech">着装</span>
        <div className="flex gap-2 text-[9px]">
          <span className={dressLevel === 'naked' ? 'text-pink-400' : 'text-zinc-400'}>
            {DRESS_LEVEL_LABELS[dressLevel]}
          </span>
          {clothing.state !== 'intact' && (
            <span className={`font-mono ${stateColor}`}>[{stateLabel}]</span>
          )}
        </div>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-baseline gap-1 truncate">
              <span className="text-zinc-600 text-[8px] w-6 shrink-0">{item.label}</span>
              <span className={`truncate ${item.layer === 'intimate' ? 'text-pink-300/80' :
                  item.layer === 'under' ? 'text-zinc-400' : 'text-zinc-300'
                }`}>{item.desc}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[10px] text-pink-400/60 text-center py-1">裸露</div>
      )}

      {clothing.accessories.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/30">
          {clothing.accessories.filter(a => a.isVisible !== false).map((acc, idx) => (
            <span key={idx} className="text-[9px] text-purple-300/80">
              {acc.color?.name}{acc.type.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

Attire.displayName = 'Attire';
