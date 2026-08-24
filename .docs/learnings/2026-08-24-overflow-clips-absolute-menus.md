---
date: 2026-08-24
tags: [ui, overflow, absolute, menus, timer, dialog]
severity: medium
applies-to: [src/components/timer/TimerHero.tsx, src/components/timer/ProjectPicker.tsx, src/components/layout/MobileNav.tsx, src/components/layout/BandSwitcher.tsx, src/components/ui/Dialog.tsx, implementer]
---

Two surfaces in the same session hid dropdown options behind a clipping ancestor. The ProjectPicker listbox is `absolute` inside TimerHero's `<section>`. That section used `overflow-hidden` to crop the running-state accent bar to rounded corners, so with several projects only the first few rows were visible. The listbox already had `max-h-64 overflow-y-auto`; that only scrolls if a parent does not clip first.

The mobile BandSwitcher in the "Mehr" sheet is the same class: an absolutely positioned menu inside a dialog body that defaulted to `overflow-y-auto`. Options below the sheet's visible height could not be reached.

Fixes that worked without a portal:

- TimerHero: apply `overflow-hidden` only while the timer is running (the picker is not shown then). Idle tile uses visible overflow.
- Mehr dialog: pass `overflow="visible"` so the switcher can paint outside the sheet.

Next time, do not put `overflow-hidden` or `overflow-auto` on a container that hosts an absolutely positioned menu unless the menu is portaled out or the overflow is gated to a state where the menu is closed. `max-h` plus `overflow-y-auto` on the menu itself does not help if an ancestor clips. When adding a dropdown inside a card, dialog, or sheet, check the ancestor overflow chain before calling the UI done.
