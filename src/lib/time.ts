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

/**
 * Parse a `yyyy-MM-ddTHH:mm` (optional seconds) string as LOCAL time.
 *
 * `new Date("2026-08-14T07:00")` is not safe: some engines treat a missing
 * offset as UTC, others as local, Safari used to reject it without seconds.
 * Clock fields from `<input type="date">` / `<input type="time">` are local
 * wall time, so the Date must be built from components.
 */
export function fromDateTimeLocalValue(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hours = Number(match[4]);
  const minutes = Number(match[5]);
  const seconds = match[6] != null ? Number(match[6]) : 0;
  const ms = match[7] != null ? Number(match[7].padEnd(3, "0")) : 0;
  const date = new Date(year, month - 1, day, hours, minutes, seconds, ms);
  if (Number.isNaN(date.getTime())) return null;
  // JS Date overflows 31 Feb into March. A form value must mean that calendar day.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }
  return date;
}

/** Combines a `yyyy-MM-dd` date and an `HH:mm` (optional seconds) time as local. */
export function combineLocalDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  return fromDateTimeLocalValue(`${date}T${time}`);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * User-facing checks for a manual / edited time entry. Shared by the form
 * (inline) and the write path (throws). `now` is injectable so tests do not
 * depend on the wall clock.
 */
export function entryRangeError(start: Date, end: Date, now: Date = new Date()): string | null {
  if (end.getTime() <= start.getTime()) {
    return "Das Ende muss nach dem Start liegen.";
  }
  if (start.getTime() > now.getTime() + 60_000) {
    return "Ein Eintrag kann nicht in der Zukunft beginnen.";
  }
  if (end.getTime() - start.getTime() > MS_PER_DAY) {
    return "Ein einzelner Eintrag kann höchstens 24 Stunden lang sein.";
  }
  return null;
}

/**
 * Shared by the timer, the manual form (inline), and the write path (throws).
 * Whitespace-only is empty: a description must say what the work was.
 */
export function entryDescriptionError(description: string): string | null {
  if (description.trim().length === 0) {
    return "Bitte beschreibe, woran du arbeitest.";
  }
  return null;
}
