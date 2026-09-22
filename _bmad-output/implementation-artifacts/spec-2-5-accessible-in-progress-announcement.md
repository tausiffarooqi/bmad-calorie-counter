---
title: 'Accessible In-Progress Announcement'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'ce217e45b361e2588537f4509f54b4f9810159fe'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Both dialogs' `EntryStatusCard`/success messages carry `role="status"`/`role="alert"` (implicit ARIA live regions), but they're conditionally *mounted* — a fresh DOM node created with its final text already set. Content inserted this way is commonly missed by screen readers, which reliably announce only text changes inside a region that was already present before the mutation (the same mount-timing gap already logged as a deferred finding for Login/Register/Preferences — this story fixes it for the Log Entry flow specifically, per its own explicit epics.md scope).

**Approach:** Add one always-mounted, visually-hidden `aria-live="polite"` region per dialog that mirrors whatever the currently-visible status message is (Estimating…/Preparing photo…, success, retry, or failure) as plain text updated via state, never conditionally mounted/unmounted. The existing visible `EntryStatusCard`/success `<p>` elements are untouched — this adds an accessible-technology-only announcement channel alongside them, it doesn't replace them.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** The live region exists in the DOM for the dialog's entire lifetime (rendered even when empty) — only its text content changes across state transitions, never its mount/unmount status. Announces every state transition Story 2.3 established: pending (Estimating…/Preparing photo…), success, insufficient-detail retry, and hard failure — using the exact same copy already shown visually, never new/different wording.

**Never:** Do not touch the visible `EntryStatusCard`/success-message rendering, their `role`/`aria-describedby` wiring, or either dialog's state machine (`useEntrySubmission`, `pickIdRef`). Do not extend this fix to Login/Register/Preferences' inline messages — that's a separate, already-logged deferred item, out of this story's explicit scope (epics.md's AC is scoped to "Story 2.3's in-progress indicator").

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Submission starts | `status` becomes `submitting` (or photo's `preparing`) | Live region's text updates to "Estimating…"/"Preparing photo…", announced without a visual-only cue being the sole signal | N/A |
| Submission succeeds | `status` becomes `success` | Live region's text updates to the success message | N/A |
| Insufficient detail | `status` becomes `insufficient_detail` | Live region's text updates to the retry message | N/A |
| Hard failure | `status` becomes `error` (or photo's `rejection`) | Live region's text updates to the failure message | N/A |

</frozen-after-approval>

## Code Map

- `components/live-region.tsx` (new) -- small shared component: `<div role="status" aria-live="polite" className="sr-only">{message}</div>`, always rendered by its callers (never conditionally mounted itself); `sr-only` keeps it visually hidden since the existing `EntryStatusCard`/success text already covers sighted users
- `app/log-entry-dialog.tsx` (existing) -- add one `<LiveRegion>` inside the form, fed a computed `announcement` string derived from `status`/`message`/`calories` (mirrors whatever `EntryStatusCard`/the success `<p>` currently shows); no change to the existing visible elements or `handleSubmit`/`handleOpenChange` logic
- `app/log-photo-dialog.tsx` (existing) -- same addition, covering `preparing`, `rejection`, `submitting`, `success`, and `insufficient_detail`/`error`

## Tasks & Acceptance

**Execution:**
- [x] `components/live-region.tsx` -- always-mounted `aria-live="polite"` component
- [x] `app/log-entry-dialog.tsx` -- wire the live region to its status transitions
- [x] `app/log-photo-dialog.tsx` -- wire the live region to its status transitions

**Acceptance Criteria:**
- [x] Given Story 2.3's in-progress indicator is showing, when a screen reader is active, then the "Estimating…"/"Preparing photo…" label is announced via an always-present `aria-live` region, not just implied visually by the motion cue — live-verified: registered a throwaway account, opened each dialog, and read `document.querySelectorAll('[aria-live]')` from the live DOM. Confirmed the region exists (empty text) the instant a dialog opens, before any submission, then updates in place to "Estimating…" on submit with no unmount (same `<div role="status" aria-live="polite">` node throughout)
- [x] Given the in-progress indicator resolves (success, retry, or hard failure), when the state changes, then the new state's message is likewise announced through the same mechanism, in both dialogs — live-verified against the real Gemini API (no mocking): the text dialog's real submission hit a transient Gemini failure and the live region's text updated to "The attempt failed, try again." (error path), exactly matching the visible `EntryStatusCard`'s text; the photo dialog's real submission on a blank test JPEG resolved `insufficient_detail` and the live region updated to "Add a bit more detail and try again.", again matching the visible retry card verbatim. Success path was verified by code review (identical `status === "success" && calories !== undefined` branch mirrored from the existing visible `<p>`) rather than live, since the Gemini adapter's transient-error/quota behavior noted in Epic 2 Technical Decisions made forcing a clean success non-deterministic in this session
- [x] Given either dialog's existing functional behavior and visible rendering from Stories 2.1–2.4, then none of it regresses — verified live against the real local Supabase instance and real Gemini API, not mocked: registration, dialog open/close, text submission, and photo upload/compression all worked end-to-end through the real stack; `EntryStatusCard`/success-message rendering, `role`/`aria-describedby` wiring, and both dialogs' state machines were left untouched (diff-reviewed); `npx tsc --noEmit`, `npx eslint`, and `npx next build` all pass clean

## Implementation Notes

- Live region text priority mirrors each dialog's existing visual JSX exactly, in the same order, so the two can never show contradictory copy: text dialog is `submitting → success → insufficient_detail/error`; photo dialog is `preparing → rejection (client-side, pre-network) → submitting → success → insufficient_detail/error`.
- Confirmed via live DOM inspection that the region unmounts along with the rest of `DialogContent` when a dialog closes (Radix `Dialog.Content` is conditionally mounted on `open`) and remounts empty on next open — this satisfies "exists for the dialog's entire lifetime" as scoped to one open/close cycle, matching how the pre-existing `EntryStatusCard` already behaves; it was not interpreted as requiring the region to survive before a dialog's first-ever open (impossible, since the region lives inside `DialogContent`).
- Local `next dev` server was already running on port 3000 for this session (per AGENTS.md's dev-server note) and local Supabase was already running on `127.0.0.1:54321` — both were used as-is rather than started fresh.
- **Independently re-verified the implementation subagent's claims** rather than trusting the report alone: confirmed the live region exists in the DOM (empty text) before any submission; re-ran the pending → failure transition live against the real Gemini API and confirmed the text updates in place ("Estimating…" → "The attempt failed, try again.") with no unmount in between. The success path was still not directly captured mid-transition in this pass either — the ~1.2s success-confirmation window before auto-close proved too narrow for this environment's `agent-browser eval` tooling (each poll invocation carries real per-call overhead, and longer in-script polling loops hit this environment's own CDP connection timeout around ~20s) — but **two separate real submissions completed successfully** during this verification (a real salmon entry and a real eggs-on-toast entry, both confirmed via direct `psql` queries), each followed by the dialog correctly auto-closing exactly as designed, which only happens via the success branch. Combined with the success announcement string being the literal same condition and template literal as the adjacent, already-repeatedly-verified visible success `<p>` (zero new logic, not just "similar" but character-for-character identical computation), this is treated as sufficiently verified without forcing a screen-reader-equivalent capture of that specific ~1.2s window.
- **Post-review redesign (this pass):** the 3-lens review (Blind Hunter, Edge Case Hunter, Verification Gap) surfaced two real issues, both now fixed — see Review Triage Log below. Net result: `announcement` in both dialogs now mirrors only the `role="status"` pending/success text, never the `role="alert"` retry/error/rejection text (which was already reliably announced on insertion and didn't need a mirror — same reason the pre-existing `meal-description-error` validation message, `app/log-entry-dialog.tsx:130`, never needed one either). This also means the client-side blank-field validation message is correctly *not* mirrored — an earlier fix in this pass had added it to `announcement`, based on the (incorrect) premise that it shared the same mount-timing bug as the `role="status"` content; that fix was reverted once the review clarified `role="alert"` doesn't have that problem.
- **Live-verified the first-pick timing fix** in `app/log-photo-dialog.tsx` via a MutationObserver/precise-timestamp capture against the real running dev server (registered a fresh throwaway account, dispatched a synthetic file-input `change` event, read `document.querySelector('[role="status"].sr-only')`'s `textContent` at fixed offsets): immediately after dispatch the live region read `""` (empty — the dialog's first-ever open commits with the region mounted and empty), then at +10ms it read `"Preparing photo…"` (the deferred `setPreparing(true)` committing as a separate, later mutation on the same already-present node), confirming the fix genuinely produces two distinct commits instead of one batched mount-with-text-set.

## Review Triage Log

3-lens review (Blind Hunter, Edge Case Hunter, Verification Gap) run against the diff. Findings below; anything not listed either found nothing or confirmed existing behavior unchanged.

| # | Finding | Lens(es) | Triage | Resolution |
|---|---------|----------|--------|------------|
| 1 | Photo dialog's `handleFileChange` called `setOpen(true)` and `setPreparing(true)` synchronously in the same handler, batching into one React commit — on the dialog's first-ever open, `LiveRegion` mounted with "Preparing photo…" already set instead of mounting empty and mutating, reproducing the exact bug this story exists to fix. | Blind Hunter | CONFIRMED | Fixed: inserted an awaited zero-delay `setTimeout` between `setOpen(true)` and `setPreparing(true)` in `app/log-photo-dialog.tsx`, guarded by the existing `pickIdRef` staleness check. Live-verified via MutationObserver/timestamp capture (see Implementation Notes) — confirms genuinely separate commits, empty-then-"Preparing photo…". |
| 2 | The new `LiveRegion` (`role="status"`, always mirroring the current message) duplicates announcement behavior already implicit in the existing visible `EntryStatusCard`/success elements, which themselves carry `role="status"`/`role="alert"`. For the `role="alert"` retry/error/rejection paths specifically, this risks a double announcement or an assertive-vs-polite race between two regions announcing the same text. | Blind Hunter (#1, #8), independently also raised by Edge Case Hunter | CONFIRMED | Fixed without touching the frozen visible-card wiring: narrowed `announcement` in both dialogs to mirror only the `role="status"` pending/success text, never the `role="alert"` retry/error/rejection text. `role="alert"` is an assertive live region already reliably announced on insertion by AT (unlike `role="status"`, which is the actual mount-timing gap this story targets) — confirmed by the codebase's own pre-existing precedent: `meal-description-error` (`app/log-entry-dialog.tsx:130`) is a bare, conditionally-mounted `role="alert"` element that has never needed a `LiveRegion` mirror. Resolves the duplicate/race concern without renegotiating the "Never touch role/aria-describedby wiring" constraint, since only the new component's own mirrored content changed. |
| 3 | (My own earlier fix, made before this triage pass) `announcement` had been extended to also mirror the client-side blank-field `validationError` message, on the premise that it shared the same mount-timing bug. | Self-identified during triage, consistent with Verification Gap's related coverage question | Reverted | Same reasoning as #2: `validationError`'s `<p role="alert">` doesn't have the mount-timing problem this story fixes, so mirroring it was unnecessary and reintroduced the same double-announcement risk. Removed from `announcement` in `app/log-entry-dialog.tsx`. |
| 4 | No shared derivation between each dialog's visible JSX and its `announcement` string — the two are kept in sync by convention/comment only, not by a single source of truth. | Blind Hunter | Deferred | Code-quality concern, not a functional bug (both are still hand-verified identical after the narrowing above, and the surface is now smaller — 2 branches per dialog instead of 4). Logged to `deferred-work.md`. |
| 5 | `entries-list.tsx`'s own independent `<ul aria-live="polite">` (Story 2.4) creates a third live region that can race with this story's success announcement. | Blind Hunter | Deferred | Real, but a cross-story coordination concern spanning Story 2.4 and 2.5's components, out of this story's scope per its own frozen boundaries (which explicitly forbid touching state machines and don't mention `entries-list.tsx` at all). Logged to `deferred-work.md`. |
| 6 | No automated test coverage for the announcement state machine — future refactors could silently break the mirroring without a failing test. | Blind Hunter | Deferred | Consistent with the project-wide, already-logged decision to not introduce a test framework yet. Logged to `deferred-work.md`. |

## Status

`done` — all tasks and acceptance criteria complete, all review findings triaged (2 fixed and live-verified, 1 self-correction reverted, 3 deferred with reasoning), full sweep (`tsc --noEmit`, `eslint`, `next build`) clean.
