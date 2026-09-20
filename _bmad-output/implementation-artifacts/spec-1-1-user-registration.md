---
title: 'User Registration'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
baseline_commit: '7ed07e418ef0472eb19363215ffba66c95e42a22'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No account system exists yet. A user cannot create an account, and there is no `profiles` table to attribute a Daily Calorie Target or Dietary Preference to — every later epic (budget, recommendations, entries) needs "this user, today" to mean something.

**Approach:** Wire self-hosted Supabase Auth + Postgres into the project (local dev via the already-running Supabase CLI stack), add Drizzle ORM and a `profiles` table, and build a Register screen (email, password, confirm password, Daily Calorie Target pre-filled with a standard default) that creates a Supabase Auth user, creates a matching `profiles` row (Dietary Preference defaulting to non-vegetarian), and logs the user in immediately.

**Decision (interim, not a product decision):** There is no Daily view yet (Epic 3 builds it). On successful registration, redirect to `/` — the existing Epic 0 foundation showcase page. This is a placeholder navigation target only; Epic 3 will change it to the real Daily view without touching this story's logic.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** All database writes to `profiles` go through a service-layer function (`lib/services/profiles.ts`), never directly from the route handler (AD-1 layered architecture, Consistency Conventions). Auth goes exclusively through Supabase Auth (AD-3) — no other auth library. `profiles.dietary_preference` must never be null (defaults to `'non_vegetarian'` at the DB level). Supabase credentials live in `.env.local` only (gitignored), never hardcoded or committed.

**Never:** Do not build the Daily view, Login screen, or middleware/route-protection in this story — those are Story 1.2+ (Login) and later epics. Do not collect Dietary Preference at registration (Story 1.3 owns that field, on the Preferences screen). Do not add password-reset/account-recovery (explicitly out of scope, FR-20).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Valid unused email, matching passwords, valid positive integer target | Supabase Auth user created, `profiles` row created (target = input, dietary_preference = 'non_vegetarian'), user session established, client redirects to `/` | N/A |
| Duplicate email | Email already registered in Supabase Auth | No new Auth user, no `profiles` row | Inline field-level error on the email field; form stays filled |
| Mismatched passwords | password !== confirmPassword | No request sent to the server at all | Inline field-level error on confirm-password field, client-side only |
| Invalid target | Non-numeric, zero, or negative Daily Calorie Target | No Auth user created, no `profiles` row | Inline field-level error on the target field |
| Auth succeeds, profile insert fails | Supabase Auth user created but the `profiles` insert throws (e.g. DB unreachable) | Do not leave an orphaned Auth user with no profile silently — surface a generic inline error and log the failure server-side | Inline error: "Something went wrong creating your account — try again." (never expose raw DB error text to the client) |

</frozen-after-approval>

## Code Map

- `package.json` -- add `drizzle-orm`, `postgres` (driver), `@supabase/supabase-js`, `@supabase/ssr`; add `drizzle-kit` as a devDependency
- `.env.local` (new, gitignored) -- `DATABASE_URL` (local Supabase Postgres, port 54322), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (local Supabase instance, already running via `supabase start` in this session)
- `drizzle.config.ts` (new) -- points Drizzle Kit at `DATABASE_URL`, schema at `lib/db/schema.ts`
- `lib/db/schema.ts` (new) -- `authUsers` stub (references Supabase-managed `auth.users`, id only) + `profiles` table (user_id PK/FK, daily_calorie_target, dietary_preference default `'non_vegetarian'`, created_at)
- `lib/db/client.ts` (new) -- Drizzle client instance (postgres.js driver + `DATABASE_URL`)
- `lib/supabase/client.ts` (new) -- browser Supabase client (`createBrowserClient` from `@supabase/ssr`)
- `lib/supabase/server.ts` (new) -- server Supabase client (`createServerClient` from `@supabase/ssr`, Next.js `cookies()`)
- `lib/services/profiles.ts` (new) -- `createProfile(userId, dailyCalorieTarget)`; the only code path allowed to write to `profiles` (AD-1)
- `app/api/auth/register/route.ts` (new) -- thin POST handler: validates input server-side, calls `supabase.auth.signUp()`, calls `createProfile()`, returns `{ error }` shape on failure
- `app/(routes)/register/page.tsx` (new) -- Register screen: email/password/confirm/target fields, client-side validation, calls the API route, redirects to `/` on success
- `components/ui/input.tsx`, `components/ui/label.tsx` (new, via `shadcn add`) -- form field primitives, styled per Epic 0's tokens automatically

## Tasks & Acceptance

**Execution:**
- [x] `package.json` / `.env.local` / `drizzle.config.ts` -- install deps, wire local Supabase connection -- nothing else can work without this
- [x] `lib/db/schema.ts` -- define `profiles` table -- Drizzle needs the schema before a migration can run
- [x] Run `drizzle-kit generate` + apply against the local Supabase Postgres -- creates the real `profiles` table to verify against
- [x] `lib/db/client.ts`, `lib/supabase/client.ts`, `lib/supabase/server.ts` -- client plumbing every later story reuses
- [x] `lib/services/profiles.ts` -- `createProfile()` -- the only writer to `profiles`
- [x] `app/api/auth/register/route.ts` -- registration endpoint per the I/O matrix above
- [x] `app/(routes)/register/page.tsx` -- the actual screen, using shadcn `Input`/`Label` + existing `Button`

**Acceptance Criteria:**
- Given I open the Register screen, when it loads, then the Daily Calorie Target field is pre-filled with a standard adult default (~2000 kcal) I can accept or change (FR-13 `[ASSUMPTION]`)
- Given I submit valid, unused registration details, when the request completes, then a real Supabase Auth user and a matching `profiles` row exist (verified against the live local Supabase instance, not mocked), and I land on `/` already logged in
- Given any of the I/O matrix's error scenarios, when I submit, then I see the matching inline field-level error and no partial state is left behind (no orphaned Auth user without a profile)
- Given the screen at any viewport width, then it follows Epic 0's button/label/focus-ring/radius tokens with no new component conventions introduced

## Implementation Notes

- Local Supabase stack is running (`npx supabase start`, Docker Desktop — installed by the user mid-session). All verification below is against the real local Postgres + GoTrue Auth, not mocked.
- Fixed a second Button-family radius mismatch while adding shadcn's `Input` component: it also hardcoded `rounded-lg` like Button originally did in Story 0.1 — changed to `rounded-sm` per DESIGN.md.
- Drizzle-kit's generated migration included `CREATE TABLE "auth"."users"` for the FK-reference stub — that table is owned by Supabase/GoTrue and already exists, so this line was manually removed from the generated SQL before applying it (a one-time gotcha specific to referencing Supabase's `auth` schema from Drizzle, not something drizzle-kit avoids automatically).
- Live-verified end to end against the real database: happy-path registration (real Supabase Auth user + `profiles` row created, correct target, `dietary_preference` defaults to `non_vegetarian`), duplicate email (409, correctly attributed to the email field), zero/negative Daily Calorie Target (400, no orphaned Auth user created either time — target validation runs before `signUp()`). Found and fixed a real bug during this testing: this Supabase instance's `signUp()` returns an explicit "User already registered" error (not the anti-enumeration empty-identities response originally coded for) — added a specific check for that exact message so it correctly maps to the `email_taken` code the client expects, with the empty-identities check kept as a defensive fallback for other Supabase configurations.
- Not live-tested: the "Auth succeeds, profile insert fails" edge case (would require intentionally breaking the DB connection mid-request). The code path was reviewed but not exercised.
- Test data created during verification (one Auth user + profile row) was deleted afterward; confirmed the FK's `ON DELETE CASCADE` correctly removed the profile row too.
- `npm run build` and `npm run lint` both pass cleanly.
- The "Already have an account? Log in" link points to `/login`, which doesn't exist until Story 1.2 — will 404 if clicked before then. This is expected and unavoidable given the ACs require the link to exist now.

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** Orphaned Supabase Auth user was never rolled back when the `profiles` insert failed after signup succeeded — directly contradicted the spec's own I/O matrix row and the "no partial state" AC. Flagged independently by all three reviewers. Fixed: added `lib/supabase/admin.ts` (service-role client) and call `admin.deleteUser()` in the catch block. Live-verified by temporarily renaming the `profiles` table to force the failure, confirming the Auth user was deleted, then restoring the table and confirming the happy path still works.
- **[medium, patch]** Raw Supabase/GoTrue error text was forwarded verbatim to the client on the generic `signup_failed` path — contradicts the spec's own "never expose raw DB error text" rule (stated for the profile-insert case, but the same principle applies here). Fixed: generic message returned to the client, real error logged server-side only.
- **[medium, patch]** No client-side password-length validation, and no `password` key in `FieldErrors` — a weak-password rejection (configured minimum is 6 chars, verified in `supabase/config.toml`) would've surfaced as a generic form error instead of an inline field error. Fixed: added a client-side length check before submit, with its own inline error.
- **[medium, patch]** `request.json()` was unguarded — a malformed body would throw before any of the route's own error handling ran, producing a response that doesn't match the required `{ error: { code, message } }` shape. Flagged independently by all three reviewers. Fixed: wrapped in try/catch. Live-verified with a non-JSON body.
- **[low, patch]** `Input`'s `aria-invalid` styling used shadcn's default `destructive` (red) classes — dead code today since nothing set `aria-invalid`, but wiring up accessibility correctly (see next row) would have shipped a red error state, directly violating DESIGN.md's "never red/alarm" rule. Fixed both together: `aria-invalid` now uses `{colors.primary}` (clay), and the Register form actually sets `aria-invalid`/`aria-describedby` on every field with an error, plus `role="alert"` on the error text.
- **[low, patch]** No `autoComplete` attributes on the email/password/confirm-password fields. Fixed: added `autoComplete="email"` / `"new-password"`.
- **[medium, patch]** The client's `fetch()` call had no try/catch — a network failure would leave the user with no feedback at all (and `submitting` would need the `finally` to still reset it, which it did, but with no error shown). Fixed: wrapped in try/catch with a generic connectivity error message.
- **[medium, patch]** `dailyCalorieTarget` had no upper bound — a very large number would pass client/server "positive integer" checks and then fail the Postgres `integer` column at insert time, triggering the exact orphaned-Auth-user path above via an unvalidated route. Fixed: added a 20,000 ceiling (well under Postgres's int32 max, and no legitimate target would need more) on both client and server; server-side rejection now correctly routes to the target field's inline error too (a related gap Edge Case Hunter flagged separately — the client only handled the `email_taken` code, not `invalid_target`, from the server). Live-verified with an oversized value.
- **[low, patch]** Non-null assertions (`process.env.X!`) on `DATABASE_URL`, the two `NEXT_PUBLIC_SUPABASE_*` vars, and (in the new admin client) `SUPABASE_SERVICE_ROLE_KEY` would crash with an unclear low-level error if unset, rather than a clear message. Fixed: explicit checks with a clear thrown error naming the missing var and pointing at `.env.local`.
- **[medium, patch]** `signUp()` returning a user with non-empty identities but a null `session` was never checked — the client would be told registration succeeded and redirect while actually unauthenticated. Fixed: explicit check, returns a clear `no_session` error instead of a false success.
- **[low, false]** `spec-1-1-user-registration.md` frontmatter (`in-review`) and `sprint-status.yaml` (`in-progress`) were flagged as contradicting each other. Verified: this is normal mid-workflow sequencing, not a bug — `sprint-status.yaml` syncs to `review` at the Finalize step, which happens after this triage, not during it.
- **[medium, deferred]** Duplicate-email detection depends on an exact string match (`"User already registered"`) against live Supabase behavior, with no automated test guarding it — if the message or Supabase's behavior changes, it would silently fall through to a generic error instead of the required inline email-field error. The empty-identities fallback check remains as defense-in-depth. Deferred: this project has no test runner at all yet; introducing one is a bigger decision than this story's scope. Already manually verified once against the real local instance.
- **[medium, deferred]** No automated tests exist anywhere in the repo for this registration flow (confirmed via repo-wide search) — all verification this story relies on was manual, live testing against local Supabase, documented above. Deferred alongside the row above for the same reason (no test infrastructure decision made yet).
- **[low, deferred]** `supabase/config.toml` (the CLI's own default template from `supabase init`) enables several services this project doesn't use (S3 storage protocol, vector/analytics, edge runtime, extra OAuth providers) — not something this story's registration logic controls, but worth trimming later since it makes the noted local-vs-VPS Supabase parity check noisier than necessary.
