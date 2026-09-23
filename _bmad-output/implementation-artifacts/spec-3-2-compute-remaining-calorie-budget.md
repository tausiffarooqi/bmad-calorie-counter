---
title: 'Compute Remaining Calorie Budget'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
baseline_commit: 'e807f7945f4ebae49f48bbdb9c0cf8a61ed596ab'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `app/page.tsx` (the Daily view) shows a hardcoded placeholder Remaining Calorie Budget number ("1,240") — nothing yet computes a real value from the user's Daily Calorie Target and today's logged Entries.

**Approach:** Add a `budget-engine` service computing Remaining Calorie Budget = Daily Calorie Target minus the sum of today's Entries' calories (Meal and Snack/Beverage both count, FR-8). Extend `GET /api/entries` to return the computed value alongside the entries list — same day-scoped DB read already in place, no new query. Replace the Daily view's hardcoded number with the real, live value, updating whenever an Entry is logged (same `refreshKey` mechanism Story 2.4 established). While that first fetch is in flight, show EXPERIENCE.md's already-specified Cold-load treatment — a brief skeleton placeholder matching the eventual layout (budget number, entries container), resolving the instant real data arrives, never a separate "loading screen."

## Boundaries & Constraints

**Always:** Budget is computed from the same day-scoped Entry rows `dayBoundary()` already selects for the list (Story 2.4) — no second DB query. Both Meal and Snack/Beverage Entries count identically toward the sum. The value can be negative (Over-Target) and is returned as-is, unclamped. The Daily view shows a skeleton placeholder (matching the budget number's/entries container's eventual layout, not blank text) until the first fetch resolves, per EXPERIENCE.md's State Patterns.

**Never:** Do not clamp or round the value to zero when negative. Do not add Over-Target banner styling or detection logic (Story 3.5's concern). Do not touch `POST /api/entries`'s response shape — this story's AC is scoped to viewing the Daily view, not the per-submission response. Do not add Meal Slot/Recommendation logic (Story 3.3+).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Zero Entries logged today | Daily Calorie Target = 2000, no Entries in today's window | `remainingBudget = 2000` | N/A |
| One or more Entries logged | Target = 2000, Entries summing to 750 cal | `remainingBudget = 1250` | N/A |
| Entries push cumulative calories over target | Target = 2000, Entries summing to 2300 cal | `remainingBudget = -300` (returned as-is, never clamped) | N/A |
| Entry logged 12am–5am | Local time 2am | Attributed to the still-open previous Day via `dayBoundary()` (AD-5), included in that Day's sum — same window the Entries list already uses | N/A |
| Missing/invalid `tz` query param | Existing validation | Unchanged existing 400 response | Unchanged |

</frozen-after-approval>

## Code Map

- `lib/services/budget-engine.ts` (new) -- `computeRemainingBudget(dailyCalorieTarget: number, entries: { calories: number }[]): number` — pure, sync, single source of truth for the subtraction (mirrors `day-boundary.ts`'s "one function, one call site" pattern)
- `lib/services/budget-engine.test.ts` (new) -- unit tests: zero Entries, several Entries, over-target (negative result)
- `app/api/entries/route.ts` -- GET handler: after fetching `rows` (today's Entries), also call `getProfile(user.id)` for `dailyCalorieTarget`, compute `computeRemainingBudget(profile.dailyCalorieTarget, rows)`, and include `remainingBudget` in the JSON response alongside `entries`
- `hooks/use-daily-view.ts` (new) -- extracts the fetch effect currently inside `app/entries-list.tsx` (tz detection, session-expiry redirect, error handling) into a shared hook `useDailyView(refreshKey)` returning `{ entries, remainingBudget, loadError }` — one fetch to `GET /api/entries`, shared by both the budget number and the Entries list, instead of two independent fetches for the same data
- `app/entries-list.tsx` -- becomes presentational: drops its own fetch effect and `refreshKey` prop, takes `entries`/`loadError` as props instead (same rendering logic/markup, untouched)
- `app/page.tsx` -- calls `useDailyView(refreshKey)`; renders `remainingBudget` (formatted via `.toLocaleString()`) in place of the hardcoded `"1,240"`; passes `entries`/`loadError` down to `EntriesList`

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/budget-engine.ts` -- add `computeRemainingBudget()` -- the actual computation, one place
- [x] `lib/services/budget-engine.test.ts` -- cover zero/some/over-target cases -- first test for this new service
- [x] `app/api/entries/route.ts` -- GET handler returns `remainingBudget` -- wires the service into the existing read path, no new query
- [x] `hooks/use-daily-view.ts` -- extract shared fetch hook -- avoids two components independently fetching the same day-scoped data
- [x] `app/entries-list.tsx` -- convert to presentational props (`entries`, `loadError`) -- consumes the shared hook's data instead of fetching its own
- [x] `app/page.tsx` -- wire real `remainingBudget` into the Daily view, replacing the hardcoded placeholder -- the story's user-visible outcome

**Acceptance Criteria:**
- [x] Given a Daily Calorie Target is set and one or more Entries are logged today, when the Daily view loads, then Remaining Calorie Budget equals the target minus the sum of all of today's Entries' calories (Meal and Snack/Beverage both counted)
- [x] Given an Entry is logged between 12am and 5am local time, then it's attributed to the still-open previous Day (via `dayBoundary()`, never inline date math) and included in that Day's budget sum
- [x] Given zero Entries are logged today, when the Daily view loads, then Remaining Calorie Budget equals the full Daily Calorie Target, and the Entries list is omitted entirely (Story 2.4's existing behavior, unchanged)
- [x] Given a Snack/Beverage Entry is logged, then it reduces Remaining Calorie Budget exactly like a Meal Entry would, by the same amount

## Implementation Notes

- `lib/services/budget-engine.ts` is a pure, sync `computeRemainingBudget(dailyCalorieTarget, entries)` — sums `entries[].calories` and subtracts from the target, unclamped. It takes only `{ calories }`, so a Meal and a Snack/Beverage Entry are structurally indistinguishable to it and reduce the sum identically (Requirements & Constraints, FR-8) — no classification field is read at all.
- `app/api/entries/route.ts`'s `GET` handler now also calls `getProfile(user.id)` inside the same `try` block as `getEntriesForDay()` (no new query against `entries`, one new query against `profiles`), throws (caught by the existing `catch`, surfaced as the existing `entries_fetch_failed` 500) if no profile row exists — mirroring `preferences/page.tsx`'s identical defensive guard — then calls `computeRemainingBudget()` and adds `remainingBudget` to the JSON response alongside `entries`. `POST /api/entries`'s response shape is untouched.
- `hooks/use-daily-view.ts` (new) extracts the fetch effect previously inside `entries-list.tsx` verbatim (tz detection via `Intl.DateTimeFormat().resolvedOptions().timeZone`, `response.redirected` session-expiry handling, JSON-parse/error handling) into `useDailyView(refreshKey)`, returning `{ entries, remainingBudget, loadError }` from one `GET /api/entries` call. Also exports the `Entry` interface so `entries-list.tsx` can consume the same shape without redeclaring it.
- `app/entries-list.tsx` is now a plain presentational component: no `useEffect`/`useState`, no `refreshKey` prop, just `entries`/`loadError` props. Rendering logic/markup is byte-for-byte unchanged from before.
- `app/page.tsx` calls `useDailyView(refreshKey)` once and threads its result to both the budget `<p>` (replacing the hardcoded `"1,240"`, formatted via `.toLocaleString()`, rendered blank until the first fetch resolves rather than flashing a wrong number) and `<EntriesList entries={entries} loadError={loadError} />`.
- **Post-review patch round** (5 findings, see Review Triage Log): re-engaged the same implementation subagent. It split `route.ts`'s GET handler's shared, single-message try/catch into per-stage logging (mirroring Story 3.1's POST fix) via per-promise `.catch()` handlers feeding one `Promise.all()`, so the two lookups now run concurrently instead of sequentially while still logging distinctly; added the Cold-load skeleton (muted `animate-pulse` placeholder blocks, `aria-hidden`, sized to the budget number/entries container) driven by a new `firstLoadPending` flag; fixed the stale-budget-after-failed-refetch bug via a `budgetReady = remainingBudget !== undefined && !loadError` flag that falls back to the skeleton whenever the latest fetch failed, never showing a cached stale number; and replaced the leftover Epic-0 label "Design token foundation" with "Remaining calories today".
- Independently re-verified the diff by reading it in full (not just trusting the subagent's report): the `Promise.all` correctly attributes each failure to its own `.catch()` before Promise.all's rejection reaches the outer catch (both failures log if both genuinely occur); `firstLoadPending`/`budgetReady` correctly distinguish cold-load, ready, and stale-after-error states; `EntriesList` needed no changes since its own pre-existing `loadError` handling already avoids showing stale entries.
- Re-ran the full sweep after the patch round: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 25/25 pass; `npx next build` clean.
- **Live-verified the stale-refetch fix specifically** (the most safety-relevant of the five fixes) against the real local Supabase/Gemini stack: registered a throwaway account, confirmed normal load ("2,000", correct new label). Installed a `window.fetch` interceptor that let the first intercepted GET succeed but forced the *second* GET (a refetch triggered by logging an Entry) to reject, simulating a transient network failure after a successful prior load. Logged two real Entries in sequence: after the first (non-intercepted) refetch, the budget correctly updated to "1,750". After the second (intercepted, failing) refetch, the budget number's stale "1,750" was gone — replaced by the skeleton placeholder block (confirmed both structurally, via the accessibility snapshot showing no stale text, and visually, via a screenshot showing the muted placeholder rectangle) — while `EntriesList` correctly showed its own "Couldn't load today's entries" alert below it. A third, non-intercepted refetch (logging one more real Entry) confirmed full recovery: budget correctly showed "1,628" (2,000 − 250 − 2 − 120) with all three Entries listed. Confirmed via direct `psql` query that both real Entries logged during the intercepted-failure window persisted correctly (the interceptor only targeted `GET`, never `POST`).
- The Cold-load skeleton's *initial* page-load transient window was not independently captured on video/screenshot (local Supabase resolves it too fast to reliably screenshot mid-flight without its own fetch-delay instrumentation) — verified instead by direct code reading (the `firstLoadPending` condition and its skeleton JSX are straightforward and unambiguous) and by the fact that the same skeleton code path was directly, visually confirmed live during the stale-refetch test above (same JSX branch, same CSS classes, just reached via a different one of the two conditions that can trigger it).

## Spec Change Log

- **Finding:** Blind Hunter (first pass) flagged that EXPERIENCE.md's State Patterns table already specifies a Cold-load skeleton state for the Daily view ("brief skeleton placeholder matching the eventual layout... while today's data loads... no separate loading screen"), which this spec's original frozen Intent/Boundaries never captured — the shipped implementation rendered blank text during the initial fetch instead.
- **Amended:** Added the Cold-load skeleton requirement to `## Intent` (Approach) and `## Boundaries & Constraints` (Always).
- **Known-bad state avoided:** The Daily view's primary focal element (the budget number) silently rendering as nothing at all during first load, with no visual acknowledgment that data is on its way — diverging from an already-adopted, human-approved UX spec.
- **User decision:** Presented as a checkpoint (per the review process's intent-gap loopback) rather than amended unilaterally. User chose to add it now as a small, targeted patch rather than a full revert-and-re-derive of the story's already-verified implementation.
- **KEEP:** Everything else in the existing implementation (`budget-engine.ts`, the route wiring, the `useDailyView` hook's fetch/error logic, `EntriesList`'s presentational conversion) is correct and unaffected — only the loading-state rendering in `app/page.tsx`/`app/entries-list.tsx` needs the skeleton treatment added on top.

## Review Triage Log

3-lens review (Blind Hunter — run twice, first against an incomplete diff missing the new untracked files, then re-run against the corrected full diff; Edge Case Hunter; Verification Gap) run against the diff since `baseline_commit`.

| # | Finding | Lens(es) | Verdict | Evidence | Route |
|---|---------|----------|---------|----------|-------|
| 1 | EXPERIENCE.md's State Patterns table specifies a Cold-load skeleton state for the Daily view, never captured in this spec's frozen Intent/Boundaries — the shipped implementation rendered blank text during the initial fetch instead | Blind Hunter (first pass) | medium | Confirmed real, documented, unambiguous requirement (`EXPERIENCE.md:67`). See Spec Change Log for the amendment and the user's resolution. | patch (frozen block amended with user sign-off, then patched — not a full revert/re-derive) |
| 2 | `route.ts`'s `GET` handler folds the entries-query failure, the profile-query failure, and the missing-profile data-corruption case into one shared try/catch, one log message ("Failed to load today's entries:"), and one generic `entries_fetch_failed` code — a data-corruption case now looks identical to a transient query error | Blind Hunter (both passes) | medium | Confirmed by reading `route.ts:266-286`. Directly inconsistent with the stage-distinct logging pattern this same file's `POST` handler adopted one story ago (Story 3.1's own patch round) for the analogous classify-vs-createEntry split. Real operational-diagnosability cost. | patch |
| 3 | `rows = await getEntriesForDay(...)` and `profile = await getProfile(...)` are independent lookups against different tables but awaited sequentially instead of via `Promise.all` | Blind Hunter (2nd pass) | low | Confirmed real — needlessly serializes two round trips on every `GET`. Negligible on local Postgres today, but a trivial, correct fix. | patch |
| 4 | `app/page.tsx`'s Remaining Calorie Budget `<p>` renders a stale, previously-successful value with no error indication after a failed *refetch* (`loadError` becomes `true` but `remainingBudget` is never reset, and the render expression never checks `loadError`) | Edge Case Hunter, converging with Blind Hunter's "no distinct loading/error state" framing | medium | Reproduced by reading `use-daily-view.ts`'s error branches (none reset `remainingBudget`) and `page.tsx`'s render expression (`remainingBudget !== undefined ? ... : ""`, no `loadError` check). Real, user-facing: a user could see a wrong, out-of-date calorie budget with no indication anything failed. | patch |
| 5 | `app/page.tsx`'s label above the now-real budget number is still the unchanged Epic-0 placeholder text "Design token foundation," leaving the page's primary focal number with no actual accessible label | Blind Hunter (2nd pass) | medium | Confirmed — real content/accessibility gap now that this is live, meaningful data rather than a demo value. | patch |
| 6 | `computeRemainingBudget()` has no test for negative/non-integer `calories` inputs | Blind Hunter (2nd pass) | false | Refuted: `entries.calories` is a Postgres `integer` column (`schema.ts`), and every write path validates `calories >= 0` and integer-rounds before persistence (`gemini-adapter.ts`'s `isValidPayload`/`Math.round`) — there is no live path that could feed this function a negative or non-integer value. Testing against an unreachable input would violate this project's own "don't validate states that can't happen" convention. | rejected (false) |
| 7 | `GET /api/entries`'s new `profiles` dependency (the missing-profile branch specifically, and the route's behavior generally) has no automated test coverage at any level | Verification Gap (filed: defer) | medium (unverified severity, per filed disposition) | `route.ts` has no test file at all — this is the same pre-existing, already-logged gap from Story 3.1's own deferred-work.md entry; this story's new branch simply extends it. Closing this needs a route-level test harness that doesn't exist for any behavior in this file yet. | defer |
| 8 | `remainingBudget`'s wire-up from route → hook → render is unexercised end-to-end; `EntriesApiResponse` types the field optional, so a future regression dropping it from the response would silently render as an indistinguishable-from-loading blank, with no test catching it | Verification Gap (filed: defer), Blind Hunter (2nd pass, same underlying gap) | medium (unverified severity) | Same root cause as #7 — no test harness exists for `route.ts`, `use-daily-view.ts`, or `page.tsx`. Disposition matches Verification Gap's own filed reasoning: disproportionate to build a one-off harness for just this wire-up. | defer |
| 9 | No `aria-live`/`role="status"` on the budget `<p>`, unlike `EntriesList`'s `<ul aria-live="polite">` — screen readers get no announcement when the number first populates or changes | Blind Hunter (both passes) | medium | Confirmed real accessibility gap. Not patched in isolation: Story 2.5's own review already found and deferred a "multiple independent `aria-live` regions on one page can race/conflict" concern for this same Daily view (`deferred-work.md`, Story 2.5 entries) — adding a fourth live region here without addressing that coordination question holistically would compound the same already-known problem rather than fix it properly. | defer |

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, clean, no type errors.
- `npx eslint .` -- ran, clean, no lint errors.
- `npm test` -- ran, all 25 tests pass (21 pre-existing + 4 new in `budget-engine.test.ts`: zero Entries, several Entries, over-target/negative, single-Entry-regardless-of-kind).
- `npx next build` -- ran, clean production build; `/api/entries` still appears as a dynamic (ƒ) route, no new warnings.

**Manual checks (if no CLI):**
- Done — the implementation subagent's sandbox had no Docker/Podman, but this session's own environment has a running local Supabase instance. Registered a fresh throwaway account with the default 2,000 Daily Calorie Target: the Daily view immediately showed "2,000" with zero Entries and the Entries list correctly omitted. Logged a real text Entry ("two scrambled eggs with a slice of toast and butter") against the real Gemini API — persisted as 260 calories (confirmed via direct `psql` query) — and the Daily view updated to "1,740" (2,000 − 260), with the Entries list showing the new row. Also independently re-ran `npx tsc --noEmit`, `npx eslint .`, `npm test` (25/25 pass), and `npx next build`, all clean.
