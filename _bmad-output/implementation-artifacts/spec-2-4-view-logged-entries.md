---
title: 'View Logged Entries'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'bd9ff467f395ebc629a50faa61e940d2055ecdc7'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entries logged via Stories 2.1/2.2 are stored but never shown back to the user — there's no way to review what's already been logged today, and no query scopes `entries` to "today" at all yet (AD-5's Day-boundary logic doesn't exist).

**Approach:** Introduce `dayBoundary()` (AD-5's single source of truth: 5am-to-next-5am local time, computed from a client-detected IANA timezone per FR-14), add a `GET /api/entries?tz=` route that returns today's Entries for the signed-in user, and render them as one bordered container of rows (never per-entry cards) on the placeholder Daily view, replacing its static demo row. The list refreshes after a successful log (both dialogs already call an `onSuccess` callback on completion) so a just-logged Entry appears without a page reload.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** `dayBoundary(timestamp, tz)` is the only place Day-attribution logic exists (AD-5) — no inline date math anywhere else, including the new route/query. Reads go through `lib/services/entries.ts` alongside the existing `createEntry` writer — still the sole code path touching `entries` (AD-1). Timezone is client-detected (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and sent per-request, never stored (FR-14's "no manual override" consequence — nothing to persist).

**Never:** No edit/delete affordance (out of MVP scope). No pagination or infinite scroll — the full Day's Entries load in one request. No per-entry card styling — one bordered container, row dividers only. Do not render an empty-state placeholder when there are zero Entries — the section is omitted entirely.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Entries exist today | 1+ rows within today's 5am-to-5am window | One bordered container, rows in chronological order (oldest first, most recent last), each showing description + calories | N/A |
| No Entries today | 0 rows in today's window | Section omitted entirely — no empty-state box, no placeholder text | N/A |
| Entry logged just before 5am | `created_at` at 04:59 local | Attributed to the Day that's still open (started the previous 5am), not a new Day | N/A |
| New Entry logged via either dialog | Successful `POST /api/entries` | List refreshes and shows the new Entry without a page reload | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/day-boundary.ts` (new) -- `dayBoundary(timestamp: Date, tz: string): { start: Date; end: Date }`, pure function computing the UTC instants bounding the 5am-to-next-5am local Day `timestamp` falls in, via `Intl.DateTimeFormat` (no new dependency)
- `lib/services/entries.ts` (existing) -- add `getEntriesForDay(userId, start, end)`, ordered by `created_at` ascending; still the only file touching the `entries` table
- `app/api/entries/route.ts` (existing) -- add `GET`: resolve user (401 if absent, matching `POST`'s pattern), require a `tz` query param (400 if missing/invalid IANA string), call `dayBoundary(new Date(), tz)` then `getEntriesForDay()`, return `{ entries: [{ id, description, calories, inputMode, createdAt }] }`
- `app/entries-list.tsx` (new) -- client component: detects the browser's IANA timezone, fetches `GET /api/entries?tz=...` on mount and whenever a `refreshKey` prop changes, renders DESIGN.md's Entries-list token exactly (`{colors.card}` background, `{colors.border}` row dividers, `{rounded.md}`) or renders nothing if the list is empty
- `app/page.tsx` (existing) -- replace the static demo row with `<EntriesList refreshKey={...} />`; both dialogs' existing `onSuccess` callbacks bump a shared refresh counter so a just-logged Entry appears immediately

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/day-boundary.ts` -- `dayBoundary()` per AD-5
- [x] `lib/services/entries.ts` -- `getEntriesForDay()`
- [x] `app/api/entries/route.ts` -- `GET` handler
- [x] `app/entries-list.tsx` + `app/page.tsx` wiring -- list display + post-log refresh

**Acceptance Criteria:**
- [x] Given I have logged one or more Entries today, when I view the Daily view, then I see them in one bordered container as rows (not cards), each showing description and calorie value, chronological with the most recent last — live-verified: direct DB inserts (decoupling from a persistent, genuine Gemini API outage — see Implementation Notes) confirmed the list renders with exact DESIGN.md token matches (`bg-card` #F7F4EE, `border-border` #D9D1C2, `rounded-md`) and correct chronological ordering (older entry first, newer last)
- [x] Given I log a new Entry via either dialog, when it succeeds, then the list shows it without a page reload — the refresh wiring (`onSuccess` → `bumpRefreshKey` → `refreshKey` dependency) is simple, reviewed, standard React with no navigation call anywhere in the chain; the identical GET-fetch-and-render code path was live-verified via page reload (same code the refreshKey effect runs), but the specific real-Gemini-call-triggers-refresh sequence could not be exercised end-to-end due to the Gemini outage
- [x] Given I have zero Entries today, then no list/empty-state placeholder renders at all — live-verified using genuinely pre-existing out-of-window data (prior test entries that fall outside today's local 5am-boundary window), confirming both the day-boundary filtering and the empty-state omission together, not just the omission logic in isolation
- [x] Given an Entry logged between midnight and 5am local time, then it's correctly attributed to the still-open previous Day, not a new one — independently re-derived and verified via a **committed** test suite (`lib/services/day-boundary.test.ts`, `npm test`), not just a scratch script; includes a DST spring-forward edge case (23-hour day) the original implementation's own verification didn't cover

## Implementation Notes

- **Live end-to-end verification via a real Gemini call was blocked by a genuine, persistent external API outage** (`503 UNAVAILABLE, "high demand"` on every attempt, confirmed via direct API calls, not a code issue) — not the Docker-less-sandbox situation prior stories hit. Rather than leave this story's core logic unverified, decoupled it: used direct `psql` inserts/deletes against the real local Supabase instance to exercise the actual `GET /api/entries` → `EntriesList` render path independent of Gemini's availability. This genuinely tested the day-boundary query, chronological ordering, DESIGN.md token compliance, and empty-state omission — the parts of this story's own scope — while leaving only "does a real Gemini call's result flow through" unverified, which is Story 2.1/2.2's already-proven concern, not this story's.
- `dayBoundary()` was independently re-derived and verified (not just trusting the implementation subagent's own deleted scratch script) via a **committed** `node:test`-based suite — `lib/services/day-boundary.test.ts`, run via `npm test` (added as a package.json script). Covers: 04:59/05:01 boundary attribution in two real IANA zones with distinct offsets (`America/New_York`, `Asia/Kolkata`, including a half-hour offset), the exact-05:00 inclusive boundary, a 24-hour non-DST day, and — found only during this independent re-verification, not in the original implementation's own testing — a genuine DST spring-forward transition (confirmed the Day spanning it is exactly 23 real-elapsed hours, not 24). Uses Node's built-in test runner, not a new framework dependency — see Review Triage Log for why this was added given the project has no test infrastructure otherwise.
- `getEntriesForDay` reuses the existing `entries_user_id_created_at_idx` (added in Story 2.1/2.2's schema, anticipating exactly this query) — no new index needed.
- Both dialogs gained an optional `onSuccess?: () => void` prop, invoked alongside their existing auto-close (`handleOpenChange(false)`) once `useEntrySubmission`'s own success-confirmation delay elapses — `app/page.tsx` passes the same `bumpRefreshKey` closure to both, so either logging path refreshes the same `EntriesList`.

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** Every `GET /api/entries` failure mode (network error, 401 expired session, 400 invalid tz, 500 DB error, malformed JSON) was silently indistinguishable from "genuinely zero Entries today" — the component just `return`ed without touching state, and `entries.length === 0 → null` rendered identically either way. Flagged independently by all three reviewers — the single most-converged finding of this review, and Blind Hunter caught that a code comment in the route claimed the client "surfaces this," which it didn't. Fixed: added a distinct `loadError` state, rendered as a plain error line *instead of* the list (so a refresh that fails after a successful log can never leave a stale list looking authoritative either — closes a second, related finding about staleness at the same time). Live-verified this doesn't regress the legitimate-empty-day case (still renders nothing) by testing with genuinely pre-existing out-of-window data.
- **[medium, patch]** The `GET` path had no session-expiry handling, unlike the established `POST` pattern (`hooks/use-entry-submission.ts` already checks `response.redirected` and hard-navigates to `/login`). Flagged by Blind Hunter. Fixed: added the identical check to `entries-list.tsx`'s fetch. Live-verified the underlying mechanism directly: cleared session cookies without navigating, then called the exact same fetch the component runs — confirmed `response.redirected: true`, proving the condition the new code checks for genuinely occurs.
- **[medium, patch]** `isValidIanaTimeZone()` in the route reimplemented a second, independent `Intl.DateTimeFormat`-based timezone check rather than living in `day-boundary.ts` — a real conflict with AD-5's explicit "single source of truth for Day-attribution logic" rule, since the pre-check and `dayBoundary()`'s own internal validation could in principle drift apart. Flagged by Blind Hunter. Fixed: moved and renamed to `isValidTimeZone()`, exported from `day-boundary.ts`, imported by the route.
- **[medium, patch]** The `dayBoundary()` call in the `GET` handler was the one fallible call in the file not wrapped in a try/catch — every other failure path (`request.json()`, `getEntriesForDay()`, `provider.estimate()`, `createEntry()`) returns the app's `{ error: { code, message } }` envelope on failure; this one would have surfaced Next.js's generic unhandled-exception response instead, breaking the file's own established contract. Flagged by Blind Hunter. Fixed: moved inside the same try/catch as `getEntriesForDay()`.
- **[medium, patch]** No committed regression coverage exists for `dayBoundary()` — the implementation's own verification was a scratch script, deleted after the run, leaving nothing for a future reviewer, CI, or maintainer to re-check the single most correctness-critical piece of date math in the app. Flagged by Verification Gap. Fixed: added `lib/services/day-boundary.test.ts` using Node's built-in test runner (zero new dependencies, no test-framework decision — that remains an explicitly deferred project-wide choice) plus an `npm test` script. Covers every case the original scratch script did, plus a genuine DST spring-forward transition this reviewer's own independent re-verification found the original testing hadn't covered.
- **[low, patch]** Entries rendered as plain `<div>`s with no semantic list markup and no `aria-live` region, so a screen-reader user got no signal that the list changed after a no-page-reload refresh — inconsistent with this codebase's otherwise accessibility-conscious conventions. Flagged by Blind Hunter. Fixed: `<ul>`/`<li>` with `aria-live="polite"` on the container.
- **[low, patch]** Long descriptions (up to `MAX_DESCRIPTION_LENGTH` for text Entries, or an uncapped model-generated description for photo Entries) had no truncation, risking a single row ballooning across multiple lines and defeating DESIGN.md's "compact rows, not dashboard cards" intent. Flagged by Blind Hunter. Fixed: `truncate` + `min-w-0` on the description span. Live-verified with a deliberately long description: content 801px wide correctly clipped to a 284px box.
- **[low, patch]** The invalid-`tz` 400 branch had no server-side logging, unlike every other error branch in the file — combined with the client-side silence (see the high-severity finding above), a systematic tz-rejection failure (e.g. a client/server ICU version drift) would have been completely invisible in both client and server observability. Flagged by Edge Case Hunter. Fixed: added `console.error` logging the rejected value.
- **[low, false]** The rapid-refetch race (`refreshKey` bumping a second time while a previous fetch is still in flight) — could the first (now-stale) fetch's response overwrite the list with older data if it resolves after the second one? Flagged as a concern by Edge Case Hunter, then checked and disproved by the same reviewer: React runs the previous effect's cleanup (flipping *that* closure's own `cancelled` flag) before the new effect instance runs, for every dependency-change commit in sequence — each fetch has its own independent flag, so an out-of-order-resolving stale fetch is always correctly ignored regardless of how many times `refreshKey` bumps.
- **[low, false]** `entries.createdAt`/`inputMode` are sent in the `GET` response but never read by `entries-list.tsx`, which only uses `description`/`calories`/`id`. Flagged by Verification Gap as dead data. Verified as an intentional, low-cost forward-compatible inclusion, not a defect: both fields are natural companions to an Entry record a UI list would plausibly want soon (Epic 5's historical trends will need `createdAt` for date grouping), and removing them now only to re-add them later would be pure churn.
- **[low, deferred]** DST "fall back" (an ambiguous, twice-occurring local hour) is unhandled by `zonedWallClockToUtc()`'s two-pass correction — it picks *some* consistent UTC instant, but not a deliberately-chosen one. Flagged independently by Edge Case Hunter and Blind Hunter. Deferred: only matters if a region's fall-back transition hour coincides with the app's fixed 05:00 boundary, which no common IANA zone does. Documented directly in the test suite and logged in `deferred-work.md`.
- **[low, deferred]** The Entries list never self-corrects across the actual 5am Day boundary if a tab is left open — only mount and post-log `refreshKey` bumps trigger a refetch. Flagged by Edge Case Hunter. Deferred: needs a wall-clock timer for a narrow use case; a manual reload always corrects it. Logged in `deferred-work.md`.
- **[low, deferred]** Browser/server `Intl`/ICU version drift could reject a client-detected timezone the server's own bundled ICU doesn't yet recognize, causing a total (if narrow and now-logged) feature outage for an affected user, with no workaround since timezone is never stored. Flagged by Edge Case Hunter. Deferred: low-probability, partially mitigated by the new server-side logging fix above; a full fix needs a maintained IANA allowlist or a fallback strategy with its own tradeoffs. Logged in `deferred-work.md`.
