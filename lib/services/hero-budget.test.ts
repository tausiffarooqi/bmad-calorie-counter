// Unit coverage for hero-budget.ts's computeHeroBudgetDisplay() -- pure and
// sync, exhaustively testable (mirrors trends.test.ts's approach).
//
// Run with: node --test lib/services/hero-budget.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeHeroBudgetDisplay } from "./hero-budget.ts";

test("under target: bar reflects the real percent, caption reads 'remaining'", () => {
  const result = computeHeroBudgetDisplay(1240, 2000);
  assert.equal(result.percentOfTarget, 38);
  assert.equal(result.barWidthPercent, 38);
  assert.equal(result.remainingCaption, "1,240 kcal remaining");
});

test("over target: bar caps at 100%, percent caption stays uncapped, caption reads 'over'", () => {
  const result = computeHeroBudgetDisplay(-180, 2000);
  assert.equal(result.percentOfTarget, 109);
  assert.equal(result.barWidthPercent, 100);
  assert.equal(result.remainingCaption, "180 kcal over");
});

test("exactly at target: 100% bar, zero remaining, still phrased as 'remaining' (>= 0)", () => {
  const result = computeHeroBudgetDisplay(0, 2000);
  assert.equal(result.percentOfTarget, 100);
  assert.equal(result.barWidthPercent, 100);
  assert.equal(result.remainingCaption, "0 kcal remaining");
});

test("zero calories consumed: 0% bar, full target remaining", () => {
  const result = computeHeroBudgetDisplay(2000, 2000);
  assert.equal(result.percentOfTarget, 0);
  assert.equal(result.barWidthPercent, 0);
  assert.equal(result.remainingCaption, "2,000 kcal remaining");
});

test("dailyCalorieTarget <= 0 degrades to 0% rather than dividing by zero", () => {
  const result = computeHeroBudgetDisplay(500, 0);
  assert.equal(result.percentOfTarget, 0);
  assert.equal(result.barWidthPercent, 0);
});
