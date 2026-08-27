"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useRunningTimer } from "@/hooks/useRunningTimer";
import { formatClock } from "@/lib/time";

const IDLE_TITLE = "Veritrack";

/**
 * Mirrors a running timer into `document.title` so the elapsed clock stays
 * visible when the tab is in the background. Clock first: browsers truncate
 * tab titles from the end, so "Veritrack · 0:01:00" would hide the time.
 *
 * Idle pages keep the Next.js metadata title. We only write the document
 * title while a timer is open, then restore the default on stop or unmount.
 * Pathname is a dependency because App Router resets `document.title` on
 * client navigations; the next tick would recover anyway, this is immediate.
 */
export function RunningTabTitle() {
  const { user } = useAuth();
  const { activeBandId } = useBand();
  const pathname = usePathname();
  const { entry, elapsed } = useRunningTimer(activeBandId, user?.uid ?? null);
  const wasRunning = useRef(false);

  useEffect(() => {
    if (entry) {
      wasRunning.current = true;
      document.title = `${formatClock(elapsed)} · Veritrack`;
      return;
    }
    if (wasRunning.current) {
      wasRunning.current = false;
      document.title = IDLE_TITLE;
    }
  }, [entry, elapsed, pathname]);

  useEffect(() => {
    return () => {
      if (wasRunning.current) document.title = IDLE_TITLE;
    };
  }, []);

  return null;
}
