---
title: 'After-10pm Conditional Recommendation'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
baseline_commit: '90ca9ec41b62339134e8d544a2f73301b1d0c795'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.3 left the 10pm–5am window undefined (`expectedSlotsForHour()` returned `[]` there as an explicit placeholder) — after 10pm, the Daily view currently never shows a dinner Recommendation even when the user hasn't eaten enough, and it also never correctly stops when they have.

**Approach:** Extend `recommendation-engine.ts`'s existing `expectedSlotsForHour()` (the single function enforcing every window's precedence, AD-6) to cover the full 22:00–04:59 range (still the same Day per AD-5's 5am cutoff, not a new one) — one dinner slot if the Daily Calorie Target hasn't been met yet (`remainingBudget > 0`), zero slots (no card, no banner) if it has. No new function, no separate implementation.

## Boundaries & Constraints

**Always:** The after-10pm window spans hour >= 22 OR hour < 5 as one continuous range (matches AD-5's Day boundary — this is still "tonight," not tomorrow). `remainingBudget > 0` → 1 expected slot (dinner); `remainingBudget <= 0` (met exactly, or over) → 0 expected slots. The existing filled-Meal-Slot-count subtraction (Story 3.3) still applies uniformly on top of this window's expected-slots result, same as every other window.

**Never:** Do not add Over-Target banner logic or detection here (Story 3.5's own concern) — `remainingBudget <= 0` after 10pm always means "no card" from this story's perspective alone; a future negative-budget case additionally getting a banner instead of nothing is Story 3.5's layer to add on top, not this one's. Do not change the 5am–12pm or 12pm–10pm windows' behavior. Do not touch anything about how `remainingBudget` itself is computed (`budget-engine.ts`) — this story only consumes it.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| After 10pm, target not yet met | Local hour 23, `remainingBudget = 300` | 1 recommendation: `[{slot:"dinner",...}]` | N/A |
| After 10pm, target already met exactly | Local hour 23, `remainingBudget = 0` | `[]` — no card, no banner | N/A |
| After 10pm, over target | Local hour 23, `remainingBudget = -50` | `[]` — same as "met exactly" from this story's perspective (Story 3.5 adds a banner later) | N/A |
| Before 5am, target not yet met | Local hour 2, `remainingBudget = 300` | 1 recommendation: `[{slot:"dinner",...}]` — same Day, same rule as after-10pm | N/A |
| After-10pm dinner already filled by an earlier Meal | Local hour 23, `remainingBudget = 300`, 1+ `meal`-classified Entries already logged | `[]` — existing filled-slot-count subtraction (Story 3.3) still applies | N/A |
| Exactly 10:00pm / 4:59am boundaries | Local hour 22 and 4 | Both resolve via the after-10pm rule (not the empty placeholder from Story 3.3) | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/recommendation-engine.ts` -- `expectedSlotsForHour(hour, remainingBudget)` gains a second parameter; its final `else` branch (currently `return []`, covering `hour >= 22 || hour < 5`) becomes `return remainingBudget > 0 ? ["dinner"] : []`; `getRecommendations()` gains a `remainingBudget: number` parameter, passed through to `expectedSlotsForHour()`
- `lib/services/recommendation-engine.test.ts` -- every existing call to `getRecommendations()` needs the new `remainingBudget` argument added; the two tests whose expectations depended on the old "outside 5am–10pm → always `[]`" placeholder (the 2am case and the exactly-10pm boundary case) need updated expected values reflecting the new rule; add new tests for the not-yet-met/met-exactly/over-target/before-5am/filled-slot-interaction rows above
- `app/api/entries/route.ts` -- both `POST`'s and `GET`'s `getRecommendations()` calls pass their already-computed `remainingBudget` as the new argument (no new computation, no new query — `remainingBudget` already exists at both call sites)

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/recommendation-engine.ts` -- extend `expectedSlotsForHour()`/`getRecommendations()` to cover the after-10pm rule -- the actual behavior change, in the one existing function (AD-6)
- [x] `lib/services/recommendation-engine.test.ts` -- update existing calls/expectations, add coverage for every I/O matrix row -- keeps the suite accurate for the extended window
- [x] `app/api/entries/route.ts` -- pass `remainingBudget` into both `getRecommendations()` calls -- wires the extended function into the existing response paths

**Acceptance Criteria:**
- Given it's after 10pm local time and the Daily Calorie Target hasn't been met, when I view the Daily view, then I see exactly 1 Recommendation card (dinner)
- Given it's after 10pm local time and the Daily Calorie Target has already been met, when I view the Daily view, then no Recommendation card appears and no Over-Target banner appears either — just nothing
- Given the after-10pm rule and the 5am–12pm/12pm–10pm windows, then both are enforced by the same function (AD-6) — no separate, divergent after-10pm implementation exists anywhere

## Implementation Notes

- `lib/services/recommendation-engine.ts`: `expectedSlotsForHour(hour, remainingBudget)` gains the `remainingBudget: number` parameter; its final `else` branch (`hour >= 22 || hour < 5`, the fallthrough after the two existing `if`s) now returns `remainingBudget > 0 ? ["dinner"] : []` instead of the old unconditional `[]`. `getRecommendations()` gains a `remainingBudget: number` parameter (added last, after `dietaryPreference`) and passes it straight through to `expectedSlotsForHour()`. No new function — the same one function still enforces every window's precedence (AD-6). Updated the file's header comments (which previously said the after-10pm window was "Story 3.4's" and not built there) to no longer describe it as unimplemented.
- `lib/services/recommendation-engine.test.ts`: added `remainingBudget` as the 5th argument to every existing `getRecommendations()` call (used `1500` as a neutral "target not yet met" value for pre-existing tests that don't care about the after-10pm rule). Replaced the old "outside 5am-10pm returns zero expected slots" (2am) test and the old "exactly 10pm local ends the dinner-only window" test — both asserted the pre-3.4 always-`[]` placeholder — with tests reflecting the new rule. Added coverage for every I/O & Edge-Case Matrix row: before-5am with target not met, exactly-10pm/just-before-5am boundary (both now resolve via the after-10pm rule), after-10pm met-exactly (`remainingBudget = 0` -> `[]`), after-10pm over-target (`remainingBudget = -50` -> `[]`, same as met-exactly from this story's perspective), after-10pm not-yet-met (`remainingBudget = 300` -> dinner), and after-10pm with dinner already filled by a logged Meal (`[]`, confirming Story 3.3's filled-slot subtraction still applies on top). 20/20 tests pass (up from 15).
- `app/api/entries/route.ts`: both `getRecommendations()` call sites (`POST`'s post-submission re-fetch block and `GET`) now pass their already-computed `remainingBudget` local as the new 5th argument. No new computation, no new query, no new error-handling path — `remainingBudget` was already in scope at both call sites before this story.
- Did not touch `budget-engine.ts` (how `remainingBudget` is computed), the 5am-12pm/12pm-10pm window branches, the Over-Target banner (Story 3.5's concern), or any UI/component code — none were listed in the Code Map and the spec's Boundaries & Constraints explicitly rule the first and last out.
- Verified: `npx tsc --noEmit` clean; `npx eslint .` clean; `npm test` 45/45 pass (20/20 in `recommendation-engine.test.ts`); `npx next build` clean (Turbopack production build, all routes compiled including `/api/entries`).
- Independently re-ran the full sweep: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 45/45 pass; `npx next build` clean.
- **Live-verified against real wall-clock time** — no clock manipulation needed, since this session's real local time happened to be 10:05 PM (genuinely past the 10pm boundary) at verification time: registered a fresh throwaway account, Daily view correctly showed exactly 1 card ("DINNER RECOMMENDATION") with the target not yet met. Logged a real ~2500-calorie meal against the real Gemini API, pushing the budget to "-500" (over target, unclamped per Story 3.2) — the Recommendation card correctly disappeared entirely, with no Over-Target banner (matching this story's exact scope: over/met-exactly both suppress the card from this story's perspective alone; Story 3.5 adds the banner layer later). This is a genuine live exercise of the new after-10pm logic in real conditions, not a simulation.
- **Post-review patch round** (5 findings, see Review Triage Log, all test-coverage/documentation additions with zero production logic changes): re-engaged the same implementation subagent. It added a before-5am met-exactly/over-target suppression test, documented the new `remainingBudget` parameter's meaning and sign convention, added a vegetarian-copy test with an actual `.text` assertion for the new window, consolidated a duplicated matrix-row comment, and updated the FR-9 response-contract comment to name both causes of an empty `recommendations` array. Re-ran the full sweep: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 47/47 pass; `npx next build` clean. No new live verification needed — no behavior changed, only tests and comments.

## Spec Change Log

## Review Triage Log

3-lens review (Blind Hunter, Edge Case Hunter, Verification Gap) run against the diff since `baseline_commit`. Edge Case Hunter found zero issues (explicitly re-checked per its own instructions rather than stopping empty).

| # | Finding | Lens(es) | Verdict | Evidence | Route |
|---|---------|----------|---------|----------|-------|
| 1 | The before-5am half of the merged window is only tested with "target not yet met"; no test asserts the met-exactly/over-target suppression case at an early-morning hour (only tested at 23:00) | Blind Hunter | low | Real coverage gap for an explicitly-claimed symmetry ("same Day, same rule as after-10pm"), though both halves share the exact same `hour >= 22 \|\| hour < 5` condition and the same ternary — not a genuinely distinct code path, just an untested one. Trivial to add. | patch |
| 2 | `getRecommendations()`'s doc comment wasn't updated to document the new `remainingBudget` parameter (meaning, sign convention, pre-computed-by-caller contract) | Blind Hunter | low | Confirmed — comment describes `entries` in detail but says nothing about the new parameter. Trivial doc fix. | patch |
| 3 | No new test exercises the `vegetarian` copy branch or asserts `.text` for the after-10pm/before-5am dinner slot — all new tests hardcode `non_vegetarian` and check slot identity only | Blind Hunter | low | Confirmed. The underlying lookup (`RECOMMENDATION_COPY[slot][dietaryPreference]`) is unchanged and already covered generally by Story 3.3's tests, but a targeted check costs nothing. | patch |
| 4 | The "Exactly 10:00pm / 4:59am boundaries" matrix-row comment is duplicated near-verbatim above two separate tests instead of stated once | Blind Hunter | low | Confirmed, cosmetic drift risk. Trivial to consolidate. | patch |
| 5 | `remainingBudget > 0` has no documented/guarded behavior for non-finite (`NaN`/`Infinity`) inputs | Blind Hunter | false | Refuted: both operands feeding `computeRemainingBudget()` (`profiles.daily_calorie_target`, `entries.calories`) are Postgres `integer` columns (confirmed by reading `schema.ts`) — neither can hold `NaN`/`Infinity` at the DB level. Same precedent already established for an equivalent finding in Story 3.2 (rejected there for the same DB-level-typing reason). | rejected (false) |
| 6 | `route.ts`'s FR-9 response-contract comment above POST's success path still describes an empty `recommendations` array as caused only by "all slots filled," not mentioning the new after-10pm/before-5am target-met/over-target cause | Blind Hunter | low | Confirmed, comment-accuracy gap. Trivial to update. | patch |
| 7 | `route.ts`'s wiring of `remainingBudget` into `getRecommendations()` at both call sites is unverified — a future edit swapping it for another in-scope `number` (e.g. `dailyCalorieTarget`) would compile cleanly and silently change every after-10pm/before-5am recommendation decision, with no test catching it | Verification Gap (filed: defer) | medium (unverified severity, per filed disposition) | Same established, repeatedly-confirmed route-level test gap every prior Epic 3 story has joined (`deferred-work.md`) — no route-handler test harness exists in this project. | defer |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: clean
- `npx eslint .` -- expected: clean
- `npm test` -- expected: all tests pass, including the updated `recommendation-engine.test.ts`
- `npx next build` -- expected: clean production build

**Manual checks (if no CLI):**
- Not practical to test the real after-10pm window live without manipulating the system clock — covered instead by direct unit tests against fixed `Date` instants (already this service's established testing approach, matching `day-boundary.test.ts`'s own boundary tests)
