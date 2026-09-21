---
title: 'Manage Daily Calorie Target & Dietary Preference'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
baseline_commit: '486faaca7a7cf897634a2e9e9537c9c1816abcac'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A user's Daily Calorie Target and Dietary Preference are set once at registration (Story 1.1) and never viewable or changeable afterward — but both need to stay accurate as needs change, and Epic 3's Recommendation lookup depends directly on `dietary_preference`.

**Approach:** Build an Account/Preferences screen at `/preferences` that reads the signed-in user's current `profiles` row and lets them update either field independently, each saved with its own inline confirmation — no full-page reload, no modal.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** Reads and writes to `profiles` go through the service layer only (`lib/services/profiles.ts`), never a direct DB call from the page or route handler (AD-1). The page resolves the current user server-side via `lib/supabase/server.ts`'s `createClient().auth.getUser()` — never trust a client-supplied user id. `/preferences` needs no `proxy.ts` change: it's authenticated-by-default already (Story 1.2's central gate), consistent with that story's "no future proxy change needed" design.

**Never:** Do not build the Daily view's real settings-icon entry point into this screen (Story 1.4). Do not add any field beyond Daily Calorie Target and Dietary Preference — no other `profiles` columns exist yet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path — load | Authenticated user visits `/preferences` | Current `dailyCalorieTarget` and `dietaryPreference` shown, pre-filled | N/A |
| Happy path — save target | Valid positive integer entered, save clicked | `profiles.daily_calorie_target` updated, inline confirmation next to that field | N/A |
| Invalid target | Non-numeric, zero, or negative value, save clicked | No write occurs | Inline field-level error, value not saved |
| Save preference | Toggle changed (vegetarian ↔ non-vegetarian), save clicked | `profiles.dietary_preference` updated immediately, inline confirmation next to that field | N/A |
| Never-changed preference | User who registered without ever visiting this screen | Shows `non_vegetarian` (the DB default from Story 1.1) | N/A |

</frozen-after-approval>

## Code Map

- `lib/services/profiles.ts` -- add `getProfile(userId)` (select by PK) and `updateDailyCalorieTarget(userId, value)` / `updateDietaryPreference(userId, value)` alongside the existing `createProfile`; keep them as separate calls so each field saves independently per the I/O matrix
- `app/api/preferences/route.ts` (new) -- `PATCH` handler: resolve user via `lib/supabase/server.ts`, validate body (`dailyCalorieTarget` XOR `dietaryPreference`, mirroring Register's `MAX_DAILY_CALORIE_TARGET = 20_000` ceiling and positive-integer check), call the matching service function, return `{ ok: true }` or `{ error: { code, message } }` (Register's established error shape)
- `app/(routes)/preferences/page.tsx` (new) -- async Server Component: resolve user, call `getProfile`, render a client form below it
- `app/(routes)/preferences/preferences-form.tsx` (new) -- client component: two independently-submittable fields (target input, preference control), each with its own save action, inline success/error state, reusing `components/ui/input.tsx` / `label.tsx` / `button.tsx`
- `components/ui/radio-group.tsx` (new, via `npx shadcn@latest add radio-group`) -- Dietary Preference has exactly two mutually exclusive options; no radio/select/toggle primitive exists yet in this repo. Restyle on install to match existing overrides (`rounded-sm`, `aria-invalid`/focus use `{colors.primary}`/`{colors.ring}`, never destructive/red) the same way `input.tsx`/`button.tsx` were restyled in Story 0.1/1.1
- `app/(routes)/register/page.tsx` (reference only, do not modify) -- existing field-validation and inline-error pattern to mirror for the target input

## Tasks & Acceptance

**Execution:**
- [x] `lib/services/profiles.ts` -- add `getProfile`/`updateDailyCalorieTarget`/`updateDietaryPreference` -- sole writers/readers per AD-1
- [x] `components/ui/radio-group.tsx` -- install and restyle to DESIGN.md tokens
- [x] `app/api/preferences/route.ts` -- PATCH handler, validated, service-layer only
- [x] `app/(routes)/preferences/page.tsx` + `preferences-form.tsx` -- screen + independently-saving form fields with inline confirmation/error per field

**Acceptance Criteria:**
- [x] Given I am logged in and navigate to `/preferences`, when the screen loads, then I see my current Daily Calorie Target and Dietary Preference (verified against the live local Supabase instance, not mocked)
- [x] Given I change only my Daily Calorie Target to a valid value and save, when the write completes, then only that field shows an inline confirmation and my Dietary Preference is untouched
- [x] Given I change only my Dietary Preference and save, when the write completes, then only that field shows an inline confirmation and my Daily Calorie Target is untouched
- [x] Given an invalid Daily Calorie Target, when I try to save, then I see an inline field-level error and the `profiles` row is unchanged
- [x] Given a user who has never visited this screen, when they load it, then Dietary Preference shows non-vegetarian (Story 1.1's registration default)

## Implementation Notes

- `lib/services/profiles.ts` gained `getProfile` (select by PK), `updateDailyCalorieTarget`, and `updateDietaryPreference`, all using Drizzle's `eq(profiles.userId, userId)` — these remain the only functions that touch the `profiles` table (AD-1).
- `app/api/preferences/route.ts` is a single `PATCH` handler requiring exactly one of `dailyCalorieTarget` XOR `dietaryPreference` in the body (400 `invalid_input` otherwise), resolves the user via `lib/supabase/server.ts`'s `createClient().auth.getUser()` (401 `unauthenticated` if missing), validates the present field (positive-integer + `MAX_DAILY_CALORIE_TARGET = 20_000` ceiling, mirroring `app/api/auth/register/route.ts`; or one of `"vegetarian"` / `"non_vegetarian"`), and returns `{ ok: true }` / `{ error: { code, message } }`.
- `app/(routes)/preferences/page.tsx` is an async Server Component: resolves the user, calls `getProfile`, and (defensively, since `proxy.ts` already gates this route) redirects to `/login` if unauthenticated. Throws if no profile row exists for an authenticated user, since Story 1.1 guarantees one is created at registration.
- `app/(routes)/preferences/preferences-form.tsx` is a client component with two independent field components (`DailyCalorieTargetField`, `DietaryPreferenceField`), each with its own `fetch("/api/preferences", { method: "PATCH" })` call, submit control, and inline success (`role="status"`)/error (`role="alert"`) message — saving one never touches the other's request or displayed state. Client-side validation on the target field blocks the fetch entirely (and shows the inline error) for non-numeric/zero/negative/over-ceiling input, so no write is attempted; the server route re-validates independently as defense-in-depth.
- `components/ui/radio-group.tsx` was installed via `npx shadcn@latest add radio-group` (style `radix-nova`, per `components.json`) then restyled the same way `input.tsx` was: `aria-invalid` uses `{colors.primary}`/`primary/20` instead of shadcn's default `destructive`, consistent with DESIGN.md's "never red/alarm" rule. (Correction from the initial pass, caught in review — see Review Triage Log: the shipped shadcn template's checked-state selector used `data-checked:*`, which Radix never emits (`data-state="checked"|"unchecked"`) — fixed to `data-[state=checked]:*`.)
- Dietary Preference values are the literal strings `"vegetarian"` / `"non_vegetarian"` end-to-end (form state, API payload, DB column), matching the DB default from Story 1.1.

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, no type errors.
- `npx eslint lib/services/profiles.ts app/api/preferences/route.ts "app/(routes)/preferences/page.tsx" "app/(routes)/preferences/preferences-form.tsx" components/ui/radio-group.tsx` -- ran, no lint errors.
- `npm run build` -- ran, clean production build; `/preferences` and `/api/preferences` both appear as dynamic (ƒ) routes, no new warnings.

**Manual checks (if no CLI):**
- The implementation subagent's sandbox had no Docker/Podman on PATH, so it could not run this verification (its `.env.local` points at a local Supabase stack it couldn't start). Docker Desktop is installed on this machine (used throughout Stories 1.1/1.2) — its CLI just wasn't on that fresh shell's PATH; adding `AppData\Local\Programs\DockerDesktop\resources\bin` to PATH confirmed `supabase status` reports the stack already running. Live-verified everything directly against it afterward, matching the rigor applied to Stories 1.1/1.2:
  - Loaded `/preferences` as an existing test user (`test-1-2-login@example.com`) — the displayed target (2100) and preference (non-vegetarian) matched a direct `psql` query of the `profiles` row exactly.
  - Saved a new target (2250) — `psql` confirmed the row updated and `dietary_preference` stayed `non_vegetarian`, untouched.
  - Saved a new preference (vegetarian) — `psql` confirmed the row updated and `daily_calorie_target` stayed 2250, untouched.
  - Submitted an invalid target (`-5`) client-side — inline error shown, `psql` confirmed no write occurred (target still 2250).
  - Called `PATCH /api/preferences` directly with `{ dailyCalorieTarget: -5 }` (bypassing the client form) — server independently rejected it with `400 invalid_target`, confirming the client check isn't the only guard.
  - Cleared session cookies and requested `/preferences` directly — redirected to `/login` with zero `proxy.ts` changes, confirming the "no proxy change needed" boundary held.
  - Registered a brand-new user and loaded `/preferences` without ever saving — Dietary Preference showed non-vegetarian, confirming the Story 1.1 DB default surfaces correctly for a user who's never touched this screen.
  - After the review fixes below: confirmed the selected radio now renders `#A85C42` (DESIGN.md's exact `colors.primary` value) for both border and fill via computed style, where it previously rendered no fill at all. Re-confirmed independent target/preference saves still update only their own column. Confirmed a genuinely expired session (all cookies cleared, not just the first) now redirects `/preferences`'s Save action to `/login` instead of showing "Couldn't reach the server."

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** `components/ui/radio-group.tsx`'s checked-state styling used shadcn's stock `data-checked:*` Tailwind variants, but Radix's `RadioGroupItem` exposes selection via `data-state="checked"|"unchecked"`, never `data-checked` — confirmed by reading `@radix-ui/react-radio-group`'s source (`"data-state": getState(checked)`). The selector could never match, so a selected radio showed no clay border/fill at all, only the tiny inner dot — directly undermining the "restyled to match DESIGN.md" claim this story's own Code Map made. Flagged by Blind Hunter. Fixed: `data-checked:*` → `data-[state=checked]:*` throughout (also dropped an accompanying dead `group-has-[:focus-visible]/field-label` selector that depended on a group class nothing in this diff ever declares). Live-verified: the selected radio's computed `border-color`/`background-color` is now `rgb(168, 92, 66)` — the exact RGB of DESIGN.md's `colors.primary: '#A85C42'`.
- **[high, patch]** `updateDailyCalorieTarget`/`updateDietaryPreference` ran a bare `db.update().set().where()` with no row-count check — a Postgres `UPDATE` matching zero rows (missing/corrupted profile) isn't an error, so the route unconditionally returned `{ ok: true }` and the UI showed "Saved." for a write that touched nothing. Flagged independently by all three reviewers — the single most-converged finding of this review. Fixed: both service functions now use `.returning({ userId: profiles.userId })` and return whether a row matched; `app/api/preferences/route.ts` checks this and returns a `404 profile_not_found` error instead of a false-positive success when it's `false`.
- **[high, patch]** `proxy.ts` protects `/api/preferences` like every other non-public route — if a user's session expires while `/preferences` is open and they click Save, `fetch()` transparently follows the proxy's redirect to `/login` and resolves with that page's HTML at `status: 200`. `response.ok` was `true` but `response.json()` on HTML threw, landing in the generic catch block and showing "Couldn't reach the server — check your connection and try again," which is simply wrong (the server is reachable; the session expired) and never routes the user to `/login`. Flagged independently by Verification Gap and Edge Case Hunter. Fixed: both field handlers now go through a shared `patchPreferences()` helper that checks `response.redirected` before ever parsing the body, and hard-navigates to `/login` when true. Live-verified: with all session cookies genuinely cleared (see below), clicking Save now lands on `/login` instead of showing the misleading error.
- **[medium, patch]** `updateDietaryPreference(userId: string, dietaryPreference: string)` accepted a bare, unconstrained `string` despite `lib/services/profiles.ts`'s own header comment calling these functions "the only functions that touch the `profiles` table" — i.e., the layer documented as the enforcement boundary didn't actually enforce the two-value domain; only the one current call site's local `isDietaryPreference()` guard did. Flagged independently by Blind Hunter and Verification Gap. Fixed: the parameter is now typed `DietaryPreference` (`"vegetarian" | "non_vegetarian"`, hoisted to `lib/constants.ts` and shared with the route's validator), so a future caller gets a compile error rather than a silent bad write.
- **[medium, patch]** The Dietary Preference field's `aria-describedby` (pointing at the save confirmation/error text) was set on the `<Button>` instead of the `<RadioGroup>` — a screen-reader user interacting with the radios directly, not the button, got no announced association with the result, inconsistent with the Daily Calorie Target field's `<Input>` 30 lines above it in the same file, which wires it correctly. Flagged by Blind Hunter. Fixed: moved `aria-describedby` onto the `<RadioGroup>`.
- **[medium, patch]** Neither field guarded against a second submission while the first was still in flight (no `if (submitting) return`), and neither disabled its own input/radio-group during submission — only the Save button was disabled. A user could edit the value while a save was in flight and see "Saved." confirm next to a value that was never actually sent, or trigger overlapping requests. Flagged by Blind Hunter (concurrent submissions) and Edge Case Hunter (stale in-flight save, independently, with a concrete repro). Fixed: added an early-return guard to both handlers and `disabled={submitting}` on the `Input`/`RadioGroup` themselves, so the value genuinely cannot change while a save is outstanding.
- **[low, patch]** `MAX_DAILY_CALORIE_TARGET = 20_000` was duplicated verbatim in three places (`app/api/auth/register/route.ts`, `app/api/preferences/route.ts`, `preferences-form.tsx`), each commented as "mirroring"/"matching" the others with nothing enforcing that at compile time. Flagged by Blind Hunter. Fixed: hoisted to `lib/constants.ts` (alongside the new `DietaryPreference` union) and imported in all three places, including retrofitting Story 1.1's register route for consistency.
- **[low, false]** The route's `401 unauthenticated` branch is effectively dead code in normal operation since `proxy.ts` already redirects any unauthenticated request before it reaches the handler. Flagged by Verification Gap as unverified rather than wrong. Verified as intentional defense-in-depth, not a defect: the same "defensive only" pattern already exists and was accepted in `app/(routes)/preferences/page.tsx`'s own redirect-to-login branch and in Story 1.2's proxy design. No change made; the branch stays as a safety net for the should-never-happen race between proxy and handler.
- **[low, deferred]** No revalidation (`router.refresh()`) after a successful save — a second browser tab, or the browser's back/forward cache, could show a stale pre-save value with no indication the DB has since changed. Flagged by Edge Case Hunter. Deferred: the PRD and EXPERIENCE.md both state this product is explicitly single-tenant/single-user with no multi-device-simultaneous-use design target; a narrow edge case for personal hobby use, not worth the added complexity now. Logged in `deferred-work.md`.
- **[low, deferred]** An unrecognized `dietary_preference` DB value (no CHECK constraint backs the `text` column) is silently coerced to `non_vegetarian` for display, and could be silently persisted back as `non_vegetarian` if the user saves without touching the radio. Flagged by Edge Case Hunter. Deferred: substantially mitigated by the `DietaryPreference` type-safety fix above, which closes the only current write path that could introduce a bad value; the residual risk (some future path bypassing the service layer entirely) is already AD-1's job to prevent, not this story's. Logged in `deferred-work.md`.
- **[low, deferred]** `app/(routes)/preferences/page.tsx` throws an unhandled `Error` if an authenticated user's `profiles` row is missing, rather than a friendly error state. Flagged by Blind Hunter. Deferred: genuinely defensive-only (Story 1.1 guarantees the row at registration, never deleted independently), and no route in this codebase has an `error.tsx` boundary yet — adding one ad hoc here would be inconsistent rather than fixing a pattern. Logged in `deferred-work.md`.
- **[low, deferred]** Client-side "Saved."/error confirmation `<p role="status"|"alert">` elements are mounted only when needed rather than always present with toggled text — some screen-reader/browser combinations may not reliably announce a live region inserted and populated in the same update. Flagged by Edge Case Hunter. Deferred: identical, already-shipped pattern in Login and Register's own inline messages; not a Story 1.3-specific regression, and changing it here alone would create inconsistency rather than fix one. Logged in `deferred-work.md`.
- **[low, deferred]** Request/response bodies are validated by hand (XOR checks, manual type guards) with no shared schema (e.g. zod) across the three API routes that now exist, so an unexpected extra field is silently ignored rather than rejected — safe today only because service functions manually whitelist columns, not because anything structurally enforces it. Flagged by Blind Hunter. Deferred: matches the codebase's existing hand-rolled validation convention everywhere (Register, Login, now Preferences); introducing a validation library is a project-wide decision bigger than this story. Logged in `deferred-work.md`.
- **[low, false]** No no-JS fallback for either field (the Dietary Preference save button has no native form semantics; the target form has no `action`/`method`). Flagged by Edge Case Hunter. Verified as consistent with the rest of this codebase: Login and Register are both `"use client"` components with the same characteristic, and nothing in the PRD or EXPERIENCE.md targets no-JS support. Not a Story 1.3-specific gap.
