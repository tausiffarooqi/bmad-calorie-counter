---
title: 'Trend Summary Stats'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
baseline_commit: '12340dc'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 5.1's day-by-day Trends list gives no headline — the user has to read every day individually to know how the last 3 months went overall.

**Approach:** Add a small aggregate-stats summary above Story 5.1's day list: number/percentage of days within target vs. over target, and average daily calories consumed — computed from the same `TrendDay[]` Story 5.1 already produces (`lib/services/trends.ts`'s `computeTrendDays()`), reusing its "omit days with no Entries" guarantee for free (an omitted day was never in the array to begin with, so it's automatically excluded from both the count and the average — no new exclusion logic needed). "Within target" means `totalCalories <= dailyCalorieTarget` (exactly-at-target counts as within, matching Story 3.4/4.2's established precedent). No stats block at all when the window is empty — Story 5.1's existing "Nothing logged yet" empty state already covers that case unchanged. Percentages and the average are rounded to the nearest whole number for display. Out of scope (Could-have, explicit): no export, no goal-setting-over-time, no correlation analytics.

</frozen-after-approval>

## Implementation Notes

- `lib/services/trends.ts`: added `TrendSummaryStats` interface (`daysWithinTarget`, `daysOverTarget`, `totalDays`, `percentWithinTarget`, `percentOverTarget`, `averageCalories`) and `computeTrendSummaryStats(days: TrendDay[]): TrendSummaryStats` — pure, sync, derived entirely from the same `TrendDay[]` array Story 5.1's `computeTrendDays()` already produces (Approach), so no new DB access, no new dependency. Compares each `TrendDay`'s own `totalCalories` against its own `dailyCalorieTarget` field (`<=` = within target, matching Story 3.4/4.2's established precedent for "exactly-at-target counts as within") rather than a single passed-in target — more robust if a future story ever historizes the target per day, though today every row in a given `TrendDay[]` carries the same current target (Story 5.1's own accepted simplification, unchanged here). Percentages and the average are rounded with `Math.round()` per the frozen Intent; the two percentages are not reconciled to sum to exactly 100 (independent rounding, an accepted display-only artifact, same as any percentage-pair rounding). Handles `[]` by returning an explicit all-zero record (no division by zero) even though the caller is expected to only invoke it for a non-empty window.
- `lib/services/trends.test.ts`: added 6 unit tests for `computeTrendSummaryStats()` — exactly-at-target counts as within (not over), a day one calorie over its target counts as over, a mixed set computes correct counts/percentages/average, percentages and the average round to the nearest whole number on a non-terminating-decimal case, each day is compared against its own row's `dailyCalorieTarget` (not a shared single value), and an empty array degrades to an explicit all-zero result rather than `NaN`/throwing.
- `app/(routes)/trends/page.tsx`: added a plain-text summary block, computed via `computeTrendSummaryStats(days)` and rendered immediately above Story 5.1's existing day-row `<ul>` (Approach: "above Story 5.1's day list"). Gating condition is `days && days.length > 0` — the exact same condition that already gates the day-row list itself (and is the logical negation of the existing `days.length === 0` empty-state branch), so "no stats block at all when the window is empty" falls out of reusing that identical condition rather than a second, independently-maintained check that could drift out of sync with it. Two short lines, no card/tile/border treatment (epic-5-context.md UX & Interaction Patterns: "one linear reporting surface, not a widget dashboard"), plain `text-muted-foreground` throughout with no color-coding for the over-target count (same "no alarm treatment"/no red, no gamified-praise rule already applied to the day-row list). Added `aria-live="polite"` on the summary `<div>` for consistency with the sibling day-list `<ul>`'s existing attribute (both are one-time-render-on-mount content, same rationale).
- No changes to `app/api/trends/route.ts` or the API response shape — the stats are derived client-side from the `days` array the route already returns, since that array is the complete, sufficient input Story 5.2's Approach specifies ("computed from the same `TrendDay[]` Story 5.1 already produces"). This avoids a second server round-trip and keeps the route unchanged/thin.
- Verified independently rather than trusting only the implementation itself: re-read the final diff end to end (`lib/services/trends.ts`, `lib/services/trends.test.ts`, `app/(routes)/trends/page.tsx`) and confirmed the `<=`-as-within-target comparison, the shared gating condition, and the rounding all match the frozen Intent's literal wording line by line.
- **Not performed this session**: any live DB-backed verification (an actual `GET /api/trends` round-trip with real Entries spanning within-target/over-target/mixed days, or a browser check of the rendered stats line) — same pre-existing environment limitation noted in Stories 5.1 and 4.3's own Implementation Notes: the local Supabase/Postgres instance is unreachable in this environment (`docker`/`podman` missing from PATH). A follow-up session with DB access should seed Entries across several days straddling both sides of the target (including at least one day landing exactly at the target) and confirm the on-screen counts/percentages/average match a hand-computed expectation, and that the stats line and day list agree on which days are included.
- **Post-review patch round** (see Review Triage Log): added a date-range line ("Jul 1 – Sep 25" style) above the counts so `totalDays` can't be misread as "every calendar day in the window," pluralized "day"/"days" correctly for a single-day window, clarified the average's copy to note it excludes unlogged days, added `aria-label="Trend summary"` for structural identification, and added two tests (an explicit >100%-sum rounding boundary case, and a true integration test piping `computeTrendDays()`'s real output into `computeTrendSummaryStats()` rather than only hand-built fixtures). Re-ran the full sweep after patching: `npx tsc --noEmit`/`npx eslint .` clean, `node --test lib/**/*.test.ts` 84/84 pass (was 82), `npx next build` clean.

## Review Triage Log

Blind Hunter reviewed the diff (5 findings by its own floor, 9 reported).

- Independent rounding of the two percentages can sum to over 100% (e.g. 1/200 within, 199/200 over → 1% + 100%), and no test exercised a case where this is visible (the existing 1/3-2/3 test happens to sum to exactly 100). **patch** — pinned the exact 1/200-vs-199/200 case as a new test, documenting the already-accepted display artifact concretely rather than only in a comment.
- Story 5.1's "current target only, not historized per day" simplification is inherited and amplified by the aggregate headline — changing the target today retroactively reclassifies every past day. **defer** — not caused by this story's own code (inherited from 5.1), logged as newly worth flagging since a single headline number is more likely taken at face value than a day-by-day list.
- The average silently excludes unlogged days with no indication in the copy. **patch** — added "(days with entries only)" to the average line.
- "N of M days within target" doesn't pluralize for a single-day window ("1 of 1 days"). **patch** — conditional "day"/"days" based on `totalDays`.
- The stats block has no heading/label identifying it as a summary. **patch** — added `aria-label="Trend summary"`.
- Two adjacent `aria-live="polite"` regions (the new stats block and Story 5.1's existing day list) populate on the same render pass; claimed this makes `aria-live` itself a misuse since it's "designed for post-mount updates, not initial content." **Disputed, partial defer** — verified: `aria-live` announcing the first reveal of asynchronously-loaded content (a loading-skeleton → real-content transition, exactly this case) is a legitimate, established use of live regions, not a misuse — the attribute's presence is not a defect. The narrower "two regions firing at once could interleave in some screen readers" concern is real but implementation-dependent with no clean single-story fix (would need merging both into one region, a small redesign). **defer** — logged for a future holistic live-region pass, converging with this project's existing `aria-live` deferred entries.
- No test piped real `computeTrendDays()` output into `computeTrendSummaryStats()` — every existing test used hand-built fixtures. **patch** — added a true integration test.
- The stats block never states the actual date range covered, so `totalDays` (which excludes unlogged days) could be misread as "every day in the window." **patch** — added a date-range line using the already-existing `formatDayLabel()` helper.
- No live/DB-backed verification was performed this session. **Not a new finding** — restates the already-disclosed, environment-wide gap noted in every story since 4.4 (`docker`/`podman` unavailable).

## Verification

**Commands:**
- `npx tsc --noEmit` — clean, no type errors.
- `npx eslint .` — clean, no lint errors.
- `node --test lib/**/*.test.ts` — 82/82 pass (76 pre-existing + 6 new `computeTrendSummaryStats()` tests in `lib/services/trends.test.ts`).
- `npx next build` — clean production build; `/trends` and `/api/trends` both still registered, no new routes needed for this story.

**Manual checks (if no CLI):**
- Not performed live this session — the local Supabase/Postgres instance is unreachable in this environment (`docker`/`podman` missing from PATH), same disclosed gap as Stories 5.1 and 4.3. The pure `computeTrendSummaryStats()` logic is fully unit-tested (including the exactly-at-target boundary and rounding behavior), but the actual page render with real, DB-backed `days` data can't be exercised live this session. A follow-up session with DB access should seed Entries across several days on both sides of the target (including one exactly at target) and confirm: the on-screen "N of M days within target (X%), K over target (Y%)" and "Average Z cal/day" line matches a hand-computed expectation, and no stats block renders for a brand-new/empty-window account.
