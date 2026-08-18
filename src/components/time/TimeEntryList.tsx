"use client";

import { useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { bucketByLocalDay, formatDayLabel } from "@/lib/dates";
import { formatDuration, formatTimeOfDay } from "@/lib/time";
import { timeEntryProjectName } from "@/lib/projectLabel";
import { roleColorVar } from "@/lib/roleColors";
import type { BandMember, Project, TimeEntry } from "@/types/models";

/**
 * Entries grouped by their local start day, newest day first, with a per-day
 * total. Grouping matches `bucketByLocalDay`, so the totals here always agree
 * with the timetable.
 */
export function TimeEntryList({
  entries,
  projectsById,
  membersById,
  showOwner = false,
  canEdit,
  onEdit,
  onDelete,
}: {
  entries: TimeEntry[];
  projectsById: Map<string, Project>;
  membersById?: Map<string, BandMember>;
  showOwner?: boolean;
  canEdit: (entry: TimeEntry) => boolean;
  onEdit: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}) {
  const days = useMemo(() => {
    const buckets = bucketByLocalDay(entries);
    return [...buckets.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, items]) => ({
        key,
        date: items[0]!.startTime,
        items: [...items].sort((a, b) => b.startTime.getTime() - a.startTime.getTime()),
        total: items.reduce((sum, item) => sum + (item.duration ?? 0), 0),
      }));
  }, [entries]);

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => (
        <section key={day.key} className="flex flex-col gap-1">
          <header className="border-border flex items-baseline justify-between border-b pb-1.5">
            <h3 className="text-sm font-semibold">{formatDayLabel(day.date)}</h3>
            <span className="tabular text-muted font-mono text-xs">{formatDuration(day.total)}</span>
          </header>

          <ul>
            {day.items.map((entry) => {
              const project = entry.projectId ? projectsById.get(entry.projectId) : undefined;
              const owner = membersById?.get(entry.userId);
              const running = entry.endTime === null;
              const editable = canEdit(entry);
              return (
                <li
                  key={entry.id}
                  className="group hover:bg-surface-2 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: roleColorVar(project?.color) }}
                  />

                  {showOwner && owner ? (
                    <Avatar
                      name={owner.displayName}
                      src={owner.photoURL}
                      color={roleColorVar(owner.roleColor)}
                      size="sm"
                    />
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {timeEntryProjectName(entry.projectId, project)}
                    </p>
                    <p className="text-muted truncate text-xs">
                      {formatTimeOfDay(entry.startTime)}
                      {entry.endTime ? ` - ${formatTimeOfDay(entry.endTime)}` : " - läuft"}
                      {entry.description ? ` · ${entry.description}` : ""}
                      {showOwner && owner ? ` · ${owner.displayName}` : ""}
                    </p>
                  </div>

                  {running ? (
                    <Badge tone="accent">läuft</Badge>
                  ) : (
                    <>
                      {entry.payoutId ? (
                        <Badge tone="neutral">Bezahlt</Badge>
                      ) : null}
                      <span className="tabular shrink-0 font-mono text-sm font-medium">
                        {formatDuration(entry.duration)}
                      </span>
                    </>
                  )}

                  <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                    {editable && !running ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Eintrag bearbeiten"
                        onClick={() => onEdit(entry)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                    ) : null}
                    {editable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Eintrag löschen"
                        className="hover:text-danger"
                        onClick={() => onDelete(entry)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
