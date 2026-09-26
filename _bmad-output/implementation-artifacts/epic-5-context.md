# Epic 5 Context: Historical Trends

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Give the user a rolling 3-month view of their calorie tracking so they can spot patterns beyond the current Day's snapshot: a day-by-day history of calories consumed against that day's target, plus simple aggregate stats summarizing the window. This is a Could-have reporting layer, not a new source of truth — it reads directly from the Daily Calorie Target (Epic 1) and the stored Entries (Epic 2), and does not depend on Epic 3's live budget/recommendation engine, which persists nothing for this epic to read.

## Stories

- Story 5.1: 3-Month Trend View
- Story 5.2: Trend Summary Stats

## Requirements & Constraints

- The trends view shows, for each day in the last 3 months, total calories consumed against that day's Daily Calorie Target.
- Only days with at least one logged Entry show data. Days with zero Entries are omitted from the view entirely — never fabricated or displayed as a zero-calorie day. This "no fabricated zero days" rule also governs the aggregate stats: an omitted day is excluded from both the within/over-target count and the average, not counted as zero.
- Aggregate stats over the window: number/percentage of days within target vs. over target, and average daily calories consumed across the days that have data.
- If the user has never logged any Entry at all, show a calm "nothing logged yet" message in place of both the day-by-day view and the aggregate stats — no empty chart, no stats block at all in this state.
- Explicitly out of scope for this epic: no export, no goal-setting-over-time, no correlation analytics against other data (e.g. weight, activity). Plain historical view only.
- No formal WCAG level is targeted for this single-user prototype, but the general accessibility baseline (labeled icon-only controls, visible focus states) still applies to any new nav/icon control this epic introduces (e.g. a Trends nav link).

## Technical Decisions

- Day attribution for the trend data must go through the single shared `dayBoundary(timestamp, tz)` function (5am local-time cutoff) — never separate calendar-date math for this dashboard. This is the same function Epic 3 uses for budget/recommendation Day attribution; trends must stay consistent with it.
- Data comes from the existing `entries` table (calories, created_at) and `profiles.daily_calorie_target` — no new tables or persisted aggregate fields. The aggregate query lives in the data layer (`lib/db`), consumed by the trends route (`app/(routes)/trends`); routes stay thin and delegate to services/data layer per the standard layered convention (routes → services → DB, never a direct DB call from a route/component).
- Timestamps are stored as UTC `timestamptz`; Day is never its own stored column, always derived at query time.
- This epic does not need and should not read from Epic 3's recommendation/budget engine — it computes its own aggregation directly from Entries and the target, since Epic 3 persists no daily-budget state to read.
- The Entries list and Trends are both bounded datasets (single-Day / 3-month window) — no pagination and no infinite scroll; load the full bounded set at once.

## UX & Interaction Patterns

- Historical Trends is reached from the Daily view via a nav link; it is not part of the primary Daily-view flow.
- Layout follows the rest of the app: single-column, mobile-first, unchanged at wider viewports (no multi-panel dashboard, no grid of stat tiles) — the 3-month view and the summary stats are presented as one linear reporting surface, not a widget dashboard.
- Empty state (never logged any Entry): a short, calm statement — "Nothing logged yet — check back once you've tracked a few days." — in place of an empty chart or blank view.
- A day with no logged Entries is simply absent from the day-by-day view, never rendered as a zero-calorie bar/row.
- If a new icon-only control is introduced for Trends navigation, it needs a text-equivalent accessible name, same rule as every other icon-only control in the app.
- Voice/tone: any copy here (including the empty state and stat framing) follows the same supportive, non-alarming register used everywhere else — no red/alarm treatment for "days over target," no gamified praise for "days within target."

## Cross-Story Dependencies

- Story 5.2 (Trend Summary Stats) builds directly on Story 5.1's day-by-day data set and its "omit days with no Entries" rule — the same exclusion must carry through into the aggregate calculations, and 5.2 shares 5.1's "nothing logged yet" empty state (no separate empty state for stats).
- Both stories depend on Epic 1 (`profiles.daily_calorie_target`) and Epic 2 (stored `entries` with calories and timestamps) being in place, but have no dependency on Epic 3 or Epic 4.
