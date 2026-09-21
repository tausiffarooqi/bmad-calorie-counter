import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateDailyCalorieTarget, updateDietaryPreference } from "@/lib/services/profiles";
import { MAX_DAILY_CALORIE_TARGET, DIETARY_PREFERENCES, type DietaryPreference } from "@/lib/constants";

function isDietaryPreference(value: unknown): value is DietaryPreference {
  return (
    typeof value === "string" && (DIETARY_PREFERENCES as readonly string[]).includes(value)
  );
}

export async function PATCH(request: Request) {
  let body: { dailyCalorieTarget?: unknown; dietaryPreference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const hasTarget = body.dailyCalorieTarget !== undefined;
  const hasPreference = body.dietaryPreference !== undefined;

  // XOR — each field saves independently per the I/O matrix, never both at
  // once.
  if (hasTarget === hasPreference) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "Provide exactly one of dailyCalorieTarget or dietaryPreference.",
        },
      },
      { status: 400 }
    );
  }

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

  if (hasTarget) {
    const dailyCalorieTarget = body.dailyCalorieTarget;
    if (
      typeof dailyCalorieTarget !== "number" ||
      !Number.isFinite(dailyCalorieTarget) ||
      !Number.isInteger(dailyCalorieTarget) ||
      dailyCalorieTarget <= 0
    ) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_target",
            message: "Daily Calorie Target must be a positive whole number.",
          },
        },
        { status: 400 }
      );
    }

    if (dailyCalorieTarget > MAX_DAILY_CALORIE_TARGET) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_target",
            message: `Daily Calorie Target must be ${MAX_DAILY_CALORIE_TARGET.toLocaleString()} or less.`,
          },
        },
        { status: 400 }
      );
    }

    let updated: boolean;
    try {
      updated = await updateDailyCalorieTarget(user.id, dailyCalorieTarget);
    } catch (error) {
      console.error("Failed to update daily calorie target:", error);
      return NextResponse.json(
        {
          error: {
            code: "update_failed",
            message: "Something went wrong saving your target — try again.",
          },
        },
        { status: 500 }
      );
    }

    if (!updated) {
      // No row matched — the profile is missing for this authenticated
      // user (should never happen post-registration). Never report success
      // for a write that touched nothing.
      console.error("updateDailyCalorieTarget matched no row for user:", user.id);
      return NextResponse.json(
        { error: { code: "profile_not_found", message: "Couldn't find your account — try logging in again." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  // hasPreference
  const dietaryPreference = body.dietaryPreference;
  if (!isDietaryPreference(dietaryPreference)) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_preference",
          message: "Dietary Preference must be vegetarian or non_vegetarian.",
        },
      },
      { status: 400 }
    );
  }

  let updated: boolean;
  try {
    updated = await updateDietaryPreference(user.id, dietaryPreference);
  } catch (error) {
    console.error("Failed to update dietary preference:", error);
    return NextResponse.json(
      {
        error: {
          code: "update_failed",
          message: "Something went wrong saving your preference — try again.",
        },
      },
      { status: 500 }
    );
  }

  if (!updated) {
    console.error("updateDietaryPreference matched no row for user:", user.id);
    return NextResponse.json(
      { error: { code: "profile_not_found", message: "Couldn't find your account — try logging in again." } },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
