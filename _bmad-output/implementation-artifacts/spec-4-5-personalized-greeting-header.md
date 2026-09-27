---
title: 'Personalized Greeting Header'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/EXPERIENCE.md'
baseline_commit: 'ff7e4540c1c7bca430106c0408efac1dc242ef5f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** FR-27/Story 4.5 requires a persistent, time-of-day greeting header ("Good morning/afternoon/evening, {Name}") on every Daily view load — not just first login — but the Daily view (`app/page.tsx`) has no such element today, and `GET /api/entries` (its sole data source, `useDailyView`) doesn't return the user's Name at all.

**Approach:** Add `name: profile?.name ?? null` to `GET /api/entries`'s response (`app/api/entries/route.ts`) — the handler already fetches `profile` for the budget computation, so this is a zero-extra-query addition. Thread it through `EntriesApiResponse`/`useDailyView` (`hooks/use-daily-view.ts`) as a new `name: string | null` return value. In `app/page.tsx`, derive the greeting client-side from `new Date().getHours()` (5–11 morning, 12–16 afternoon, 17–23 and 0–4 evening, per EXPERIENCE.md's Component Patterns row) and render it unconditionally above both the `showPrompt` and normal-view branches — it is not hidden during the First-Login prompt (unlike the existing bare budget-number header, which the prompt's own card already restates).

**Always:** Omit the name entirely when it's `null` (e.g. "Good afternoon.") rather than a placeholder — FR-27's own consequence for pre-existing accounts with no Name on file (Story 1.1/1.3).

**Never:** Touch `FirstLoginPrompt` itself (frozen per Story 4.1/4.2's own Boundaries) or add a date/time subtitle line — the approved mockup (`daily-view-refresh.html`) shows one, but neither FR-27 nor Story 4.5's AC in epics.md requires it; spines win over mockup illustration.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Name on file, 2pm local | `profile.name = "Alex"`, hour=14 | "Good afternoon, Alex." | N/A |
| No Name on file | `profile.name = null` | "Good afternoon." (no placeholder) | N/A |
| First-Login prompt showing | `showPrompt = true` | Greeting still renders, above the prompt card | N/A |
| Boundary hours | hour=4 (evening), hour=5 (morning), hour=11 (morning), hour=12 (afternoon), hour=16 (afternoon), hour=17 (evening) | Each hour classifies per the 5–11/12–16/17–23,0–4 boundaries above | N/A |

</frozen-after-approval>

## Implementation Notes

Added `name` to `GET /api/entries`'s response and `useDailyView`, a new pure `lib/services/greeting.ts` (unit-tested), and rendered the greeting unconditionally above the First-Login prompt/normal-view branches. Blind Hunter's most important catch: a real SSR/hydration mismatch risk from computing `new Date().getHours()` directly in the render body of a page with no SSR opt-out. Fixed with a dedicated `hooks/use-greeting-period.ts` built on `useSyncExternalStore` (its `getServerSnapshot` argument is the React-sanctioned way to give the server a fixed value while the client's first post-hydration read reflects the real local time) rather than an effect+setState pattern, which this project's ESLint config (`react-hooks/set-state-in-effect`) also flags as an anti-pattern. Also fixed a genuine double-period bug for a name ending in "." by changing `formatGreeting()`'s contract to never append its own trailing punctuation. Verified end-to-end via `agent-browser`, including checking the browser console for hydration warnings (none) after the fix.

## Review Triage Log

- **high** — `new Date().getHours()` was called directly in `app/page.tsx`'s render body; this page has no SSR opt-out, so it also ran during the server's initial render, and the server's local hour can legitimately disagree with the visitor's browser (different OS/timezone), producing a hydration mismatch. Fixed: extracted `hooks/use-greeting-period.ts` using `useSyncExternalStore` with a `getServerSnapshot` returning `null`, so the server and the client's pre-hydration render agree (nothing renders), and the real value appears only after the client's first commit.
- **medium** — `formatGreeting()` unconditionally appended a trailing "." and `app/page.tsx` stripped exactly one character via `.slice(0, -1)` to recolor it — a name ending in "." itself (e.g. "Jr.", valid under `validateName()`) produced a doubled "..". Fixed: `formatGreeting()` now returns no trailing punctuation at all; the caller always appends exactly one colored period, regardless of what the name contains.
- **medium** — (Same root cause as above, listed separately by the reviewer as a "leaky abstraction.") Resolved by the same fix — `formatGreeting()`'s contract no longer depends on a specific caller's string-slicing convention.
- **low** — Test suite only covered `("morning", "Alex")` and `("afternoon", null)`, missing evening, hour-0 (midnight), and the name-ends-with-"." case entirely. Fixed: added all three periods x both name-present/absent, the midnight boundary, and a dedicated "Jr." case.
- **low** — The greeting `<p>` had no `truncate`, so a name near `MAX_NAME_LENGTH` (100 chars) could wrap across lines or dominate the header, unlike the single-line budget number below it. Fixed: added `truncate`.
- **low** — The "persistent" requirement's actual scope (recomputed per-load, not a live tick across a period boundary while the tab stays open) wasn't documented as a deliberate limitation. Fixed: `hooks/use-greeting-period.ts`'s own comment now states this explicitly.
- **low, rejected** — No loading/skeleton state for the greeting before `name` resolves from the fetch. The period/hour renders as soon as `useGreetingPeriod()` resolves (no fetch dependency); only the name portion appends once the fetch resolves — a much smaller, less jarring content shift than the numeric budget/entries skeletons guard against, and not required by FR-27's own spec.
- **low, rejected** — No distinct error affordance when the entries fetch fails (`name` stays `null` forever). The greeting degrades to the same graceful "no name" fallback FR-27 already specifies for a pre-existing account with no Name on file — not broken, and the page's existing `loadError` alert already surfaces the failure prominently elsewhere.
