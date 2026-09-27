import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateDailyCalorieTarget, updateDietaryPreference, updateName } from "@/lib/services/profiles";
import {
  MAX_DAILY_CALORIE_TARGET,
  DIETARY_PREFERENCES,
  validateName,
  type DietaryPreference,
} from "@/lib/constants";

function isDietaryPreference(value: unknown): value is DietaryPreference {
  return (
    typeof value === "string" && (DIETARY_PREFERENCES as readonly string[]).includes(value)
  );
}

export async function PATCH(request: Request) {
  let body: { name?: unknown; dailyCalorieTarget?: unknown; dietaryPreference?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid request body." } },
      { status: 400 }
    );
  }

  const hasName = body.name !== undefined;
  const hasTarget = body.dailyCalorieTarget !== undefined;
  const hasPreference = body.dietaryPreference !== undefined;

  // Exactly one of the three fields saves independently per the I/O
  // matrix, never more than one at once (Story 1.3 generalizes the
  // original two-field XOR to three).
  if ([hasName, hasTarget, hasPreference].filter(Boolean).length !== 1) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "Provide exactly one of name, dailyCalorieTarget, or dietaryPreference.",
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

  if (hasName) {
    const nameResult = validateName(body.name);
    if (!nameResult.ok) {
      return NextResponse.json(
        { error: { code: "invalid_name", message: nameResult.message } },
        { status: 400 }
      );
    }

    let updated: boolean;
    try {
      updated = await updateName(user.id, nameResult.name);
    } catch (error) {
      console.error("Failed to update name:", error);
      return NextResponse.json(
        {
          error: {
            code: "update_failed",
            message: "Something went wrong saving your name — try again.",
          },
        },
        { status: 500 }
      );
    }

    if (!updated) {
      console.error("updateName matched no row for user:", user.id);
      return NextResponse.json(
        { error: { code: "profile_not_found", message: "Couldn't find your account — try logging in again." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
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
