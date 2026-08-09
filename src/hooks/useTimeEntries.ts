"use client";

import { useMemo } from "react";
import { limit, orderBy, query, where } from "firebase/firestore";
import { useCollection } from "./useCollection";
import { timeEntriesCol } from "@/lib/firebase/paths";
import type { DateRange } from "@/lib/dates";

/**
 * Time entries for a band, optionally narrowed to one user and a date range.
 *
 * The range filter is a Firestore range on `startTime`, so an entry is included
 * by when it STARTED. Combined with the local-day bucketing in `dates.ts` that
 * keeps the list, the per-day totals and the calendar in agreement.
 *
 * Every combination used here is declared in firestore.indexes.json. The
 * emulator does not enforce indexes, so a missing declaration only ever fails
 * against a real project.
 *
 * Known limit: callers that compute an all-time total (per project, per member)
 * pass neither `range` nor `max`, so they subscribe to the band's whole
 * history. That is deliberate. Capping it with `limit()` would silently produce
 * a wrong total, which is worse than a large read. The real fix is a stored
 * aggregate updated on write; until a band's history is big enough to notice,
 * the honest total wins.
 */
export function useTimeEntries({
  bandId,
  userId,
  range,
  max,
}: {
  bandId: string | null;
  userId?: string | null;
  range?: DateRange;
  max?: number;
}) {
  // Depend on the range's timestamps, not the object: callers build `range`
  // inline, so a new object every render would rebuild the query every render.
  // (useCollection also compares queries with queryEqual, so this is belt and
  // braces, but it keeps the memo honest.)
  const fromMs = range?.from.getTime();
  const toMs = range?.to.getTime();

  const q = useMemo(() => {
    if (!bandId) return null;
    const constraints = [];
    if (userId) constraints.push(where("userId", "==", userId));
    if (fromMs !== undefined && toMs !== undefined) {
      constraints.push(where("startTime", ">=", new Date(fromMs)));
      constraints.push(where("startTime", "<=", new Date(toMs)));
    }
    // `max` is a real `limit()`, not a client-side slice. Without it the
    // dashboard's "last six entries" would open a live listener over the user's
    // entire history and throw almost all of it away, and that cost grows with
    // every entry the band ever records.
    if (max) constraints.push(limit(max));
    return query(timeEntriesCol(bandId), ...constraints, orderBy("startTime", "desc"));
  }, [bandId, userId, fromMs, toMs, max]);

  const { data: entries, loading, error } = useCollection(q);

  const totalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0),
    [entries],
  );

  return { entries, totalMinutes, loading, error };
}
