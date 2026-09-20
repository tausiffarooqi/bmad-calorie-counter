import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS, has admin.* access (e.g. deleting an
// orphaned Auth user if the matching profile row fails to create). Server
// code only; SUPABASE_SERVICE_ROLE_KEY is never exposed to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — check .env.local."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
