-- auth.users is owned by Supabase/GoTrue and already exists — the schema
-- stub in lib/db/schema.ts exists only so profiles.user_id can carry a
-- real FK; it must never be created/altered by our own migrations.
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"daily_calorie_target" integer NOT NULL,
	"dietary_preference" text DEFAULT 'non_vegetarian' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;