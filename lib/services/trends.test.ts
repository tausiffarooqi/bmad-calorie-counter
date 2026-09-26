// Unit coverage for computeTrendDays() — every I/O matrix row reachable at
// this pure-aggregation layer (Code Map). Uses Node's built-in test runner
// (node:test/node:assert), same convention as day-boundary.test.ts.
//
// Run with: node --test lib/services/trends.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTrendDays, computeTrendSummaryStats } from "./trends.ts";
import type { TrendDay } from "./trends.ts";

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

// Story 5.2: computeTrendSummaryStats() — aggregate within/over-target
// counts, percentages, and average, derived from a TrendDay[] (Code Map
// analogue for this story: pure, sync, no I/O).
function day(totalCalories: number, dailyCalorieTarget: number): TrendDay {
  return { dayStart: "unused", totalCalories, dailyCalorieTarget };
}

test("summary stats: exactly-at-target counts as within target", () => {
  const stats = computeTrendSummaryStats([day(2000, 2000)]);

  assert.equal(stats.daysWithinTarget, 1);
  assert.equal(stats.daysOverTarget, 0);
  assert.equal(stats.totalDays, 1);
  assert.equal(stats.percentWithinTarget, 100);
  assert.equal(stats.percentOverTarget, 0);
  assert.equal(stats.averageCalories, 2000);
});

test("summary stats: a day over its target counts as over, not within", () => {
  const stats = computeTrendSummaryStats([day(2001, 2000)]);

  assert.equal(stats.daysWithinTarget, 0);
  assert.equal(stats.daysOverTarget, 1);
  assert.equal(stats.percentWithinTarget, 0);
  assert.equal(stats.percentOverTarget, 100);
});

test("summary stats: mixed days compute correct counts, percentages, and average", () => {
  // 3 within (1500, 2000, 1800), 1 over (2500) target of 2000 each.
  const stats = computeTrendSummaryStats([
    day(1500, 2000),
    day(2000, 2000),
    day(1800, 2000),
    day(2500, 2000),
  ]);

  assert.equal(stats.totalDays, 4);
  assert.equal(stats.daysWithinTarget, 3);
  assert.equal(stats.daysOverTarget, 1);
  assert.equal(stats.percentWithinTarget, 75);
  assert.equal(stats.percentOverTarget, 25);
  // (1500 + 2000 + 1800 + 2500) / 4 = 1950
  assert.equal(stats.averageCalories, 1950);
});

test("summary stats: percentages and average round to the nearest whole number", () => {
  // 1 of 3 within target -> 33.33...% within, 66.66...% over.
  const stats = computeTrendSummaryStats([day(1000, 2000), day(2500, 2000), day(2600, 2000)]);

  assert.equal(stats.percentWithinTarget, 33);
  assert.equal(stats.percentOverTarget, 67);
  // (1000 + 2500 + 2600) / 3 = 2033.33... -> rounds to 2033
  assert.equal(stats.averageCalories, 2033);
});

test("summary stats: each day compares against its own row's target", () => {
  // Different targets per day (current-target-only convention, Story 5.1) --
  // this function must still compare each row to its own target, not a
  // single shared value.
  const stats = computeTrendSummaryStats([day(1800, 1800), day(2200, 1800), day(1500, 2000)]);

  assert.equal(stats.daysWithinTarget, 2);
  assert.equal(stats.daysOverTarget, 1);
});

// Review finding: independent rounding of the two percentages can visibly
// sum to over 100% — 1 within / 199 over out of 200 rounds to 1% + 100%.
// Pinning this exact case (rather than only the 1/3-2/3 case, which happens
// to sum to exactly 100) documents the accepted display artifact with a
// concrete example, not just a comment.
test("summary stats: independent rounding can sum to over 100% (accepted artifact)", () => {
  const days: TrendDay[] = [day(1500, 2000), ...Array.from({ length: 199 }, () => day(2500, 2000))];
  const stats = computeTrendSummaryStats(days);

  assert.equal(stats.percentWithinTarget, 1);
  assert.equal(stats.percentOverTarget, 100);
  assert.equal(stats.percentWithinTarget + stats.percentOverTarget, 101);
});

// Review finding: every other test above hand-builds TrendDay fixtures via
// day() — this one pipes computeTrendDays()'s real output straight into
// computeTrendSummaryStats() to confirm the two functions actually compose
// as Story 5.2's Approach describes ("computed from the same TrendDay[]
// Story 5.1 already produces"), not just that each works in isolation.
test("summary stats: composes correctly with computeTrendDays()'s real output", () => {
  const entries = [
    { calories: 1500, createdAt: new Date("2026-01-14T15:00:00Z") }, // within
    { calories: 2500, createdAt: new Date("2026-01-15T15:00:00Z") }, // over
  ];
  const days = computeTrendDays(entries, 2000, TZ);
  const stats = computeTrendSummaryStats(days);

  assert.equal(stats.totalDays, 2);
  assert.equal(stats.daysWithinTarget, 1);
  assert.equal(stats.daysOverTarget, 1);
  assert.equal(stats.averageCalories, 2000);
});

test("summary stats: empty input degrades to all-zero stats, no division by zero", () => {
  const stats = computeTrendSummaryStats([]);

  assert.deepEqual(stats, {
    daysWithinTarget: 0,
    daysOverTarget: 0,
    totalDays: 0,
    percentWithinTarget: 0,
    percentOverTarget: 0,
    averageCalories: 0,
  });
});
