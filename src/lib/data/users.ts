"use client";

import { arrayRemove, arrayUnion, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { updateProfile, type User } from "firebase/auth";
import { memberDoc, userDoc } from "@/lib/firebase/paths";

/**
 * Writes go through `withConverter(null)`.
 *
 * The converters exist to shape *reads* (Timestamp -> Date, id from the key).
 * A write payload is a different shape: it carries `serverTimestamp()` and
 * `arrayUnion()` sentinels and never carries `id`. Dropping the converter for
 * writes keeps both sides honestly typed instead of casting the difference away.
 */

export async function ensureUserProfile(user: User): Promise<void> {
  const ref = userDoc(user.uid);
  const snap = await getDoc(ref);
  // Idempotent: this runs on every auth state change, so it must never clobber
  // bandIds or a display name the user has since edited.
  if (snap.exists()) return;

  await setDoc(ref.withConverter(null), {
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Unbenannt",
    email: user.email ?? "",
    photoURL: user.photoURL ?? null,
    createdAt: serverTimestamp(),
    bandIds: [],
  });
}

export async function addBandToUser(userId: string, bandId: string): Promise<void> {
  await updateDoc(userDoc(userId).withConverter(null), { bandIds: arrayUnion(bandId) });
}

export async function removeBandFromUser(userId: string, bandId: string): Promise<void> {
  await updateDoc(userDoc(userId).withConverter(null), { bandIds: arrayRemove(bandId) });
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  await updateDoc(userDoc(userId).withConverter(null), { displayName });
}

export async function updateOwnProfile(
  user: User,
  bandIds: string[],
  input: { displayName: string; photoURL: string | null },
): Promise<void> {
  const name = input.displayName.trim();
  if (!name) throw new Error("Bitte gib einen Namen ein.");
  const photoURL = input.photoURL?.trim() || null;

  await updateProfile(user, {
    displayName: name,
    photoURL: photoURL ?? "",
  });
  await updateDoc(userDoc(user.uid).withConverter(null), {
    displayName: name,
    photoURL,
  });
  await Promise.all(
    bandIds.map((bandId) =>
      updateDoc(memberDoc(bandId, user.uid).withConverter(null), {
        displayName: name,
        photoURL,
      }).catch(() => {
        // Stale bandIds or a band the user can no longer write: skip.
      }),
    ),
  );
}
