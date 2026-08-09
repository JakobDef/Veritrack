---
date: 2026-08-09
tags: [nextjs, react, hooks, lint]
severity: low
applies-to: [src/hooks/**, src/providers/**, src/components/**]
---

Next.js 16 ships React Compiler lint rules, and they reject `setState` inside `useEffect`. That pattern appeared in ten files on first write and `npm run lint` failed on all of them. Do not suppress the rule; the reworked code is smaller and fixed real bugs. The three replacements already used in this repo, in preference order:

- **Derived value instead of synced state.** The timer's preselected project and the dialog's draft re-seeding were computed during render rather than pushed into state from an effect.
- **Render-phase update for query identity.** `useCollection` / `useDocument` swap the subscribed query during render (the legitimate "adjust state when a prop changes" pattern) instead of reacting to it in an effect.
- **`useSyncExternalStore` for anything outside React.** `src/hooks/useLocalStorage.ts` reads localStorage through it. This also removes the hydration-mismatch risk that the read-in-effect version was working around.

If a new hook trips this rule, copy one of those three shapes before reaching for `eslint-disable`. There is no `eslint-disable` for a React Compiler rule anywhere in `src/` (the only disable in the tree is `@next/next/no-img-element` in `src/components/ui/Avatar.tsx`, for arbitrary remote avatar URLs) and it should stay that way.
