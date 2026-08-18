---
date: 2026-08-14
tags: [localStorage, null, sentinel, useLastProject, timer]
severity: medium
applies-to: [src/hooks/useLastProject.ts, src/hooks/useLocalStorage.ts, src/components/timer/TimerHero.tsx]
---

`useLastProject` used to treat `null` as "clear storage". After optional projects, remembering "Kein Projekt" must survive reload. Removing the key means "not remembered", which falls back to the first trackable project and undoes the user's choice.

Fix: persist none as `UNASSIGNED_PROJECT_KEY` (`"__unassigned__"`). Read path maps that sentinel to `null`. Missing key maps to `undefined` (not remembered). Same three-way split in TimerHero picker state: `chosenProjectId` is `undefined` (untouched), `null` (user picked none), or a string id. Collapsing null and undefined makes "picked none" indistinguishable from "never picked".

Next time:

- localStorage cannot store JSON null as a distinct remembered value if your hook already uses "absent key" for unset. Use an explicit sentinel string.
- In React selection state that also reads from memory, reserve `undefined` for untouched and `null` for intentional none. Derive the effective selection; do not sync with a `useEffect`.
