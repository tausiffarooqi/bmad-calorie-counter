// Unit coverage for computeTrendDays() — every I/O matrix row reachable at
// this pure-aggregation layer (Code Map). Uses Node's built-in test runner
// (node:test/node:assert), same convention as day-boundary.test.ts.
//
// Run with: node --test lib/services/trends.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTrendDays } from "./trends.ts";

const TZ = "America/New_York";

test("multiple entries on the same day sum into one bucket", () => {
  const days = computeTrendDays(
    [
      { calories: 300, createdAt: new Date("2026-01-15T15:00:00Z") }, // 10:00 EST
      { calories: 450, createdAt: new Date("2026-01-15T20:00:00Z") }, // 15:00 EST
    ],
    2000,
    TZ
  );

  assert.equal(days.length, 1);
  assert.equal(days[0].totalCalories, 750);
  assert.equal(days[0].dailyCalorieTarget, 2000);
});

test("entries split across two different days produce two buckets", () => {
  const days = computeTrendDays(
    [
      { calories: 300, createdAt: new Date("2026-01-14T15:00:00Z") }, // Jan 14, 10:00 EST
      { calories: 450, createdAt: new Date("2026-01-15T15:00:00Z") }, // Jan 15, 10:00 EST
    ],
    2000,
    TZ
  );

  assert.equal(days.length, 2);
  const totals = days.map((d) => d.totalCalories).sort((a, b) => a - b);
  assert.deepEqual(totals, [300, 450]);
});

test("empty input returns an empty array", () => {
  assert.deepEqual(computeTrendDays([], 2000, TZ), []);
});

test("ordering is most-recent-first", () => {
  const days = computeTrendDays(
    [
      { calories: 100, createdAt: new Date("2026-01-10T15:00:00Z") },
      { calories: 200, createdAt: new Date("2026-01-20T15:00:00Z") },
      { calories: 300, createdAt: new Date("2026-01-15T15:00:00Z") },
    ],
    2000,
    TZ
  );

  const dates = days.map((d) => d.dayStart);
  const sortedDescending = [...dates].sort().reverse();
  assert.deepEqual(dates, sortedDescending);
  assert.equal(days[0].totalCalories, 200);
  assert.equal(days[days.length - 1].totalCalories, 100);
});

test("a Day-boundary-adjacent timestamp buckets into the correct Day", () => {
  // Reuses day-boundary.test.ts's known-good fixture times: 04:59 EST
  // belongs to the still-open previous Day; 05:01 EST starts a new Day.
  const days = computeTrendDays(
    [
      { calories: 100, createdAt: new Date("2026-01-15T09:59:00Z") }, // 04:59 EST -> Jan 14 Day
      { calories: 200, createdAt: new Date("2026-01-15T10:01:00Z") }, // 05:01 EST -> Jan 15 Day
    ],
    2000,
    TZ
  );

  assert.equal(days.length, 2);
  const [mostRecent, earliest] = days;
  assert.equal(mostRecent.totalCalories, 200);
  assert.equal(earliest.totalCalories, 100);
  assert.ok(new Date(mostRecent.dayStart).getTime() > new Date(earliest.dayStart).getTime());
});
