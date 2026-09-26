// Relative import with an explicit ".ts" extension, not the "@/*" alias —
// this file is exercised directly by recommendation-engine.test.ts under
// plain `node --test` (no bundler/path-alias resolution available there),
// same convention as entry-classifier.ts.
import type { Classification, DietaryPreference } from "../constants.ts";

// The two Meal Slots this file always expects on their own — breakfast
// (Story 4.4) is genuinely additive on top of these, never folded into this
// constant itself: MEAL_SLOTS is referenced by its own test file, and this
// codebase's convention is never to change an established exported shape's
// meaning silently (Design Notes). Order matters: lunch always fills before
// dinner (EXPERIENCE.md's own worked example, Design Notes).
export const MEAL_SLOTS = ["lunch", "dinner"] as const;
export type MealSlot = "breakfast" | (typeof MEAL_SLOTS)[number];

export interface Recommendation {
  slot: MealSlot;
  text: string;
}

// Static, versioned lookup table (AD-8) — the same (slot, Dietary
// Preference) key always returns identical text, on any day, forever; this
// is expected, not a staleness bug, and copy must never imply per-Entry
// reasoning (Design Notes / Requirements & Constraints). Two-dimensional
// only (slot x Dietary Preference) — no Over-Target axis, since the
// Over-Target banner always *replaces* the Recommendation card entirely
// rather than producing an Over-Target-flavored card (Design Notes,
// EXPERIENCE.md State Patterns).
export const RECOMMENDATION_COPY: Record<MealSlot, Record<DietaryPreference, string>> = {
  // Authored, no pre-approved example existed (Design Notes) — matches the
  // existing lunch/dinner copy's register (short, concrete, one dish) and
  // the "supportive, never prescriptive" tone already established.
  breakfast: {
    vegetarian: "Try a bowl of oatmeal with berries and a drizzle of honey.",
    non_vegetarian: "Try scrambled eggs with whole-grain toast and avocado.",
  },
  lunch: {
    vegetarian: "Try a chickpea salad bowl with a side of whole-grain pita.",
    non_vegetarian: "Try a grilled chicken salad bowl with a side of whole-grain pita.",
  },
  dinner: {
    // Verbatim reuse of the one existing approved copy example (Code Map /
    // Design Notes) — previously the hardcoded placeholder in app/page.tsx.
    vegetarian: "Try a grilled paneer wrap with sautéed greens.",
    non_vegetarian: "Try grilled salmon with roasted vegetables.",
  },
};

// 5am-12pm local -> both slots open; 12pm-10pm local -> dinner only;
// 10pm-5am local (hour >= 22 || hour < 5, one continuous range spanning
// midnight per AD-5's Day boundary — still "tonight," not tomorrow) ->
// dinner only if the Daily Calorie Target hasn't been met yet
// (`remainingBudget > 0`), otherwise zero expected slots (Story 3.4).
const MORNING_WINDOW_START_HOUR = 5;
const MIDDAY_WINDOW_START_HOUR = 12;
const EVENING_WINDOW_END_HOUR = 22;

// Reads the local wall-clock hour `now` represents in `tz`. Same
// Intl.DateTimeFormat approach as day-boundary.ts's getLocalParts()
// (including its hourCycle:"h23" midnight-as-"24" normalization), but a
// narrower, standalone read (only the hour is needed here) rather than an
// import of that file's unexported helper.
function getLocalHour(now: Date, tz: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    hour: "2-digit",
  });
  const part = formatter.formatToParts(now).find((p) => p.type === "hour");
  if (!part) {
    throw new Error('Intl.DateTimeFormat did not produce an "hour" part.');
  }
  const hour = parseInt(part.value, 10);
  return hour === 24 ? 0 : hour;
}

// Expected Meal Slots for the local hour (Boundaries & Constraints, I/O &
// Edge-Case Matrix) — earliest slot first. The single function enforcing
// every window's precedence (AD-6) — the after-10pm window (Story 3.4) is
// covered here too, not by a separate implementation. `breakfastOffered`
// (Story 4.4) only ever prepends "breakfast" within this one 5am-12pm
// branch — the midday/evening branches below are untouched, so an
// accepted-but-unlogged breakfast never carries past the morning window
// (Boundaries & Constraints: "gets no special exemption").
function expectedSlotsForHour(
  hour: number,
  remainingBudget: number,
  breakfastOffered: boolean
): readonly MealSlot[] {
  if (hour >= MORNING_WINDOW_START_HOUR && hour < MIDDAY_WINDOW_START_HOUR) {
    return breakfastOffered ? ["breakfast", ...MEAL_SLOTS] : MEAL_SLOTS;
  }
  if (hour >= MIDDAY_WINDOW_START_HOUR && hour < EVENING_WINDOW_END_HOUR) {
    return ["dinner"];
  }
  // hour >= 22 || hour < 5 — the after-10pm/before-5am range, one continuous
  // window spanning midnight (still the same Day, AD-5). One dinner slot if
  // the Daily Calorie Target hasn't been met yet, zero if it has (met
  // exactly — the negative/over-target case never reaches this line, since
  // getRecommendations()'s leading Story 3.5 guard already short-circuits
  // any `remainingBudget < 0` before this function is called).
  return remainingBudget > 0 ? ["dinner"] : [];
}

// The one function computing which Meal Slots are still open right now
// (Code Map) — pure, sync, compute-don't-store (AD-7). `entries` should be
// the caller's already Day-scoped (dayBoundary()-filtered) Entries for
// "today"; this does no date-attribution math of its own beyond reading the
// current local hour. `remainingBudget` is Story 3.2's Remaining Calorie
// Budget (Daily Calorie Target minus today's summed calories) for that same
// Day, already computed by the caller (budget-engine.ts) and passed through
// unclamped — positive means the target hasn't been met yet, zero or
// negative means it has (met exactly or exceeded); only the after-10pm/
// before-5am window (Story 3.4) currently keys off its sign.
export function getRecommendations(
  now: Date,
  tz: string,
  entries: { classification: Classification }[],
  dietaryPreference: DietaryPreference,
  remainingBudget: number,
  // Story 4.4's new 6th argument — defaulted so all pre-existing call sites
  // (and their test call sites) keep compiling unmodified (Boundaries &
  // Constraints: "never a breaking signature change"). True only when
  // today's pre-10am breakfast offer has already been accepted (the
  // route's breakfastOfferAcceptedToday() helper) — additive on top of the
  // existing lunch/dinner computation, never counted within it.
  breakfastOffered: boolean = false
): Recommendation[] {
  // Over-Target State (Story 3.5, AD-6) — strictly negative `remainingBudget`
  // short-circuits to zero Recommendations, before any time-of-day window
  // logic runs, at any hour. Takes precedence over every window below
  // (including the after-10pm rule) without exception; `=== 0` ("met
  // exactly") is deliberately excluded here and still falls through to the
  // window logic (Story 3.4's own, unchanged, distinct "done for the day"
  // behavior). The Daily view (app/page.tsx) renders the Over-Target banner
  // instead, derived client-side from this same `remainingBudget` sign — no
  // new field on this function's return shape.
  if (remainingBudget < 0) {
    return [];
  }

  const expectedSlots = expectedSlotsForHour(
    getLocalHour(now, tz),
    remainingBudget,
    breakfastOffered
  );

  // Filled-slot count = Meal-classified Entries logged today only —
  // Snack/Beverage Entries never reduce it (Boundaries & Constraints:
  // "snack/beverage Entries never reduce it").
  const filledCount = entries.filter((entry) => entry.classification === "meal").length;

  // Earliest-expected-slot-first: a plain positional slice, since Entries
  // carry no per-Entry slot tag (Design Notes: "Slot-fill ordering is
  // positional, not identity-tracked"). Array.prototype.slice already
  // clamps to [] once filledCount reaches or exceeds the expected length.
  const remainingSlots = expectedSlots.slice(filledCount);

  return remainingSlots.map((slot) => ({
    slot,
    text: RECOMMENDATION_COPY[slot][dietaryPreference],
  }));
}

// Story 4.4's own window check for the breakfast-offer card's visibility
// (Code Map: "keeps every time-window decision centralized in this one
// file", AD-6) — before 10am local, reusing this file's existing private
// getLocalHour() rather than a second Intl.DateTimeFormat implementation.
// Deliberately a strict "< 10", not the 5am-12pm range expectedSlotsForHour
// uses for the Recommendation slots themselves — the offer card's own
// window (Requirements & Constraints: "Only before 10am") is a distinct,
// narrower window than the Meal Slot window it feeds into.
export function isBreakfastOfferWindow(now: Date, tz: string): boolean {
  return getLocalHour(now, tz) < 10;
}
