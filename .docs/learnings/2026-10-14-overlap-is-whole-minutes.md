---
date: 2026-10-14
tags: [time, overlap, minutes, forms, timer]
severity: medium
applies-to: [src/lib/time.ts, src/components/time/ManualEntryForm.tsx]
---

Back-to-back timers (stop at 14:14, start the next at 14:14) could not be saved after edit: the form said the ranges overlapped.

The overlap check compared millisecond Date values. The edit form only has `HH:mm`, so a stop at 14:14:32 becomes 14:14:00. The next entry still started at 14:14:32. After edit, `14:14:00 < 14:14:32` looks like an overlap even though both display as 14:14.

Fix: half-open ranges on whole minutes (`[start, end)`). Touching at the boundary minute is allowed. Starting a minute into the other range (14:13 while the other runs until 14:14) is still blocked.

Next time, if the UI is minute-resolution, overlap must be too. Strict Date inequality plus a form that drops seconds will reject consecutive timers.
