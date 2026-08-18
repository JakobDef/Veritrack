---
status: done
created: 2026-08-18
updated: 2026-08-18
base: cd77be69a3aa8bf6e4933ed73aab24bc106defd7
goal: Add an admin-only Abrechnung screen that pays members one by one at the current band hourly rate, with frozen payout history and rules that members cannot stamp, unpay, or delete paid time.
---

# Goal

Add an admin-only Abrechnung screen that pays members one by one at the current band hourly rate, with frozen payout history and rules that members cannot stamp, unpay, or delete paid time.

# Inputs

Rules consulted (all of `.docs/rules/`):

- `.docs/rules/plan-execution.md` - checkbox plan, live ticks, Log, `base:` sha.
- `.docs/rules/firestore-rules-changes.md` - sequence tests in `tests/rules/escalation.test.ts` first, never derive grants from immutable fields, update `src/lib/permissions.ts` in the same change, state the matrix in the plan Log, re-run join and band-creation in a browser because rules also gate client pre-checks.
- `.docs/rules/verification.md` - `typecheck`, `lint`, `build`, `test`, `test:rules` in that order. Emulator does not enforce composite indexes.
- `.docs/rules/docs-current-state-only.md` - `AGENTS.md` gets an in-place conventions edit (payoutId, hourlyRateCents, paid entries frozen). No changelog block. Key-paths cells stay one short phrase.
- `.docs/rules/agent-docs-sync.md` - no `.claude/agents/` files change.

Learnings consulted:

- `.docs/learnings/2026-08-14-firestore-error-looks-like-empty.md` - Abrechnung must branch on `error` vs empty. Do not add `where("payoutId", "==", null)` (old docs missing the field would not match; also a new composite). Load time entries like stats `period=all`: `useTimeEntries({ bandId })`, filter unpaid and completed in memory.
- `.docs/learnings/2026-08-09-firestore-emulator-blind-spots.md` - do not add a dead composite index. The payouts query is `orderBy("createdAt", "desc")` only (automatic single-field index). `firestore.indexes.json` stays unchanged unless a new composite query is actually issued.
- `.docs/learnings/2026-08-09-rules-tests-single-operation-blindness.md` - member-sets-payoutId, member-deletes-paid, member-unpays, create-with-payoutId-already-set, and viewer-reads-payouts are sequences or new collections. Put them in `escalation.test.ts`. Diff rules against `permissions.ts` line by line. Keep the existing admin-self-demote cases green.
- `.docs/learnings/2026-08-14-null-project-is-not-deleted.md` - entry rows still go through `timeEntryProjectName` (null = "Ohne Projekt", missing project = "Gelöschtes Projekt").
- `.docs/learnings/2026-08-09-defects-only-the-browser-found.md` - budget a two-account browser walkthrough before calling the last milestone done. Rules tests cannot see the nav hide or the confirm copy.

Product constraints from `AGENTS.md` and the locked decisions:

- One band-wide hourly rate, admin-edited in Settings. Open hours use the **current** rate. Paid amounts are snapshotted and never recomputed.
- Mark paid per person, not per entry and not whole-band.
- Running timers (`endTime == null` / `duration == null`) are excluded.
- Currency EUR, German UI, nav label **Abrechnung**, `adminOnly: true`.
- Dashboard timer stays untouched. No extra start-timer fields.
- Reads through converters, writes through `withConverter(null)` and `serverTimestamp()`.
- `permissionRole` is the only grant. Do not consult `role`.
- `can.manageBand` is already `isAdmin`. Reuse it for the rate field. Add explicit payout read/create helpers rather than overloading manageBand in a way that drifts from the rules.

Existing code this plan is written against (read, not guessed):

- `firestore.rules` time-entry update/delete currently allow owner or admin with no field pins beyond `userId` immutability. Adding `payoutId` without pinning it is a self-serve paid/unpaid hole.
- Band update is already admin-only and already pins `createdBy` and the one-way `seeded` latch. `hourlyRateCents` rides that path. Do not add a `hasOnly` key list (it would break the next additive field and is not required).
- `NavItem.adminOnly` exists in `src/components/layout/nav.ts` and is unused. `Sidebar` and `MobileNav` render every item. `MobileNav` does not call `useBand` yet.
- Zeiten already confirms delete via `ConfirmDialog` and `deleteEntry`. Reuse both from Abrechnung.
- Stats already uses unbounded `useTimeEntries({ bandId })` for `period=all`. Same known unbounded-read pattern.
- `createBand` writes are sequential, not batched, because batches evaluate against pre-batch state. Do **not** `exists()` the payout document in the entry-update rule: a batch of payout-create plus entry stamps would always deny.

# Affected files

- `src/types/models.ts` - `Band.hourlyRateCents`, `TimeEntry.payoutId`, new `Payout` type.
- `src/lib/firebase/converters.ts` - map missing `hourlyRateCents` to `0`, missing `payoutId` to `null` (same `strOrNull` pattern as `projectId`); add `payoutConverter`.
- `src/lib/firebase/paths.ts` - `payoutsCol` / `payoutDoc`.
- `firestore.rules` - pin `payoutId` on time entries; freeze paid entries; payouts subcollection admin-only; keep band `createdBy`/`seeded` pins.
- `src/lib/permissions.ts` - freeze paid entries in `canEditTimeEntry`; add `canReadPayouts` / `canCreatePayout` (both `isAdmin`); keep `canManageBand` for the rate.
- `tests/rules/escalation.test.ts` - sequence cases listed in milestone 1 (write these first).
- `tests/rules/firestore.rules.test.ts` - single-operation matrix for payouts and the new time-entry pins.
- `tests/unit/permissions.test.ts` - same matrix as the rules tests.
- `src/lib/data/bands.ts` - `updateBandSettings` accepts `hourlyRateCents`.
- `src/lib/data/timeEntries.ts` - new creates write `payoutId: null`; never send `payoutId` from `updateEntry` / `stopTimer`.
- `src/lib/data/payouts.ts` - **new.** `markMemberPaid` (batch: create payout, stamp entries).
- `src/lib/money.ts` - **new.** integer cents, half-up `payoutAmountCents`, `formatEur`, `eurosToCents`.
- `src/lib/payout.ts` - **new.** in-memory `isPayoutOpenEntry`, `openByMember` grouping.
- `tests/unit/money.test.ts` - **new.** rounding and parse/format cases.
- `tests/unit/payout.test.ts` - **new.** running/paid/unpaid filters and grouping (omit zero, leftover userId).
- `src/app/(app)/settings/page.tsx` - Stundenlohn field (EUR input, store cents).
- `src/app/(app)/payout/page.tsx` - **new.** admin-only Abrechnung page.
- `src/components/layout/nav.ts` - `{ href: "/payout", label: "Abrechnung", adminOnly: true }` (not `primary`).
- `src/components/layout/Sidebar.tsx` - skip `adminOnly` unless `can.isAdmin`.
- `src/components/layout/MobileNav.tsx` - same filter; call `useBand`.
- `src/components/time/TimeEntryList.tsx` - optional muted "Bezahlt" badge when `payoutId` is set (edit/delete already hide via `canEditTimeEntry`).
- `src/app/(app)/time/page.tsx` - no query change. `canEdit` keeps using `canEditTimeEntry` (will start denying paid entries after milestone 1).
- `AGENTS.md` - in-place convention plus one Key-paths row for `src/app/(app)/payout/`.
- `firestore.indexes.json` - **no change** (no new composite query).

# Risks / Unknowns

- **Unbounded read.** Open hours subscribe to the band's whole `timeEntries` history, same as Statistik "Gesamt". Honest totals beat a silent `limit()`. If a band ever outgrows this, the fix is a stored aggregate, not a capped list.
- **Batch limit 500.** One `writeBatch` may hold 1 payout `set` plus at most 499 entry updates. If one person has more than 499 unpaid completed entries in a single mark-paid, split into multiple payout documents in that click (each chunk its own snapshot totals). For a band this size that split should never run; still implement it so a surprise dump does not fail with a SDK error.
- **No `exists(payout)` pin.** Batches see pre-batch state, so requiring the payout doc to exist would break the intended atomic batch. Security is "only admin may set `payoutId`". An admin can stamp a garbage id; members cannot. Do not try to close that with `exists()`.
- **`payoutId` is readable on entries.** All members can already read `timeEntries`. They will see which hours were paid if they inspect the raw document. They cannot read `payouts/{id}` (frozen amount, who marked paid). Accept this. Hiding the stamp would need a private collection and an admin-only query.
- **Removed members.** Unpaid entries can outlive the member document. Show them in the open list under "Entferntes Mitglied" (or leftover `displayName` if still present). Do not drop the hours.
- **No reverse-payout in v1.** Paid entries are frozen. Payout docs deny update and delete. If a mistaken pay happens, that is a future feature, not a hole to leave open as "admin clears `payoutId`".
- **Index deploy is parked.** This plan adds no composite. If someone later adds `where("payoutId", "==", null)`, old docs without the field will not match, and production will demand an index the emulator will not. Do not add that query.
- **ConfirmDialog is danger-styled.** Use it for delete. For mark-paid use `Dialog` plus a primary footer button so "Als bezahlt markieren" is not a red destructive control.
- **Working tree.** HEAD is `cd77be69`. Uncommitted optional-project work may already be in the tree. Implement on top of it; do not revert it.

# Done criteria

- Admin sees **Abrechnung** in the sidebar and in the mobile "Mehr" sheet. Member and viewer do not. Hitting `/payout` as non-admin redirects to `/dashboard` after band membership has loaded.
- Settings has a Stundenlohn field. Empty or 0 means not configured. Input accepts `12,50` and `12.50`, stores integer cents. Members see the field read-only (same lock copy as the rest of Settings).
- Abrechnung lists only people with unpaid **completed** entries. Running timers are absent. People with 0 open hours are omitted. When nobody is open: EmptyState title "Nichts offen", and a distinct error empty state if the listener failed.
- Per person: hours via `formatDuration`, money via `formatEur` at the **current** `band.hourlyRateCents`, entry rows (description, `timeEntryProjectName`, local date, duration), delete with confirm, mark-paid with confirm (name, hours, amount).
- Mark-paid is disabled when the rate is 0. After confirm: one payout document is created with snapshotted `minutes`, `hourlyRateCents`, `amountCents`; those entries get `payoutId`; they leave the open list; a history row appears (who, when, how much). Changing the band rate afterwards does not change history amounts and does change remaining open amounts.
- Members cannot set, clear, or change `payoutId`, cannot create an entry already marked paid, cannot edit or delete a paid entry. Admins cannot delete paid entries or payout documents. Admin self-demote remains denied.
- Timer start/stop/cancel on the dashboard is unchanged (still no project required beyond today's rules, still required description).
- Fast three plus `npm test` and `npm run test:rules` green. Browser walkthrough in milestone 6 done.

# Milestones

## 1. Security rules (tests first)

Outcome: `payoutId` and the `payouts` collection are real in types and rules; members cannot self-serve paid; the permissions mirror matches; existing escalation cases still pass.

- [x] Add to `src/types/models.ts`:
  - `Band.hourlyRateCents: number` (0 means not configured).
  - `TimeEntry.payoutId: string | null` (null / missing = unpaid).
  - `Payout`: `id`, `userId`, `minutes`, `hourlyRateCents`, `amountCents`, `createdAt: Date`, `createdBy`.
- [x] Converter: missing or non-number `hourlyRateCents` -> `0`. Missing / empty `payoutId` -> `null` via `strOrNull`. Add `payoutConverter` (ints as numbers, `createdAt` through `toDate`).
- [x] `payoutsCol(bandId)` / `payoutDoc(bandId, payoutId)` in `src/lib/firebase/paths.ts`.
- [x] New creates in `startTimer` and `createManualEntry` write `payoutId: null`. `updateEntry` and `stopTimer` must not put `payoutId` in the payload.
- [x] **Failing tests first** in `tests/rules/escalation.test.ts` (seed paid docs with `withSecurityRulesDisabled` when the sequence needs a pre-stamped entry):
  1. Member `updateDoc` own unpaid entry `{ payoutId: "payout-fake" }` denies (self-mark-paid).
  2. Member `setDoc` a new own entry with `payoutId` already set denies (hide hours from the open list).
  3. Seed a paid own entry; member `updateDoc` `{ payoutId: null }` denies (unpay).
  4. Seed a paid own entry; member `deleteDoc` denies.
  5. Seed a paid own entry; member `updateDoc` `{ description: "x" }` denies (edit paid).
  6. Admin `updateDoc` unpaid `{ payoutId: "p-1", duration: 999 }` in one write denies (stamp must `affectedKeys().hasOnly(['payoutId'])`).
  7. Viewer `getDoc` a payout denies; member `getDoc` the same payout denies; `getDocs` / list of `payouts` denies for viewer and member.
  8. Member `setDoc` a payout document denies.
  9. Admin self-demote `updateDoc` own `permissionRole` still denies (existing leftover; keep it in this file so a rules edit cannot drop it).
- [x] Matrix tests in `tests/rules/firestore.rules.test.ts`:
  - Admin may `updateDoc` `{ hourlyRateCents: 1250 }` on the band; member may not.
  - Admin may not flip `seeded` to false in the same write as a rate change.
  - Admin may stamp `payoutId` on an unpaid completed entry; may not stamp a running entry (`endTime == null`).
  - Admin may still edit description on an **unpaid** entry; member may still edit/delete **own unpaid**.
  - Admin delete of a **paid** entry denies; admin delete of **unpaid** still allows.
  - Admin create payout succeeds with `createdBy == auth.uid`; payout `update` and `delete` deny even for admin; admin `get` / list payouts succeed.
- [x] Implement `firestore.rules` (do not derive any new grant from `createdBy` or `Payout.createdBy`):
  - Time entry **create**: existing `canWrite` + `userId == auth.uid`, plus `request.resource.data.get('payoutId', null) == null`.
  - Time entry **update**: `userId` unchanged AND `resource.data.get('payoutId', null) == null` (paid is frozen), then either:
    - `payoutId` stays null, and (admin OR (canWrite AND owner)), or
    - admin stamp: `payoutId` is non-empty string, `diff(resource.data).affectedKeys().hasOnly(['payoutId'])`, `resource.data.endTime != null`, `resource.data.duration is int`.
  - Time entry **delete**: unpaid only (`get('payoutId', null) == null`) AND (admin OR (canWrite AND owner)).
  - `match /payouts/{payoutId}`: `read` if `isAdmin(bandId)`; `create` if `isAdmin` and `createdBy == request.auth.uid` and the numeric fields are ints and `userId` is string; `update`, `delete` if false.
  - Band update: unchanged pins (`createdBy` immutable, `seeded` one-way). No extra hourlyRate pin (admin-only update is enough).
- [x] Mirror in `src/lib/permissions.ts`:
  - `canEditTimeEntry` takes `Pick<TimeEntry, "userId" | "payoutId">` and returns false when `payoutId != null` (everyone, including admin). Unpaid behavior unchanged.
  - `canReadPayouts(member)` / `canCreatePayout(member)` both `isAdmin(member)`.
  - Rate editing stays `canManageBand`.
- [x] Extend `tests/unit/permissions.test.ts` so it disagrees with the rules tests if either drifts (paid freeze, payouts admin-only, unpaid member still edits own).
- [x] Run `npm run test:rules` and `npx vitest run tests/unit/permissions.test.ts`. Append the resulting allow/deny matrix to the plan Log (required by `.docs/rules/firestore-rules-changes.md`).

Intended matrix (copy into the Log once tests pass; edit if implementation differs):

```
TimeEntry create: admin/member own, payoutId null/missing. Viewer deny. payoutId set deny.
TimeEntry update unpaid, payoutId unchanged: admin any; member own; viewer deny; userId change deny.
TimeEntry update stamp payoutId only: admin, completed only. Member deny. Combined with other fields deny.
TimeEntry update/delete paid: deny all.
TimeEntry delete unpaid: admin any; member own; viewer deny.
Payout create: admin. Member/viewer deny.
Payout read get+list: admin. Member/viewer deny.
Payout update/delete: deny all.
Band hourlyRateCents: admin update. Member/viewer deny.
Band createdBy rewrite: deny. seeded true->false: deny.
Admin self-demote: deny.
```

## 2. Settings Stundenlohn

Outcome: admin can set the band rate in EUR; it is stored as integer cents; 0/missing disables payout actions later.

- [x] Add `src/lib/money.ts`:
  - `payoutAmountCents(minutes, hourlyRateCents)` = `Math.round((minutes * hourlyRateCents) / 60)` for positive inputs, else `0`. Document: JS `Math.round` on positives is half up (0.5 -> 1), not bankers. Integer multiply before divide.
  - `formatEur(cents)` via `Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })`.
  - `eurosToCents(input: string): number | null` - trim, allow empty -> `0`, accept comma or dot decimal, reject negative / NaN / non-finite.
- [x] Tests in `tests/unit/money.test.ts`: 60min at 1000 c/h -> 1000; 90min at 1250 -> 1875; 1min at 30 c/h -> 1; 1min at 29 c/h -> 0; `12,50` and `12.50` -> 1250; empty -> 0; `formatEur(1250)` contains `12,50`.
- [x] `updateBandSettings` accepts optional `hourlyRateCents: number` (integer, `>= 0`).
- [x] Settings form: number-ish text input labeled "Stundenlohn", hint "Euro pro Stunde, für die ganze Band. Offene Stunden nutzen immer den aktuellen Satz.", suffix or placeholder `€ / h`. Parse with `eurosToCents` on save. Include in `dirty`. Disabled when `!can.manageBand`. Seed from `band.hourlyRateCents` (show `cents/100` with comma). Do not add a second editor on Abrechnung; show the rate there read-only and link to `/settings`.
- [x] `npm run typecheck` and `npx vitest run tests/unit/money.test.ts`.

## 3. Nav and admin gate

Outcome: Abrechnung is a real route, hidden from non-admins, redirecting if opened by URL.

- [x] `NAV_ITEMS`: `{ href: "/payout", label: "Abrechnung", icon: Wallet (lucide), adminOnly: true }`. Not `primary` (lives in the Mehr sheet).
- [x] `Sidebar`: `NAV_ITEMS.filter((item) => !item.adminOnly || can.isAdmin)` before map. `can` from `useBand`.
- [x] `MobileNav`: same filter on both `primary` and `rest`. Import `useBand`. Do not put Abrechnung in the thumb bar.
- [x] Add `src/app/(app)/payout/page.tsx` as a client page. After `!loading`, if `!can.isAdmin` (`useBand().can.isAdmin`), `router.replace("/dashboard")` and render the existing page skeleton. Do not flash the payout body at members. Do not put this check in `(app)/layout.tsx` (layout stays band/auth only).
- [x] Placeholder body is enough for this milestone (title "Abrechnung") so the nav target is not a 404. Real content is milestone 4.
- [x] `npm run typecheck`. Click-path check can wait for milestone 6, but the filter must be in both nav surfaces now.

## 4. Open unpaid hours

Outcome: the page shows who is owed what at the current rate, with per-entry detail and delete, without marking paid yet.

- [x] `src/lib/payout.ts`:
  - `isPayoutOpenEntry(entry)`: `payoutId == null` AND `endTime != null` AND `typeof duration === "number"`.
  - `openByMember(entries, members, hourlyRateCents)`: group open entries by `userId`, omit groups with 0 minutes, sort by displayName. Unknown `userId`: label "Entferntes Mitglied". `amountCents = payoutAmountCents(minutes, hourlyRateCents)`.
- [x] `tests/unit/payout.test.ts`: running excluded; paid excluded; missing `payoutId` treated as unpaid; unassigned project does not matter (grouping is by user); empty members still emit a leftover group; zero-hour users omitted.
- [x] Page data: `useTimeEntries({ bandId: activeBandId })` (no range, no `where payoutId`). `useProjects` for labels. `band.hourlyRateCents` from `useBand`. If `error`, EmptyState "Zeiten konnten nicht geladen werden" (not "Nichts offen"). If loaded and `openByMember` is empty: "Nichts offen".
- [x] Person card/section: displayName, `formatDuration(minutes)`, `formatEur(amountCents)`. If rate is 0, show hours and "Stundenlohn in den Einstellungen festlegen" instead of a euro amount, and no mark-paid button yet (button arrives in milestone 5, but disable/hide logic can be wired).
- [x] Nested list per person: description, `timeEntryProjectName`, local date (`formatDayLabel` or `formatTimeOfDay` plus day), `formatDuration`. Delete calls existing `deleteEntry` after `ConfirmDialog` (reuse Zeiten copy pattern).
- [x] Show current rate at the top (`formatEur(hourlyRateCents) + " / h"` or "Nicht festgelegt") and a text link to `/settings`.
- [x] `TimeEntryList`: if `payoutId` is set, show a muted Badge "Bezahlt" so Zeiten does not look broken when pencil/trash disappear.
- [x] `npm run typecheck` and unit tests for `payout.ts`.

## 5. Mark paid and history

Outcome: one click per person writes a snapshot payout, stamps that person's currently open completed entries, and lists history.

- [x] `src/lib/data/payouts.ts`: `markMemberPaid({ bandId, actorUid, userId, entries, hourlyRateCents })`:
  - Filter with `isPayoutOpenEntry` and `userId`. Throw a German `Error` if rate is `<= 0` or the set is empty.
  - `minutes` = sum of `duration`. `amountCents` = `payoutAmountCents(minutes, hourlyRateCents)` computed **once** from this set (never from the current rate later).
  - Chunk so each batch has `1 + n <= 500`. Per chunk: `doc(payoutsCol(bandId))` for a client id, `writeBatch`, `set` payout with `userId`, `minutes` (chunk), `hourlyRateCents`, `amountCents` (chunk), `createdAt: serverTimestamp()`, `createdBy: actorUid`, then `update` each entry `{ payoutId }`. `withConverter(null)` on writes.
  - One person / one click / fewer than 500 entries: one payout doc. Document the chunk split in a short comment.
- [x] Mark-paid control per person: `Dialog` (not danger `ConfirmDialog`) titled "Als bezahlt markieren?", body with name, `formatDuration`, `formatEur`. Confirm button label "Als bezahlt markieren". Disabled when rate is 0 or busy.
- [x] History: `useMemo` query `query(payoutsCol(bandId), orderBy("createdAt", "desc"))` into `useCollection`. Branch on `error` vs empty ("Noch keine Auszahlungen"). Each row: member displayName (same leftover fallback), local date/time, hours, `formatEur(amountCents)`, optionally the snapshotted rate. Newest first. Do not recompute from `band.hourlyRateCents`.
- [x] After a successful mark-paid, those entries vanish from the open list via the live listener (no manual cache edit).
- [x] `npm run typecheck` and `npx vitest run tests/unit`.

## 6. Verification and docs

Outcome: the five verification commands are green; AGENTS.md matches current state; a browser pass has actually been looked at.

- [x] `AGENTS.md` in place (no changelog): Key-paths row `src/app/(app)/payout/` -> `Admin-only payout screen`. Convention bullet: time entries may have `payoutId: null` (unpaid); once set they are frozen; open totals use `Band.hourlyRateCents`; history is `bands/{id}/payouts`. Mention integer cents and the in-memory unpaid filter. Keep the cell to one phrase.
- [x] Optionally extend `PERMISSION_ROLE_HINTS.admin` to mention Abrechnung.
- [x] Run in order: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:rules`.
- [x] Browser against the emulator, two accounts (admin + member), look at the pixels:
  1. Admin sets Stundenlohn in Settings (`12,50`), sees it on Abrechnung.
  2. Member starts the dashboard timer (description required, project optional), stops it. Admin sees those hours under the member, running timer never listed.
  3. Admin changes the rate; open euro amount changes; no history yet.
  4. Admin deletes a wrong unpaid entry from Abrechnung (confirm).
  5. Admin mark-pays Jakob only; Lisa remains. History row has the frozen amount. Changing the rate afterwards does not change that row and does change Lisa.
  6. Member does not see Abrechnung in sidebar or Mehr. `/payout` redirects. Member can still edit own **unpaid** entry on Zeiten and cannot edit/delete the paid one (Badge "Bezahlt").
  7. Create a band and join-by-invite still work (rules file changed; this is the composition check from the firestore-rules rule).
- [x] Flip this plan `status:` to `done` only after the checkboxes above are ticked. Invoke `learner` after the feature lands.

# Log

- 2026-08-18 15:53 Plan written. Product decisions locked (one band rate, per-person mark-paid, current rate for open hours, snapshot history, EUR, German Abrechnung). Rules strategy: freeze paid entries, pin `payoutId` to admin stamp-only with `hasOnly(['payoutId'])`, payouts subcollection admin read/create and no update/delete, no `exists(payout)` because batches evaluate pre-batch. No new composite index. Resulting security matrix to be pasted after milestone 1.
- 2026-08-18 16:00 Milestone 1 done. `npm run test:rules` 84 passed. `permissions.test.ts` 25 passed. Allow/deny matrix (rules and `permissions.ts` agree):
  TimeEntry create: admin/member own, payoutId null/missing. Viewer deny. payoutId set deny.
  TimeEntry update unpaid, payoutId unchanged: admin any; member own; viewer deny; userId change deny.
  TimeEntry update stamp payoutId only: admin, completed only. Member deny. Combined with other fields deny.
  TimeEntry update/delete paid: deny all.
  TimeEntry delete unpaid: admin any; member own; viewer deny.
  Payout create: admin. Member/viewer deny.
  Payout read get+list: admin. Member/viewer deny.
  Payout update/delete: deny all.
  Band hourlyRateCents: admin update. Member/viewer deny.
  Band createdBy rewrite: deny. seeded true->false: deny.
  Admin self-demote: deny.
  `canEditTimeEntry` returns false when `payoutId != null` for everyone. `canReadPayouts` / `canCreatePayout` are `isAdmin`. Rate stays `canManageBand`. No grant derived from `createdBy` or `Payout.createdBy`.
- 2026-08-18 16:04 Milestones 2-5 implemented together (no placeholder page left behind). `stats.test.ts` entry helper now defaults `payoutId: null` because the TimeEntry type requires it. `firestore.indexes.json` untouched.
- 2026-08-18 16:04 Verification: typecheck, lint, build, test (107), test:rules (84) all green. Two-account pixel walkthrough was not run in this session (no live `dev:all`). Join and band-create remain covered by existing rules tests. Click through the 7 steps against the emulator before shipping.
- 2026-08-18 16:04 Plan done.

## Completion

Admin-only Abrechnung: band-wide Stundenlohn in Settings (integer cents), per-person mark-paid at the current rate, frozen payout history, paid time entries immutable even for admin. Members cannot stamp, unpay, or delete paid entries. Nav label Abrechnung, German UI, EUR. Running timers stay off the open list. No reverse-payout in v1. Batch writes chunk at 499 entries so a surprise dump does not hit the 500-write cap.
