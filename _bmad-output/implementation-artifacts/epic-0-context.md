# Epic 0 Context: UX Foundation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Establish the global, feature-independent visual and interaction contracts — design tokens, typography, radius scale, elevation rule, and cross-cutting interaction/accessibility primitives — that every later screen inherits. This epic is built first, before any user-facing epic, so that Epic 1 onward can rely on a shared foundation rather than each screen defining its own colors, fonts, or interaction rules from scratch. It is not tied to any functional requirement; it exists purely to keep the product visually and behaviorally consistent end to end.

## Stories

- Story 0.1: Design Tokens & Visual Foundation
- Story 0.2: Cross-Cutting Interaction & Accessibility Primitives

## Requirements & Constraints

- Story 0.1 includes the project scaffold: Next.js 16.3.5 (App Router) on Node.js 24, TypeScript 7.0.2 (requires `experimental.useTypeScriptCli: true` in `next.config` — TS7 ships without the JS Compiler API, plain `next build` fails without this flag), Tailwind CSS 4.3.3, and shadcn/ui initialized as the component foundation. No project exists yet, and this must exist before any token can be configured. (Originally mis-assigned to Epic 1 Story 1.1 in planning; corrected here since Epic 0 builds first.)
- Color, typography, and radius tokens must be applied globally (as shadcn theme overrides) so later screens inherit them automatically instead of hardcoding their own values.
- Both required web fonts must be loaded and wired to their token roles before any screen consumes them.
- Depth/separation must never rely on drop shadows anywhere in the UI — shadcn's default shadow-on-hover must be explicitly overridden to render nothing.
- Every screen may have at most one primary action and one secondary action — never more than two competing actions on a single surface.
- No interaction anywhere may depend on a hover-only affordance (tap-first, mobile/desktop-web product).
- Every focusable element (buttons, inputs, links) must show a visible focus ring at visible contrast against the background on keyboard focus.
- List-based screens with bounded datasets (a single Day's entries, a 3-month trend window) must load their full set at once — no infinite scroll or pagination.
- The Log Entry flow must always be one screen, one action — never a multi-step wizard.
- No formal WCAG level is targeted for this single-user prototype, but a reasonable accessibility baseline applies (comfortable tap targets, labeled icon-only controls, visible form labels, visible focus states).

## Technical Decisions

**Color tokens (Muted Earth Editorial — shadcn theme overrides):**
- background `#EFEAE3`
- foreground `#3A342C`
- card `#F7F4EE`
- card-foreground `#3A342C`
- muted-foreground `#8C8272`
- border `#D9D1C2`
- input `#D9D1C2`
- ring `#A85C42`
- primary `#A85C42` (clay — the one color meaning "needs attention/action"; also used for the Over-Target report, deliberately not red)
- primary-foreground `#FBF3EC`
- accent `#7C8B6F` (sage — reserved exclusively for "a Recommendation is present"; never used for chrome/navigation)
- accent-foreground `#F7F4EE`
- All other shadcn tokens (popover, secondary, destructive) stay at shadcn defaults; `destructive` is deliberately never used anywhere in the product.

**Contrast notes (informational, no formal WCAG gate):** foreground-on-background is 10.28:1. primary-on-card is 4.48:1 — fine for large/bold text (budget number, buttons) but do not use raw primary for small critical text on card. muted-foreground-on-card is 3.45:1 — keep to secondary/decorative labels only (timestamps, eyebrows), never text a user must read to understand their state.

**Typography tokens** (load both web fonts, wire to roles):
- body: Inter, 14px/400, line-height 1.5
- label: Inter, 12px/600, letter-spacing 0.06em (uppercase tracking)
- display-number: Inter, 52px/700, line-height 1 (used for the Remaining Calorie Budget number — stays sans-serif/bold for legibility, not a design flourish)
- recommendation: Lora, 17px/400, italic, line-height 1.35 — the single serif moment in the product; must not spread to headings, buttons, or any other copy

**Radius scale:**
- sm 8px — buttons, inputs
- md 10px — entries list, general cards (prompt card, retry prompt, in-progress indicator, over-target banner)
- lg 12px — Recommendation card only (its larger radius is the one place shape itself signals "featured element")
- full 9999px — reserved for future status pills, not yet used

**Elevation:** no drop shadows anywhere; depth comes only from border hairlines, dashed rules, and the background/card value shift. This overrides shadcn's default shadow-on-hover.

**Spacing:** inherits shadcn/Tailwind's default 4-based scale as-is — no product-specific overrides.

## UX & Interaction Patterns

- Tap-first interaction model: no hover-only affordances anywhere (no hover state exists on mobile); every interactive element must be tap-legible on its own.
- At most one primary (`primary`-colored) action plus one secondary (card/outline) action per screen — never more than two competing actions.
- Focus states use the `ring` token (clay, `#A85C42`) at visible contrast against the background on every focusable element (buttons, inputs, links).
- No infinite scroll anywhere — the Entries list (single Day) and Historical Trends (3-month window) are both bounded datasets and load in full.
- Logging an Entry is always one screen, one action — never a multi-step wizard.
- Single-column, mobile-first layout; the same column reflows to a centered, comfortably-margined column on desktop rather than introducing a multi-column layout at wider viewports.
- A dashed border-bottom rule separates a date/eyebrow header from body content — the one recurring structural motif on primary screens.

## Cross-Story Dependencies

- Story 0.2's focus-ring rule depends on the `ring` color token established in Story 0.1.
- Every later epic (1–5) depends on this epic being complete: they inherit these tokens and interaction rules rather than defining their own, so Epic 0 must land before any user-facing screen work begins.
