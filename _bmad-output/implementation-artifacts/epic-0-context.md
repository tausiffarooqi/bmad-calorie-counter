# Epic 0 Context: UX Foundation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

This epic establishes the global, feature-independent visual and interaction contracts — design tokens, typography, spacing/radius rules, and cross-cutting accessibility/interaction primitives — that every later screen inherits. It exists so Epic 1 onward can rely on a shared foundation instead of each screen defining its own colors, fonts, or interaction rules from scratch. It is not tied to any functional requirement; it satisfies UX design requirements only (UX-DR1–4, UX-DR25, UX-DR27, UX-DR28).

## Stories

- Story 0.1: Design Tokens & Visual Foundation (done — project scaffold, color/typography/radius tokens, no-drop-shadow rule)
- Story 0.2: Cross-Cutting Interaction & Accessibility Primitives (in progress — global focus-visible ring landed; one-primary/one-secondary action rule, no infinite scroll, no multi-step logging wizard remain conventions for later epics to follow)

## Requirements & Constraints

- Every screen must inherit shared color, typography, and radius tokens rather than hardcoding its own styling.
- Depth/separation must be expressed only through border hairlines, dashed rules, and background/card value shifts — no drop shadows anywhere, including on hover (shadcn's default shadow-on-hover must be explicitly suppressed).
- Any surface with interactive controls may have at most one primary action and one secondary action — never more than two competing actions on a single surface.
- No interaction anywhere may depend on a hover-only affordance to be discoverable or usable (tap-first model for mobile/desktop-web).
- Every focusable element (buttons, inputs, links) must show a visible focus ring at visible contrast against the background when it receives keyboard focus.
- Bounded-dataset list screens (Entries list, Historical Trends) must load their full set at once — no infinite scroll or pagination.
- Logging an Entry must always be one screen, one action — never a multi-step wizard.
- No formal WCAG level is targeted (single-user prototype), but a reasonable accessibility baseline applies: comfortable tap targets, labeled icon-only controls, visible form labels, visible focus states, screen-reader-readable in-progress state.

## Technical Decisions

- Stack (established in Story 0.1): Next.js 16.3.5 (App Router) on Node.js 24, Tailwind CSS 4.3.3, shadcn/ui initialized as the component foundation. TypeScript is pinned at **6.0.3**, downgraded from the architecture's original 7.0.2 during Story 0.1 implementation because `typescript-eslint` does not yet support TS7 — there is no `useTypeScriptCli` flag in this build; that flag and the TS7 upgrade are deferred until `typescript-eslint` adds support.
- Design tokens are implemented as shadcn theme overrides, not a from-scratch design system — shadcn's structural defaults (spacing scale, component anatomy, focus/hover mechanics) are inherited wholesale; only color, the two typefaces, and radius are overridden.
- Color tokens (Muted Earth Editorial): background `#EFEAE3`, foreground `#3A342C`, card `#F7F4EE`, card-foreground `#3A342C`, muted-foreground `#8C8272`, border `#D9D1C2`, input `#D9D1C2`, ring `#A85C42`, primary `#A85C42`, primary-foreground `#FBF3EC`, accent `#7C8B6F`, accent-foreground `#F7F4EE`. All other shadcn tokens (popover, secondary, destructive) stay at shadcn defaults — `destructive` is deliberately never invoked anywhere in the product.
- Typography tokens: Inter for body (14px/400), label (12px/600, uppercase tracking), and display-number (52px/700); Lora italic reserved exclusively for the `recommendation` role (17px/400/1.35 line-height, italic) — it must never spread to headings, buttons, or other body copy.
- Radius scale: sm 8px (buttons, inputs), md 10px (entries list, general cards, prompt/retry cards, in-progress indicator, over-target banner), lg 12px (Recommendation card only — its larger radius is the one place shape signals "featured element"), full 9999px (reserved for future status pills, unused for now).
- Measured contrast (informational only, no pass/fail gate for this prototype): foreground-on-background 10.28:1 (excellent); primary-on-card 4.48:1 (fine for large/bold text like the budget number and buttons, but under the small-text AA threshold — never set small critical text in raw primary-on-card); muted-foreground-on-card 3.45:1; muted-foreground-on-background 3.16:1 — both muted-foreground pairings are noticeably lower than the foreground pairing, so keep that token to secondary/decorative labels (timestamps, eyebrows) only, on either background, never to text a user must read to understand their state.

## UX & Interaction Patterns

- Tap-first interaction model throughout — no hover-only affordances anywhere (there is no reliable hover state on mobile), no required keyboard shortcuts.
- Focus rings use the clay `ring` token and must be visibly distinguishable against the background on every focusable element.
- Entries list and Historical Trends are both explicitly bounded datasets (single Day / 3-month window) — load in full, never paginate or infinite-scroll.
- The Log Entry flow is one screen with one action (photo or text, not both combined) — never a multi-step wizard, regardless of how later epics extend it.

## Cross-Story Dependencies

- Story 0.2 depends on Story 0.1's token foundation being in place first — specifically the `ring` (clay) token used for visible focus states.
- Every later epic (1 through 5) depends on both Epic 0 stories being complete before building screens: they inherit tokens (0.1) and interaction/accessibility rules (0.2) rather than each defining their own.
