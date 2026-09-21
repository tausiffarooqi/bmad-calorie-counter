- source_spec: `_bmad-output/implementation-artifacts/spec-0-1-design-tokens-visual-foundation.md`
  summary: sprint-status.yaml's story status vocabulary (backlog/ready-for-dev/in-progress/review/done) has no state for "paused pending a human decision," which is what a mid-implementation stop-and-replan actually is.
  evidence: Story 0.1 hit a real stop-and-replan (typescript-eslint/TS7 incompatibility) and sat at "in-progress" throughout, indistinguishable from active work. This is a sprint-planning tooling/vocabulary gap, not something any one story's own intent can fix.
- source_spec: `_bmad-output/implementation-artifacts/spec-0-2-cross-cutting-interaction-accessibility-primitives.md`
  summary: app/globals.css has no trailing newline at EOF.
  evidence: Pre-existing since Story 0.1 (confirmed against that story's diff), not caused by Story 0.2. npm run lint passes either way (no eol-last-style rule configured); cosmetic, direct one-line fix whenever someone next touches the file.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-user-registration.md`
  summary: Duplicate-email detection in the registration route depends on an exact string match against live Supabase's error message, with no automated test guarding it.
  evidence: If Supabase's "User already registered" message or behavior changes, the code silently falls through to a generic error instead of the required inline email-field error. Manually verified once against the real local instance; the empty-identities fallback remains as defense-in-depth. Fixing properly needs a test runner, which this project doesn't have yet.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-user-registration.md`
  summary: No automated tests exist anywhere in this repo (confirmed via repo-wide search) — all Story 1.1 verification was manual, live testing against local Supabase.
  evidence: Registration now involves real DB writes, Auth calls, and a rollback path, all verified by hand this session. Introducing a test runner (Vitest/Playwright) is a project-wide decision bigger than any single story.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-user-registration.md`
  summary: supabase/config.toml (the CLI's own default from `supabase init`) enables several unused services (S3 storage protocol, vector/analytics, edge runtime, extra OAuth providers).
  evidence: Not controlled by this story's registration logic. Worth trimming later since it makes the architecture's noted local-vs-Hostinger-VPS Supabase version/config parity check noisier than necessary.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-user-login.md`
  summary: proxy.ts redirects to /login on any unauthenticated protected-route visit without preserving the originally-requested path (no `?next=` param), so post-login the user always lands on `/` rather than where they were headed.
  evidence: Zero user-visible impact today since `/` is the only protected route that exists. Revisit once Epic 2+ adds real protected routes (meal logging, history, etc.) — add a `next` search param on the redirect-to-login and read it back on successful login instead of hard-coding `window.location.href = "/"`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-user-login.md`
  summary: proxy.ts's `supabase.auth.getUser()` call is unguarded — no try/catch, no timeout — so a Supabase Auth outage or slow response either throws an unhandled error or hangs every request in the app, including `/login` itself, and its `error` return value is silently discarded, making "no session" and "couldn't verify session" indistinguishable.
  evidence: Not exercised by manual testing against a healthy local instance. Needs a product decision (fail-open vs. fail-closed under an Auth-service outage, and whether to show a dedicated error state) that's bigger than this story's scope.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-user-login.md`
  summary: Login and Register both lack page-specific `<title>`/metadata (`export const metadata`), falling back to the layout's generic title.
  evidence: Cosmetic, pre-existing on both auth pages since Story 1.1; not a Story 1.2 regression. Fix both together whenever someone next touches either page.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-user-login.md`
  summary: Login's submit button relies on React state (`disabled={submitting}`) to block double-submission, which isn't synchronous — a very fast double-click/double-Enter before the disabled state commits could fire two concurrent `signInWithPassword()` calls.
  evidence: Narrow race, no observed real-world occurrence; existing `disabled` state substantially mitigates it. A synchronous ref-based lock would close the remaining gap if this is ever observed live.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-user-login.md`
  summary: Login uses a hard reload (`window.location.href`) after `signInWithPassword()` to dodge a session-cookie timing race with the proxy; Register still uses `router.push()` after its own signup flow, which looks like the same pattern at a glance.
  evidence: Investigated directly — not the same risk. Register's session cookie is set via the `Set-Cookie` header on the completed `/api/auth/register` HTTP response (guaranteed synced by the time `await fetch()` resolves) before `router.push()` ever runs. Login's cookie is set via the browser client's in-page `document.cookie` write inside `signInWithPassword()`, which is the actual documented risky pattern the hard-nav fix targets. Revisit Register only if the same "bounced back" symptom is ever observed live there — don't blindly copy the hard-nav fix without evidence it's needed.
