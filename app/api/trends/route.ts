import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEntriesForDay } from "@/lib/services/entries";
import { dayBoundary, isValidTimeZone } from "@/lib/services/day-boundary";
import { getProfile } from "@/lib/services/profiles";
import { computeTrendDays } from "@/lib/services/trends";

// Returns the signed-in user's 3-Month Trend View data: one row per Day (in
// the last 3 months) that had 1+ logged Entries, each day's total calories
// against that day's *current* `dailyCalorieTarget` (no historized/
// versioned target-per-day, Boundaries & Constraints). Thin handler — same
// shape as app/api/entries/route.ts's GET (Code Map): auth, validate `tz`,
// fetch, delegate the actual aggregation to computeTrendDays().
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const tz = new URL(request.url).searchParams.get("tz");
  if (!tz || !isValidTimeZone(tz)) {
    // Logged the same way GET /api/entries logs its own invalid-tz
    // rejection, so a systematic tz-validation failure is diagnosable
    // server-side (mirrors entries/route.ts).
    console.error("Rejected GET /api/trends: invalid tz query param:", tz);
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "A valid tz query parameter is required.",
        },
      },
      { status: 400 }
    );
  }

  const now = new Date();

  // 3 calendar months before `now`, run through dayBoundary() for the
  // window's Day-aligned start — plain Date arithmetic, no new dependency
  // (Code Map, mirrors day-boundary.ts's own no-library approach).
  // `setMonth()` overflows when the current day-of-month doesn't exist in
  // the target month (e.g. Jul 31 -> "Apr 31" doesn't exist, silently
  // rolling forward to May 1 and narrowing the advertised 3-month window
  // by a few days on the 29th-31st of affected months, Review finding). If
  // the day-of-month changed after `setMonth()`, roll back to the last
  // real day of the intended month instead (`setDate(0)`) rather than keep
  // the overflowed date.
  const threeMonthsAgo = new Date(now);
  const originalDate = threeMonthsAgo.getDate();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  if (threeMonthsAgo.getDate() !== originalDate) {
    threeMonthsAgo.setDate(0);
  }
  const windowStart = dayBoundary(threeMonthsAgo, tz).start;
  // Today's Day-end (includes today so far, Code Map).
  const windowEnd = dayBoundary(now, tz).end;

  // Shared 500 response for both fallible steps below (Review finding —
  // matches app/api/entries/route.ts's GET's identical
  // `entriesFetchFailedResponse()` closure pattern, which the Code Map's
  // "same shape as entries/route.ts's GET" claim otherwise didn't carry
  // over).
  const trendsFetchFailedResponse = () =>
    NextResponse.json(
      {
        error: {
          code: "trends_fetch_failed",
          message: "Couldn't load your trends — try again.",
        },
      },
      { status: 500 }
    );

  let rows;
  let profile;
  try {
    [rows, profile] = await Promise.all([
      getEntriesForDay(user.id, windowStart, windowEnd).catch((error) => {
        console.error("Failed to load trend entries:", error);
        throw error;
      }),
      getProfile(user.id).catch((error) => {
        console.error("Failed to load profile for trend computation:", error);
        throw error;
      }),
    ]);
  } catch {
    return trendsFetchFailedResponse();
  }

  // profiles.user_id is created at registration and never deleted
  // independently, so a missing row here indicates data corruption, not a
  // normal state (mirrors entries/route.ts's identical guard).
  if (!profile) {
    console.error(`No profile found for authenticated user ${user.id}`);
    return trendsFetchFailedResponse();
  }

  const days = computeTrendDays(rows, profile.dailyCalorieTarget, tz);

  // An empty array is a valid, correctly-handled response, not an error
  // (Code Map) — the page distinguishes this from a fetch failure by the
  // HTTP status/response shape, not by inspecting `days` itself.
  return NextResponse.json({ days });
}
