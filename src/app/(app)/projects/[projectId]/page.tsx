"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Pencil, Play, Timer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useDocument } from "@/hooks/useCollection";
import { useTasks } from "@/hooks/useTasks";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { projectDoc } from "@/lib/firebase/paths";
import { deleteProject } from "@/lib/data/projects";
import { startTimer } from "@/lib/data/timeEntries";
import { formatDateShort } from "@/lib/dates";
import { formatDuration } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";
import { PROJECT_STATUS_LABELS, type Task, type TaskStatus } from "@/types/models";

const STATUS_TONE = { active: "success", paused: "warning", done: "neutral" } as const;

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { user } = useAuth();
  const { activeBandId, members, can } = useBand();
  const router = useRouter();
  const { toast, toastError } = useToast();

  const { data: project, loading } = useDocument(
    activeBandId ? projectDoc(activeBandId, projectId) : null,
  );
  const { byStatus, counts, loading: tasksLoading } = useTasks(activeBandId, projectId);
  const { entries } = useTimeEntries({ bandId: activeBandId });

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taskDialog, setTaskDialog] = useState<{ task: Task | null; status: TaskStatus } | null>(
    null,
  );

  const trackedMinutes = entries
    .filter((entry) => entry.projectId === projectId)
    .reduce((sum, entry) => sum + (entry.duration ?? 0), 0);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-2xl py-10">
        <EmptyState
          icon={Timer}
          title="Projekt nicht gefunden"
          description="Es wurde gelöscht, oder du hast keinen Zugriff darauf."
          action={
            <Button variant="secondary" onClick={() => router.replace("/projects")}>
              <ArrowLeft className="size-4" aria-hidden />
              Zu den Projekten
            </Button>
          }
        />
      </div>
    );
  }

  const color = roleColorVar(project.color);

  async function onStart() {
    if (!user || !activeBandId) return;
    setBusy(true);
    try {
      await startTimer(activeBandId, user.uid, { projectId });
      toast(`Timer läuft: ${project!.name}`, "success");
    } catch (err) {
      toastError(err, "Der Timer konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!activeBandId) return;
    setBusy(true);
    try {
      await deleteProject(activeBandId, projectId);
      toast("Projekt gelöscht.", "info");
      router.replace("/projects");
    } catch (err) {
      toastError(err, "Das Projekt konnte nicht gelöscht werden.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Link
        href="/projects"
        className="text-muted hover:text-text inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Projekte
      </Link>

      <header className="border-border bg-surface relative overflow-hidden rounded-lg border p-5 sm:p-6">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{project.name}</h1>
              <Badge tone={STATUS_TONE[project.status]}>
                {PROJECT_STATUS_LABELS[project.status]}
              </Badge>
            </div>
            {project.description ? (
              <p className="text-muted max-w-2xl text-sm">{project.description}</p>
            ) : null}
            <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                <Timer className="size-3.5" aria-hidden />
                {formatDuration(trackedMinutes)} erfasst
              </span>
              <span>
                {counts.done}/{counts.total} Aufgaben erledigt
              </span>
              {project.dueDate ? (
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-3.5" aria-hidden />
                  fällig {formatDateShort(project.dueDate)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {can.trackTime ? (
              <Button variant="primary" onClick={() => void onStart()} loading={busy}>
                <Play className="size-4 fill-current" aria-hidden />
                Timer starten
              </Button>
            ) : null}
            {can.manageBand ? (
              <>
                <Button variant="secondary" iconOnly onClick={() => setEditOpen(true)} aria-label="Projekt bearbeiten">
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  iconOnly
                  onClick={() => setDeleteOpen(true)}
                  aria-label="Projekt löschen"
                  className="text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Aufgaben</h2>
        {tasksLoading ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : activeBandId ? (
          <KanbanBoard
            bandId={activeBandId}
            projectId={projectId}
            byStatus={byStatus}
            members={members}
            canEdit={can.editTask}
            canTrack={can.trackTime}
            onOpenTask={(task) => setTaskDialog({ task, status: task.status })}
            onCreateTask={(status) => setTaskDialog({ task: null, status })}
          />
        ) : null}
      </section>

      {activeBandId && user ? (
        <ProjectForm
          open={editOpen}
          onClose={() => setEditOpen(false)}
          bandId={activeBandId}
          userId={user.uid}
          project={project}
        />
      ) : null}

      {activeBandId ? (
        <TaskDialog
          open={taskDialog !== null}
          onClose={() => setTaskDialog(null)}
          bandId={activeBandId}
          projectId={projectId}
          task={taskDialog?.task ?? null}
          initialStatus={taskDialog?.status ?? "todo"}
          members={members}
          canEdit={can.editTask}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void onDelete()}
        loading={busy}
        title={`"${project.name}" löschen?`}
        description="Die erfasste Zeit bleibt erhalten, das Projekt verschwindet aber aus allen Listen."
      />
    </div>
  );
}
