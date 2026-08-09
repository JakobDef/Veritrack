# Project Instructions for AI Agents

> Bootstrapped by nohell v9

This file (`AGENTS.md`) is the routing index for any AI agent working in this repo, and the single source of truth for project instructions. `CLAUDE.md` is a thin pointer that imports this file so Claude Code loads it automatically; all real content lives here. Non-Claude agents: read this file in full before doing anything else.

## Session start protocol

A SessionStart hook (`.claude/hooks/session-start.ps1`) injects the project context into every fresh session automatically: all hard rules from `.docs/rules/`, every high-severity learning plus the three most recent, and any `status: in-progress` plan. Trust that injection; do not re-read those files at session start.

At the start of a fresh session:

1. Confirm the hook context block (`## Project context (auto-injected...)`) is present. If it is missing, the hook is broken: say so, then fall back to reading `.docs/rules/` in full, the three most recent files in `.docs/learnings/`, and globbing `.docs/plans/*.md` for `status: in-progress` yourself.
2. If the hook surfaced an in-progress plan, apply the Resume protocol below before any new work.
3. If the user opened with just a greeting, reply `Ready to work.` (plus the one-line resume summary if an in-progress plan exists). No other ceremony.

## Targeted re-reads (during work)

The hook covers session start. During work, re-read selectively:

- Before touching an area that plausibly has an older learning (auth, payments, a fragile module), Grep `.docs/learnings/` for matching tags and read the hits.
- Before an action a specific rule governs, re-open that one rule file, not the whole directory.
- Do not re-read this file or all of `.docs/rules/` per task. Once per session is the contract.

## Resume protocol (check before starting any new work)

Sessions get interrupted. The session-start hook surfaces any plan with `status: in-progress`. When one exists:

1. Surface it to the user with: filename, goal, the next unchecked `- [ ]` task, and the most recent Log entry.
2. Ask the user: resume the in-progress plan, switch to the new request (leaving the old plan in-progress), or abandon it (set `status: abandoned` with a Log entry explaining why).
3. Do not silently start fresh work while a plan is in-progress.

If the user's request is itself the continuation of an existing plan, jump straight to the implementer with that plan path.

See `.docs/rules/plan-execution.md` for the full plan format and execution protocol.

## Repository layout for AI machinery

```
.claude/
├── settings.json        permissions, hooks, agent registration
├── agents/              subagent definitions (YAML frontmatter)
├── commands/            slash commands
└── hooks/               session-start hook script

.docs/
├── plans/               implementation plans, one per task
├── learnings/           append-only lessons from past sessions
├── rules/               hard rules, more granular than this file
└── research/            researcher agent's findings
```

Anything markdown that is not user-facing documentation goes in `.docs/`. User-facing docs (README, CONTRIBUTING) stay at the root or in a `docs/` (no leading dot) folder.

Always start Claude Code from this repo's root, not from a parent folder. Sessions started from a parent directory may register agents and instructions from OTHER projects; agents in the harness list that are not in this repo's `.claude/agents/` are foreign and must not be used for this project's work.

## Available agents

Project agents in `.claude/agents/` register natively: dispatch them by name via the Agent tool.

| Agent         | When to call                                       | Output                                                          |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `planner`     | Before any non-trivial change                      | `.docs/plans/YYYY-MM-DD-<slug>.md`                              |
| `implementer` | After a plan exists                                | Code changes, completion note on the plan                       |
| `reviewer`    | After implementer finishes                         | Severity-tagged findings; hunts escalation sequences, policy drift, wrong indexes, render-only defects |
| `researcher`  | When you need codebase or external context         | `.docs/research/YYYY-MM-DD-<slug>.md`                           |
| `debugger`    | When something is broken and root cause is unclear | Root cause analysis + proposed fix                              |
| `learner`     | After a meaningful task, OR via `/learn`           | New entries in `.docs/learnings/`, edits to agents or AGENTS.md |

<!-- Project-tailored agents (added by Phase 2 for existing repos) are appended to this table. -->

### Routing heuristics

- "Build me X" / "let's add feature X" of any non-trivial size: `planner` -> `implementer` -> `reviewer` -> `learner`. The planner writes a milestone+checkbox plan to `.docs/plans/`; the implementer ticks boxes live as it goes. The `reviewer` reads but never writes: it names the reproducing test, and the `implementer` writes it and the fix.
- Anything touching `firestore.rules`, `firestore.indexes.json`, or `src/lib/permissions.ts`: always run `reviewer` afterwards, even for a one-line change. See `.docs/rules/firestore-rules-changes.md`.
- "Continue / resume / pick up where we left off": find the `status: in-progress` plan in `.docs/plans/`, hand it to `implementer`.
- "Fix this bug": `debugger` -> `implementer` (to apply the fix) -> `learner`.
- "Where is X / how does Y work": `researcher`.
- "I just corrected you / that detour was painful / we discovered a constraint": invoke `learner` immediately, or run `/learn`.

If the user says any of "learn from that", "remember this", "don't make that mistake again", "save this lesson" - invoke the `learner` immediately. The slash command `/learn` does the same thing.

## Self-improvement loop (this is core, do not skip it)

After completing any non-trivial task, invoke the `learner` subagent. Non-trivial means at least one of:

- Involved a bug fix
- Made an architecture or design decision
- Surfaced a constraint that was not previously documented
- Cost time on a wrong turn
- Was corrected by the user

The learner has permission to edit `.claude/agents/**`, `.docs/**`, and `AGENTS.md` without asking. Let it.

If you finish a task and decide it does not warrant invoking the learner, that is fine, but the default is to invoke it.

## Hard conventions

- Plans live in `.docs/plans/`. Filename format: `YYYY-MM-DD-<short-slug>.md`. Format and execution protocol defined in `.docs/rules/plan-execution.md`. Plans carry `status:` and `base:` frontmatter, milestone+checkbox bodies, and an append-only Log.
- Learnings live in `.docs/learnings/`. Filename format: `YYYY-MM-DD-<short-slug>.md`. Frontmatter required (`date`, `tags`, `severity`, `applies-to`).
- Rules live in `.docs/rules/`. One concept per file. Short, imperative. The session-start hook injects every rule into every session, so rules carry a permanent context cost: add one only when it truly is non-negotiable.
- Research notes live in `.docs/research/`. Filename format: `YYYY-MM-DD-<short-slug>.md`.
- Never modify `.docs/rules/` casually. Rules are promoted from learnings or added by the user.
- Never delete from `.docs/learnings/`. The learner can supersede an old learning by writing a newer one and editing the old one to add a `superseded-by:` line in frontmatter.
- This file documents current state only, never version history. See `.docs/rules/docs-current-state-only.md`: no changelog sections, and the Key paths table stays lean.

### Agent docs must stay in sync (non-negotiable)

If you add, remove, rename, or change the behavior of any file in `.claude/agents/`, you MUST update in the same commit/turn:

1. The **Available agents** table above (add/remove/edit the row).
2. The **Routing heuristics** subsection above (add/remove/edit the line that mentions the agent).

This file (`AGENTS.md`) is the single source of truth; `CLAUDE.md` is only a pointer and needs no update. A change to an agent file without a corresponding doc update is an incomplete change. Reviewer agent: flag this as a **blocker** finding if you ever see it. Learner agent: if you find them out of sync from a past session, fix it as your first action.

This rule applies to any agent that edits `.claude/agents/` (including the learner editing itself).

### Commit and PR hygiene (non-negotiable)

- **Never co-author commits as an AI model.** Do not add `Co-Authored-By: Claude`, `Co-Authored-By: AI`, `Co-Authored-By: GPT`, or any similar trailer to commit messages. Do not add equivalent attributions in PR descriptions or release notes. The user is the sole author. This default is permanent unless the user explicitly says "credit Claude as co-author on this commit" or similar for a specific instance.
- **Never include "Generated with Claude Code" or equivalent footers** in commits, PR bodies, issue comments, or any other written artifact unless the user explicitly asks for it.
- **No emojis in commit messages.** Stick to plain text.
- **No em dashes in commit messages, PR bodies, or any prose this project produces.** Use periods, commas, parentheses, or colons instead.

## Project-specific section

Veritrack is a band collaboration web app: members and roles, one-click time tracking, projects, a Kanban board, a shared timetable and statistics. The dashboard timer is the product's centre of gravity, not one feature among many; a change that adds friction to starting a timer is a regression.

### Stack

- Next.js 16 (App Router) with React 19 and TypeScript in strict mode (`noUncheckedIndexedAccess` on)
- Tailwind v4, configured CSS-first: design tokens live in an `@theme` block inside `src/app/globals.css`, there is no `tailwind.config.ts`
- Firebase Auth + Firestore through the client SDK only; no server SDK, no API routes
- Recharts 3 for the statistics charts, date-fns for all date maths
- Vitest for unit tests, `@firebase/rules-unit-testing` for security-rules tests
- npm as the package manager (there is no pnpm on this machine)

### How to run

```
npm install
npm run dev:all      # Firebase emulators (auth 9099, firestore 8080, UI 4000) plus Next.js on 3000
```

`npm run dev` on its own starts only the web app and cannot reach Firebase. The emulator needs Java on PATH.

Development runs entirely against the emulators, so no real Firebase credentials are required. `.env.local` holds placeholder values plus `NEXT_PUBLIC_USE_EMULATOR=true`.

**Switching to a real Firebase project**

1. Create the project, add a Web app, and copy its config into `.env.local` (all six `NEXT_PUBLIC_FIREBASE_*` values). `.env.example` documents each one.
2. Set `NEXT_PUBLIC_USE_EMULATOR=false`. That single flag is what stops the SDK pointing at `127.0.0.1`.
3. Enable Authentication, Sign-in method, then Google and Email/Password.
4. `firebase use <project-id>`, then `firebase deploy --only firestore` to publish `firestore.rules` and `firestore.indexes.json`. The emulator does not enforce composite indexes, so a query that works locally can still fail in production if its index was never declared.
5. Hosting config exists in `firebase.json` but has deliberately never been deployed. It uses the framework-aware path (`"source": "."`), which is the experimental Next.js integration: try it against a staging project before pointing a domain at it.

### Verification

See `.docs/rules/verification.md` for the commands and the order to run them. Short version: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`, `npm run test:rules`.

### Key paths

| Path | Purpose |
|------|---------|
| `src/app/(auth)/` | Login and signup, unauthenticated shell |
| `src/app/(app)/` | Authenticated shell and every product route |
| `src/components/ui/` | Design-system primitives, no feature logic |
| `src/components/timer/` | Dashboard timer, project picker, persistent bar |
| `src/lib/firebase/` | Client singleton, typed path builders, converters |
| `src/lib/data/` | All Firestore writes, one module per collection |
| `src/lib/` | Pure helpers: time, dates, stats, permissions, colors |
| `src/providers/` | Auth, active band and theme context |
| `src/hooks/` | `onSnapshot` subscriptions and local storage |
| `firestore.rules` | Security rules, mirrored by `src/lib/permissions.ts` |
| `tests/rules/` | Emulator-backed rules tests |
| `src/app/styleguide/` | Every primitive rendered in both themes |

### Conventions that are easy to get wrong

- **Reads go through converters, writes go through `withConverter(null)`.** Write payloads carry `serverTimestamp()` and `arrayUnion()` sentinels and never carry `id`; forcing them through the read converter only produces casts.
- **The two role concepts never merge.** `role` is functional and cosmetic ("Gitarre"); `permissionRole` is `admin | member | viewer` and is the only thing that grants rights. Separate fields, separate UI controls, separate update functions in `src/lib/data/members.ts`.
- **Memoize every Firestore query** before it reaches `useCollection`. It compares with `queryEqual`, but an unmemoized inline query still churns the memo on every render.
- **No raw hex or Tailwind palette colors in components.** Add a token to `globals.css` instead. The `role-1..8` slot order is validated for colour-vision separation between neighbouring slots, so re-run the palette validator before reordering or restyling it.
- **Dates are local-time throughout.** Firestore Timestamps are UTC instants; the calendar and every per-day total bucket by the viewer's local day via `src/lib/dates.ts`. An entry crossing midnight belongs entirely to its start day.
- **Starting a timer stops any timer already running for that user.** That is the single-running-timer guard and it also makes "switch project" one click. It lives in `startTimer`, not in the rules.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
