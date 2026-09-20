# Reconciliation: brainstorm-intent.md vs. prd.md + addendum.md

Input: `_bmad-output/brainstorming/brainstorm-calorie-tracker-mvp-2026-09-15/brainstorm-intent.md`
Checked against: `prd.md` + `addendum.md` in this folder, both re-read from disk 2026-09-17.

## Verdict: clean — no unresolved gaps, one intentional (and already-logged) divergence.

## Coverage check (intent doc section → PRD/addendum)

- Core value / fast-build demonstration framing → PRD §1 Vision, faithfully carried, including the "later fitness app, cut out and shipped fast" framing.
- Meal input, estimation pipeline, retry-on-insufficient-detail → FR-1–FR-4. Matches intent 1:1.
- Per-submission response shape (estimate, remaining budget, per-slot recommendation) → FR-9. Matches.
- Entry classification (meal vs. snack/beverage), snack budget effect → FR-7/FR-8. Matches.
- Time-of-day recommendation windows + over-target override precedence → FR-10/FR-11/FR-12. Matches, including the explicit precedence statement.
- Daily target (user-set, defaulted) → FR-13. Matches.
- First-Login Daily Engagement (remaining-budget prompt, decline-path recommendations, pre-10am breakfast as separate 3rd slot, tone-adaptive non-shaming message) → FR-15–FR-18. Matches faithfully, including the "never shaming" qualifier.
- Dietary preference (veg/non-veg) driving recommendation content, finer-grained prefs deferred → FR-19 + Non-Goals. Matches.
- Could-have account/security cluster (credential login, photo-upload-only warning, sensitive-data framing, ad-targeting threat model — not just account takeover) → FR-20/FR-21 + the `[NOTE FOR PM]` under FR-21, which explicitly names the ad-targeting/marketing threat model. Matches, including the qualitative "this is a real concern, don't silently drop it" instruction from the intent doc's own "Flag for Downstream Planning" section.
- Explicitly deferred items (Telegram/WhatsApp, fine-grained dietary prefs, social features) → Non-Goals §5 + Out of Scope §6.2. Matches.
- "Flag for Downstream Planning" (security/PII retained as known deferred-priority item, not dropped) → carried into §6.2's `[NOTE FOR PM]` bullet, and now additionally carried forward into the architecture spine's Deferred section (cross-checked in this session). This is the one qualitative instruction most likely to get silently dropped by an FR-shaped document, and it survived in both places.

## One intentional divergence (not a gap)

- Intent doc: "Day runs ... from 5am to 12am (midnight) — a full day, not a partial window."
- PRD (FR-14, Glossary): Day runs 5am to the *next day's* 5am, with 12am–5am entries attributed to the still-open prior Day.
- This is a deliberate revision made during PRD discovery and already recorded in `.memlog.md` ("Resolved Open Question 8.1: ..."), not an oversight. Flagging only so it's visible during the finalize memlog audit — no action needed, it's a considered decision, not a drift.

## Gaps found: none.

File: this file.
