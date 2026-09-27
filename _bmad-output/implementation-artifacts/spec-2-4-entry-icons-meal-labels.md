---
title: 'Entries List — Icon Tint & Meal-Type Label'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/mockups/daily-view-refresh.html'
baseline_commit: 'd86501787dd189cdd782f8a53e211798de559638'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 2.4's amended ACs (epics.md, UX-DR7) require each Entries-list row to show an icon in a tinted circle and a meal-type label (Breakfast/Lunch/Dinner for Meal-classified Entries, "Snack" for Snack/Beverage) above the description — but `app/entries-list.tsx` renders each row as plain description + calorie text only, and `GET /api/entries`'s response doesn't even return an Entry's `classification`.

**Approach:** Add `classification: row.classification` to `GET /api/entries`'s row mapping (`app/api/entries/route.ts`) and to the `Entry` interface (`hooks/use-daily-view.ts`) — the DB column already exists (Story 3.1), this just surfaces it. In `app/entries-list.tsx`, derive each row's icon/tint/label: Snack/Beverage entries always get the Cookie icon + neutral tint + "Snack" label, regardless of time. Meal-classified entries derive Breakfast/Lunch/Dinner from `new Date(entry.createdAt).getHours()` (the browser's local hour, computed at render time — mirrors the existing `entries-list.tsx`'s already-client-only nature, not a new SSR concern since this list only ever renders once `entries` has data, never during a bare initial paint) using the boundaries in epics.md's Story 2.4 AC: Breakfast 5–11, Lunch 11–16, Dinner 16–5 (next day) `[ASSUMPTION]`. Add 8 new CSS custom properties to `app/globals.css` for the 4 tint pairs (peach/sage/lavender/neutral — exact hex values from `mockups/daily-view-refresh.html`'s own `:root` block) plus their `@theme inline` mappings, enabling `bg-tint-*`/`text-tint-*` Tailwind utilities.

**Always:** Icon size/shape/radius matches the mockup exactly (34px circle, 10px radius) — a new small `EntryIcon` sub-component, not inlined per-row.

**Never:** Change the "one bordered container of rows, never per-entry cards" structure (DESIGN.md), or touch the DB schema (classification already exists).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Meal at 7am | classification=meal, createdAt hour=7 | Breakfast label, Coffee icon, peach tint | N/A |
| Meal at 1pm | classification=meal, createdAt hour=13 | Lunch label, Utensils icon, sage tint | N/A |
| Meal at 8pm | classification=meal, createdAt hour=20 | Dinner label, Utensils icon, lavender tint | N/A |
| Meal at 2am | classification=meal, createdAt hour=2 | Dinner label (16–5 wraps past midnight), Utensils icon, lavender tint | N/A |
| Snack/Beverage, any hour | classification=snack_beverage | "Snack" label, Cookie icon, neutral tint — never time-derived | N/A |

</frozen-after-approval>

## Implementation Notes

Added `classification` to `GET /api/entries`'s row mapping, a new pure `getMealTypeLabel()` (unit-tested, 9 cases), and an `EntryIcon` sub-component in `app/entries-list.tsx` mapping label → lucide icon + tint. Added 4 new tint token pairs to `globals.css`, values from the mockup's own `:root` block (never promoted to DESIGN.md — same "cite the mockup directly" precedent EXPERIENCE.md already uses for the trend chart). Verified end-to-end via `agent-browser`: both existing Snack-classified entries (apple, banana) render Cookie icon + neutral tint + "SNACK" label correctly; logged a fresh "grilled chicken breast..." text entry in the evening, confirmed it classified as Meal and rendered "DINNER" with the lavender-tinted Utensils icon exactly as the mockup shows — then deleted the test entry. Blind Hunter's real catch: `classification` had been typed as a bare `string` rather than reusing the existing `Classification` union already enforced end-to-end by `createEntry()` — narrowed both `Entry.classification` and `getMealTypeLabel()`'s parameter to `Classification`. Also logged the still-open `[ASSUMPTION]` status of the Breakfast/Lunch/Dinner hour boundaries (already flagged in epics.md/the mockup, but with no tracked follow-up) to `deferred-work.md`.

## Review Triage Log

- **medium** — `Entry.classification` and `getMealTypeLabel()`'s parameter were typed as a bare `string`, discarding the `Classification` union (`"meal" | "snack_beverage"`) already defined in `lib/constants.ts` and enforced by `createEntry()`'s own typed parameter everywhere a row is written. Fixed: narrowed both to `Classification` — unlike `dietary_preference` (genuinely free-form, writable via an untyped API path before Story 1.3's own validation), this field's write path already guarantees the literal union, so the wider type gave up real compile-time protection for no benefit.
- **low** — The Breakfast/Lunch/Dinner hour boundaries are an explicitly unconfirmed `[ASSUMPTION]` (per epics.md's own Story 2.4 AC and the mockup's header comment) with no tracked follow-up — `deferred-work.md` had no entry for it. Fixed: logged, including the related observation that these boundaries deliberately don't align with the Recommendation engine's own 5am-12pm/12pm-10pm Meal Slot windows (an 11am entry shows "Lunch" while Recommendation cards still treat 11am as pre-noon).
- **low, rejected** — No test coverage for an unrecognized/malformed `classification` value falling through to a Breakfast/Lunch/Dinner label. Superseded by the type-narrowing fix above — `Classification`'s literal union now makes an invalid value a compile-time impossibility for any caller within this codebase, the same level of coverage every other `Classification`-typed function in this codebase relies on (no runtime malformed-value tests exist for `entry-classifier.ts` either).
- **low, rejected** — `new Date(entry.createdAt).getHours()` uses the runtime's implicit local timezone instead of this codebase's usual explicit-`tz`-string convention (`day-boundary.ts`, `recommendation-engine.ts`). That convention exists specifically because those functions run *server-side*, where the implicit local timezone would be the server's, not the user's. `entries-list.tsx` runs client-side only (confirmed: this component never renders during the bare initial paint) — the browser's own implicit local timezone genuinely *is* the user's timezone here, the same one `getClientTimeZone()` would report, so there's no actual timezone-correctness risk, only a stylistic departure from a convention that doesn't apply to this call site.
- **low, rejected** — The meal-type label's boundaries (5/11/16) don't align with the Recommendation engine's own Meal Slot windows (5am-12pm/12pm-10pm), producing an 11am entry labeled "Lunch" alongside Recommendation cards still treating 11am as pre-noon. Real, but this is the exact, already-documented tension epics.md's own AC calls out as "deliberately distinct" from FR-10/FR-11 — not something this story should silently resolve on its own; tracked via the deferred-work.md entry above instead.
- **low, rejected** — New tint CSS variables (`--tint-peach-*`, etc.) have no `.dark` counterparts. Same disposition as Story 0.1's identical, already-accepted finding for the hero tokens — no dark-mode toggle exists anywhere in this app (EXPERIENCE.md: "Light mode only for this build").
- **low, rejected** — The meal-type label uses a hand-rolled `text-[10px] font-bold uppercase tracking-wide` instead of the app's existing `text-label` typography token (12px/600/0.06em, used for page-level eyebrows like "REMAINING CALORIES TODAY"). Deliberate: the mockup specifies a distinct, denser 10px/700 variant appropriate to this component's tighter list-row context (a per-entry micro-label sitting directly above a description line, not a standalone section eyebrow) — matching the mockup exactly here, per this spec's own Boundaries, takes precedence over reusing an existing token built for a different semantic role.
- **false** — Icon-foreground-on-tint-background contrast (peach 3.13:1, sage 3.32:1) claimed to be "right at the WCAG floor" with too little margin. Disproven: WCAG 1.4.11 (Non-text Contrast) sets a 3:1 minimum for graphical objects specifically (not the 4.5:1 text threshold, which doesn't apply to icons) — all four tints clear it, and the icon isn't the sole conveyor of meaning anyway (the adjacent text label carries the same information at full foreground contrast).
