"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useRunningTimer } from "@/hooks/useRunningTimer";
import { stopTimer } from "@/lib/data/timeEntries";
import { timeEntryProjectName } from "@/lib/projectLabel";
import { formatClock, formatDuration } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";

/**
 * Lives in the app header on every route, so a running timer can never be
 * forgotten just because the user navigated away from the dashboard. Hidden on
 * the dashboard itself, where the hero already shows the same clock far larger.
 */
export function RunningTimerBar() {
  const { user } = useAuth();
  const { activeBandId } = useBand();
  const { byId } = useProjects(activeBandId);
  const { entry, elapsed } = useRunningTimer(activeBandId, user?.uid ?? null);
  const { toast, toastError } = useToast();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  if (!entry || pathname === "/dashboard") return null;

  const project = entry.projectId ? byId.get(entry.projectId) : undefined;
  const accent = project ? roleColorVar(project.color) : "var(--vt-accent)";

  async function onStop() {
    if (!activeBandId || !entry) return;
    setBusy(true);
    try {
      await stopTimer(activeBandId, entry.id, entry.startTime);
      toast(`Gestoppt: ${formatDuration(Math.round(elapsed / 60000))} erfasst.`, "success");
    } catch (err) {
      toastError(err, "Der Timer konnte nicht gestoppt werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex items-center gap-3 rounded-md border px-3 py-1.5"
      style={{
        borderColor: `color-mix(in oklab, ${accent} 40%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${accent} 10%, transparent)`,
      }}
    >
      <span className="animate-live size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
      <span className="tabular font-mono text-sm font-semibold" style={{ color: accent }}>
        {formatClock(elapsed)}
      </span>
      <span className="text-muted min-w-0 flex-1 truncate text-sm">
        {timeEntryProjectName(entry.projectId, project)}
        {entry.description ? <span className="text-faint"> · {entry.description}</span> : null}
      </span>
      <Button size="sm" variant="secondary" onClick={() => void onStop()} loading={busy}>
        <Square className="size-3 fill-current" aria-hidden />
        Stopp
      </Button>
    </div>
  );
}
