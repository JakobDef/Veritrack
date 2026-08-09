# Rule: Verification commands

Run these from the repo root, in this order. The first three are the fast gate; run all five before calling a milestone done.

```
npm run typecheck    # TypeScript is sound (tsc --noEmit, strict + noUncheckedIndexedAccess)
npm run lint         # ESLint flat config (next/core-web-vitals) is clean
npm run build        # Next.js production build compiles, no SSR/hydration blowups
npm test             # Vitest unit tests (tests/unit): time, dates, permissions, stats
npm run test:rules   # Firestore security rules against the emulator (tests/rules)
```

Notes that matter:

- `npm run test:rules` boots the Firestore emulator via `firebase emulators:exec`. It needs Java on PATH. If it fails with a port-in-use error, a `npm run emu` or `npm run dev:all` session is already running: stop it first.
- The Firestore emulator does NOT enforce composite indexes. A query that passes locally can still fail against a real project, so every composite query must be declared in `firestore.indexes.json` when it is written, not afterwards.
- `npm run build` is the only check that catches a Firebase client-SDK import leaking into a server component. Do not skip it.

The implementer runs these after every code-changing task; the reviewer runs them before approving. If a command here stops matching reality, fix this file in the same change.
