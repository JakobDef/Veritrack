---
date: 2026-08-18
tags: [profile, auth, denormalization, members]
severity: medium
applies-to: [src/lib/data/users.ts, src/lib/data/members.ts, src/app/(app)/account/page.tsx]
---

`updateDisplayName` and `syncMemberProfile` existed since MVP with no page calling them. `/account` is now that page. The save path is `updateOwnProfile`, not those two helpers in isolation.

A profile change has three copies: Firebase Auth `updateProfile`, `users/{uid}`, and a denormalized `displayName` / `photoURL` on every `bands/{bandId}/members/{uid}` in `bandIds`. Roster and sidebar read the member copy, not the user doc. Writing only Auth or only `users/{uid}` leaves stale names on Mitglieder.

Photo is a URL string, same pattern as the band photo. There is no Firebase Storage in this project. Do not add an upload path unless a plan says so.

`updateOwnProfile` fans out with `Promise.all` and swallows member writes that fail (stale `bandIds`). `updateDisplayName` only touches the user doc. `syncMemberProfile` only touches one member doc.

Next time: name/photo UI goes through `updateOwnProfile`. New profile fields that appear on member lists must be part of that fan-out. Do not introduce Storage for avatars.
