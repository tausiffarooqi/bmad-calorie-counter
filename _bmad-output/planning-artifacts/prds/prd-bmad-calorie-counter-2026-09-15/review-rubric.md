# PRD Quality Review — Calorie Tracker MVP

## Overall verdict
This is a strong hobby/solo-stakes PRD: decisions are stated as decisions, trade-offs are named honestly (including the just-softened SM-1), and nearly every FR carries a testable consequence. The two edits made for this finalize pass (SM-1/SM-C1 softened to a soft target, Open Question 8.1 marked resolved-and-cited) read cleanly and integrate without leaving stale language behind in `prd.md`. The one real defect is a broken cross-reference (FR-21's note points to a "Constraints" section that doesn't exist), and `addendum.md` has not been updated to match the PRD's new soft-target framing or the architecture's actual chosen model, so the two documents now disagree on details a reader would reasonably expect to line up.

## Decision-readiness — strong
Decisions are stated plainly, not hedged into "considerations": FR-4's retry rule, FR-12's explicit precedence over FR-10/FR-11, and the newly-softened SM-1 ("A soft goal, not a hard requirement — real-world vision-model latency can exceed it, and that's acceptable...", §7) all name the trade-off and what's given up, rather than smoothing it to neutral. Open Question 8.1 is genuinely resolved (not a rhetorical question), with a citation to where the decision actually lives (§8, architecture spine AD-2). The two `[NOTE FOR PM]` callouts (§4.1 accuracy honesty, §4.6 data-sensitivity) sit at real tensions, not safe checkpoints.

### Findings
*(none)*

## Substance over theater — strong
No persona bloat — no personas at all, appropriate for a single-user prototype. The Vision (§1) is specific to this product's actual founder story (a slice of a larger planned app, shipped fast to demonstrate speed), not swappable boilerplate. NFR language is product-specific throughout (§4.1, §4.2 NFRs cite exact time-of-day windows and the SM-1 relationship, not "must be scalable/secure"). No claimed novelty dressed up as innovation.

### Findings
*(none)*

## Strategic coherence — adequate
Clear thesis (remove guesswork, answer in seconds) and Must/Should/Could prioritization that follows from it (§6.1). SM-1 validates the thesis directly rather than measuring vanity activity. Only one Primary success metric — appropriate for a single-user prototype with one core loop, not a gap, but worth naming: nothing measures estimate *quality/accuracy* even qualitatively, only speed. Given §4.1's own `[NOTE FOR PM]` about real-world accuracy problems, a reader might expect a metric or at least a stated non-metric acknowledgment there. Minor, not blocking.

### Findings
- **[low]** No accuracy-related metric or explicit non-metric statement (§7) — the PRD is candid about accuracy risk in §4.1's `[NOTE FOR PM]` but §7 only measures speed. *Fix:* optional; could add a line noting accuracy is intentionally unmeasured for this prototype, or leave as-is given hobby stakes.

## Done-ness clarity — strong
Nearly every FR has a testable consequence, and the ones that don't (FR-5, FR-7, FR-10–FR-12, FR-15–FR-20) are themselves precise atomic statements (exact times, exact slot counts, exact precedence) that need no separate consequence bullet to be verifiable. No hedge phrases ("handles gracefully," "reasonable performance," "user-friendly") found anywhere in the document. FR-9's new consequence bullet ("the UI shows a clear in-progress indicator... regardless of how long estimation takes") is itself concretely testable.

### Findings
*(none)*

## Scope honesty — strong
§5 Non-Goals does real work (6 specific exclusions, not filler). All 4 inline `[ASSUMPTION]` tags round-trip cleanly into §9's Assumptions Index (§1 platform, FR-2 single-number estimate, FR-13 default target, FR-14 timezone auto-detect) — no drift, no orphans either direction. Open-item density is now zero outstanding Open Questions, which is honest given the one that existed was legitimately resolved by the architecture pass, not silently dropped.

### Findings
*(none)*

## Downstream usability — strong
Glossary terms (Entry, Meal, Meal Slot, Day, Over-Target State, Dietary Preference, Estimation Pipeline) are used with consistent capitalization across every FR that touches them. FR-1…FR-23 and UJ-1…UJ-4 are contiguous with no gaps or duplicates. Cross-references are mostly precise IDs/sections that resolve — except one broken reference (see Findings). This PRD *is* chain-top (already consumed once by an architecture pass, which reconciled cleanly against it), so this dimension carries real weight.

### Findings
- **[medium]** Broken cross-reference: FR-21's `[NOTE FOR PM]` (§4.6, line 186) ends "...should be revisited before any real users' data is involved. See Constraints below." — there is no "Constraints" section anywhere in this PRD. *Fix:* either add a short Constraints section, or (more consistent with how this PRD already handles this exact point) point instead to §6.2's existing bullet "Formal compliance/security hardening beyond FR-20/FR-21 — revisit before any real (non-test) user data is involved," which already says the same thing.
- **[low]** UJs (§2.2) use "a user" rather than a named protagonist, which the rubric treats as load-bearing for consumer/UX-heavy products. Given this is explicitly a single-user hobby prototype where "the user" is unambiguously the builder, this is cosmetic rather than a real gap. *Fix:* optional; not worth the churn for this PRD's actual audience.

## Shape fit — strong
Explicitly self-aware about its own scope: §0 states solo-use prototype stakes, §2.2 flags UJs as "Hobby/prototype scope — single-sentence form." No over-formalization (no traceability matrix, no compliance section that doesn't apply). The substance bar is still met despite the light rigor — this is the right shape for what the PRD says it is.

### Findings
*(none)*

## Mechanical notes
- **Cross-document consistency gap:** `addendum.md`'s "Recommendation for this prototype" section (line 27) still frames the estimation-provider choice around "the cheapest and fastest path to the <5s target (SM-1)" as if SM-1 were still a hard target — this now reads inconsistently against the PRD's softened §7 language. Same section's Gemini Flash pricing figures (~$0.04–0.15/image, line 23) predate the actual model chosen in architecture (`gemini-3.8-flash`, verified pricing $0.75/1M input · $3.75/1M output tokens) and are now stale. (The parent conversation already surfaced this as a pending decision — flagging here so it's on record in the PRD review too, not a new finding.)
- Glossary drift: none found — spot-checked all 9 glossary terms across every FR/UJ that uses them.
- ID continuity: FR-1–FR-23 and UJ-1–UJ-4 both contiguous, no gaps or duplicates.
- Assumptions Index roundtrip: clean, 4/4 inline tags indexed, no orphaned index entries.
- Required sections for hobby/solo stakes: all present (Vision, Target User, Glossary, Features w/ FRs, Non-Goals, MVP Scope, Success Metrics, Open Questions, Assumptions Index); no missing section a reviewer would expect at this stakes level.
