import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

// The only code path allowed to write to `profiles` (AD-1 layered
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
