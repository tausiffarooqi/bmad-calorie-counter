// Unit coverage for tone-message.ts's getToneMessageOutcome() + the static
// TONE_MESSAGES lookup — pure and sync, so exhaustively testable here
// (mirrors budget-engine.test.ts's approach to its own pure path). First
// test for this service (Tasks & Acceptance). Uses Node's built-in test
// runner (node:test/node:assert), same as every other *.test.ts in this
// directory — introducing a test framework is explicitly deferred
// project-wide.
//
// Run with: node --test lib/services/tone-message.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getToneMessageOutcome, TONE_MESSAGES } from "./tone-message.ts";

// I/O & Edge-Case Matrix: "Stayed within target yesterday ... Yesterday's
// summed Entry calories <= dailyCalorieTarget"
test("summed calories under the target classify as within_target", () => {
  const entries = [{ calories: 300 }, { calories: 400 }];
  assert.equal(getToneMessageOutcome(entries, 2000), "within_target");
});

// Boundaries & Constraints: "'Within target' means consumed <= target
// (exactly-at-target counts as within, not over — same precedent as Story
// 3.4's 'met exactly' treatment)."
test("summed calories exactly at the target classify as within_target, not over_target", () => {
  const entries = [{ calories: 1000 }, { calories: 1000 }];
  assert.equal(getToneMessageOutcome(entries, 2000), "within_target");
});

// I/O & Edge-Case Matrix: "Exceeded target yesterday ... Yesterday's summed
// Entry calories > dailyCalorieTarget"
test("summed calories over the target classify as over_target", () => {
  const entries = [{ calories: 1500 }, { calories: 800 }];
  assert.equal(getToneMessageOutcome(entries, 2000), "over_target");
});

// I/O & Edge-Case Matrix: "Zero Entries logged yesterday ... No Entries in
// yesterday's Day window ... Neutral message"
test("zero Entries yesterday classifies as neutral, never fabricating within/over", () => {
  assert.equal(getToneMessageOutcome([], 2000), "neutral");
});

// I/O & Edge-Case Matrix: "Very first Day ever (brand-new account) ...
// Identical neutral message as the zero-Entries case — no separate detection
// needed." A brand-new account with no prior Day at all is indistinguishable
// to this function from the zero-Entries case — both are simply an empty
// `yesterdayEntries` array, exercised identically by the test above.
test("a brand-new account with no prior Day at all is the same empty-array input as zero Entries", () => {
  const noPriorDay: { calories: number }[] = [];
  assert.equal(getToneMessageOutcome(noPriorDay, 2000), "neutral");
});

// Design Notes / Boundaries & Constraints: message copy follows the
// "supportive, never shaming" rule (FR-18) — the within-target message
// reuses the one approved example verbatim, and every outcome maps to
// exactly one static string.
test("TONE_MESSAGES has exactly one static message per outcome", () => {
  assert.equal(
    TONE_MESSAGES.within_target,
    "You stayed within your target yesterday — nice, steady work."
  );
  assert.equal(TONE_MESSAGES.over_target, "Yesterday went over target — today's a fresh start.");
  assert.equal(TONE_MESSAGES.neutral, "Here's to a good day of tracking.");
});
