import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
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
