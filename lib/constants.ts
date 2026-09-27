// Postgres `integer` max — a target above this would fail the profiles
// insert/update. 20,000 kcal is also a sane real-world ceiling no
// legitimate target would exceed. Single source of truth for register,
// preferences (client + server), and any future caller.
export const MAX_DAILY_CALORIE_TARGET = 20_000;

// A generous ceiling for the Name field (FR-26) — no legitimate name needs
// anywhere near this much. Single source of truth for register and
// preferences (client + server), mirroring MAX_DESCRIPTION_LENGTH's role
// below.
export const MAX_NAME_LENGTH = 100;

// Single source of truth for the server-side Name check — shared by
// /api/auth/register and /api/preferences (Story 1.3) instead of each route
// re-deriving the same typeof/blank/length checks with its own copy.
export function validateName(value: unknown): { ok: true; name: string } | { ok: false; message: string } {
  if (typeof value !== "string") {
    return { ok: false, message: "Name is required." };
  }
  const name = value.trim();
  if (!name) {
    return { ok: false, message: "Name is required." };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  return { ok: true, name };
}

export const DIETARY_PREFERENCES = ["vegetarian", "non_vegetarian"] as const;
export type DietaryPreference = (typeof DIETARY_PREFERENCES)[number];

// 'photo' is not producible yet (Story 2.2 adds the photo input path) — the
// column allows it now so Story 2.2 needs no migration of its own.
export const INPUT_MODES = ["text", "photo"] as const;
export type InputMode = (typeof INPUT_MODES)[number];

// The two Entry classifications (Story 3.1). Every persisted Entry gets
// exactly one — never null (entry-classifier.ts, Boundaries & Constraints).
export const CLASSIFICATIONS = ["meal", "snack_beverage"] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

// A generous ceiling for a free-text meal description — no legitimate
// description needs anywhere near this much detail. Bounds prompt size
// (cost/latency against the Gemini call) and prevents an unbounded string
// reaching the `entries.description_text` text column.
export const MAX_DESCRIPTION_LENGTH = 2000;
