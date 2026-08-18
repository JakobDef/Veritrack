"use client";

import { useMemo, useState } from "react";
import { addMonths, addWeeks } from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MonthView, WeekView, type ColorMode, type DecoratedEntry } from "@/components/timetable/CalendarGrid";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { formatMonthTitle, formatWeekTitle, monthRange, weekRange } from "@/lib/dates";
import { formatDuration, formatTimeOfDay } from "@/lib/time";
import { timeEntryProjectName } from "@/lib/projectLabel";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";
import {
  UNASSIGNED_PROJECT_KEY,
  UNASSIGNED_PROJECT_LABEL,
} from "@/types/models";

type View = "week" | "month";

export default function TimetablePage() {
  const { activeBandId, members } = useBand();
  const { projects, byId: projectsById } = useProjects(activeBandId);

  const [view, setView] = useState<View>("week");
  const [offset, setOffset] = useState(0);
  const [colorMode, setColorMode] = useState<ColorMode>("member");
  const [memberFilter, setMemberFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<DecoratedEntry | null>(null);

  const [today] = useState(() => new Date());
  const anchor = useMemo(
    () => (view === "week" ? addWeeks(today, offset) : addMonths(today, offset)),
    [view, offset, today],
  );
  const range = useMemo(
    () => (view === "week" ? weekRange(anchor) : monthRange(anchor)),
    [view, anchor],
  );

  const { entries, loading } = useTimeEntries({ bandId: activeBandId, range });

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const functionalRoles = useMemo(
    () => [...new Set(members.map((m) => m.role).filter(Boolean))].sort(),
    [members],
  );

  const decorated = useMemo<DecoratedEntry[]>(() => {
    return entries
      .filter((entry) => {
        if (memberFilter !== "all" && entry.userId !== memberFilter) return false;
        if (projectFilter === UNASSIGNED_PROJECT_KEY) {
          if (entry.projectId !== null) return false;
        } else if (projectFilter !== "all" && entry.projectId !== projectFilter) {
          return false;
        }
        if (roleFilter !== "all" && membersById.get(entry.userId)?.role !== roleFilter) return false;
        return true;
      })
      .map((entry) => {
        const member = membersById.get(entry.userId);
        const project = entry.projectId ? projectsById.get(entry.projectId) : undefined;
        return {
          entry,
          color:
            colorMode === "member" ? roleColorVar(member?.roleColor) : roleColorVar(project?.color),
          memberName: member?.displayName ?? "Unbekannt",
          projectName: timeEntryProjectName(entry.projectId, project),
        };
      });
  }, [entries, memberFilter, projectFilter, roleFilter, membersById, projectsById, colorMode]);

  const totalMinutes = decorated.reduce((sum, d) => sum + (d.entry.duration ?? 0), 0);

  const legend = useMemo(() => {
    if (colorMode === "member") {
      return members.map((m) => ({ id: m.id, label: m.displayName, color: roleColorVar(m.roleColor) }));
    }
    const items = projects.map((p) => ({
      id: p.id,
      label: p.name,
      color: roleColorVar(p.color),
    }));
    if (decorated.some((d) => d.entry.projectId === null)) {
      items.push({
        id: UNASSIGNED_PROJECT_KEY,
        label: UNASSIGNED_PROJECT_LABEL,
        color: "var(--vt-faint)",
      });
    }
    return items;
  }, [colorMode, members, projects, decorated]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <p className="text-muted text-sm">
            Wer wann woran gearbeitet hat, über die ganze Band.
          </p>
        </div>
        <span className="tabular text-muted font-mono text-sm">
          {formatDuration(totalMinutes)} im Zeitraum
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="border-border bg-surface-2 inline-flex rounded-md border p-0.5">
          {(
            [
              ["week", "Woche"],
              ["month", "Monat"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setView(value);
                setOffset(0);
              }}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                view === value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" iconOnly aria-label="Zurück" onClick={() => setOffset((o) => o - 1)}>
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
          <span className="min-w-44 text-center text-sm font-medium">
            {view === "week" ? formatWeekTitle(anchor) : formatMonthTitle(anchor)}
          </span>
          <Button variant="ghost" size="sm" iconOnly aria-label="Weiter" onClick={() => setOffset((o) => o + 1)}>
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          {offset !== 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Heute
            </Button>
          ) : null}
        </div>

        <span className="flex-1" />

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            aria-label="Farbe nach"
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
            className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
          >
            <option value="member">Farbe: Person</option>
            <option value="project">Farbe: Projekt</option>
          </select>
          <select
            aria-label="Mitglied filtern"
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
          >
            <option value="all">Alle Mitglieder</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
          <select
            aria-label="Projekt filtern"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
          >
            <option value="all">Alle Projekte</option>
            <option value={UNASSIGNED_PROJECT_KEY}>{UNASSIGNED_PROJECT_LABEL}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {functionalRoles.length > 0 ? (
            <select
              aria-label="Rolle filtern"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
            >
              <option value="all">Alle Rollen</option>
              {functionalRoles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[520px] w-full" />
      ) : decorated.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Kein Eintrag in diesem Zeitraum"
          description="Blättere zu einer anderen Woche, oder lockere die Filter."
        />
      ) : view === "week" ? (
        <WeekView anchor={anchor} entries={decorated} onSelect={setSelected} />
      ) : (
        <MonthView anchor={anchor} entries={decorated} onSelect={setSelected} />
      )}

      {legend.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {legend.map((item) => (
            <span key={item.id} className="text-muted flex items-center gap-1.5 text-xs">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      ) : null}

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.projectName ?? ""}
        size="sm"
      >
        {selected ? (
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Person</dt>
              <dd className="font-medium">{selected.memberName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Zeitraum</dt>
              <dd className="tabular font-mono">
                {formatTimeOfDay(selected.entry.startTime)}
                {selected.entry.endTime ? ` - ${formatTimeOfDay(selected.entry.endTime)}` : " - läuft"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Dauer</dt>
              <dd className="tabular font-mono font-semibold">
                {formatDuration(selected.entry.duration)}
              </dd>
            </div>
            {selected.entry.description ? (
              <div className="flex flex-col gap-1 pt-1">
                <dt className="text-muted">Notiz</dt>
                <dd>{selected.entry.description}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Dialog>
    </div>
  );
}
