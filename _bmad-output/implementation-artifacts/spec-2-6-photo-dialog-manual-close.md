---
title: 'Photo Dialog Manual Close'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '1352de1'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Log Photo dialog currently auto-closes ~1.2s after a successful estimate (via `useEntrySubmission`'s shared `SUCCESS_CLOSE_DELAY_MS` timer), same as the Log Entry (text) dialog. FR-25/Story 2.6 were just amended: once a photo estimate succeeds, the dialog must stay open — showing the photo preview and the calorie estimate — until the user explicitly closes it. The text dialog's auto-close is unchanged. The Entries list/Remaining Budget must still refresh immediately on success regardless of when the photo dialog is closed.

**Approach:** Add an optional third parameter to `useEntrySubmission`'s `submit(body, onSuccess, options?)` — `options.deferSuccessCallback` (default `true`, preserving today's exact behavior for every existing caller). When `false`, `onSuccess` fires immediately on success instead of being scheduled behind the existing timer. In `app/log-photo-dialog.tsx`, pass `{ deferSuccessCallback: false }` and change the success callback to `() => onSuccess?.()` (dropping the `handleOpenChange(false)` call it currently makes) — the dialog now only closes via its existing close control (X button, Escape, overlay click), which already runs `handleOpenChange(false)` → `cancelAndReset()` → the existing preview-revoke/state-reset logic added in Story 2.6, unchanged. `app/log-entry-dialog.tsx`'s call site is untouched (defaults to `deferSuccessCallback: true`), preserving its exact current auto-close behavior.

</frozen-after-approval>

## Implementation Notes

- `hooks/use-entry-submission.ts`: `submit()` gained an optional third parameter, `options?: { deferSuccessCallback?: boolean }`. On success, if `options?.deferSuccessCallback === false`, `onSuccess()` fires immediately and the function returns — skipping the existing `SUCCESS_CLOSE_DELAY_MS` timer/`pendingSuccessCallbackRef` machinery entirely (nothing pending for `cancelAndReset()`'s early-fire branch to interact with). Every existing caller is unaffected: the parameter is optional and the omitted-case (`undefined !== false`) falls through to the unchanged deferred path.
- `app/log-photo-dialog.tsx`: the `submit()` call site now passes `{ deferSuccessCallback: false }` and its success callback changed from `() => { handleOpenChange(false); onSuccess?.(); }` to `() => onSuccess?.()` — dropping the auto-close entirely. The dialog now only closes via its existing close control (X button/Escape/overlay click), which already runs `handleOpenChange(false)` → `cancelAndReset()` → the Story 2.6 preview-revoke/state-reset logic, unchanged.
- `app/log-entry-dialog.tsx` (text dialog): untouched — its call site doesn't pass `options`, so it keeps the exact same deferred auto-close behavior as before.
- Live-verified end-to-end via `agent-browser` against the real running dev server, real local Supabase, and the real Gemini API (no mocking): generated a simple recognizable apple drawing (via Pillow) as a test photo, uploaded it, and confirmed Gemini correctly estimated "A single medium red apple with a stem and leaf" at 95 calories. Confirmed the Remaining Calorie Budget and Entries list both updated in the background (2,250 → 2,155, new list row) *while the photo dialog was still open* showing the preview + "Logged — about 95 calories." Waited well past the old 1.2s auto-close delay and confirmed the dialog remained open (re-snapshotted the DOM, dialog still present with both status text and the close button). Clicked the dialog's own "Close" button and confirmed it closed cleanly with no leftover state. Then submitted a text Entry ("one medium banana") through the unmodified `LogEntryDialog` and confirmed it still auto-closed as before (dialog gone from a snapshot taken 3s later, entry and updated budget already reflected) — no regression to the text path.

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, no type errors.
- `npx eslint hooks/use-entry-submission.ts app/log-photo-dialog.tsx app/log-entry-dialog.tsx` -- ran, no lint errors.
- `node --test lib/**/*.test.ts` -- ran, all 90 tests passing (no new pure logic introduced, so no new unit tests needed).
- `npx next build` -- ran, clean production build, no new warnings.

**Manual checks:**
- Live-verified in a real browser session (`agent-browser`) against the real running dev server, real local Supabase instance, and the real Gemini API: photo dialog stays open past the old auto-close delay with a genuine success result, background refresh happens immediately, explicit close works cleanly, and the text dialog's unmodified auto-close behavior is unaffected. See Implementation Notes for the full walkthrough.

## Review Triage Log

Blind Hunter ran (the single layer this oneshot-sized change calls for). Finding floor: ~3.45 kB changed → N = min(floor(sqrt(3.45)+1), 10) = 2; reviewer found 7.

- **[low, patch]** `SUCCESS_CLOSE_DELAY_MS`'s comment said it's "used by both dialogs to auto-close," no longer accurate now that the photo dialog opts out. Fixed: comment now states the delay only applies to the default deferred path (the text dialog).
- **[low, patch]** `LogPhotoDialogProps.onSuccess`'s doc comment claimed it "fires independently of whether the dialog is still open" — traced the code and this was backwards: with no `await` between the last staleness check and the call, `onSuccess` for a `deferSuccessCallback: false` caller can only ever fire while the dialog is still logically open (a prior close would already have invalidated `requestIdRef` and caused an early return). Fixed: reworded to say it fires immediately rather than waiting behind the (now-caller-specific) delay, without the incorrect open/closed claim.
- **[low, patch, folded into the fix above]** `pendingSuccessCallbackRef`'s existing comment didn't note it's now specific to deferred callers (never populated when `deferSuccessCallback: false`). Fixed: added a note to the same comment block.
- **[low, rejected]** No automated test for the new `deferSuccessCallback` branch or the resulting no-auto-close behavior. Rejected: this hook has zero test infrastructure of any kind — testing a React hook's async state machine would require introducing a rendering-capable test setup this project has never had, the same pre-existing, already-logged systemic gap every prior story has hit.
- **[low, rejected]** `submit()`'s JSDoc mixes shared-hook documentation with caller-specific UI concepts (Entries list/Remaining Budget). Rejected: this exact docstring already named both dialogs by name before this change ("the text dialog sends..., the photo dialog sends...") — the addition continues an established local convention, not a new one.
- **[low, rejected]** `deferSuccessCallback` reads as a double negative; `closeOnSuccess` would map more directly to observable behavior. Rejected: the hook itself has no concept of "closing" anything — it only ever calls a caller-supplied callback now or later; `closeOnSuccess` would presume caller semantics the hook doesn't actually own. Defensible tradeoff either way, not a defect.
- **[false]** `sprint-status.yaml` has no tracking key for the new `spec-2-6-photo-dialog-manual-close.md` file. Disproof: this project's sprint tracking is keyed by *story*, not by spec-file revision — the existing `2-6-photo-preview-during-estimation` key already correctly represents Story 2.6's current state regardless of how many spec files have contributed to it over time, matching the established pattern for any story that goes through a review-loopback or follow-up amendment.
