---
date: 2026-08-09
tags: [firestore, security-rules, testing, permissions]
severity: medium
applies-to: [firestore.rules, tests/rules/**, src/lib/permissions.ts, reviewer]
---

Also written this session: `.docs/rules/firestore-rules-changes.md` (new rule), and `.claude/agents/reviewer.md` gained a "Look specifically for" section covering these defect classes.

47 security-rules tests were green, and the rules still had two live privilege-escalation paths. Every one of those tests exercised a single operation (this actor, this write, allow or deny). Both holes needed a SEQUENCE of individually legitimate writes, so no single-operation assertion could ever see them:

- A viewer deleted their own member document (leaving a band is allowed) and re-created it as `member` using the invite code, which members can read straight off the band document. Demotion to viewer was therefore unenforceable. Fix: self-deletion limited to `permissionRole == 'member'`.
- `isBandCreator` was derived from `createdBy`, which is immutable, so the creator's admin-seed branch never closed. A demoted or removed founder could delete and re-create their membership as admin. Fix: a one-way `seeded` latch on the band document, set true by `createBand` right after seeding, and never allowed back to false by the band update rule.

The generalizable shape: an allow/deny matrix tests the edges of the state machine one at a time; escalation lives in the paths through it. Any rule that permits a delete should immediately raise "and then what can they re-create?".

Related, same session: `firestore.rules` allowed an admin to change their own `permissionRole` while `src/lib/permissions.ts` and `src/lib/data/members.ts` both claimed it was forbidden. Both test suites passed while the two sources disagreed, because both suites were written from the same intent rather than from each other. A mirror is not verified by testing each side against your own understanding of the policy.

Next time: for any rules work, write the delete-then-recreate cases first, and diff the rules against `src/lib/permissions.ts` line by line rather than trusting that both suites being green means they agree. `tests/rules/escalation.test.ts` is the place for the sequence cases; 4 of its 12 reproduced the attacks before the fix.
