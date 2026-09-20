# Rubric Review — Calorie Tracker MVP Architecture Spine

Reviewed: ARCHITECTURE-SPINE.md against the good-spine checklist, cross-checked with .memlog.md.
Calibration: solo hobby prototype, low stakes — not treating this as a regulated/high-criticality system.

## Verdict

Solid, right-sized spine for a solo prototype. Six ADs are each enforceable and each prevent a real divergence; stack choices are verified-current where it matters; deployment/environments and the operational envelope are addressed rather than silently skipped; Deferred items are genuinely low-risk to leave open. One real gap found (FR-7 classification boundary); two minor/low items worth a one-line mention but not blocking.

## Findings

### 1. [Medium] FR-7 Entry classification (Meal vs. Snack/Beverage) has no governing AD or defined data flow
The `EstimationProvider` port (AD-2) interface is `estimate(input): { description, calories }` — it does not return a classification signal. FR-7 ("system automatically classifies each Entry as a Meal or Snack/Beverage") is mapped in the Capability → Architecture Map to `lib/services/budget-engine` / `recommendation-engine`, and `entry-classifier` appears in the source tree, but no AD says whether classification is:
- derived from the estimation provider's own response (e.g. Gemini returns a category alongside calories), or
- a separate rule-based/heuristic step downstream of estimation.
Two independently-built stories could diverge here — one assuming Gemini's response already carries classification, another building a standalone classifier expecting only `{description, calories}` as input. This is exactly the kind of interface-shape mismatch AD-2 was meant to prevent for estimation, but it stops one field short.
**Suggested fix:** either extend the `EstimationProvider` interface to return `{ description, calories, classification }` and add a line to AD-2, or add a new AD stating classification is a separate deterministic step (e.g. keyword/heuristic-based on the description text) that runs after `estimate()`, with its own single owner.

### 2. [Low] Drizzle and self-hosted Supabase versions left unpinned in the Stack table
Both rows read "latest (pin at scaffold)" rather than a specific verified version, while Next.js/Node/TypeScript/Tailwind/Gemini rows all carry a specific verified version. For Supabase this is reasonable (ratifying whatever's already running on the Hostinger VPS is the right call, not a fresh assertion). For Drizzle, only the Drizzle-vs-Prisma *choice* was web-verified in the memlog, not Drizzle's actual current version number — worth a quick version check at scaffold time so the table's rigor is consistent.

### 3. [Low] GoTrue email-confirmation/SMTP requirement isn't mentioned anywhere
Self-hosted Supabase Auth (GoTrue) typically requires either SMTP configuration or confirmations explicitly disabled for email/password signup (FR-20) to work without a mail server. This is a non-obvious operational detail of the AD-3 stack choice that isn't in the spine or Deferred list, and could otherwise surprise whoever implements FR-20 first (signup silently failing with no mail server configured). Worth a one-line addition to Deferred: "GoTrue SMTP/email-confirmation config for FR-20 signup — decide at implementation, likely disabled for a prototype."

## Not flagged (checked, no issue)
- All 23 FRs from the PRD are covered in the Capability → Architecture Map; no silent gaps.
- Deferred list items are all genuinely low cross-unit-divergence risk for this altitude/stakes.
- Deployment & environments, infra/provider strategy are both explicit, not silently skipped.
- Stack choices that were verified (Next.js, Node, TypeScript, Tailwind, Gemini model id) match current web results as of 2026-09-16.
- No contradiction with existing brownfield reality (Hostinger self-hosted Supabase, Vercel already in use elsewhere).
