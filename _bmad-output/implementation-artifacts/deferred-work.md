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
