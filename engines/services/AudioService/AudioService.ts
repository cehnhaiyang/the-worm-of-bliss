
import { SoundCategory } from '../../../meta';
import { AudioState, ActiveSound, SoundGeneratorFn } from '../../../meta';
import * as generators from './generators';

// ============================================
// 事件音效表
// ============================================

/**
 * 事件名 → 生成器。
 *
 * 唯一权威：调用方（含 AI 返回的 soundEffect）只能用这里的键。
 * v1 有两处脱节：`playEvent` 的映射里缺 `abyss_vision` 与 `hub_anomaly`，
 * 而这两个名字确实被调用方在用——事件发生了，音效却静默消失；
 * 同时提示词又向模型承诺了 scream/moan/whisper/heartbeat 这些根本没有生成器的音效。
 * 现在表里覆盖全部实际调用名，未知名字打警告而不是静默丢弃。
 * 导出以便直接断言"每个被调用的事件名都有生成器"。
 */
export const EVENT_SOUND_GENERATORS: Record<string, string> = {
  'grace': 'generateGraceSound',
  'abyss': 'generateAbyssEventSound',
  'abyss_vision': 'generateAbyssEventSound',
  'resonance': 'generateAbyssEventSound',
  'hub_shuffle': 'generateHubShuffleSound',
  'hub_anomaly': 'generateHubShuffleSound',
};

// ============================================
// 音频服务类
// ============================================

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null; // 总线压缩器
  private reverbNode: ConvolverNode | null = null;         // 全局混响
  private categoryGains: Map<SoundCategory, GainNode> = new Map();
  private activeSounds: Map<string, ActiveSound> = new Map();

  private state: AudioState = {
    masterVolume: 0.5,
    categoryVolumes: {
      [SoundCategory.AMBIENT]: 0, // 禁用环境音
      [SoundCategory.UI]: 0.5,
      [SoundCategory.EVENT]: 0.7,
      [SoundCategory.VOICE]: 0.8,
      [SoundCategory.MUSIC]: 0,   // 禁用音乐
    },
    isMuted: false,
  };

  private initPromise: Promise<void> | null = null;

  // ============================================
  // 初始化与 Context 管理
  // ============================================

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();

        // 1. 创建总线压缩器 (Master Compressor) - 防止爆音
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(40, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);

        // 2. 创建主增益 (Master Gain)
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.compressor); // 连接到压缩器
        this.masterGain.gain.value = this.state.masterVolume;

        // 3. 创建全局混响 (Global Reverb) - 模拟列车内部空间
        // 2.5秒衰减，模拟中大型金属空间
        this.reverbNode = this.ctx.createConvolver();
        this.reverbNode.buffer = generators.createImpulseResponse(this.ctx, 2.5, 2.0, false);
        this.reverbNode.connect(this.masterGain);

        // 4. 创建各类别的增益节点
        for (const cat of Object.values(SoundCategory)) {
          const category = cat as SoundCategory;
          const gainNode = this.ctx.createGain();
          gainNode.connect(this.masterGain);
          gainNode.gain.value = this.state.categoryVolumes[category];
          this.categoryGains.set(category, gainNode);
        }

        console.log('[AudioService] Initialized with Reverb & Compressor. State:', this.ctx.state);
      } catch (error) {
        console.error('[AudioService] Initialization failed:', error);
      }
    })();

    return this.initPromise;
  }

  // 尝试恢复 Context (必须在用户交互事件中调用)
  async resume(): Promise<void> {
    if (!this.ctx) await this.init();
    if (this.ctx?.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {
        // ignore
      }
    }
  }

  // ============================================
  // 核心播放逻辑
  // ============================================

  async play(
    generatorName: string,
    category: SoundCategory,
    options?: { id?: string; volume?: number; fadeIn?: number; loop?: boolean }
  ): Promise<void> {
    if (this.state.isMuted) return;

    // 确保已初始化
    if (!this.ctx) await this.init();

    if (this.ctx?.state === 'suspended') return;
    if (!this.ctx || !this.masterGain) return;

    const soundId = options?.id || generatorName;

    // 如果同名声音正在播放，先停止 (例如快速点击)
    if (this.activeSounds.has(soundId)) {
      this.stop(soundId, 50); // 快速淡出旧声音
    }

    const categoryGain = this.categoryGains.get(category);
    if (!categoryGain) return;

    // 创建该声音的独立增益节点
    const soundGain = this.ctx.createGain();
    soundGain.connect(categoryGain);

    const targetVolume = options?.volume ?? 1;
    const now = this.ctx.currentTime;

    // 淡入处理
    if (options?.fadeIn) {
      soundGain.gain.setValueAtTime(0, now);
      soundGain.gain.linearRampToValueAtTime(targetVolume, now + options.fadeIn / 1000);
    } else {
      soundGain.gain.setValueAtTime(targetVolume, now);
    }

    // 获取生成器函数
    const generator = (generators as any)[generatorName] as SoundGeneratorFn;
    if (!generator) {
      console.warn(`[AudioService] Generator not found: ${generatorName}`);
      return;
    }

    // 生成声音节点
    // 传入混响节点作为可选的第二个输出目的地
    const { stop, nodes } = generator(this.ctx, soundGain, this.reverbNode || undefined);

    // 记录活动声音
    this.activeSounds.set(soundId, {
      id: soundId,
      sourceNodes: nodes,
      gainNode: soundGain,
      startTime: now,
      stop: (fadeOut: number = 0) => {
        if (!this.ctx) return;
        const endTime = this.ctx.currentTime;

        if (fadeOut > 0) {
          try {
            soundGain.gain.cancelScheduledValues(endTime);
            soundGain.gain.setValueAtTime(soundGain.gain.value, endTime);
            soundGain.gain.linearRampToValueAtTime(0, endTime + fadeOut / 1000);

            setTimeout(() => {
              stop(); // 停止源节点
              soundGain.disconnect(); // 断开连接
            }, fadeOut);
          } catch (e) {
            stop();
            soundGain.disconnect();
          }
        } else {
          stop();
          soundGain.disconnect();
        }
      }
    });
  }

  stop(soundId: string, fadeOut: number = 0): void {
    const active = this.activeSounds.get(soundId);
    if (active) {
      active.stop(fadeOut);
      this.activeSounds.delete(soundId);
    }
  }

  stopAll(): void {
    this.activeSounds.forEach((sound, id) => {
      sound.stop(100);
      this.activeSounds.delete(id);
    });
  }

  // ============================================
  // 公共接口 (Environment & Events)
  // ============================================

  // 已移除：playCarriageAmbient - 不需要全局背景音

  playUI(type: 'click' | 'hover' | 'confirm' | 'cancel'): void {
    const map = {
      'click': 'generateClickSound',
      'hover': null,
      'confirm': 'generateConfirmSound',
      'cancel': 'generateCancelSound',
    };
    const gen = map[type];
    if (gen) this.play(gen, SoundCategory.UI, { volume: 0.5 });
  }

  playEvent(type: string): void {
    const gen = EVENT_SOUND_GENERATORS[type];
    if (!gen) {
      // 不静默：v1 在这里直接返回，调用方写错音效名后既无声也无提示，
      // 只能靠人耳发现"这个事件没有音效"。
      console.warn(`[AudioService] 未知事件音效: ${type}`);
      return;
    }
    this.play(gen, SoundCategory.EVENT, { volume: 0.8 });
  }

  // ============================================
  // 状态控制
  // ============================================

  setMasterVolume(volume: number): void {
    this.state.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.state.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  setCategoryVolume(category: SoundCategory, volume: number): void {
    this.state.categoryVolumes[category] = Math.max(0, Math.min(1, volume));
    const node = this.categoryGains.get(category);
    if (node && this.ctx) {
      node.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }
  }

  toggleMute(): boolean {
    this.state.isMuted = !this.state.isMuted;
    if (this.ctx) {
      if (this.state.isMuted) {
        this.ctx.suspend();
      } else {
        this.ctx.resume();
      }
    }
    return this.state.isMuted;
  }

  getState(): AudioState {
    return { ...this.state };
  }
}

export const audioService = new AudioService();
