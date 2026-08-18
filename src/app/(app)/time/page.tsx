"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { addMonths, addWeeks } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ManualEntryForm } from "@/components/time/ManualEntryForm";
import { TimeEntryList } from "@/components/time/TimeEntryList";
import { StatNugget } from "@/components/stats/StatNugget";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { deleteEntry } from "@/lib/data/timeEntries";
import { formatMonthTitle, formatWeekTitle, monthRange, weekRange } from "@/lib/dates";
import { formatDuration } from "@/lib/time";
import { timeEntryProjectName } from "@/lib/projectLabel";
import { canEditTimeEntry } from "@/lib/permissions";
import { UNASSIGNED_PROJECT_KEY, UNASSIGNED_PROJECT_LABEL, type TimeEntry } from "@/types/models";
import { cn } from "@/lib/cn";

type Granularity = "week" | "month";
type Scope = "mine" | "band";

export default function TimePage() {
  const { user } = useAuth();
  const { activeBandId, member, members, can } = useBand();
  const { projects, byId: projectsById } = useProjects(activeBandId);
  const { toast, toastError } = useToast();

  const [granularity, setGranularity] = useState<Granularity>("week");
  const [scope, setScope] = useState<Scope>("mine");
  const [offset, setOffset] = useState(0);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [formEntry, setFormEntry] = useState<TimeEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const [today] = useState(() => new Date());

  const anchor = useMemo(
    () => (granularity === "week" ? addWeeks(today, offset) : addMonths(today, offset)),
    [granularity, offset, today],
  );
  const range = useMemo(
    () => (granularity === "week" ? weekRange(anchor) : monthRange(anchor)),
    [granularity, anchor],
  );

  const { entries, loading, error } = useTimeEntries({
    bandId: activeBandId,
    userId: scope === "mine" ? user?.uid : undefined,
    range,
  });

  const visible = useMemo(() => {
    if (projectFilter === "all") return entries;
    if (projectFilter === UNASSIGNED_PROJECT_KEY) {
      return entries.filter((e) => e.projectId === null);
    }
    return entries.filter((e) => e.projectId === projectFilter);
  }, [entries, projectFilter]);

  const totalMinutes = visible.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
  const daysWithEntries = new Set(visible.map((e) => e.startTime.toDateString())).size;

  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Overlap detection only makes sense against the current user's own entries.
  const myEntries = useMemo(
    () => entries.filter((entry) => entry.userId === user?.uid),
    [entries, user],
  );

  async function onDelete() {
    if (!activeBandId || !pendingDelete) return;
    setBusy(true);
    try {
      await deleteEntry(activeBandId, pendingDelete.id);
      toast("Eintrag gelöscht.", "info");
      setPendingDelete(null);
    } catch (err) {
      toastError(err, "Der Eintrag konnte nicht gelöscht werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Zeiten</h1>
          <p className="text-muted text-sm">Alles, was erfasst wurde. Nachträge inklusive.</p>
        </div>
        {can.trackTime ? (
          <Button
            variant="primary"
            onClick={() => {
              setFormEntry(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            Zeit nachtragen
          </Button>
        ) : null}
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
                setGranularity(value);
                setOffset(0);
              }}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                granularity === value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
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
            {granularity === "week" ? formatWeekTitle(anchor) : formatMonthTitle(anchor)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Weiter"
            disabled={offset >= 0}
            onClick={() => setOffset((o) => Math.min(0, o + 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Button>
          {offset !== 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setOffset(0)}>
              Heute
            </Button>
          ) : null}
        </div>

        <span className="flex-1" />

        <select
          aria-label="Projekt filtern"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="border-border bg-surface text-text h-8 rounded-md border px-2 text-xs"
        >
          <option value="all">Alle Projekte</option>
          <option value={UNASSIGNED_PROJECT_KEY}>{UNASSIGNED_PROJECT_LABEL}</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <div className="border-border bg-surface-2 inline-flex rounded-md border p-0.5">
          {(
            [
              ["mine", "Nur ich"],
              ["band", "Ganze Band"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setScope(value)}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                scope === value ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatNugget label="Gesamt im Zeitraum" value={formatDuration(totalMinutes)} icon={Clock} />
        <StatNugget label="Einträge" value={String(visible.length)} />
        <StatNugget
          label="Tage mit Zeit"
          value={String(daysWithEntries)}
          hint={daysWithEntries > 0 ? `Ø ${formatDuration(totalMinutes / daysWithEntries)}` : undefined}
        />
      </div>

      <Card>
        <CardBody>
          {loading ? (
            <SkeletonList rows={4} />
          ) : error ? (
            <EmptyState
              icon={Clock}
              title="Zeiten konnten nicht geladen werden"
              description="Versuch die Seite neu zu laden."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nichts in diesem Zeitraum"
              description={
                can.trackTime
                  ? "Starte den Timer auf dem Dashboard, oder trage eine Probe nachträglich ein."
                  : "Sobald jemand Zeit erfasst, erscheint sie hier."
              }
              action={
                can.trackTime ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setFormEntry(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Zeit nachtragen
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <TimeEntryList
              entries={visible}
              projectsById={projectsById}
              membersById={membersById}
              showOwner={scope === "band"}
              canEdit={(entry) => canEditTimeEntry(entry, member)}
              onEdit={(entry) => {
                setFormEntry(entry);
                setFormOpen(true);
              }}
              onDelete={setPendingDelete}
            />
          )}
        </CardBody>
      </Card>

      {activeBandId && user ? (
        <ManualEntryForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          bandId={activeBandId}
          userId={user.uid}
          projects={projects}
          entry={formEntry}
          existingEntries={myEntries}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void onDelete()}
        loading={busy}
        title="Eintrag löschen?"
        description={
          pendingDelete
            ? `${formatDuration(pendingDelete.duration)} auf "${timeEntryProjectName(pendingDelete.projectId, pendingDelete.projectId ? projectsById.get(pendingDelete.projectId) : undefined)}" werden entfernt.`
            : ""
        }
      />
    </div>
  );
}
