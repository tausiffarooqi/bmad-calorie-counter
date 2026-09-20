# Reconciliation Review — ARCHITECTURE-SPINE.md vs. PRD + Addendum

**Verdict: substantively sound — one real gap (SM-1/SM-C1 latency NFR not captured as an invariant), one minor mapping stretch (FR-21), everything else lands cleanly.**

## Method

Read `ARCHITECTURE-SPINE.md`, `prd.md`, and `addendum.md` fresh from disk (not from drafting memory). Confirmed the spine file on disk matches what was intended — no truncation, no drift, all sections present, mermaid blocks well-formed.

## FR coverage check (Capability → Architecture Map)

All FR-1 through FR-23 are represented in the map:
- FR-1–FR-6 → Meal Logging & Estimation row
- FR-7–FR-12 → Budget & Recommendation row
- FR-13–FR-14 → Daily Target & Day Boundary row
- FR-15–FR-18 → First-Login Engagement row
- FR-19 → Dietary Preference row
- FR-20–FR-21 → Account & Security row
- FR-22–FR-23 → Historical Trends row

No FR is silently missing.

## Findings

### 1. (Moderate) SM-1's 5-second budget and SM-C1's counter-metric aren't captured as an invariant

The PRD's *only* primary Success Metric (SM-1: <5s from submission to estimate+recommendation) and its explicit counter-metric (SM-C1: don't shortcut the FR-4 retry check to hit that budget) directly constrain the one seam the spine calls out for future change — AD-2's `EstimationProvider` port. The addendum's own reasoning for recommending a single-LLM-call adapter over a two-stage hybrid is explicitly "no second network hop" to protect the <5s target, and the Deferred section notes the two-stage hybrid "adds latency risk" — but nowhere does the spine state the 5s budget itself as a rule, nor that a future adapter swap must preserve it, nor that FR-4's retry check must not be skipped for speed.

Concretely: if someone builds a future adapter (e.g. the two-stage hybrid) against AD-2's port, the port's type signature (`estimate(input): {description, calories}`) doesn't carry any performance contract or a "must still run the insufficient-detail check" obligation. A compliant-but-independent implementation could satisfy the interface while blowing the 5s budget or silently dropping the retry check — exactly the kind of two-units-diverge risk this spine format exists to prevent.

**Suggested fix:** either extend AD-2's Rule with a line binding SM-1/SM-C1 (e.g. "any `EstimationProvider` adapter must complete within the SM-1 5s budget and must not bypass the FR-4 insufficient-detail check to do so"), or add a new AD-7 dedicated to it. Cheap to fix at Finalize.

### 2. (Minor) FR-21 mapped to AD-3, but AD-3 doesn't actually govern it

The Capability → Architecture Map lists FR-21 ("meal-photo-only guidance," an in-app UI notice) under the Account & Security row, governed by AD-3. AD-3 is about the auth/session/data backend (Supabase) — it says nothing about upload UI copy. FR-21 has essentially no architecture footprint (it's a static UI notice), so grouping it under the same *capability area* as FR-20 (matching the PRD's own §4.6 grouping) is reasonable, but claiming AD-3 "governs" it overstates the connection. Low stakes — a prototype spine won't diverge over this — but worth a one-word fix (e.g. "—" or "n/a, UI copy only" instead of AD-3) for accuracy.

## Non-findings (checked, landed fine)

- Non-Goals (clinical-grade accuracy, no multi-channel, no social, no monetization, no deep analytics) — none contradicted by the spine; web-only Next.js app with no export/analytics pipeline is consistent.
- `[NOTE FOR PM]` on FR-21 (credential system as a data-harvesting target, revisit before real users) — correctly captured under Deferred ("Formal security/compliance hardening beyond FR-20/FR-21").
- Addendum's deferred "password hashing / auth implementation details for FR-20" — correctly resolved (not carried as an open item) since AD-3 hands this to Supabase Auth/GoTrue entirely; no gap.
- Addendum's two-stage hybrid v2 upgrade path — correctly captured under Deferred, correctly framed as "a new adapter later, not an architecture change now" thanks to AD-2's port.
- Day-boundary AD-5's Binds list correctly includes FR-22 (trends dashboard needs the same Day attribution as the live budget view) — this is a real cross-feature consistency risk that was caught.
