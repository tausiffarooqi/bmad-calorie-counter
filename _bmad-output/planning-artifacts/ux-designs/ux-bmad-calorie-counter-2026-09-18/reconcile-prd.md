# Input Reconciliation — UX Spines vs. PRD

**Input:** `prd.md` + `addendum.md` (prd-bmad-calorie-counter-2026-09-15)
**Checked against:** `DESIGN.md` + `EXPERIENCE.md` (ux-bmad-calorie-counter-2026-09-18)

## Gaps found

### 1. [HIGH] Recommendation card assumes singular, but FR-9/FR-10/FR-17 require one Recommendation *per* remaining Meal Slot (plural)

`EXPERIENCE.md` Component Patterns states: "Recommendation card | Daily view | **At most one card**, always the last element on the surface." But FR-9 requires "one Recommendation per remaining Meal Slot," and FR-10 establishes there are *two* remaining slots (lunch + dinner) during the 5am–12pm window — meaning two simultaneous Recommendations are a normal, common-case requirement, not an edge case. FR-17 can add a third (breakfast) on top of those two. Every Key Flow in `EXPERIENCE.md` happens to occur when only one slot remains (midday/evening submissions), so the multi-recommendation case is never depicted or designed for. The spine needs either a stacked/list treatment for the Recommendation area, or an explicit call that only the *nearest* remaining slot's recommendation is shown even when multiple are technically open — but right now it silently assumes single without deciding that.

### 2. [HIGH] FR-16's decline-path recommendations (plural, per remaining slot) aren't depicted

FR-16: "If the user declines to log a meal at first login, system still displays Recommendations for the **remaining Meal Slots** (plural) based on current progress." Key Flow 1 shows Tausif declining ("Not now") and then only ever seeing a single breakfast recommendation after accepting the breakfast offer — the lunch+dinner recommendations FR-16 requires alongside it are never shown or mentioned. Same root cause as gap 1.

### 3. [HIGH] FR-13 requires the Daily Calorie Target at account creation; the Register screen doesn't collect it

FR-13: "User enters their Daily Calorie Target as a flat value **when they create their account**." The `EXPERIENCE.md` Register screen entry is scoped to "Email + password + confirm" only; Daily Calorie Target lives solely on the separate Account/Preferences screen, reached later via a settings icon from the Daily view. As written, a newly registered account would land on the Daily view with no target set yet — contradicting "when they create their account." Needs either an onboarding step appended to Register (collecting the target, with the `[ASSUMPTION]`-flagged ~2000 kcal pre-fill from PRD §9) before first landing on the Daily view, or an explicit decision to relax "at account creation" to "before first use."

### 4. [MEDIUM] FR-21 (meal-photo-only guidance notice) has no representation anywhere in EXPERIENCE.md

FR-21: "System displays an in-app notice instructing users to upload meal photos only, to reduce the risk of accidentally uploading unrelated personal photos." This doesn't appear in Component Patterns, State Patterns, or Key Flow 2 (which walks through the Add Photo action in detail but never mentions this notice). Minor since FR-21 is Could-have, but currently a silent drop rather than a deferred/spine-only decision.

### 5. [LOW, rolled up] Two smaller state-coverage gaps, Could-have/edge-case severity

- FR-11's "after 10pm, recommend only if target not yet met" isn't listed as its own row in the State Patterns table (only Over-Target and the generic states are) — implied by Component Patterns text but not made explicit as a state.
- FR-22's "days with no Entries are not fabricated as zero" consequence has zero behavioral detail in EXPERIENCE.md — the Historical Trends surface has only a one-line IA purpose, no Component/State entry at all. Acceptable for a Could-have surface with no rendered mock, but worth an explicit "spine-only, not yet detailed" note rather than silence.

## What's not a gap (checked, clean)

- FR-18's "never shaming" tone requirement: thoroughly and consistently honored — Voice and Tone table, the Over-Target banner's deliberate non-alarm color treatment, and Key Flow 4 all reinforce it. No drift found.
- FR-6 (photo discarded, description retained): explicitly called out in Key Flow 2, consistent with the PRD.
- FR-9's in-progress-indicator requirement: correctly reflected (Component Patterns, State Patterns, AD-9 cross-reference).
- FR-7/FR-8 (classification, Snack/Beverage budget effect without consuming a slot): correctly depicted in Key Flow 3, matching UJ-3 precisely.
- FR-4 (retry, not a generic error): correctly reflected in both Component and State Patterns and Key Flow 2's failure branch.
- No invented features or screens beyond PRD scope — the 7-screen IA maps cleanly to PRD features. Illustrative food content (paneer dishes, etc.) is invented example copy, not a scope addition, and introduces an implicit (unstated in PRD) assumption that the example user's Dietary Preference is vegetarian — cosmetic, not a contradiction.
