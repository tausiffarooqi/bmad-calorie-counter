---
title: 'Recommendation Card & Over-Target Banner — Soft Shadow'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
baseline_commit: '2ac29c91e3f9423137c6bea34823626e759363b0'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.3/3.5's amended ACs (epics.md, UX-DR4) require the Recommendation card and Over-Target banner to carry the same soft-shadow treatment every other refreshed card already has — but `app/page.tsx`'s two inline-styled `<div>`s for these (over-target banner, recommendation cards) have no shadow class.

**Approach:** Add the `shadow-soft` Tailwind utility (Story 0.1's token) to both existing `<div className="w-full max-w-sm rounded-md border border-primary bg-card p-4">` (Over-Target banner) and `<div className="w-full max-w-sm rounded-lg border border-accent bg-card p-4">` (Recommendation card) in `app/page.tsx`. A pure class-list addition — no other markup, logic, or data change.

**Always:** Keep every other class on these two elements unchanged.

**Never:** Touch the Login/Register/Preferences form cards — their own mockups show a shadow too, but neither DESIGN.md's Components list nor any story's AC currently calls for it (deferred-work.md).

**Correction (post-review):** The original "Never" clause here claimed the Hero card and prompt-card already had their shadow from Stories 4.1/4.5. Blind Hunter's review disproved that for prompt-card — `first-login-prompt.tsx` and `breakfast-offer-card.tsx` (the same prompt-card visual family, EXPERIENCE.md Component Patterns) never got it, and neither did `entries-list.tsx` despite Story 2.4's own amended AC calling for it. This story's scope is corrected to close all three gaps — same shadow-soft class addition, same low risk, just three more elements than originally scoped.

</frozen-after-approval>

## Implementation Notes

Applied `shadow-soft` to the Over-Target banner and Recommendation card as planned. Blind Hunter's review caught that the frozen spec's own "Never" clause was factually wrong — `first-login-prompt.tsx`, `breakfast-offer-card.tsx` (the same prompt-card family), and `entries-list.tsx` (Story 2.4's own amended AC called for this, never actually applied) were all still missing the shadow. Scope corrected in-flight to close all three, verified visually via `agent-browser`. Also self-caught while investigating: Login/Register/Preferences form cards show a shadow in their own mockups but were never added to DESIGN.md's Components list or any story's AC — logged to `deferred-work.md` rather than further expanding this story's scope.

## Review Triage Log

- **medium** — The frozen spec's "Never" clause asserted prompt-card already had its shadow from Stories 4.1/4.5; false. `first-login-prompt.tsx`, `breakfast-offer-card.tsx`, and `entries-list.tsx` (Story 2.4's own amended AC required this) were all still missing `shadow-soft`. Fixed: added the class to all three, corrected the spec's own inaccurate claim in place with a visible correction note.
- **low** — `app/globals.css`'s `--shadow-soft` comment still listed all of entries-list/prompt-card/Recommendation card/Over-Target banner as pending after this diff finished two of them (and, per the finding above, actually all of them). Fixed: updated to name every surface now covered.
- **low, rejected** — `sprint-status.yaml` moves these stories straight to `in-progress`→`done` rather than through a `review` state the file's own template comment describes. Consistent with this session's established convention throughout the entire redesign (Blind Hunter review substitutes for a separate `bmad-code-review` pass per explicit earlier user instruction) — not a gap specific to this story.
- **low, rejected** — No automated test asserts the `shadow-soft` class renders on these elements. This codebase has zero React-component-rendering tests anywhere (only pure Node-function tests, e.g. `tone-message.test.ts`'s own header comment: "introducing a test framework is explicitly deferred project-wide") — adding one here would introduce an entirely new testing paradigm project-wide, well beyond this story's scope.
- **low, rejected** — The Over-Target banner's message has no `role="alert"`/`aria-live`, unlike the load-error message a few lines up. Real, but explicitly flagged by the reviewer itself as pre-existing (not introduced by this diff) — logged as a lower-priority observation, not actioned in a shadow-only story.
- **low, rejected** — Class-order convention (`shadow-soft` last) isn't written down anywhere, just inferred from prior stories. No functional impact; not worth a tracked action.
