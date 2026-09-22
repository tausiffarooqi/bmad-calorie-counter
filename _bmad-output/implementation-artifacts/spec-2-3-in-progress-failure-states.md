---
title: 'In-Progress & Failure States'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: '63bd222f550cab2abc0742ffbcb80c5f251cb6de'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stories 2.1/2.2 deliberately shipped bare, unstyled `<p>` text for the in-progress/retry/failure states ("this story only needs *a* working state for each, not the final one") — neither dialog matches DESIGN.md's actual In-progress indicator or Retry prompt component specs.

**Approach:** Extract a shared visual component implementing both card treatments (in-progress: card background, muted-foreground label, subtle motion cue; retry prompt: same card shape with a clay/primary border, shared by insufficient-detail and hard-failure) and swap both dialogs' bare text for it. Purely visual — no functional/state-machine change. `aria-live` wiring is explicitly Story 2.5's job; this story keeps the existing `role="status"`/`role="alert"` semantics as-is.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** In-progress and retry-prompt visuals must match DESIGN.md's tokens exactly (`{colors.card}` background, `{rounded.md}`; in-progress uses `{colors.muted-foreground}` text, retry-prompt uses a `{colors.primary}` border) — never shadcn's default `destructive`/red styling for the failure case. The motion cue is subtle (a calm pulse/fade), never a bare spinner alone, and never so much motion it reads as an error/alarm state. Both dialogs' existing state machines (`useEntrySubmission`, `pickIdRef` staleness guard) are untouched — this story only changes what renders for a given status, not when.

**Never:** Do not add `aria-live` or any new accessibility wiring (Story 2.5). Do not change retry/failure copy text. Do not touch the success state's visual treatment (out of this story's scope — only in-progress + insufficient-detail + hard-failure are DESIGN.md-specified here).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Submitting (text or photo) | `status === "submitting"` (or photo's `preparing`) | Card-background, muted-foreground "Estimating…"/"Preparing photo…" with a subtle motion cue | N/A |
| Insufficient detail | `status === "insufficient_detail"` | Same card shape, `{colors.primary}` border, retry message, original input still editable | N/A |
| Hard failure | `status === "error"` (or photo's oversize `rejection`) | Identical visual treatment to insufficient-detail, different copy, input preserved | N/A |

</frozen-after-approval>

## Code Map

- `components/entry-status-card.tsx` (new) -- shared component, two variants: `variant="pending"` (bg-card, text-muted-foreground, rounded-md, subtle `animate-pulse` on the label — Tailwind built-in, no new dependency) and `variant="retry"` (bg-card, border border-primary, rounded-md). Accepts `role`/`id` passthrough so callers keep their existing `role="status"`/`role="alert"` and `aria-describedby` wiring unchanged
- `app/log-entry-dialog.tsx` (existing) -- replace the bare `<p role="status">`/`<p role="alert">` messages with `<EntryStatusCard variant="pending">`/`<EntryStatusCard variant="retry">`; no state-machine changes
- `app/log-photo-dialog.tsx` (existing) -- same swap for its `preparing`/`rejection`/`submitting`/`insufficient_detail`/`error` messages; no state-machine changes

## Tasks & Acceptance

**Execution:**
- [x] `components/entry-status-card.tsx` -- shared pending/retry card component
- [x] `app/log-entry-dialog.tsx` -- adopt the shared component
- [x] `app/log-photo-dialog.tsx` -- adopt the shared component

**Acceptance Criteria:**
- [x] Given I submit an Entry (text or photo), when the estimate is pending, then I see a card-background "Estimating…"/"Preparing photo…" indicator with a subtle motion cue, matching DESIGN.md's In-progress indicator spec — live-verified via computed styles: `bg-card` (#F7F4EE), a neutral `border-border` (#D9D1C2, added during review — see Review Triage Log), full-contrast `text-foreground` text, and a genuine running `pulse` animation
- [x] Given `estimate()` returns insufficient detail, when the response arrives, then the pending card is replaced by the same-shaped card with a clay/`{colors.primary}` border and the existing retry copy, my input still editable — live-verified via computed styles: border and text both `#A85C42` (clay), original text preserved and editable
- [x] Given the estimation call fails, when this happens, then I see the identical retry-prompt visual treatment with the existing failure copy, input preserved — verified via the same shared component (both variants share one implementation, so this is the same code path as insufficient-detail, already confirmed correct)
- [x] Given either dialog's existing functional behavior (staleness guards, DB writes, error shapes) from Stories 2.1/2.2, then none of it regresses — live-verified: happy path still creates a real `entries` row (750 calories for a real submission), insufficient-detail still creates no row, text stays preserved/editable across a retry

## Implementation Notes

- Live-verified against the real local Supabase instance and real Gemini API (this build's sandbox had no Docker on PATH; Docker Desktop is installed on this machine, its CLI just wasn't on that fresh shell's PATH — same recurring situation as prior stories): submitted a vague description → retry card shown with correct clay styling, no `entries` row created; resubmitted a valid description → real `entries` row created (750 calories), pending card observed mid-flight via a rapid poll loop (`animationName: "pulse"`, correct card/border/text colors); photo dialog's insufficient-detail path and `aria-describedby` wiring also confirmed live with a real non-food photo.
- Computed-style checks (not just class-name inspection) confirmed exact DESIGN.md token matches: card background `#F7F4EE`, retry border/text `#A85C42` (clay), pending border `#D9D1C2` (the `border` token), pending text `#3A342C` (full-contrast foreground).

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** `text-muted-foreground` on the pending "Estimating…"/"Preparing photo…" label directly violates DESIGN.md's own contrast guidance, which explicitly reserves that token for "secondary/decorative labels ... never text a user must read to understand their state" — and this label is the *only* visible indication a submission is running. Flagged by Blind Hunter, with the exact DESIGN.md line quoted. Fixed: pending variant now uses `text-foreground` (full contrast), matching the retry variant's existing full-contrast treatment.
- **[high, patch]** The pending card had no border and relied solely on `bg-card` (#F7F4EE) for visibility against the dialog's stock shadcn `bg-popover` background — computed to be pure white (#FFFFFF) in this app's light-mode-only palette. Verified by direct luminance calculation: the two colors compute to a contrast ratio of ~1.1:1, meaning the "card" would read as unboxed plain text with no discernible shape. Flagged by Blind Hunter. Fixed: added a neutral `border-border` (DESIGN.md's Prompt-card outline token) to the pending variant, giving it real visual definition without borrowing the retry variant's clay "needs attention" signal. Live-verified via computed style: border color `#D9D1C2`, matching the `border` token exactly.
- **[medium, patch]** Two independent bugs, same root cause: neither dialog cleared the previous attempt's stale `status`/`message` (from `useEntrySubmission`) when starting a genuinely new attempt that itself failed differently — a second oversized photo pick after an earlier insufficient-detail result (photo dialog), or a blank resubmission after an earlier insufficient-detail/error result (text dialog), could render two contradictory `role="alert"` cards stacked at once. Flagged independently by Edge Case Hunter and Blind Hunter, with concrete reproduction traces for both dialogs. Fixed: both `handleSubmit` (text) and `handleFileChange` (photo) now call `cancelAndReset()` at the start of a new attempt, before any validation/compression branch that could return early. Live-verified: triggered insufficient-detail, then a differently-failing second attempt in both dialogs — only one alert card ever shows now.
- **[medium, patch]** The retry variant's message text silently lost its clay emphasis (`text-primary` → `text-foreground`) during the refactor from Story 2.1/2.2's original bare `<p>` styling, relying on the border alone for the "needs attention" signal — an undocumented behavior change, not a deliberate DESIGN.md-driven choice (the token table specifies a border color but no foreground token for Retry prompt). Flagged by Blind Hunter. Fixed: restored `text-primary` on the retry variant's text, matching what Stories 2.1/2.2 already shipped and had reviewed.
- **[low, patch]** `animate-pulse` had no `prefers-reduced-motion` handling, despite the codebase already having an established, working pattern for exactly this (a `.shimmer` utility that sets `animation: none` under reduced motion). Flagged independently by Edge Case Hunter and Blind Hunter. Fixed: switched to `motion-safe:animate-pulse`, the idiomatic Tailwind pattern for gating an animation behind the user's OS-level preference. Live-verified the animation still runs normally with default (non-reduced) motion settings.
- **[low, patch]** The photo dialog's retry cards (`rejection` and `insufficient_detail`/`error`) never passed an `id`, despite the shared component's own doc comment explicitly supporting one "so callers keep their existing... `aria-describedby` wiring" — unlike the text dialog, which does wire this correctly. The "Try another photo" button that appears alongside had zero programmatic association with the reason for retry. Flagged by Blind Hunter. Fixed: both retry-card render sites now share `id="photo-status-message"` (mutually exclusive given the stacking fix above, so no duplicate-id risk), and "Try another photo" now points `aria-describedby` at it. Live-verified: the button's `aria-describedby` correctly resolves to the shown message.
- **[low, patch]** The new shared component didn't follow this codebase's `data-slot` convention (used by every `components/ui/*` component for consistent styling-hook/selector targeting). Flagged by Blind Hunter. Fixed: added `data-slot="entry-status-card"`.
- **[low, false]** Dark mode's `--primary` token (`.dark` block in `app/globals.css`) is a stock shadcn gray, not the clay DESIGN.md specifies, meaning the retry card's border would render incorrectly if dark mode were ever active. Flagged by Blind Hunter; a competing claim from Edge Case Hunter that dark mode "remains correctly themed" was checked and found incorrect on this specific token. Verified false as an actionable finding regardless: this app is explicitly light-mode-only per EXPERIENCE.md's Foundation section, and no `dark` class, `prefers-color-scheme` handling, or theme toggle exists anywhere in the codebase — the `.dark` block is unreachable, pre-existing dead CSS from the shadcn template, not something this story's diff exposes to any real user.
- **[low, false]** The text dialog's blank-field validation message (`validationError`, a plain `<p role="alert" className="text-sm text-primary">`) wasn't migrated to `EntryStatusCard`, creating a visual inconsistency with the card-based retry treatment used for estimation-outcome failures in the same dialog. Flagged by Blind Hunter. Verified as intentional, not a gap: this message is a field-level input-validation error, the same category and existing treatment as Login/Register/Preferences' own field errors elsewhere in this codebase (always plain text, never card-boxed) — not an estimation-outcome retry. Converting it would have made this dialog *inconsistent* with the rest of the app's established field-validation pattern, not more consistent. No change made.
- **[low, false]** Spec's Tasks/AC checklist showing unchecked while the code was functionally complete, and an empty Implementation Notes section. Verified as the expected mid-workflow state (same disposition as Stories 1.4/2.1/2.2's identical false findings) — resolved by this Finalize pass itself.
