---
title: 'Historical Trends — Bar Chart Histogram'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/mockups/trends-refresh.html'
baseline_commit: 'f8c3f0951df567d81aae3503fa8294b17cf8f014'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 5.1's amended ACs (epics.md, UX-DR31) require the Historical Trends day-by-day list to render as a bar-chart histogram (one bar per day, height = % of that day's own target, dashed 100%-of-target reference line, terracotta over-target bars) instead of the current plain text list — but `app/(routes)/trends/page.tsx` only renders `nonEmptyDays` as bordered-container text rows.

**Approach:** Add two pure, tested functions to `lib/services/trends.ts`: `computeTrendBarHeightPercent(totalCalories, dailyCalorieTarget)` (mockup's own math — chart container represents 130% of target height, so bar height % = `(totalCalories/dailyCalorieTarget*100) / 1.3`, capped `[0, 100]`) and `TARGET_LINE_TOP_PERCENT` (a constant, `100 - 100/1.3 ≈ 23.08`, matching the dashed line's position). Replace the `<ul>` day-list in `app/(routes)/trends/page.tsx` with a horizontally-scrollable bar-chart card: a relative `chart-area` (dashed target line + "target" label), one bar-column per day at a fixed width (thinner/denser than a page-width bar, since up to ~90 days must fit — `overflow-x-auto`, never paginated/infinite-loaded, satisfying UX-DR28's "load the full bounded set at once"), bar fill uses a neutral tint within target or `{colors.primary}` over target, with a single-letter day label beneath.

**Always:** Reuse `nonEmptyDays`/`formatDayLabel()`'s existing data — no new fetch. Every bar carries a `title` attribute with the exact figures (day + totalCalories/target) as a native-tooltip, accessible-name equivalent — the mockup's own header comment calls exact-figure display "an open question... probably a tap/hover detail," and this is the minimal-complexity answer (no new interactive/popover component).

**Never:** Touch Story 5.2's aggregate stats block (unchanged, per the mockup's own header comment: "Aggregate stats line ... is unchanged from the existing spec") or introduce pagination/virtualization for the up-to-90-bar set.

**Decision (resolved, a choice the user wouldn't notice either way):** Bars render oldest-to-newest, left-to-right — `nonEmptyDays` (most-recent-first, unchanged for Story 5.2's stats computation, which is order-independent) is reversed only for the chart's own render, matching a bar chart's usual reading convention and the mockup's own S/M/T/W/T day-label sequence `[ASSUMPTION]`.

</frozen-after-approval>

## Code Map

- `lib/services/trends.ts` — `TrendDay`, `computeTrendDays()`, `computeTrendSummaryStats()` already exist; add the two new pure functions here, same file, same test-file convention (`trends.test.ts`).
- `app/(routes)/trends/page.tsx` — the `nonEmptyDays &&` block (day-list `<ul>`) is the only markup to replace; `firstLoadPending`/`loadError`/empty-state branches and the Story 5.2 stats block above it are unchanged.
- `app/globals.css` — reuses `--color-primary` (over-target) and needs one new neutral bar-fill tint (mockup's own `--tint-neutral-bar: #DCE5DB`, distinct from Story 2.4's `--tint-neutral-bg`/`-fg` icon-tint pair — a bar fill, not an icon-circle tint).

## Tasks & Acceptance

**Execution:**
- [ ] `lib/services/trends.ts` -- add `computeTrendBarHeightPercent()` + `TARGET_LINE_TOP_PERCENT` -- the bar-chart's own math, testable in isolation
- [ ] `lib/services/trends.test.ts` -- unit-test the new function's boundaries (0%, exactly-at-target 100%, over-target capped at 100%, target=0 edge case)
- [ ] `app/globals.css` -- add `--tint-neutral-bar` token + `@theme inline` mapping
- [ ] `app/(routes)/trends/page.tsx` -- replace the day-list `<ul>` with the bar-chart card

**Acceptance Criteria:**
- Given a day within target, when its bar renders, then it uses the neutral fill and its height reflects `computeTrendBarHeightPercent()`'s output
- Given a day over target, when its bar renders, then it uses `{colors.primary}` and its bar height caps at 100% even though the day's actual percent-of-target exceeds 130%
- Given the up-to-90-day window, when the chart renders, then all bars are present in one scrollable row (no pagination, no infinite scroll)

## Verification

**Commands:**
- `node --test lib/services/trends.test.ts` -- expected: all pass, including new bar-height cases
- `npm run lint` / `npx tsc --noEmit` -- expected: clean

**Manual checks (if no CLI):**
- `agent-browser` against `/trends` with the existing test account's seeded history — confirm bars render, over-target days show terracotta, dashed line sits at the target mark, horizontal scroll works if >~10 days present.

## Implementation Notes

Added `computeTrendBarHeightPercent()`/`TARGET_LINE_TOP_PERCENT` to `trends.ts`, the `--tint-neutral-bar` token, and replaced the day-list `<ul>` with the bar-chart card. Verified visually via `agent-browser`: seeded 5 days of historical entries (one deliberately over target), confirmed bars render oldest-to-newest with correct heights, the over-target day renders terracotta, the dashed target line and legend both display correctly — then cleaned up the seeded data. Blind Hunter caught a real positioning bug: the dashed target line/label lived inside the same `overflow-x-auto` element as the bars, so `right-0` anchored to the full scrollable content's edge rather than the visible viewport — the label would start off-screen for any window wide enough to need scrolling in the first place. Restructured so the line/label sit in a non-scrolling outer wrapper. Also fixed a real accessibility regression (dropped `aria-live`) and added a group-level `aria-label`, legibility fix for the target label, and a color legend.

## Review Triage Log

- **medium** — The dashed target line/label were children of the same `overflow-x-auto` bars container, so `right-0` anchored to the full scrollable content width, not the visible viewport — for any window needing horizontal scroll (>~10 days), the "target" label started off-screen until scrolled all the way to the newest-day end. Fixed: moved the line/label into the outer, non-scrolling `relative` wrapper; only the bar columns themselves scroll.
- **medium** — The old `<ul aria-live="polite">` announced trend data on load; the new chart's container had no `aria-live`, silently dropping that announcement. Fixed: added `aria-live="polite"` to the bars group.
- **medium** — No group-level accessible name — each bar has its own `role="img"`/`aria-label`, but nothing summarizes the chart as a whole for a screen-reader user landing on a long run of individually-labeled bars. Fixed: added `role="group"` + `aria-label="Daily calories for N days"`.
- **low** — The "target" label had neither the mockup's `background: var(--card)` nor left padding, so it could visually collide with the dashed line or a bar's fill. Fixed: added `bg-card pl-1`.
- **low** — Stale comment on the Story 5.2 stats block referenced "the day list's own plain-text figures" (removed by this diff) and read as contradicting the bar chart's own legitimate over-target color-coding two blocks below. Fixed: reworded to clarify the stats block itself still never color-codes, while the chart's own coding is UX-DR31's explicit, separate exception.
- **low** — No color legend explaining what the neutral vs. terracotta bar fills mean without first hovering an over-target bar. Fixed: added a small legend row.
- **low** — Test coverage for `computeTrendBarHeightPercent()` skewed entirely to boundary cases with no typical mid-range case, and the `<= 0` branch was only exercised at exactly `0`, never a negative target. Fixed: added a 50%-of-target case and a negative-target case.
- **low, deferred** — Exact per-day figures are hover-only (`title`) or screen-reader-only (`aria-label`) — a touch-screen user (this app's primary platform, NFR-1) has no way to read a specific bar's figures at all, and at real ~90-day scale the single-letter weekday label gives no visible date anchor. Real gap, but the approved mockup explicitly left both "how the window scrolls" and "how per-day figures are shown" as open questions for implementation to resolve; a full fix (tap-to-reveal panel, periodic axis labels) exceeds a oneshot's "smallest fix is simple" bar. Logged to `deferred-work.md`.
- **low, rejected** — A zero-calorie day would render an unhoverable, zero-height bar. Not reachable in practice: `computeTrendDays()` only produces a `TrendDay` for a Day with 1+ logged Entries, and the estimation pipeline has never produced a literal 0-calorie Entry; even if it did, the `aria-label` still surfaces the figures to screen readers.

