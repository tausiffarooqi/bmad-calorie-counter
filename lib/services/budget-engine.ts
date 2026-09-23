// AD-1's single source of truth for "how much of today's Daily Calorie
// Target is left" — a Day's Remaining Calorie Budget is the target minus
// the sum of every Entry (Meal and Snack/Beverage alike, FR-8) attributed
// to that Day. Mirrors day-boundary.ts's "one function, one call site"
// pattern: no other file performs this subtraction.
//
// Pure and sync — callers own fetching the target and the day-scoped
// Entries (already `dayBoundary()`-filtered); this never queries the DB
// itself. Never clamps or rounds a negative result to zero — Over-Target
// is a real, unclamped state (Story 3.5's concern to detect/style, not
// this function's to hide).
export function computeRemainingBudget(
  dailyCalorieTarget: number,
  entries: { calories: number }[]
): number {
  const consumed = entries.reduce((sum, entry) => sum + entry.calories, 0);
  return dailyCalorieTarget - consumed;
}
