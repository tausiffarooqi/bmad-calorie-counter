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
