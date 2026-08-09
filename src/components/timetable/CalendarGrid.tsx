"use client";

import { useMemo } from "react";
import {
  bucketByLocalDay,
  dayKey,
  formatDayNumber,
  formatShortDay,
  inSameMonth,
  isToday,
  monthGrid,
  weekDays,
} from "@/lib/dates";
import { formatDuration, formatTimeOfDay } from "@/lib/time";
import type { TimeEntry } from "@/types/models";
import { cn } from "@/lib/cn";

export type ColorMode = "member" | "project";

export type DecoratedEntry = {
  entry: TimeEntry;
  color: string;
  memberName: string;
  projectName: string;
};

const HOUR_HEIGHT = 44;

/** Local hour-of-day as a float, so 14:30 is 14.5. */
function hourOf(date: Date) {
  return date.getHours() + date.getMinutes() / 60;
}

type Placed = DecoratedEntry & { lane: number; lanes: number; from: number; to: number };

/**
 * Lays overlapping entries out side by side instead of stacking them.
 *
 * A band rehearsing together produces three entries at the same hour, and
 * absolutely positioned blocks would render on top of each other, hiding
 * everyone but the last one drawn. Entries are grouped into clusters of
 * mutually overlapping blocks, and each cluster is divided into as many lanes
 * as that cluster actually needs, so an isolated entry still gets full width.
 */
function placeEntries(entries: DecoratedEntry[]): Placed[] {
  const spans = entries
    .map((decorated) => {
      const from = hourOf(decorated.entry.startTime);
      const end = decorated.entry.endTime
        ? hourOf(decorated.entry.endTime)
        : hourOf(new Date());
      // Clamp a block that crosses local midnight to the end of its own day.
      return { ...decorated, from, to: end <= from ? 24 : end };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const placed: Placed[] = [];
  let cluster: (DecoratedEntry & { from: number; to: number; lane: number })[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes = Math.max(...cluster.map((item) => item.lane)) + 1;
    for (const item of cluster) placed.push({ ...item, lanes });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const span of spans) {
    if (span.from >= clusterEnd) flush();
    const laneEnds: number[] = [];
    for (const item of cluster) {
      laneEnds[item.lane] = Math.max(laneEnds[item.lane] ?? -Infinity, item.to);
    }
    let lane = laneEnds.findIndex((end) => end <= span.from);
    if (lane === -1) lane = laneEnds.length === 0 ? 0 : laneEnds.length;
    cluster.push({ ...span, lane });
    clusterEnd = Math.max(clusterEnd, span.to);
  }
  flush();

  return placed;
}

export function WeekView({
  anchor,
  entries,
  onSelect,
}: {
  anchor: Date;
  entries: DecoratedEntry[];
  onSelect: (entry: DecoratedEntry) => void;
}) {
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const buckets = useMemo(
    () => bucketByLocalDay(entries.map((d) => ({ ...d, startTime: d.entry.startTime }))),
    [entries],
  );

  // Only render the hours that actually contain something, with a little
  // padding: a band rehearsing at 20:00 should not have to scroll past an empty
  // morning every time.
  const { firstHour, lastHour } = useMemo(() => {
    let min = 8;
    let max = 22;
    for (const { entry } of entries) {
      min = Math.min(min, Math.floor(hourOf(entry.startTime)));
      const end = entry.endTime ?? new Date();
      max = Math.max(max, Math.ceil(hourOf(end)));
    }
    return { firstHour: Math.max(0, min - 1), lastHour: Math.min(24, Math.max(max + 1, min + 6)) };
  }, [entries]);

  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

  return (
    <div className="border-border bg-surface overflow-hidden rounded-lg border">
      <div className="grid grid-cols-[52px_repeat(7,minmax(84px,1fr))] overflow-x-auto">
        {/* Header row */}
        <div className="border-border bg-surface sticky left-0 z-10 border-r border-b" />
        {days.map((day) => (
          <div
            key={dayKey(day)}
            className={cn(
              "border-border border-b px-2 py-2 text-center",
              isToday(day) && "bg-accent-soft",
            )}
          >
            <div className="text-muted text-[11px] font-medium uppercase">{formatShortDay(day)}</div>
            <div className={cn("text-sm font-semibold", isToday(day) && "text-accent")}>
              {formatDayNumber(day)}
            </div>
          </div>
        ))}

        {/* Hour gutter */}
        <div className="border-border bg-surface sticky left-0 z-10 border-r">
          {hours.map((hour) => (
            <div
              key={hour}
              className="text-faint relative text-[10px]"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="absolute -top-1.5 right-1.5">{String(hour).padStart(2, "0")}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dayEntries = (buckets.get(dayKey(day)) ?? []) as DecoratedEntry[];
          return (
            <div
              key={dayKey(day)}
              className="border-border relative border-r last:border-r-0"
              style={{ height: hours.length * HOUR_HEIGHT }}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-border/60 border-b"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {placeEntries(dayEntries).map((placed) => {
                const { entry, color, lane, lanes, from, to } = placed;
                const top = (from - firstHour) * HOUR_HEIGHT;
                const height = Math.max(18, (to - from) * HOUR_HEIGHT - 2);
                const widthPct = 100 / lanes;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelect(placed)}
                    title={`${placed.memberName} · ${placed.projectName}`}
                    className="absolute overflow-hidden rounded-sm border px-1.5 py-0.5 text-left transition-transform hover:z-20 hover:scale-[1.03]"
                    style={{
                      top,
                      height,
                      left: `calc(${lane * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: `color-mix(in oklab, ${color} 22%, var(--vt-surface))`,
                      borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
                      borderLeftWidth: 3,
                      borderLeftColor: color,
                    }}
                  >
                    <span className="block truncate text-[11px] leading-tight font-semibold">
                      {placed.projectName}
                    </span>
                    {height > 30 && lanes < 3 ? (
                      <span className="text-muted block truncate text-[10px] leading-tight">
                        {formatTimeOfDay(entry.startTime)} · {placed.memberName}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthView({
  anchor,
  entries,
  onSelect,
}: {
  anchor: Date;
  entries: DecoratedEntry[];
  onSelect: (entry: DecoratedEntry) => void;
}) {
  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const buckets = useMemo(
    () => bucketByLocalDay(entries.map((d) => ({ ...d, startTime: d.entry.startTime }))),
    [entries],
  );

  return (
    <div className="border-border bg-surface overflow-hidden rounded-lg border">
      <div className="border-border grid grid-cols-7 border-b">
        {grid[0]!.map((day) => (
          <div key={dayKey(day)} className="text-muted px-2 py-1.5 text-center text-[11px] font-medium uppercase">
            {formatShortDay(day)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {grid.flat().map((day) => {
          const dayEntries = (buckets.get(dayKey(day)) ?? []) as DecoratedEntry[];
          const total = dayEntries.reduce((sum, d) => sum + (d.entry.duration ?? 0), 0);
          const outside = !inSameMonth(day, anchor);
          return (
            <div
              key={dayKey(day)}
              className={cn(
                "border-border flex min-h-24 flex-col gap-0.5 border-r border-b p-1.5 last:border-r-0",
                outside && "bg-surface-2/40",
              )}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={cn(
                    "text-xs font-medium",
                    outside ? "text-faint" : "text-text",
                    isToday(day) &&
                      "bg-accent text-accent-fg grid size-5 place-items-center rounded-full",
                  )}
                >
                  {formatDayNumber(day)}
                </span>
                {total > 0 ? (
                  <span className="tabular text-faint font-mono text-[10px]">
                    {formatDuration(total)}
                  </span>
                ) : null}
              </div>

              {dayEntries.slice(0, 3).map((decorated) => (
                <button
                  key={decorated.entry.id}
                  type="button"
                  onClick={() => onSelect(decorated)}
                  title={`${decorated.memberName} · ${decorated.projectName}`}
                  className="flex items-center gap-1 truncate rounded-sm px-1 py-0.5 text-left text-[10px] transition-colors"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${decorated.color} 16%, transparent)`,
                    color: decorated.color,
                  }}
                >
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: decorated.color }}
                  />
                  <span className="truncate">{decorated.projectName}</span>
                </button>
              ))}
              {dayEntries.length > 3 ? (
                <span className="text-faint px-1 text-[10px]">+{dayEntries.length - 3} weitere</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
