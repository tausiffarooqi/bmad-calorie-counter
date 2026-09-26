---
title: '3-Month Trend View'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-5-context.md'
baseline_commit: 'fccead1'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app only ever shows today's snapshot — there's no way to see how the last few months of tracking actually went.

**Approach:** A new `/trends` page, reached via a nav link from the Daily view, showing a day-by-day list of the last 3 months: each day's total calories against the Daily Calorie Target. Days with zero logged Entries are simply absent from the list (never a fabricated zero). A brand-new-account-shaped empty state ("Nothing logged yet...") covers both a genuinely new account and an account whose entire 3-month window happens to be empty — one calm message, one condition (`days.length === 0`), no separate all-time-history check.

## Boundaries & Constraints

**Always:** Day attribution goes through the existing `dayBoundary(timestamp, tz)` — never separate calendar-date math (AD-5, same rule as everywhere else in this app). `tz` is client-detected and sent per-request (fetch, not a cookie/server component) — matches every other tz-consuming route's established convention; never stored. The comparison uses each day's *current* `dailyCalorieTarget` (no historized/versioned target-per-day) — same accepted simplification as Story 4.2's tone message. Reuses `getEntriesForDay(userId, start, end)` verbatim for the whole 3-month range (it already accepts an arbitrary window, not just one Day, despite its name) — no new DB query function needed.

**Never:** No new DB tables/columns — this reads only from `entries`/`profiles`, nothing persisted for this epic. No pagination or infinite scroll (EXPERIENCE.md: both this and the Entries list are bounded datasets — load the full window at once). No red/alarm styling for over-target days — plain text throughout, same "supportive, never shaming" rule as everywhere else. Story 5.2 (aggregate stats) is explicitly out of scope here — this story is the day-by-day list only.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Days with logged Entries in the last 3 months | 1+ Entries per day | Each such day shown: total calories vs. Daily Calorie Target | N/A |
| A day in the window has zero Entries | No Entries in that Day's window | That day is absent from the list entirely — never a zero-calorie row | N/A |
| Window is entirely empty (new account, or nothing logged in 3 months) | `days.length === 0` after aggregation | Calm "Nothing logged yet — check back once you've tracked a few days." message, no list, no chart | N/A |
| Fetch fails | Network/server error on `GET /api/trends` | Same distinct load-error line pattern as `EntriesList` — never indistinguishable from the empty-window state | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/trends.ts` (new) -- `export interface TrendDay { dayStart: string /* ISO instant, the Day-window's start */; totalCalories: number; dailyCalorieTarget: number }`; `computeTrendDays(entries: {calories:number; createdAt:Date}[], dailyCalorieTarget: number, tz: string): TrendDay[]` -- pure, sync. Buckets each Entry by `dayBoundary(entry.createdAt, tz).start.toISOString()` (a Map keyed by that string), sums calories per bucket, maps to `TrendDay[]`, sorted **most-recent-first** (Design Notes) -- bucketing this way means a day with zero Entries simply never gets a Map key, satisfying "omit empty days" with no extra filter step
- `lib/services/trends.test.ts` (new) -- unit tests covering every I/O matrix row reachable at this layer: multiple entries same day sum correctly, entries split across two different days produce two buckets, empty input returns `[]`, ordering is most-recent-first, a Day-boundary-adjacent timestamp (just before/after 5am local) buckets into the correct Day (reuses `day-boundary.test.ts`'s known-good fixture times)
- `app/api/trends/route.ts` (new) -- thin `GET` handler, same shape as `app/api/entries/route.ts`'s `GET`: auth via `createClient()`/`getUser()` (401), validate `tz` query param via `isValidTimeZone()` (400), compute `windowStart` as 3 calendar months before `now` (plain `Date` arithmetic -- `setMonth(getMonth() - 3)`, no new dependency, mirrors `day-boundary.ts`'s own no-library approach) run through `dayBoundary(..., tz).start`, `windowEnd` as `dayBoundary(now, tz).end` (today's Day-end -- includes today so far); fetch `getEntriesForDay(user.id, windowStart, windowEnd)` and `getProfile(user.id)` (`Promise.all`, each with its own `.catch()` for distinct log messages, same convention as `entries/route.ts`); call `computeTrendDays(rows, profile.dailyCalorieTarget, tz)`; return `{ days }` (an empty array is a valid, correctly-handled response, not an error)
- `app/(routes)/trends/page.tsx` (new) -- client component (needs the browser's tz, same reason the Daily view is a client component, not a server component): on mount, `fetch('/api/trends?tz=' + getClientTimeZone())` (reuses `lib/get-client-timezone.ts`, Story 3.3), same Cold-load skeleton pattern as `app/page.tsx` (`animate-pulse` placeholder while pending), renders the empty-state message when `days.length === 0`, otherwise a bordered list of day-rows modeled on `entries-list.tsx`'s existing row treatment (`rounded-md border border-border bg-card`, `border-t` dividers between rows) -- one row per day: formatted date + `{totalCalories} / {dailyCalorieTarget} cal`, plain text, no color-coding
- `app/page.tsx` -- add one more icon-only nav control next to the existing Settings link (Settings icon → `/preferences`), linking to `/trends`, with an accessible name (e.g. `aria-label="View historical trends"`), same `Button asChild variant="ghost" size="icon"` treatment as the existing Settings button

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/trends.ts` -- `computeTrendDays()` -- the pure aggregation logic
- [x] `lib/services/trends.test.ts` -- cover every I/O matrix row reachable at this layer
- [x] `app/api/trends/route.ts` -- wire the 3-month window fetch + aggregation into a thin GET handler
- [x] `app/(routes)/trends/page.tsx` -- the new page: fetch, loading/empty/error states, day-row list
- [x] `app/page.tsx` -- add the Trends nav link

**Acceptance Criteria:**
- Given the last 3 months contain logged Entries on some days, when Historical Trends loads, then each such day shows its total calories against that day's Daily Calorie Target
- Given a day in the window has zero logged Entries, then that day never appears in the list
- Given the window is entirely empty (new account, or nothing logged in 3 months), then the calm "Nothing logged yet" message shows instead of an empty list
- Given the Trends fetch fails, then a distinct load-error message shows — never indistinguishable from a genuinely empty window

## Implementation Notes

- `lib/services/trends.ts` (new): `TrendDay` interface + `computeTrendDays()` — pure, buckets Entries by `dayBoundary(entry.createdAt, tz).start.toISOString()` in a `Map` (zero-Entry days never get a key), sums per bucket, sorts most-recent-first. Imports `dayBoundary` via a relative `./day-boundary.ts` path rather than the `@/...` alias, matching `entry-classifier.ts`/`recommendation-engine.ts`'s existing accommodation for files with a directly-run `node --test` unit test.
- `lib/services/trends.test.ts` (new): 5 tests covering every I/O matrix row reachable at this pure layer (same-day summing, cross-day bucketing, empty input, most-recent-first ordering, a Day-boundary-adjacent bucketing case reusing `day-boundary.test.ts`'s known-good fixture times).
- `app/api/trends/route.ts` (new): thin GET handler mirroring `app/api/entries/route.ts`'s GET — auth, `tz` validation, 3-months-back window computed via plain `Date` arithmetic run through `dayBoundary()`, `Promise.all` fetch of entries+profile, delegates to `computeTrendDays()`.
- `app/(routes)/trends/page.tsx` (new): client component (needs browser tz), fetch-on-mount, cold-load skeleton, distinct load-error line, empty-state message gated on `days.length === 0`, bordered day-row list modeled on `entries-list.tsx`.
- `app/page.tsx`: added a second icon-only nav button (`TrendingUp` icon) linking to `/trends`, alongside the existing Settings button.
- Independently re-verified rather than trusting the subagent's report alone: read the full diff, confirmed the Code Map's claims held (relative import accommodation, verbatim reuse of `getEntriesForDay`, no new DB objects). Ran the full sweep myself: `npx tsc --noEmit`/`npx eslint .` clean, `node --test lib/**/*.test.ts` 76/76 pass, `npx next build` clean with both `/trends` and `/api/trends` registered.
- **Post-review patch round** (see Review Triage Log): fixed a real, triple-confirmed month-overflow date bug in the 3-month window calculation (added a day-of-month overflow check + `setDate(0)` clamp), added the missing `aria-live="polite"` to the day-row list, and extracted a shared `trendsFetchFailedResponse()` closure to match `entries/route.ts`'s established pattern. Manually verified the date fix with a standalone script against five known edge-case dates (Dec 31, Jul 31, May 31, Mar 31, and a normal mid-month date) — all now clamp correctly to the intended month's last real day instead of silently overflowing forward. Re-ran the full sweep after patching: clean `tsc`/`eslint`, 76/76 tests still passing (unchanged — none of the three patches touched any tested pure logic), clean `next build`.
- **Not performed this session**: any live DB-backed verification (an actual `GET /api/trends` round-trip, or a browser walkthrough of the day-row list/empty-state/error states) — the local Supabase/Postgres instance has been unreachable in this environment for several stories running (`docker`/`podman` missing from PATH). A follow-up session with DB access should seed Entries across a few different days (including one just before 5am local) and confirm the list renders correctly, the empty state shows for a fresh account, and the nav link works end-to-end.

## Spec Change Log

## Review Triage Log

Three lenses ran (Blind Hunter: 8 findings; Verification Gap: 0 formal gaps + 1 "other finding"; Edge Case Hunter: 1 finding).

- **Blind Hunter #2** / **Verification Gap's "other finding"** / **Edge Case Hunter** (independently converged, same root cause): `threeMonthsAgo.setMonth(getMonth() - 3)` overflows on the 29th-31st of months whose 3-months-back counterpart is shorter (e.g. Jul 31 → "Apr 31" doesn't exist → silently rolls to May 1), narrowing the advertised 3-month window by 1-3 days on those dates. Verified directly (traced `Date.setMonth`'s documented overflow behavior, confirmed with a standalone script covering Dec 31/Jul 31/May 31/Mar 31). **patch** — added a day-of-month check + `setDate(0)` clamp; re-verified with the same script (all five test dates now clamp to the correct last-real-day instead of overflowing).
- **Blind Hunter #1**: the new `<ul>` in `app/(routes)/trends/page.tsx` omits `aria-live="polite"`, even though the Code Map explicitly modeled it on `entries-list.tsx`, which has it. Verified: `entries-list.tsx` does carry the attribute; the new list didn't. Practically low-impact (this list never updates after its one-time mount, unlike the Daily view's), but the fix is trivial and matches the spec's own stated intent. **patch** — added the attribute.
- **Blind Hunter #4**: the route hand-duplicated its 500 error-response JSON in two places instead of extracting a shared closure, unlike `app/api/entries/route.ts`'s `entriesFetchFailedResponse()` pattern the spec claimed to mirror. Verified by reading both files. **patch** — extracted `trendsFetchFailedResponse()`.
- **Blind Hunter #3**: no route-level test coverage. **Verification Gap** explicitly declined to file this as a gap, noting it's the same established, project-wide convention (no route/page test infra exists anywhere), not something this diff broke. **defer** — converges with the repeatedly-confirmed gap every story since 3.1 has joined.
- **Blind Hunter #5**: the empty-state copy ("Nothing logged yet") can be factually imprecise for a returning user with entries older than 3 months but none recently. Verified real, but this is the already-disclosed, deliberate consequence of a decision made and documented at planning time (Design Notes: collapsing "never logged" and "window empty" into one condition/message) — and any wording fix would mean editing the frozen I/O matrix's literal copy, not just code. **Rejected** — the underlying tradeoff was already knowingly made and explained; changing the frozen copy needs spec renegotiation, not a review-triggered patch.
- **Blind Hunter #6**: no back-link from `/trends` to the Daily view. **defer** — pre-existing gap shared with `/preferences`, not caused by this story.
- **Blind Hunter #7** (`dayBoundary()` called once per Entry, not once per day) and **#8** (`getEntriesForDay()` selects unneeded columns for the wide 3-month read): both real but negligible at this app's scale, and #8 is a direct consequence of the frozen Boundaries' explicit "reuse verbatim" decision. **defer** — both.

## Design Notes

- **Ordering: most-recent-first.** Not specified in any planning artifact (no mockup exists for this screen); decided for consistency with how history/trend views conventionally read (most actionable, most recent pattern first, no scrolling needed to see "how am I doing lately").
- **Empty-state condition simplified to "window has zero days of data."** The frozen AC's literal trigger is "I have never logged any Entry at all," but distinguishing that from "logged before, nothing in the last 3 months" would need a second, separate all-time-existence query for a combination that's very unlikely to matter at this app's hobby/solo scale — one condition, one calm message, matches Story 4.2's precedent of collapsing a similarly-shaped pair of edge cases into one outcome.
- **No per-day within/over-target color-coding.** The AC only asks for the two numbers to be visible side by side; adding red/green/color semantics here isn't specified anywhere and would be inventing a new visual pattern the "no alarm treatment" rule doesn't clearly sanction — left as plain text, consistent with how the Remaining Calorie Budget number itself never changes color either.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: clean
- `npx eslint .` -- expected: clean
- `node --test lib/**/*.test.ts` -- expected: all pass, including new `trends.test.ts`
- `npx next build` -- expected: clean production build, `/trends` and `/api/trends` both registered

**Manual checks (if no CLI):**
- The local Supabase/Postgres instance has been unreachable in this environment for several stories running (`docker`/`podman` missing from PATH) -- if still unreachable, the same disclosed gap applies here: the pure `computeTrendDays()` logic is fully unit-tested, but the actual route/page fetch-and-render can't be exercised live this session. A follow-up session with DB access should seed a few Entries across different days (including one before 5am local to confirm correct Day-bucketing) and confirm the list renders correctly, the empty state shows for a fresh account, and the nav link works.
