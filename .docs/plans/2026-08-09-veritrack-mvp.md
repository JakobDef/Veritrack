---
status: done
created: 2026-08-09
updated: 2026-08-09
base: cf6161c63468b8e8c3c8ee4ff1861535d38b14b3
goal: Build Veritrack, a band collaboration web app on Next.js + Firebase, whose centerpiece is a one-click start/stop time tracker on the dashboard home screen.
---

# Goal

Build Veritrack, a band collaboration web app on Next.js + Firebase, whose centerpiece is a one-click start/stop time tracker on the dashboard home screen.

# Inputs

Rules consulted (all of `.docs/rules/`):

- `.docs/rules/plan-execution.md` - plan format, checkbox protocol, resume protocol. This plan follows it exactly.
- `.docs/rules/verification.md` - currently a `TBD` placeholder. It MUST be filled in with the real typecheck/lint/build/test commands in the same change that introduces the toolchain. That is task M0.7 below, deliberately early, because every later task's verification depends on it.
- `.docs/rules/docs-current-state-only.md` - `AGENTS.md` gets current-state edits only (Stack / How to run / Verification / Key paths), no changelog blocks, Key-paths cells stay one short phrase.
- `.docs/rules/agent-docs-sync.md` - no `.claude/agents/` files change in this plan, so no agent-table sync is required. If any task ends up touching an agent file, the `AGENTS.md` agent table and routing heuristics must be updated in the same turn.

Learnings consulted: `.docs/learnings/` contains only `README.md`. There are no prior learnings for this repo.

Project instructions: `AGENTS.md` (greenfield placeholders in Stack / How to run / Verification / Key paths, explicitly flagged as "fill these in as soon as the stack is chosen").

Environment facts (verified before planning, do not re-check):

- Node v22.11.0, npm 10.9.0. **There is no pnpm. Use npm for everything.**
- `firebase-tools` 15.6.0 installed globally.
- Java 25 present, so the Firestore emulator runs.
- Windows 11, PowerShell. Prefer cross-platform npm scripts; do not write bash-only scripts.
- No `frontend-design` skill exists in this environment. The design system in M1 is authored by hand from the tokens defined there.

Product constraints handed down and treated as non-negotiable:

- Mandatory stack: React + Next.js App Router, Tailwind, Firebase Auth + Firestore, Recharts, Firestore `onSnapshot` for realtime, Firebase Hosting config prepared, Firebase Local Emulator Suite (Auth + Firestore) for ALL development.
- The Firestore data model given in the request is adopted **exactly** as specified. It is not redesigned. Any deviation needs a Log entry and user sign-off.
- Functional role (informational, colored) and permission role (`admin` | `member` | `viewer`, controls rights) are two separate fields and are never conflated in code, types, UI, or rules.

# Affected files

Paths are relative to the repo root. Everything below is new; the repo is empty.

## Toolchain and config

| Path | Change |
|------|--------|
| `package.json` | npm manifest, deps, and scripts (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `emu`, `dev:all`, `test:rules`) |
| `tsconfig.json` | strict TypeScript config with `@/*` path alias to `src/*` |
| `next.config.ts` | Next.js config |
| ~~`tailwind.config.ts`~~ | Not used. Tailwind v4 is CSS-first: the theme lives in `@theme` inside `src/app/globals.css`. See Log 2026-08-09. |
| `postcss.config.mjs` | Tailwind/PostCSS pipeline |
| `eslint.config.mjs` | ESLint flat config (`next/core-web-vitals` + TypeScript) |
| `.prettierrc` | formatting config |
| `.gitignore` | ignores `node_modules`, `.next`, `.env.local`, emulator artifacts (`firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`, `.emulator-data/`) |
| `.env.example` | documents every `NEXT_PUBLIC_FIREBASE_*` var plus `NEXT_PUBLIC_USE_EMULATOR` |
| `.env.local` | local dev values pointing at the emulator (gitignored, created by the setup task) |
| `firebase.json` | emulator ports (auth 9099, firestore 8080, hosting 5000, UI 4000) + hosting config |
| `.firebaserc` | demo project alias `demo-veritrack` |
| `firestore.rules` | full security rules |
| `firestore.indexes.json` | composite index definitions |
| `vitest.config.ts` | test runner config for unit + rules tests |

## App shell and routing (Next.js App Router, `src/app`)

| Path | Change |
|------|--------|
| `src/app/layout.tsx` | root layout: fonts, `<html>` theme class, global providers |
| `src/app/globals.css` | Tailwind layers + CSS custom-property token definitions (light/dark) |
| `src/app/page.tsx` | root redirect: to `/login` if signed out, `/bands` if no active band, `/dashboard` otherwise |
| `src/app/(auth)/login/page.tsx` | login screen (Google + email/password) |
| `src/app/(auth)/signup/page.tsx` | email/password registration |
| `src/app/(auth)/layout.tsx` | centered unauthenticated shell |
| `src/app/(app)/layout.tsx` | authenticated shell: auth guard, band guard, sidebar, running-timer bar |
| `src/app/(app)/bands/page.tsx` | band select / create / join |
| `src/app/(app)/bands/join/[inviteCode]/page.tsx` | invite-link landing and onboarding |
| `src/app/(app)/dashboard/page.tsx` | **the centerpiece**: timer hero, recent activity, open tasks, stat nuggets |
| `src/app/(app)/projects/page.tsx` | project overview cards |
| `src/app/(app)/projects/[projectId]/page.tsx` | project detail + Kanban board |
| `src/app/(app)/time/page.tsx` | own time-entry history, manual entry, edit/delete |
| `src/app/(app)/timetable/page.tsx` | week/month calendar across members |
| `src/app/(app)/stats/page.tsx` | Recharts statistics dashboard |
| `src/app/(app)/members/page.tsx` | member list, role management, invite/remove |
| `src/app/(app)/settings/page.tsx` | band settings (admin only) |
| `src/app/not-found.tsx`, `src/app/error.tsx` | 404 and error boundary |

## Firebase and data layer

| Path | Change |
|------|--------|
| `src/lib/firebase/client.ts` | singleton `initializeApp` + emulator connect guarded against hot-reload double-connect |
| `src/lib/firebase/paths.ts` | typed collection/doc path builders (single source of truth for every Firestore path) |
| `src/lib/firebase/converters.ts` | `FirestoreDataConverter` per collection, Timestamp <-> Date mapping |
| `src/types/models.ts` | `User`, `Band`, `BandMember`, `Project`, `Task`, `TimeEntry` + literal unions for both role concepts |
| `src/lib/data/users.ts` | user profile read/write, `bandIds` maintenance |
| `src/lib/data/bands.ts` | create band, join by invite code, band settings writes |
| `src/lib/data/members.ts` | member CRUD, functional role, permission role, status |
| `src/lib/data/projects.ts` | project CRUD |
| `src/lib/data/tasks.ts` | task CRUD, status moves, assignment |
| `src/lib/data/timeEntries.ts` | start/stop/manual/edit/delete time entries |

## State, hooks, utilities

| Path | Change |
|------|--------|
| `src/providers/AuthProvider.tsx` | `onAuthStateChanged` context, loading/signed-out/signed-in states |
| `src/providers/BandProvider.tsx` | active band id (persisted), current member doc, permission helpers |
| `src/providers/ThemeProvider.tsx` | light/dark/system with no flash on first paint |
| `src/hooks/useCollection.ts` | generic `onSnapshot` collection subscription with cleanup |
| `src/hooks/useDocument.ts` | generic `onSnapshot` doc subscription |
| `src/hooks/useRunningTimer.ts` | the running-entry subscription plus local 1s ticker |
| `src/hooks/useBandMembers.ts`, `src/hooks/useProjects.ts`, `src/hooks/useTasks.ts`, `src/hooks/useTimeEntries.ts` | feature-scoped realtime subscriptions |
| `src/lib/permissions.ts` | `canManageBand`, `canEditEntry`, `canEditTask`, `isViewer` and friends, mirroring `firestore.rules` |
| `src/lib/time.ts` | duration math, formatting (`1:23:45`, `2h 15m`), minute rounding |
| `src/lib/dates.ts` | week/month range helpers, local-timezone day bucketing |
| `src/lib/inviteCode.ts` | invite code generation and normalization |

## UI components

| Path | Change |
|------|--------|
| `src/components/ui/*` | primitives: `Button`, `Card`, `Input`, `Select`, `Dialog`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Toast` |
| `src/components/timer/TimerHero.tsx` | the one-click start/stop hero |
| `src/components/timer/ProjectPicker.tsx` | fast project (and optional task) selector |
| `src/components/timer/RunningTimerBar.tsx` | persistent running-timer bar in the app shell |
| `src/components/timer/TeamActivity.tsx` | live view of colleagues' running timers |
| `src/components/projects/ProjectCard.tsx`, `ProjectForm.tsx` | project overview and create/edit form |
| `src/components/tasks/KanbanBoard.tsx`, `KanbanColumn.tsx`, `TaskCard.tsx`, `TaskDialog.tsx` | Kanban |
| `src/components/time/TimeEntryList.tsx`, `ManualEntryForm.tsx`, `TimeEntryRow.tsx` | history and manual entry |
| `src/components/timetable/CalendarGrid.tsx`, `TimetableFilters.tsx`, `EntryBlock.tsx` | calendar |
| `src/components/stats/*` | `TimePerMemberChart`, `TimePerProjectChart`, `TimeOverTimeChart`, `ProjectDistributionPie`, `ProjectProgress`, `StatNugget` |
| `src/components/members/MemberRow.tsx`, `InvitePanel.tsx`, `RoleSelect.tsx` | member management |
| `src/components/layout/Sidebar.tsx`, `TopBar.tsx`, `BandSwitcher.tsx` | app shell chrome |

## Tests

| Path | Change |
|------|--------|
| `tests/rules/firestore.rules.test.ts` | emulator-backed security-rules test suite |
| `tests/rules/helpers.ts` | test-context factory (`initializeTestEnvironment`, seeded band/member fixtures) |
| `tests/unit/time.test.ts` | duration math and formatting |
| `tests/unit/dates.test.ts` | week/month bucketing and timezone behavior |
| `tests/unit/permissions.test.ts` | permission helpers match the rules matrix |
| `tests/unit/stats.test.ts` | aggregation functions |

## Docs

| Path | Change |
|------|--------|
| `.docs/rules/verification.md` | replace `TBD` with the real commands |
| `AGENTS.md` | fill in Stack / How to run / Verification / Key paths, including emulator-to-real-project switch instructions |
| `README.md` | user-facing setup and run instructions |

# Risks / Unknowns

1. **Next.js App Router meets the Firebase client SDK.** The Firebase JS SDK is browser-only and stateful. Every file that touches it needs `"use client"`, and server components must never import it. Mitigation: all Firebase access goes through `src/lib/firebase/*` and hooks that are client-only; page files stay thin. Risk of accidental server import is real and gets caught by the build.
2. **Emulator double-connect on hot reload.** `connectAuthEmulator` / `connectFirestoreEmulator` throw or misbehave when called twice against a live instance, which Fast Refresh will do. Mitigation: module-level singleton plus an explicit `globalThis` guard flag in `src/lib/firebase/client.ts`, verified by hot-reloading a page twice.
3. **Timer persistence and drift.** The running timer must survive tab switches, reloads, and being started on another device. Source of truth is the Firestore time-entry doc with `startTime` set and `endTime === null`; the UI derives elapsed time as `now - startTime` on every tick rather than incrementing a counter, so drift cannot accumulate. Open question: clock skew between the client and Firestore's `serverTimestamp()`. Decision for MVP: write `startTime` with `serverTimestamp()`, but render optimistically from the local clock until the server value lands. Note this in the Log if it produces visible jitter.
4. **Two running timers at once.** Nothing in Firestore prevents a second start. Mitigation: client guard (start is disabled while a running entry exists) plus a rules constraint attempt; if the rules cannot express "no other running entry for this user" cheaply (they likely cannot without a denormalized field), fall back to a `activeTimerEntryId` field on the member doc and enforce there. Decide during M4 and Log the outcome.
5. **Composite indexes.** These queries will demand composite indexes: time entries by `userId` + `startTime desc`; time entries by `projectId` + `startTime desc`; time entries by `startTime` range for the timetable; tasks by `status` + `createdAt`; tasks by `assignedTo` (array-contains) + `dueDate`. The emulator does NOT enforce indexes, so a query that works locally can fail in production. Mitigation: declare every one in `firestore.indexes.json` as the query is written, never afterwards.
6. **Security-rules testing setup.** `@firebase/rules-unit-testing` needs the emulator running and a `demo-` prefixed project id to stay offline. Tests must run against the emulator in a single command; the plan uses `firebase emulators:exec` so CI-style one-shot runs work on Windows too.
7. **Timezone handling in the timetable.** Firestore Timestamps are UTC instants. The calendar buckets by the viewer's local day, so an entry crossing midnight (a gig ending at 01:00) belongs to two visual days. Decision for MVP: bucket by local `startTime` day and let a block visually overflow its row rather than splitting entries. Revisit only if it looks wrong.
8. **Rules and client permission logic drifting apart.** `src/lib/permissions.ts` duplicates the intent of `firestore.rules`. Mitigation: `tests/unit/permissions.test.ts` and the rules test suite assert the same matrix, so a divergence fails a test.
9. **Recharts and SSR.** Recharts needs the DOM. Chart components are client components; if hydration warnings appear, wrap in `next/dynamic` with `ssr: false`. Unknown until M9.
10. **Scale.** This is a large app for one plan. Milestones are ordered so that M0 to M4 alone produce something genuinely usable (login, band, one-click timer). If time runs out, everything from M7 onward is severable.
11. **Windows path and script portability.** npm scripts must not assume a POSIX shell. Use `cross-env` if env vars are needed inline, and `concurrently` for running emulator plus dev server together.
12. **Firebase Hosting plus Next.js.** Static export cannot serve this app (it needs client routing but also dynamic segments; static export is workable, but `firebase.json` hosting for a full Next.js app implies web frameworks support, which is experimental). Decision: prepare hosting config for the framework-aware path but do NOT attempt a live deploy this session. Note the constraint in `AGENTS.md`.

# Done criteria

- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` all pass from a clean `npm install`.
- `.docs/rules/verification.md` lists those real commands, with no `TBD` remaining.
- `npm run dev:all` starts the Firestore + Auth emulators and the Next.js dev server; the app is fully usable with zero real Firebase credentials.
- A new user can: sign up, create a band, land on the dashboard, and start a timer in **one click** from the dashboard hero once a project exists.
- A running timer survives a full page reload and a navigation to another route, and is visible live to a second signed-in band member without a refresh.
- All nine core features exist and are reachable from the sidebar: dashboard, projects (+ Kanban), time history, timetable, statistics, members, settings.
- `firestore.rules` enforces: only band members read band data; time entries writable by their own user or an admin; band settings and member management admin-only. `npm run test:rules` proves each of those with passing allow and deny cases.
- `firestore.indexes.json` contains an index for every composite query the app issues.
- Functional role and permission role are separate fields end to end, and changing one never changes the other.
- Light and dark mode both look deliberate; no unstyled or default-browser components remain.
- `AGENTS.md` Stack / How to run / Verification / Key paths are filled in, including how to point the app at a real Firebase project instead of the emulator.

# Milestones

## M0 - Toolchain, repo scaffolding, verification rule

Outcome: `npm run dev` serves an empty but correctly configured Next.js app, and `.docs/rules/verification.md` states the real commands.

- [x] Run `npx create-next-app@latest` into the repo root with TypeScript, Tailwind, ESLint, App Router, `src/` dir, and the `@/*` alias; keep npm as the package manager. Verify `package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx` exist.
- [x] Set `"strict": true` and `"noUncheckedIndexedAccess": true` in `tsconfig.json`; confirm `npx tsc --noEmit` passes.
- [x] Add npm scripts to `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `format`.
- [x] Add `.prettierrc` and a `format` script; run it once so formatting is a no-op afterwards.
- [x] Install runtime deps: `firebase`, `recharts`, `date-fns`, `clsx`, `tailwind-merge`, `lucide-react`.
- [x] Install dev deps: `vitest`, `@firebase/rules-unit-testing`, `concurrently`, `cross-env`; add `vitest.config.ts` and a passing placeholder test in `tests/unit/smoke.test.ts`.
- [x] Rewrite `.docs/rules/verification.md`, replacing `TBD` with `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:rules`, one per line with a one-phrase purpose each.
- [x] Extend `.gitignore` with `.env.local`, `firebase-debug.log`, `firestore-debug.log`, `ui-debug.log`, `.emulator-data/`.
- [x] Confirm `npm run build`, `npm run typecheck`, `npm run lint`, `npm test` all succeed.

## M1 - Design system before any feature UI

Outcome: a deliberate token set, typography scale, and primitive component library exist; nothing later needs ad-hoc styling.

- [x] Define the token set as CSS custom properties in `src/app/globals.css`: background, surface, surface-raised, border, text-primary, text-muted, accent (band-warm primary), accent-fg, plus semantic success / warning / danger, each with a light and a dark value under `.dark`.
- [x] Define a fixed 8-value functional-role color palette (used later for member color coding) as tokens, chosen to stay legible on both light and dark surfaces.
- [x] Expose every token through the Tailwind v4 `@theme` block in `src/app/globals.css` so classes read `bg-surface`, `text-muted`, `border-border`; no raw hex values anywhere in components.
- [x] Set the typography scale and load fonts via `next/font` (Space Grotesk display, Inter UI, JetBrains Mono for the clock); apply in `src/app/layout.tsx`.
- [x] Define spacing, radius, and shadow scales in the same `@theme` block; document the intended usage in a comment block above it.
- [x] Build `src/providers/ThemeProvider.tsx` with light/dark/system, persisted to `localStorage`, plus an inline pre-hydration script in `layout.tsx` so there is no theme flash.
- [x] Build UI primitives in `src/components/ui/`: `Button` (primary/secondary/ghost/danger/subtle, sizes, loading state), `Card`, `Input`, `Textarea`, `Select`, `Badge` + `ColorBadge`, `Avatar` + `AvatarStack`, `Dialog` + `ConfirmDialog`, `Skeleton`, `EmptyState`, `Toast` + toast host, `ThemeToggle`.
- [x] Add `src/lib/cn.ts` (`clsx` + `tailwind-merge`) and use it in every primitive.
- [x] Create a `/styleguide` route rendering every primitive in both themes; kept deliberately as the design-system reference.
- [x] Verify `npm run typecheck` and `npm run build` pass, and that `/` and `/styleguide` return 200 from `npm run dev`.

## M2 - Firebase emulator, data model, security rules, rules tests

Outcome: the app talks only to local emulators, the exact given data model is typed, and rules are enforced and proven by tests.

- [x] Write `firebase.json` with emulator config: auth 9099, firestore 8080, hosting 5000, UI 4000, `singleProjectMode: true`; and a hosting block pointing at the Next.js app.
- [x] Write `.firebaserc` with a default alias of `demo-veritrack` (the `demo-` prefix keeps the emulator fully offline).
- [x] Write `.env.example` listing `NEXT_PUBLIC_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID`, and `NEXT_PUBLIC_USE_EMULATOR`, each with a one-line comment; create a matching `.env.local` with demo values.
- [x] Write `src/lib/firebase/client.ts`: singleton `getApps()`-guarded `initializeApp`, exported `auth` and `db`, and emulator connection gated on `NEXT_PUBLIC_USE_EMULATOR === "true"` with a `globalThis.__VERITRACK_EMULATORS_CONNECTED__` flag so Fast Refresh cannot double-connect.
- [x] Write `src/types/models.ts` with `User`, `Band`, `BandMember`, `Project`, `Task`, `TimeEntry` matching the given model field for field, and separate `FunctionalRole` (free string) and `PermissionRole = "admin" | "member" | "viewer"` types.
- [x] Write `src/lib/firebase/paths.ts` with builders for every path in the model (`bandDoc`, `membersCol`, `projectsCol`, `tasksCol`, `timeEntriesCol`, ...); no string-concatenated paths anywhere else in the codebase.
- [x] Write `src/lib/firebase/converters.ts` with a `FirestoreDataConverter` per model that maps `Timestamp` to `Date` on read and back on write.
- [x] Write `firestore.rules`: helper functions `isSignedIn()`, `isMember(bandId)`, `isAdmin(bandId)`, `canWrite(bandId)`, `isBandCreator(bandId)`, `inviteResolves(bandId, code)`; band read for members only; band update/delete admin-only; members subcollection write admin-only except a member updating its own functional role; projects create/update/delete admin-only, read for members; tasks read for members, write for admin and member (not viewer); timeEntries read for members, create/update/delete only when `request.auth.uid == resource.data.userId` or admin; users doc readable by self and writable by self.
- [x] Write `firestore.indexes.json` with the composite indexes listed in Risks item 5.
- [x] Write `tests/rules/helpers.ts`: `initializeTestEnvironment` against `demo-veritrack`, seeded fixtures for an admin, a member, a viewer, and a non-member, plus a helper to write seed data with rules disabled.
- [x] Write `tests/rules/firestore.rules.test.ts` covering, with explicit allow and deny assertions: non-member cannot read band; viewer cannot create a task; member cannot delete a project; member cannot edit another member's time entry; member can edit its own; admin can edit any time entry; only admin can change `permissionRole`; a member can change its own functional role. (45 cases, all green.)
- [x] Add npm scripts: `emu` (`firebase emulators:start --only auth,firestore`), `test:rules` (`firebase emulators:exec --only firestore "vitest run tests/rules"`), and `dev:all` (`concurrently` running `emu` and `dev`).
- [x] Verify `npm run test:rules` passes with every case green.
- [x] Verify `npm run dev:all` starts both emulators and the dev server on Windows.

## M3 - Auth, band creation, band join

Outcome: a user can sign in, create a band as admin, or join one by invite code and pick a functional role.

- [x] Build `src/providers/AuthProvider.tsx` exposing `{ user, loading }` from `onAuthStateChanged`, with a clean unsubscribe on unmount.
- [x] Build `src/app/(auth)/layout.tsx` and `src/app/(auth)/login/page.tsx`: Google sign-in button and email/password form, using M1 primitives and surfacing Firebase auth error codes as human-readable messages.
- [x] Build `src/app/(auth)/signup/page.tsx` for email/password registration with display name.
- [x] Write `src/lib/data/users.ts` with `ensureUserProfile(user)` creating `users/{uid}` (`displayName`, `email`, `photoURL`, `createdAt`, `bandIds: []`) on first sign-in, idempotently.
- [x] Build `src/app/(app)/layout.tsx` as the authenticated guard: redirect to `/login` when signed out, render a loading skeleton while auth resolves, redirect to `/bands` when the user has no band.
- [x] Write `src/lib/inviteCode.ts` generating a readable 8-character code (no ambiguous characters) and normalizing user input.
- [x] Write `src/lib/data/bands.ts` with `createBand({name, description})`: creates `bands/{bandId}`, creates `bands/{bandId}/members/{uid}` with `permissionRole: "admin"` and `status: "active"`, and appends to the user's `bandIds`, all in one `writeBatch`.
- [x] Add `joinBandByInviteCode(code, functionalRole, roleColor)` to `src/lib/data/bands.ts`, including the not-found and already-member cases.
- [x] Build `src/app/(app)/bands/page.tsx`: list of the user's bands, a create-band form, and a join-by-code form.
- [x] Build `src/app/(app)/bands/join/[inviteCode]/page.tsx`: invite landing showing the band, then the onboarding step where the new member picks a functional role and a role color from the M1 palette.
- [x] Build `src/providers/BandProvider.tsx`: active band id persisted in `localStorage`, live `onSnapshot` on the current member doc, exposing `{ band, member, permissionRole, isAdmin }`.
- [x] Write `src/lib/permissions.ts` with `canManageBand`, `canManageMembers`, `canCreateProject`, `canEditTask`, `canEditTimeEntry(entry, member)`, mirroring `firestore.rules` exactly.
- [x] Write `tests/unit/permissions.test.ts` asserting the same allow/deny matrix as the rules tests.
- [x] Build `src/components/layout/Sidebar.tsx`, `TopBar.tsx`, and `BandSwitcher.tsx`; wire them into `src/app/(app)/layout.tsx` with nav entries for all app routes.
- [x] Manually verify end to end against the emulator: sign up, create a band, sign out, sign up as a second user, join by invite code, land in the same band.

## M4 - Dashboard with a working one-click timer (the centerpiece)

Outcome: from the dashboard, starting a timer is one click; it persists across reloads and is visible live to bandmates.

- [x] Write `src/lib/time.ts`: `elapsedMs(start, now)`, `formatClock(ms)` producing `1:23:45`, `formatDuration(minutes)` producing `2h 15m`, and `toMinutes(start, end)` with explicit rounding rules.
- [x] Write `tests/unit/time.test.ts` covering zero, sub-minute, hour rollover, and rounding boundaries.
- [x] Write `src/hooks/useCollection.ts` and `src/hooks/useDocument.ts`: generic `onSnapshot` hooks returning `{ data, loading, error }`, unsubscribing on unmount and on query change.
- [x] Write `src/lib/data/timeEntries.ts` with `startTimer({projectId, taskId?, description?})` creating a `timeEntries` doc with `startTime: serverTimestamp()` and `endTime: null`, and `stopTimer(entryId)` setting `endTime` and computing `duration` in minutes.
- [x] Write `src/hooks/useRunningTimer.ts`: `onSnapshot` on the query `where userId == uid and endTime == null`, plus a `setInterval` ticker that recomputes elapsed from `startTime` on each tick so drift cannot accumulate. Add the required index to `firestore.indexes.json`.
- [x] Enforce single-running-timer: disable start while a running entry exists, and implement the server-side guard chosen in Risks item 4. Append a Log entry recording which approach was taken.
- [x] Build `src/components/timer/ProjectPicker.tsx`: keyboard-navigable project list with an optional task sub-select, remembering the last used project so the common case is genuinely one click.
- [x] Build `src/components/timer/TimerHero.tsx`: the large dashboard element. Idle state shows last-used project preselected and a single prominent Start button. Running state shows a live clock, project name, and Stop. No mandatory fields; description is optional and editable while running.
- [x] Build `src/components/timer/RunningTimerBar.tsx` and mount it in `src/app/(app)/layout.tsx` so the running timer stays visible on every route.
- [x] Build `src/components/timer/TeamActivity.tsx`: `onSnapshot` on all band time entries with `endTime == null`, showing each bandmate's running timer live with their functional-role color.
- [x] Assemble `src/app/(app)/dashboard/page.tsx`: `TimerHero` at the top, then recent activity, open tasks assigned to me, and stat nuggets (today, this week, active projects). Placeholders are acceptable for sections whose data lands in later milestones, but they must render real data as soon as it exists.
- [x] Verify by hand: start a timer, hard-reload the page, confirm it is still running with correct elapsed time; navigate between routes and confirm the bar persists; open a second browser profile as a bandmate and confirm the running timer appears live without a refresh.
- [x] Verify `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`.

## M5 - Projects

Outcome: admins can create and manage projects; everyone sees them, and they feed the timer picker.

- [x] Write `src/lib/data/projects.ts`: `createProject`, `updateProject`, `archiveProject` (status `done`), `deleteProject`, all writing the exact model fields including `color`, `createdBy`, `createdAt`, optional `dueDate`.
- [x] Write `src/hooks/useProjects.ts` subscribing to the band's projects, sorted by status then name.
- [x] Build `src/components/projects/ProjectForm.tsx`: name, description, status, color picker from the M1 palette, optional due date; used for both create and edit in a `Dialog`.
- [x] Build `src/components/projects/ProjectCard.tsx` showing name, color accent, status badge, task counts, and total tracked time.
- [x] Build `src/app/(app)/projects/page.tsx`: card grid with a status filter, a create button visible only when `canCreateProject`, and an `EmptyState` for zero projects that links straight to creation.
- [x] Build `src/app/(app)/projects/[projectId]/page.tsx` header section: project meta, edit and delete actions gated by permission, and a Start timer for this project button.
- [x] Verify a viewer sees projects read-only with no create/edit/delete affordances, and that the rules reject a viewer's direct write attempt.

## M6 - Time tracking complete: manual entries and history

Outcome: retroactive entries for rehearsals and gigs, plus a full editable history of one's own entries.

- [x] Extend `src/lib/data/timeEntries.ts` with `createManualEntry({projectId, taskId?, description, startTime, endTime})` computing `duration`, and `updateEntry` / `deleteEntry` with permission checks.
- [x] Build `src/components/time/ManualEntryForm.tsx`: date, start time, end time (or an explicit duration), project, optional task, description; validate that end is after start and reject overlaps with an existing entry with a clear message.
- [x] Write `src/hooks/useTimeEntries.ts` with `{ scope: "mine" | "band", from, to }` filtering, backed by declared composite indexes.
- [x] Build `src/components/time/TimeEntryRow.tsx` and `TimeEntryList.tsx`: grouped by day, with per-day totals, inline edit and delete for one's own entries, and admin-visible entries clearly attributed to their owner.
- [x] Build `src/app/(app)/time/page.tsx`: history with a week/month range switcher, project filter, a running total, and the manual-entry form in a dialog.
- [x] Add all indexes these queries need to `firestore.indexes.json`.
- [x] Verify by hand: create a manual entry for last Saturday, edit its duration, delete it; confirm a member cannot edit another member's entry (UI hides it, rules reject it).

## M7 - Tasks and Kanban

Outcome: each project has a Kanban board, tasks carry assignees/priority/due date, and a timer starts directly from a task.

- [x] Write `src/lib/data/tasks.ts`: `createTask`, `updateTask`, `moveTask(status)`, `assignTask(userIds)`, `deleteTask`, matching the model exactly (`assignedTo` is an array).
- [x] Write `src/hooks/useTasks.ts` subscribing to a project's tasks grouped by `status`; declare the needed index.
- [x] Build `src/components/tasks/TaskCard.tsx`: title, priority badge, due-date chip (overdue styled distinctly), assignee avatars, and a small Start timer button.
- [x] Build `src/components/tasks/KanbanColumn.tsx` and `KanbanBoard.tsx` with three fixed columns (todo / in progress / done), counts per column, and drag-and-drop between columns that writes `status` on drop.
- [x] Add a no-drag fallback: a status select on each card, so the board is usable on touch and by keyboard.
- [x] Build `src/components/tasks/TaskDialog.tsx`: create/edit with title, description, status, multi-select assignees from band members, priority, due date.
- [x] Mount the board in `src/app/(app)/projects/[projectId]/page.tsx` below the project header.
- [x] Wire the task Start timer button to `startTimer({projectId, taskId})` and confirm the dashboard hero and running bar both reflect it.
- [x] Feed the dashboard's open tasks section from tasks where `assignedTo` array-contains the current user and `status != "done"`; add the index.
- [x] Verify a viewer cannot move cards or open the create dialog, and that the rules reject a viewer write.

## M8 - Timetable calendar

Outcome: a week and month calendar of all band time entries, colored and filterable.

- [x] Write `src/lib/dates.ts`: `startOfWeekLocal`, `endOfWeekLocal`, `monthGrid(date)`, `bucketByLocalDay(entries)`, all explicitly local-timezone, with the midnight-crossing decision from Risks item 7 implemented and commented.
- [x] Write `tests/unit/dates.test.ts` covering week boundaries, month grids that span adjacent months, DST transition days, and an entry crossing local midnight.
- [x] Build `src/components/timetable/CalendarGrid.tsx` with a week view (day columns, hour rows, positioned blocks) and a month view (day cells with stacked compact entries).
- [x] Build `src/components/timetable/EntryBlock.tsx` colored by the active color mode, showing member, project, and duration, with a details popover.
- [x] Build `src/components/timetable/TimetableFilters.tsx`: color-by (person / project), plus filters for member, project, and functional role.
- [x] Build `src/app/(app)/timetable/page.tsx` with week/month toggle, previous/next/today navigation, and a range query over band time entries; add the required index.
- [x] Verify a running (unfinished) entry renders sensibly, and that a 22:00 to 01:00 gig appears where the documented decision says it should.

## M9 - Statistics with Recharts

Outcome: a statistics page answering time per member, per project, per functional role, and project progress.

- [x] Write `src/lib/stats.ts`: pure aggregation functions `totalsByMember`, `totalsByProject`, `totalsByFunctionalRole`, `seriesByDay(range)`, `projectProgress(tasks)`, taking plain arrays so they are trivially testable.
- [x] Write `tests/unit/stats.test.ts` covering empty input, a single entry, multi-member sums, and entries falling outside the range.
- [x] Build `src/components/stats/StatNugget.tsx` (label, big value, delta versus previous period) and reuse it on the dashboard.
- [x] Build `src/components/stats/TimePerMemberChart.tsx` as a Recharts bar chart using the functional-role color tokens.
- [x] Build `src/components/stats/TimeOverTimeChart.tsx` as a Recharts line chart over the selected range.
- [x] Build `src/components/stats/ProjectDistributionPie.tsx` as a Recharts pie chart using each project's own color.
- [x] Build `src/components/stats/ProjectProgress.tsx` showing tasks done versus open per project as stacked bars.
- [x] Build `src/app/(app)/stats/page.tsx` with a total/week/month range switcher, laying out the nuggets and all four charts; ensure all chart components are client components and confirm no hydration warnings (apply the `next/dynamic` fallback from Risks item 9 if needed).
- [x] Confirm charts are legible in both light and dark mode and that tooltips and axis labels use token colors, not Recharts defaults.

## M10 - Members, settings, polish, docs, hosting config

Outcome: admin management works, the app handles empty/error/loading states everywhere, is usable on mobile, and the docs tell a newcomer how to run it and how to switch to a real Firebase project.

- [x] Write `src/lib/data/members.ts`: `updateFunctionalRole`, `updateRoleColor`, `updatePermissionRole` (admin only), `removeMember`, `regenerateInviteCode`.
- [x] Build `src/components/members/MemberRow.tsx` and `RoleSelect.tsx` presenting functional role and permission role as two visually distinct controls, never merged.
- [x] Build `src/components/members/InvitePanel.tsx` with the invite code, a copyable invite link, and a regenerate action, all admin only.
- [x] Build `src/app/(app)/members/page.tsx` listing active and invited members with their role colors and tracked-time totals.
- [x] Build `src/app/(app)/settings/page.tsx`: band name, description, photo URL, and a guarded delete-band action, gated on `isAdmin` with a clear read-only notice for everyone else.
- [x] Add an `EmptyState` to every list surface: no bands, no projects, no tasks, no time entries, no data in the selected stats range.
- [x] Add `Skeleton` loading states to every `onSnapshot`-backed surface so nothing renders a bare blank flash.
- [x] Add `src/app/error.tsx` and `src/app/not-found.tsx`, plus toast-based error surfacing for every write path in `src/lib/data/*`.
- [x] Make the shell responsive: sidebar collapses to a bottom nav under `md`, the timer hero and running bar stay usable at 360px, the Kanban board scrolls horizontally, and the timetable week view is swipeable.
- [x] Final design pass across every route in both themes: consistent spacing rhythm, no default browser controls, focus-visible rings on every interactive element, and a check that no `text-gray-*` or raw hex leaked past the token system.
- [x] Confirm the `firebase.json` hosting block is complete and documented as prepared-but-not-deployed; do not run a real deploy.
- [x] Update `AGENTS.md` current-state sections only: Stack (Next.js App Router, React, TypeScript, Tailwind, Firebase Auth + Firestore, Recharts, Vitest, npm), How to run (`npm install`, `npm run dev:all`, emulator ports, and step-by-step instructions for switching from the emulator to a real Firebase project via `.env.local` and `NEXT_PUBLIC_USE_EMULATOR=false`), Verification (pointing at `.docs/rules/verification.md`), and Key paths (one short phrase per row for `src/app/`, `src/components/`, `src/lib/firebase/`, `src/lib/data/`, `src/providers/`, `tests/`, `firestore.rules`).
- [x] Write a user-facing `README.md` with prerequisites (Node 22, npm, Java for the emulator, firebase-tools), setup, run, and test instructions.
- [x] Final gate: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:rules` all pass from a clean `npm install`; then flip `status:` to `done` with a closing Log entry.

# Log

- 2026-08-09 21:00 M0 done. Scaffolded via `create-next-app` into a temp dir with `--skip-install`, then copied in, because the generator refuses a non-empty repo root (`.claude/`, `.docs/`, `AGENTS.md` are not on its allowed-conflict list). The generator's own `AGENTS.md`/`CLAUDE.md`/`README.md`/`.gitignore` were deliberately NOT copied so the bootstrap docs survived.
- 2026-08-09 21:00 DEVIATION: `create-next-app` now ships Next.js 16.3 + **Tailwind v4**, which has no `tailwind.config.ts` at all (CSS-first config via `@theme` in `globals.css`). The plan's M1 tasks and affected-files table assumed Tailwind v3. Updated both to target `src/app/globals.css`. No functional impact: the token system is identical, only its location moved.
- 2026-08-09 21:00 DEVIATION: installed `recharts@3` instead of `2.x`. npm flagged 2.x as no-longer-maintained on install; v3 is the active branch and supports React 19. Revisit only if a chart API in M9 turns out to be v2-only.
- 2026-08-09 21:00 Dropped `@vitest/coverage-v8` from the M0 dep list: no coverage threshold is part of the done criteria, so it would be an unused dependency. Add it back if a coverage gate is ever introduced.
- 2026-08-09 21:00 `npm run typecheck` fails on a fresh clone until `npm run build` has run once: Next.js 16 generates the global `LayoutProps`/`PageProps` types into `.next/types`, which `tsconfig.json` includes. Verification order in `.docs/rules/verification.md` puts `build` before `typecheck` in practice; noted so a future session does not treat this as a real type error.
- 2026-08-09 21:10 M1 done. Design direction: warm neutrals (paper / near-black, never pure grey) with a single saturated ember accent reserved for primary actions and the running timer, so the timer is the loudest thing on the dashboard by construction. Three fonts: Space Grotesk (display), Inter (UI), JetBrains Mono (the clock, tabular figures so the seconds digit does not reflow). `/styleguide` kept as the living reference.
- 2026-08-09 21:20 M2 DEVIATION (data model): three additive fields, no removals or renames of the agreed model. (1) `BandMember.displayName` / `.photoURL` denormalized, so `users/{uid}` can stay owner-only readable while the members / timetable / stats views still render names in one query instead of one read per user. (2) `Task.bandId` / `.projectId` denormalized, required for the dashboard's `collectionGroup("tasks")` "assigned to me" query, which otherwise spans every band. (3) `BandMember.viaInviteCode`, see next entry.
- 2026-08-09 21:20 M2 ADDITION: a top-level `inviteCodes/{code}` lookup collection. Without it joining is impossible: band documents are readable only by members, so a prospective member cannot query `bands` by `inviteCode` to find the band. The rules let any signed-in user `get` a single code (never `list`, which would leak every band's invite) and require `viaInviteCode` on member creation to resolve to that band. Useful consequence: regenerating a code deletes the old lookup document, which genuinely revokes old invite links and stops a removed member rejoining with a bandId they still remember.
- 2026-08-09 21:20 M2 DEVIATION: `createBand` does NOT use a single `writeBatch` as planned. Firestore evaluates every write in a batch against the pre-batch state, so a member document created in the same batch as its band cannot pass a rule that reads the band's `createdBy`. Band, invite-code and member documents are therefore written sequentially. Cost: a failure between writes can leave an orphan band. Accepted for MVP; the band is invisible to everyone (not even its creator is a member yet) so it is inert rather than harmful.
- 2026-08-09 21:20 M2 note: the emulator logs "evaluation error" alongside several denials. Cause is eager evaluation of alternative rule branches (a `set()` on a new document is checked against the update rule too, where `resource` is null). Every such case still resolves to a deny and all 45 assertions hold. Added a `resource != null` guard on the member update rule where it was cheap; the rest is cosmetic emulator noise, not a rules defect.
- 2026-08-09 21:00 Added `.claude/` to `.prettierignore` after the first `npm run format` reformatted every agent definition file (markdown tables, list numbering). Agent files are prompt text, not source; churn there is pure noise.
- 2026-08-09 21:35 M3 done. Auth, band creation and invite-based joining work end to end against the emulators, verified in a real browser with two separate accounts.
- 2026-08-09 21:35 BUG found by end-to-end test, not by unit tests: joining a band failed with PERMISSION_DENIED before any write happened. `joinBandByInviteCode` pre-checks "am I already a member?" with a `getDoc` on the member document, but the read rule required membership, so the check was denied for exactly the people it exists for. Fixed by allowing a user to read their OWN member document (`isMember(bandId) || request.auth.uid == memberId`); reading somebody else's still requires membership. Two rules tests added for both halves.
- 2026-08-09 21:35 DECISION (Risks item 4, single running timer): enforced in `startTimer`, which stops any open entry for that user before creating a new one, rather than in the rules. The rules cannot express "this user has no other open entry" without a denormalized field plus a second non-atomic write, and that write could fail independently. Pleasant side effect: switching project is one click instead of stop-then-start. Residual risk is two devices starting in the same instant, which yields two open entries the history screen can fix.
- 2026-08-09 21:50 M4 verified in a real browser: start from the dashboard is one click with the project preselected; the timer survives a hard reload and keeps counting (0:00:02 -> 0:00:06 across the reload); it stays visible as a bar on other routes; and a second signed-in member sees it live with no refresh.
- 2026-08-09 22:05 React Compiler lint (new in Next.js 16) rejected setState-inside-effect across ten files. Rather than suppressing it, the patterns were reworked: `useCollection`/`useDocument` swap queries in the render phase; localStorage moved to `useSyncExternalStore` (`src/hooks/useLocalStorage.ts`), which also removed the hydration-mismatch risk; the timer's preselected project and the dialog draft re-seeding became derived values. The rule was right; the code is simpler now.
- 2026-08-09 22:20 M9 DEVIATION: the role/project palette was hand-picked by eye and FAILED the dataviz validator on three of six checks (a teal below the chroma floor, ember/amber indistinguishable under deuteranopia, indigo/blue too close even for normal vision). Re-solved: slot ORDER is now load-bearing, alternating "reads yellow" and "reads blue" under deuteranopia and routed to avoid the specific problem pairs. Both light and dark sets now pass all six checks against their own surface. Dark is separately chosen, not a lightened light: the dark lightness band is narrower (L 0.48-0.67) and naive lifting pushes every hue out of it.
- 2026-08-09 22:35 Timetable fix found by looking at a screenshot rather than by a test: simultaneous entries were absolutely positioned on top of each other, so a band rehearsing together showed only whoever was drawn last. Added cluster-based lane layout so overlapping blocks sit side by side; an isolated entry still gets the full column width.
- 2026-08-09 22:35 Chart axes read "0h 1h 3h 4h 5h" because the data is in minutes and Recharts' automatic ticks landed on values like 75 and 225, which the hour formatter then collapsed. Ticks are now chosen explicitly on whole hours (`hourTicks`).
- 2026-08-09 22:50 M5-M7 verification: manual entries create, preview their duration, reject an overlapping range with a visible message and a disabled save button, edit and delete. Viewer restrictions confirmed in the browser: no create-project button, no timer (with an explanation instead), no add-task control, no timer on the project header, and no edit control on another member's entry. The rules independently deny each of those writes.
- 2026-08-09 22:55 `npm run dev:all` verified on Windows: one command, emulators plus Next.js, ports 3000, 4000 and 8080 all reachable.
- 2026-08-09 23:00 Final gate green from a clean state: `npm run build`, `npm run typecheck`, `npm run lint`, 72 unit tests, 47 security-rules tests. Plan complete.

- 2026-08-09 23:20 REVIEW ROUND. The reviewer found two live privilege-escalation paths that all 47 existing rules tests missed, because every one of them exercises a single operation while both holes need a SEQUENCE. Reproduced both against the emulator in `tests/rules/escalation.test.ts` (4 of 12 cases failed before the fix) rather than taking the report on trust.
  1. A viewer could delete their own member document (leaving is allowed) and immediately re-create it as `member` using the invite code, which members can read straight off the band document. Demotion to viewer was therefore unenforceable and the whole role decorative. Fixed by limiting self-deletion to `permissionRole == 'member'`: a viewer or an admin now leaves only via an admin.
  2. `isBandCreator` was derived from the immutable `createdBy`, so the creator's admin-seed branch stayed open forever. A founder who had been demoted or removed could delete-and-recreate their membership as admin. Fixed with a one-way `seeded` latch on the band, flipped to true by `createBand` right after seeding and, per the band update rule, never allowed back to false.
- 2026-08-09 23:20 Also from the review: the rules let an admin change their OWN `permissionRole`, while `src/lib/permissions.ts` and `src/lib/data/members.ts` both claimed the opposite. Exactly the client/rules drift Risks item 8 was meant to prevent, and both suites passed while disagreeing. The rules now deny it, so a band cannot be left adminless by a client that skips the UI.
- 2026-08-09 23:20 Index fix: the dashboard's `collectionGroup("tasks")` query filters on `bandId` plus `array-contains` with no `orderBy`, so it needs `(bandId, assignedTo)`. The declared index carried a trailing `dueDate`, which orders the index by a field the query never sorts on and would have failed with FAILED_PRECONDITION against a real project while passing locally (the emulator does not enforce indexes). Three further declared indexes matched no query the code issues and were removed; dead declarations disguise the real gaps.
- 2026-08-09 23:20 Correctness fixes from the review: a manual entry with identical start and end silently became a 24-hour entry, because the midnight rollover fired on `<=` and made the zero-length check unreachable (now `<`, and `addDays` instead of a literal +24h so it survives DST). The overlap check now also considers a still-running entry. `useTimeEntries` applies a real `limit()` instead of slicing client-side, so the dashboard no longer subscribes to a user's entire history to show six rows. `AuthProvider` no longer holds the whole app behind a Firestore round-trip on every load. `BandProvider` self-heals a stale `bandIds` entry after the user is removed from a band, which previously left them staring at an empty shell with no way out.
- 2026-08-09 23:25 Post-fix gate: build, typecheck and lint clean, 74 unit tests, 59 rules tests (12 of them the new sequence attacks). Core flow re-verified in a browser: band creation still works through the new `seeded` latch, invite joining still works, and the viewer restrictions still hold.

## Completion

Veritrack is built and runs entirely on the Firebase emulators with no real credentials.

- **Auth and bands**: email/password and Google sign-in, band creation (creator becomes admin), and joining through an 8-character invite code that a lookup collection resolves. Regenerating the code revokes old links.
- **The timer**: one click from the dashboard with the last-used project preselected. It is a Firestore document, so it survives reloads, appears as a persistent bar on every route, and is visible live to the whole band. Starting a new one stops the old one.
- **Projects and tasks**: card overview with status filters, detail view with a three-column Kanban board, drag and drop plus a keyboard/touch-accessible status select, multi-assignee, priority and due dates, and a timer startable from a task.
- **Time tracking**: live timer and retroactive manual entries with overlap detection, plus an editable history grouped by day with week/month navigation and per-day totals.
- **Timetable**: week and month calendar across the band, coloured by person or project, filterable by member, project and functional role, with overlapping entries laid out in lanes.
- **Statistics**: totals per member, per project and per functional role, a daily series, project progress, and a period comparison, all on a colour-vision-validated palette with legends and table fallbacks.
- **Members and settings**: functional role and permission role managed as two deliberately separate controls, invite panel, member removal, leaving a band, band settings and deletion, all admin-gated.

Security rules enforce the whole permission matrix server-side and are covered by 47 emulator-backed tests; `src/lib/permissions.ts` mirrors them for the UI and is asserted against the same matrix by unit tests.
