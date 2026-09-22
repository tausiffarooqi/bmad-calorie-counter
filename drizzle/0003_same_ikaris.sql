-- One-time DEFAULT so the ALTER TABLE succeeds against the 8 existing
-- dev-only rows (none of which have a classification yet); 'snack_beverage'
-- matches entry-classifier.ts's own safer no-match default (Design Notes).
-- Dropped immediately after backfilling so every future insert must supply
-- `classification` explicitly (AD-1) — createEntry() always passes it.
ALTER TABLE "entries" ADD COLUMN "classification" text NOT NULL DEFAULT 'snack_beverage';
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "classification" DROP DEFAULT;
