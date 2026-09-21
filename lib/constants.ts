// Postgres `integer` max — a target above this would fail the profiles
// insert/update. 20,000 kcal is also a sane real-world ceiling no
// legitimate target would exceed. Single source of truth for register,
// preferences (client + server), and any future caller.
export const MAX_DAILY_CALORIE_TARGET = 20_000;

export const DIETARY_PREFERENCES = ["vegetarian", "non_vegetarian"] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];
