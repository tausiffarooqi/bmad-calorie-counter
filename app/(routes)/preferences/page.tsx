import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/services/profiles";
import { PreferencesForm } from "./preferences-form";
import { BackToDailyViewLink } from "@/app/back-to-daily-view-link";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensive only — proxy.ts already gates every non-public path behind a
  // session (Story 1.2), so this should be unreachable in practice.
  if (!user) {
    redirect("/login");
  }

  const profile = await getProfile(user.id);

  // profiles.user_id is created at registration (Story 1.1) and never
  // deleted independently, so a missing row here would indicate data
  // corruption rather than a normal state to design around.
  if (!profile) {
    throw new Error(`No profile found for authenticated user ${user.id}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <BackToDailyViewLink />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6">
        <h1 className="text-lg font-semibold">Account & Preferences</h1>
        <PreferencesForm
          initialDailyCalorieTarget={profile.dailyCalorieTarget}
          initialDietaryPreference={profile.dietaryPreference}
        />
      </div>
    </div>
  );
}
