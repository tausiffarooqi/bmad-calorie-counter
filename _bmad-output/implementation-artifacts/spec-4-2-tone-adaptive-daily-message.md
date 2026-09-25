---
title: 'Tone-Adaptive Daily Message'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '_bmad-output/implementation-artifacts/epic-4-context.md'
baseline_commit: '29104c4499faac5baf4e21dda54814e189bbc0c3'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.1's First-Login prompt shows the same neutral budget question regardless of how yesterday went — there's no reflection of the user's prior-Day performance, congratulatory or supportive, anywhere in the app.

**Approach:** Add a small `tone-message` service: given yesterday's Entries (found via `dayBoundary()` applied one instant before today's Day-start — never separate date math) and the current Daily Calorie Target, classify the outcome as `within_target`, `over_target`, or `neutral` (zero Entries yesterday, or no "yesterday" at all for a brand-new account — both look identical: zero Entries), and look up the matching static message. Computed only when the First-Login prompt is already showing (Story 4.1), rendered as its own small text line above the existing prompt card.

## Boundaries & Constraints

**Always:** "Yesterday" is derived the same way every other Day-scoped read in this app is — via `dayBoundary()`, never inline date math. Zero logged Entries yesterday (including a brand-new account with no prior Day at all) produces the identical neutral message — no fabricated within/over-target result. The comparison uses the *current* `dailyCalorieTarget` (this app has no historized/versioned target-per-Day) — an acceptable simplification, not a new gap this story introduces. "Within target" means `consumed <= target` (exactly-at-target counts as within, not over — same precedent as Story 3.4's "met exactly" treatment). Message copy follows the approved "supportive, never shaming" rule (FR-18) — the within-target message reuses the one approved example verbatim.

**Never:** Do not add a time-of-day-aware greeting line (e.g. "Good morning.") — it appears in the mockup but isn't in this story's own epics.md AC, isn't formalized in DESIGN.md as a real component/token, and a hardcoded, non-time-aware greeting would display wrong at other times of day; out of scope. Do not touch Story 4.1's `FirstLoginPrompt` component itself (its own scope is frozen to budget + question) — this story's message renders as a separate element alongside it, not inside it. Do not add a breakfast-offer or decline-path change (Stories 4.3/4.4). Do not compute or return this message when the First-Login prompt isn't showing.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Stayed within target yesterday | Yesterday's summed Entry calories <= `dailyCalorieTarget` | `"You stayed within your target yesterday — nice, steady work."` | N/A |
| Exceeded target yesterday | Yesterday's summed Entry calories > `dailyCalorieTarget` | A supportive, non-shaming message (see Design Notes for exact copy) | N/A |
| Zero Entries logged yesterday | No Entries in yesterday's Day window | Neutral message — neither congratulatory nor consoling | N/A |
| Very first Day ever (brand-new account) | Account created within today's Day; no prior Day exists | Identical neutral message as the zero-Entries case — no separate detection needed | N/A |
| First-Login prompt not showing | `showFirstLoginPrompt: false` | No tone message computed or returned at all | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/tone-message.ts` (new) -- `TONE_MESSAGES: Record<"within_target"|"over_target"|"neutral", string>` static lookup; `getToneMessageOutcome(yesterdayEntries: {calories:number}[], dailyCalorieTarget: number): "within_target"|"over_target"|"neutral"` — pure, sync
- `lib/services/tone-message.test.ts` (new) -- unit tests for every I/O matrix row plus the exactly-at-target boundary
- `app/api/entries/route.ts` -- `GET` handler: when `showFirstLoginPrompt` is true, compute yesterday's window via `dayBoundary(new Date(todayStart.getTime() - 1), tz)` (reusing the already-computed `todayStart`), fetch yesterday's Entries via the existing `getEntriesForDay()`, determine the outcome and message, include `toneMessage` in the response (omitted/undefined when the prompt isn't showing)
- `hooks/use-daily-view.ts` -- surface `toneMessage` alongside `showFirstLoginPrompt`
- `app/page.tsx` -- render `toneMessage` as its own small, muted-foreground text line immediately above `<FirstLoginPrompt>` when both are present — `FirstLoginPrompt` itself is untouched

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/tone-message.ts` -- implement `getToneMessageOutcome()` + the static message lookup -- the actual classification logic
- [x] `lib/services/tone-message.test.ts` -- cover every I/O matrix row -- first test for this service
- [x] `app/api/entries/route.ts` -- wire `toneMessage` into `GET`'s response, computed only when the prompt is showing -- avoids an unnecessary query otherwise
- [x] `hooks/use-daily-view.ts` -- surface `toneMessage` -- feeds the Daily view
- [x] `app/page.tsx` -- render the message above the existing prompt card -- the story's user-visible outcome

**Acceptance Criteria:**
- Given the user stayed within their Daily Calorie Target yesterday, when they see the First-Login prompt, then the message is congratulatory/confidence-building
- Given the user exceeded their Daily Calorie Target yesterday, when they see the First-Login prompt, then the message is supportive and encouraging — never shaming or alarm-toned
- Given yesterday had zero logged Entries, when they see the First-Login prompt, then the message is neutral, never fabricating a within/over-target result
- Given this is the user's very first Day ever, then the same neutral treatment applies as the zero-Entries case

## Implementation Notes

- `lib/services/tone-message.ts` (new): `ToneMessageOutcome` union type, `TONE_MESSAGES: Record<ToneMessageOutcome, string>` static lookup (within-target copy reused verbatim from the approved example; over-target and neutral copy exactly as authored in Design Notes), and `getToneMessageOutcome(yesterdayEntries, dailyCalorieTarget)` — pure/sync, mirrors `budget-engine.ts`'s "one function, one call site" style. Zero-length `yesterdayEntries` always returns `"neutral"` before any sum/comparison runs, so a brand-new account (no prior Day at all) and a zero-Entries returning user are structurally identical inputs, never separately detected. Otherwise sums calories and compares `consumed <= dailyCalorieTarget` ? `"within_target"` : `"over_target"` (exactly-at-target counts as within, per Story 3.4's precedent).
- `lib/services/tone-message.test.ts` (new): 6 tests covering every I/O matrix row (within-target, exactly-at-target boundary, over-target, zero-Entries neutral, brand-new-account neutral) plus a lookup-table content check pinning the exact approved/authored copy.
- `app/api/entries/route.ts`: `GET` now hoists `todayStart` out of its existing `dayBoundary(now, tz)` try block (previously block-scoped to `{ start, end }` destructured only inside that try) so it's available afterward. After `showFirstLoginPrompt` is determined, and only when it's `true`, computes yesterday's window via `dayBoundary(new Date(todayStart.getTime() - 1), tz)` (reusing `todayStart`, never separate date math), fetches yesterday's Entries via the existing `getEntriesForDay()`, and looks up `TONE_MESSAGES[getToneMessageOutcome(...)]` against the already-fetched `profile.dailyCalorieTarget`. Wrapped in its own try/catch that logs and falls back to `undefined` (never rethrows) — same "enrichment failure never fails the primary response" pattern this file already uses for `checkAndMarkFirstLoginPrompt()`/POST's post-submission recompute. `toneMessage` is spread into the JSON response; when `showFirstLoginPrompt` is `false` it stays `undefined`, which `NextResponse.json`'s underlying `JSON.stringify` omits from the payload entirely — matches the Code Map's "omitted/undefined when the prompt isn't showing" verbatim.
- `hooks/use-daily-view.ts`: added `toneMessage?: string` to the response interface and a `toneMessage` state field (defaulted `undefined`), populated the same way `remainingBudget` already is, returned alongside the other fields.
- `app/page.tsx`: inside the existing `showPrompt` branch, renders `{toneMessage && <p className="w-full max-w-sm text-sm text-muted-foreground">{toneMessage}</p>}` immediately above `<FirstLoginPrompt>` (now both wrapped in a fragment). `FirstLoginPrompt` itself received no changes. No extra gating needed beyond the truthiness check — the server only ever populates `toneMessage` when `showFirstLoginPrompt` is true, so it can only be present when this branch is already rendering.
- No new dependencies, no DB schema changes, no changes to `FirstLoginPrompt`, `recommendation-engine.ts`, or any breakfast/decline-path logic — all out of scope per Boundaries & Constraints.
- Independently re-verified rather than trusting the subagent's report alone (its sandbox had no Supabase/DB access): read the full diff, confirmed `todayStart` hoisting, the `showFirstLoginPrompt`-gated computation, the `.catch()` fallback, and `page.tsx`'s render logic. Re-ran the full sweep: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 58/58 pass; `npx next build` clean.
- **Live-verified all three tone-message outcomes** against a real production build (`next start` on a separate port, avoiding `next dev`'s Strict-Mode double-invoke that masks the first render — see Story 4.1's own note on this): registered a fresh throwaway account — the neutral message ("Here's to a good day of tracking.") showed correctly for the brand-new-account case (no prior Day at all), above the existing prompt card. Logged a real Entry, then used direct `psql` updates to simulate "yesterday": backdated the Entry to `created_at - 1 day` and reset `last_first_login_prompt_at` to 2 days ago — reloading showed the within-target message exactly as authored. Bumped the same Entry's `calories` to 2,500 (over the 2,000 default target) and reset the timestamp again — reloading showed the over-target message exactly as authored, screenshot-confirmed with the calm, muted-gray tone matching the rest of the app. Test account and server cleaned up afterward.
- **Post-review patch round** (see Review Triage Log): applied all four confirmed findings directly — extracted `previousDayBoundary(todayStart, tz)` into `day-boundary.ts` with a dedicated unit test (now 7 tests in `day-boundary.test.ts`, was 6), split the tone-message enrichment's try/catch into two (distinct log messages for the DB-fetch step vs. the pure classify+lookup step), corrected `page.tsx`'s comment to name the server's actual gating condition (`showFirstLoginPrompt`, not `showPrompt`), and wrapped the tone-message `<p>` + `<FirstLoginPrompt>` in their own `gap-2` column instead of a bare Fragment so they no longer inherit the page's `gap-6` major-section spacing. Re-ran the full sweep after patching: `npx tsc --noEmit` clean, `npx eslint .` clean, `node --test lib/**/*.test.ts` 59/59 pass (58 prior + 1 new for `previousDayBoundary`), `npx next build` clean (`Compiled successfully`, all routes generated). Live re-verification of the spacing fix and all three tone-message outcomes against a running `next start` build was **not repeated this round** — the local Supabase/Postgres instance (port 54322) is not currently reachable in this environment (`docker`/`podman` unavailable on PATH in both the Bash and PowerShell tools this session, so `npx supabase status` cannot inspect or start it). None of the four patches change any computed value or gating logic (pure extraction, log-message split, comment fix, and a CSS wrapper using the same `flex flex-col ... gap-*` pattern already used elsewhere in this exact file) — flagged as a real, disclosed gap rather than a claimed pass: a follow-up session with DB access should re-run the same three-outcome live check this story originally performed, to confirm the visual spacing and behavior still hold post-patch.

## Spec Change Log

## Review Triage Log

Three lenses ran: Verification Gap, Blind Hunter, Edge Case Hunter (0 findings — traced every changed path against callees and the DB schema, no unhandled branch, no deletion regression, no falsified claim against the frozen Intent/Tasks sections).

| # | Source | Finding | Verdict | Resolution |
|---|--------|---------|---------|------------|
| 1 | Blind Hunter #1 | The tone-message `<p>` and `<FirstLoginPrompt>` were bare Fragment children of the page's outer `flex-col gap-6` container, giving them the same 24px gap as unrelated major page sections — contradicts the Code Map's "immediately above" intent. | **Confirmed, patched** | Wrapped both in their own `flex flex-col items-center gap-2` column instead of a bare Fragment. |
| 2 | Verification Gap #1 | The yesterday's-window date math (`dayBoundary(new Date(todayStart.getTime()-1), tz)`) was inline at its only call site, unverified by any test. | **Confirmed, patched** | Extracted `previousDayBoundary(todayStart, tz)` into `day-boundary.ts` (the sole home of Day-attribution math), added a dedicated unit test, and updated the route to call it. |
| 3 | Blind Hunter #4 | The new try/catch collapsed two independently-fallible steps (yesterday's DB fetch; the pure classify+lookup) into one generic log message, inconsistent with this same file's `Promise.all` block giving entries/profile distinct log messages for attribution. | **Confirmed, patched** | Split into two try/catches with distinct log messages ("Failed to fetch yesterday's entries for tone message" / "Failed to compute tone-adaptive message outcome"), matching the established convention. |
| 4 | Verification Gap "Other finding" + Blind Hunter #6 | `page.tsx`'s comment said the tone message renders "alongside `showPrompt`", but the server actually gates it on `showFirstLoginPrompt` alone — currently harmless due to JSX nesting, but an inaccurate invariant description; the invariant itself is also not enforced anywhere beyond that description. | **Confirmed, patched (comment only)** | Corrected the comment to name `showFirstLoginPrompt` (the server's actual condition) — no code enforcement added since the value is only ever set server-side inside that same gate, so no client-side check can be more correct than the doc fix. |
| 5 | Blind Hunter #3 | `getToneMessageOutcome` has no guard against negative/non-finite calories or a non-positive `dailyCalorieTarget`. | **Rejected — false, unreachable** | `entries.calories` and `profiles.dailyCalorieTarget` are both non-nullable DB integers with no negative/zero path through this app's own writes (onboarding requires a positive target; estimation always returns positive calories) — same "DB integer typing + upstream validation" precedent already used to reject the analogous findings in Stories 3.2 and 3.4. Not a new gap this story introduces. |
| 6 | Blind Hunter #5 | The sequential yesterday-window DB round-trip adds latency to the first-load-of-the-day critical path, with no measurement/note. | **Rejected — accepted tradeoff** | Matches the frozen Code Map's own stated tradeoff ("avoids an unnecessary query otherwise") — computing only when the prompt is showing is the explicit design, not an oversight. |
| 7 | Verification Gap #2 + Blind Hunter #2 | No test coverage for the actual `route.ts` GET wiring (the `showFirstLoginPrompt` gate, the enrichment try/catches, the response shape). | **Deferred** | Converges with the project-wide "no route/page/hook test coverage" gap re-confirmed in nearly every story this segment (`node:test` structurally can't cover `app/**`) — extended in `deferred-work.md` rather than duplicated. |



- **Over-target message copy** (authored, no pre-approved example exists beyond the within-target one): `"Yesterday went over target — today's a fresh start."` — reuses the "fresh start" framing already established and approved for the Over-Target banner (Story 3.5), for tonal consistency across the app, while staying past-tense/reflective rather than reporting exact excess figures (unlike the banner, which is about *today's* live state).
- **Neutral message copy** (authored): `"Here's to a good day of tracking."` — deliberately avoids mentioning "yesterday" at all, since it must read naturally for both a returning user who logged nothing yesterday and a brand-new user for whom "yesterday" doesn't exist.
- **Greeting line scoped out** — see Boundaries & Constraints. If a real, time-of-day-aware greeting is wanted later, it's a separate, small follow-up, not bundled here.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: clean -- ACTUAL: clean, no output
- `npx eslint .` -- expected: clean -- ACTUAL: clean, no output
- `npm test` -- expected: all tests pass -- ACTUAL (pre-patch): 58/58 pass (52 pre-existing + 6 new in `tone-message.test.ts`); ACTUAL (post-patch): 59/59 pass (added 1 for `previousDayBoundary`)
- `npx next build` -- expected: clean production build -- ACTUAL: `Compiled successfully`, all routes generated (including `/api/entries`), no type/lint errors during the build's own TypeScript pass, both pre- and post-patch

**Manual checks (if no CLI):**
- Performed once, pre-patch: registered a fresh throwaway account against a real `next start` build with live Supabase/`psql` access, and directly observed all three tone-message outcomes (neutral for a brand-new account, within-target and over-target via `psql`-backdated Entries) rendering correctly above `FirstLoginPrompt` — see Implementation Notes for the full walkthrough.
- **Not repeated post-patch**: the local Supabase/Postgres instance was not reachable in the follow-up session that applied the Review Triage Log's patches (`docker`/`podman` unavailable on PATH) — see Implementation Notes' "Post-review patch round" note. None of the four patches change computed values or gating logic, only names/structure/spacing, but the visual spacing fix and full three-outcome behavior have not been re-observed live since. Flagged as the remaining real gap for a follow-up session with DB access to close.
