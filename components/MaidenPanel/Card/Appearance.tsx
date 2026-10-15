// ============================================
// 外观特征面板
// ============================================

import React, { memo } from 'react';
import { Maiden } from '../../../meta';

interface AppearanceProps {
  maiden: Maiden;
}

export const Appearance = memo<AppearanceProps>(({ maiden }) => {
  const { physical, appearance } = maiden;

  if (!appearance) return null;

  const { hair, eyes, skin, features } = appearance;

  return (
    <div className="bg-zinc-900/30 rounded border border-zinc-800/50 p-2 space-y-2">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-tech border-b border-zinc-800/50 pb-1 mb-1">
        外观档案
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-600 text-[8px] w-8">发型</span>
          <span className="text-zinc-300">{hair.color.name}{hair.length.name}{hair.style.name}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-600 text-[8px] w-8">眼睛</span>
          <span className="text-zinc-300">
            {eyes.color.name}{eyes.shape.name}
            {eyes.secondaryColor && <span className="text-purple-400 ml-1">(异色)</span>}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-600 text-[8px] w-8">肤色</span>
          <span className="text-zinc-300">{skin.tone.name} · {skin.texture.name}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-600 text-[8px] w-8">体型</span>
          <span className="text-zinc-300">{physical.bodyType}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono bg-black/20 px-2 py-1.5 rounded">
        <span className="text-zinc-500">{physical.height}cm</span>
        <span className="text-zinc-400">B{physical.bust}<span className="text-pink-400/80">{physical.cupSize}</span></span>
        <span className="text-zinc-500">W{physical.waist}</span>
        <span className="text-zinc-500">H{physical.hips}</span>
      </div>

      {features && (features.facialFeatures.length > 0 || features.birthmark?.id !== 'none') && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-zinc-800/30">
          {features.facialFeatures.map((f, i) => (
            <span key={i} className="text-[9px] text-zinc-500">{f.name}</span>
          ))}
          {features.birthmark?.id !== 'none' && (
            <span className="text-[9px] text-zinc-500">{features.birthmark.name}</span>
          )}
        </div>
      )}
    </div>
  );
});

Appearance.displayName = 'Appearance';
