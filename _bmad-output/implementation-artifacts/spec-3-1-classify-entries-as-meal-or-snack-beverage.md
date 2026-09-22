---
title: 'Classify Entries as Meal or Snack/Beverage'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-3-context.md'
baseline_commit: 'ec4608361bb92f1f847987299f82c34a2f3b6512'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Entries are estimated and stored (Epic 2) but never classified — nothing yet distinguishes a full Meal from a Snack/Beverage, so downstream Meal Slot counting (Story 3.3) and budget-only-no-slot behavior (FR-8) have no data to work from.

**Approach:** Add a `classification` column to `entries` and a new `entry-classifier` service, called as a downstream step right after a successful estimation (never inside the `EstimationProvider` adapter, per AD-2). Hybrid strategy, split by input mode: a **text-mode** Entry is classified by a rule-based keyword heuristic on the description (free, instant, can't fail); a **photo-mode** Entry — which has no user-authored text, only Gemini's own generated description — is classified by a second, dedicated Gemini flash-lite call on that description text (not the photo image itself). Displaying the result in the Entries list is a separate, deferred follow-up story (`deferred-work.md`) — out of scope here.

## Boundaries & Constraints

**Always:** Classification runs only on an already-successful estimation (`{ ok: true, description, calories }`); every persisted Entry gets exactly one of `meal`/`snack_beverage`, never null. Text-mode Entries always use the rule-based path; photo-mode Entries always use the Gemini classification path. Classification behavior must not depend on which `EstimationProvider` adapter produced the description (AD-2) — both paths consume plain text, nothing adapter-specific.

**Never:** Do not put classification logic inside `GeminiAdapter` or the `EstimationProvider` interface. Do not add a user-facing correction/override UI. Do not display classification anywhere yet (deferred follow-up story). Do not touch Story 3.2–3.5's budget/recommendation logic — this story only produces the `classification` value. Do not pass photo bytes into the classifier — the photo path classifies Gemini's generated description text, same input shape as the text path.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Meal-like text description | `"one double cheeseburger and medium fries"` (text mode) | Rule-based path → `classification = "meal"` | N/A |
| Snack/beverage-like text description | `"a can of diet soda and a small bag of chips"` (text mode) | Rule-based path → `classification = "snack_beverage"` | N/A |
| Photo-mode Entry | Any `{ ok: true }` result from photo estimation | Gemini path classifies `result.description` (text only, never the photo bytes) | N/A |
| Text description matching neither keyword list | e.g. `"an apple"` | Rule-based path defaults to `snack_beverage` (safer default — see Design Notes) | N/A |
| Gemini classification call fails (photo mode only) | Network/API/parse/validation failure | No `entries` row written | Same `{ error: { code: "entry_creation_failed", ... } }` 500 envelope the route already returns for a failed `createEntry()` — never guess a classification to avoid this path |

</frozen-after-approval>

## Code Map

- `lib/constants.ts` -- add `CLASSIFICATIONS = ["meal", "snack_beverage"] as const` + `Classification` type, mirroring the existing `DIETARY_PREFERENCES`/`INPUT_MODES` pattern
- `lib/db/schema.ts` -- add `classification: text("classification").notNull()` to the `entries` table (replaces the "no `classification` column yet" comment left by Story 2.1)
- `drizzle/` -- new migration via `npx drizzle-kit generate`; the existing 8 dev-only rows need a one-time `DEFAULT` value in the generated `ALTER TABLE` (drop the default afterward so every future insert must specify it explicitly, matching AD-1) — review the generated SQL for the `auth.users` stub gotcha (Story 1.1/2.1 precedent) before applying
- `lib/services/entry-classifier.ts` (new) -- `classifyText(description): Classification` (sync, keyword-based) for text mode; `classifyViaGemini(description): Promise<Classification>` (direct Gemini flash-lite call, decoupled from `EstimationProvider`) for photo mode; one exported `classify(description, inputMode)` dispatches between them
- `lib/services/entries.ts` -- `createEntry()` gains a required `classification` param, passed straight to the insert; still the sole writer to `entries` (AD-1)
- `app/api/entries/route.ts` -- POST handler: call `classify(result.description, inputMode)` immediately after a successful `provider.estimate()`, before `createEntry()`; a classifier failure returns the same error envelope pattern already used for estimation/entry-creation failures. GET handler is untouched by this story (classification isn't in the response yet — deferred follow-up adds it alongside the display work)
- `lib/services/entry-classifier.test.ts` (new) -- unit tests covering both AC examples verbatim, the no-match default case, plus a few boundary phrasings, for the rule-based path (the Gemini path is exercised live, like the rest of the estimation pipeline)

## Tasks & Acceptance

**Execution:**
- [x] `lib/constants.ts` -- add `CLASSIFICATIONS`/`Classification` -- single source of truth for the two allowed values
- [x] `lib/db/schema.ts` + `drizzle/` migration -- add the `classification` column, generate + review + apply -- Story's own AC requires it on the existing table
- [x] `lib/services/entry-classifier.ts` -- implement the rule-based (text) and Gemini (photo) paths behind one `classify()` entry point -- the actual classification logic
- [x] `lib/services/entries.ts` -- thread `classification` through `createEntry()` -- keeps AD-1's single-writer invariant
- [x] `app/api/entries/route.ts` -- call `classify()` between estimation and entry creation -- wires the new service into the existing POST flow
- [x] `lib/services/entry-classifier.test.ts` -- cover both AC examples + the no-match default + edge phrasings, for the rule-based path -- first behavioral test for this service, mirrors `day-boundary.test.ts`'s precedent

**Acceptance Criteria:**
- [x] Given a successfully estimated text Entry with a clearly meal-like description, when it's logged, then its `entries` row has `classification = 'meal'` via the rule-based path -- live-verified against the real local Supabase instance and real Gemini estimation call: submitted "one double cheeseburger and medium fries", confirmed via direct `psql` query the persisted row has `classification = 'meal'`
- [x] Given a successfully estimated text Entry with a clearly snack/beverage-like description, when it's logged, then its `entries` row has `classification = 'snack_beverage'` via the rule-based path -- live-verified the same way: submitted "a can of diet soda and a small bag of chips", confirmed `classification = 'snack_beverage'` via `psql`
- [x] Given a successfully estimated photo Entry, when it's logged, then its `classification` comes from the Gemini path classifying the generated description text — never from the rule-based path, never from the photo bytes directly -- live-verified against the real Gemini API: uploaded a real cheeseburger photo, Gemini's estimation described it as "Cheeseburger with a sesame seed bun, beef patty, slice of American cheese, and lettuce." (530 cal), and the separate Gemini classification call correctly returned `classification = 'meal'`, confirmed via `psql`
- [x] Given classification is a downstream service call, then swapping `EstimationProvider` adapters never changes classification behavior for the same description text and input mode -- verified by code review: `classify()` takes only `(description, inputMode)`, no adapter-specific type ever reaches it
- [x] Given the Gemini classification call fails (photo mode), then no `entries` row is written and the existing error envelope is returned — never a null/guessed classification -- verified by code review (route.ts wraps `classify()` and `createEntry()` in one try/catch, same as the pre-existing estimation-failure/entry-creation-failure paths); not exercised live in this pass — consistent with how `gemini-adapter.ts`'s own analogous call-failure path has been verified in prior stories (code review + real API's occasional real failures caught opportunistically, not a forced/mocked test)

## Implementation Notes

- The implementation subagent ran in a sandboxed environment with no Docker/Podman access, so it could not start local Supabase, apply the migration, or do the spec's live manual checks — it generated and hand-reviewed the migration SQL but flagged this gap explicitly in its handback report.
- This session's own environment does have a running local Supabase instance. Applied the migration directly via `psql` after `npx drizzle-kit migrate` hung indefinitely against this project's Postgres (reproducible: two `NOTICE`s about pre-existing `drizzle` schema/`__drizzle_migrations` table, then no further output or exit even after 30s) — not investigated further since direct `psql` application is this project's established fallback (Story 1.1's `auth.users` stub gotcha was likewise a hand-adjustment to generated SQL, not friction with `drizzle-kit migrate` itself, but the same "apply by hand when the tool doesn't cooperate" precedent applies). Confirmed `drizzle.__drizzle_migrations` has always been empty (0 rows) even for previously-applied migrations 0000–0002, so this project has apparently never actually relied on that tracking table — applying by hand doesn't put this migration out of sync with anything.
- Verified post-migration: `classification` column is `text NOT NULL` with no default; all 8 pre-existing dev rows backfilled to `snack_beverage` as designed; the one-time `DEFAULT` was correctly dropped afterward.
- Independently re-ran the full verification sweep myself rather than trusting the subagent's report alone: `npx tsc --noEmit`, `npx eslint .`, `npm test` (15/15 pass, including the 8 new classifier tests), `npx next build` all clean.
- Performed all three of the spec's "Manual checks" live, end-to-end, against the real local Supabase instance and real Gemini API (see Acceptance Criteria above for each result).
- **Post-review patch round** (5 findings, see Review Triage Log): re-engaged the same implementation subagent with the smallest-fix instructions for all 5 `patch`-routed findings. It added test coverage for `classify()`'s dispatch and the pure `isValidPayload()`/`buildClassificationPrompt()` helpers; split the shared try/catch in `route.ts` into two, each with a distinct log message (client-facing response envelope unchanged); updated the stale `maxDuration` comment; fixed the keyword matcher to use word-boundary regex instead of plain substring `.includes()` (adding explicit `"cheeseburger"`/`"hamburger"` entries since `"burger"` no longer substring-matches inside them); and capped `classifyViaGemini()`'s prompt input to `MAX_DESCRIPTION_LENGTH`.
- Independently re-ran the full sweep after the patch round: `npx tsc --noEmit`, `npx eslint .` clean; `npm test` 21/21 pass (including all 6 new patch-driven tests); `npx next build` clean.
- Live re-verified after the patch round, against the real local Supabase instance and real Gemini API: re-submitted both original AC-verbatim examples ("one double cheeseburger and medium fries" → `meal`, confirmed 750 cal; "a can of diet soda and a small bag of chips" → `snack_beverage`, from the earlier pass) and one of the three false-positive phrases the review reproduced ("one king size Snickers candy bar, bought at a good price" → `snack_beverage`, 440 cal) — all correct post-fix. The exact "price"/"rice" substring collision is proven directly and deterministically by the new unit test (Gemini's own description-cleanup dropped the word "price" from this particular live submission before it ever reached the classifier, so the live path exercises the fix's real-world effect but the unit test is what pins the exact collision).

## Spec Change Log

## Review Triage Log

3-lens review (Blind Hunter, Edge Case Hunter, Verification Gap) run against the diff since `baseline_commit`.

| # | Finding | Lens(es) | Verdict | Evidence | Route |
|---|---------|----------|---------|----------|-------|
| 1 | `entry-classifier.ts`'s dispatch (`classify()`) and pure Gemini-response helpers (`isValidPayload`, `buildClassificationPrompt`) have zero automated test coverage — only `classifyText()` is tested | Blind Hunter, Verification Gap (filed: patch) | medium | Confirmed: `entry-classifier.test.ts` only imports/calls `classifyText`. A branch inversion in `classify()`'s `inputMode === "text"` check would ship with all 8 existing tests green (demonstrated by Verification Gap). `isValidPayload`/`buildClassificationPrompt` are pure and testable without mocking `fetch` — the spec's "exercised live" exemption only covers the network-calling `classifyViaGemini`, not these. | patch |
| 2 | `route.ts`'s catch block around `classify()` + `createEntry()` always logs `"Failed to create entry after successful estimation:"` regardless of which call actually threw | Blind Hunter, Edge Case Hunter (converged independently) | low | Confirmed by reading route.ts:176-190 — one shared try/catch, one fixed log string. Real operational-diagnosability cost (classifier vs. DB-insert failures indistinguishable in logs); fix is a trivial, mechanical logging change with no behavior change. | patch |
| 3 | `maxDuration = 60`'s comment only explains the budget in terms of "Gemini's estimation call," not the new second sequential Gemini call (classification) photo-mode Entries now make in the same request | Blind Hunter | low | Confirmed — comment unchanged since Story 2.x. Purely a documentation-accuracy gap, trivial one-line fix. | patch |
| 4 | `MEAL_KEYWORDS`/`SNACK_BEVERAGE_KEYWORDS` matching uses plain substring `.includes()`, causing false positives on partial-word matches | Edge Case Hunter | medium | Reproduced directly: `"went bowling and had a soda"` matches `"bowl"`, `"grabbed a candy bar, decent price"` matches `"rice"`, `"took the subway then had a cookie"` matches `"sub"` — all three misclassify as `meal` via a substring inside an unrelated word. Real, demonstrable data-correctness bug in the rule-based path. | patch |
| 5 | `classifyViaGemini()`'s prompt has no length cap on `description`, unlike the user-text path (bounded by `MAX_DESCRIPTION_LENGTH` before the estimation call) | Edge Case Hunter | low | Real gap — Gemini's own estimation output has no hard length ceiling in its own responseSchema either, so an unusually long generated description could inflate the classification prompt uncapped. Low likelihood (Gemini's own prompt asks for concise descriptions) but the fix is a trivial one-line `.slice()`, so it doesn't qualify for the reject-low exemption. | patch |
| 6 | No DB-level `CHECK` constraint restricts `classification` to `'meal'`/`'snack_beverage'` — only the TS `Classification` type enforces it | Blind Hunter | low | Confirmed real, but consistent with this codebase's existing, pre-established convention — `dietary_preference` and `input_mode` (same kind of small fixed-value text column) also have no `CHECK` constraint anywhere in `schema.ts`. Fix (add + migrate a constraint) is non-trivial and would deviate from, not restore, the existing pattern. | rejected (low, non-trivial fix, matches reject-low criteria) |
| 7 | `entry-classifier.ts` duplicates `gemini-adapter.ts`'s fetch/parse/validation plumbing (response type, non-2xx error throw, JSON.parse try/catch, candidate-extraction) almost verbatim | Blind Hunter | low | Confirmed real duplication. AD-2 forbids reusing `GeminiAdapter`/`EstimationProvider` for classification *behavior*, but doesn't forbid a shared low-level "call Gemini, parse JSON" helper — however, the spec's own Design Notes explicitly chose "same minimal-dependency `fetch()` pattern as `gemini-adapter.ts`" (mirror, not share) for exactly two call sites; extracting a shared helper now would be a premature abstraction at this scale. | rejected (low, non-trivial fix, matches reject-low criteria) |
| 8 | `drizzle/0003_same_ikaris.sql`'s one-time backfill `DEFAULT 'snack_beverage'` is described in a comment as matching `entry-classifier.ts`'s own default, but nothing enforces that claim if the rule-based default ever changes | Blind Hunter | low | Confirmed the claim is comment-only. Zero ongoing functional effect: the default is dropped in the same migration, immediately after backfilling 8 already-superseded dev rows — a future drift only stales a historical comment, never live behavior. | rejected (low, non-trivial/inappropriate fix — migrations are historical snapshots, not meant to be retroactively kept in sync) |
| 9 | Photo-mode classifier failure path (`classify()` throws → no `entries` row, `entry_creation_failed` envelope) has no automated test | Verification Gap (filed: defer) | medium (unverified severity, per verification-gap's own filed disposition) | `route.ts` has no test file at all — auth, estimation-failure, and entry-creation-failure paths are equally untested pre-existing gaps this story's new branch simply joins. Closing this needs a route-level test harness that doesn't exist yet for any behavior in this file. | defer |
| 10 | Two sequential Gemini calls (estimate + classify) for photo-mode Entries now share the existing `maxDuration = 60` request budget with no per-call timeout | Edge Case Hunter | low | Real risk in principle (an unusually slow pair of calls could approach the 60s ceiling and be hard-killed ungracefully), but this session's own live verification (Implementation Notes) showed both calls together completing in well under 60s on the real flash-lite model, and a proper fix requires a new timeout/fallback policy the frozen spec doesn't settle (what should happen when it fires) — disproportionate to design and add as a same-story patch. | defer |
| 11 | No cheap retry path after a photo-mode classification failure — the full (already-paid-for) estimation is discarded and the user must resubmit the photo from scratch to retry just classification | Blind Hunter | medium | Real UX/cost consequence, but it's a direct, necessary consequence of this story's own frozen I/O matrix ("Gemini classification call fails → No `entries` row written... never guess a classification") — the only real fix (caching the estimation result to allow a classification-only retry) means changing the frozen approach itself. | rejected (fix requires editing this build's frozen spec) — logged to `deferred-work.md` as a future enhancement idea |

## Design Notes

- **Rule-based no-match default is `snack_beverage`, not `meal`.** Consequences are asymmetric: under-classifying a real meal as a snack only means its Recommendation card keeps showing when it arguably shouldn't (Story 3.3) — a soft inconvenience. Over-classifying a snack as a meal prematurely consumes a Meal Slot, silently suppressing a Recommendation the user should still get. The budget deduction (Story 3.2) is identical either way — only Meal Slot consumption differs — so defaulting to the lower-consequence direction is the safer engineering choice on an ambiguous/no-keyword-match description (e.g. "an apple").
- **Gemini classification path** is a small, dedicated call (its own request/schema, not reusing `GeminiAdapter`/`EstimationProvider` per AD-2) with a structured JSON response (`{ classification: "meal" | "snack_beverage" }`) — same minimal-dependency `fetch()` pattern as `gemini-adapter.ts`, same `gemini-flash-lite-latest` model.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: clean
- `npx eslint .` -- expected: clean
- `npm test` -- expected: all tests pass, including the new `entry-classifier.test.ts`
- `npx next build` -- expected: clean production build

**Manual checks (if no CLI):**
- Log a clearly meal-like text Entry and a clearly snack/beverage-like text Entry against the real local Supabase instance; confirm both `entries` rows persist the expected `classification` via a direct DB query -- done, see Implementation Notes/Acceptance Criteria
- Log one photo Entry against the real Gemini API; confirm its `classification` comes through the Gemini path via a direct DB query -- done, see Implementation Notes/Acceptance Criteria
