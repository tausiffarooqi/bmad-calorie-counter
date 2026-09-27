---
title: 'Name Field at Registration'
type: 'feature'
created: '2026-09-26'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
baseline_commit: '738acb9c2725f70cbf4dc69c51d80f42631e3b64'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.1's amended ACs (epics.md, FR-26) require capturing a required Name field at registration, alongside email/password/Daily Calorie Target — needed so the Daily view can later greet the user by name (Story 4.5) — but neither the Register form, the `/api/auth/register` route, nor the `profiles` table has a `name` column today.

**Approach:** Add a nullable `name` text column to the `profiles` table (nullable at the DB level so pre-existing rows stay valid, per FR-26's consequence, even though the Register form requires it going forward) via a new Drizzle migration, applied non-destructively with `drizzle-kit push`. Add a required Name field to the Register form (`app/(routes)/register/page.tsx`) with the same inline field-level validation pattern as its other fields (blank → inline error, no submission). Thread `name` through `/api/auth/register/route.ts`'s request body and validation (blank/whitespace-only → 400 `invalid_input`, matching the existing email/password required-field check) and into `createProfile()` (`lib/services/profiles.ts`), which gains a `name` parameter.

**Always:** Trim the Name before validating/persisting (a whitespace-only value is treated as blank). Reuse the exact inline-error UI pattern already used for `email`/`password`/`dailyCalorieTarget` on this same form — no new error-display component.

**Never:** Touch the Preferences screen (Story 1.3's own amendment covers editing an existing Name) or the greeting header (Story 4.5). Do not make `name` `NOT NULL` at the DB level — that would break every pre-existing row (FR-26 consequence).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Valid registration | Name="Alex", valid email/password/target | Account created, `profiles.name = 'Alex'` | N/A |
| Blank Name | Name="" or "   " | Inline field-level error on Name field, no account created | 400 `invalid_input` if it somehow reaches the API without a client-side name |
| Pre-existing account | A `profiles` row created before this migration | `name` is `NULL`; page loads/renders normally elsewhere (Story 1.3/4.5 own the fallback UI) | N/A |

</frozen-after-approval>

## Implementation Notes

Added `profiles.name` (nullable, via `drizzle-kit generate` + non-destructive `drizzle-kit push` against the local DB), threaded `name` through the Register form, `/api/auth/register`, and `createProfile()`. Verified end-to-end via `agent-browser`: registered a test account with Name "Tausif", confirmed the Daily view loaded normally, and confirmed via `psql` that `profiles.name = 'Tausif'` persisted correctly; then deleted the test account. Blind Hunter caught a missing max-length guard and a type-safety gap on the untrusted `body.name` field — both fixed (see Review Triage Log) — plus a missing placeholder from the approved mockup, also fixed.

## Review Triage Log

- **medium** — No maximum length enforced anywhere in the stack (client, server, or DB column), breaking the codebase's own established pattern (`MAX_DESCRIPTION_LENGTH`). Fixed: added `MAX_NAME_LENGTH` (100) to `lib/constants.ts`, enforced client-side (inline error) and server-side (`invalid_name` 400).
- **medium** — `body.name?.trim()` called `.trim()` on unvalidated JSON input; a non-string `name` (number/object/array) would throw an unhandled 500 instead of a controlled 400. Fixed: added a `typeof body.name !== "string"` guard before trimming.
- **medium** — The server's blank-name rejection reused the generic `invalid_input` code, so the client's error-handling switch (which only special-cases `email_taken`/`invalid_target`) could never route a server-side rejection to the Name field's own inline-error slot — only client-side validation could ever populate it. Fixed: added a dedicated `invalid_name` code, mapped client-side to `errors.name`.
- **low** — The approved mockup (`mockups/auth-refresh.html:129`) specifies `placeholder="e.g. Alex"` on the Name input; the initial implementation omitted it. Fixed.
- **low, rejected** — Only leading/trailing whitespace is stripped; internal whitespace or control characters are accepted verbatim. The fix (collapsing whitespace, stripping control characters) would add meaningfully more validation logic than a simple correction, and no AC requires it — a name containing control characters is an extreme edge case for a hobby-scale prototype.
- **low, rejected** — No DB-level constraint distinguishes an empty string from `NULL` for `name`. Consistent with the existing codebase convention (no CHECK constraints anywhere else either — `AD-1`'s layered architecture treats the service layer, not the DB, as the sole validation gate), and the API route already rejects a blank name before it would ever reach the DB.
- **false** — Claimed the spec's Implementation Notes/Review Triage Log were left empty with `status: in-progress` and no record of verification. True at the moment the reviewer ran (mid-implementation), superseded by this same finalization pass — see Implementation Notes above for the actual end-to-end verification performed.
