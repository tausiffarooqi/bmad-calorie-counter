# Epic 3 Context: Calorie Budget & Recommendation Engine

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Builds on Epic 2's stored Entries: classifies each Entry as Meal vs. Snack/Beverage, computes the Remaining Calorie Budget for the current Day, and returns a Recommendation for each remaining Meal Slot — including the Over-Target override that stops recommendations entirely once the user has exceeded their target. This epic completes the full per-submission response (estimated calories + updated budget + recommendations) promised in the product vision; before this epic, Entries are recorded but nothing is computed from them.

## Stories

- Story 3.1: Classify Entries as Meal or Snack/Beverage
- Story 3.2: Compute Remaining Calorie Budget
- Story 3.3: Meal Slot Recommendations by Time of Day
- Story 3.4: After-10pm Conditional Recommendation
- Story 3.5: Over-Target Override

## Requirements & Constraints

- Every successfully estimated Entry is classified as exactly `meal` or `snack_beverage`, never left unclassified, as a downstream step after estimation (not part of estimation itself).
- A Snack/Beverage Entry reduces the Remaining Calorie Budget the same as a Meal, but never consumes a Meal Slot and never gets its own Recommendation.
- Remaining Calorie Budget = Daily Calorie Target minus the sum of calories from every Entry (Meal and Snack/Beverage alike) attributed to the current Day.
- A Day runs 5am–next day 5am, user's local timezone; an Entry logged 12am–5am belongs to the still-open Day. This attribution must never be reimplemented inline.
- Meal Slot windows: 5am–12pm → 2 slots (lunch, dinner); 12pm–10pm → 1 slot (dinner). After 10pm → 1 slot (dinner) only if the target hasn't been met yet; if met, no Recommendation at all (distinct from Over-Target — "done for the day," not "over budget").
- Over-Target State (cumulative calories > target) suppresses every Recommendation path without exception — time-of-day windows, after-10pm rule, and Epic 4's decline-path/breakfast-offer paths — and instead reports excess calories consumed.
- Filled Meal Slots for a Day = count of Meal-classified Entries logged that Day (never a stored counter).
- Every Entry submission response returns, together: estimated calories, updated Remaining Calorie Budget, and one Recommendation per remaining Meal Slot (or the Over-Target report instead).
- Classification and budget/recommendation logic target the same soft ~5s response budget as estimation, but must not block on it or shortcut correctness to chase it.
- `profiles.dietary_preference` always has a defined value (defaults to `non_vegetarian`), so the Recommendation lookup never hits an undefined case.

## Technical Decisions

- Layered dependency direction: routes call services only; services call DB/estimation; all writes to `entries`/`profiles` go through the service layer, never direct from a route/component.
- Classification is a downstream `entry-classifier` call on `{ ok: true, description, calories }` output, never inside an `EstimationProvider` adapter — behavior must stay identical regardless of which adapter estimated the Entry.
- `dayBoundary(timestamp, tz)` is the single function for Day attribution (5am local cutoff); every Day-scoped query calls it. Day is never its own stored column.
- `recommendationEngine.forSlot()` is the single function enforcing precedence Over-Target-override > after-10pm-conditional > time-of-day windows, in exactly one place — built general enough that Epic 4 (decline-path, breakfast offer) reuses it rather than reimplementing precedence.
- Meal Slot fill state is derived, never persisted: a pure function of the current time-of-day window plus whether Epic 4's breakfast offer was accepted (breakfast is additive, a third slot, not counted within the 2 slots from the 5am–12pm window).
- Recommendation content is a static, versioned lookup table keyed by (time-of-day slot, Dietary Preference, Over/Under-Target state) — no external API/LLM call. Same key returns identical text on a different day (expected, not a bug); copy must not imply per-Entry reasoning.
- Adds the `classification` column to the existing `entries` table via `ALTER TABLE` (Epic 2 created the table without it) — no new table. Schema: `profiles` (user_id PK/FK to auth.users, daily_calorie_target, dietary_preference), `entries` (id, user_id FK, input_mode, classification, description_text, calories, created_at).
- Conventions: DB `snake_case`; TS `camelCase`/`PascalCase`; timestamps as UTC `timestamptz`; calories are plain integers; API errors `{ error: { code, message } }`.
- Services live in `lib/services/{budget-engine,recommendation-engine,entry-classifier,day-boundary}`.

## UX & Interaction Patterns

- Recommendation card: card background, sage (`accent`) border (sage means only this, nowhere else in the UI), `lg` radius, body in italic Lora (`recommendation` role, 17px/1.35). Renders 0–3 cards depending on remaining Meal Slot count, stacked independently.
- Over-Target banner: card background, clay (`primary`) border/text, `md` radius — never shadcn's `destructive`/red. Same clay tone as primary actions and the budget number, per the "supportive, never shaming" rule. Replaces every Recommendation card at once; never shown together with one.
- Approved tone example: "180 calories over target today. No recommendation for now — tomorrow's a fresh start." No alarm language, exclamation points, or scolding.
- Recommendations read as plain suggestions, not scored AI output — no confidence/match percentages, no phrasing implying reasoning about the specific Entry just logged (the lookup is deterministic).
- Remaining Calorie Budget number uses the `display-number` role (Inter, 52px/700) as the Daily view's single large numeric focal point.
- Daily view is one linear column: budget → entries list → log actions → recommendation card(s)/Over-Target banner last. No multi-widget dashboard.

## Cross-Story Dependencies

- Story 3.1 (classification) must land before 3.3, since Meal Slot fill state depends on counting Meal-classified Entries.
- Story 3.2 (budget computation) determines Over-Target State, which 3.4 and 3.5 both key off of.
- Story 3.3 establishes `recommendationEngine.forSlot()`; 3.4 and 3.5 extend/reuse it rather than adding parallel logic.
- Depends on Epic 1 for `profiles.daily_calorie_target`/`dietary_preference`, and Epic 2 for the `entries` table and `EstimationProvider` output.
- Epic 4 depends on this epic's `recommendationEngine.forSlot()` and Over-Target precedence being generally callable, not epic-3-specific.
