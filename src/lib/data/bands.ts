"use client";

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  bandDoc,
  bandsCol,
  inviteCodeDoc,
  memberDoc,
} from "@/lib/firebase/paths";
import { generateInviteCode } from "@/lib/inviteCode";
import { addBandToUser, removeBandFromUser } from "./users";

export class JoinError extends Error {}

/**
 * Creates a band and makes the creator its first admin.
 *
 * Deliberately NOT a writeBatch. Firestore evaluates every write in a batch
 * against the pre-batch state, so a member document created in the same batch
 * as its band cannot satisfy a rule that reads the band's `createdBy`. The
 * three writes therefore run in order: band, invite-code lookup, member.
 *
 * If the sequence fails part way the band exists with no members. That is inert
 * rather than harmful: band documents are readable only by members, so an
 * orphan is invisible to everyone including its creator.
 */
export async function createBand(
  user: User,
  input: { name: string; description?: string },
): Promise<string> {
  const bandRef = doc(bandsCol());
  const inviteCode = generateInviteCode();
  const name = input.name.trim();

  await setDoc(bandRef.withConverter(null), {
    name,
    description: input.description?.trim() ?? "",
    photoURL: null,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    inviteCode,
    // One-way latch guarding the creator's admin-seed window; see firestore.rules.
    seeded: false,
  });

  await setDoc(inviteCodeDoc(inviteCode).withConverter(null), {
    bandId: bandRef.id,
    bandName: name,
    createdAt: serverTimestamp(),
  });

  await setDoc(memberDoc(bandRef.id, user.uid).withConverter(null), {
    role: "",
    roleColor: "role-1",
    joinedAt: serverTimestamp(),
    status: "active",
    permissionRole: "admin",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Unbenannt",
    photoURL: user.photoURL ?? null,
    viaInviteCode: null,
  });

  // Closes the admin-seed window now that the creator is an admin. Must come
  // after the member write, because flipping the latch is itself an admin-only
  // update. If this ever fails the creator keeps admin rights but the window
  // stays open, so surface it rather than swallowing it.
  await updateDoc(bandRef.withConverter(null), { seeded: true });

  await addBandToUser(user.uid, bandRef.id);
  return bandRef.id;
}

/** Resolves an invite code to its band without requiring membership. */
export async function lookupInviteCode(code: string) {
  if (!code) return null;
  const snap = await getDoc(inviteCodeDoc(code));
  return snap.exists() ? snap.data() : null;
}

/**
 * Joins the band the code points at, always as a plain member. The rules
 * re-verify the code server-side, so a tampered client cannot self-promote.
 */
export async function joinBandByInviteCode(
  user: User,
  code: string,
  profile: { role: string; roleColor: string },
): Promise<string> {
  const invite = await lookupInviteCode(code);
  if (!invite) {
    throw new JoinError("Dieser Einladungscode existiert nicht oder wurde zurückgezogen.");
  }

  const existing = await getDoc(memberDoc(invite.bandId, user.uid));
  if (existing.exists()) {
    // Already a member: make sure the local band list reflects that, then treat
    // it as success so a re-used invite link is not a dead end.
    await addBandToUser(user.uid, invite.bandId);
    return invite.bandId;
  }

  await setDoc(memberDoc(invite.bandId, user.uid).withConverter(null), {
    role: profile.role.trim(),
    roleColor: profile.roleColor,
    joinedAt: serverTimestamp(),
    status: "active",
    permissionRole: "member",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Unbenannt",
    photoURL: user.photoURL ?? null,
    viaInviteCode: code,
  });

  await addBandToUser(user.uid, invite.bandId);
  return invite.bandId;
}

export async function updateBandSettings(
  bandId: string,
  input: {
    name?: string;
    description?: string;
    photoURL?: string | null;
    hourlyRateCents?: number;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.photoURL !== undefined) payload.photoURL = input.photoURL || null;
  if (input.hourlyRateCents !== undefined) {
    if (!Number.isInteger(input.hourlyRateCents) || input.hourlyRateCents < 0) {
      throw new Error("Stundenlohn muss eine nicht-negative ganze Cent-Zahl sein.");
    }
    payload.hourlyRateCents = input.hourlyRateCents;
  }
  if (Object.keys(payload).length === 0) return;
  await updateDoc(bandDoc(bandId).withConverter(null), payload);
}

/**
 * Issues a fresh invite code and deletes the old lookup document, which is what
 * makes previously shared links stop working.
 */
export async function regenerateInviteCode(bandId: string, currentCode: string): Promise<string> {
  const band = await getDoc(bandDoc(bandId));
  if (!band.exists()) throw new Error("Band nicht gefunden.");

  const next = generateInviteCode();
  await setDoc(inviteCodeDoc(next).withConverter(null), {
    bandId,
    bandName: band.data().name,
    createdAt: serverTimestamp(),
  });
  await updateDoc(bandDoc(bandId).withConverter(null), { inviteCode: next });
  if (currentCode) {
    await deleteDoc(inviteCodeDoc(currentCode)).catch(() => {
      // The new code is already live; a leftover lookup document is harmless
      // because it is only reachable by someone who already had the old link.
    });
  }
  return next;
}

/** Leaves the band. Admins must hand over admin rights first (enforced in the UI). */
export async function leaveBand(bandId: string, userId: string): Promise<void> {
  await deleteDoc(memberDoc(bandId, userId));
  await removeBandFromUser(userId, bandId);
}

export async function deleteBand(
  bandId: string,
  userId: string,
  inviteCode: string,
): Promise<void> {
  // Subcollections are intentionally left in place: deleting them client-side
  // is not atomic and a half-deleted band is worse than an unreachable one.
  // A real deployment would do this in a Cloud Function. The deleter can only
  // drop their own `bandIds` entry; other members' clients prune a missing
  // band document on next load.
  if (inviteCode) await deleteDoc(inviteCodeDoc(inviteCode)).catch(() => {});
  await deleteDoc(bandDoc(bandId));
  await removeBandFromUser(userId, bandId);
}
