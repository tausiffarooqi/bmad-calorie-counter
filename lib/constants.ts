// Postgres `integer` max — a target above this would fail the profiles
// insert/update. 20,000 kcal is also a sane real-world ceiling no
// legitimate target would exceed. Single source of truth for register,
// preferences (client + server), and any future caller.
export const MAX_DAILY_CALORIE_TARGET = 20_000;

export const DIETARY_PREFERENCES = ["vegetarian", "non_vegetarian"] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

// 'photo' is not producible yet (Story 2.2 adds the photo input path) — the
// column allows it now so Story 2.2 needs no migration of its own.
export const INPUT_MODES = ["text", "photo"] as const;
export type InputMode = (typeof INPUT_MODES)[number];

// A generous ceiling for a free-text meal description — no legitimate
// description needs anywhere near this much detail. Bounds prompt size
// (cost/latency against the Gemini call) and prevents an unbounded string
// reaching the `entries.description_text` text column.
export const MAX_DESCRIPTION_LENGTH = 2000;
