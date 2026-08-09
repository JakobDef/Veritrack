"use client";

import { useMemo, useState } from "react";
import { addDays, eachDayOfInterval } from "date-fns";
import { BarChart3, CalendarDays, Clock3, Users } from "lucide-react";
import { StatNugget } from "@/components/stats/StatNugget";
import { ChartCard, Legend } from "@/components/stats/ChartKit";
import {
  ProjectDistributionPie,
  ProjectProgressList,
  TimeBarChart,
  TimeOverTimeChart,
} from "@/components/stats/Charts";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useCollection } from "@/hooks/useCollection";
import { allTasksGroup } from "@/lib/firebase/paths";
import { query, where } from "firebase/firestore";
import {
  deltaPercent,
  projectProgress,
  seriesByDay,
  totalMinutes,
  totalsByFunctionalRole,
  totalsByMember,
  totalsByProject,
} from "@/lib/stats";
import { monthRange, weekRange } from "@/lib/dates";
import { formatDuration } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";

type Period = "week" | "month" | "all";

export default function StatsPage() {
  const { activeBandId, members } = useBand();
  const { projects } = useProjects(activeBandId);
  const [period, setPeriod] = useState<Period>("month");
  const [today] = useState(() => new Date());

  const range = useMemo(() => {
    if (period === "week") return weekRange(today);
    if (period === "month") return monthRange(today);
    return undefined;
  }, [period, today]);

  // Same-length window immediately before the current one, for the delta badges.
  const previousRange = useMemo(() => {
    if (!range) return undefined;
    const span = range.to.getTime() - range.from.getTime();
    return { from: new Date(range.from.getTime() - span - 1), to: new Date(range.from.getTime() - 1) };
  }, [range]);

  const { entries, loading } = useTimeEntries({ bandId: activeBandId, range });
  const { entries: previousEntries } = useTimeEntries({
    bandId: activeBandId,
    range: previousRange,
  });

  const tasksQuery = useMemo(
    () => (activeBandId ? query(allTasksGroup(), where("bandId", "==", activeBandId)) : null),
    [activeBandId],
  );
  const { data: tasks } = useCollection(tasksQuery);

  const total = totalMinutes(entries);
  const previousTotal = totalMinutes(previousEntries);
  const delta = deltaPercent(total, previousTotal);

  const byMember = useMemo(
    () => totalsByMember(entries, members, roleColorVar),
    [entries, members],
  );
  const byProject = useMemo(
    () => totalsByProject(entries, projects, roleColorVar),
    [entries, projects],
  );
  const byRole = useMemo(
    () => totalsByFunctionalRole(entries, members, roleColorVar),
    [entries, members],
  );

  const days = useMemo(() => {
    if (range) return eachDayOfInterval({ start: range.from, end: range.to });
    if (entries.length === 0) return [];
    const earliest = entries.reduce(
      (min, entry) => (entry.startTime < min ? entry.startTime : min),
      entries[0]!.startTime,
    );
    // Cap the "all time" series so a two-year-old band does not render 700 points.
    const start = earliest < addDays(today, -180) ? addDays(today, -180) : earliest;
    return eachDayOfInterval({ start, end: today });
  }, [range, entries, today]);

  const series = useMemo(() => seriesByDay(entries, days), [entries, days]);
  const progress = useMemo(
    () => projectProgress(tasks, projects, roleColorVar),
    [tasks, projects],
  );

  const activeMembers = byMember.length;
  const periodLabels: [Period, string][] = [
    ["week", "Diese Woche"],
    ["month", "Dieser Monat"],
    ["all", "Gesamt"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Statistik</h1>
          <p className="text-muted text-sm">Wohin die Zeit der Band geflossen ist.</p>
        </div>
        <div className="border-border bg-surface-2 inline-flex rounded-md border p-0.5">
          {periodLabels.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                period === value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatNugget
          label="Erfasste Zeit"
          value={formatDuration(total)}
          icon={Clock3}
          hint={
            delta === null
              ? period === "all"
                ? "über die ganze Zeit"
                : "kein Vergleichszeitraum"
              : `${delta >= 0 ? "+" : ""}${delta}% zum Vorzeitraum`
          }
        />
        <StatNugget label="Aktive Mitglieder" value={String(activeMembers)} icon={Users} />
        <StatNugget
          label="Einträge"
          value={String(entries.length)}
          icon={CalendarDays}
          hint={entries.length > 0 ? `Ø ${formatDuration(total / entries.length)}` : undefined}
        />
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Verlauf"
            subtitle="Erfasste Zeit pro Tag"
            className="lg:col-span-2"
          >
            <TimeOverTimeChart points={series} />
          </ChartCard>

          <ChartCard title="Zeit pro Mitglied" subtitle="Wer wie viel beigetragen hat">
            <TimeBarChart slices={byMember} caption="Zeit pro Mitglied" />
          </ChartCard>

          <ChartCard title="Verteilung auf Projekte" subtitle="Anteil an der Gesamtzeit">
            <ProjectDistributionPie slices={byProject} />
          </ChartCard>

          <ChartCard
            title="Zeit pro Rolle"
            subtitle="Nach funktionaler Rolle, nicht nach Berechtigung"
          >
            <TimeBarChart slices={byRole} caption="Zeit pro Rolle" />
          </ChartCard>

          <ChartCard title="Projektfortschritt" subtitle="Erledigte gegen offene Aufgaben">
            <ProjectProgressList items={progress} />
            <Legend
              className="mt-4"
              items={progress.map((p) => ({ id: p.id, label: p.label, color: p.color }))}
            />
          </ChartCard>
        </div>
      )}

      {!loading && entries.length === 0 ? (
        <p className="text-muted flex items-center justify-center gap-2 py-6 text-sm">
          <BarChart3 className="size-4" aria-hidden />
          Sobald Zeit erfasst wird, füllen sich diese Auswertungen automatisch.
        </p>
      ) : null}
    </div>
  );
}
