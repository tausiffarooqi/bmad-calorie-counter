---
title: 'Hero Card — Remaining Calorie Budget'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md'
baseline_commit: 'f8c3f0951df567d81aae3503fa8294b17cf8f014'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.1's amended ACs (epics.md, UX-DR29) require the Remaining Calorie Budget to render in a dark Hero card (progress bar, "/ N kcal target" caption, two caption lines) instead of the current plain eyebrow-label + bare number — but `GET /api/entries` doesn't return `dailyCalorieTarget` at all, so the client has no target value to compute the bar/captions against.

**Approach:** Add `dailyCalorieTarget: profile?.dailyCalorieTarget` to `GET /api/entries`'s response and thread it through `useDailyView`/`Entry` API response typing (mirrors Story 4.5/2.4's identical "surface an already-fetched profile field" pattern). Replace `app/page.tsx`'s plain label+number block with a Hero card: `bg-hero` background, `rounded-hero`, `shadow-soft-strong`, two decorative circle outlines + a Flame icon (lucide-react) top-right, "Your daily balance" eyebrow (mockup's literal text — epics.md/DESIGN.md are both silent on this specific string; the mockup is the cited source, same precedent as Story 2.4's tint colors), the budget number (unchanged `display-number` style/color) + target caption, a progress-bar track/fill, and two caption lines. Consumed = `dailyCalorieTarget - remainingBudget`; percent = `Math.round((consumed / dailyCalorieTarget) * 100)`; bar width caps at `Math.min(100, percent)` (Over-Target never overflows the track); captions read "N kcal remaining" when `remainingBudget >= 0` or "N kcal over" when negative, and "{percent}% of target" (uncapped, so Over-Target shows e.g. "109%").

**Always:** Keep the existing `budgetReady`/`loadError`/skeleton three-way gate — only the `budgetReady` branch's markup changes. Keep the number itself unclamped/signed exactly as today (Boundaries carried over from the original AC).

**Never:** Touch the First-Login prompt's own "Remaining budget today: N calories" line (frozen, Story 4.1's original Boundaries) or the Over-Target banner/Recommendation cards below.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Under target | target=2000, remaining=1240 | Bar 38% width, "1,240 kcal remaining", "38% of target" | N/A |
| Over target | target=2000, remaining=-180 | Bar capped at 100% width, "180 kcal over", "109% of target" | N/A |
| Exactly at target | target=2000, remaining=0 | Bar 100% width, "0 kcal remaining", "100% of target" | N/A |
| dailyCalorieTarget missing (profile fetch failed) | `dailyCalorieTarget` undefined | Falls to the existing `loadError`/skeleton branches — unchanged | N/A |

</frozen-after-approval>

## Implementation Notes

Added `dailyCalorieTarget` to `GET /api/entries`, replaced the plain eyebrow+number with the Hero card (decorative circles, Flame icon, progress bar, captions). Verified visually via `agent-browser` for both under-target and over-target states (logged a real over-target entry via the UI, confirmed the bar caps at 100% width with a negative number and correct captions, then cleaned it up). Blind Hunter's real catches: the display math (consumed/percent/bar-width/caption) was inlined as a JSX IIFE instead of the codebase's established pure+tested pattern — extracted to `lib/services/hero-budget.ts` (5 unit tests) — plus a missing `role="progressbar"`/ARIA triple on the one genuinely informational visual element, and two small visual-fidelity gaps against the mockup (missing label margin, 14px vs. the mockup's 13px label). All fixed and re-verified visually.

## Review Triage Log

- **medium** — The consumed/percent/bar-width/caption math was inlined as a JSX IIFE rather than the codebase's established pure+tested pattern (`budget-engine.ts`, `trends.ts`, `greeting.ts`), with no test coverage for the 4 boundary cases the spec's own I/O matrix names. Fixed: extracted `lib/services/hero-budget.ts`'s `computeHeroBudgetDisplay()`, with `hero-budget.test.ts` covering under/over/exactly-at target and the `dailyCalorieTarget <= 0` edge case.
- **medium** — The progress bar had no `role="progressbar"`/`aria-valuenow`/`aria-valuemin`/`aria-valuemax` — unlike the genuinely decorative circles/flame icon beside it (correctly `aria-hidden`), this is the one truly informational visual element and exposed nothing to assistive tech beyond the plain-text captions below it. Fixed.
- **low** — The mockup's `.hero-label { margin: 0 0 6px }` (gap between "Your daily balance" and the big number) wasn't reproduced — Tailwind's preflight zeroes default `<p>` margins, so the label sat flush against the number. Fixed: added `mb-1.5`.
- **low** — The label used `text-sm` (14px) instead of the mockup's `font-size: 13px`. Fixed: `text-[13px]`.
- **low** — The loading-skeleton's `h-[164px]` was an unexplained magic number with no note tying it to the real card's measured height. Fixed: added a comment clarifying it's an approximation, not a pixel contract.
- **low, rejected** — `budgetReady`'s two-field dependency (`remainingBudget`/`dailyCalorieTarget`) is only guaranteed in lockstep by a code comment, not enforced in code; if they ever desync, the card falls silently into a permanent skeleton. Real observation, but not a new risk this story introduces — both values are undefined only when `profile` itself is missing for an authenticated user, a case the API route already logs server-side (`console.error("No profile found for authenticated user...")`) exactly as it did before this story, when only `remainingBudget` depended on that same condition.
