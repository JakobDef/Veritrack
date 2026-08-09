"use client";

import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
import { useCollection } from "./useCollection";
import { allTasksGroup, tasksCol } from "@/lib/firebase/paths";
import { TASK_STATUS_ORDER, type Task, type TaskStatus } from "@/types/models";

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 } as const;

/** One project's tasks, grouped into the three Kanban columns. */
export function useTasks(bandId: string | null, projectId: string | null) {
  const q = useMemo(
    () =>
      bandId && projectId
        ? query(tasksCol(bandId, projectId), orderBy("createdAt", "desc"))
        : null,
    [bandId, projectId],
  );

  const { data, loading, error } = useCollection(q);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of data) groups[task.status].push(task);
    // Within a column: highest priority first, then soonest due date.
    for (const status of TASK_STATUS_ORDER) {
      groups[status].sort((a, b) => {
        const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (byPriority !== 0) return byPriority;
        const aDue = a.dueDate?.getTime() ?? Infinity;
        const bDue = b.dueDate?.getTime() ?? Infinity;
        return aDue - bDue;
      });
    }
    return groups;
  }, [data]);

  const counts = useMemo(
    () => ({
      todo: byStatus.todo.length,
      in_progress: byStatus.in_progress.length,
      done: byStatus.done.length,
      total: data.length,
    }),
    [byStatus, data.length],
  );

  return { tasks: data, byStatus, counts, loading, error };
}

/**
 * Open tasks assigned to the current user across every project in the band.
 *
 * Uses a collection-group query, which is why tasks carry a denormalized
 * `bandId`: without it the query would span every band in the database. Status
 * is filtered client-side because combining array-contains with an inequality
 * on another field needs a second index for no real benefit at this scale.
 */
export function useMyOpenTasks(bandId: string | null, userId: string | null) {
  const q = useMemo(
    () =>
      bandId && userId
        ? query(
            allTasksGroup(),
            where("bandId", "==", bandId),
            where("assignedTo", "array-contains", userId),
          )
        : null,
    [bandId, userId],
  );

  const { data, loading, error } = useCollection(q);

  const tasks = useMemo(
    () =>
      data
        .filter((task) => task.status !== "done")
        .sort((a, b) => {
          const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
          if (byPriority !== 0) return byPriority;
          return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
        }),
    [data],
  );

  return { tasks, loading, error };
}
