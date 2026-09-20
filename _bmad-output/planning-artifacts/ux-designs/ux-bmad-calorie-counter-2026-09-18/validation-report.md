# Validation Report — Calorie Tracker MVP

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/EXPERIENCE.md`
- **Run at:** 2026-09-18T00:00:00

## Overall verdict

A well-inherited, consistently-applied spine pair — the brand model (calm/editorial, clay + sage, no shadows) and the behavior model (single-user, tap-first, plural recommendations per slot) both read as decided rather than drifted, and every FR/AD cross-reference checked resolves to something real. The misses clustered in two mechanical spots rather than being spread thin: four behaviorally-specified components had no DESIGN.md visual row, and both spines cited a `mockups/` path that didn't exist yet.

**All 9 findings below (2 high, 5 medium, 2 low) were fixed in this session** immediately after this review ran. This report reflects the review as originally run, before those fixes — see the `Fixed` marker on each finding.

## Category verdicts

- Flow coverage — strong
- Token completeness — adequate
- Component coverage — thin
- State coverage — adequate
- Visual reference coverage — thin
- Bloat & overspecification — strong
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

### High (2)

**[Component coverage]** — Four components had no DESIGN.md visual row (DESIGN.md.Components) — **Fixed**
In-progress indicator, Retry prompt, Photo-only notice, and First-login prompt cards each had an EXPERIENCE.md behavioral row but nothing on the visual side; the muted-earth mockup already contained a working `.prompt-card` treatment answering two of these directly.
Fix: added all four rows to DESIGN.md, lifting the prompt-card treatment from the mockup.

**[Visual reference coverage]** — Both spines cited a `mockups/` path that didn't exist yet (DESIGN.md frontmatter comment; EXPERIENCE.md Information Architecture) — **Fixed**
Both files cited `mockups/direction-muted-earth.html` as if promotion had already happened; following either citation 404'd.
Fix: promoted the chosen direction to `mockups/daily-view.html` and corrected both citations.

### Medium (5)

**[Token completeness]** — Recommendation typography token has no machine-readable italic flag (DESIGN.md Typography) — **Fixed**
Fix: added `fontStyle: italic` to the `recommendation` token.

**[Component coverage]** — Button naming mismatch between spines (DESIGN.md.Components; EXPERIENCE.md Component Patterns) — **Fixed**
Fix: added a sentence to EXPERIENCE.md's Component Patterns intro stating every button inherits from DESIGN.md's two Button components.

**[State coverage]** — No cold-load/skeleton state for the Daily view (EXPERIENCE.md State Patterns) — **Fixed**
Fix: added a Cold load row.

**[State coverage]** — No hard-failure state for the estimation call itself erroring (EXPERIENCE.md State Patterns) — **Fixed**
Fix: added a distinct Hard estimation failure row, reusing the retry-prompt treatment with different copy.

**[Inheritance discipline]** — Key Flows never cited their originating PRD journey by ID (EXPERIENCE.md Key Flows) — **Fixed**
Fix: added "realizes UJ-N" to each Key Flow heading.

### Low (2)

**[Token completeness]** — No stated contrast ratio for primary-on-card (DESIGN.md Colors) — **Fixed**
Fix: measured and documented primary-on-card (4.48:1), foreground-on-background (10.28:1), muted-foreground-on-card (3.45:1), with usage guidance.

**[State coverage]** — No State Patterns rows for Account/Preferences or Historical Trends (EXPERIENCE.md State Patterns) — **Fixed**
Fix: added Preferences saved, Preferences validation error, and Trends no-Entries-at-all rows.

## Mechanical notes

- **Fixed:** `spacing: {}` frontmatter convention mismatch — changed to implicit null + comment, matching shipped examples.
- No broken `{path.to.token}` references found in either file.
- No Mermaid diagrams present in either file — not required by spec.

## Reviewer files

- `review-rubric.md`
