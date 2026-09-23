// Unit coverage for recommendation-engine.ts's getRecommendations() — pure
// and sync, so exhaustively testable here (mirrors budget-engine.test.ts's
// and day-boundary.test.ts's approach). Uses Node's built-in test runner
// (node:test/node:assert) — introducing a test framework is explicitly
// deferred project-wide. `tz: "UTC"` throughout so each `now` instant's
// local hour is just its UTC hour, with no timezone-conversion noise —
// day-boundary.test.ts already covers the Intl.DateTimeFormat
// timezone-conversion machinery itself.
//
// Run with: node --test lib/services/recommendation-engine.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getRecommendations, RECOMMENDATION_COPY } from "./recommendation-engine.ts";

const TZ = "UTC";

// I/O & Edge-Case Matrix: "5am-12pm, zero Meals logged ... Local hour 8am, 0
// meal-classified Entries today ... 2 recommendations:
// [{slot:"lunch",...}, {slot:"dinner",...}]"
test("5am-12pm with zero Meals logged returns lunch then dinner", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.equal(result.length, 2);
  assert.equal(result[0].slot, "lunch");
  assert.equal(result[1].slot, "dinner");
  assert.equal(result[0].text, RECOMMENDATION_COPY.lunch.non_vegetarian);
  assert.equal(result[1].text, RECOMMENDATION_COPY.dinner.non_vegetarian);
});

// I/O & Edge-Case Matrix: "5am-12pm, one Meal logged ... Local hour 10am, 1
// meal-classified Entry today ... 1 recommendation: [{slot:"dinner",...}]"
test("5am-12pm with one Meal logged returns only dinner", () => {
  const now = new Date("2026-01-15T10:00:00Z"); // 10:00 UTC
  const result = getRecommendations(
    now,
    TZ,
    [{ classification: "meal" }],
    "non_vegetarian"
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].slot, "dinner");
});

// I/O & Edge-Case Matrix: "12pm-10pm ... Local hour 3pm, 0 Meals logged ... 1
// recommendation: [{slot:"dinner",...}]"
test("12pm-10pm with zero Meals logged returns only dinner", () => {
  const now = new Date("2026-01-15T15:00:00Z"); // 15:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.equal(result.length, 1);
  assert.equal(result[0].slot, "dinner");
});

// I/O & Edge-Case Matrix: "All expected slots filled ... Local hour 3pm, 1+
// Meals logged ... [] - no cards"
test("all expected slots filled returns no recommendations", () => {
  const now = new Date("2026-01-15T15:00:00Z"); // 15:00 UTC
  const result = getRecommendations(
    now,
    TZ,
    [{ classification: "meal" }],
    "non_vegetarian"
  );
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix: "Snack/Beverage logged, slots unaffected ... Any
// time, 1 snack_beverage Entry, 0 meal Entries ... Slot count unchanged from
// the zero-Entries case"
test("a Snack/Beverage Entry never fills a Meal Slot", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const withSnack = getRecommendations(
    now,
    TZ,
    [{ classification: "snack_beverage" }],
    "non_vegetarian"
  );
  const withNoEntries = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(withSnack, withNoEntries);
  assert.equal(withSnack.length, 2);
});

// I/O & Edge-Case Matrix: "Outside 5am-10pm (e.g. 2am) ... Local hour 2 ...
// [] - zero expected slots (Story 3.4 defines this window later)"
test("outside 5am-10pm returns zero expected slots", () => {
  const now = new Date("2026-01-15T02:00:00Z"); // 02:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(result, []);
});

test("exactly 5am local is the inclusive start of the morning window", () => {
  const now = new Date("2026-01-15T05:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.equal(result.length, 2);
});

test("just before 5am local has zero expected slots", () => {
  const now = new Date("2026-01-15T04:59:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(result, []);
});

test("exactly 12pm local switches to the dinner-only window", () => {
  const now = new Date("2026-01-15T12:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

test("exactly 10pm local ends the dinner-only window", () => {
  const now = new Date("2026-01-15T22:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(result, []);
});

test("just before 10pm local still returns dinner", () => {
  const now = new Date("2026-01-15T21:59:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// Requirements & Constraints / AD-8: "Same key returns identical text on a
// different day (expected, not a bug)".
test("the same (slot, Dietary Preference) key returns identical text across different days", () => {
  const day1 = new Date("2026-01-15T08:00:00Z");
  const day2 = new Date("2026-03-02T08:00:00Z");
  const result1 = getRecommendations(day1, TZ, [], "vegetarian");
  const result2 = getRecommendations(day2, TZ, [], "vegetarian");
  assert.deepEqual(result1, result2);
});

// AC verbatim: "Given a user who never set a Dietary Preference, then
// recommendations still resolve (using the non_vegetarian default)" — the
// default itself is enforced by the DB column/Story 1.1, not this function,
// but this asserts the lookup resolves to real, non-undefined text for it.
test("the non_vegetarian default resolves to real recommendation text", () => {
  const now = new Date("2026-01-15T08:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian");
  for (const rec of result) {
    assert.equal(typeof rec.text, "string");
    assert.ok(rec.text.length > 0);
  }
});

// Design Notes: "Recommendation copy ... reuses the one existing approved
// example verbatim (dinner/vegetarian)".
test("dinner/vegetarian reuses the approved copy verbatim", () => {
  assert.equal(
    RECOMMENDATION_COPY.dinner.vegetarian,
    "Try a grilled paneer wrap with sautéed greens."
  );
});

// Design Notes: "adds three more" — pins the exact text of one of those
// three additions (lunch/vegetarian) the same way the test above pins the
// one pre-approved example, rather than only checking non-emptiness.
test("lunch/vegetarian has the expected exact copy", () => {
  assert.equal(
    RECOMMENDATION_COPY.lunch.vegetarian,
    "Try a chickpea salad bowl with a side of whole-grain pita."
  );
});

// Design Notes: "adds three more" — the lookup table has exactly 4 entries
// (2 slots x 2 Dietary Preferences), each a non-empty string.
test("the lookup table has exactly 4 populated entries", () => {
  const slots = Object.keys(RECOMMENDATION_COPY);
  assert.equal(slots.length, 2);
  for (const slot of slots as Array<keyof typeof RECOMMENDATION_COPY>) {
    const byPreference = RECOMMENDATION_COPY[slot];
    assert.equal(Object.keys(byPreference).length, 2);
    for (const text of Object.values(byPreference)) {
      assert.equal(typeof text, "string");
      assert.ok(text.length > 0);
    }
  }
});
