---
date: 2026-08-14
tags: [firestore, indexes, hooks, ui, empty-state]
severity: medium
applies-to: [src/hooks/useCollection.ts, src/hooks/useTimeEntries.ts, src/app/(app)/time/page.tsx]
---

On the Zeiten page, "Nur ich" always showed EmptyState "Nichts in diesem Zeitraum" while "Ganze Band" listed the same user's entries. The own-only query added `where("userId", "==", uid)` to a `startTime` range plus `orderBy startTime desc`. That needs a composite index. The band-wide query is range + orderBy only (single-field index) and succeeded.

`useCollection` on listener failure sets `data: []` and `error`. The page ignored `error` and treated empty data as a legitimate empty period. The emulator does not enforce composite indexes, so this only appears against a real project (or in the console as FAILED_PRECONDITION with an index URL, which nobody saw until `useCollection` started logging it).

Same defect class as silent composition failures: the UI copy for "no documents" is indistinguishable from "the query died". Dashboard Heute/Woche used the same composite query via `useTimeEntries`.

Next time:

- Any caller that renders EmptyState from `data.length === 0` must also branch on `error`. A load-failed empty state is not "nothing in this period".
- Do not add an equality filter to a working range query in Firestore when the extra filter is cheap in memory (a band-week of time entries). Keep `userId` in Firestore only when a `limit` must apply to that user (dashboard last-six), and put `orderBy` before `limit`.
- Related: `.docs/learnings/2026-08-09-defects-only-the-browser-found.md`, `.docs/learnings/2026-08-09-firestore-emulator-blind-spots.md`. Those cover composition and missing indexes. They do not cover this error-vs-empty trap.
