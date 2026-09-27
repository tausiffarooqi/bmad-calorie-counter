---
title: 'Preferences — Save Button Color & Dietary Preference Spacing'
type: 'bugfix'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
baseline_commit: '6a83508f39d63e254447e71f37938f76211aa758'
---

<!-- Sibling Story 1.3 specs, for navigation (review finding: three specs
     share this prefix with no cross-reference):
     - spec-1-3-manage-daily-calorie-target-dietary-preference.md — the
       original Story 1.3 build (fields, validation, per-field-save pattern)
     - spec-1-3-preferences-look-and-feel.md — card shadow/radius + page
       top-alignment
     - this file — Save button color + Dietary Preference spacing -->


<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Direct user request: add a bit of padding between the Dietary Preference radio group and its Save button below it (currently sharing the same tight `gap-1.5` as the label-to-radio-group gap above it), and — if quick — make all three per-field Save buttons on this page the same color as the Login screen's primary "Log in" button.

**Approach:** Add `mt-2` to the Dietary Preference field's Save button for extra top spacing beyond the wrapper's own gap. Remove `variant="outline"` from all three Save buttons (Name, Daily Calorie Target, Dietary Preference) in `preferences-form.tsx`, falling back to the `Button` component's default (primary) variant — the same one the Login screen's submit button already uses, no new styling introduced.

**Always:** Keep every other visual/behavioral aspect of these three fields unchanged — same per-field-save pattern, same validation, same inline confirmation copy.

**Never:** Touch Login/Register's own submit buttons (already primary) or any other screen's Save/submit buttons.

</frozen-after-approval>

## Implementation Notes

Removed `variant="outline"` from all three Save buttons (falls back to the shared Button's default/primary variant) and added `mt-2` to the Dietary Preference field's Save button. Verified visually via `agent-browser`: all three buttons now render filled/terracotta with the tinted shadow, matching the Login screen's own button exactly, and there's clearly more breathing room before the final Save button — re-verified again after the review-driven refinements below, pixel-identical. Blind Hunter's most important catch: this change gives Preferences three simultaneous primary buttons, directly contradicting UX-DR27's "at most one primary + one secondary action per screen" rule with no documented exception anywhere — fixed by explicitly recording this as a deliberate, narrow exception (each Save button acts on its own independent field, not as competing page-level CTAs) in DESIGN.md, epics.md's UX-DR27, and the now-superseded mockup.

## Review Triage Log

- **medium** — This change gives Preferences three simultaneous primary/filled buttons on one screen, directly contradicting UX-DR27's "at most one primary + one secondary action per screen" rule and DESIGN.md's Button (secondary) rationale ("shadow reserved for the primary action so it still reads as the single most-wanted one") — recorded nowhere as an intentional exception. Fixed: added an explicit exception note to both UX-DR27 (epics.md) and DESIGN.md's Button (primary)/(secondary) entries, explaining why three independent per-field Saves don't create the "which one is most-wanted" ambiguity the rule guards against.
- **medium** — The approved mockup (`preferences-refresh.html`) still shows the original muted `.btn-save` styling with no annotation that it's now superseded, even though epics.md's own AC says the code "supersedes" it — inconsistent with this project's established convention of flagging stale/superseded mockup content. Fixed: added a `SUPERSEDED` note to the mockup's own header comment, pointing to DESIGN.md as authoritative.
- **low** — `DailyCalorieTargetField`'s Save button had `variant="outline"` removed with no comment, unlike the other two sites, leaving no signal it was intentional. Fixed: added a short comment pointing to `NameField`'s fuller rationale.
- **low** — The variant-change rationale was restated near-verbatim in two separate comment blocks (`NameField`, `DietaryPreferenceField`) — the same duplicated-rationale pattern this project's own prior review already flagged and fixed once. Fixed: consolidated the full rationale onto `NameField`'s comment (first occurrence), with the other two sites now pointing back to it.
- **low** — The Login screen's own submit button (the explicit color-parity target) sets `aria-busy={submitting}`; none of the three Preferences Save buttons did, despite each having its own `submitting` state and busy label — a gap in matching Login's actual pattern, not just its color. Fixed: added `aria-busy` to all three.
- **low, rejected** — Three spec files share the `spec-1-3-` prefix with no cross-reference, making it hard to tell which governs what. Addressed with a lightweight navigation comment in this (the newest) spec rather than retroactively editing the other two already-`done` specs' content.
- **low, rejected** — This spec's own Implementation Notes/Review Triage Log were empty at review time, and `status` was still `in-progress`. Filled in as part of this same finalization pass — not a separate action.
- **low, rejected** — No test coverage for the button variant/aria-busy/spacing changes. Consistent with this codebase's established convention — no component-rendering tests exist anywhere in this project.
- **N/A (noted, no action)** — The reviewer flagged that this file's own inline comments contain detailed self-justifying rationale ("user request", dated citations), which superficially resembles a prompt-injection pattern, but correctly noted nothing in the diff actually instructed it to do anything and took no action. This matches the established comment style throughout this codebase (extensive dated rationale comments are the norm in every file touched this session) — not a defect.
