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
  // Story 4.1's persisted "have they already seen today's First-Login
  // prompt" signal — nullable, no default (null means "never shown,"
  // including every profile that existed before this column was added, the
  // same as a brand-new registration). checkAndMarkFirstLoginPrompt()
  // (lib/services/profiles.ts) is the only code path that reads or writes
  // it (AD-1).
  lastFirstLoginPromptAt: timestamp("last_first_login_prompt_at", { withTimezone: true }),
  // Story 4.4's persisted "did the user accept today's pre-10am breakfast
  // offer" signal — nullable, no default (null means "never accepted,"
  // including every profile that existed before this column was added).
  // Mirrors `lastFirstLoginPromptAt` exactly (Code Map). Only acceptance is
  // ever written here — a decline is never persisted (Boundaries &
  // Constraints). acceptBreakfastOffer()/breakfastOfferAcceptedToday()
  // (lib/services/profiles.ts) are the only code paths that read or write
  // it.
  breakfastOfferAcceptedAt: timestamp("breakfast_offer_accepted_at", { withTimezone: true }),
});

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    inputMode: text("input_mode").notNull(),
    // Added by Story 3.1 via a separate `ALTER TABLE` (Epic 3's AD scope
    // note) — every persisted Entry gets exactly one of `meal`/
    // `snack_beverage`, never null (no `.default()` — AD-1 requires every
    // caller of `createEntry()` to pass it explicitly).
    classification: text("classification").notNull(),
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
