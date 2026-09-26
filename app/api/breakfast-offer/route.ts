import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptBreakfastOffer, getProfile } from "@/lib/services/profiles";
import { dayBoundary, isValidTimeZone } from "@/lib/services/day-boundary";
import { getEntriesForDay } from "@/lib/services/entries";
import { computeRemainingBudget } from "@/lib/services/budget-engine";
import {
  hasLoggedMeal,
  isBreakfastOfferWindow,
  toRecommendationEntries,
} from "@/lib/services/recommendation-engine";

// Story 4.4's new accept endpoint (Code Map) — thin POST handler, no
// GET/DELETE. Accepting the offer is the only thing this route does; a
// decline is purely client-side (BreakfastOfferCard's onDecline) and makes
// no network call at all, so there's nothing to persist here for that path.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 401 if absent, matching every other route (Code Map).
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  let body: { tz?: unknown };
  try {
    const parsed = await request.json();
    // `request.json()` resolving to the valid JSON value `null` (or any
    // other non-object, e.g. a bare string/number) would otherwise pass this
    // try/catch cleanly and then throw an uncaught TypeError on `body.tz`
    // below, escaping the try/catch and surfacing as a generic 500 instead
    // of the intended 400 (Edge Case Hunter).
    if (typeof parsed !== "object" || parsed === null) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: "Invalid request body." } },
        { status: 400 }
      );
    }
    body = parsed;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  // Validates the same way GET /api/entries validates its query param (Code
  // Map) — client-detected, sent per-request, never stored (FR-14's
  // consequence, same as every other tz-consuming route).
  const tz = body.tz;
  if (typeof tz !== "string" || !isValidTimeZone(tz)) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "A valid tz field is required." } },
      { status: 400 }
    );
  }

  const now = new Date();

  // Server-side enforcement (amended Code Map) — a stale/replayed client
  // accept must not silently persist outside the offer's own before-10am
  // window or during Over-Target State, matching the frozen Boundaries'
  // "Over-Target State suppresses the offer ... regardless of hour or
  // acceptance state" and the frozen I/O matrix's before-10am-only row. Fetches
  // today's entries + profile the same way GET /api/entries does (no
  // pre-fetched profile is available in this standalone route) so this check
  // uses the same `remainingBudget` computation as everywhere else
  // (AD-6/budget-engine.ts single source of truth). Hoisted out of the try
  // block (mirrors GET /api/entries's own `let rows; let profile;` pattern)
  // so the eligibility checks below and acceptBreakfastOffer() further down
  // can both reuse this one fetch, rather than re-fetching (Epic 4 retro
  // action item).
  let rows;
  let profile;
  try {
    const { start, end } = dayBoundary(now, tz);
    [rows, profile] = await Promise.all([
      getEntriesForDay(user.id, start, end),
      getProfile(user.id),
    ]);
  } catch (error) {
    console.error("Failed to verify breakfast offer eligibility:", error);
    return NextResponse.json(
      {
        error: {
          code: "breakfast_offer_failed",
          message: "Something went wrong — try again.",
        },
      },
      { status: 500 }
    );
  }

  if (!profile) {
    console.error(`No profile found for authenticated user ${user.id}`);
    return NextResponse.json({ ok: false, reason: "not_offered" });
  }

  const remainingBudget = computeRemainingBudget(profile.dailyCalorieTarget, rows);
  // Epic 4 retro action item: this block previously never checked
  // rows/classification at all, unlike GET /api/entries's own
  // `showBreakfastOffer` (`!hasLoggedMeal(...)`, same shared rule as
  // getRecommendations()'s "only Meal-classified Entries count") — a stale
  // client (a backgrounded tab, a second device, or a direct API call)
  // could otherwise still persist an accept after a Meal was already logged
  // for the Day, exactly the state the card's own visibility rule is meant
  // to keep unreachable.
  if (
    !isBreakfastOfferWindow(now, tz) ||
    remainingBudget < 0 ||
    hasLoggedMeal(toRecommendationEntries(rows))
  ) {
    return NextResponse.json({ ok: false, reason: "not_offered" });
  }

  try {
    // Threads this handler's own already-fetched `profile` (Epic 4 retro
    // action item) instead of acceptBreakfastOffer() re-fetching internally
    // — that internal fetch became a pure, avoidable extra DB round-trip
    // once this route started fetching `profile` for the eligibility check
    // above.
    await acceptBreakfastOffer(user.id, profile.breakfastOfferAcceptedAt, now, tz);
  } catch (error) {
    console.error("Failed to accept breakfast offer:", error);
    return NextResponse.json(
      {
        error: {
          code: "breakfast_offer_failed",
          message: "Something went wrong — try again.",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
