"use client";

import { addDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { projectDoc, projectsCol } from "@/lib/firebase/paths";
import type { ProjectStatus } from "@/types/models";

export type ProjectInput = {
  name: string;
  description?: string;
  status?: ProjectStatus;
  color?: string;
  dueDate?: Date | null;
};

export async function createProject(
  bandId: string,
  createdBy: string,
  input: ProjectInput,
): Promise<string> {
  const ref = await addDoc(projectsCol(bandId).withConverter(null), {
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    status: input.status ?? "active",
    color: input.color ?? "role-1",
    createdAt: serverTimestamp(),
    createdBy,
    dueDate: input.dueDate ?? null,
  });
  return ref.id;
}

export async function updateProject(
  bandId: string,
  projectId: string,
  input: Partial<ProjectInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.color !== undefined) payload.color = input.color;
  if (input.dueDate !== undefined) payload.dueDate = input.dueDate;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(projectDoc(bandId, projectId).withConverter(null), payload);
}

/**
 * Removes the project document. Its tasks subcollection is deliberately left
 * behind: a client cannot delete a subcollection atomically, and orphan tasks
 * are unreachable anyway. Time entries are kept on purpose so tracked hours
 * survive a deleted project.
 */
export async function deleteProject(bandId: string, projectId: string): Promise<void> {
  await deleteDoc(projectDoc(bandId, projectId));
}
