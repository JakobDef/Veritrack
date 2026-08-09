import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { de } from "date-fns/locale";

/**
 * All date maths is explicitly in the viewer's local timezone.
 *
 * Firestore Timestamps are UTC instants; a calendar is not. Bucketing by UTC
 * would put a 21:00 rehearsal in Berlin on the wrong day for half the year.
 * Every helper here therefore goes through date-fns' local-time functions,
 * which are also DST-correct: a "day" on a clock-change date is 23 or 25 hours
 * long and `startOfDay`/`endOfDay` reflect that.
 *
 * Weeks start on Monday, which is what a German-language band expects.
 */

const WEEK_OPTIONS = { weekStartsOn: 1, locale: de } as const;

export type DateRange = { from: Date; to: Date };

export function dayRange(date: Date): DateRange {
  return { from: startOfDay(date), to: endOfDay(date) };
}

export function weekRange(date: Date): DateRange {
  return { from: startOfWeek(date, WEEK_OPTIONS), to: endOfWeek(date, WEEK_OPTIONS) };
}

export function monthRange(date: Date): DateRange {
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

export function startOfWeekLocal(date: Date): Date {
  return startOfWeek(date, WEEK_OPTIONS);
}

export function endOfWeekLocal(date: Date): Date {
  return endOfWeek(date, WEEK_OPTIONS);
}

export function weekDays(date: Date): Date[] {
  const { from } = weekRange(date);
  return Array.from({ length: 7 }, (_, i) => addDays(from, i));
}

/**
 * Six-by-seven grid covering the month plus the leading and trailing days that
 * complete the first and last weeks, so the calendar is always a full rectangle.
 */
export function monthGrid(date: Date): Date[][] {
  const gridStart = startOfWeek(startOfMonth(date), WEEK_OPTIONS);
  const gridEnd = endOfWeek(endOfMonth(date), WEEK_OPTIONS);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Stable local-day key, safe to use as an object key or React key. */
export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Groups anything carrying a start time by its LOCAL start day.
 *
 * An entry that crosses midnight (a gig from 22:00 to 01:00) is filed entirely
 * under the day it started, not split across two. Splitting would double the
 * visible entry count and make per-day totals disagree with the entry list,
 * which is more confusing than a block that visually overruns its row.
 */
export function bucketByLocalDay<T extends { startTime: Date }>(items: T[]): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.startTime);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(item);
    else buckets.set(key, [item]);
  }
  return buckets;
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function inSameMonth(date: Date, reference: Date): boolean {
  return isSameMonth(date, reference);
}

export function formatDayLabel(date: Date): string {
  if (isSameDay(date, new Date())) return "Heute";
  if (isSameDay(date, addDays(new Date(), -1))) return "Gestern";
  return format(date, "EEEE, d. MMMM", { locale: de });
}

export function formatShortDay(date: Date): string {
  return format(date, "EEE", { locale: de });
}

export function formatDayNumber(date: Date): string {
  return format(date, "d");
}

export function formatMonthTitle(date: Date): string {
  return format(date, "MMMM yyyy", { locale: de });
}

export function formatWeekTitle(date: Date): string {
  const { from, to } = weekRange(date);
  const sameMonth = isSameMonth(from, to);
  return sameMonth
    ? `${format(from, "d.", { locale: de })} - ${format(to, "d. MMMM yyyy", { locale: de })}`
    : `${format(from, "d. MMM", { locale: de })} - ${format(to, "d. MMM yyyy", { locale: de })}`;
}

export function formatDateShort(date: Date): string {
  return format(date, "d. MMM", { locale: de });
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
