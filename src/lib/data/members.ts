"use client";

import { deleteDoc, updateDoc } from "firebase/firestore";
import { memberDoc } from "@/lib/firebase/paths";
import { removeBandFromUser } from "./users";
import type { PermissionRole } from "@/types/models";

/**
 * The functional role ("Gitarre") and the permission role (admin | member |
 * viewer) are updated through deliberately separate functions. Merging them into
 * one `updateMember` would make it far too easy to change someone's rights while
 * meaning to relabel their instrument.
 */

export async function updateFunctionalRole(
  bandId: string,
  userId: string,
  input: { role?: string; roleColor?: string },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.role !== undefined) payload.role = input.role.trim();
  if (input.roleColor !== undefined) payload.roleColor = input.roleColor;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(memberDoc(bandId, userId).withConverter(null), payload);
}

/** Admin only, and never on yourself: the rules enforce both. */
export async function updatePermissionRole(
  bandId: string,
  userId: string,
  permissionRole: PermissionRole,
): Promise<void> {
  await updateDoc(memberDoc(bandId, userId).withConverter(null), { permissionRole });
}

/** Keeps the user's own `bandIds` in step so the band vanishes from their switcher. */
export async function removeMember(bandId: string, userId: string): Promise<void> {
  await deleteDoc(memberDoc(bandId, userId));
  await removeBandFromUser(userId, bandId).catch(() => {
    // Removing somebody else's profile field is denied by the rules; their own
    // client repairs the stale entry on next load (a band it cannot read is
    // filtered out of the switcher anyway).
  });
}

/** Mirrors an updated display name onto the denormalized copy on the member doc. */
export async function syncMemberProfile(
  bandId: string,
  userId: string,
  input: { displayName?: string; photoURL?: string | null },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.displayName !== undefined) payload.displayName = input.displayName.trim();
  if (input.photoURL !== undefined) payload.photoURL = input.photoURL;
  if (Object.keys(payload).length === 0) return;
  await updateDoc(memberDoc(bandId, userId).withConverter(null), payload);
}
