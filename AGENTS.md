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
| `reviewer`    | After implementer finishes                         | Structured review with severity findings                        |
| `researcher`  | When you need codebase or external context         | `.docs/research/YYYY-MM-DD-<slug>.md`                           |
| `debugger`    | When something is broken and root cause is unclear | Root cause analysis + proposed fix                              |
| `learner`     | After a meaningful task, OR via `/learn`           | New entries in `.docs/learnings/`, edits to agents or AGENTS.md |

<!-- Project-tailored agents (added by Phase 2 for existing repos) are appended to this table. -->

### Routing heuristics

- "Build me X" / "let's add feature X" of any non-trivial size: `planner` -> `implementer` -> `reviewer` -> `learner`. The planner writes a milestone+checkbox plan to `.docs/plans/`; the implementer ticks boxes live as it goes.
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

This repo is greenfield: an empty directory at bootstrap time, with no source, no manifest, and no chosen stack. The entries below are placeholders on purpose. Fill them in (and update `.docs/rules/verification.md` in the same change) as soon as the stack is chosen and the first code lands. Do not treat the placeholders as facts.

### Stack

Not yet chosen. Nothing is installed and no manifest exists.

### How to run

No dev, build, or start command exists yet.

### Verification

No verification commands exist yet. See `.docs/rules/verification.md`, which must be filled in with the real typecheck / lint / test commands the moment a toolchain is added.

### Key paths

| Path        | Purpose                                            |
| ----------- | -------------------------------------------------- |
| `.claude/`  | AI machinery: agents, commands, hooks, permissions |
| `.docs/`    | Plans, learnings, rules, research                  |
| `AGENTS.md` | Project instructions (single source of truth)      |

Source, test, and asset paths get added here once they exist.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
