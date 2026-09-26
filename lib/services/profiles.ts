import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { dayBoundary } from "@/lib/services/day-boundary";
import type { DietaryPreference } from "@/lib/constants";

// The only code path allowed to read/write `profiles` (AD-1 layered
// architecture, Consistency Conventions).
export async function createProfile(userId: string, dailyCalorieTarget: number) {
  await db.insert(profiles).values({
    userId,
    dailyCalorieTarget,
    // dietaryPreference intentionally omitted — the DB default
    // ('non_vegetarian') applies until Story 1.3's Preferences screen
    // changes it.
  });
}

export async function getProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return profile;
}

// Both updates `.returning()` and report whether a row actually matched —
// a `profiles` row missing for an authenticated user (deleted, corrupted,
// never created) would otherwise UPDATE zero rows silently, and the caller
// would report success with nothing written.
export async function updateDailyCalorieTarget(userId: string, dailyCalorieTarget: number) {
  const rows = await db
    .update(profiles)
    .set({ dailyCalorieTarget })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return rows.length > 0;
}

export async function updateDietaryPreference(userId: string, dietaryPreference: DietaryPreference) {
  const rows = await db
    .update(profiles)
    .set({ dietaryPreference })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return rows.length > 0;
}

// Story 4.1's "is this the first app-open of the current Day" check, marked
// atomically with the check itself (Approach: "marking the prompt shown
// happens server-side, at the moment the Daily view is loaded/queried").
// `dayBoundary()` (AD-5) is the sole Day-attribution authority — no
// separate/inline date math here (Boundaries & Constraints). A simple
// read-then-conditionally-write, not a compare-and-swap — acceptable given
// this app's single-user-at-a-time hobby scale (Code Map), so a race
// between two concurrent loads the same instant is not guarded against.
// Takes `lastFirstLoginPromptAt`/`now` from the caller rather than
// re-fetching the profile or computing its own `new Date()` — the caller
// (the route) already has the profile in scope from its own primary read,
// and reuses the one `now` instant the rest of that request is computed
// against.
export async function checkAndMarkFirstLoginPrompt(
  userId: string,
  lastFirstLoginPromptAt: Date | null,
  now: Date,
  tz: string
): Promise<boolean> {
  const { start } = dayBoundary(now, tz);
  const alreadyShownToday = lastFirstLoginPromptAt !== null && lastFirstLoginPromptAt >= start;
  if (alreadyShownToday) return false;

  const rows = await db
    .update(profiles)
    .set({ lastFirstLoginPromptAt: now })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return rows.length > 0;
}

// Pure helper (Code Map) deciding whether today's pre-10am breakfast offer
// has already been accepted — the same per-Day comparison against
// `dayBoundary()`'s start as `checkAndMarkFirstLoginPrompt` uses above, no
// separate/inline date math (Boundaries & Constraints, AD-5). Used by the
// route both to decide the offer card's visibility and whether to pass
// `breakfastOffered: true` into getRecommendations().
export function breakfastOfferAcceptedToday(
  breakfastOfferAcceptedAt: Date | null,
  now: Date,
  tz: string
): boolean {
  const { start } = dayBoundary(now, tz);
  return breakfastOfferAcceptedAt !== null && breakfastOfferAcceptedAt >= start;
}

// Story 4.4's "accept the pre-10am breakfast offer" write — same
// read-then-conditionally-write shape as checkAndMarkFirstLoginPrompt above
// (single-user-at-a-time race accepted per that function's own existing
// precedent). Takes the caller's already-fetched `breakfastOfferAcceptedAt`
// directly (Epic 4 retro action item) — the route's own eligibility check
// now fetches `profile` via `Promise.all` before ever calling this
// function, so an internal `getProfile()` re-fetch here would be a pure,
// avoidable extra DB round-trip. No-op (returns false, no UPDATE issued) if
// already accepted today — a decline is never persisted, only acceptance
// (Boundaries & Constraints), and this function is never called for a
// decline.
export async function acceptBreakfastOffer(
  userId: string,
  breakfastOfferAcceptedAt: Date | null,
  now: Date,
  tz: string
): Promise<boolean> {
  if (breakfastOfferAcceptedToday(breakfastOfferAcceptedAt, now, tz)) {
    return false;
  }

  const rows = await db
    .update(profiles)
    .set({ breakfastOfferAcceptedAt: now })
    .where(eq(profiles.userId, userId))
    .returning({ userId: profiles.userId });
  return rows.length > 0;
}
