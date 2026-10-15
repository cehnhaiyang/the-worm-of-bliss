// ============================================
// 时间系统常量 (Time System Constants)
// 基于真实时间的游戏时间系统
// ============================================

/**
 * 时间系统配置
 * 游戏时间与系统时间同步，每秒检测一次
 */
export const TIME_CONFIG = {
  // ========== 核心时间设置 ==========
  /** Tick间隔(毫秒) - 每秒一次 */
  TICK_INTERVAL_MS: 1000,

  /** 游戏时间倍率选项 */
  TIME_SCALES: [0, 1, 5, 10, 30, 60] as const,

  /** 默认时间倍率 (1x = 实时) */
  DEFAULT_TIME_SCALE: 1,

  // ========== 时间格式化 ==========
  /** 一天的毫秒数 */
  MS_PER_DAY: 24 * 60 * 60 * 1000,

  /** 一小时的毫秒数 */
  MS_PER_HOUR: 60 * 60 * 1000,

  /** 一分钟的毫秒数 */
  MS_PER_MINUTE: 60 * 1000,

  /** 一秒的毫秒数 */
  MS_PER_SECOND: 1000,

  // ========== 日夜周期 ==========
  /** 休息时间开始（22:00） */
  REST_START_HOUR: 22,

  /** 休息时间结束（06:00） */
  REST_END_HOUR: 6,

  /** 早晨开始（06:00） */
  MORNING_START: 6,

  /** 中午开始（12:00） */
  NOON_START: 12,

  /** 傍晚开始（18:00） */
  EVENING_START: 18,

  /** 夜晚开始（22:00） */
  NIGHT_START: 22,
} as const;

/**
 * 时间段枚举
 */
export enum TimePeriod {
  DAWN = 'dawn',       // 黎明 (5-7)
  MORNING = 'morning', // 早晨 (7-12)
  NOON = 'noon',       // 正午 (12-14)
  AFTERNOON = 'afternoon', // 下午 (14-18)
  EVENING = 'evening', // 傍晚 (18-22)
  NIGHT = 'night',     // 夜晚 (22-5)
}

/**
 * 获取当前时间段
 */
export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 7) return TimePeriod.DAWN;
  if (hour >= 7 && hour < 12) return TimePeriod.MORNING;
  if (hour >= 12 && hour < 14) return TimePeriod.NOON;
  if (hour >= 14 && hour < 18) return TimePeriod.AFTERNOON;
  if (hour >= 18 && hour < 22) return TimePeriod.EVENING;
  return TimePeriod.NIGHT;
}

/**
 * 格式化游戏时间为 HH:MM:SS
 */
export function formatGameTime(gameTimeMs: number): string {
  const totalSeconds = Math.floor(gameTimeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 格式化游戏时间为完整日期时间
 */
export function formatFullGameTime(gameTimeMs: number, startDay: number = 1): string {
  const days = Math.floor(gameTimeMs / TIME_CONFIG.MS_PER_DAY);
  const timeStr = formatGameTime(gameTimeMs);
  return `第${startDay + days}天 ${timeStr}`;
}

/**
 * 从系统时间获取游戏时间（同步模式）
 */
export function getGameTimeFromSystem(): { hours: number; minutes: number; seconds: number; totalMs: number } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

  return { hours, minutes, seconds, totalMs };
}

export type TimeConfigType = typeof TIME_CONFIG;
