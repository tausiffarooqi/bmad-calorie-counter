---
title: 'Entries List — Row-Card Spacing Fix'
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

**Problem:** User-reported: "there needs to be a little spacing between the meal logs as per the mocks." Story 2.4 originally implemented the Entries list as one shared bordered container with divider lines between rows (DESIGN.md's original "no card-per-entry" rule) — but every Warm Editorial Refresh mockup (`daily-view-refresh.html`) shows each Entry as its own separate bordered, shadowed, rounded row-card with an 8px gap between cards, no shared container or divider lines.

**Approach:** Change `entries-list.tsx`'s `<ul>` from a single `rounded-md border ... shadow-soft` container with `border-t` divider rows to a `flex flex-col gap-2` list of individually-styled `<li>` cards (each carrying its own `rounded-md border border-border bg-card shadow-soft`). Reversed DESIGN.md's original "one bordered container, not per-entry cards" Do/Don't rule to match — this is a direct, explicit user instruction overriding that prior decision, not a bug in the prior decision itself.

**Always:** Keep the outer `aria-live="polite"` wrapper's existing mount-timing behavior (Epic 2 retro action item) — only the inner list/row markup changes.

**Never:** Touch the icon/tint/meal-type-label treatment (Story 2.4's own prior scope, unaffected) or any other list in the app (Trends' bar chart, which was never a bordered-rows list to begin with).

</frozen-after-approval>

## Implementation Notes

Changed `entries-list.tsx`'s `<ul>` from a single shared bordered container with `border-t` divider rows to `flex flex-col gap-2` of individually-bordered/shadowed `<li>` cards, preserving the outer `aria-live="polite"` mount-timing behavior unchanged. Reversed DESIGN.md's original "one bordered container, not per-entry cards" Do/Don't rule and updated epics.md's Story 2.4 AC to match, per direct user instruction. Verified visually via `agent-browser` with both 2 entries and 4 stacked entries (seeded extra test data) — the review's flagged concern about stacked shadows looking muddy at scale was checked directly and found clean; cleaned up test data afterward.

## Review Triage Log

- This fix was reviewed in the same Blind Hunter pass as the button style fix (`spec-0-1-button-style-fix.md`) since both changes landed together; findings specific to entries-list markup:
- **low, rejected** — Concern that stacking multiple shadowed row-cards with only an 8px gap might look visually muddy or clip at scale. Checked directly: seeded 4 entries and screenshotted — shadows stay subtle and distinct, no muddiness or clipping observed.
- **low, rejected** — No test coverage for the row-card markup change. Consistent with this codebase's established convention (no React-component-rendering tests exist anywhere; only pure functions are tested).
- **low, rejected** — Implementation Notes was empty at review time. Filled in as part of this finalization pass (see above).
