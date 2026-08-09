"use client";

import { useMemo } from "react";
import { orderBy, query, where } from "firebase/firestore";
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
    return query(timeEntriesCol(bandId), ...constraints, orderBy("startTime", "desc"));
  }, [bandId, userId, fromMs, toMs]);

  const { data, loading, error } = useCollection(q);

  const entries = useMemo(() => (max ? data.slice(0, max) : data), [data, max]);

  const totalMinutes = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.duration ?? 0), 0),
    [entries],
  );

  return { entries, totalMinutes, loading, error };
}
