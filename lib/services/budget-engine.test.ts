// Unit coverage for budget-engine.ts's computeRemainingBudget() — pure and
// sync, so exhaustively testable here (mirrors entry-classifier.test.ts's
// approach to its own pure rule-based path). Uses Node's built-in test
// runner (node:test/node:assert), same as day-boundary.test.ts —
// introducing a test framework is explicitly deferred project-wide.
//
// Run with: node --test lib/services/budget-engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRemainingBudget } from "./budget-engine.ts";

// I/O & Edge-Case Matrix: "Zero Entries logged today ... remainingBudget =
// 2000"
test("zero Entries leaves the full Daily Calorie Target remaining", () => {
  assert.equal(computeRemainingBudget(2000, []), 2000);
});

// I/O & Edge-Case Matrix: "One or more Entries logged ... Target = 2000,
// Entries summing to 750 cal ... remainingBudget = 1250"
test("several Entries reduce the budget by their summed calories", () => {
  const entries = [{ calories: 300 }, { calories: 250 }, { calories: 200 }];
  assert.equal(computeRemainingBudget(2000, entries), 1250);
});

// I/O & Edge-Case Matrix: "Entries push cumulative calories over target ...
// remainingBudget = -300 (returned as-is, never clamped)"
test("Entries summing past the target produce a negative, unclamped result", () => {
  const entries = [{ calories: 1500 }, { calories: 800 }];
  assert.equal(computeRemainingBudget(2000, entries), -300);
});

// Requirements & Constraints: "A Snack/Beverage Entry reduces the Remaining
// Calorie Budget the same as a Meal" — this function takes only `calories`,
// with no classification field at all, so a Meal and a Snack/Beverage Entry
// of the same calorie value are indistinguishable to it and reduce the sum
// identically.
test("a single Entry reduces the budget by exactly its calorie value, regardless of kind", () => {
  assert.equal(computeRemainingBudget(2000, [{ calories: 450 }]), 1550);
});
