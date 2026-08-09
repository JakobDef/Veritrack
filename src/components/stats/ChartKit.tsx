"use client";

import { formatDuration, formatHours } from "@/lib/time";
import { cn } from "@/lib/cn";

/**
 * Shared chart chrome.
 *
 * Recharts' defaults (blue-grey grid, white tooltip, its own type ramp) ignore
 * the theme entirely and look wrong in dark mode, so every chart in this app
 * passes these tokens explicitly instead.
 */

export const AXIS_STYLE = {
  stroke: "var(--vt-faint)",
  fontSize: 11,
  fontFamily: "var(--font-sans)",
} as const;

export const GRID_STROKE = "var(--vt-border)";

/**
 * Styling only. The `formatter` is passed inline at each call site so Recharts
 * can contextually type it; hoisting it here loses that inference and the
 * ValueType union no longer matches.
 */
export const TOOLTIP_STYLE = {
  cursor: { fill: "color-mix(in oklab, var(--vt-faint) 12%, transparent)" },
  contentStyle: {
    background: "var(--vt-surface)",
    border: "1px solid var(--vt-border)",
    borderRadius: "0.625rem",
    boxShadow: "var(--vt-shadow-md)",
    fontSize: 12,
    color: "var(--vt-text)",
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--vt-muted)", marginBottom: 2, fontSize: 11 },
  itemStyle: { color: "var(--vt-text)", padding: 0 },
} as const;

/** Tooltip value formatter: minutes in, human duration out. */
export function formatTooltipValue(value: unknown): string {
  return formatDuration(typeof value === "number" ? value : Number(value));
}

/**
 * Axis ticks on whole hours.
 *
 * The data is in minutes, so Recharts' automatic ticks land on values like 75
 * or 225. Formatting those as hours produces a ladder that skips and repeats
 * ("0h 1h 3h 4h 5h"). Choosing the ticks ourselves keeps the axis evenly spaced
 * and every label distinct.
 */
export function hourTicks(maxMinutes: number, target = 5): number[] {
  const maxHours = Math.max(1, Math.ceil(maxMinutes / 60));
  const step = [1, 2, 3, 4, 6, 8, 12, 24, 48, 96].find((s) => maxHours / s <= target) ?? 168;
  const ticks: number[] = [];
  for (let hour = 0; hour <= maxHours + step - 1; hour += step) {
    ticks.push(hour * 60);
    if (hour >= maxHours) break;
  }
  return ticks;
}

export const formatHourTick = (minutes: number) => `${Math.round(minutes / 60)}h`;

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("border-border bg-surface flex flex-col rounded-lg border p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="text-muted text-xs">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/**
 * Identity legend. Present whenever more than one series is shown, so colour is
 * never the only channel carrying identity.
 */
export function Legend({
  items,
  className,
}: {
  items: { id: string; label: string; color: string; minutes?: number }[];
  className?: string;
}) {
  if (items.length < 2) return null;
  return (
    <ul className={cn("mt-3 flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.id} className="text-muted flex items-center gap-1.5 text-xs">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-text">{item.label}</span>
          {item.minutes !== undefined ? (
            <span className="tabular font-mono">{formatHours(item.minutes)}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Accessible fallback: the same numbers as a table, for screen readers and print. */
export function DataTable({
  caption,
  rows,
}: {
  caption: string;
  rows: { id: string; label: string; minutes: number }[];
}) {
  return (
    <details className="mt-3">
      <summary className="text-muted hover:text-text cursor-pointer text-xs">
        Werte als Tabelle
      </summary>
      <table className="mt-2 w-full text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-muted text-left">
            <th scope="col" className="border-border border-b py-1 font-medium">
              Name
            </th>
            <th scope="col" className="border-border border-b py-1 text-right font-medium">
              Zeit
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border-border border-b py-1">{row.label}</td>
              <td className="border-border tabular border-b py-1 text-right font-mono">
                {formatDuration(row.minutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
