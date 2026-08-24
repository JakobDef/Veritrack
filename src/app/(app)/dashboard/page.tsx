"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, FolderKanban, ListTodo, Play, Timer, Trash2 } from "lucide-react";
import { TimerHero } from "@/components/timer/TimerHero";
import { TeamActivity } from "@/components/timer/TeamActivity";
import { StatNugget } from "@/components/stats/StatNugget";
import { ManualEntryForm } from "@/components/time/ManualEntryForm";
import { EntryOpenTarget } from "@/components/time/TimeEntryList";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useLastProject } from "@/hooks/useLastProject";
import { useProjects } from "@/hooks/useProjects";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useMyOpenTasks } from "@/hooks/useTasks";
import { deleteEntry, startTimer } from "@/lib/data/timeEntries";
import { dayRange, formatDateShort, weekRange } from "@/lib/dates";
import { formatDuration, formatTimeOfDay } from "@/lib/time";
import { timeEntryProjectName } from "@/lib/projectLabel";
import { canEditTimeEntry } from "@/lib/permissions";
import { roleColorVar } from "@/lib/roleColors";
import { TASK_PRIORITY_LABELS, type TimeEntry } from "@/types/models";

export default function DashboardPage() {
  const { user } = useAuth();
  const { activeBandId, band, member, can } = useBand();
  const { projects, byId } = useProjects(activeBandId);
  const { remember } = useLastProject(activeBandId);
  const { toast, toastError } = useToast();
  const [restartingId, setRestartingId] = useState<string | null>(null);
  const [formEntry, setFormEntry] = useState<TimeEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TimeEntry | null>(null);
  const [busy, setBusy] = useState(false);

  // Captured once on mount: the ranges must stay stable across renders or every
  // render would build a new query. The day rolls over on the next remount,
  // which for a dashboard someone leaves open overnight is acceptable.
  const [mountedAt] = useState(() => new Date());
  const today = useMemo(() => dayRange(mountedAt), [mountedAt]);
  const thisWeek = useMemo(() => weekRange(mountedAt), [mountedAt]);
  const nowMs = mountedAt.getTime();

  const { totalMinutes: todayMinutes } = useTimeEntries({
    bandId: activeBandId,
    userId: user?.uid,
    range: today,
  });
  const { totalMinutes: weekMinutes } = useTimeEntries({
    bandId: activeBandId,
    userId: user?.uid,
    range: thisWeek,
  });
  const { entries: recent, loading: recentLoading } = useTimeEntries({
    bandId: activeBandId,
    userId: user?.uid,
    max: 6,
  });
  const { tasks: myTasks, loading: tasksLoading } = useMyOpenTasks(activeBandId, user?.uid ?? null);

  const activeProjects = projects.filter((project) => project.status === "active").length;
  const greeting = getGreeting();
  const firstName = (member?.displayName ?? user?.displayName ?? "").split(" ")[0];

  async function restartEntry(entry: TimeEntry) {
    if (!user || !activeBandId || restartingId) return;
    const description = entry.description.trim();
    if (!description) return;
    setRestartingId(entry.id);
    try {
      await startTimer(activeBandId, user.uid, {
        projectId: entry.projectId,
        taskId: entry.taskId,
        description,
      });
      remember(entry.projectId);
    } catch (err) {
      toastError(err, "Der Timer konnte nicht gestartet werden.");
    } finally {
      setRestartingId(null);
    }
  }

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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted text-sm">{band?.name ?? "Deine Band"}</p>
      </header>

      <TimerHero />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatNugget
          label="Heute"
          value={formatDuration(todayMinutes)}
          icon={Clock3}
          hint="deine erfasste Zeit"
        />
        <StatNugget
          label="Diese Woche"
          value={formatDuration(weekMinutes)}
          icon={CalendarDays}
          hint="Montag bis Sonntag"
        />
        <StatNugget
          label="Aktive Projekte"
          value={String(activeProjects)}
          icon={FolderKanban}
          hint={projects.length > activeProjects ? `${projects.length} insgesamt` : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Meine offenen Aufgaben</CardTitle>
            <Link
              href="/projects"
              className="text-muted hover:text-accent text-xs underline-offset-4 hover:underline"
            >
              Alle Projekte
            </Link>
          </CardHeader>
          <CardBody className="pt-4">
            {tasksLoading ? (
              <SkeletonList rows={3} />
            ) : myTasks.length === 0 ? (
              <EmptyState
                compact
                icon={ListTodo}
                title="Nichts offen"
                description="Dir ist gerade keine Aufgabe zugewiesen."
              />
            ) : (
              <ul className="flex flex-col">
                {myTasks.slice(0, 6).map((task) => {
                  const project = byId.get(task.projectId);
                  const overdue = task.dueDate ? task.dueDate.getTime() < nowMs : false;
                  return (
                    <li key={task.id}>
                      <Link
                        href={`/projects/${task.projectId}`}
                        className="hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                      >
                        <span
                          className="h-8 w-0.5 shrink-0 rounded-full"
                          style={{ backgroundColor: roleColorVar(project?.color) }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{task.title}</span>
                          <span className="text-muted block truncate text-xs">
                            {project?.name ?? "Projekt"}
                          </span>
                        </span>
                        {task.priority === "high" ? (
                          <Badge tone="danger">{TASK_PRIORITY_LABELS.high}</Badge>
                        ) : null}
                        {task.dueDate ? (
                          <Badge tone={overdue ? "warning" : "neutral"}>
                            {formatDateShort(task.dueDate)}
                          </Badge>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gerade live</CardTitle>
          </CardHeader>
          <CardBody className="pt-4">
            <TeamActivity />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Zuletzt erfasst</CardTitle>
          <Link
            href="/time"
            className="text-muted hover:text-accent text-xs underline-offset-4 hover:underline"
          >
            Ganze Historie
          </Link>
        </CardHeader>
        <CardBody className="pt-4">
          {recentLoading ? (
            <SkeletonList rows={3} />
          ) : recent.length === 0 ? (
            <EmptyState
              compact
              icon={Timer}
              title="Noch nichts erfasst"
              description="Starte oben den Timer, und dein erster Eintrag erscheint hier."
            />
          ) : (
            <ul className="flex flex-col">
              {recent.map((entry) => {
                const project = entry.projectId ? byId.get(entry.projectId) : undefined;
                const running = entry.endTime === null;
                const editable = canEditTimeEntry(entry, member);
                const openable = editable && !running;
                return (
                  <li
                    key={entry.id}
                    className="group hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5"
                  >
                    <EntryOpenTarget
                      openable={openable}
                      label={`Eintrag bearbeiten: ${timeEntryProjectName(entry.projectId, project)}`}
                      onOpen={() => {
                        setFormEntry(entry);
                        setFormOpen(true);
                      }}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: roleColorVar(project?.color) }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {timeEntryProjectName(entry.projectId, project)}
                          {entry.description ? (
                            <span className="text-muted"> · {entry.description}</span>
                          ) : null}
                        </span>
                        <span className="text-faint block text-xs">
                          {formatDateShort(entry.startTime)} · {formatTimeOfDay(entry.startTime)}
                          {entry.endTime ? ` - ${formatTimeOfDay(entry.endTime)}` : ""}
                        </span>
                      </span>
                      {running ? (
                        <Badge tone="accent">läuft</Badge>
                      ) : (
                        <span className="tabular shrink-0 font-mono text-sm">
                          {formatDuration(entry.duration)}
                        </span>
                      )}
                    </EntryOpenTarget>
                    <span className="flex shrink-0 items-center gap-0.5">
                      {!running && can.trackTime && entry.description.trim() ? (
                        <button
                          type="button"
                          onClick={() => void restartEntry(entry)}
                          disabled={restartingId !== null}
                          aria-label={`Weitertracken: ${entry.description}`}
                          title="Mit denselben Angaben weitertracken"
                          className="text-faint hover:text-accent hover:bg-accent-soft rounded-sm p-1 disabled:opacity-50"
                        >
                          <Play className="size-3.5 fill-current" aria-hidden />
                        </button>
                      ) : null}
                      {editable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          iconOnly
                          aria-label="Eintrag löschen"
                          className="hover:text-danger md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100"
                          onClick={() => setPendingDelete(entry)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
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
          existingEntries={recent}
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
            ? `${formatDuration(pendingDelete.duration)} auf "${timeEntryProjectName(pendingDelete.projectId, pendingDelete.projectId ? byId.get(pendingDelete.projectId) : undefined)}" werden entfernt.`
            : ""
        }
      />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Noch wach";
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Hallo";
  return "Guten Abend";
}
