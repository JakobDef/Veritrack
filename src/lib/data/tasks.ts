"use client";

import { addDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { taskDoc, tasksCol } from "@/lib/firebase/paths";
import type { TaskPriority, TaskStatus } from "@/types/models";

export type TaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string[];
  dueDate?: Date | null;
  priority?: TaskPriority;
};

/**
 * `bandId` and `projectId` are written onto the task itself, not just implied
 * by its path. The dashboard's "assigned to me" list is a collection-group
 * query, which cannot filter by ancestor path, and the security rules pin both
 * fields so a task can never claim to belong to a different band.
 */
export async function createTask(
  bandId: string,
  projectId: string,
  input: TaskInput,
): Promise<string> {
  const ref = await addDoc(tasksCol(bandId, projectId).withConverter(null), {
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    status: input.status ?? "todo",
    assignedTo: input.assignedTo ?? [],
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "medium",
    createdAt: serverTimestamp(),
    bandId,
    projectId,
  });
  return ref.id;
}

export async function updateTask(
  bandId: string,
  projectId: string,
  taskId: string,
  input: Partial<TaskInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.assignedTo !== undefined) payload.assignedTo = input.assignedTo;
  if (input.dueDate !== undefined) payload.dueDate = input.dueDate;
  if (input.priority !== undefined) payload.priority = input.priority;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(taskDoc(bandId, projectId, taskId).withConverter(null), payload);
}

export async function moveTask(
  bandId: string,
  projectId: string,
  taskId: string,
  status: TaskStatus,
): Promise<void> {
  await updateDoc(taskDoc(bandId, projectId, taskId).withConverter(null), { status });
}

export async function deleteTask(
  bandId: string,
  projectId: string,
  taskId: string,
): Promise<void> {
  await deleteDoc(taskDoc(bandId, projectId, taskId));
}
