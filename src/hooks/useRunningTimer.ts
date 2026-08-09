"use client";

import { useEffect, useMemo, useState } from "react";
import { query, where } from "firebase/firestore";
import { useCollection } from "./useCollection";
import { timeEntriesCol } from "@/lib/firebase/paths";
import { elapsedMs } from "@/lib/time";
import type { TimeEntry } from "@/types/models";

/**
 * A 1 Hz clock, shared by every component that shows a live duration.
 *
 * One interval for the whole page rather than one per component: with the hero,
 * the persistent bar and the team list all ticking, per-component intervals
 * would fire out of phase and show three different seconds at once.
 */
export function useNow(active: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  const [wasActive, setWasActive] = useState(active);

  // Re-seed in the render phase when the clock switches on: `now` may be
  // minutes stale from the last time a timer ran, and waiting a full second for
  // the first interval tick would briefly show a wrong elapsed time.
  if (active !== wasActive) {
    setWasActive(active);
    if (active) setNow(new Date());
  }

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return now;
}

/** The current user's open entry, if any, plus its live elapsed milliseconds. */
export function useRunningTimer(bandId: string | null, userId: string | null) {
  const q = useMemo(
    () =>
      bandId && userId
        ? query(timeEntriesCol(bandId), where("userId", "==", userId), where("endTime", "==", null))
        : null,
    [bandId, userId],
  );

  const { data, loading, error } = useCollection(q);

  // Defensive: startTimer stops any previous entry first, but if two devices
  // ever race, prefer the newest so the UI matches what the user just did.
  const entry = useMemo<TimeEntry | null>(() => {
    if (data.length === 0) return null;
    return [...data].sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0] ?? null;
  }, [data]);

  const now = useNow(entry !== null);
  const elapsed = entry ? elapsedMs(entry.startTime, now) : 0;

  return { entry, elapsed, loading, error };
}

/** Every open entry in the band, so bandmates' running timers show up live. */
export function useTeamRunningTimers(bandId: string | null) {
  const q = useMemo(
    () => (bandId ? query(timeEntriesCol(bandId), where("endTime", "==", null)) : null),
    [bandId],
  );
  const { data, loading } = useCollection(q);
  const now = useNow(data.length > 0);

  const entries = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
        .map((entry) => ({ entry, elapsed: elapsedMs(entry.startTime, now) })),
    [data, now],
  );

  return { entries, loading };
}
