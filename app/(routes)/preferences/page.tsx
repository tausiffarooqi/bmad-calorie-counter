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
    // justify-start, rounded-card, shadow-soft (2026-09-27): matches the
    // Daily view's own top-alignment fix (app/page.tsx, same commit
    // series) — this page's content is short enough that the previous
    // justify-center visibly centered it, unlike the Daily view's usually-
    // overflowing content — and the Page card treatment (DESIGN.md
    // Components) every Warm Editorial Refresh mockup for this screen
    // already showed. Login/Register keep their prior treatment for now
    // (deferred-work.md).
    <div className="flex flex-1 flex-col items-center justify-start gap-6 bg-background p-8 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <BackToDailyViewLink />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-card border border-border bg-card p-6 shadow-soft">
        <h1 className="text-lg font-semibold">Account & Preferences</h1>
        <PreferencesForm
          initialName={profile.name}
          initialDailyCalorieTarget={profile.dailyCalorieTarget}
          initialDietaryPreference={profile.dietaryPreference}
        />
      </div>
    </div>
  );
}
