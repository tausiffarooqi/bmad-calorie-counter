---
title: 'Cross-Cutting Interaction & Accessibility Primitives'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
baseline_commit: '0b7bf661326244b42d26c6e60c4ca6cccbb79e89'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** DESIGN.md/EXPERIENCE.md define cross-cutting interaction and accessibility rules (one primary + one secondary action per screen, no hover-only affordances, a visible focus ring on every focusable element, no infinite scroll, one-screen-one-action logging) that every later screen must follow — but the one rule with an actual code artifact to produce (the focus ring) currently only applies to shadcn's Button component, which opts in on its own. Nothing yet guarantees a plain link or a future non-shadcn interactive element gets the same branded focus treatment.

**Approach:** Add one global `:focus-visible` rule to `app/globals.css` so every focusable element — not just components that explicitly opt in — renders the clay `ring` token on keyboard focus. The remaining ACs (one-primary/one-secondary action, no hover-only affordances, no infinite scroll, one-screen-one-action) have no code to write yet since no real screens exist until Epic 1 onward — they are conventions this story confirms are already fully recorded in DESIGN.md/EXPERIENCE.md/epics.md, to be followed when those screens are built, not enforced by a standalone artifact today.

</frozen-after-approval>

## Implementation Notes

- Added a global `:focus-visible` rule to `app/globals.css`'s `@layer base` (2px clay `ring` outline, 2px offset) — applies to every focusable element, not just shadcn components that opt in.
- Added a plain `<a>` link to `app/page.tsx`'s foundation showcase, specifically to prove the global rule works on non-shadcn elements too (Button already had its own focus-visible styling from Story 0.1/shadcn's default).
- `npm run build` and `npm run lint` both pass cleanly against the change.
- The remaining ACs (one-primary/one-secondary action per screen, no hover-only affordances, no infinite scroll, one-screen-one-action logging) have no standalone artifact — confirmed they're already fully recorded in DESIGN.md (Do's and Don'ts, Layout & Spacing), EXPERIENCE.md (Interaction Primitives), and epics.md (Epic 0 description) as conventions for Epic 1 onward to follow when building actual screens. No code or doc gaps found there.

## Review Triage Log

- **[low, patch]** `epic-0-context.md`'s Stories section still labeled Story 0.2 "(not started...)" after this same diff implemented its focus-ring primitive. Verified directly. Fixed: updated the line to reflect Story 0.2 in progress.
- **[false]** Blind Hunter read the recompiled `epic-0-context.md` as having lost two design facts (desktop layout reflow, the dashed-header-rule motif) with "no replacement." Verified: both facts remain fully intact in `DESIGN.md` (the source of truth) word-for-word; `epic-0-context.md` is a per-epic distillation, and page-layout/composition details aren't relevant to Epic 0's own stories (tokens + interaction primitives, not screen layout) per compile-epic-context's own "scope aggressively" rule. Nothing was lost from the system, only correctly excluded from this one epic's scoped summary.
- **[false]** Same finding's follow-on claim that "dashed rules" is now an unexplained/abstract term within `epic-0-context.md`. Verified: the abstraction level (the general no-shadow/border-based-depth rule, without a specific screen's illustration) is exactly what Epic 0's own stories need; the concrete example lives in `DESIGN.md` for whichever future epic builds that specific screen.
- **[false]** The new Technical Decisions bullet mentioning "no `useTypeScriptCli` flag" was flagged as untraceable/unsourced. Verified: it's stated in the same sentence as the TS 6.0.3-downgrade rationale, is intentionally terse per the compile rules ("no full copies... always distill" — the full rationale lives in `ARCHITECTURE-SPINE.md`), and exists specifically to stop a future story from re-adding a flag that no longer applies. Adequately explained for its purpose.
- **[low, rejected]** The "(photo or text, not both combined)" detail appears in the UX & Interaction Patterns bullet but not the parallel Requirements bullet for the same rule. Verified: this isn't a new invented constraint — it's FR-1/EXPERIENCE.md's existing "no combined photo+text submission" rule, accurately restated. Both bullets are correct, just non-identically detailed; not a contradiction or drift risk worth enforcing symmetry over.
- **[false]** Flagged UX-DR1-4/27/28 as unmapped since only UX-DR25 gets an inline citation. Verified: the substantive content for all of them is present in Requirements & Constraints / Technical Decisions — the compile rules explicitly prefer "describe by purpose, not by source" over per-bullet source-tagging, so the absence of inline `(UX-DR-n)` citations is the intended style, not a gap.
- **[low, rejected]** `app/page.tsx`'s new `<a>` link duplicates `button.tsx`'s `link` variant classes instead of reusing `<Button variant="link" asChild>`. Verified the duplication is real, but checked the element's actual purpose: it exists specifically to prove the global `:focus-visible` rule works on a plain, non-shadcn-styled element — routing it through `Button` would make it inherit Button's own pre-existing focus-visible classes and defeat the entire point of the test. Rejected: the suggested fix would break what this code exists to verify.
- **[false]** The `<a href="#">` placeholder was flagged as needing its own comment marking it disposable. Verified: the page's existing file-level header comment ("Temporary foundation showcase... replaced by the actual Daily view in Epic 3") already covers every element on the page, including this one.
- **[low, deferred]** `app/globals.css` has no trailing newline at EOF. Verified this predates Story 0.2 — the same condition was already present in Story 0.1's version of the file (confirmed against that diff), so it isn't caused by this change. `npm run lint` passes either way (no `eol-last`-style rule configured). Deferred to `deferred-work.md` as a pre-existing, uncaused issue.
