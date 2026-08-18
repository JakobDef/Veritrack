"use client";

import {
  addDoc,
  deleteDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { timeEntriesCol, timeEntryDoc } from "@/lib/firebase/paths";
import { entryDescriptionError, entryRangeError, toMinutes } from "@/lib/time";

export class TimeEntryError extends Error {}

/**
 * Starts a timer. Project is optional (`null` = unassigned); description is
 * required (trimmed non-empty).
 *
 * Any timer already running for this user is stopped first. That is what makes
 * "switch to another project" a single click, and it is also the single-running-
 * timer guard: the rules cannot express "this user has no other open entry"
 * without a denormalized field plus a non-atomic second write, so the invariant
 * is enforced here instead. Worst case (two devices starting at the same
 * instant) is two open entries, which the history screen lets the user fix.
 */
export async function startTimer(
  bandId: string,
  userId: string,
  input: { projectId: string | null; taskId?: string | null; description: string },
): Promise<string> {
  const description = requireDescription(input.description);

  await stopAllRunningTimers(bandId, userId);

  const ref = await addDoc(timeEntriesCol(bandId).withConverter(null), {
    userId,
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    description,
    // serverTimestamp() keeps every member's entries on one clock, so a device
    // with a skewed clock cannot shift the whole band's statistics.
    startTime: serverTimestamp(),
    endTime: null,
    duration: null,
    createdAt: serverTimestamp(),
    payoutId: null,
  });
  return ref.id;
}

/** Closes one running entry and writes its duration in whole minutes. */
export async function stopTimer(
  bandId: string,
  entryId: string,
  startTime: Date,
): Promise<void> {
  const endTime = new Date();
  await updateDoc(timeEntryDoc(bandId, entryId).withConverter(null), {
    endTime,
    duration: toMinutes(startTime, endTime),
  });
}

/** Discards a running entry entirely, for a timer started by accident. */
export async function cancelTimer(bandId: string, entryId: string): Promise<void> {
  await deleteDoc(timeEntryDoc(bandId, entryId));
}

async function stopAllRunningTimers(bandId: string, userId: string): Promise<void> {
  const snap = await getDocs(
    query(timeEntriesCol(bandId), where("userId", "==", userId), where("endTime", "==", null)),
  );
  await Promise.all(
    snap.docs.map((doc) => {
      const endTime = new Date();
      return updateDoc(doc.ref.withConverter(null), {
        endTime,
        duration: toMinutes(doc.data().startTime, endTime),
      });
    }),
  );
}

export type ManualEntryInput = {
  projectId: string | null;
  taskId?: string | null;
  description: string;
  startTime: Date;
  endTime: Date;
};

/** Retroactive entry for a rehearsal or gig that nobody tracked live. */
export async function createManualEntry(
  bandId: string,
  userId: string,
  input: ManualEntryInput,
): Promise<string> {
  validateRange(input.startTime, input.endTime);
  const description = requireDescription(input.description);
  const ref = await addDoc(timeEntriesCol(bandId).withConverter(null), {
    userId,
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    description,
    startTime: input.startTime,
    endTime: input.endTime,
    duration: toMinutes(input.startTime, input.endTime),
    createdAt: serverTimestamp(),
    payoutId: null,
  });
  return ref.id;
}

export async function updateEntry(
  bandId: string,
  entryId: string,
  input: Partial<ManualEntryInput>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.projectId !== undefined) payload.projectId = input.projectId;
  if (input.taskId !== undefined) payload.taskId = input.taskId;
  if (input.description !== undefined) {
    payload.description = requireDescription(input.description);
  }

  if (input.startTime && input.endTime) {
    validateRange(input.startTime, input.endTime);
    payload.startTime = input.startTime;
    payload.endTime = input.endTime;
    payload.duration = toMinutes(input.startTime, input.endTime);
  }

  if (Object.keys(payload).length === 0) return;
  await updateDoc(timeEntryDoc(bandId, entryId).withConverter(null), payload);
}

export async function deleteEntry(bandId: string, entryId: string): Promise<void> {
  await deleteDoc(timeEntryDoc(bandId, entryId));
}

function validateRange(startTime: Date, endTime: Date): void {
  const message = entryRangeError(startTime, endTime);
  if (message) throw new TimeEntryError(message);
}

function requireDescription(description: string): string {
  const message = entryDescriptionError(description);
  if (message) throw new TimeEntryError(message);
  return description.trim();
}
