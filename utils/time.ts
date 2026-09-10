/**
 * Duration decomposition, composition, and localization utilities
 */

export interface DecomposedDuration {
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Decomposes total seconds into hours, minutes, and seconds.
 */
export function decomposeSeconds(totalSeconds: number | string | undefined | null): DecomposedDuration {
  const safeTotal = Math.max(0, typeof totalSeconds === 'number' ? totalSeconds : parseInt(totalSeconds as any, 10) || 0);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;

  return { hours, minutes, seconds };
}

/**
 * Composes hours, minutes, and seconds into total seconds.
 */
export function composeSeconds(hours: number, minutes: number, seconds: number): number {
  const h = Math.max(0, isNaN(hours) ? 0 : hours);
  const m = Math.max(0, isNaN(minutes) ? 0 : minutes);
  const s = Math.max(0, isNaN(seconds) ? 0 : seconds);
  return h * 3600 + m * 60 + s;
}

/**
 * Short badge format, e.g. "1j 30m", "5m", "45d", "1h 30m", "5m", "45s"
 */
export function formatDurationBadge(
  totalSeconds: number | string | undefined | null,
  language: string = 'id'
): string {
  const { hours, minutes, seconds } = decomposeSeconds(totalSeconds);

  if (hours === 0 && minutes === 0 && seconds === 0) {
    return language === 'id' ? '0d' : '0s';
  }

  const isId = language === 'id';
  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}${isId ? 'j' : 'h'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}${isId ? 'd' : 's'}`);
  }

  return parts.join(' ');
}

/**
 * Detailed human-readable format, e.g. "1 Jam 30 Menit", "5 Menit 30 Detik", "45 Detik"
 */
export function formatDurationDetailed(
  totalSeconds: number | string | undefined | null,
  language: string = 'id'
): string {
  const { hours, minutes, seconds } = decomposeSeconds(totalSeconds);
  const isId = language === 'id';

  if (hours === 0 && minutes === 0 && seconds === 0) {
    return isId ? '0 Detik' : '0 Seconds';
  }

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours} ${isId ? 'Jam' : hours > 1 ? 'Hours' : 'Hour'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${isId ? 'Menit' : minutes > 1 ? 'Minutes' : 'Minute'}`);
  }
  if (seconds > 0) {
    parts.push(`${seconds} ${isId ? 'Detik' : seconds > 1 ? 'Seconds' : 'Second'}`);
  }

  return parts.join(' ');
}
