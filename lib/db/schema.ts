import { pgSchema, pgTable, uuid, integer, text, timestamp, index } from "drizzle-orm/pg-core";

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

// No `classification` column yet — Epic 3's Story 3.1 adds it via a
// separate `ALTER TABLE` once classification logic exists (AD scope note,
// Boundaries & Constraints).
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    inputMode: text("input_mode").notNull(),
    descriptionText: text("description_text").notNull(),
    calories: integer("calories").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Every Day-scoped query (Story 2.4's list, Epic 3's budget/trends
    // reads) filters by user and orders by time — added now, while the
    // table is empty, since adding it later means a CREATE INDEX against
    // live data.
    index("entries_user_id_created_at_idx").on(table.userId, table.createdAt),
  ]
);
