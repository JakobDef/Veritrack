---
date: 2026-08-09
tags: [firestore, emulator, indexes, testing]
severity: medium
applies-to: [firestore.indexes.json, tests/rules/**, src/hooks/**, src/lib/data/**]
---

The Firestore emulator is permissive in ways that let broken things pass locally and fail only against a real project.

**Composite indexes are not enforced.** Known in the abstract (it is noted in `.docs/rules/verification.md` and in `AGENTS.md`), but the concrete failure mode is subtler than "you forgot an index": an index that *exists* but does not *match* its query is equally fatal in production and equally invisible locally. The dashboard's `collectionGroup("tasks")` query filters on `bandId` plus `array-contains assignedTo` with no `orderBy`, and the declared index carried a trailing `dueDate`. That orders the index by a field the query never sorts on, so it would have failed with FAILED_PRECONDITION in production. Three further declared indexes matched no query the code issues at all; they were removed, because dead declarations make the file look complete and disguise the real gaps.

Check indexes by reading each declaration against the exact query that uses it (field order, direction, presence or absence of `orderBy`), not by counting that both files are non-empty. `firestore.indexes.json` currently holds four entries and every one maps to a live query.

**Clearing emulator data.** Use `env.clearFirestore()` from `@firebase/rules-unit-testing` (both suites in `tests/rules/` do). If you ever clear it by hand over HTTP, the endpoint is under `/emulator/v1/projects/{projectId}/databases/(default)/documents`, not the regular data path. Hitting the regular path silently succeeds while deleting nothing, leaving stale documents that corrupt the next test run in ways that look like rule bugs.

**Rule-evaluation noise.** The emulator logs "evaluation error" beside legitimate denials, because it eagerly evaluates alternative branches (a `set()` on a new document is also checked against the update rule, where `resource` is null). Those lines are not rules defects. Only chase them if an assertion actually fails.
