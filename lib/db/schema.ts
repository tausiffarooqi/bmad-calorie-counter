import { pgSchema, pgTable, uuid, integer, text, timestamp } from "drizzle-orm/pg-core";

// Stub referencing Supabase's own auth.users table (owned by GoTrue, not
// migrated by us) — exists only so `profiles.user_id` can carry a real FK.
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  dailyCalorieTarget: integer("daily_calorie_target").notNull(),
  dietaryPreference: text("dietary_preference").notNull().default("non_vegetarian"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
