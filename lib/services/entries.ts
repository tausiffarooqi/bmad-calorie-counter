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
