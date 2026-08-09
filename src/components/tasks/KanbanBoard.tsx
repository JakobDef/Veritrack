"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { moveTask } from "@/lib/data/tasks";
import { startTimer } from "@/lib/data/timeEntries";
import { useAuth } from "@/providers/AuthProvider";
import { TASK_STATUS_LABELS, TASK_STATUS_ORDER, type BandMember, type Task, type TaskStatus } from "@/types/models";
import { cn } from "@/lib/cn";

export function KanbanBoard({
  bandId,
  projectId,
  byStatus,
  members,
  canEdit,
  canTrack,
  onOpenTask,
  onCreateTask,
}: {
  bandId: string;
  projectId: string;
  byStatus: Record<TaskStatus, Task[]>;
  members: BandMember[];
  canEdit: boolean;
  canTrack: boolean;
  onOpenTask: (task: Task) => void;
  onCreateTask: (status: TaskStatus) => void;
}) {
  const { user } = useAuth();
  const { toast, toastError } = useToast();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [nowMs] = useState(() => Date.now());

  async function handleMove(task: Task, status: TaskStatus) {
    if (task.status === status) return;
    try {
      await moveTask(bandId, projectId, task.id, status);
    } catch (err) {
      toastError(err, "Die Aufgabe konnte nicht verschoben werden.");
    }
  }

  async function handleStartTimer(task: Task) {
    if (!user) return;
    try {
      await startTimer(bandId, user.uid, {
        projectId,
        taskId: task.id,
        description: task.title,
      });
      toast(`Timer läuft: ${task.title}`, "success");
    } catch (err) {
      toastError(err, "Der Timer konnte nicht gestartet werden.");
    }
  }

  return (
    // Horizontal scroll rather than stacking: three columns side by side is the
    // whole point of a board, and stacking them loses the comparison.
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      {TASK_STATUS_ORDER.map((status) => {
        const tasks = byStatus[status];
        const isTarget = dropTarget === status && draggingId !== null;
        return (
          <section
            key={status}
            onDragOver={(e) => {
              if (!canEdit || !draggingId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTarget(status);
            }}
            onDragLeave={() => setDropTarget((prev) => (prev === status ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              setDropTarget(null);
              const taskId = e.dataTransfer.getData("text/plain");
              const task = TASK_STATUS_ORDER.flatMap((s) => byStatus[s]).find((t) => t.id === taskId);
              if (task) void handleMove(task, status);
            }}
            className={cn(
              "flex w-[280px] shrink-0 flex-col gap-2 rounded-lg border p-2.5 transition-colors md:w-auto md:flex-1",
              isTarget ? "border-accent bg-accent-soft" : "border-border bg-surface-2/40",
            )}
          >
            <header className="flex items-center justify-between px-1 py-0.5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {TASK_STATUS_LABELS[status]}
                <span className="text-faint text-xs font-normal">{tasks.length}</span>
              </h3>
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onCreateTask(status)}
                  aria-label={`Aufgabe in "${TASK_STATUS_LABELS[status]}" anlegen`}
                  className="text-faint hover:text-accent rounded-sm p-1 transition-colors"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              ) : null}
            </header>

            <div className="flex min-h-16 flex-col gap-2">
              {tasks.length === 0 ? (
                <p className="text-faint px-1 py-4 text-center text-xs">
                  {isTarget ? "Hier ablegen" : "Nichts hier"}
                </p>
              ) : (
                tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    nowMs={nowMs}
                    canEdit={canEdit}
                    canTrack={canTrack}
                    dragging={draggingId === task.id}
                    onOpen={() => onOpenTask(task)}
                    onStartTimer={() => void handleStartTimer(task)}
                    onMove={(next) => void handleMove(task, next)}
                    onDragStart={() => setDraggingId(task.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                  />
                ))
              )}
            </div>

            {canEdit && tasks.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => onCreateTask(status)}
              >
                <Plus className="size-3.5" aria-hidden />
                Aufgabe
              </Button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
