# Spine Pair Review — Calorie Tracker MVP

## Overall verdict

A well-inherited, consistently-applied spine pair — the brand model (calm/editorial, clay + sage, no shadows) and the behavior model (single-user, tap-first, plural recommendations per slot) both read as decided rather than drifted, and every FR/AD cross-reference checked resolves to something real. The misses cluster in two mechanical spots rather than being spread thin: four behaviorally-specified components never got a DESIGN.md visual row (though the source mockup already contains a ready-made pattern to lift for one of them), and both spines cite a `mockups/` path that doesn't exist at that location yet. Neither is expensive to close.

## 1. Flow coverage — strong

All 4 PRD journeys (first-login/breakfast, photo-logged lunch, text-logged snack, over-target evening) have a corresponding Key Flow with a named protagonist (Tausif), numbered steps, an explicit **Climax** beat, and a failure path or a reasoned statement that none applies.

### Findings
None.

## 2. Token completeness — adequate

Every color token is hex-valued and every `{path.to.token}` reference in both files resolves to a real frontmatter key — no broken token refs found.

### Findings
- **[medium]** The `recommendation` typography token (DESIGN.md frontmatter) has no machine-readable italic flag — only `fontFamily`/`fontSize`/`fontWeight`/`lineHeight`. A consumer extracting the YAML alone gets upright Lora, missing the one visual trait the prose repeatedly calls out as the role's defining signature (DESIGN.md Typography section, EXPERIENCE.md Component Patterns "Recommendation card" row). *Fix:* add an extra `fontStyle: italic` key to the token — the spec's "any subset" phrasing doesn't forbid it.
- **[low]** No numeric contrast ratio stated for `{colors.primary}` (`#A85C42` clay) text against `{colors.card}` (`#F7F4EE`) — the pairing used for the Over-Target banner's message (DESIGN.md Components; EXPERIENCE.md State Patterns "Over-Target" row), a legibility-load-bearing case since it's the one state explicitly designed to read as calm rather than alarming. No formal WCAG level was targeted for this prototype (a deliberate, logged decision), so this isn't a violation — but an unchecked pairing here risks quietly undermining the "calm, not alarming" intent if the ratio turns out low. *Fix:* a one-time contrast check, no token change implied unless it fails.

## 3. Component coverage — thin

DESIGN.md.Components and EXPERIENCE.md.Component Patterns agree on 3 of 7 named components (Entries list, Recommendation card, Over-Target banner) with real visual + behavioral rules on both sides.

### Findings
- **[high]** Four components have an EXPERIENCE.md behavioral row but no DESIGN.md visual row: **In-progress indicator**, **Retry prompt**, **Photo-only notice**, and **First-login prompt cards**. This isn't a from-scratch gap for all four — the muted-earth mockup that grounded the whole palette already contains a working `.prompt-card` treatment (bordered container, `{rounded.md}`-equivalent radius, `{colors.card}` background) that directly answers "First-login prompt cards" and could seed "Retry prompt" too, but it was never extracted into DESIGN.md.Components. *Fix:* add rows for all four; lift the prompt-card treatment from `.working/direction-muted-earth.html` for the first two rather than inventing fresh.
- **[medium]** DESIGN.md names the generic components "Button (primary)" / "Button (secondary)"; EXPERIENCE.md's Component Patterns table names the same underlying controls "Log buttons (Add Photo / Add Text)" and never states that Login/Register/Preferences/First-login buttons reuse DESIGN's Button components at all. A consumer has to infer the connection rather than read it. *Fix:* one sentence in EXPERIENCE.md's Component Patterns intro: "all buttons across every surface are DESIGN.md's Button (primary)/(secondary), scoped per-surface only in label and count."

## 4. State coverage — adequate

The states that carry the product's real differentiation — 2-slot vs. 1-slot vs. after-10pm vs. Over-Target on the Daily view, and the three First-login variants — are covered in real depth, each with a concrete treatment, not a placeholder.

### Findings
- **[medium]** No cold-load/skeleton state for the Daily view (what renders in the gap before today's budget/entries arrive from the server). Both example spines this rubric was checked against (Quill's "Cold open," Drift's "Cold app load") cover this explicitly; ours has no equivalent row.
- **[medium]** The Log Entry flow's only failure state is FR-4's insufficient-detail retry. A hard failure — the estimation call itself erroring out (network drop, the Gemini API failing) rather than returning an ambiguous-but-successful result — has no defined treatment, despite this being a real external dependency per `ARCHITECTURE-SPINE.md` AD-2.
- **[low]** Account/Preferences and Historical Trends have zero State Patterns rows between them — no save-confirmation or validation-error state for Preferences, no loading or "no data at all yet" state for Trends.

## 5. Visual reference coverage — thin

`.working/` holds 3 candidate direction files (`direction-warm-serif.html`, `direction-cool-minimal.html`, `direction-muted-earth.html`); none are promoted to `mockups/` yet, and per instruction that's not scored as a defect at this stage of Finalize.

### Findings
- **[high]** Both DESIGN.md (frontmatter comment) and EXPERIENCE.md (Information Architecture section) cite `mockups/direction-muted-earth.html` by that exact path, as if promotion has already happened. It hasn't — the file currently lives only at `.working/direction-muted-earth.html`. As written today, following either citation 404s. *Fix:* either update both citations to the `.working/` path now, or treat this as resolved automatically once the promotion step (later in Finalize) runs — but don't leave both spines pointing at a path that doesn't exist between now and then.

## 6. Bloat & overspecification — strong

No pixel-level specs duplicating what tokens already cover, no restatement of PRD personas/FRs, no prose where a table would do. EXPERIENCE.md consistently defers visual detail to DESIGN.md rather than re-describing it. Key Flow climax beats carry some narrative color, but at the same register as this skill's own shipped examples (Quill, Drift) — not overspecification.

### Findings
None.

## 7. Inheritance discipline — adequate

`sources` frontmatter resolves to real, existing files. Glossary terms (Entry, Meal, Snack/Beverage, Meal Slot, Daily Calorie Target, Remaining Calorie Budget, Recommendation, Dietary Preference, Over-Target State, Day) are used identically across both spines and match the PRD's Glossary exactly — no drift found.

### Findings
- **[medium]** Key Flows never cite their originating PRD journey by ID (e.g. "Flow 1 — First login of the day ... realizes UJ-1"). The PRD numbers its journeys UJ-1 through UJ-4 specifically so downstream docs can reference them; this spine's flows map cleanly 1:1 but never say so, leaving the connection to be inferred rather than read.
- **[medium]** Same component-naming mismatch as Component coverage finding above (Button primary/secondary vs. "Log buttons") — cross-referenced here as an inheritance-discipline issue, not re-detailed.

## 8. Shape fit — strong

DESIGN.md sections run in exact canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts). EXPERIENCE.md carries all eight required-default sections in the same order the shipped Drift example uses, plus both triggered sections (Responsive & Platform — genuinely multi-surface; Inspiration & Anti-patterns — genuinely has rejects to record) appropriately included. No invented sections, no dropped defaults.

### Findings
None.

## Mechanical notes
- DESIGN.md frontmatter: `spacing: {}` (an explicit empty mapping) followed by an indented comment line reads oddly next to the shipped examples' convention of `spacing:` (implicit null) plus a comment — purely cosmetic, doesn't affect parsing or resolution, but worth matching the convention for consistency.
- No broken `{path.to.token}` references found in either file — every reference checked resolves to a real frontmatter key.
- No Mermaid diagrams present in either file (not required by the DESIGN.md/EXPERIENCE.md spec; noted only for completeness).
