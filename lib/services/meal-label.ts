import type { Classification } from "@/lib/constants";

// Story 2.4's Entries-list icon/tint/meal-type label treatment (UX-DR7).
// A time-derived display label only — compute-don't-store, matching this
// app's existing AD-7 precedent (Meal Slot fill state) — never a stored
// field, and deliberately distinct from FR-10/FR-11's Meal Slot windows and
// greeting.ts's own boundaries (see mockups/daily-view-refresh.html's
// header comment: "not yet confirmed as the real rule," this is the
// `[ASSUMPTION]` epics.md's Story 2.4 AC records). Breakfast 5-11, Lunch
// 11-16, Dinner 16-5 (wraps past midnight).
export type MealTypeLabel = "Breakfast" | "Lunch" | "Dinner" | "Snack";

// Snack/Beverage entries (FR-7) are never time-derived — always "Snack",
// regardless of when logged (epics.md Story 2.4 AC).
export function getMealTypeLabel(classification: Classification, hour: number): MealTypeLabel {
  if (classification === "snack_beverage") return "Snack";
  if (hour >= 5 && hour < 11) return "Breakfast";
  if (hour >= 11 && hour < 16) return "Lunch";
  return "Dinner";
}
