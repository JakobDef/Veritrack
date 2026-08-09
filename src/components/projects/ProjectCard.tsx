"use client";

import Link from "next/link";
import { CalendarClock, Timer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateShort } from "@/lib/dates";
import { formatDuration } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";
import { PROJECT_STATUS_LABELS, type Project } from "@/types/models";

const STATUS_TONE = {
  active: "success",
  paused: "warning",
  done: "neutral",
} as const;

export function ProjectCard({
  project,
  trackedMinutes,
  taskCounts,
  nowMs,
}: {
  project: Project;
  trackedMinutes: number;
  taskCounts?: { done: number; total: number };
  nowMs: number;
}) {
  const color = roleColorVar(project.color);
  const overdue =
    project.dueDate !== null && project.status !== "done" && project.dueDate.getTime() < nowMs;

  return (
    <Card interactive className="relative overflow-hidden">
      {/* Color spine: identifies the project at a glance across every surface. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: color }} />
      <Link href={`/projects/${project.id}`} className="flex h-full flex-col gap-3 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 truncate font-semibold">{project.name}</h3>
          <Badge tone={STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
        </div>

        {project.description ? (
          <p className="text-muted line-clamp-2 text-sm">{project.description}</p>
        ) : (
          <p className="text-faint text-sm italic">Keine Beschreibung</p>
        )}

        <div className="text-muted mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <Timer className="size-3.5" aria-hidden />
            {formatDuration(trackedMinutes)}
          </span>
          {taskCounts && taskCounts.total > 0 ? (
            <span className="flex items-center gap-1.5">
              {taskCounts.done}/{taskCounts.total} Aufgaben
            </span>
          ) : null}
          {project.dueDate ? (
            <span
              className={`flex items-center gap-1.5 ${overdue ? "text-warning font-medium" : ""}`}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {formatDateShort(project.dueDate)}
            </span>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}
