---
title: 'Button Style Fix — Font Weight, Primary Shadow, Add Photo/Add Text Row'
type: 'bugfix'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md'
baseline_commit: '075146c4188ac15e433fc6855ba0b3be222e5af8'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** User-reported: "the buttons style has not been updated." DESIGN.md's Button (primary) spec already said Add Photo should use the primary variant with a clay-tinted shadow, and every mockup shows bolder (600-weight) button text — but the code never matched: `log-photo-dialog.tsx`'s Add Photo button used `variant="outline"` (secondary) instead of primary, the shared Button component used shadcn's default `font-medium` and a generic neutral shadow-soft on the primary variant, and the Add Photo/Add Text row wasn't full-width/evenly-split like every mockup shows.

**Approach:** Bump the shared `Button` component's base font-weight to `font-semibold`. Add a new `--shadow-primary-soft` token (`0 6px 16px rgb(198 108 77 / 0.25)`, the mockup's own tinted shadow value) and apply it to the primary variant instead of the generic `shadow-soft`. Fix `log-photo-dialog.tsx`'s Add Photo button to use the primary variant (remove `variant="outline"`). Give both Add Photo and Add Text buttons `flex-1 h-11 text-[13px]` and wrap them in a `w-full` row (`app/page.tsx`), matching every mockup's full-width, evenly-split log-buttons row.

**Always:** Keep Add Text as the secondary/outline variant — only Add Photo's variant changes.

**Never:** Touch button sizing on First-Login prompt / Breakfast offer card buttons (already correctly variant-assigned, `flex-1`, and inherit the font-weight/shadow fix globally for free) — a full-app button-size consistency pass is out of scope for this fix; logged to `deferred-work.md`.

</frozen-after-approval>

## Implementation Notes

Bumped Button's base font-weight to `font-semibold`, added `--shadow-primary-soft`, fixed Add Photo's variant, and gave both buttons a new named `size="cta"` (~44px) plus `flex-1`. Verified visually via `agent-browser` on both the Daily view and Login page — matches the mockups precisely; also re-verified after the review-driven refactor that the rendering is pixel-identical. Blind Hunter caught several real polish issues: undocumented magic numbers (13px text, h-11 raw class, gap-2.5), a duplicated class string across two files instead of a named size variant, and a hardcoded shadow RGB instead of deriving it from `--primary`. All fixed — extracted a `size="cta"` cva variant (documented in DESIGN.md/epics.md), derived the shadow via `color-mix()`, dropped the 13px override (kept the app's existing `text-sm`), and reverted the gap back to its original `gap-3`.

## Review Triage Log

- **medium** — `h-11 flex-1 text-[13px]` was duplicated verbatim across `log-photo-dialog.tsx` and `log-entry-dialog.tsx` instead of a named `size` variant on the shared `buttonVariants` cva config, risking future drift between the two copies. Fixed: added `size="cta"` to `components/ui/button.tsx`, used at both call sites.
- **medium** — `h-11`/`text-[13px]` were bespoke, undocumented values — unlike every other numeric token this changeset touched, neither appeared in DESIGN.md, EXPERIENCE.md, or epics.md. Fixed: documented the CTA size in both DESIGN.md's Components section and epics.md's new UX-DR7a; dropped the 13px value entirely (see next finding).
- **medium** — `--shadow-primary-soft` hardcoded the RGB literal equivalent of `--primary` instead of deriving it via `color-mix()` (a technique this same file already uses for `--secondary`'s hover state) — a future retune of `--primary` would silently desync the shadow tint. Fixed.
- **low** — Reducing the button label from the app's base 14px (`text-sm`) to 13px shrank legibility on the two most-tapped controls with no accessibility re-check recorded. Fixed by removing the override entirely — the button height increase (32px → 44px) already substantially improves tap comfort per NFR-8/UX-DR22, and reusing the app's existing `text-sm` avoids introducing a second undocumented number.
- **low** — The button row's `gap-3` → `gap-2.5` change had no citation — EXPERIENCE.md only specifies "a full-width row, evenly split," not an exact gap. Fixed: reverted to the original `gap-3`.
- **low, rejected** — `font-semibold` was added to the variant-agnostic base class rather than scoped to just `default`/`outline` (the two variants DESIGN.md's UX-DR5/UX-DR6 document), so `ghost`/`link`/`destructive` also became bolder with no spec coverage. No visible impact: `ghost` is only used icon-only (no label text to render bold), and `link`/`destructive` are unused anywhere in this codebase. Keeping font-weight in the shared base string (rather than duplicating it per-variant) is also the more maintainable structure, consistent with how radius/transition are handled.
- **low, rejected** — Neither fix has test coverage. Consistent with this codebase's established convention — the test suite (`lib/services/*.test.ts`) covers only pure functions; no React-component-rendering tests exist anywhere, a decision already recorded project-wide.
- **low, rejected** — `first-login-prompt.tsx`/`breakfast-offer-card.tsx` keep the old ~32px height, creating a visible seam with the Daily view's new 44px CTA row. Already self-logged to `deferred-work.md` before this review ran; confirmed the disposition still stands — a full-app button-height consistency pass is out of scope for this targeted fix.
