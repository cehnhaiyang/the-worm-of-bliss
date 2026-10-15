// ============================================
// 人格面板 (IS-SHEX)
// ============================================

import React, { memo } from 'react';
import { ISShexPersonality, PersonalityProfile, HexacoFacets } from '../../../meta';
import { ARCHETYPE_STYLES } from '../../../constants';

// ============================================
// 细分特质定义 (从 hexaco.ts 移动至此)
// ============================================

const FACET_DEFINITIONS = {
  // H维度细分
  sincerity: { domain: 'H', nameCN: '真诚', description: '人际交往中的坦率程度' },
  fairness: { domain: 'H', nameCN: '公平', description: '对规则与公正的遵守' },
  greedAvoidance: { domain: 'H', nameCN: '避贪', description: '对物质财富的超脱程度' },
  modesty: { domain: 'H', nameCN: '谦虚', description: '自我评价的客观性' },

  // E维度细分
  fearfulness: { domain: 'E', nameCN: '恐惧', description: '对身体伤害的预期焦虑' },
  anxiety: { domain: 'E', nameCN: '焦虑', description: '对不确定性的弥散性担忧' },
  dependence: { domain: 'E', nameCN: '依赖', description: '对他人情感支持的需求' },
  sentimentality: { domain: 'E', nameCN: '感伤', description: '情感共鸣与依恋纽带强度' },

  // X维度细分
  socialSelfEsteem: { domain: 'X', nameCN: '社交自尊', description: '社交情境下的自信感' },
  socialBoldness: { domain: 'X', nameCN: '社交大胆', description: '在陌生或高压社交场合的无畏' },
  sociability: { domain: 'X', nameCN: '社交性', description: '对交际活动的喜爱程度' },
  liveliness: { domain: 'X', nameCN: '活力', description: '心理能量与热情水平' },

  // A维度细分
  forgivingness: { domain: 'A', nameCN: '宽恕', description: '放下仇恨、重新建立信任的能力' },
  gentleness: { domain: 'A', nameCN: '温和', description: '待人处事的柔和度与体贴' },
  flexibility: { domain: 'A', nameCN: '灵活', description: '接受折衷方案的意愿' },
  patience: { domain: 'A', nameCN: '耐心', description: '对愤怒的控制阈值' },

  // C维度细分
  organization: { domain: 'C', nameCN: '组织', description: '物理与心理空间的有序性' },
  diligence: { domain: 'C', nameCN: '勤奋', description: '工作伦理与努力程度' },
  perfectionism: { domain: 'C', nameCN: '完美', description: '对细节与准确性的标准' },
  prudence: { domain: 'C', nameCN: '审慎', description: '决策前的深思熟虑与冲动抑制' },

  // O维度细分
  aestheticAppreciation: { domain: 'O', nameCN: '审美', description: '对自然与艺术之美的敏感性' },
  inquisitiveness: { domain: 'O', nameCN: '好奇', description: '对知识与信息的渴求' },
  creativity: { domain: 'O', nameCN: '创造', description: '产生新颖想法的能力' },
  unconventionality: { domain: 'O', nameCN: '非传统', description: '对非常规观念的接纳' },
} as const;

interface HexacoBarProps {
  label: string;
  code: string;
  value: number;
}

const HexacoBar = memo<HexacoBarProps>(({ code, value }) => {
  const getColor = () => {
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 55) return 'bg-cyan-500';
    if (value >= 45) return 'bg-zinc-500';
    if (value >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-1.5 text-[9px]">
      <span className="text-zinc-500 w-4 font-mono">{code}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} rounded-full transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-zinc-400 w-6 text-right font-mono">{Math.round(value)}</span>
    </div>
  );
});

HexacoBar.displayName = 'HexacoBar';

// 细分特质描述显示组件
interface FacetDescriptionProps {
  facets: HexacoFacets;
  showAll?: boolean; // 是否显示所有特质，默认只显示极端值
}

const FacetDescription = memo<FacetDescriptionProps>(({ facets, showAll = false }) => {
  const getExtremeFacets = () => {
    const extremeFacets: Array<{ key: keyof HexacoFacets; value: number; definition: typeof FACET_DEFINITIONS[keyof HexacoFacets] }> = [];
    
    Object.entries(facets).forEach(([key, value]) => {
      const facetKey = key as keyof HexacoFacets;
      const definition = FACET_DEFINITIONS[facetKey];
      
      if (definition && (showAll || value > 70 || value < 30)) {
        extremeFacets.push({
          key: facetKey,
          value,
          definition
        });
      }
    });
    
    return extremeFacets.sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50));
  };

  const extremeFacets = getExtremeFacets();

  if (extremeFacets.length === 0) return null;

  return (
    <div className="space-y-1 mt-2 pt-2 border-t border-zinc-800/50">
      <div className="text-[9px] text-zinc-600 uppercase">特质特征</div>
      {extremeFacets.map(({ key, value, definition }) => (
        <div key={key} className="flex items-center justify-between text-[9px] group">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 font-mono w-4">{definition.domain}</span>
            <span className="text-zinc-400">{definition.nameCN}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-mono ${value > 60 ? 'text-emerald-400' : value < 40 ? 'text-red-400' : 'text-zinc-400'}`}>
              {Math.round(value)}
            </span>
            <div className="hidden group-hover:block absolute z-10 bg-zinc-800 border border-zinc-700 rounded p-2 text-[8px] text-zinc-300 max-w-xs -left-2 top-full mt-1">
              <div className="font-semibold text-zinc-400 mb-1">{definition.nameCN}</div>
              <div>{definition.description}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

FacetDescription.displayName = 'FacetDescription';

interface ISShexDisplayProps {
  isshex: ISShexPersonality;
}

const ISShexDisplay = memo<ISShexDisplayProps>(({ isshex }) => {
  const { hexaco, metaTraits, currentState, traitFatigue, shadowActivation } = isshex;

  const stateLabels: Record<string, { label: string; color: string }> = {
    integrated: { label: '整合', color: 'text-emerald-400' },
    adaptive: { label: '适应', color: 'text-cyan-400' },
    stressed: { label: '应激', color: 'text-orange-400' },
    dissociated: { label: '解离', color: 'text-red-400' },
  };

  const stateStyle = stateLabels[currentState] || { label: '未知', color: 'text-zinc-400' };

  return (
    <div className="space-y-2 bg-zinc-900/30 p-2 rounded border border-zinc-800/50">
      <div className="space-y-1">
        <HexacoBar label="诚实" code="H" value={hexaco.H} />
        <HexacoBar label="情绪" code="E" value={hexaco.E} />
        <HexacoBar label="外向" code="X" value={hexaco.X} />
        <HexacoBar label="宜人" code="A" value={hexaco.A} />
        <HexacoBar label="尽责" code="C" value={hexaco.C} />
        <HexacoBar label="开放" code="O" value={hexaco.O} />
      </div>

      <div className="grid grid-cols-4 gap-1 pt-1 border-t border-zinc-800/50 text-[8px]">
        <div className="text-center">
          <div className="text-zinc-600">α稳定</div>
          <div className={`font-mono ${metaTraits.alpha > 55 ? 'text-emerald-400' : metaTraits.alpha < 40 ? 'text-red-400' : 'text-zinc-400'}`}>
            {Math.round(metaTraits.alpha)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600">β可塑</div>
          <div className={`font-mono ${metaTraits.beta > 55 ? 'text-cyan-400' : 'text-zinc-400'}`}>
            {Math.round(metaTraits.beta)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600">δ对抗</div>
          <div className={`font-mono ${metaTraits.delta > 55 ? 'text-orange-400' : 'text-zinc-400'}`}>
            {Math.round(metaTraits.delta)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-zinc-600">γ亲社</div>
          <div className={`font-mono ${metaTraits.gamma > 55 ? 'text-green-400' : 'text-zinc-400'}`}>
            {Math.round(metaTraits.gamma)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50 text-[9px]">
        <span className="text-zinc-600">人格状态</span>
        <span className={`font-mono ${stateStyle.color}`}>{stateStyle.label}</span>
        {shadowActivation > 30 && (
          <span className="text-purple-400 animate-pulse">影子激活</span>
        )}
      </div>

      {traitFatigue > 20 && (
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-zinc-600">特质疲劳</span>
          <span className={`font-mono ${traitFatigue > 50 ? 'text-red-400' : 'text-orange-400'}`}>
            {Math.round(traitFatigue)}%
          </span>
        </div>
      )}
      
      {/* 显示极端特质描述 */}
      <FacetDescription facets={isshex.facets} />
    </div>
  );
});

ISShexDisplay.displayName = 'ISShexDisplay';

interface PsychProfileDisplayProps {
  profile: PersonalityProfile;
}

const PsychProfileDisplay = memo<PsychProfileDisplayProps>(({ profile }) => (
  <div className="space-y-2 bg-zinc-900/20 p-2 rounded border border-zinc-800/30">
    <div className="flex flex-wrap gap-1">
      {profile.traits.map((trait, idx) => (
        <span key={idx} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 text-[9px] rounded border border-zinc-700">
          {trait}
        </span>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-2 text-[9px]">
      <div>
        <span className="text-zinc-600 block mb-0.5">旧日爱好</span>
        <span className="text-cyan-400/80">{profile.hobbies.join(', ')}</span>
      </div>
      <div>
        <span className="text-zinc-600 block mb-0.5">厌恶/恐惧</span>
        <span className="text-red-400/80">{profile.dislikes.join(', ')}</span>
      </div>
    </div>

    <div className="text-[9px] pt-1 border-t border-zinc-800/50">
      <span className="text-zinc-600 mr-2">防御机制:</span>
      <span className="text-zinc-300 italic">{profile.copingMechanism}</span>
    </div>

    {profile.fetish && (
      <div className="text-[9px] pt-1 border-t border-zinc-800/50 flex justify-between">
        <span className="text-purple-500/70">潜在癖好</span>
        <span className="text-purple-400 font-mono tracking-wider">{profile.fetish}</span>
      </div>
    )}
  </div>
));

PsychProfileDisplay.displayName = 'PsychProfileDisplay';

interface PersonalityProps {
  isshex: ISShexPersonality | undefined;
  profile: PersonalityProfile | undefined;
  personalityDescription: string;
}

export const Personality = memo<PersonalityProps>(({ isshex, profile, personalityDescription }) => {
  const getPersonalityStyle = () => {
    if (!isshex) return { color: 'bg-zinc-800 text-zinc-400', name: '未知' };

    if (isshex.archetype.dominated.length > 0) {
      const primaryArchetype = isshex.archetype.dominated[0];
      const style = ARCHETYPE_STYLES[primaryArchetype];
      if (style) {
        return { ...style, name: personalityDescription };
      }
    }

    const { metaTraits } = isshex;
    if (metaTraits.alpha > 65) return { color: 'bg-blue-900/50 text-blue-400', name: personalityDescription };
    if (metaTraits.beta > 65) return { color: 'bg-cyan-900/50 text-cyan-400', name: personalityDescription };
    if (metaTraits.delta > 55) return { color: 'bg-orange-900/50 text-orange-400', name: personalityDescription };
    if (metaTraits.gamma > 65) return { color: 'bg-green-900/50 text-green-400', name: personalityDescription };

    return { color: 'bg-zinc-700 text-zinc-300', name: personalityDescription };
  };

  const personalityStyle = getPersonalityStyle();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-500 uppercase">人格原型</span>
        <span className={`badge ${personalityStyle.color}`}>
          {personalityStyle.name}
        </span>
      </div>
      {isshex && <ISShexDisplay isshex={isshex} />}

      {profile && (
        <>
          <div className="text-[10px] text-zinc-500 uppercase mt-2 mb-1">心理侧写</div>
          <PsychProfileDisplay profile={profile} />
        </>
      )}
    </div>
  );
});

Personality.displayName = 'Personality';
