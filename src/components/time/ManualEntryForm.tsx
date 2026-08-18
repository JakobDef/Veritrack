"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Field } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ProjectPicker } from "@/components/timer/ProjectPicker";
import { useLastProject } from "@/hooks/useLastProject";
import { createManualEntry, updateEntry } from "@/lib/data/timeEntries";
import { formatDateInput } from "@/lib/dates";
import {
  combineLocalDateTime,
  entryDescriptionError,
  entryRangeError,
  formatDuration,
  normalizeClockInput,
  toMinutes,
} from "@/lib/time";
import { UNASSIGNED_PROJECT_KEY, type Project, type TimeEntry } from "@/types/models";

type Draft = {
  projectId: string | null;
  date: string;
  start: string;
  end: string;
  description: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function defaultTimes(now: Date): Pick<Draft, "date" | "start" | "end"> {
  const end = new Date(now);
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 2 * 60 * 60 * 1000);
  // A window that crossed midnight would put "Von" later on today's clock than
  // "Bis", which the midnight-roll would then push into tomorrow. Clamp to
  // today's start instead so a new entry is always a valid past range.
  if (
    start.getDate() !== end.getDate() ||
    start.getMonth() !== end.getMonth() ||
    start.getFullYear() !== end.getFullYear()
  ) {
    start.setTime(end.getTime());
    start.setHours(0, 0, 0, 0);
  }
  return {
    date: formatDateInput(end),
    start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    end: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

function defaultNewProjectId(
  projects: Project[],
  lastProjectId: string | null | undefined,
): string | null {
  const trackable = projects.filter((p) => p.status !== "done");
  if (typeof lastProjectId === "string" && trackable.some((p) => p.id === lastProjectId)) {
    return lastProjectId;
  }
  if (lastProjectId === null) return null;
  return trackable[0]?.id ?? null;
}

function draftFrom(
  entry: TimeEntry | null,
  projects: Project[],
  lastProjectId: string | null | undefined,
): Draft {
  if (entry) {
    return {
      projectId: entry.projectId,
      date: formatDateInput(entry.startTime),
      start: `${pad(entry.startTime.getHours())}:${pad(entry.startTime.getMinutes())}`,
      end: entry.endTime
        ? `${pad(entry.endTime.getHours())}:${pad(entry.endTime.getMinutes())}`
        : "",
      description: entry.description,
    };
  }
  const times = defaultTimes(new Date());
  return {
    projectId: defaultNewProjectId(projects, lastProjectId),
    date: times.date,
    start: times.start,
    end: times.end,
    description: "",
  };
}

export function ManualEntryForm({
  open,
  onClose,
  bandId,
  userId,
  projects,
  entry,
  existingEntries,
}: {
  open: boolean;
  onClose: () => void;
  bandId: string;
  userId: string;
  projects: Project[];
  /** Null means "create a new retroactive entry". */
  entry: TimeEntry | null;
  /** The user's other entries, used for the overlap check. */
  existingEntries: TimeEntry[];
}) {
  const { lastProjectId } = useLastProject(bandId);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(entry, projects, lastProjectId));
  const [busy, setBusy] = useState(false);
  const { toast, toastError } = useToast();

  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = open
    ? entry
      ? entry.id
      : `new:${lastProjectId === undefined ? "" : lastProjectId === null ? UNASSIGNED_PROJECT_KEY : lastProjectId}`
    : null;
  if (seedKey !== seededFor) {
    setSeededFor(seedKey);
    if (seedKey) setDraft(draftFrom(entry, projects, lastProjectId));
  }

  const startAt = combineLocalDateTime(draft.date, draft.start);
  let endAt = combineLocalDateTime(draft.date, draft.end);
  // A gig from 22:00 to 01:00 is one entry that runs past midnight, not a
  // negative duration. Roll the end into the next day when it PRECEDES the
  // start; a strict comparison matters, because rolling over on equality would
  // silently turn "19:00 to 19:00" into a 24-hour entry instead of hitting the
  // zero-length check below. addDays rather than +24h so the roll stays correct
  // across a DST boundary.
  if (startAt && endAt && endAt.getTime() < startAt.getTime()) {
    endAt = addDays(endAt, 1);
  }

  const minutes = startAt && endAt ? toMinutes(startAt, endAt) : 0;

  /**
   * Overlap check against the caller's other entries.
   *
   * A still-running entry counts too, treated as ending now, otherwise a
   * retroactive entry could be dropped on top of the timer that is ticking
   * right this moment. Scope caveat: `existingEntries` is whatever range the
   * history page currently shows, so an overlap with something outside the
   * visible week or month is not caught here. The server does not enforce
   * uniqueness either; this is a guard rail, not an invariant.
   */
  const overlap =
    startAt && endAt
      ? existingEntries.find((other) => {
          if (other.id === entry?.id) return false;
          const otherEnd = other.endTime ?? new Date();
          return other.startTime.getTime() < endAt!.getTime() && startAt.getTime() < otherEnd.getTime();
        })
      : undefined;

  const rangeError = startAt && endAt ? entryRangeError(startAt, endAt) : null;
  const descriptionError = entryDescriptionError(draft.description);

  const error = !startAt || !endAt
    ? "Bitte gib Start und Ende an."
    : rangeError
      ? rangeError
      : descriptionError
        ? descriptionError
        : overlap
          ? "In diesem Zeitraum ist bereits ein Eintrag erfasst."
          : null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (error || !startAt || !endAt) return;
    setBusy(true);
    try {
      if (entry) {
        await updateEntry(bandId, entry.id, {
          projectId: draft.projectId,
          description: draft.description,
          startTime: startAt,
          endTime: endAt,
        });
        toast("Eintrag aktualisiert.", "success");
      } else {
        await createManualEntry(bandId, userId, {
          projectId: draft.projectId,
          description: draft.description,
          startTime: startAt,
          endTime: endAt,
        });
        toast(`${formatDuration(minutes)} nachgetragen.`, "success");
      }
      onClose();
    } catch (err) {
      toastError(err, "Der Eintrag konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={entry ? "Eintrag bearbeiten" : "Zeit nachtragen"}
      description={
        entry ? undefined : "Für Proben und Auftritte, bei denen niemand an den Timer gedacht hat."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="manual-entry-form"
            loading={busy}
            disabled={!!error}
          >
            {entry ? "Speichern" : "Eintragen"}
          </Button>
        </>
      }
    >
      <form id="manual-entry-form" className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Field label="Projekt">
          <ProjectPicker
            projects={projects}
            value={draft.projectId}
            onChange={(projectId) => setDraft((d) => ({ ...d, projectId }))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Datum"
            type="date"
            required
            value={draft.date}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          />
          <Input
            label="Von"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="tabular font-mono"
            placeholder="07:00"
            hint="24 Stunden"
            required
            value={draft.start}
            onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
            onBlur={() => {
              const next = normalizeClockInput(draft.start);
              if (next) setDraft((d) => ({ ...d, start: next }));
            }}
          />
          <Input
            label="Bis"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="tabular font-mono"
            placeholder="09:00"
            hint="24 Stunden"
            required
            value={draft.end}
            onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
            onBlur={() => {
              const next = normalizeClockInput(draft.end);
              if (next) setDraft((d) => ({ ...d, end: next }));
            }}
          />
        </div>

        <div className="bg-surface-2 flex items-center justify-between rounded-md px-3 py-2 text-sm">
          <span className="text-muted">Dauer</span>
          <span className="tabular font-mono font-semibold">{formatDuration(minutes)}</span>
        </div>

        <Textarea
          label="Beschreibung"
          required
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="Probe im Proberaum"
        />

        {error ? (
          <p role="alert" className="bg-danger-soft text-danger rounded-md px-3 py-2 text-sm">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
