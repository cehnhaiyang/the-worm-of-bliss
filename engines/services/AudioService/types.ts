
import { SoundCategory } from '../../../meta';

export interface AudioState {
  masterVolume: number;
  categoryVolumes: Record<SoundCategory, number>;
  isMuted: boolean;
}

export interface ActiveSound {
  sourceNodes: AudioNode[]; // 保存源节点以便停止
  gainNode: GainNode;       // 独立的音量控制
  startTime: number;
  id: string;
  stop: (fadeOut?: number) => void;
}

export type SoundGeneratorFn = (ctx: AudioContext, dest: AudioNode, reverbDest?: AudioNode) => { stop: () => void; nodes: AudioNode[] };
