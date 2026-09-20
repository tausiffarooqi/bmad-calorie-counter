# Reconciliation: UX spines (DESIGN.md, EXPERIENCE.md) vs. ARCHITECTURE-SPINE.md

## AD-2 (EstimationProvider: `{ok:true,...} | {ok:false, reason:'insufficient_detail'}`)
Consistent. EXPERIENCE.md's "Insufficient detail (retry)" state ("Not logged as a failed Entry — no partial/zero-calorie row appears") matches the `ok:false` branch exactly. The retry prompt copy ("Need a bit more detail to estimate this one") correctly treats this as an expected outcome, not an exception/error.

## AD-6 (recommendation precedence, Over-Target first)
Consistent. "Over-Target banner ... Takes precedence over every other recommendation-producing state, including the first-login breakfast offer" matches AD-6's precedence order directly.

## AD-7 (meal-slot fill state derived from Entries, never stored)
Consistent. No mention anywhere of a persisted slot counter. Flow 3's "same slot count, same suggestion" after logging a Snack/Beverage correctly reflects that a non-Meal Entry doesn't change the derived count.

## AD-8 (recommendation = static lookup keyed on slot × dietary preference × over/under-target — NOT content-aware)
**Gap — soft, not a contradiction.** Nothing in DESIGN.md or EXPERIENCE.md explicitly states that Recommendation content is a fixed, repeatable lookup rather than a fresh/content-aware suggestion. This matters because:

- EXPERIENCE.md's Flow 2 narrative — Recommendation "Try a grilled paneer wrap with sautéed greens" appearing right after logging a paneer tikka bowl for lunch — reads as if the system is aware of what was already eaten (varying the suggestion, avoiding repetition). Under AD-8, the recommendation is actually keyed only on (slot=dinner, preference=vegetarian, state=under-target) — it would return the *identical* "grilled paneer wrap" text on any day matching that same key, regardless of what was logged for breakfast/lunch that day. A static lookup could coincidentally return "paneer" for a vegetarian slot, so this isn't a hard contradiction, but the flow's prose implies more personalization than the architecture delivers.
- Nowhere does EXPERIENCE.md warn that a future builder/story-writer should expect recommendation text to repeat verbatim across different days whenever the same key recurs. Voice/Tone's Do/Don't row ("Try a grilled paneer wrap..." vs. "AI Recommendation: Grilled Paneer Wrap (95% match)") is actually well-aligned with AD-8 in spirit — avoiding an AI-confidence framing is *more* honest to a static lookup than a scored-AI framing would be — but the underlying determinism/repeatability isn't stated anywhere.

Suggested fix (not applied — reconciliation only): add one sentence to EXPERIENCE.md's Component Patterns (Recommendation card) or Voice and Tone stating that Recommendation content is drawn from a fixed lookup and may repeat identically across different days when the same slot/preference/budget-state combination recurs — so this reads as intentional simplicity, not a future bug.

## AD-9 (explicit maxDuration + persistent in-progress indicator)
Consistent. "Appears the instant a photo/text Entry is submitted; persists until the estimate returns — however long that takes ... pairs with a short calm label ... so a long wait still reads as 'working,' not 'stuck'" matches AD-9's "must never look frozen, whether the response takes 2 seconds or 20" exactly.

## New capabilities implied by the UX that architecture doesn't yet cover
None found. Login/Register field-level error messaging (wrong password, email already registered) is standard Supabase Auth (GoTrue) behavior, not a new capability. Account/Preferences editing and Historical Trends both map cleanly to existing Capability → Architecture Map rows (AD-5, `profiles` table, `lib/db` aggregate query).

## Favorable side-effect, not a gap
EXPERIENCE.md's Information Architecture explicitly settles the architecture's own Deferred item — "GoTrue email-confirmation requirement (FR-20)" — by choosing to disable email confirmation for this prototype (Register "logs straight in"). This resolves that open item rather than conflicting with it; worth back-porting into ARCHITECTURE-SPINE.md's Deferred list so it doesn't still read as unresolved there.

## Summary
1 real (soft) gap: AD-8's static-lookup/repeatable nature isn't documented in the UX spine and the Key Flow's narrative framing could mislead a reader into expecting content-aware personalization. No hard contradictions, no missing architectural capabilities. One favorable cross-reference: the UX's email-confirmation-disabled decision resolves an architecture Deferred item.
