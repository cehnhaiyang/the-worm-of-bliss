
import { SoundGeneratorFn } from '../../../meta';

// ============================================
// 脉冲响应生成器 (Impulse Response Generator)
// 用于创建高质量的混响效果 (模拟金属车厢空间)
// ============================================
export const createImpulseResponse = (ctx: AudioContext, duration: number, decay: number, reverse: boolean): AudioBuffer => {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = reverse ? length - i : i;
    // 模拟金属反射的非线性衰减
    let volume = Math.pow(1 - n / length, decay);

    // 添加一些随机性来模拟复杂的反射面
    volume *= (Math.random() * 2 - 1);

    left[i] = volume;
    right[i] = volume;
  }
  return impulse;
};

// ============================================
// UI 音效 (High Quality Procedural)
// ============================================

export const generateClickSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // 短促的高频正弦波，模拟清脆的电子点击
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1000, t);
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);

  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

  osc.connect(gain).connect(dest);

  // 发送少量信号到混响，增加空间感
  if (reverbDest) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.2;
    gain.connect(reverbGain).connect(reverbDest);
  }

  osc.start(t);
  osc.stop(t + 0.05);

  return { stop: () => { }, nodes: [] };
};

export const generateConfirmSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  // 双音叠加 (Harmonic)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc2.type = 'triangle'; // 增加一点质感

  // 上行音阶效果
  osc1.frequency.setValueAtTime(440, t); // A4
  osc1.frequency.exponentialRampToValueAtTime(880, t + 0.1); // A5

  osc2.frequency.setValueAtTime(880, t);
  osc2.frequency.exponentialRampToValueAtTime(1760, t + 0.1);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(dest);

  if (reverbDest) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.3;
    gain.connect(reverbGain).connect(reverbDest);
  }

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + 0.3);
  osc2.stop(t + 0.3);

  return { stop: () => { }, nodes: [] };
};

export const generateCancelSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // 锯齿波产生“错误”的警示感
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.linearRampToValueAtTime(100, t + 0.15); // 音调下沉

  // 低通滤波使声音不那么刺耳
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;

  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  osc.connect(filter).connect(gain).connect(dest);

  if (reverbDest) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4; // 较重的混响，像是在空旷处的回声
    gain.connect(reverbGain).connect(reverbDest);
  }

  osc.start(t);
  osc.stop(t + 0.2);

  return { stop: () => { }, nodes: [] };
};

// ============================================
// 事件音效 (Event SFX)
// ============================================

export const generateGraceSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  const nodes: AudioNode[] = [];

  // 神圣的和弦 (C Major 7 / Ethereal)
  // C5, E5, G5, B5
  const freqs = [523.25, 659.25, 783.99, 987.77];

  freqs.forEach((f, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = f;

    // 错开的起音 (Arpeggio effect)
    const startDelay = i * 0.05;

    gain.gain.setValueAtTime(0, t + startDelay);
    gain.gain.linearRampToValueAtTime(0.1 / freqs.length, t + startDelay + 0.1); // 慢启动
    gain.gain.exponentialRampToValueAtTime(0.001, t + startDelay + 2.5); // 长尾音

    osc.connect(gain).connect(dest);

    if (reverbDest) {
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.8; // 很多混响，制造神圣感
      gain.connect(reverbGain).connect(reverbDest);
    }

    osc.start(t + startDelay);
    osc.stop(t + startDelay + 3.0);
    nodes.push(osc, gain);
  });

  // 顶部闪烁音 (Sparkle)
  const sparkle = ctx.createOscillator();
  const sparkleGain = ctx.createGain();
  sparkle.type = 'triangle';
  sparkle.frequency.setValueAtTime(2000, t);
  sparkle.frequency.linearRampToValueAtTime(3000, t + 1);

  sparkleGain.gain.setValueAtTime(0, t);
  sparkleGain.gain.linearRampToValueAtTime(0.03, t + 0.5);
  sparkleGain.gain.linearRampToValueAtTime(0, t + 1.5);

  sparkle.connect(sparkleGain).connect(dest);
  sparkle.start(t);
  sparkle.stop(t + 2);
  nodes.push(sparkle, sparkleGain);

  return { stop: () => nodes.forEach(n => { try { (n as any).stop?.() } catch { } }), nodes };
};

export const generateAbyssEventSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  const nodes: AudioNode[] = [];

  // 1. 低频冲击 (Sub Bass Impact)
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(30, t + 1.5); // 快速下降的音调

  // 低通滤波器扫频
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(50, t + 1);

  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

  osc.connect(filter).connect(gain).connect(dest);

  if (reverbDest) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.5;
    gain.connect(reverbGain).connect(reverbDest);
  }

  osc.start(t);
  osc.stop(t + 3);
  nodes.push(osc, gain, filter);

  // 2. 刺耳的金属摩擦声 (Dissonance)
  const noiseOsc = ctx.createOscillator();
  noiseOsc.type = 'square';
  noiseOsc.frequency.value = 50; // 用AM调制

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 2000;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0, t);
  noiseGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
  noiseGain.gain.linearRampToValueAtTime(0, t + 0.8);

  noiseOsc.connect(noiseFilter).connect(noiseGain).connect(dest);
  noiseOsc.start(t);
  noiseOsc.stop(t + 1);
  nodes.push(noiseOsc, noiseFilter, noiseGain);

  return { stop: () => nodes.forEach(n => { try { (n as any).stop?.() } catch { } }), nodes };
};

export const generateHubShuffleSound: SoundGeneratorFn = (ctx, dest, reverbDest) => {
  const t = ctx.currentTime;
  const nodes: AudioNode[] = [];

  // 模拟巨大的机械结构滑动
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(40, t);
  osc.frequency.linearRampToValueAtTime(60, t + 2); // 缓慢上升的张力

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(100, t);
  filter.frequency.linearRampToValueAtTime(400, t + 1.5);
  filter.frequency.linearRampToValueAtTime(100, t + 3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.3, t + 1);
  gain.gain.linearRampToValueAtTime(0, t + 3.5);

  // 添加 Tremolo (颤音) 模拟机械震动
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain).connect(filter.frequency);

  osc.connect(filter).connect(gain).connect(dest);

  if (reverbDest) {
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.6; // 巨大的空间感
    gain.connect(reverbGain).connect(reverbDest);
  }

  osc.start(t);
  lfo.start(t);
  osc.stop(t + 4);
  lfo.stop(t + 4);

  nodes.push(osc, filter, gain, lfo, lfoGain);

  return { stop: () => nodes.forEach(n => { try { (n as any).stop?.() } catch { } }), nodes };
};
