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
import {
  getRecommendations,
  isBreakfastOfferWindow,
  RECOMMENDATION_COPY,
} from "./recommendation-engine.ts";

const TZ = "UTC";

// I/O & Edge-Case Matrix: "5am-12pm, zero Meals logged ... Local hour 8am, 0
// meal-classified Entries today ... 2 recommendations:
// [{slot:"lunch",...}, {slot:"dinner",...}]"
test("5am-12pm with zero Meals logged returns lunch then dinner", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
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
    "non_vegetarian",
    1500
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].slot, "dinner");
});

// I/O & Edge-Case Matrix: "12pm-10pm ... Local hour 3pm, 0 Meals logged ... 1
// recommendation: [{slot:"dinner",...}]"
test("12pm-10pm with zero Meals logged returns only dinner", () => {
  const now = new Date("2026-01-15T15:00:00Z"); // 15:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
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
    "non_vegetarian",
    1500
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
    "non_vegetarian",
    1500
  );
  const withNoEntries = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
  assert.deepEqual(withSnack, withNoEntries);
  assert.equal(withSnack.length, 2);
});

// I/O & Edge-Case Matrix (Story 3.4): "Before 5am, target not yet met ...
// Local hour 2, remainingBudget = 300 ... 1 recommendation:
// [{slot:"dinner",...}] — same Day, same rule as after-10pm" — supersedes
// Story 3.3's old "outside 5am-10pm always []" placeholder.
test("before 5am with target not yet met returns dinner", () => {
  const now = new Date("2026-01-15T02:00:00Z"); // 02:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 300);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// Same merged-window suppression rule as the 23:00 met-exactly/over-target
// tests below, exercised at the before-5am half of the window too (the
// window is one continuous range, AD-5/Boundaries & Constraints) —
// `remainingBudget <= 0` means "no card" regardless of which side of
// midnight the local hour falls on.
test("before 5am with target already met (or over) returns no recommendations", () => {
  const now = new Date("2026-01-15T04:59:00Z"); // 04:59 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 0);
  assert.deepEqual(result, []);
});

test("exactly 5am local is the inclusive start of the morning window", () => {
  const now = new Date("2026-01-15T05:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
  assert.equal(result.length, 2);
});

// I/O & Edge-Case Matrix (Story 3.4): "Exactly 10:00pm / 4:59am boundaries
// ... Local hour 22 and 4 ... Both resolve via the after-10pm rule (not the
// empty placeholder from Story 3.3)" — this is the 4:59am half; the exactly-
// 10pm half is below ("exactly 10pm local resolves via the after-10pm rule
// when target not yet met").
test("just before 5am local resolves via the after-10pm rule, not the old placeholder", () => {
  const now = new Date("2026-01-15T04:59:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 300);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

test("exactly 12pm local switches to the dinner-only window", () => {
  const now = new Date("2026-01-15T12:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// The exactly-10pm half of the same matrix row as the 4:59am test above.
test("exactly 10pm local resolves via the after-10pm rule when target not yet met", () => {
  const now = new Date("2026-01-15T22:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 300);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

test("just before 10pm local still returns dinner", () => {
  const now = new Date("2026-01-15T21:59:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// I/O & Edge-Case Matrix (Story 3.4): "After 10pm, target already met exactly
// ... remainingBudget = 0 ... [] — no card, no banner".
test("after 10pm with target met exactly returns no recommendations", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 0);
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 3.4): "After 10pm, over target ...
// remainingBudget = -50 ... [] — same as 'met exactly' from this story's
// perspective (Story 3.5 adds a banner later)".
test("after 10pm over target returns no recommendations", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", -50);
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 3.4): "After 10pm, target not yet met ...
// Local hour 23, remainingBudget = 300 ... 1 recommendation:
// [{slot:"dinner",...}]".
test("after 10pm with target not yet met returns dinner", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 300);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// I/O & Edge-Case Matrix (Story 3.4): "After-10pm dinner already filled by an
// earlier Meal ... 1+ meal-classified Entries already logged ... [] —
// existing filled-slot-count subtraction (Story 3.3) still applies".
test("after 10pm with dinner already filled by an earlier Meal returns no recommendations", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(
    now,
    TZ,
    [{ classification: "meal" }],
    "non_vegetarian",
    300
  );
  assert.deepEqual(result, []);
});

// The other Story 3.4 tests above all use "non_vegetarian" and only check
// slot identity — this one exercises the "vegetarian" copy branch and
// asserts the actual recommendation text for the after-10pm/before-5am
// dinner slot, not just that a "dinner" slot came back.
test("before 5am with target not yet met returns the vegetarian dinner copy", () => {
  const now = new Date("2026-01-15T02:00:00Z"); // 02:00 UTC
  const result = getRecommendations(now, TZ, [], "vegetarian", 300);
  assert.equal(result.length, 1);
  assert.equal(result[0].slot, "dinner");
  assert.equal(result[0].text, RECOMMENDATION_COPY.dinner.vegetarian);
});

// Requirements & Constraints / AD-8: "Same key returns identical text on a
// different day (expected, not a bug)".
test("the same (slot, Dietary Preference) key returns identical text across different days", () => {
  const day1 = new Date("2026-01-15T08:00:00Z");
  const day2 = new Date("2026-03-02T08:00:00Z");
  const result1 = getRecommendations(day1, TZ, [], "vegetarian", 1500);
  const result2 = getRecommendations(day2, TZ, [], "vegetarian", 1500);
  assert.deepEqual(result1, result2);
});

// AC verbatim: "Given a user who never set a Dietary Preference, then
// recommendations still resolve (using the non_vegetarian default)" — the
// default itself is enforced by the DB column/Story 1.1, not this function,
// but this asserts the lookup resolves to real, non-undefined text for it.
test("the non_vegetarian default resolves to real recommendation text", () => {
  const now = new Date("2026-01-15T08:00:00Z");
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
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

// I/O & Edge-Case Matrix (Story 3.5): "Over target, morning window ... Local
// hour 8, remainingBudget = -50 ... getRecommendations() returns []" —
// overrides the 5am-12pm window that would otherwise return
// [lunch, dinner].
test("over target during the morning window returns no recommendations", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", -50);
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 3.5): "Over target, midday window ... Local
// hour 15, remainingBudget = -180 ... [] — overriding the 12pm-10pm window
// that would otherwise show a dinner card".
test("over target during the midday window returns no recommendations", () => {
  const now = new Date("2026-01-15T15:00:00Z"); // 15:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", -180);
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 3.5): "Over target, after 10pm ... Local
// hour 23, remainingBudget = -50 ... [] — Story 3.4's own 'met/over' check
// never even runs; short-circuited earlier". Distinguishes the Over-Target
// precedence check from Story 3.4's pre-existing after-10pm `<= 0` handling,
// which already returned [] for this same input for a different reason.
test("over target after 10pm returns no recommendations via the precedence short-circuit", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", -50);
  assert.deepEqual(result, []);
});

// Confirms the Over-Target guard fires "before any window logic runs"
// (Intent) regardless of already-filled Meal Slots — a non-empty,
// meal-classified `entries` array would otherwise still leave slots open
// this early in the morning window, proving the short-circuit ignores
// filled-slot count entirely rather than happening to return [] because
// slots were already full.
test("over target returns no recommendations even with meal entries already logged", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC, morning window
  const result = getRecommendations(
    now,
    TZ,
    [{ classification: "meal" }],
    "non_vegetarian",
    -50
  );
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 3.5): "Exactly met (not over) ... Any hour,
// remainingBudget = 0 ... Unchanged from Stories 3.3/3.4 — normal window
// rules apply, no banner". Confirms the `< 0` short-circuit does not also
// swallow the `=== 0` case during a window that would otherwise return
// recommendations (morning window, unlike the after-10pm tests above which
// already covered `=== 0` separately).
test("target met exactly during the morning window is unaffected by the Over-Target check", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 0);
  assert.equal(result.length, 2);
  assert.equal(result[0].slot, "lunch");
  assert.equal(result[1].slot, "dinner");
});

// Design Notes: originally "adds three more" (2 slots x 2 Dietary
// Preferences = 4); Story 4.4 adds a third slot (breakfast), so the lookup
// table now has 6 entries (3 slots x 2 Dietary Preferences), each a
// non-empty string.
test("the lookup table has exactly 6 populated entries", () => {
  const slots = Object.keys(RECOMMENDATION_COPY);
  assert.equal(slots.length, 3);
  for (const slot of slots as Array<keyof typeof RECOMMENDATION_COPY>) {
    const byPreference = RECOMMENDATION_COPY[slot];
    assert.equal(Object.keys(byPreference).length, 2);
    for (const text of Object.values(byPreference)) {
      assert.equal(typeof text, "string");
      assert.ok(text.length > 0);
    }
  }
});

// Design Notes (Story 4.4): "Breakfast Recommendation copy (authored, no
// pre-approved example exists)" — pins the exact authored text for both
// Dietary Preferences, the same way the pre-existing lunch/dinner copy
// tests pin their exact text.
test("breakfast/vegetarian has the expected exact copy", () => {
  assert.equal(
    RECOMMENDATION_COPY.breakfast.vegetarian,
    "Try a bowl of oatmeal with berries and a drizzle of honey."
  );
});

test("breakfast/non_vegetarian has the expected exact copy", () => {
  assert.equal(
    RECOMMENDATION_COPY.breakfast.non_vegetarian,
    "Try scrambled eggs with whole-grain toast and avocado."
  );
});

// --- Story 4.4: Pre-10am Breakfast Offer ---------------------------------

// I/O & Edge-Case Matrix: "Already accepted today, reloaded before logging
// breakfast ... getRecommendations() includes breakfast as an open slot
// alongside lunch/dinner". Genuinely additive, on top of (not counted
// within) the existing 2-slot morning window — a third slot, earliest
// (breakfast) first.
test("breakfastOffered=true during the morning window adds breakfast ahead of lunch/dinner", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500, true);
  assert.deepEqual(result.map((r) => r.slot), ["breakfast", "lunch", "dinner"]);
  assert.equal(result[0].text, RECOMMENDATION_COPY.breakfast.non_vegetarian);
});

// I/O & Edge-Case Matrix: "Accept, then log the breakfast Entry ... Breakfast
// Recommendation disappears (slot filled); lunch/dinner unaffected" — the
// existing positional filled-slot-count subtraction (Story 3.3) applies
// unchanged; one logged Meal fills the earliest (breakfast) slot only.
test("logging one Meal after accepting the breakfast offer fills only the breakfast slot", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(
    now,
    TZ,
    [{ classification: "meal" }],
    "non_vegetarian",
    1500,
    true
  );
  assert.deepEqual(result.map((r) => r.slot), ["lunch", "dinner"]);
});

// Confirms the omitted (defaulted) 6th argument behaves identically to an
// explicit `false` — the ~25 pre-existing call sites never pass it at all
// (Boundaries & Constraints: "never a breaking signature change").
test("omitting breakfastOffered behaves identically to passing false", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const omitted = getRecommendations(now, TZ, [], "non_vegetarian", 1500);
  const explicitFalse = getRecommendations(now, TZ, [], "non_vegetarian", 1500, false);
  assert.deepEqual(omitted, explicitFalse);
  assert.deepEqual(omitted.map((r) => r.slot), ["lunch", "dinner"]);
});

// I/O & Edge-Case Matrix (Story 4.4): "Over-Target State ... No
// breakfast-offer card, regardless of hour or acceptance state" — the
// Over-Target short-circuit (Story 3.5) still fires before any window logic
// runs, even when breakfastOffered is true.
test("over target during the morning window returns no recommendations even when breakfastOffered", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", -50, true);
  assert.deepEqual(result, []);
});

// I/O & Edge-Case Matrix (Story 4.4): "Past the 5am-12pm window, breakfast
// accepted but never logged ... breakfast does not carry over into the
// midday/evening windows — same as an unlogged lunch". The midday branch
// (12pm-10pm) is untouched by breakfastOffered.
test("breakfastOffered has no effect once the midday window has started", () => {
  const now = new Date("2026-01-15T12:00:00Z"); // exactly 12pm UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 1500, true);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// Same "no carryover" rule exercised in the after-10pm/before-5am window
// (Story 3.4's merged window) — breakfastOffered still has no effect there
// either.
test("breakfastOffered has no effect during the after-10pm window", () => {
  const now = new Date("2026-01-15T23:00:00Z"); // 23:00 UTC
  const result = getRecommendations(now, TZ, [], "non_vegetarian", 300, true);
  assert.deepEqual(result.map((r) => r.slot), ["dinner"]);
});

// isBreakfastOfferWindow() — the route's own visibility check for the
// offer card, "hour < 10" (Code Map), distinct from the 5am-12pm
// Recommendation window above.
test("isBreakfastOfferWindow is true before 10am local", () => {
  const now = new Date("2026-01-15T08:00:00Z"); // 08:00 UTC
  assert.equal(isBreakfastOfferWindow(now, TZ), true);
});

test("isBreakfastOfferWindow is false at exactly 10am local", () => {
  const now = new Date("2026-01-15T10:00:00Z"); // 10:00 UTC
  assert.equal(isBreakfastOfferWindow(now, TZ), false);
});

test("isBreakfastOfferWindow is true just before 10am local", () => {
  const now = new Date("2026-01-15T09:59:00Z");
  assert.equal(isBreakfastOfferWindow(now, TZ), true);
});

test("isBreakfastOfferWindow is false in the afternoon", () => {
  const now = new Date("2026-01-15T15:00:00Z"); // 15:00 UTC
  assert.equal(isBreakfastOfferWindow(now, TZ), false);
});

// Epic 4 retro action item: midnight-5am is excluded even though it's
// "before 10am" — those hours belong to the after-10pm/before-5am
// Recommendation window, which never reads breakfastOffered at all, so an
// acceptance here could never produce a breakfast Recommendation on any Day.
test("isBreakfastOfferWindow is false just after midnight local", () => {
  const now = new Date("2026-01-15T00:30:00Z"); // 00:30 UTC
  assert.equal(isBreakfastOfferWindow(now, TZ), false);
});

test("isBreakfastOfferWindow is false just before 5am local", () => {
  const now = new Date("2026-01-15T04:59:00Z");
  assert.equal(isBreakfastOfferWindow(now, TZ), false);
});

test("isBreakfastOfferWindow is true at exactly 5am local", () => {
  const now = new Date("2026-01-15T05:00:00Z");
  assert.equal(isBreakfastOfferWindow(now, TZ), true);
});
