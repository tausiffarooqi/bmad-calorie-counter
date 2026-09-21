---
title: 'User Login'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
baseline_commit: '92f53fd724dd13e5d6687314e2e8aa278854a72f'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A returning user can register (Story 1.1) but has no way to log back in, and nothing protects any route yet — `/` (the interim Daily-view placeholder) is currently public.

**Approach:** Build a Login screen that authenticates directly against Supabase Auth (no custom API route needed — login writes nothing to `profiles`, so the browser client's `signInWithPassword()` is sufficient), and add Next.js middleware that protects every route except `/login`, `/register`, and the `/api/auth/*` routes, redirecting unauthenticated visitors to `/login`.

**Decision (interim, not a product decision):** `/` becomes the protected route middleware redirects to/from, standing in for the real Daily view until Epic 3 builds it — same placeholder pattern Story 1.1 already established.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** Route protection is enforced centrally in `middleware.ts` (default: protect; explicit allow-list for public paths) — never per-page ad hoc checks, so a future new authenticated route is protected automatically without remembering to add a check. Use `supabase.auth.getUser()` in middleware, not `getSession()` — `getUser()` revalidates the JWT against the Auth server; trusting an unrevalidated session cookie in server-side middleware is the well-documented Supabase footgun this avoids.

**Never:** Do not build the real Daily view, Account/Preferences, or Log Entry screens in this story — only `/`, `/login`, `/register` exist right now, and only `/` needs protecting. Do not add "forgot password" (explicitly out of scope, FR-20).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Correct email + password for a registered account | Session established, redirect to `/` | N/A |
| Wrong credentials | Incorrect password or unregistered email | No session, stay on `/login` | Inline field-level error, no full-page error state (Supabase deliberately returns the same generic "Invalid login credentials" for both cases — anti-enumeration, not a bug to work around) |
| Unauthenticated + protected route | No session, visits `/` (or any future protected route) | Redirected to `/login` | N/A |
| Already authenticated | Valid session, visits `/login` or `/register` or `/` | Lands on `/` without re-authenticating; `/login`/`/register` also redirect straight to `/` since re-registering/re-logging-in while already in a session is never useful | N/A |

</frozen-after-approval>

## Code Map

- `middleware.ts` (new, repo root — Next.js requires it there, not under `app/`) -- central route protection: `supabase.auth.getUser()`, allow-list `/login`, `/register`, `/api/auth/*`, static assets; redirect unauthenticated visitors elsewhere to `/login`, redirect already-authenticated visitors on `/login`/`/register` to `/`
- `app/(routes)/login/page.tsx` (new) -- Login screen: email/password fields, calls `supabase.auth.signInWithPassword()` directly via the browser client (`lib/supabase/client.ts`, already exists from Story 1.1) — no new API route needed
- `app/(routes)/register/page.tsx` (existing, Story 1.1) -- update the "Already have an account? Log in" link now that `/login` actually exists (currently 404s)

## Tasks & Acceptance

**Execution:**
- [x] `proxy.ts` -- central auth gate per the I/O matrix (built as `middleware.ts`, then renamed to `proxy.ts` during Next.js 16's middleware→proxy migration — see Implementation Notes)
- [x] `app/(routes)/login/page.tsx` -- the actual screen, reusing Story 1.1's form-field pattern (shadcn `Input`/`Label`/`Button`, `aria-invalid`/`aria-describedby`/`role="alert"`, clay-not-red error styling)
- [x] Verify `/register`'s existing Login link resolves now instead of 404ing

**Acceptance Criteria:**
- [x] Given a registered account, when I submit correct credentials, then I land on `/` already authenticated (verified against the live local Supabase instance, not mocked)
- [x] Given wrong credentials, when I submit, then I see an inline field-level error and remain on `/login` — no full-page error state
- [x] Given no session, when I visit `/` directly, then I'm redirected to `/login`
- [x] Given a valid session, when I visit `/`, `/login`, or `/register`, then I land on `/` without being asked to re-authenticate
- [x] Given the Register screen's existing Login link, then it navigates to a real, working `/login` page

## Implementation Notes

**Next.js 16 middleware→proxy migration.** `middleware.ts` is deprecated in Next.js 16.3.5 in favor of `proxy.ts` (file renamed, exported function renamed `middleware` → `proxy`, `config`/matcher unchanged, no edge runtime). Built this story against `middleware.ts` first, hit the deprecation warning on rebuild, migrated to `proxy.ts` immediately rather than shipping on a deprecated convention. Same central-gate logic throughout — this was a rename, not a behavior change.

**Hard navigation on login success.** `handleSubmit` uses `window.location.href = "/"` rather than `router.push("/")` after a successful `signInWithPassword()`. This matches a well-documented Supabase+Next.js SSR footgun (a soft/RSC navigation can race ahead of the just-set session cookie, bouncing the user back to `/login`) and is good practice regardless. Kept as-is.

**Browser-automation dead end, root-caused.** Verifying this story's browser flows hit a long-running false alarm: clicking the Login submit button via the `agent-browser` CLI never triggered React's `onSubmit` — not via a simulated click, and not even via a direct `form.requestSubmit()` call (the cleanest possible native trigger, bypassing click delivery entirely). The identical symptom reproduced on Story 1.1's already-verified-correct Register page, which initially pointed toward a tooling/CDP quirk rather than an app bug.

Root cause, found by checking for React fiber properties on the live DOM (`Object.keys(el).filter(k => k.startsWith('__react'))` returned empty everywhere): **React never hydrated the page at all** when it was loaded at `http://127.0.0.1:3000/...`. The dev server log showed `Blocked cross-origin request to Next.js dev resource ... from "127.0.0.1"` — Next.js 16's dev-only cross-origin protection (`allowedDevOrigins`) doesn't trust `127.0.0.1` by default, only `localhost`, and blocked enough dev-resource chunk requests to prevent hydration, with no visible console error. Reloading the identical page at `http://localhost:3000/...` hydrated normally (fiber properties present, `onSubmit` fired correctly), and all four I/O-matrix scenarios then verified live against the real local Supabase instance: happy-path login → redirect to `/`; wrong credentials → inline "Invalid login credentials" error, stays on `/login`; unauthenticated visit to `/` → redirected to `/login`; authenticated visit to `/login` → redirected straight to `/`. Register's login link also confirmed pointing at a working `/login`.

No application code changes resulted from this investigation — the app was correct throughout; the dead end was entirely a test-harness origin mismatch. Noting it here since it consumed significant investigation time and is worth remembering for future browser-testing sessions on this project: **always use `http://localhost:3000`, never `http://127.0.0.1:3000`, when driving this app via `agent-browser`.**

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** `proxy.ts`'s two redirect branches built a fresh `NextResponse.redirect()` that didn't carry forward cookies `getUser()` may have just refreshed and staged on the `response` variable — a mid-refresh access token would have its rotated cookies silently dropped on any redirect, invalidating the session and bouncing the user back to `/login` on their very next request (the documented Supabase-SSR proxy footgun). Flagged by Edge Case Hunter as the single highest-severity finding. Fixed: both redirect branches now copy `response.cookies.getAll()` onto the redirect response before returning it. Live-verified the happy path and the authenticated-visits-`/login` redirect still work, and confirmed the session cookie is present and the app stays authenticated across three repeated navigations post-fix.
- **[medium, patch]** Login's `if (signInError) setError(signInError.message)` showed *any* Supabase error verbatim, not just the documented "Invalid login credentials" anti-enumeration message — a rate-limit, banned-account, or other GoTrue error code could leak account state to the user, contradicting the registration route's own "never forward raw provider text" rule. Flagged independently by Verification Gap and Blind Hunter. Fixed: whitelisted the exact anti-enumeration message for display; every other error code is logged server-side via `console.error` and shown as a generic "Something went wrong logging in — try again." Live-verified the wrong-credentials case still shows "Invalid login credentials" after the change.
- **[low, patch]** `proxy.ts`'s matcher excluded `api/auth` as an unanchored substring (would also match a future `/api/authorize` or `/api/auth-check`) and had no exclusion for `robots.txt`/`sitemap.xml`, unlike Next's own documented matcher example. Flagged by all three reviewers from different angles. Fixed: anchored to `api/auth(?:/|$)` and added `robots\.txt`/`sitemap\.xml` to the negative lookahead.
- **[low, patch]** `PUBLIC_PATHS.includes(pathname)` was an exact-string match with no trailing-slash normalization — `/login/` would fall through to "protected" and redirect-loop-adjacent behavior. Flagged by Blind Hunter and Edge Case Hunter. Fixed: added a small `isPublicPath()` helper that strips a trailing slash before comparing. Live-verified: an authenticated visit to `/login/` now redirects to `/` instead of falling through.
- **[low, patch]** Login's `<form noValidate>` disabled native HTML validation with nothing backing it up — unlike Register, which manually validates before submitting, an empty-credentials submit went straight to Supabase as a network round-trip. Flagged by Blind Hunter and Edge Case Hunter. Fixed: added a pre-submit empty-field check with its own inline error. Live-verified: submitting with both fields empty now shows "Email and password are required." without a network call.
- **[low, patch]** No `aria-busy` on the submit button during the async sign-in call — a screen-reader user got no non-visual signal that submission was in progress. Flagged by Blind Hunter. Fixed: added `aria-busy={submitting}` alongside the existing `disabled` state.
- **[low, false]** Login's shared `aria-describedby`/`aria-invalid` wiring on both the email and password fields (rather than per-field messages like Register) was flagged by Verification Gap as a structural divergence from Story 1.1's pattern. Verified as intentional, not a defect: Supabase's anti-enumeration design genuinely doesn't attribute the error to one field, so a single shared message is the correct behavior here, not a missed per-field case.
- **[low, false]** Missing env vars (`NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`) throw unconditionally inside `proxy.ts`, taking down every request including `/login`. Flagged by Blind Hunter and Edge Case Hunter. Verified as consistent with this codebase's established fail-fast convention — `lib/supabase/client.ts`, `server.ts`, `admin.ts`, and `lib/db/client.ts` all throw the same way on missing env vars. Not a Story 1.2-specific defect.
- **[low, false]** `/api/auth/*` routes bypass the proxy entirely via the matcher exclusion, so any future route under that path must self-enforce its own auth. Flagged by Edge Case Hunter. Verified as working as intended: this matches Next's own documented guidance ("Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone") and this app's existing architecture (route handlers already own their own checks; AD-1 keeps writes behind a service layer regardless of proxy state).
- **[medium, deferred]** No deep-link preservation — an unauthenticated visit to any future protected route redirects to a bare `/login` with no `?next=` param, and login always hard-navigates to `/` regardless of where the user was headed. Flagged by Blind Hunter and Edge Case Hunter. Deferred: zero user-visible impact today since `/` is the only protected route that exists; revisit once Epic 2+ adds real protected routes. Logged in `deferred-work.md`.
- **[medium, deferred]** `proxy.ts`'s `supabase.auth.getUser()` call is unguarded (no try/catch, no timeout) and its `error` return value is discarded, so an Auth-service outage or slow response either throws unhandled or hangs every request, and "no session" is indistinguishable from "couldn't verify session." Flagged by Verification Gap and Edge Case Hunter. Deferred: needs a product decision (fail-open vs. fail-closed, dedicated error state) bigger than this story's scope; not exercised by testing against a healthy local instance. Logged in `deferred-work.md`.
- **[low, deferred]** Login and Register both lack page-specific `<title>`/metadata. Flagged by Blind Hunter. Deferred: cosmetic, pre-existing on both pages since Story 1.1, not a Story 1.2 regression. Logged in `deferred-work.md`.
- **[low, deferred]** Login's submit button uses React state (`disabled={submitting}`) rather than a synchronous lock, leaving a narrow window for a very fast double-click to fire two concurrent `signInWithPassword()` calls. Flagged by Edge Case Hunter. Deferred: narrow race, no observed real-world occurrence, existing `disabled` state substantially mitigates it. Logged in `deferred-work.md`.
- **[low, deferred]** Login uses a hard reload (`window.location.href`) after sign-in while Register still uses `router.push()` after its own signup flow — flagged by Blind Hunter and Edge Case Hunter as a suspicious inconsistency given both claim to guard against the same session-cookie race. Investigated directly (read both pages and the register route in full): not the same risk. Register's cookie is set via the `Set-Cookie` header on the completed `/api/auth/register` HTTP response, guaranteed synced before `router.push()` runs; Login's cookie is set via the browser client's in-page `document.cookie` write, the actual documented risky pattern. Deferred rather than blindly copying the fix to Register without evidence it's needed there. Logged in `deferred-work.md`.
- **[low, deferred]** Concurrent/parallel requests (React Router prefetch + navigation, parallel route segments) could race a rotating refresh token in rare cases. Flagged by Edge Case Hunter. Deferred: substantially mitigated by the cookie-forwarding fix above; a full lock/dedupe mechanism is over-engineering for a hobby MVP at this stage.
- **[low, deferred]** bfcache (browser back/forward cache) could serve a stale pre- or post-auth page without re-running the proxy check. Flagged by Edge Case Hunter. Deferred: a systemic Next.js/browser limitation with no established mitigation pattern expected by the spec, not specific to this implementation.
- **[low, deferred]** Redirects carry the original request's query string across routes (e.g. `/meals?sort=asc` → `/login?sort=asc`). Flagged by Edge Case Hunter. Fixed as a side effect of the cookie-forwarding patch above (`redirectUrl.search = ""` was added alongside it) — not a separate deferred item after all, but noted here since it was raised as one.
