# Adversarial Divergence Review — Calorie Tracker MVP Spine

Target: `ARCHITECTURE-SPINE.md` (2026-09-16 draft)

Method: construct concrete pairs of independently-built units that each satisfy every AD to the letter, yet build incompatibly. Only genuine ambiguities in the Rules as written; no manufactured team-coordination risk (this is a solo build).

## CRITICAL — AD-2's port signature has no shape for FR-4 (insufficient-detail retry)

FR-4 (Must-have) requires: if a photo/text Entry lacks enough detail, "system does not guess — it prompts the user to retry." AD-2 binds only FR-2/FR-3 and fixes the interface as:

    estimate(input: Photo | Text): { description: string, calories: number }

This return type has no way to express "insufficient detail, please retry." Two independent, AD-2-compliant implementations:

- **Builder A**: `estimate()` throws an `InsufficientDetailError`; every caller (route handler, any future batch/background job) must wrap the call in try/catch.
- **Builder B**: `estimate()` never throws; it returns a discriminated union, e.g. `{ ok: true, description, calories } | { ok: false, reason: 'insufficient_detail' }`; callers branch on `.ok`.

Both satisfy AD-2's literal Rule (they still implement "one `EstimationProvider` interface"), but every caller written against one contract breaks against the other. Since FR-4 shares the exact same call path as FR-2/FR-3, AD-2 should bind FR-4 too and fix the outcome shape (recommend the discriminated-union form, since "does not guess" is a first-class outcome, not an exceptional one).

## HIGH — Meal-slot consumption/assignment has no governing AD

FR-8 (snack doesn't consume a slot), FR-10 (2 slots 5am–12pm vs 1 slot 12pm–10pm), and FR-17 (breakfast is a separate third slot, not counted within the 5am–12pm window's 2 slots) together require tracking "which Meal Slots are already used today." Nothing in the spine fixes how. The ERD's `ENTRIES` table has no `meal_slot` column, which *implies* a stateless/count-based approach, but this is never stated as a Rule (AD-5 only governs Day attribution, not slot consumption).

- **Builder A**: recomputes remaining slots by counting today's Meal-classified entries against the time-of-day window (fully derived, matching AD-5's spirit).
- **Builder B**: adds an explicit `meal_slot` enum column (`breakfast`/`lunch`/`dinner`) written at insert time, and computes remaining slots by checking which labels are already present.

Both are silent-compliant with every AD. They produce different schemas and different correctness behavior — Builder A's count-based approach can silently miscount if a user logs, say, two lunches (does a second lunch-time Meal entry consume the "dinner" slot, or is slot identity separate from count?), a case Builder B's explicit-label approach handles differently by design. FR-17's "breakfast is additional, not counted within the 2 slots" rule is exactly the kind of interaction this ambiguity would get wrong in one of the two designs. Recommend a new AD naming the mechanism explicitly (count-based derivation vs. explicit slot labeling) the same way AD-5 fixed Day attribution.

## HIGH — Recommendation content source is unspecified, with a direct SM-1 latency risk

FR-9/FR-19 require a Recommendation per remaining slot, driven by Dietary Preference. Nothing fixes *how* that content is produced, and FR-9 explicitly bundles the Recommendation into the same per-submission response that SM-1's 5-second budget covers.

- **Builder A**: calls Gemini a second time per response (one call per remaining slot, or one batched call) to generate recommendation text — variable latency, a second external dependency per request.
- **Builder B**: uses a static/deterministic lookup table keyed by dietary preference + slot — near-zero latency, no extra external dependency.

Both comply with AD-6 (which only fixes *precedence order*, not content generation). The two designs have materially different latency profiles against SM-1 and different failure modes (Builder A adds a second point of external-API failure per request; Builder B does not). This is architecture-relevant, not implementation detail, precisely because SM-1 is a named success metric the spine claims to support.

## MEDIUM — Entry classification (FR-7) has no fixed owner

AD-2's port returns `{ description, calories }` — no classification field — yet the Capability Map attributes FR-7 (Meal vs. Snack/Beverage) to the budget-engine/recommendation-engine services, implying classification happens downstream of estimation. This is never stated as a Rule, so nothing stops a future adapter from folding classification into the Gemini prompt itself (returning a third field) instead of a separate deterministic step. Lower severity than the above three because a single builder is unlikely to accidentally do both, but it's the same class of "the port's contract is underspecified relative to an FR it's supposed to support" gap as the CRITICAL finding above, and worth closing in the same pass.

## Verdict

4 findings, 1 critical, 2 high, 1 medium — all real ambiguities in what the Rules as written actually fix, not manufactured multi-team risk. The critical finding (AD-2 / FR-4) is the one I'd block on before implementation starts; the two HIGH findings are cheap to close now (one line each: name the slot-tracking mechanism, name the recommendation-content source) and expensive to discover mid-build.
