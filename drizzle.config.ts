import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs standalone (not via `next dev`), so it doesn't get
// Next.js's automatic .env.local loading — load it explicitly here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
