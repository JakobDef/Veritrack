"use client";

import { CalendarClock, Play } from "lucide-react";
import { AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort } from "@/lib/dates";
import { roleColorVar } from "@/lib/roleColors";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type BandMember, type Task, type TaskStatus } from "@/types/models";
import { cn } from "@/lib/cn";

const PRIORITY_TONE = { high: "danger", medium: "neutral", low: "neutral" } as const;

export function TaskCard({
  task,
  members,
  nowMs,
  canEdit,
  canTrack,
  dragging,
  onOpen,
  onStartTimer,
  onMove,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  members: BandMember[];
  nowMs: number;
  canEdit: boolean;
  canTrack: boolean;
  dragging?: boolean;
  onOpen: () => void;
  onStartTimer: () => void;
  onMove: (status: TaskStatus) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const assignees = task.assignedTo
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is BandMember => !!m)
    .map((m) => ({ name: m.displayName, src: m.photoURL, color: roleColorVar(m.roleColor) }));

  const overdue = task.dueDate !== null && task.status !== "done" && task.dueDate.getTime() < nowMs;

  return (
    <article
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "border-border bg-surface group flex flex-col gap-2 rounded-md border p-3 shadow-sm transition-shadow",
        canEdit && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40",
        "hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
        >
          {task.title}
        </button>
        {canTrack ? (
          <button
            type="button"
            onClick={onStartTimer}
            aria-label={`Timer für "${task.title}" starten`}
            title="Timer für diese Aufgabe starten"
            className="text-faint hover:text-accent hover:bg-accent-soft -m-1 shrink-0 rounded-sm p-1 opacity-0 transition-all group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Play className="size-3.5 fill-current" aria-hidden />
          </button>
        ) : null}
      </div>

      {task.description ? (
        <p className="text-muted line-clamp-2 text-xs">{task.description}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {task.priority === "high" ? (
          <Badge tone={PRIORITY_TONE.high}>{TASK_PRIORITY_LABELS.high}</Badge>
        ) : null}
        {task.dueDate ? (
          <Badge tone={overdue ? "warning" : "neutral"}>
            <CalendarClock className="size-3" aria-hidden />
            {formatDateShort(task.dueDate)}
          </Badge>
        ) : null}
        <span className="flex-1" />
        {assignees.length > 0 ? <AvatarStack people={assignees} size="xs" max={3} /> : null}
      </div>

      {/* Keyboard- and touch-accessible alternative to dragging. */}
      {canEdit ? (
        <label className="sr-only" htmlFor={`move-${task.id}`}>
          Status von {task.title}
        </label>
      ) : null}
      {canEdit ? (
        <select
          id={`move-${task.id}`}
          value={task.status}
          onChange={(e) => onMove(e.target.value as TaskStatus)}
          className="border-border bg-surface-2 text-muted hover:text-text mt-0.5 w-full rounded-sm border px-1.5 py-1 text-[11px] md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        >
          {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      ) : null}
    </article>
  );
}
