"use client";

import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { payoutsCol, timeEntryDoc } from "@/lib/firebase/paths";
import { payoutAmountCents } from "@/lib/money";
import { isPayoutOpenEntry } from "@/lib/payout";
import type { TimeEntry } from "@/types/models";

/**
 * Firestore `writeBatch` allows 500 writes. Each mark-paid chunk is one payout
 * `set` plus the entry stamps, so a person with more than 499 unpaid completed
 * entries becomes several payout documents in the same click. For a band this
 * size that split should never run; still implement it so a surprise dump does
 * not fail with an SDK error.
 */
const MAX_ENTRY_UPDATES_PER_BATCH = 499;

export async function markMemberPaid({
  bandId,
  actorUid,
  userId,
  entries,
  hourlyRateCents,
}: {
  bandId: string;
  actorUid: string;
  userId: string;
  entries: TimeEntry[];
  hourlyRateCents: number;
}): Promise<void> {
  if (hourlyRateCents <= 0) {
    throw new Error("Stundenlohn ist nicht festgelegt.");
  }

  const open = entries.filter((entry) => isPayoutOpenEntry(entry) && entry.userId === userId);
  if (open.length === 0) {
    throw new Error("Keine offenen Stunden zum Auszahlen.");
  }

  for (let i = 0; i < open.length; i += MAX_ENTRY_UPDATES_PER_BATCH) {
    const chunk = open.slice(i, i + MAX_ENTRY_UPDATES_PER_BATCH);
    const minutes = chunk.reduce((sum, entry) => sum + (entry.duration ?? 0), 0);
    const amountCents = payoutAmountCents(minutes, hourlyRateCents);
    const payoutRef = doc(payoutsCol(bandId));
    const batch = writeBatch(db);

    batch.set(payoutRef.withConverter(null), {
      userId,
      minutes,
      hourlyRateCents,
      amountCents,
      createdAt: serverTimestamp(),
      createdBy: actorUid,
    });

    for (const entry of chunk) {
      batch.update(timeEntryDoc(bandId, entry.id).withConverter(null), {
        payoutId: payoutRef.id,
      });
    }

    await batch.commit();
  }
}
