---
date: 2026-08-14
tags: [timer, ux, description, friction, product]
severity: medium
applies-to: [src/components/timer/TimerHero.tsx, src/lib/data/timeEntries.ts, planner, implementer]
---

The dashboard timer is the product centrepiece: extra friction on Start is a regression. This feature swapped the required gate from project to description. Start can no longer be a pure one-click; typing a description is an intentional extra keystroke.

Mitigations that kept the contract acceptable:

- Autofocus the description field (`autoFocus`, no effect).
- Keep last project (including none) preselected; first visit still defaults to the first trackable project.
- Enter in the description field starts when trim is non-empty.
- Do not remember last description (stale text is wrong more often than helpful).
- Secondary paths differ on purpose: Kanban still one-clicks with `task.title`; project-detail Start opens a short description dialog instead of silently using the project name.

Next time:

- If you change what Start requires, re-read the TimerHero file comment and budget autofocus + Enter + last-selection restore before calling the UX done.
- Soften any "one-click" product copy so it does not claim Start works with an empty description.
- Do not paper over a missing required field by inventing silent text (project name as description). Prompt or refuse.
