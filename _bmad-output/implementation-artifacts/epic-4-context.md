# Epic 4 Context: Daily Engagement

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Gives users a proactive first-login check-in each new Day: their remaining budget, a prompt asking whether to log a meal now, a conditional breakfast offer when checking in before 10am, and a tone-adaptive message reflecting how yesterday went. This turns the app into something the user has a reason to open even when they aren't actively logging food, and closes out the full first-login experience promised in the product vision (FR-15–FR-18).

## Stories

- Story 4.1: First-Login Prompt & Remaining Budget
- Story 4.2: Tone-Adaptive Daily Message
- Story 4.3: Decline-Path Recommendations
- Story 4.4: Pre-10am Breakfast Offer

## Requirements & Constraints

- On the user's first app-open of a given Day (per the 5am-to-next-5am boundary), show the Remaining Calorie Budget and ask "Log a meal now?" This must appear only once per Day — a second open the same Day lands directly on the Daily view, no re-prompt.
- Tapping the log-a-meal ask affirmatively enters the existing Log Entry flow, same as tapping Add Photo/Add Text from the Daily view directly.
- Declining the log-a-meal ask is never a dead end: the user lands on the Daily view, which already renders its normal Recommendation card(s) (or Over-Target banner) for the remaining Meal Slots, computed the same way it would be on any other visit.
- The first-login message about yesterday has exactly four outcomes: within-target (congratulatory/confidence-building), over-target (supportive/encouraging, never shaming), zero Entries logged yesterday (neutral — does not fabricate a within/over-target result), and no "yesterday" at all yet, i.e. very first Day ever (same neutral treatment as the zero-Entries case).
- Only before 10am: a second, separate card offers a breakfast Recommendation — "Want a breakfast recommendation too?" Never merged into the log-a-meal ask as one compound question. At or after 10am, this card does not appear at all.
- Accepting the breakfast offer adds breakfast as a third Meal Slot, additive on top of (not counted within) the 2 slots from the 5am–12pm window — lunch and dinner recommendations are unaffected either way.
- Declining the breakfast offer is also not a dead end — lands on the Daily view with its normal (non-breakfast) Recommendation cards.
- Over-Target State suppresses every recommendation-producing path in this epic exactly as it does in Epic 3, without a separate implementation: no breakfast offer, and the decline-path shows the Over-Target banner instead of Recommendation cards.

## Technical Decisions

- Reuse, don't reimplement: `recommendationEngine`'s slot/precedence logic (Over-Target-override > after-10pm-conditional > time-of-day windows) was built in Epic 3 generally enough for this epic to call directly. In the current codebase this is `getRecommendations(now, tz, entries, dietaryPreference, remainingBudget)` in `lib/services/recommendation-engine.ts` — Epic 4's decline-path and breakfast-offer logic must go through this same function rather than adding a parallel path.
- `getRecommendations()` as it stands only knows about `lunch`/`dinner` (`MEAL_SLOTS`). Breakfast is explicitly noted as "Epic 4's (not built here)" in that file's own comments — this epic needs to extend the slot model so accepting the breakfast offer adds breakfast as a genuinely separate, additive slot, without perturbing the existing lunch/dinner computation or its positional fill-count logic (filled count = Meal-classified Entries logged that Day).
- Meal Slot fill state stays derived, never stored: expected total slots is a pure function of the current time-of-day window plus whether the first-login breakfast offer was accepted for that Day — no persisted slot-counter field.
- The 5am-to-next-5am Day boundary (single `dayBoundary(timestamp, tz)` function) governs both "is this the first login of the Day" and "what happened yesterday" — no separate/inline date math for either.
- "Yesterday's performance" for the tone-adaptive message is computed from the prior Day's summed Entry calories vs. that Day's Daily Calorie Target, scoped via the same Day-boundary logic; a Day with zero logged Entries must be distinguished from a Day that was within/over target, not defaulted to either.
- All writes/reads go through the service layer (never a direct DB call from a route/component), consistent with the rest of the app.
- Recommendation content stays a static, versioned lookup keyed by (slot, Dietary Preference) — a breakfast entry in that lookup table is needed; no external API/LLM call for it.

## UX & Interaction Patterns

- First-login prompt uses the Prompt card treatment (card background, border outline, `md` radius) and the same two button components used everywhere else (`button-primary`/`button-secondary`) — no new button treatment introduced for this epic.
- Cards are sequential, not simultaneous: the log-a-meal ask always renders first; the breakfast offer (when before 10am) renders as a second, separate card below it.
- Tone-adaptive message copy follows the "supportive, never shaming" rule — same understated tone regardless of yesterday's outcome, no exclamation-heavy or gamified phrasing on good days, no alarm/scolding language on over-target days. Approved examples: "You stayed within your target yesterday — nice, steady work." / a supportive over-target framing that never uses alarm language.
- Declining any first-login card (log-a-meal or breakfast) always resolves to the same Daily view underneath, fully rendered with its normal Recommendation cards or Over-Target banner — never a blank or dead-end screen.
- When accepted, the breakfast Recommendation card stacks alongside lunch/dinner in the same bordered-container register, in italic Lora (`recommendation` role) like every other Recommendation card — no distinct visual treatment for "this one came from a first-login offer" vs. one arrived at normally.
- Over-Target banner (clay border/text, `md` radius, never red/alarm styling) replaces all Recommendation cards at once on the decline path exactly as it does everywhere else — this epic must not introduce a second banner variant.

## Cross-Story Dependencies

- All four stories depend on Epic 3's `recommendationEngine`/`getRecommendations()` and its Over-Target precedence being callable as-is; none of them reimplement slot or precedence logic.
- Story 4.3 (decline-path) depends on Story 4.1 (the prompt existing and having a decline action) and directly reuses whatever the Daily view already renders for the current time-of-day/budget state.
- Story 4.4 (breakfast offer) extends the slot model that Stories 4.1–4.3 rely on — the offer must be resolved (accepted or declined) before the Daily view's Recommendation cards are computed for that first-login session, since acceptance changes the expected slot count.
- Story 4.2 (tone-adaptive message) depends on Epic 3's per-Day calorie totals and Epic 1's Daily Calorie Target, read for the *previous* Day rather than the current one — a distinct query shape from anything else in this epic.
- Depends on Epic 1 for `profiles.daily_calorie_target`/`dietary_preference` and Epic 2/3 for stored, classified Entries with calorie values to evaluate "yesterday" and "today" against.
