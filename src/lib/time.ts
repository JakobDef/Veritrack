/**
 * Duration math and formatting.
 *
 * The running timer never accumulates a counter. Every tick recomputes elapsed
 * time from `startTime`, so a slow tab, a throttled background timer or a
 * missed interval cannot make the clock drift: at worst it updates late, then
 * jumps to the correct value.
 */

const MS_PER_MINUTE = 60_000;

export function elapsedMs(start: Date, now: Date = new Date()): number {
  return Math.max(0, now.getTime() - start.getTime());
}

/** `H:MM:SS`. Hours are unpadded; minutes and seconds always two digits. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Human summary of a stored duration: "2h 15m", "45m", "0m". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "0m";
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60);
  const mins = whole % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/** Compact decimal hours for table columns and chart axes: "2,3 h". */
export function formatHours(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return "0 h";
  return `${(minutes / 60).toFixed(1).replace(".", ",")} h`;
}

/**
 * Stored duration in whole minutes. Rounds to nearest so a 90-second stint
 * records as 2 minutes rather than being silently discarded, and never returns
 * a negative value even if the clocks disagree.
 */
export function toMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_MINUTE));
}

export function minutesToMs(minutes: number): number {
  return minutes * MS_PER_MINUTE;
}

/** "14:05" in the viewer's local timezone. */
export function formatTimeOfDay(date: Date): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

/** Value for an `<input type="datetime-local">`, which expects local time. */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function fromDateTimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
