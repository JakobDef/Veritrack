---
date: 2026-08-18
tags: [dates, locale, time, formatting]
severity: medium
applies-to: [src/lib/time.ts, src/components/time/ManualEntryForm.tsx]
---

Also this session: reviewer.md "Look specifically for" now names locale clocks as a render-only example.

`formatTimeOfDay` used `toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })`. On browsers that honor the OS 12-hour clock, that still rendered "7:05 AM". Passing a German locale does not pin hour cycle. Distinct from `.docs/learnings/2026-08-14-datetime-string-is-not-local.md`, which is about parsing ISO strings, not display.

Fix: `format(date, "HH:mm")` from date-fns (always 24-hour, local timezone). Tests lock morning, evening, and midnight to `07:05`, `19:00`, and `00:00`. Native `<input type="time">` still shows AM/PM when the OS clock is 12-hour, even with `lang="de"` on the control. The Nachtragen form uses a text field plus `normalizeClockInput` instead.

Next time:

- Never `toLocaleTimeString` for clock display in this app, even with `"de-DE"`. Use `formatTimeOfDay` or date-fns `HH:mm`.
- A locale tag is not an hour-cycle. Assert a morning time as `"07:05"`, not a snapshot of whatever the host OS prints.
- Do not use `<input type="time">` if the product must be 24-hour. The OS picker ignores `lang`. Use a text field and `normalizeClockInput`.
