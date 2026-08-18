---
date: 2026-08-14
tags: [time-entries, projects, labels, stats, optional-fk]
severity: medium
applies-to: [src/lib/projectLabel.ts, src/lib/stats.ts, src/types/models.ts, src/components/time/, src/components/timer/, src/app/(app)/time/, src/app/(app)/timetable/]
---

Also this session: expanded the existing "Time entries may have projectId: null" convention in `AGENTS.md` with null-vs-deleted and last-project sentinel gotchas (in place, no changelog).

Making a previously required foreign key optional (`TimeEntry.projectId: string | null`) is not the same as a missing lookup. Null means the user chose unassigned. A non-null id whose project document is gone means deleted. Collapsing both to "Gelöschtes Projekt" (or one stats slice) lies about the data.

This feature fixed that with:

- `timeEntryProjectName` in `src/lib/projectLabel.ts`: null -> "Ohne Projekt"; missing project -> "Gelöschtes Projekt".
- Picker copy "Kein Projekt" (action) vs list/filter/stats "Ohne Projekt" (state). Do not unify those strings casually.
- `totalsByProject`: null buckets under `UNASSIGNED_PROJECT_KEY`; orphans stay a separate "__deleted__" slice. Project card totals skip null so unassigned minutes do not inflate a project.

Next time:

- When a FK becomes optional, invent a distinct UI label and a stats/filter key for intentional none. Do not reuse the orphan/deleted fallback.
- Route every display site through one helper (`timeEntryProjectName`) so a leftover `project?.name ?? "Gelöschtes Projekt"` cannot reappear.
- Stats and project-scoped totals must treat null as its own bucket (or exclude it), never as an orphan id.
