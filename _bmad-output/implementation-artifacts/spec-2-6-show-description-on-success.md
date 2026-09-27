---
title: 'Photo Dialog — Show Description Alongside Calorie Estimate'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/prds/prd-bmad-calorie-counter-2026-09-15/prd.md'
baseline_commit: '673be16eaa13d6b92c4d92fdeebfbe08341aa56c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Direct user request: after estimating calories for an uploaded photo, the success state only shows "Logged — about N calories" — the system's own generated description of the meal (already computed, classified, and persisted as `entries.description_text`) is discarded after the response leaves the server, giving the user no way to confirm what the system actually identified.

**Approach:** Add `description: result.description` to both success-response shapes in `POST /api/entries` (`app/api/entries/route.ts`) — the value is already computed and available at both return points, no new computation. Thread it through `useEntrySubmission`'s state/return value (`hooks/use-entry-submission.ts`) alongside the existing `calories`. Render it above the calorie line in `log-photo-dialog.tsx`'s success state and success announcement.

**Always:** Scope this to the photo dialog only (`log-photo-dialog.tsx`) — the text dialog auto-closes shortly after success and the user already typed the description themselves, so there's nothing new to confirm there.

**Never:** Change what gets persisted to `entries.description_text` (unchanged) or introduce a second estimation call — this only surfaces a value the server already computes.

</frozen-after-approval>

## Implementation Notes

Added `description` to `POST /api/entries`'s two success-response shapes, threaded through `useEntrySubmission`, rendered above the calorie line in `log-photo-dialog.tsx`. Verified end-to-end via `agent-browser`: generated a simple synthetic food-like image with Pillow, uploaded it through the real dialog, and confirmed Gemini's own generated description ("A plate containing a serving of rice, a portion of broccoli, and a piece of meat.") rendered correctly above "Logged — about 450 calories." — then cleaned up the test entry. Blind Hunter caught a real accessibility inconsistency (the screen-reader announcement interpolated the description mid-sentence while the visible text put it on its own line) and a missing overflow bound on the description — both fixed.

## Review Triage Log

- **medium** — The screen-reader announcement string interpolated `description` mid-sentence (`Logged — ${description} — about ${calories} calories.`) while the visible markup put it on its own line above the calorie line — disagreeing in shape, contradicting the file's own "mirrors the visible text" comment. Fixed: restructured the announcement to match (description as its own sentence, trailing period normalized so it never doubles against the description's own punctuation).
- **medium** — The description `<span>` had no overflow/line-clamp bound, unlike the photo preview `<img>` right above it — a long model-generated description had no ceiling and could grow the dialog's content column unpredictably. Fixed: added `line-clamp-3`.
- **low** — `EntriesApiResponse`'s `description` field is typed optional even though the server can never actually omit it on success (`gemini-adapter.ts` validates non-empty description before returning `ok: true`), with nothing explaining why the type doesn't match that invariant. Fixed: added a comment clarifying this is deliberate (an untrusted network-payload type, not a restatement of the server's own internal guarantee) rather than an oversight.
- **low, rejected** — This spec's own frontmatter (`status`) and Implementation Notes were still incomplete at review time. Fixed as part of this same finalization pass — not a separate action.
- **low, rejected** — `result.description`'s server-side truncation (`MAX_DESCRIPTION_LENGTH`, 2000 chars) has no ellipsis/word-boundary handling and is now user-visible for the first time. Real in principle, but Gemini's own generated meal descriptions are always a short sentence or two in practice — reaching a 2000-character ceiling designed as a generous defensive bound (not a normal operating limit) is not a realistic occurrence for this content, and the truncation logic itself predates this change.
- **low, rejected** — No test coverage added for the new response field, hook state, or dialog rendering. Consistent with this codebase's established convention — the test suite covers only pure functions in `lib/services/*`; no API-route or component-rendering tests exist anywhere in this project.
- **low, rejected** — The text dialog's own generated description ("Gemini's own cleaned restatement," not verbatim user input) could also be worth surfacing, since the system may have reworded what the user typed. Real observation, but out of scope: the user's request was specifically about the photo preview, and the text dialog auto-closes shortly after success by design (FR-25's own scoping) — extending this is a defensible future enhancement, not a defect in the current change.
