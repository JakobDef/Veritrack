---
date: 2026-08-18
tags: [money, payout, rounding]
severity: medium
applies-to: [src/lib/money.ts, src/lib/payout.ts, src/lib/data/payouts.ts, src/app/(app)/settings/page.tsx]
---

Band hourly rate and payout amounts are integer euro-cents (`hourlyRateCents`, `amountCents`). 0 means unset. Never store euros as a float. Parse at the Settings input with `eurosToCents` (comma or dot); display with `formatEur`. `payoutAmountCents` multiplies minutes by cents then divides by 60 so the only rounding is the last `Math.round` (JS half-up on positives, not banker's).

Open hours use the current `Band.hourlyRateCents`. Mark-paid writes a payout document with snapshotted `minutes`, `hourlyRateCents`, and `amountCents`. History must not recompute from the live rate: changing the Stundenlohn would rewrite past Abrechnungen.

Next time: new money fields go through `src/lib/money.ts`. If a rate can change, snapshot the amount at settlement time. Do not keep a running euro float and round at display.
