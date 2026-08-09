"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  DataTable,
  GRID_STROKE,
  Legend,
  TOOLTIP_STYLE,
  formatHourTick,
  formatTooltipValue,
  hourTicks,
} from "./ChartKit";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDuration } from "@/lib/time";
import type { DayPoint, ProjectProgress, Slice } from "@/lib/stats";
import { BarChart3 } from "lucide-react";

const NoData = ({ hint }: { hint: string }) => (
  <EmptyState compact icon={BarChart3} title="Keine Daten" description={hint} />
);

/** Horizontal bars: category names stay readable however long they get. */
export function TimeBarChart({ slices, caption }: { slices: Slice[]; caption: string }) {
  if (slices.length === 0) return <NoData hint="In diesem Zeitraum wurde nichts erfasst." />;

  const height = Math.max(160, slices.length * 38 + 20);
  const ticks = hourTicks(Math.max(...slices.map((slice) => slice.minutes)));

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={slices} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }}>
          <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
          <XAxis
            type="number"
            ticks={ticks}
            domain={[0, ticks[ticks.length - 1] ?? 60]}
            tickFormatter={formatHourTick}
            {...AXIS_STYLE}
            tick={{ fill: "var(--vt-muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={96}
            tick={{ fill: "var(--vt-text)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatTooltipValue(value), "Zeit"]} />
          <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
            {slices.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <DataTable caption={caption} rows={slices} />
    </>
  );
}

export function TimeOverTimeChart({ points }: { points: DayPoint[] }) {
  const hasData = points.some((point) => point.minutes > 0);
  if (!hasData) return <NoData hint="Im gewählten Zeitraum gibt es keine Einträge." />;

  const ticks = hourTicks(Math.max(...points.map((point) => point.minutes)), 4);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--vt-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          ticks={ticks}
          domain={[0, ticks[ticks.length - 1] ?? 60]}
          tickFormatter={formatHourTick}
          tick={{ fill: "var(--vt-muted)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatTooltipValue(value), "Zeit"]} />
        <Line
          type="monotone"
          dataKey="minutes"
          stroke="var(--vt-accent)"
          strokeWidth={2}
          isAnimationActive={false}
          dot={{ r: 3, fill: "var(--vt-accent)", strokeWidth: 0 }}
          activeDot={{ r: 5, stroke: "var(--vt-surface)", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ProjectDistributionPie({ slices }: { slices: Slice[] }) {
  if (slices.length === 0) return <NoData hint="Noch keine Zeit auf Projekte gebucht." />;

  const total = slices.reduce((sum, slice) => sum + slice.minutes, 0);

  return (
    <>
      <div className="relative">
        <ResponsiveContainer width="100%" height={210}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="minutes"
              nameKey="label"
              innerRadius={58}
              outerRadius={92}
              // 2px of surface between segments, so adjacent fills never touch.
              paddingAngle={1.5}
              stroke="var(--vt-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.id} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} formatter={(value) => [formatTooltipValue(value), "Zeit"]} />
          </PieChart>
        </ResponsiveContainer>
        {/* Hero number in the donut hole: the total the slices add up to. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-xl font-semibold">
            {formatDuration(total)}
          </span>
          <span className="text-muted text-[11px]">gesamt</span>
        </div>
      </div>
      <Legend items={slices} />
      <DataTable caption="Zeit pro Projekt" rows={slices} />
    </>
  );
}

/** Tasks done versus open, as a share bar per project. */
export function ProjectProgressList({ items }: { items: ProjectProgress[] }) {
  if (items.length === 0) {
    return <NoData hint="Sobald es Aufgaben gibt, zeigt sich hier der Fortschritt." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate font-medium">{item.label}</span>
            <span className="text-muted tabular shrink-0 font-mono">
              {item.done}/{item.total} · {item.percent}%
            </span>
          </div>
          <div
            className="bg-surface-2 h-2 overflow-hidden rounded-full"
            role="img"
            aria-label={`${item.label}: ${item.done} von ${item.total} Aufgaben erledigt`}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
