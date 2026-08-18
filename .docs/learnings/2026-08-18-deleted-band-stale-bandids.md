---
date: 2026-08-18
tags: [firestore, denormalization, bands, bandIds, onSnapshot]
severity: medium
applies-to: [src/lib/data/bands.ts, src/lib/data/users.ts, src/providers/BandProvider.tsx, src/components/layout/BandSwitcher.tsx]
---

Deleting a band removed the band document and invite-code lookup, but left the id in `users/{uid}.bandIds`. The BandSwitcher lists `profile.bandIds`, not live band documents, so the ghost stayed as "…" and selecting it set `activeBandId` to a missing parent. Every band-scoped query then ran against nothing.

`leaveBand` and `removeMember` already call `removeBandFromUser`. `deleteBand` did not. The deleter can only write their own profile; other members' leftover ids need a client prune.

BandProvider already dropped a stale id on `permission-denied`. That covers a kick (member doc gone, `get` denied). It does not cover a deleted band: leftover `members/{uid}` docs still satisfy `isMember()`, so `onSnapshot` of the missing band succeeds with `exists() === false` and no error. Self-heal that only listens for `permission-denied`, or only for the *active* band, misses ghosts sitting in the list after the user creates a new band.

The fix: `deleteBand` calls `removeBandFromUser` for the deleter. `StaleBandPruner` watches every `bandIds` entry and drops it if the snapshot is missing (no error) or permission-denied. BandSwitcher does not offer a clickable row for a missing document (loading may show "…"; a resolved miss returns null).

Next time:

- A denormalized membership list is not updated by deleting the target document. The write that creates the pointer (`addBandToUser`) needs a matching cleanup on delete and leave, plus a client self-heal for profiles this client cannot write.
- Firestore `onSnapshot` of a missing document the rules still allow to `get` is success-with-null, not permission-denied. Treat `!data && !error` after loading as a real miss.
- Do not treat "…" / fallback labels as harmless loading UI when the row can still call `setActiveBandId`.
