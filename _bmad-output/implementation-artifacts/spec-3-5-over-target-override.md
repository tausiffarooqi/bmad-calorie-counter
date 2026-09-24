---
title: 'Over-Target Override'
type: 'feature'
created: '2026-09-24'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
baseline_commit: 'ee0b7ea9e79717a087fa103f47ba8641a0ede9e9'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Nothing currently checks for the Over-Target State (cumulative Entry calories exceeding the Daily Calorie Target) at all — Stories 3.2–3.4 compute and consume `remainingBudget`, but a negative value today either shows stale/incorrect Recommendation cards (during 5am–10pm, which never checks budget) or is indistinguishable from "target met exactly" (Story 3.4's after-10pm rule, which already correctly shows nothing for `remainingBudget <= 0` but has no distinct "over" treatment).

**Approach:** Add one precedence check to the top of `getRecommendations()` (AD-6's single function): `remainingBudget < 0` short-circuits to zero recommendations, at any time of day, before any window logic runs — this is the "takes precedence over the time-of-day windows and the after-10pm rule without exception" requirement, enforced in exactly one place. The Daily view then renders the Over-Target banner instead of Recommendation cards whenever `remainingBudget < 0` — a client-side decision using data the API already returns, no new response field needed.

## Boundaries & Constraints

**Always:** `remainingBudget < 0` (strictly negative — exceeding, not just meeting, the target) is the Over-Target State; it suppresses every Recommendation card at any time of day, unconditionally. The banner and Recommendation cards are mutually exclusive — never rendered together. Banner copy reuses the approved example verbatim, templated with the real excess: `"{excess} calories over target today. No recommendation for now — tomorrow's a fresh start."` where `excess = Math.abs(remainingBudget)`. Banner styling: card background, clay/`primary` border and text, `md` radius (`rounded.md`) — never red/alarm/`destructive` styling (DESIGN.md, FR-18). The banner respects the same `!loadError` gate Recommendation cards already use (Story 3.3's fix) — never shows a stale banner after a failed refetch.

**Never:** Do not add a new API response field for this — `remainingBudget`'s existing sign is sufficient; the client derives `isOverTarget` itself. Do not touch how `remainingBudget` is computed (`budget-engine.ts`). Do not change Story 3.4's "met exactly" (`remainingBudget === 0`) behavior — that's still "done for the day, no card, no banner," distinct from "over." Do not build anything for FR-16/FR-17 (Epic 4's decline-path/breakfast-offer) beyond confirming `getRecommendations()`'s existing shape is already callable for them — no new code for those paths now.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Over target, morning window | Local hour 8, `remainingBudget = -50` | `getRecommendations()` returns `[]`; Daily view shows the banner, not cards | N/A |
| Over target, midday window | Local hour 15, `remainingBudget = -180` | Same — `[]` + banner, overriding the 12pm–10pm window that would otherwise show a dinner card | N/A |
| Over target, after 10pm | Local hour 23, `remainingBudget = -50` | Same — `[]` + banner (Story 3.4's own "met/over" check never even runs; short-circuited earlier) | N/A |
| Exactly met (not over) | Any hour, `remainingBudget = 0` | Unchanged from Stories 3.3/3.4 — normal window rules apply, no banner | N/A |
| Under target | Any hour, `remainingBudget > 0` | Unchanged — normal Recommendation cards | N/A |
| Failed refetch after a prior over-target load | `loadError = true` | Neither the banner nor stale Recommendation cards render | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/recommendation-engine.ts` -- `getRecommendations()` gains a leading `if (remainingBudget < 0) return [];` before any window logic — the single, first-checked precedence rule (AD-6)
- `lib/services/recommendation-engine.test.ts` -- new tests: over-target at a morning-window hour, a midday-window hour, and an after-10pm hour, all asserting `[]`; confirm the existing "met exactly" (`0`) tests are unaffected
- `app/page.tsx` -- compute `isOverTarget = remainingBudget !== undefined && remainingBudget < 0`; render the Over-Target banner (clay/`primary` border, `rounded.md`, templated excess-calories copy) when `!loadError && isOverTarget`, and the existing `recommendations.map(...)` only when `!loadError && !isOverTarget` — mutually exclusive, both gated on `loadError` the same way Story 3.3 already gates Recommendation cards

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/recommendation-engine.ts` -- add the Over-Target precedence short-circuit -- the actual behavior change, in the one function (AD-6)
- [x] `lib/services/recommendation-engine.test.ts` -- cover every I/O matrix row -- confirms precedence over every window, not just after-10pm
- [x] `app/page.tsx` -- render the banner vs. Recommendation cards, mutually exclusive, `loadError`-gated -- the story's user-visible outcome

**Acceptance Criteria:**
- Given cumulative Entry calories exceed the Daily Calorie Target, when I view the Daily view at any time of day, then every Recommendation card is replaced by an Over-Target banner reporting the excess calories consumed
- Given the Over-Target State is active, then it takes precedence over the time-of-day windows and the after-10pm rule without exception
- Given the Over-Target banner is shown, then its copy follows the approved, non-shaming example verbatim (templated with the real excess) and uses the calm clay-toned visual treatment, never red/alarm styling
- Given `getRecommendations()`'s existing shape and precedence check, then it's already callable, unmodified, by a future Epic 4 caller needing the same precedence — no new function needed for that

## Implementation Notes

- `getRecommendations()` gained a single leading guard, `if (remainingBudget < 0) return [];`, placed before `expectedSlotsForHour()` is even called — satisfies AD-6's "one place enforces precedence" requirement; the after-10pm rule's own `remainingBudget > 0` check is unreached whenever this guard fires.
- `app/page.tsx` derives `isOverTarget = remainingBudget !== undefined && remainingBudget < 0` and renders the banner in a new `{!loadError && isOverTarget && (...)}` block immediately before the existing Recommendation-cards block, which was changed to `{!loadError && !isOverTarget && recommendations.map(...)}` — the two are now mutually exclusive and share the same `loadError` gate.
- Banner markup: `rounded-md border border-primary bg-card p-4` with `text-sm text-primary` body copy — deliberately plain body text, not `{typography.recommendation}` (italic Lora), since DESIGN.md's Over-Target banner component entry lists only background/border/foreground/radius and its Do/Don't table reserves the Lora italic role for the Recommendation card alone.
- Banner copy uses `&apos;` for the apostrophe in "tomorrow's," matching the existing codebase convention for straight apostrophes in JSX text (see `entries-list.tsx`, `log-photo-dialog.tsx`, `log-entry-dialog.tsx`, login page).
- Added four new tests to `recommendation-engine.test.ts` covering the three Over-Target I/O matrix rows (morning window, midday window, after-10pm) plus one "met exactly during the morning window is unaffected" regression check, since the pre-existing "met exactly" tests only exercised the after-10pm window.
- **Post-review patch round** (3 findings, see Review Triage Log, all non-behavioral): re-engaged the same implementation subagent. It corrected a now-stale comment (the after-10pm branch's `[]` case can no longer mean "or over," since the new guard already intercepts negative values earlier), removed an unnecessary `as number` type assertion in `page.tsx` for consistency with the sibling `budgetReady` pattern, and added a test proving the precedence short-circuit ignores already-logged Meal entries entirely (not incidentally returning `[]` because slots happened to be full). Re-ran the full sweep: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 52/52 pass; `npx next build` clean. No new live verification needed — none of the three fixes changed any runtime behavior.

## Spec Change Log

## Review Triage Log

3-lens review (Blind Hunter, Edge Case Hunter, Verification Gap) run against the diff since `baseline_commit`.

| # | Finding | Lens(es) | Verdict | Evidence | Route |
|---|---------|----------|---------|----------|-------|
| 1 | The pre-existing after-10pm comment above `return remainingBudget > 0 ? ["dinner"] : []` still says the empty branch means "met exactly or over" — but the new Story 3.5 guard already short-circuits every negative value earlier, so "or over" is now unreachable at this point in the code | Blind Hunter | low | Confirmed by reading the code — the new guard runs first, so `remainingBudget` can never be negative by this line. Trivial comment fix. | patch |
| 2 | `app/page.tsx`'s new banner uses `Math.abs(remainingBudget as number)`, an unnecessary type assertion inconsistent with the file's own established convention (the sibling `budgetReady` guard already lets TypeScript narrow `remainingBudget` to `number` with no cast) | Blind Hunter | low | Confirmed — `isOverTarget`'s guard has the identical shape to `budgetReady`'s, and the codebase's existing usage proves TS narrows through it without a cast. Cosmetic/consistency, trivial fix. | patch |
| 3 | The new "over target" tests all pass an empty `entries` array, so nothing proves the precedence short-circuit actually ignores already-logged Meal entries as the spec intends ("before any window logic runs," regardless of filled-slot count) | Blind Hunter | low | Confirmed by reading the tests. Trivial to add one more case with a meal-classified entry present. | patch |
| 4 | The Over-Target rule (`remainingBudget < 0`) is implemented independently in two places (`recommendation-engine.ts`'s short-circuit and `app/page.tsx`'s `isOverTarget`) with no shared constant/helper — kept in sync only by cross-referencing comments | Blind Hunter | low | Confirmed real, but this is the frozen spec's own deliberate design choice ("a client-side decision using data the API already returns... no new response field needed") — extracting a shared cross-server/client helper would mean renegotiating that already-approved design, not a same-story patch, for a two-character comparison unlikely to need independent tweaking. | rejected (matches frozen spec's own explicit design) |
| 5 | The Over-Target banner has no `aria-live`/`role="status"` wiring, even though it can appear via an in-place DOM change right after logging an Entry | Blind Hunter | medium | Real accessibility gap — same class already found and deferred for `remainingBudget` (Story 3.2) and Recommendation cards (Story 3.3) in this same file, pending a holistic Daily-view live-region strategy rather than piecemeal per-element patches. | defer (extends the existing deferred-work.md entry) |
| 6 | `!loadError` is now checked three separate times in `page.tsx` with no single derived "safe to render dynamic content" flag | Blind Hunter | low | Real but very minor repetition (a single boolean re-check, not complex logic) — consistent with this project's own stated preference against premature abstraction for this little duplication. | rejected (low, premature abstraction for the current scale) |
| 7 | The new early return (`if (remainingBudget < 0) return [];`) skips the `getLocalHour(now, tz)` call entirely, so an invalid `tz` would go unvalidated whenever `remainingBudget` is negative | Edge Case Hunter | false | Refuted: `tz` is already validated via `isValidTimeZone()` in both `route.ts` call sites before `getRecommendations()` is ever invoked, so `getLocalHour()` calling it would never throw regardless. Skipping an irrelevant computation once the outcome is already determined is the intended short-circuit behavior (same reasoning as Story 3.4's analogous, already-rejected finding), not a defect to "fix" by forcing a pointless call. | rejected (false) |
| 8 | The Daily view's Over-Target banner/Recommendation-card branching (the `isOverTarget` derivation and the mutual-exclusivity render logic) has no automated coverage anywhere — a wrong threshold (e.g. `<= 0`) or non-exclusive rendering would ship with `npm test`/`tsc`/`eslint`/`next build` all passing | Verification Gap (filed: defer) | medium (unverified severity, per filed disposition) | Confirmed — no component/e2e test harness exists for `app/page.tsx` or any `.tsx` file in this project; the one manual walkthrough recorded in this spec's Verification section doesn't re-run on future changes. | defer |

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: clean -- ACTUAL: clean, no output
- `npx eslint .` -- expected: clean -- ACTUAL: clean, no output
- `npm test` -- expected: all tests pass, including the updated `recommendation-engine.test.ts` -- ACTUAL: 51/51 pass (36 pre-existing + a net +4 new Over-Target tests, replacing 0 removed)
- `npx next build` -- expected: clean production build -- ACTUAL: `Compiled successfully`, all routes generated

**Manual checks (if no CLI):**
- Done — independently re-ran `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 51/51 pass; `npx next build` clean. Registered a fresh throwaway account against the real local Supabase instance, logged a real ~2500-calorie meal against the real Gemini API (default 2,000-calorie target) — the Daily view showed budget "-500" and the Over-Target banner reading "500 calories over target today. No recommendation for now — tomorrow's a fresh start." (exact excess, exact approved copy), with no Recommendation card alongside it. Screenshot-confirmed the banner's clay/`primary` styling visually matches the budget number's own tone — calm, not red/alarm.
