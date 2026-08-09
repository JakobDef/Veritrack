# Rule: Changing firestore.rules

`firestore.rules` is the ONLY server-side authorization boundary in this app. There is no server SDK and no API route, so anything the rules allow, any signed-in user can do with a console and the client SDK. Treat every edit to it as a security change.

Four things are mandatory for any change to `firestore.rules`:

1. **Test the sequence, not just the operation.** A rules test that performs one read or one write proves almost nothing. For every rule that grants a write, ask: what does the actor reach if they first delete something, or leave and rejoin, or write a legitimate intermediate document? Add the multi-step case to `tests/rules/escalation.test.ts`. Both privilege escalations found in this repo were chains of individually legitimate writes.
2. **Never derive a grant from an immutable field.** `createdBy`, an id, or anything else that never changes produces a permission that can never be revoked. Bootstrap grants must be closed by a one-way latch (see `seeded` on the band document, which the rules allow to go false -> true and never back).
3. **Update `src/lib/permissions.ts` in the same change.** It mirrors the rules for the UI. The two test suites do not detect drift between them: they were written from the same intent and can both pass while the rules and the mirror disagree. Read both files side by side and state the resulting matrix in the commit or plan Log.
4. **Re-run the join and band-creation flows in a browser.** Rules that gate reads also break client pre-checks. `joinBandByInviteCode` reads its own member document before writing; a read rule that looked correct denied exactly the users the check exists for, and no unit or rules test saw it.

Reproduce any reported rules hole against the emulator with a failing test before fixing it. Do not fix on report alone.
