// Unit coverage for meal-label.ts's getMealTypeLabel() -- pure and sync,
// exhaustively testable (mirrors greeting.test.ts's approach).
//
// Run with: node --test lib/services/meal-label.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getMealTypeLabel } from "./meal-label.ts";

// I/O & Edge-Case Matrix: Meal-classified boundary hours.
test("meal at hour 5 (boundary) labels Breakfast", () => {
  assert.equal(getMealTypeLabel("meal", 5), "Breakfast");
});

test("meal at hour 10 labels Breakfast", () => {
  assert.equal(getMealTypeLabel("meal", 10), "Breakfast");
});

test("meal at hour 11 (boundary) labels Lunch", () => {
  assert.equal(getMealTypeLabel("meal", 11), "Lunch");
});

test("meal at hour 15 labels Lunch", () => {
  assert.equal(getMealTypeLabel("meal", 15), "Lunch");
});

test("meal at hour 16 (boundary) labels Dinner", () => {
  assert.equal(getMealTypeLabel("meal", 16), "Dinner");
});

test("meal at hour 23 labels Dinner", () => {
  assert.equal(getMealTypeLabel("meal", 23), "Dinner");
});

// Wraps past midnight -- still Dinner (16-5).
test("meal at hour 2 (past midnight) labels Dinner, not Breakfast", () => {
  assert.equal(getMealTypeLabel("meal", 2), "Dinner");
});

test("meal at hour 4 (last pre-Breakfast hour) labels Dinner", () => {
  assert.equal(getMealTypeLabel("meal", 4), "Dinner");
});

// Snack/Beverage entries are never time-derived -- always "Snack".
test("snack_beverage at any hour labels Snack, not time-derived", () => {
  assert.equal(getMealTypeLabel("snack_beverage", 7), "Snack");
  assert.equal(getMealTypeLabel("snack_beverage", 13), "Snack");
  assert.equal(getMealTypeLabel("snack_beverage", 20), "Snack");
});
