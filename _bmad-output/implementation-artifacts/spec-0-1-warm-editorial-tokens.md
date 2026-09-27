---
title: 'Warm Editorial Refresh — Design Tokens & Shadow Rule'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md'
  - '_bmad-output/planning-artifacts/epics.md'
baseline_commit: '738acb9c2725f70cbf4dc69c51d80f42631e3b64'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 0.1's amended ACs (epics.md) require the Warm Editorial Refresh color palette, a new `xl` (20px) radius token for the Hero card, a new hero-surface token set, and a soft-shadow rule — superseding the original Muted Earth Editorial palette and its "no drop shadows" rule — but `app/globals.css` and `components/ui/button.tsx` still carry the old values.

**Approach:** Update `app/globals.css`'s `:root` block and `@theme inline` mappings to the new hex values (background/foreground/card/card-foreground/muted-foreground/border/input/ring/primary/primary-foreground/accent/accent-foreground) and add the four new `hero`/`hero-foreground`/`hero-muted-foreground`/`hero-accent` tokens plus their `@theme inline` `--color-hero*` mappings. Fix `--radius-xl` to a literal `20px` (was proportionally derived from `--radius`, per the file's own established sm/md/lg pattern) — this token is new, reserved for the Hero card (Story 4.1, not this story). Add a `--shadow-soft` token (`@theme inline`) so a `shadow-soft` Tailwind utility becomes available app-wide, and apply it to `components/ui/button.tsx`'s `default` (primary) button variant only — the one shared shadcn primitive this story owns. Other cards needing `shadow-soft` (entries-list, prompt-card, Recommendation card, Over-Target banner, Hero card) are each inline JSX owned by their own story (2.4, 4.1, 3.3, 3.5) and apply the class there, not here — this story only defines the token and updates the one shared primitive it controls.

**Always:** Preserve every existing token name/mapping not called out above (e.g. destructive, chart-*, sidebar-*, secondary, popover) exactly as-is — this story is a value/token-set change, never a structural one. Keep the fixed-value pattern for radius-sm/md/lg (not proportionally derived) and follow it for radius-xl too.

**Never:** Touch `.dark` mode tokens (light mode only, per EXPERIENCE.md Foundation) or any non-Button component file — those are the amended ACs' other owning stories' scope.

</frozen-after-approval>

## Implementation Notes

Applied the new color/hero tokens and the shadow-soft utility as planned. Blind Hunter caught a real cross-file collision: `--radius-xl` was already consumed by `components/ui/dialog.tsx`'s `DialogContent` (Tailwind's built-in `rounded-xl`), so overriding it to 20px would have silently reshaped every existing dialog — contradicting DESIGN.md's own "Dialog inherits shadcn defaults unchanged" claim. Fixed by reverting `--radius-xl` to its original value and introducing a dedicated `--radius-hero: 20px` token (`rounded-hero` utility) for Story 4.1 to consume instead. Also added `--shadow-soft-strong` per DESIGN.md's "Hero card carries a slightly more pronounced shadow" callout, which the original token set had no placeholder for.

## Review Triage Log

- **high** — `--radius-xl` override collided with `components/ui/dialog.tsx`'s existing use of Tailwind's `rounded-xl` (DialogContent), silently reshaping every dialog and contradicting DESIGN.md's "Dialog inherits shadcn defaults unchanged." Fixed: reverted `--radius-xl`, added a dedicated `--radius-hero` token.
- **medium** — `--radius-xl` (20px) inverted the radius scale against `--radius-2xl` (18px, `calc(var(--radius) * 1.8)`). Same fix as above resolves it (xl no longer overridden).
- **low** — Stale `:root` comment said the superseded palette was "below," but the old hex values were overwritten in place, not preserved further down the file. Fixed the comment wording.
- **low** — `DESIGN.md` had no placeholder token for the Hero card's "slightly more pronounced shadow" than other cards. Fixed: added `--shadow-soft-strong` for Story 4.1 to use.
- **low, rejected** — `--shadow-soft` hardcodes the RGB triple for `--foreground` instead of deriving it via CSS relative-color syntax. DESIGN.md's own mockups hardcode the same literal value; deriving it adds syntax complexity not requested by the spec, and foreground isn't expected to change without a full design pass that would revisit the shadow tint by hand anyway.
- **low, rejected** — New hero/shadow tokens have no `.dark` counterparts. Verified: no dark-mode toggle or theme provider exists anywhere in `app/` (`.dark` is an unreachable, unused shadcn boilerplate class) — EXPERIENCE.md's Foundation states "Light mode only for this build." Not a reachable gap.
- **low, rejected** — DESIGN.md's contrast rationale for `{colors.primary}`/`{colors.primary-foreground}` (3.71:1, justified as "comfortable for large/bold text") doesn't strictly hold at the button's actual 14px/medium-weight text. Real documentation imprecision, but NFR-8 explicitly disclaims any formal WCAG target for this prototype, and a font-size/weight change would ripple beyond this token-only story's scope.
- **low, rejected** — The new shadow doesn't tighten on the button's existing `active:` press-translate. Cosmetic refinement not specified by DESIGN.md; no user-facing harm.
