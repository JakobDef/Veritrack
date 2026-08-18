import { dayKey } from "./dates";
import {
  UNASSIGNED_PROJECT_KEY,
  UNASSIGNED_PROJECT_LABEL,
  type BandMember,
  type Project,
  type Task,
  type TimeEntry,
} from "@/types/models";

/**
 * Pure aggregation over plain arrays. Nothing here touches Firestore, React or
 * the clock, which is what makes every function directly testable and lets the
 * charts stay dumb renderers.
 *
 * A running entry has `duration === null`. It is counted as zero everywhere
 * rather than being estimated from "now": statistics that shift while you look
 * at them are worse than statistics that lag by one timer.
 */

export type Slice = {
  id: string;
  label: string;
  color: string;
  minutes: number;
};

function minutesOf(entry: TimeEntry): number {
  return entry.duration ?? 0;
}

function sortDesc(slices: Slice[]): Slice[] {
  return [...slices].sort((a, b) => b.minutes - a.minutes);
}

export function totalMinutes(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + minutesOf(entry), 0);
}

/** One slice per member who tracked anything; members at zero are dropped. */
export function totalsByMember(
  entries: TimeEntry[],
  members: Pick<BandMember, "id" | "displayName" | "roleColor">[],
  resolveColor: (key: string) => string,
): Slice[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.userId, (totals.get(entry.userId) ?? 0) + minutesOf(entry));
  }
  const slices = members
    .map((member) => ({
      id: member.id,
      label: member.displayName,
      color: resolveColor(member.roleColor),
      minutes: totals.get(member.id) ?? 0,
    }))
    .filter((slice) => slice.minutes > 0);
  return sortDesc(slices);
}

export function totalsByProject(
  entries: TimeEntry[],
  projects: Pick<Project, "id" | "name" | "color">[],
  resolveColor: (key: string) => string,
): Slice[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const id = entry.projectId ?? UNASSIGNED_PROJECT_KEY;
    totals.set(id, (totals.get(id) ?? 0) + minutesOf(entry));
  }
  const slices = projects
    .map((project) => ({
      id: project.id,
      label: project.name,
      color: resolveColor(project.color),
      minutes: totals.get(project.id) ?? 0,
    }))
    .filter((slice) => slice.minutes > 0);

  const unassigned = totals.get(UNASSIGNED_PROJECT_KEY) ?? 0;
  if (unassigned > 0) {
    slices.push({
      id: UNASSIGNED_PROJECT_KEY,
      label: UNASSIGNED_PROJECT_LABEL,
      color: "var(--vt-muted)",
      minutes: unassigned,
    });
  }

  // Time booked on a since-deleted project would otherwise silently vanish from
  // the totals, making the pie disagree with the headline number. Unassigned is
  // a real bucket, not an orphan.
  const known = new Set(projects.map((p) => p.id));
  const orphaned = [...totals.entries()]
    .filter(([id]) => id !== UNASSIGNED_PROJECT_KEY && !known.has(id))
    .reduce((sum, [, minutes]) => sum + minutes, 0);
  if (orphaned > 0) {
    slices.push({
      id: "__deleted__",
      label: "Gelöschte Projekte",
      color: "var(--vt-faint)",
      minutes: orphaned,
    });
  }

  return sortDesc(slices);
}

/**
 * Grouped by the *functional* role ("Gitarre"), which is informational only.
 * Members without a role are collected under one bucket rather than dropped.
 */
export function totalsByFunctionalRole(
  entries: TimeEntry[],
  members: Pick<BandMember, "id" | "role" | "roleColor">[],
  resolveColor: (key: string) => string,
): Slice[] {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const totals = new Map<string, { minutes: number; colorKey: string }>();

  for (const entry of entries) {
    const member = memberById.get(entry.userId);
    const role = member?.role?.trim() || "Ohne Rolle";
    const current = totals.get(role);
    if (current) current.minutes += minutesOf(entry);
    else totals.set(role, { minutes: minutesOf(entry), colorKey: member?.roleColor ?? "" });
  }

  return sortDesc(
    [...totals.entries()]
      .map(([role, { minutes, colorKey }]) => ({
        id: role,
        label: role,
        color: resolveColor(colorKey),
        minutes,
      }))
      .filter((slice) => slice.minutes > 0),
  );
}

export type DayPoint = { day: string; label: string; minutes: number };

/**
 * One point per day across the whole range, including days with no entries, so
 * the line chart shows real gaps instead of joining distant points.
 */
export function seriesByDay(entries: TimeEntry[], days: Date[]): DayPoint[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const key = dayKey(entry.startTime);
    totals.set(key, (totals.get(key) ?? 0) + minutesOf(entry));
  }
  return days.map((day) => {
    const key = dayKey(day);
    return {
      day: key,
      label: `${day.getDate()}.${day.getMonth() + 1}.`,
      minutes: totals.get(key) ?? 0,
    };
  });
}

export type ProjectProgress = {
  id: string;
  label: string;
  color: string;
  done: number;
  open: number;
  total: number;
  percent: number;
};

export function projectProgress(
  tasks: Pick<Task, "projectId" | "status">[],
  projects: Pick<Project, "id" | "name" | "color">[],
  resolveColor: (key: string) => string,
): ProjectProgress[] {
  return projects
    .map((project) => {
      const own = tasks.filter((task) => task.projectId === project.id);
      const done = own.filter((task) => task.status === "done").length;
      const total = own.length;
      return {
        id: project.id,
        label: project.name,
        color: resolveColor(project.color),
        done,
        open: total - done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    })
    .filter((progress) => progress.total > 0);
}

/** Percentage change against the previous period; null when there is no baseline. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
