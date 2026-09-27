---
name: 'Calorie Tracker MVP'
description: 'Solo-use calorie tracking prototype — calm, editorial, notebook-like register. shadcn/ui on Next.js + Tailwind; this DESIGN.md specifies the brand-layer delta only.'
status: final
created: '2026-09-18'
updated: '2026-09-26'
colors:
  # Warm Editorial Refresh (2026-09-26) — palette adapted from a Vercel v0
  # concept the user brought in (see imports/vercel-v0-health-tracker-agent/),
  # harmonized onto this file's existing token schema. Supersedes the
  # original Muted Earth Editorial palette; see Colors section for the
  # per-token rationale and what carried over vs. changed.
  # All unlisted shadcn tokens (popover, popover-foreground, secondary, secondary-foreground) inherit shadcn defaults.
  background: '#F7F6F2'
  foreground: '#27302E'
  card: '#FFFFFF'
  card-foreground: '#27302E'
  muted-foreground: '#69736D'
  border: '#E5E3DB'
  input: '#E5E3DB'
  ring: '#C66C4D'
  primary: '#C66C4D'
  primary-foreground: '#FFFFFF'
  accent: '#6C876E'
  accent-foreground: '#FFFFFF'
  # destructive: NOT overridden — deliberately unused for the Over-Target state; see Do's and Don'ts.
  # Hero card — new component (2026-09-26), the Remaining Calorie Budget's
  # dark-card treatment. Distinct from primary/accent because it needs its
  # own foreground/accent pairing that reads on a dark background, not the
  # light-card pairings above.
  hero: '#273B35'
  hero-foreground: '#FFFFFF'
  hero-muted-foreground: '#A8BCB0'
  hero-accent: '#E8A17F'
typography:
  body:
    fontFamily: 'Inter'
    fontSize: '14px'
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: 'Inter'
    fontSize: '12px'
    fontWeight: '600'
    letterSpacing: '0.06em'
  display-number:
    fontFamily: 'Inter'
    fontSize: '52px'
    fontWeight: '700'
    lineHeight: '1'
  recommendation:
    fontFamily: 'Lora'
    fontSize: '17px'
    fontWeight: '400'
    fontStyle: 'italic'
    lineHeight: '1.35'
rounded:
  sm: '8px'
  md: '10px'
  lg: '12px'
  xl: '20px'
  full: '9999px'
  DEFAULT: '10px'
spacing:
  # shadcn / Tailwind default 4-based scale inherited as-is; no overrides.
components:
  hero-card:
    background: '{colors.hero}'
    foreground: '{colors.hero-foreground}'
    muted-foreground: '{colors.hero-muted-foreground}'
    accent: '{colors.hero-accent}'
    radius: '{rounded.xl}'
    shadow: 'soft'
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.sm}'
    border: 'none'
    shadow: 'soft'
  button-secondary:
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    radius: '{rounded.sm}'
    border: '{colors.border}'
  entries-list:
    background: '{colors.card}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    shadow: 'soft'
  recommendation-card:
    background: '{colors.card}'
    border: '{colors.accent}'
    radius: '{rounded.lg}'
    textStyle: '{typography.recommendation}'
    shadow: 'soft'
  over-target-banner:
    background: '{colors.card}'
    border: '{colors.primary}'
    foreground: '{colors.primary}'
    radius: '{rounded.md}'
    shadow: 'soft'
  prompt-card:
    background: '{colors.card}'
    border: '{colors.border}'
    radius: '{rounded.md}'
    shadow: 'soft'
  in-progress-indicator:
    background: '{colors.card}'
    foreground: '{colors.muted-foreground}'
    radius: '{rounded.md}'
  retry-prompt:
    background: '{colors.card}'
    border: '{colors.primary}'
    radius: '{rounded.md}'
  photo-only-notice:
    foreground: '{colors.muted-foreground}'
    fontSize: '12px'
---

## Brand & Style

A solo-use calorie tracker that should feel like a well-kept, quietly polished personal notebook — not a fitness dashboard, but with more visual confidence than a plain page of notes. The product premise: logging a meal and seeing where the day stands should feel calm and unhurried, even when the news is "you're over target" — the tone is a quiet, editorial register, never a gamified scoreboard. Depth now comes from soft, low-contrast shadows alongside thin borders (refreshed 2026-09-26 — previously borders and dashed rules only, no shadows at all), always subtle enough to read as a gentle lift rather than a hard-edged effect; the one moment of typographic warmth is an italic serif line for the day's Recommendation, set apart from the sans-serif chrome around it like a handwritten note in the margin.

This DESIGN.md specifies the brand-layer delta only. shadcn/ui's structural defaults (spacing scale, component anatomy, focus/hover mechanics) are inherited wholesale; only color, the two typefaces, and radius are overridden.

## Colors

Warm Editorial Refresh (2026-09-26) — a warm off-white base, a terracotta primary, a sage accent, and one new dark surface (the hero card) reserved for the Remaining Calorie Budget. Adapted from a Vercel v0 concept the user brought in (`imports/vercel-v0-health-tracker-agent/`), harmonizing its palette onto this file's existing token roles rather than adopting it wholesale — what each color *means* is unchanged from the original Muted Earth Editorial palette; only the specific hex values, plus the addition of the hero surface, are new. Supersedes the original palette below wherever the two disagree.

- **Background (`#F7F6F2`)** is a lighter, warmer off-white than the original palette. **Card (`#FFFFFF`)** is now pure white rather than a close-in-value warm tint — a higher-contrast, more "lifted" card that reads well against the new soft shadows (see Elevation & Depth). The original "cards are a subtle value-shift off the page" approach was specifically paired with the old no-shadow rule; that pairing no longer holds now that shadows carry the lift instead.
- **Foreground (`#27302E`, dark warm charcoal-green)** is body/heading text. **Muted foreground (`#69736D`)** is every secondary label — timestamps, eyebrows, entry calorie values.
- **Primary / Terracotta (`#C66C4D`)** is the one color that means "this needs your attention or action": primary buttons (Add Photo, Log a meal), focus rings, and — deliberately, unchanged from the original palette — the Over-Target banner. Over-target is still reported in this same calm terracotta tone, never in red. This is a direct expression of FR-18's "supportive, never shaming" requirement: going over target is not an alarm state.
- **Accent / Sage (`#6C876E`)** still means exactly one thing: a Recommendation is present. Used only for the Recommendation card's border and its eyebrow label. Never used for chrome, navigation, or any other state.
- **Border (`#E5E3DB`)** is the quiet structural line — entry-list dividers, card outlines, the dashed rule under the date.
- **Hero surface (`#273B35`, dark forest green)** is new: reserved exclusively for the Remaining Calorie Budget's hero card (see Components). Its own foreground (`#FFFFFF`), muted foreground (`#A8BCB0`, for the "/ N kcal target" and "% of target" captions), and accent (`#E8A17F`, the progress-bar fill) exist because the light-surface pairings above don't have enough contrast against a dark background — this is the only surface in the app not built on `{colors.background}`/`{colors.card}`.

**Measured contrast** (no formal WCAG level targeted for this prototype, per the logged accessibility decision — these numbers are informational, not a pass/fail gate): `{colors.foreground}` on `{colors.background}` is 12.54:1 (excellent). `{colors.primary}` on `{colors.card}` is 3.71:1 — comfortable for large/bold text (buttons) but under the small-text AA threshold, so don't set small critical text in raw `{colors.primary}` on `{colors.card}`. `{colors.hero-foreground}` on `{colors.hero}` is 11.91:1 (excellent); `{colors.hero-muted-foreground}` on `{colors.hero}` is 5.95:1 and `{colors.hero-accent}` on `{colors.hero}` is 5.58:1 — both comfortable for the hero card's own secondary text and progress bar. `{colors.muted-foreground}` on `{colors.card}` is 4.91:1 and on `{colors.background}` is 4.54:1 — lower than the foreground pairing but a genuine improvement over the original palette's equivalent (3.45:1 / 3.16:1), clearing the small-text AA threshold on both surfaces; keep this token to secondary/decorative labels exactly as designed, never to text a user must read to understand their state.

Avoid: red/alarm colors anywhere in the product (including shadcn's `destructive` token — unused by design), gradients, more than the two accent colors above plus the hero surface's own dedicated palette, hard-edged or high-opacity shadows (see Elevation & Depth).

## Typography

- **Inter** carries everything structural: body text, labels, eyebrows, navigation, and — deliberately — the large Remaining Calorie Budget number (`display-number`, 52px/700). The budget number is a fact to be read quickly, not a design flourish; it stays sans-serif and bold for legibility and weight.
- **Lora** appears in exactly one place: the Recommendation text, set via `{typography.recommendation}` — italic (`fontStyle: italic` in the token) at 17px/1.35 line-height. It reads like a suggestion penciled in the margin, not a system-generated string. This is the single serif moment in the whole product — it does not spread to headings, buttons, or any other copy.

## Layout & Spacing

shadcn / Tailwind's default 4-based spacing scale, inherited as-is — no product-specific overrides. Single-column, mobile-first layout throughout (this is a phone-in-hand product); the same column reflows to a centered, comfortably-margined column on desktop rather than introducing a multi-column dashboard layout at wider viewports. A dashed border-bottom rule (`{colors.border}`) separates the date/eyebrow header from body content on every primary screen — the one recurring structural motif.

## Elevation & Depth

Refreshed 2026-09-26 — soft shadows are now allowed, reversing the original "no drop shadows anywhere" rule. Every shadow stays low-opacity and generously blurred (matching the imported v0 concept's own restraint — nothing sharp, nothing that reads as a hard-edged panel or a Material-style elevation system). `{colors.border}` hairlines and dashed rules are still used alongside shadows, not replaced by them — the two now work together: borders define a card's edge precisely, shadows give it a gentle lift off the page. The hero card (see Components) carries a slightly more pronounced shadow than other cards, since it's the one deliberately "featured" surface on the Daily view; every other shadowed component uses the same soft treatment.

## Shapes

Soft but restrained: `{rounded.sm}` (8px) for buttons and inputs, `{rounded.md}` (10px) for the entries list and general cards, `{rounded.lg}` (12px) for the Recommendation card — its slightly larger radius signals "this is a featured element." `{rounded.xl}` (20px, added 2026-09-26) is reserved for the hero card alone — larger still, since it's the one surface on the Daily view meant to read as the primary focal point, not just "featured" alongside the Recommendation card. `{rounded.full}` reserved for status pills only, if any are introduced later.

## Components

Inherits shadcn defaults unchanged for: `Input`, `Dialog`, `Tabs`, `Avatar`, `Separator`, `Toast`. Brand-layer-overridden:

- **Hero card** (new, 2026-09-26) — `{colors.hero}` (dark forest green) background, `{colors.hero-foreground}` text, `{rounded.xl}`, soft shadow (slightly more pronounced than other cards — see Elevation & Depth). The Remaining Calorie Budget's new home, replacing the old plain-number-on-page-background treatment. Layout: the Remaining Calorie Budget number stays large and bold — still `{typography.display-number}`, still `{colors.hero-foreground}`, a fact to be read quickly, exactly as before — with a smaller "/ N kcal target" caption in `{colors.hero-muted-foreground}` beside it. Below the number, a horizontal progress bar: track in a low-opacity tint of `{colors.hero-foreground}`, fill in `{colors.hero-accent}`, representing the portion of the Daily Calorie Target consumed so far. Two caption lines below the bar, both in `{colors.hero-muted-foreground}`: the Remaining Calorie Budget restated in words (e.g. "N kcal remaining") and the percentage of target consumed. **Over-Target State** behaves differently in one respect only: the bar visually caps at 100% width (never overflows its track), and its fill color does not change — still `{colors.hero-accent}`, never a warning color, consistent with FR-12/FR-18's "no alarm treatment" rule. The Remaining Calorie Budget number itself still goes negative in place, exactly as today.
- **Button (primary)** — `{colors.primary}` fill, `{colors.primary-foreground}` text, `{rounded.sm}`, no border, soft shadow. Used for the single most-wanted action per screen (Add Photo, Log a meal).
- **Button (secondary)** — `{colors.card}` fill, `{colors.foreground}` text, `{colors.border}` outline, `{rounded.sm}`, no shadow (outlined buttons stay flat — shadow is reserved for the primary action so it still reads as the single most-wanted one). Used for the lower-emphasis alternative action (Add Text, Not now, Skip).
- **Entries list** — `{colors.card}` background, `{colors.border}` row dividers, `{rounded.md}`, soft shadow. No card-per-entry; entries are rows in one bordered container, keeping the page from feeling like a stack of dashboard cards.
- **Recommendation card** — `{colors.card}` background, `{colors.accent}` border (the only place accent appears as a border color), `{rounded.lg}`, soft shadow, body text in `{typography.recommendation}`.
- **Over-Target banner** — `{colors.card}` background, `{colors.primary}` border and text, `{rounded.md}`, soft shadow. Explicitly not shadcn's `destructive` styling.
- **Prompt card** — `{colors.card}` background, `{colors.border}` outline, `{rounded.md}`, soft shadow. The generic bordered container behind every First-login prompt question — same visual family as the Entries list, just holding a question + action pair instead of a data row.
- **In-progress indicator** — `{colors.card}` background, `{colors.muted-foreground}` label text, `{rounded.md}`, no shadow (a transient status element, not a persistent card — stays flat so it doesn't visually compete with the cards around it). Pairs a short label ("Estimating…") with a subtle motion cue (implementation detail, not a token) — never a bare spinner with no text.
- **Retry prompt** — same shape as Prompt card but with a `{colors.primary}` border, signaling "this needs a response from you" without using an alarm color.
- **Photo-only notice** — no card treatment at all: small (12px) `{colors.muted-foreground}` text, sitting quietly near the Add Photo action rather than boxed or bordered. It's ambient guidance, not a warning.

**Interactive primitives and focus rings.** The app's global `:focus-visible` rule (Story 0.2) lives in `@layer base`, and Tailwind's own layer order (`theme, base, components, utilities`) means it can never win against any element that also carries the `outline-none` utility — the reset every shadcn-derived interactive primitive in this codebase uses. Concretely: `Button`, `Input`, and `RadioGroupItem` each pair `outline-none` with their own `focus-visible:ring-*` classes, so they show a working clay ring; any new interactive primitive that copies the `outline-none` reset *without* also adding its own `focus-visible:ring-*` fallback will render with **no visible keyboard-focus indicator at all** — found and fixed once already for `DialogContent` (Epic 0 retrospective). Any future interactive component must supply its own `focus-visible:ring-*` (or equivalent) rather than relying on the global rule to reach it.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Use `{colors.primary}` (terracotta) for both primary actions and the Over-Target report | Use red, orange-alarm, or shadcn's `destructive` token for Over-Target |
| Reserve `{colors.accent}` (sage) for "a Recommendation exists" | Use sage for navigation, chrome, or unrelated positive states |
| Set Recommendation text in `{typography.recommendation}` (italic Lora) | Extend Lora to headings, buttons, or body copy |
| Use soft, low-opacity shadows alongside borders (2026-09-26) | Use hard-edged shadows, heavy elevation, or a Material-style layering system |
| Reserve `{colors.hero}` (dark forest green) for the Remaining Calorie Budget's hero card only | Use the hero surface for any other component, or introduce a second dark surface |
| Keep the entries list as one bordered container of rows | Turn each logged Entry into its own separate card |
