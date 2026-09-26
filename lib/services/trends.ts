// Relative import with an explicit ".ts" extension (not the "@/..." alias)
// — this file has its own trends.test.ts run directly via plain `node
// --test` (package.json), which has no path-alias resolution, unlike
// Next.js's own bundler. Mirrors entry-classifier.ts's identical
// same-directory-test-runner accommodation.
import { dayBoundary } from "./day-boundary.ts";

// One row of the 3-Month Trend View (Story 5.1) — one entry per Day that
// actually had 1+ logged Entries. `dayStart` is the Day-window's start
// instant, serialized (ISO), so it doubles as both the Map bucket key and a
// stable per-row React key/date-format source for the page.
export interface TrendDay {
  dayStart: string;
  totalCalories: number;
  dailyCalorieTarget: number;
}

// Pure, sync aggregation (Code Map) — buckets `entries` by the Day each one
// belongs to (via `dayBoundary()`, AD-5 — never separate calendar-date math,
// Boundaries & Constraints), sums calories per bucket, and returns one
// `TrendDay` per Day that actually had 1+ Entries. A Day with zero Entries
// simply never gets a Map key here — that omission alone satisfies "days
// with zero logged Entries are simply absent from the list" (Intent), no
// separate filter step needed.
export function computeTrendDays(
  entries: { calories: number; createdAt: Date }[],
  dailyCalorieTarget: number,
  tz: string
): TrendDay[] {
  const buckets = new Map<string, number>();

  for (const entry of entries) {
    const key = dayBoundary(entry.createdAt, tz).start.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + entry.calories);
  }

  const days: TrendDay[] = Array.from(buckets.entries()).map(([dayStart, totalCalories]) => ({
    dayStart,
    totalCalories,
    dailyCalorieTarget,
  }));

  // Most-recent-first (Design Notes) — `dayStart` is an ISO instant string,
  // so a plain string comparison sorts chronologically; reversed for
  // descending order.
  days.sort((a, b) => (a.dayStart < b.dayStart ? 1 : a.dayStart > b.dayStart ? -1 : 0));

  return days;
}

// Story 5.2's aggregate summary over a set of `TrendDay`s: counts/percentages
// of days within vs. over target, plus the average daily calories consumed.
// Percentages and the average are rounded to the nearest whole number for
// display (Intent) — the two percentages are not guaranteed to sum to 100
// because of independent rounding, which is expected/acceptable here.
export interface TrendSummaryStats {
  daysWithinTarget: number;
  daysOverTarget: number;
  totalDays: number;
  percentWithinTarget: number;
  percentOverTarget: number;
  averageCalories: number;
}

// Pure, sync (same shape as computeTrendDays()) — derived entirely from the
// `TrendDay[]` Story 5.1 already produces (Approach), so a Day with zero
// Entries is automatically excluded from both the within/over-target count
// and the average: it was never in `days` to begin with, no separate
// exclusion logic needed here. "Within target" means
// `totalCalories <= dailyCalorieTarget` (exactly-at-target counts as within
// — Intent, matching Story 3.4/4.2's established `<=` precedent). Each
// `TrendDay` carries its own `dailyCalorieTarget`, so this compares each day
// against its own row's target rather than a single passed-in value.
//
// Callers should only invoke this for a non-empty `days` array — Story 5.1's
// "nothing logged yet" empty state already covers `days.length === 0`, and
// no stats block should render in that case (Intent: "No stats block at all
// when the window is empty"). This function still degrades gracefully
// (all-zero stats, no division-by-zero) if ever called with `[]`.
export function computeTrendSummaryStats(days: TrendDay[]): TrendSummaryStats {
  const totalDays = days.length;

  if (totalDays === 0) {
    return {
      daysWithinTarget: 0,
      daysOverTarget: 0,
      totalDays: 0,
      percentWithinTarget: 0,
      percentOverTarget: 0,
      averageCalories: 0,
    };
  }

  let daysWithinTarget = 0;
  let totalCalories = 0;

  for (const day of days) {
    totalCalories += day.totalCalories;
    if (day.totalCalories <= day.dailyCalorieTarget) {
      daysWithinTarget += 1;
    }
  }

  const daysOverTarget = totalDays - daysWithinTarget;

  return {
    daysWithinTarget,
    daysOverTarget,
    totalDays,
    percentWithinTarget: Math.round((daysWithinTarget / totalDays) * 100),
    percentOverTarget: Math.round((daysOverTarget / totalDays) * 100),
    averageCalories: Math.round(totalCalories / totalDays),
  };
}
