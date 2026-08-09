"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { ProjectPicker } from "./ProjectPicker";
import { useAuth } from "@/providers/AuthProvider";
import { useBand } from "@/providers/BandProvider";
import { useProjects } from "@/hooks/useProjects";
import { useLastProject } from "@/hooks/useLastProject";
import { useRunningTimer } from "@/hooks/useRunningTimer";
import { cancelTimer, startTimer, stopTimer } from "@/lib/data/timeEntries";
import { formatClock, formatDuration, formatTimeOfDay } from "@/lib/time";
import { roleColorVar } from "@/lib/roleColors";
import { cn } from "@/lib/cn";

/**
 * The one thing this app is about: start tracking in a single click.
 *
 * Design contract, do not erode it. Idle state shows the last used project
 * already selected and one prominent Start button. The description is optional
 * and stays editable while the timer runs, so nothing blocks the click.
 */
export function TimerHero() {
  const { user } = useAuth();
  const { activeBandId, can } = useBand();
  const { projects, byId, loading: projectsLoading } = useProjects(activeBandId);
  const { lastProjectId, remember } = useLastProject(activeBandId);
  const { entry, elapsed, loading: timerLoading } = useRunningTimer(activeBandId, user?.uid ?? null);
  const { toastError, toast } = useToast();
  const router = useRouter();

  const [chosenProjectId, setChosenProjectId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const trackable = useMemo(() => projects.filter((p) => p.status !== "done"), [projects]);

  /**
   * Derived, not stored in an effect. The selection falls back through: what the
   * user just picked -> what they tracked last time -> the first active project.
   * That fallback chain is what makes Start a single click on a normal day, and
   * deriving it means the picker is never briefly empty on first paint.
   */
  const has = (id: string | null) => !!id && trackable.some((p) => p.id === id);
  const selectedProjectId =
    (has(chosenProjectId) ? chosenProjectId : null) ??
    (has(lastProjectId) ? lastProjectId : null) ??
    trackable[0]?.id ??
    null;

  const runningProject = entry ? byId.get(entry.projectId) : null;
  const accent = runningProject ? roleColorVar(runningProject.color) : "var(--vt-accent)";

  async function onStart() {
    if (!user || !activeBandId || !selectedProjectId) return;
    setBusy(true);
    try {
      await startTimer(activeBandId, user.uid, {
        projectId: selectedProjectId,
        description,
      });
      remember(selectedProjectId);
      setDescription("");
    } catch (err) {
      toastError(err, "Der Timer konnte nicht gestartet werden.");
    } finally {
      setBusy(false);
    }
  }

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

  async function onDiscard() {
    if (!activeBandId || !entry) return;
    setBusy(true);
    try {
      await cancelTimer(activeBandId, entry.id);
      toast("Eintrag verworfen.", "info");
    } catch (err) {
      toastError(err, "Der Eintrag konnte nicht verworfen werden.");
    } finally {
      setBusy(false);
    }
  }

  if (projectsLoading || timerLoading) {
    return <Skeleton className="h-52 w-full rounded-lg" />;
  }

  if (!can.trackTime) {
    return (
      <section className="border-border bg-surface rounded-lg border p-6">
        <p className="text-muted text-sm">
          Du bist als Betrachter in dieser Band und kannst keine Zeit erfassen. Ein Admin kann das
          ändern.
        </p>
      </section>
    );
  }

  if (trackable.length === 0) {
    return (
      <section className="border-border bg-surface flex flex-col items-start gap-4 rounded-lg border p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Erst ein Projekt, dann läuft die Uhr</h2>
          <p className="text-muted text-sm">
            {can.createProject
              ? "Zeit wird immer auf ein Projekt gebucht. Leg eines an, danach reicht ein Klick."
              : "Zeit wird immer auf ein Projekt gebucht. Bitte einen Admin, eines anzulegen."}
          </p>
        </div>
        {can.createProject ? (
          <Button variant="primary" size="lg" onClick={() => router.push("/projects?new=1")}>
            <FolderPlus className="size-4" aria-hidden />
            Projekt anlegen
          </Button>
        ) : null}
      </section>
    );
  }

  const running = entry !== null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-lg border p-6 transition-shadow duration-300 sm:p-7",
        running ? "border-transparent shadow-glow" : "border-border bg-surface",
      )}
      style={
        running
          ? {
              backgroundColor: `color-mix(in oklab, ${accent} 8%, var(--vt-surface))`,
              boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 45%, transparent), 0 14px 40px -12px color-mix(in oklab, ${accent} 40%, transparent)`,
            }
          : undefined
      }
    >
      {running ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ backgroundColor: accent }}
        />
      ) : null}

      {running && entry ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase" style={{ color: accent }}>
              <span
                className="animate-live size-2 rounded-full"
                style={{ backgroundColor: accent }}
              />
              Läuft
            </span>
            <span className="text-muted text-xs">seit {formatTimeOfDay(entry.startTime)}</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex min-w-0 flex-col gap-1">
              <p
                className="tabular font-mono text-5xl leading-none font-semibold sm:text-6xl"
                style={{ color: accent }}
                aria-live="off"
              >
                {formatClock(elapsed)}
              </p>
              <p className="text-muted truncate text-sm">
                {runningProject?.name ?? "Unbekanntes Projekt"}
                {entry.description ? ` · ${entry.description}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                iconOnly
                onClick={() => void onDiscard()}
                disabled={busy}
                aria-label="Eintrag verwerfen"
                title="Verwerfen, ohne zu speichern"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
              <Button variant="primary" size="lg" onClick={() => void onStop()} loading={busy}>
                <Square className="size-4 fill-current" aria-hidden />
                Stoppen
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Woran arbeitest du?</h2>
            <p className="text-muted text-sm">Projekt wählen, Start drücken. Mehr nicht.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ProjectPicker
              projects={trackable}
              value={selectedProjectId}
              onChange={setChosenProjectId}
              className="sm:w-64"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedProjectId) void onStart();
              }}
              placeholder="Woran genau? (optional)"
              aria-label="Beschreibung, optional"
              className="border-border bg-surface placeholder:text-faint hover:border-border-strong focus:border-accent focus:ring-accent/25 h-11 min-w-0 flex-1 rounded-md border px-3 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
            <Button
              variant="primary"
              size="lg"
              onClick={() => void onStart()}
              loading={busy}
              disabled={!selectedProjectId}
              className="sm:px-8"
            >
              <Play className="size-4 fill-current" aria-hidden />
              Start
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
