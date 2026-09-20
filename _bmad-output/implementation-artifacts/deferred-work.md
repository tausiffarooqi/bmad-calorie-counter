- source_spec: `_bmad-output/implementation-artifacts/spec-0-1-design-tokens-visual-foundation.md`
  summary: sprint-status.yaml's story status vocabulary (backlog/ready-for-dev/in-progress/review/done) has no state for "paused pending a human decision," which is what a mid-implementation stop-and-replan actually is.
  evidence: Story 0.1 hit a real stop-and-replan (typescript-eslint/TS7 incompatibility) and sat at "in-progress" throughout, indistinguishable from active work. This is a sprint-planning tooling/vocabulary gap, not something any one story's own intent can fix.
- source_spec: `_bmad-output/implementation-artifacts/spec-0-2-cross-cutting-interaction-accessibility-primitives.md`
  summary: app/globals.css has no trailing newline at EOF.
  evidence: Pre-existing since Story 0.1 (confirmed against that story's diff), not caused by Story 0.2. npm run lint passes either way (no eol-last-style rule configured); cosmetic, direct one-line fix whenever someone next touches the file.
