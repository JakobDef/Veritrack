---
date: 2026-08-14
tags: [dates, timezone, forms, time-entries, validation]
severity: medium
applies-to: [src/lib/time.ts, src/components/time/ManualEntryForm.tsx, src/lib/dates.ts]
---

Also this session: the "Dates are local-time throughout" bullet in `AGENTS.md` now forbids constructing a wall-clock instant from an ISO date-time string.

On Zeiten, "Zeit nachtragen" for this morning 7:00-9:00 failed with "Ein Eintrag kann nicht in der Zukunft beginnen." at 11:45 local. Two bugs stacked.

`ManualEntryForm` (and `fromDateTimeLocalValue`) built instants with `new Date(\`${date}T${time}\`)`. An ISO date-time with no offset is UTC in some engines and local in others; Safari historically also rejected missing seconds. The rest of the app is local wall time via `new Date(y, m, d, h, min)` in `src/lib/dates.ts`. Due dates already papered over the date-only case with `T12:00:00`. Clock times cannot.

New-entry defaults were hardcoded to 19:00-21:00. Opening the form at 11:45 pre-filled a start that really is in the future. `validateRange` threw on write; the form's inline `error` did not include that check, so submit stayed enabled and the failure arrived as a toast. A 12-hour picker showing "7:00 PM" also makes "I typed 7:00 to 9:00" easy to misread.

Fix: `fromDateTimeLocalValue` / `combineLocalDateTime` parse via Date components and reject overflow dates. `entryRangeError` is shared by the form (inline) and the write path (throws). New-entry defaults are the last two hours ending now, clamped to today so a midnight open does not roll the end into tomorrow.

Next time:

- Never `new Date("YYYY-MM-DDTHH:mm")` (or a template of the same shape) for a local clock. Use `new Date(year, monthIndex, day, hours, minutes)` or `combineLocalDateTime`. `T12:00:00` is only a date-only noon trick, not a clock parser.
- A check that exists only on the write path shows up as a toast with a live submit button. Share the predicate with the form's inline error.
- A "nachtragen" form must default to a range that is already in the past. Evening rehearsal hours are not a valid blank.
- Display is a separate trap from parsing: `toLocaleTimeString("de-DE")` is not 24h. See `.docs/learnings/2026-08-18-locale-is-not-24h.md`.
