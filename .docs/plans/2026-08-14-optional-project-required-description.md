---
status: done
created: 2026-08-14
updated: 2026-08-14
base: 3b41ca20d7fd80b7ff2dba6659f572b126d09ad8
goal: Make time-entry project optional (null = unassigned) and description mandatory, without adding avoidable friction to the dashboard timer.
---

# Goal

Make time-entry project optional (null = unassigned) and description mandatory, without adding avoidable friction to the dashboard timer.

# Inputs

Rules consulted (all of `.docs/rules/`):

- `.docs/rules/plan-execution.md` - plan format, checkbox protocol, resume protocol.
- `.docs/rules/verification.md` - typecheck, lint, build, unit tests, rules tests, in that order. Run the fast three after each code-changing task; all five before calling a milestone done.
- `.docs/rules/firestore-rules-changes.md` - this plan does **not** edit `firestore.rules` or `src/lib/permissions.ts`. Create already allows any payload as long as `userId == auth.uid` and `canWrite`. That already permits missing/null `projectId`. Do not add field-shape checks here: they would be a new security surface, need sequence tests, and would risk breaking updates of old empty-description entries. Do not weaken rules.
- `.docs/rules/docs-current-state-only.md` - `AGENTS.md` gets an in-place conventions edit (project optional, description required). No changelog block. Key-paths cells stay one short phrase.
- `.docs/rules/agent-docs-sync.md` - no `.claude/agents/` files change.

Learnings consulted:

- `.docs/learnings/2026-08-14-datetime-string-is-not-local.md` - `ManualEntryForm` already uses `combineLocalDateTime` / `entryRangeError`. Do not reintroduce `new Date("YYYY-MM-DDTHH:mm")`. Keep the last-two-hours default. Put the new description check in the same shared-predicate pattern as `entryRangeError` (inline form error plus write-path throw).
- `.docs/learnings/2026-08-14-firestore-error-looks-like-empty.md` - Zeiten already branches on `error` vs empty. Filters stay in-memory. Do not add a Firestore `where("projectId", "==", ...)` (would need a new composite index; user parked index deploy).
- `.docs/learnings/2026-08-09-defects-only-the-browser-found.md` - unit tests cannot see timer layout, autofocus, or calendar color. Budget a browser walkthrough of start/stop (with and without project) plus Zeiten/Timetable/Stats before calling the last milestone done.
- `.docs/learnings/2026-08-09-firestore-emulator-blind-spots.md` - no new time-entry query shapes, so `firestore.indexes.json` stays untouched.
- `.docs/learnings/2026-08-09-react-compiler-lint-setstate-in-effect.md` - keep the timer selection derived (no `useEffect` to sync last-project into state). `useLastProject` stays on `useLocalStorage` / `useSyncExternalStore`.

Product constraints from `AGENTS.md`:

- Dashboard timer is the centre of gravity. Extra clicks besides the new required description are a regression.
- Dates are local-time throughout.
- Reads through converters, writes through `withConverter(null)`.
- Firebase client SDK only.
- Leave Firebase index deploy and `.env` emulator issues alone.

Working tree note: HEAD is `3b41ca20d7fd80b7ff2dba6659f572b126d09ad8`. Uncommitted datetime and Zeiten-error work already touches `ManualEntryForm.tsx`, `src/lib/time.ts`, `src/lib/data/timeEntries.ts`, and the Zeiten page. Implement on top of that work; do not revert it.

# Affected files

Paths relative to the repo root.

## Model, writes, helpers

| Path | Change |
|------|--------|
| `src/types/models.ts` | `TimeEntry.projectId: string \| null`. Add `UNASSIGNED_PROJECT_LABEL` (`"Ohne Projekt"`), `UNASSIGNED_PROJECT_PICKER_LABEL` (`"Kein Projekt"`), `DELETED_PROJECT_LABEL` (`"Gelöschtes Projekt"`), `UNASSIGNED_PROJECT_KEY` (`"__unassigned__"`). |
| `src/lib/firebase/converters.ts` | `timeEntryConverter`: `projectId` via a helper that returns `null` for missing, `null`, or empty string, and the string otherwise. Keep `taskId` as today (`strOrNull`). |
| `src/lib/time.ts` | Add `entryDescriptionError(description: string): string \| null` (trim empty -> `"Bitte beschreibe, woran du arbeitest."`). Same shared-predicate pattern as `entryRangeError`. |
| `src/lib/projectLabel.ts` | **New.** `timeEntryProjectName(projectId, project)`: null id -> `UNASSIGNED_PROJECT_LABEL`; missing project -> `DELETED_PROJECT_LABEL`; else `project.name`. |
| `src/lib/data/timeEntries.ts` | `startTimer` / `createManualEntry`: `projectId: string \| null`; drop the "Bitte wähle zuerst ein Projekt." throw; reject via `entryDescriptionError` (throw `TimeEntryError`). Write `projectId: input.projectId` (explicit `null`, never omit). `updateEntry`: same description check when `description` is in the payload; allow `projectId: null`. Trim description before write. |
| `src/hooks/useLastProject.ts` | Persist "none" as `UNASSIGNED_PROJECT_KEY` instead of `localStorage.removeItem`. Missing key still means "not remembered". Return type must distinguish not-remembered vs remembered-none (see M2). |

## Timer (centrepiece)

| Path | Change |
|------|--------|
| `src/components/timer/ProjectPicker.tsx` | Add a first option "Kein Projekt" (muted/faint dot, not a role color). `onChange: (projectId: string \| null) => void`. Stay enabled when `projects.length === 0`. Keyboard list includes the none row at index 0. |
| `src/components/timer/TimerHero.tsx` | Description required; project optional. Remove the `trackable.length === 0` dead-end. Autofocus description. Start disabled only when description is blank (whitespace). Remember last project including none. Copy in German (see M2). Running state: `timeEntryProjectName` instead of `"Unbekanntes Projekt"`. Accent for a running unassigned timer stays `var(--vt-accent)` (already the fallback when `runningProject` is missing). |
| `src/components/timer/RunningTimerBar.tsx` | Label via `timeEntryProjectName`. Keep accent fallback `var(--vt-accent)` when there is no project (live bar, not a list spine). |
| `src/components/timer/TeamActivity.tsx` | Subtitle via `timeEntryProjectName` instead of `"Projekt"`. |

## Manual entry and lists

| Path | Change |
|------|--------|
| `src/components/time/ManualEntryForm.tsx` | Project optional (no "Bitte wähle ein Projekt."). Description required via `entryDescriptionError` in the same `error` chain as `entryRangeError`. `Textarea` `required`, drop "Optional." hint. Projekt `Field` not required. New-entry default project: last remembered project (including none), else first trackable, else null. Do not default a new entry to `projects[0]` when the user last tracked unassigned. Keep `combineLocalDateTime` and last-two-hours defaults. |
| `src/components/time/TimeEntryList.tsx` | Title and color spine: null project -> "Ohne Projekt" and `var(--vt-faint)` / `roleColorVar(undefined)`; orphaned id still "Gelöschtes Projekt". Use `timeEntryProjectName`. Guard `projectsById.get` so it is not called with `null`. |
| `src/app/(app)/time/page.tsx` | Project `<select>`: option `UNASSIGNED_PROJECT_KEY` labelled "Ohne Projekt". Filter: that key matches `entry.projectId === null`. Delete-confirm copy uses `timeEntryProjectName`. Keep the `error` vs empty EmptyState split. |
| `src/app/(app)/dashboard/page.tsx` | "Zuletzt erfasst" uses `timeEntryProjectName` (not "Gelöschtes Projekt" for null). Open-tasks row is unchanged (tasks always have a project). Heute/Woche nuggets stay band-user totals including unassigned. |
| `src/app/(app)/timetable/page.tsx` | Same filter option and match as Zeiten. `projectName` via `timeEntryProjectName`. When `colorMode === "project"`, unassigned blocks use `var(--vt-faint)` (already `roleColorVar(undefined)`). Legend includes "Ohne Projekt" when any visible entry has `projectId === null`. |

## Stats and project totals

| Path | Change |
|------|--------|
| `src/lib/stats.ts` | `totalsByProject`: bucket `projectId === null` as id `UNASSIGNED_PROJECT_KEY`, label `UNASSIGNED_PROJECT_LABEL`, color `var(--vt-muted)`. Orphans (non-null id not in `projects`) stay `"Gelöschte Projekte"` / `var(--vt-faint)` / id `"__deleted__"`. Do not merge the two. `totalMinutes` already sums all entries; leave it. |
| `src/app/(app)/projects/page.tsx` | `minutesByProject`: skip `entry.projectId == null` so unassigned time does not inflate any card. |
| `src/app/(app)/projects/[projectId]/page.tsx` | Keep `entry.projectId === projectId` for `trackedMinutes` (null never matches). `onStart`: open a small dialog that requires a trimmed description, then call `startTimer` with that text and the page's `projectId`. Do not use the project name as a silent description. |
| `src/components/tasks/KanbanBoard.tsx` | No behavior change if `startTimer` accepts optional project and required description: it already sends `projectId` plus `task.title`. Confirm types compile. |

## Tests and docs

| Path | Change |
|------|--------|
| `tests/unit/time.test.ts` | Cases for `entryDescriptionError`: empty, whitespace, real text. |
| `tests/unit/stats.test.ts` | `totalsByProject` with `projectId: null` -> "Ohne Projekt"; mix of null and `"gone"` stays two slices; helper `entry()` allows `projectId: string \| null`. |
| `tests/rules/firestore.rules.test.ts` | No new assertions required if rules are unchanged. Do not start requiring description in seeded docs. |
| `AGENTS.md` | In-place conventions: time entries may have `projectId: null`; description must be trimmed non-empty. Soften "one-click" in the product sentence so it does not claim Start works with an empty description. No changelog. |

Not touched: `firestore.rules`, `firestore.indexes.json`, `src/lib/permissions.ts`, `.env*`, index deploy.

# Risks / Unknowns

- **Required description vs one-click.** Start cannot fire on an empty description. That is an intentional extra keystroke versus today. Mitigation: autofocus the description field, keep last project (including none) preselected, Enter in the field starts. Do not remember last description (stale text would be wrong more often than helpful).
- **`useLastProject` currently treats `null` as "clear storage".** After this change, clearing storage would fall back to the first project and undo "Kein Projekt". Must persist a sentinel (`UNASSIGNED_PROJECT_KEY`). Unknown: existing stored values are real project ids or missing; no migration needed.
- **`Map<string, Project>.get(entry.projectId)` becomes a type error** when `projectId` is `string | null`. Every call site must branch. Easy to miss one; `npm run typecheck` is the net.
- **Converter `str(d.projectId)` today turns null into `""`.** If any UI treated empty string as a missing project, swapping to `null` is the correct read. Empty-string projectIds in the wild are not expected (writes always sent a real id).
- **Project-page "Timer starten"** has no description field. Decision (user, 2026-08-14): prompt for a description in a dialog before start. Do not silently use the project name. Kanban still uses `task.title` (one-click).
- **Rules will still allow empty description and any projectId shape.** Enforcement is client-only. Accepted for this plan so we do not open a rules-change protocol or lock old empty entries out of updates.
- **Uncommitted datetime / Zeiten-error work** sits on the same files. Implementer must not revert those fixes.
- **No new Firestore query on `projectId`.** Filtering is in memory. A later "query unassigned only" would need an index; out of scope.

# Done criteria

- A member can start a dashboard timer with project = none and a non-empty description.
- Start is disabled (and `startTimer` throws) when the description is empty or whitespace.
- A member can start with a project selected, same as today, after typing a description.
- Last project, including "Kein Projekt", is restored on reload. Description field starts empty.
- With zero projects in the band, the hero still offers Start (description only). The old "Erst ein Projekt, dann läuft die Uhr" screen is gone.
- Manual create and edit: project optional, description required, range checks unchanged and still local-time.
- Lists, dashboard recent, running bar, team activity, timetable, delete-confirm: null project shows "Ohne Projekt"; a leftover id whose project was deleted still shows "Gelöschtes Projekt".
- Zeiten and timetable filters include "Ohne Projekt" and actually show only unassigned rows.
- Stats pie: "Ohne Projekt" is a distinct slice from "Gelöschte Projekte". Headline totals still include unassigned.
- Project cards and project-detail totals do not include unassigned minutes. Dashboard Heute/Woche do.
- Project-detail "Timer starten" opens a short description dialog, then starts with that text and the page project.
- Kanban "start timer from task" still one-clicks with `projectId` + `task.title`.
- `timeEntryConverter` reads old string `projectId` and new null. No backfill.
- `firestore.rules` and indexes unchanged. `npm run typecheck`, `lint`, `build`, `test` pass. `test:rules` still passes (no rules edit).
- Browser: start with project, start without, reject blank description, nachtragen without project, filter Ohne Projekt, stats slice visible.

# Milestones

## M1: Model, converter, write validation

Outcome: `TimeEntry.projectId` is `string | null`; writes require a trimmed description; old docs still read.

- [x] Change `TimeEntry.projectId` to `string | null` in `src/types/models.ts`. Add the four label/key constants listed under Affected files (`UNASSIGNED_PROJECT_LABEL` = "Ohne Projekt", picker = "Kein Projekt", deleted = "Gelöschtes Projekt", key = `"__unassigned__"`).
- [x] Add `src/lib/projectLabel.ts` with `timeEntryProjectName(projectId: string | null, project: { name: string } | undefined): string`.
- [x] Add `entryDescriptionError` to `src/lib/time.ts`. Empty and whitespace-only return `"Bitte beschreibe, woran du arbeitest."`; otherwise null. Add tests in `tests/unit/time.test.ts`.
- [x] In `timeEntryConverter.fromFirestore`, parse `projectId` as: non-empty string stays; missing, `null`, or `""` become `null`. Do not use `str()` (that would turn null into `""`).
- [x] Update `startTimer`, `createManualEntry`, and `updateEntry` in `src/lib/data/timeEntries.ts`: `projectId: string | null`; remove the project-required throw; if `entryDescriptionError` is non-null, throw `TimeEntryError` with that message (`updateEntry` only when `description` is present in the payload). Write `projectId` as `null` or the string through `withConverter(null)`.
- [x] Run `npm run typecheck`. Expect errors at UI call sites; that is the punch list for M2-M5, not a reason to widen types with assertions.

## M2: Dashboard timer and project picker

Outcome: description is the only Start gate; project has an explicit none option; last none is remembered; zero projects is still trackable.

- [x] Extend `ProjectPicker` with a leading "Kein Projekt" row (faint/muted dot, `UNASSIGNED_PROJECT_PICKER_LABEL`). `onChange` receives `string | null`. Include that row in arrow-key navigation. Do not disable the control when `projects` is empty. `TimerHero` and `ManualEntryForm` are the only callers (confirmed).
- [x] Change `useLastProject` so `remember(null)` writes `UNASSIGNED_PROJECT_KEY` rather than deleting the key. Missing key = not remembered. Expose something the hero can branch on (for example `lastProjectId: string | null` plus `hasRemembered: boolean`, or `lastProjectId: string | null | undefined` where `undefined` means missing). Do not add a `useEffect` to copy storage into React state.
- [x] Rewrite idle `TimerHero` selection as derived state: explicit picker choice (including null) wins; else remembered project if it is still trackable; else remembered none; else first trackable; else null. `chosen` needs an "untouched" state (`undefined`) so "user picked none" is not the same as "not yet picked".
- [x] Idle UI: autofocus the description `<input>` (`autoFocus`, no effect). Placeholder and `aria-label` in German, required (example placeholder: `"Woran arbeitest du?"`). Subtitle no longer says project is required (example: `"Beschreiben, Start drücken. Projekt ist optional."`). Start `disabled` when `!description.trim()`. Enter starts when description is non-empty, even if project is null. After a successful start, `remember(selectedProjectId)` (null included) and clear the description field.
- [x] Delete the `trackable.length === 0` early return ("Erst ein Projekt, dann läuft die Uhr"). Viewers still see the existing `!can.trackTime` panel.
- [x] Running hero line uses `timeEntryProjectName`. Keep live accent as project color or `var(--vt-accent)` for unassigned.
- [x] Update the file-level comment: description is required; project is optional; the remaining one-gesture path is type-then-Enter with last project preselected.

## M3: Manual entry

Outcome: nachtragen/edit works without a project and refuses a blank description, with the error inline (not only as a toast).

- [x] `ManualEntryForm` `error` chain: drop the `!draft.projectId` branch; add `entryDescriptionError(draft.description)` next to `entryRangeError`. Submit still blocked by `disabled={!!error}`.
- [x] Projekt field not required. Beschreibung `Textarea` `required`, no "Optional." hint.
- [x] New-entry `draftFrom`: default `projectId` from `useLastProject` (same remember rules as the hero), not blindly `projects[0]`. Editing an existing entry keeps its `projectId` (including null).
- [x] `onSubmit` may pass `projectId: null` into `createManualEntry` / `updateEntry`. Do not change date/time handling.

## M4: Labels on every time surface

Outcome: null and deleted are never confused in the UI.

- [x] Replace every `project?.name ?? "Gelöschtes Projekt"` / `"Unbekanntes Projekt"` / `"Projekt"` fallback on **time entries** with `timeEntryProjectName`. Call sites: `TimeEntryList.tsx`, `dashboard/page.tsx` (recent list only), `RunningTimerBar.tsx`, `TeamActivity.tsx`, `timetable/page.tsx` (`projectName`), `time/page.tsx` delete-confirm. Do not change task or generic EmptyState copy.
- [x] `projectsById.get(...)` only with a string id. Color spine for unassigned list rows: `roleColorVar(undefined)` (`var(--vt-faint)`). Running bar / hero live glow stays accent when unassigned.

## M5: Filters, stats, project totals

Outcome: unassigned time is filterable and charted, and does not leak into a project.

- [x] Zeiten and timetable `<select>`: after "Alle Projekte", add `<option value={UNASSIGNED_PROJECT_KEY}>Ohne Projekt</option>`. Filter: `projectFilter === UNASSIGNED_PROJECT_KEY` matches `entry.projectId === null`; a real id matches equality; `"all"` unchanged.
- [x] Timetable project-color legend: append Ohne Projekt (`var(--vt-faint)` or `var(--vt-muted)`) when the decorated set contains a null `projectId`.
- [x] `totalsByProject` in `src/lib/stats.ts`: null ids accumulate under `UNASSIGNED_PROJECT_KEY` / "Ohne Projekt" / `var(--vt-muted)`. Deleted-orphan logic ignores that key and ignores null. Add tests in `tests/unit/stats.test.ts` (null only; null plus `"gone"`; existing deleted-only case still green). Widen the `entry()` helper so `projectId` may be null.
- [x] `projects/page.tsx` `minutesByProject`: `if (entry.projectId == null) continue`.
- [x] Confirm `projects/[projectId]/page.tsx` `trackedMinutes` filter still uses `=== projectId` (null excluded).

## M6: Secondary start paths

Outcome: Kanban stays one-click; project-detail asks for a description before start.

- [x] `KanbanBoard.handleStartTimer`: keep passing `projectId`, `taskId`, `description: task.title`. Task titles are already required in `TaskDialog`. Fix types only if needed.
- [x] `projects/[projectId]/page.tsx` `onStart`: open a dialog (reuse `Dialog` + description field) that requires a trimmed non-empty description via `entryDescriptionError`. On confirm, `startTimer(..., { projectId, description })`. Cancel closes without starting. Do not prefill the project name.

## M7: Docs, types, browser

Outcome: current-state docs match the product; verification is green; a human can see the flow.

- [x] Edit `AGENTS.md` conventions in place: `TimeEntry.projectId` may be null (unassigned); description is trimmed non-empty on start, manual create, and description updates. Adjust the opening product sentence so it no longer implies Start works without typing. Do not add a version section.
- [x] `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`. `npm run test:rules` only to confirm no accidental rules drift (no rules file change).
- [x] Browser against the emulator (two accounts not required; one member is enough): (1) type a description, Start, no project; (2) same with a project; (3) Start with blank description stays disabled; (4) reload restores last none vs last project; (5) band with no projects still starts; (6) nachtragen without project; (7) Zeiten filter Ohne Projekt; (8) stats pie shows Ohne Projekt; (9) a project card total ignores that entry; (10) Kanban start from a task still works. Look at the timetable if any unassigned block is in the week (lane layout, not just the number).

# Log

- 2026-08-14 13:40 Plan written. Storage: `projectId: string | null` on the entry (no sentinel project document). Description: trim, reject empty in `startTimer`, `createManualEntry`, `updateEntry` (when description is sent), and both UIs via `entryDescriptionError`.
- 2026-08-14 13:40 Timer UX: do not remember last description. Remember last project including none (`UNASSIGNED_PROJECT_KEY` in the existing `veritrack:lastProject:{bandId}` key). Autofocus description. Start gated only on description. First visit with no memory still preselects the first trackable project (not none), so returning users who never pick "Kein Projekt" keep the old default. Intentional extra keystroke: typing the description.
- 2026-08-14 13:40 Copy: picker "Kein Projekt"; lists/stats/filters "Ohne Projekt"; deleted leftover id remains "Gelöschte(s) Projekt(e)". Not "Allgemein". Unassigned color: `var(--vt-muted)` on the stats slice, `var(--vt-faint)` on list spines; live timer glow stays `var(--vt-accent)` when unassigned.
- 2026-08-14 13:40 Rules: no change. Create already does not require `projectId`. Not adding a description-length rule so old empty entries remain updatable. Indexes: no change. Filters are in-memory.
- 2026-08-14 13:40 Project-detail Start uses `description: project.name` to keep one-click. Alternative (not in this plan): remove that button or force a prompt.
- 2026-08-14 13:40 Migration: none. Converter accepts missing/null/empty as null and keeps non-empty strings.
- 2026-08-14 13:55 User chose project-page Start: prompt for description in a dialog (not silent project name, not remove button). M6 and Done criteria updated. Kanban still uses task title.
- 2026-08-14 13:52 Converter reuses existing `strOrNull` for `projectId` (missing, null, or empty string become null; non-empty strings stay). Same helper as `taskId`.
- 2026-08-14 13:52 `npm run typecheck`, `lint`, `build`, and `test` all passed. `test:rules` skipped: `firestore.rules`, `firestore.indexes.json`, and `permissions.ts` were not edited.
- 2026-08-14 13:52 Logged-in emulator walkthrough not run in this session (Next responded on :3000, Firestore emulator UI was not on :4000, no auth session). The 10 browser steps remain a human check after `npm run dev:all`.
- 2026-08-14 13:52 Implementation complete. Uncommitted datetime / Zeiten-error work was left in place.

## Completion

Project is optional (`TimeEntry.projectId: null`) and description is required (trimmed) on start, nachtragen, and description edits. Dashboard Start is gated only on description, with "Kein Projekt" in the picker and last none remembered. Lists, filters, and stats use "Ohne Projekt" separately from "Gelöschtes Projekt". Project-page Start asks for a description; Kanban still starts from `task.title`. Rules and indexes unchanged. Verification: typecheck, lint, build, and unit tests green. Browser walkthrough of the 10 done-criteria steps is still for a logged-in emulator session.
