---
title: 'Name Editing on Account/Preferences'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
baseline_commit: '7fbb94ce089a9dca62ce7a6a7a9c9f8c67c0aef7'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.3's amended ACs (epics.md, FR-26) require the Account/Preferences screen to show and let the user edit their Name — this is the only way an account created before Story 1.1's Name field existed can ever acquire one — but `PreferencesForm` only has fields for Daily Calorie Target and Dietary Preference today.

**Approach:** Add a `updateName(userId, name)` function to `lib/services/profiles.ts`, mirroring `updateDailyCalorieTarget`'s exact shape (returns whether a row matched). Extend `/api/preferences`'s PATCH route to accept `name` as a third mutually-exclusive field (currently a strict XOR of `dailyCalorieTarget`/`dietaryPreference`; generalize to "exactly one of the three"). Add a `NameField` component to `preferences-form.tsx`, copying `DailyCalorieTargetField`'s exact per-field-save pattern (own local state, inline "Save" button, inline error/saved message) — the mockup (`preferences-refresh.html`) places it as the first field, above Daily Calorie Target. Pass `profile.name` (nullable) from the server component (`preferences/page.tsx`) into the form, rendering a blank field when it's null (no placeholder text implying a name is already set).

**Always:** Trim before validating/persisting (blank/whitespace-only rejected, same rule as Story 1.1's registration). Reuse `MAX_NAME_LENGTH` from `lib/constants.ts` (Story 1.1) for both client and server validation — do not redefine it.

**Never:** Touch the Register form or `/api/auth/register` (Story 1.1's own scope) or the Daily view greeting (Story 4.5's scope).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Existing Name, valid edit | Name field shows "Alex", user changes to "Alexandra", saves | `profiles.name` updated, inline "Saved." confirmation | N/A |
| No Name on file (pre-existing account) | `profile.name` is `null` | Field renders blank (not a placeholder implying a value), user can set one for the first time | N/A |
| Blank save | User clears the field, saves | Inline field-level error, no request sent / no update persisted | 400 `invalid_name` if it somehow reaches the API |
| Two-field PATCH attempt | Request body has both `name` and `dailyCalorieTarget` | Rejected — exactly one of the three fields per request | 400 `invalid_input` |

</frozen-after-approval>

## Implementation Notes

Added `updateName()`, generalized the PATCH route's XOR to "exactly one of three," and added `NameField` to `preferences-form.tsx` mirroring `DailyCalorieTargetField`. Verified end-to-end via `agent-browser` against an existing account with no Name on file: field rendered blank with the mockup's placeholder, saving "Jordan" persisted correctly (confirmed via `psql`), then reset the test account back to a null name. Blind Hunter caught real duplication (the same name-validation logic copy-pasted a third time) — fixed by extracting a shared `validateName()` helper in `lib/constants.ts`, used by both `/api/auth/register` and `/api/preferences`; re-verified both routes still behave correctly (blank rejected, valid registration succeeds) after the refactor.

## Review Triage Log

- **medium** — The exact same name-validation logic (typeof/blank/length checks) was now copy-pasted a third time across `/api/auth/register`, `/api/preferences`, and client-side in `NameField`. Fixed: extracted a shared `validateName()` helper in `lib/constants.ts`, used by both server routes (kept the client-side copy — see rejected finding below).
- **low** — `NameField` never called `setValue(trimmed)` after a successful save, so a name saved with leading/trailing whitespace would show the untrimmed value in the input until the next page load even though the server persisted the trimmed version. Fixed.
- **low** — The new `NameField` input omitted `autoComplete="name"`, present on the Register form's own Name input (Story 1.1) — inconsistent autofill behavior between the two. Fixed.
- **low** — The `profiles.ts` comment above `updateName`/`updateDailyCalorieTarget`/`updateDietaryPreference` still said "Both updates..." after this diff added a third function sharing the pattern. Fixed wording to "All three."
- **low, rejected** — Route boilerplate (try/catch → 500 → 404 → 200) is now triplicated across the three PATCH branches. Real, but pre-existed this story (two copies already) — this story only extends the established pattern once more, consistently; factoring it out is a legitimate future refactor beyond this story's scope. Logged to `deferred-work.md`.
- **low, rejected** — Client-side `NameField` still duplicates its own copy of the name-validation checks rather than sharing `validateName()`. This mirrors the codebase's existing, established convention (Daily Calorie Target's own client-side checks in both Register and Preferences are similarly independent of any shared helper) — consistent with the codebase as it stands, not a new problem this story introduced.
- **low, rejected** — Error text uses `text-primary` rather than a semantic/destructive color token. Pre-existing app-wide convention (Register form, `DailyCalorieTargetField`, `DietaryPreferenceField` all do the same) — DESIGN.md's own Do's and Don'ts explicitly forbids `destructive`/red styling anywhere in this product; this story simply follows the established pattern, not introduces a new one.
- **low, rejected** — No unit tests added for `updateName()` or the route's new branch. Verified: none of the existing DB-touching `profiles.ts` functions (`updateDailyCalorieTarget`, `updateDietaryPreference`) or API routes have tests either — the codebase's test convention (`lib/services/*.test.ts`) covers only pure/deterministic functions (budget-engine, day-boundary, entry-classifier, recommendation-engine, tone-message, trends). This story follows the same untested pattern as its two direct siblings, not a new gap.
