---
date: 2026-08-09
tags: [verification, ui, testing, firestore]
severity: medium
applies-to: [src/app/**, src/components/**, firestore.rules]
---

Three real defects in this build were found by running the app and looking at it, with typecheck, lint, unit tests and rules tests all green at the time. They were not near-misses of existing tests; they belong to classes those tests structurally cannot cover.

1. **Joining a band failed with PERMISSION_DENIED before any write.** `joinBandByInviteCode` pre-checks membership with a `getDoc` on the member document, but the read rule required membership, so the check was denied for exactly the people it exists for. Rules tests asserted the read matrix correctly; nothing asserted the *order of operations the client actually performs*. Fixed by allowing a user to read their own member document.
2. **Simultaneous calendar entries were drawn on top of each other.** Absolutely positioned blocks, no lane layout, so a whole band rehearsing together rendered as one person: whoever was painted last. Correct data, correct totals, invisible to every test. Fixed with cluster-based lane layout.
3. **Chart axes read "0h 1h 3h 4h 5h".** Data is in minutes, Recharts picked automatic ticks at values like 75 and 225, and the hour formatter collapsed them. Fixed by choosing whole-hour ticks explicitly (`hourTicks`).

The pattern: unit tests cover pure functions, rules tests cover single authorization decisions, and neither covers *composition* (a real client's read-then-write order) or *rendering* (overlap, tick selection, anything where the pixels differ from the values). Both remaining classes are cheap to check and were skipped only because everything was green.

Next time, before calling a UI or flow milestone done: walk the flow in a browser against the emulator with two accounts, and actually look at a screenshot of any surface that positions elements by computed coordinates (calendar, charts, anything absolutely positioned or auto-ticked). Budget this per milestone, not once at the end.
