---
date: 2026-08-18
tags: [nav, permissions, ui]
severity: medium
applies-to: [src/components/layout/nav.ts, src/components/layout/Sidebar.tsx, src/components/layout/MobileNav.tsx]
---

`NavItem.adminOnly` existed on the type and nobody read it. Sidebar and MobileNav rendered every item. Setting `adminOnly: true` on Abrechnung would have shown the link to members. MobileNav did not call `useBand`, so it had no `can` to filter with.

A flag on a type is not a gate. Both renderers must skip `adminOnly` items unless `can.isAdmin`. The page still redirects after membership loads (`router.replace("/dashboard")`), because a typed URL bypasses nav. Keep that check on the page, not in `(app)/layout.tsx` (layout stays band/auth only).

Next time: when you add a capability flag, grep every map of that list in the same change. Sidebar and MobileNav are separate surfaces; both need the filter and the same `can` source.
