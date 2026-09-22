import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { entries } from "@/lib/db/schema";
import type { InputMode } from "@/lib/constants";

// The only code path allowed to write `entries` (AD-1 layered architecture)
// — never a direct DB call from a route handler or component.
export async function createEntry(
  userId: string,
  inputMode: InputMode,
  descriptionText: string,
  calories: number
) {
  const [entry] = await db
    .insert(entries)
    .values({
      userId,
      inputMode,
      descriptionText,
      calories,
    })
    .returning();
  return entry;
}

// The only other code path allowed to touch `entries` (AD-1) — reads a
// user's Entries within a Day window. `start`/`end` are the UTC instants
// AD-5's `dayBoundary()` computed; this function does no date math of its
// own (Boundaries & Constraints).
export async function getEntriesForDay(userId: string, start: Date, end: Date) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.userId, userId), gte(entries.createdAt, start), lt(entries.createdAt, end)))
    .orderBy(asc(entries.createdAt));
}
