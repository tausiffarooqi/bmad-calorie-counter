---
name: 'Calorie Tracker MVP'
description: 'Solo-use calorie tracking prototype — calm, editorial, notebook-like register. shadcn/ui on Next.js + Tailwind; this DESIGN.md specifies the brand-layer delta only.'
status: final
created: '2026-09-18'
updated: '2026-09-19'
colors:
  # Muted Earth Editorial — chosen from 3 rendered directions (see mockups/daily-view.html).
  # All unlisted shadcn tokens (popover, popover-foreground, secondary, secondary-foreground) inherit shadcn defaults.
  background: '#EFEAE3'
  foreground: '#3A342C'
  card: '#F7F4EE'
  card-foreground: '#3A342C'
  muted-foreground: '#8C8272'
  border: '#D9D1C2'
  input: '#D9D1C2'
  ring: '#A85C42'
  primary: '#A85C42'
  primary-foreground: '#FBF3EC'
  accent: '#7C8B6F'
  accent-foreground: '#F7F4EE'
  # destructive: NOT overridden — deliberately unused for the Over-Target state; see Do's and Don'ts.
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
  full: '9999px'
  DEFAULT: '10px'
spacing:
  # shadcn / Tailwind default 4-based scale inherited as-is; no overrides.
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.sm}'
    border: 'none'
  button-secondary:
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    radius: '{rounded.sm}'
    border: '{colors.border}'
  entries-list:
    background: '{colors.card}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  recommendation-card:
    background: '{colors.card}'
    border: '{colors.accent}'
    radius: '{rounded.lg}'
    textStyle: '{typography.recommendation}'
  over-target-banner:
    background: '{colors.card}'
    border: '{colors.primary}'
    foreground: '{colors.primary}'
    radius: '{rounded.md}'
  prompt-card:
    background: '{colors.card}'
    border: '{colors.border}'
    radius: '{rounded.md}'
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

A solo-use calorie tracker that should feel like a well-kept personal notebook, not a fitness dashboard. The product premise: logging a meal and seeing where the day stands should feel calm and unhurried, even when the news is "you're over target" — the tone is a quiet, editorial register, never a gamified scoreboard. Depth comes from thin borders and dashed rules, never drop shadows; the one moment of typographic warmth is an italic serif line for the day's Recommendation, set apart from the sans-serif chrome around it like a handwritten note in the margin.

This DESIGN.md specifies the brand-layer delta only. shadcn/ui's structural defaults (spacing scale, component anatomy, focus/hover mechanics) are inherited wholesale; only color, the two typefaces, and radius are overridden.

## Colors

Muted Earth Editorial — warm greige base with two accent colors, nothing else.

- **Background (`#EFEAE3`)** and **Card (`#F7F4EE`)** are both warm, close in value — cards read as a subtle lift off the page, not a hard-edged panel. This is the "paper" of the notebook.
- **Foreground (`#3A342C`, warm charcoal)** is body/heading text. **Muted foreground (`#8C8272`, taupe)** is every secondary label — timestamps, eyebrows, entry calorie values.
- **Primary / Clay (`#A85C42`)** is the one color that means "this needs your attention or action": the Remaining Calorie Budget number, primary buttons (Add Photo, Log a meal), focus rings, and — deliberately — the Over-Target banner. Over-target is reported in the same calm clay tone as everything else, never in red. This is a direct expression of FR-18's "supportive, never shaming" requirement: going over target is not an alarm state.
- **Accent / Sage (`#7C8B6F`)** means exactly one thing: a Recommendation is present. Used only for the Recommendation card's border and its eyebrow label. Never used for chrome, navigation, or any other state.
- **Border (`#D9D1C2`)** is the quiet structural line — entry-list dividers, card outlines, the dashed rule under the date.

**Measured contrast** (no formal WCAG level targeted for this prototype, per the logged accessibility decision — these numbers are informational, not a pass/fail gate): `{colors.foreground}` on `{colors.background}` is 10.28:1 (excellent). `{colors.primary}` on `{colors.card}` is 4.48:1 — passes comfortably for large/bold text (the budget number, buttons) but sits just under the small-text AA threshold, so don't set small critical text in raw `{colors.primary}` on `{colors.card}`. `{colors.muted-foreground}` on `{colors.card}` is 3.45:1 — noticeably lower; keep this pairing to secondary/decorative labels (timestamps, eyebrows) exactly as designed, never to text a user must read to understand their state.

Avoid: red/alarm colors anywhere in the product (including shadcn's `destructive` token — unused by design), gradients, drop shadows, more than the two accent colors above.

## Typography

- **Inter** carries everything structural: body text, labels, eyebrows, navigation, and — deliberately — the large Remaining Calorie Budget number (`display-number`, 52px/700). The budget number is a fact to be read quickly, not a design flourish; it stays sans-serif and bold for legibility and weight.
- **Lora** appears in exactly one place: the Recommendation text, set via `{typography.recommendation}` — italic (`fontStyle: italic` in the token) at 17px/1.35 line-height. It reads like a suggestion penciled in the margin, not a system-generated string. This is the single serif moment in the whole product — it does not spread to headings, buttons, or any other copy.

## Layout & Spacing

shadcn / Tailwind's default 4-based spacing scale, inherited as-is — no product-specific overrides. Single-column, mobile-first layout throughout (this is a phone-in-hand product); the same column reflows to a centered, comfortably-margined column on desktop rather than introducing a multi-column dashboard layout at wider viewports. A dashed border-bottom rule (`{colors.border}`) separates the date/eyebrow header from body content on every primary screen — the one recurring structural motif.

## Elevation & Depth

No drop shadows anywhere. Depth and separation come entirely from `{colors.border}` hairlines, dashed rules, and the subtle value shift between `{colors.background}` and `{colors.card}`. This is a deliberate rejection of shadcn's default shadow-on-hover treatment — it reads as flatter, quieter, more paper-like.

## Shapes

Soft but restrained: `{rounded.sm}` (8px) for buttons and inputs, `{rounded.md}` (10px) for the entries list and general cards, `{rounded.lg}` (12px) for the Recommendation card — its slightly larger radius is the one place shape itself signals "this is the featured element." `{rounded.full}` reserved for status pills only, if any are introduced later.

## Components

Inherits shadcn defaults unchanged for: `Input`, `Dialog`, `Tabs`, `Avatar`, `Separator`, `Toast`. Brand-layer-overridden:

- **Button (primary)** — `{colors.primary}` fill, `{colors.primary-foreground}` text, `{rounded.sm}`, no border. Used for the single most-wanted action per screen (Add Photo, Log a meal).
- **Button (secondary)** — `{colors.card}` fill, `{colors.foreground}` text, `{colors.border}` outline, `{rounded.sm}`. Used for the lower-emphasis alternative action (Add Text, Not now, Skip).
- **Entries list** — `{colors.card}` background, `{colors.border}` row dividers, `{rounded.md}`. No card-per-entry; entries are rows in one bordered container, keeping the page from feeling like a stack of dashboard cards.
- **Recommendation card** — `{colors.card}` background, `{colors.accent}` border (the only place accent appears as a border color), `{rounded.lg}`, body text in `{typography.recommendation}`.
- **Over-Target banner** — `{colors.card}` background, `{colors.primary}` border and text, `{rounded.md}`. Explicitly not shadcn's `destructive` styling.
- **Prompt card** — `{colors.card}` background, `{colors.border}` outline, `{rounded.md}`. The generic bordered container behind every First-login prompt question — same visual family as the Entries list, just holding a question + action pair instead of a data row.
- **In-progress indicator** — `{colors.card}` background, `{colors.muted-foreground}` label text, `{rounded.md}`. Pairs a short label ("Estimating…") with a subtle motion cue (implementation detail, not a token) — never a bare spinner with no text.
- **Retry prompt** — same shape as Prompt card but with a `{colors.primary}` border, signaling "this needs a response from you" without using an alarm color.
- **Photo-only notice** — no card treatment at all: small (12px) `{colors.muted-foreground}` text, sitting quietly near the Add Photo action rather than boxed or bordered. It's ambient guidance, not a warning.

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Use `{colors.primary}` (clay) for both primary actions and the Over-Target report | Use red, orange-alarm, or shadcn's `destructive` token for Over-Target |
| Reserve `{colors.accent}` (sage) for "a Recommendation exists" | Use sage for navigation, chrome, or unrelated positive states |
| Set Recommendation text in `{typography.recommendation}` (italic Lora) | Extend Lora to headings, buttons, or body copy |
| Build depth with borders and dashed rules | Add drop shadows or elevation layers |
| Keep the entries list as one bordered container of rows | Turn each logged Entry into its own separate card |
