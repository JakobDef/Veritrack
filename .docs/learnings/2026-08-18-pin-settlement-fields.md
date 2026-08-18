---
date: 2026-08-18
tags: [firestore, security-rules, time-entries, payout]
severity: high
applies-to: [firestore.rules, src/lib/permissions.ts, tests/rules/**, src/types/models.ts]
---

Also this session: reviewer.md Look-for unpinned fields on member-writable docs and unused capability flags; AGENTS.md payout and `adminOnly` conventions; Key-paths `src/lib/` now includes money.

Members already update their own time entries. Adding `payoutId` without pinning it in rules is a self-serve paid/unpaid hole: the UI can omit the field and a member still `updateDoc({ payoutId: "fake" })`. There is no server SDK. Same shape as any settlement or status field on a document members can already write.

What the pin must cover (sequences in `tests/rules/escalation.test.ts`, not only the single-op matrix):

- Create with `payoutId` already set: deny (hides hours from the open list).
- Owner update that sets, clears, or changes `payoutId`: deny.
- Edit or delete a paid entry: deny everyone, including admin.
- Admin stamp: `affectedKeys().hasOnly(['payoutId'])` on a completed unpaid entry only. Combined field writes deny.
- Do not `exists()` the payout doc to validate the stamp. Batches evaluate against pre-batch state, so create-payout-plus-stamp would always deny.

Rules use `resource.data.get('payoutId', null)` so a missing field (old docs) is unpaid. `where("payoutId", "==", null)` does not match those docs. Converters map missing to null; the open list filters completed unpaid entries in memory.

Do not derive payout grants from `createdBy`. Mirror the freeze in `src/lib/permissions.ts` (`canEditTimeEntry` is false when `payoutId != null`). See `.docs/rules/firestore-rules-changes.md`.
