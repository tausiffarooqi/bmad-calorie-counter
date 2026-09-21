import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createProfile } from "@/lib/services/profiles";
import { MAX_DAILY_CALORIE_TARGET } from "@/lib/constants";

export async function POST(request: Request) {
  let body: { email?: string; password?: string; dailyCalorieTarget?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid request body." } },
      { status: 400 }
    );
  }
  const { email, password, dailyCalorieTarget } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Email and password are required." } },
      { status: 400 }
    );
  }

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

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Verified against the live local Supabase instance: signUp() returns
    // this exact message for an already-registered email, rather than the
    // anti-enumeration empty-identities response some Supabase configs use
    // (still handled below as a defensive fallback).
    if (error.message === "User already registered") {
      return NextResponse.json(
        {
          error: {
            code: "email_taken",
            message: "An account with this email already exists.",
          },
        },
        { status: 409 }
      );
    }
    // Never forward Supabase's raw error text (could reveal password-policy
    // internals, rate-limit details, etc.) — log it server-side instead.
    console.error("Supabase signUp failed:", error.message);
    return NextResponse.json(
      {
        error: {
          code: "signup_failed",
          message: "Something went wrong creating your account — try again.",
        },
      },
      { status: 400 }
    );
  }

  // Anti-enumeration case: Supabase returns a 200 with no error for an
  // already-registered email, but the returned user's identities array is
  // empty. Treat this the same as a duplicate-email error.
  if (!data.user || data.user.identities?.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "email_taken",
          message: "An account with this email already exists.",
        },
      },
      { status: 409 }
    );
  }

  if (!data.session) {
    // Should not happen with email confirmation disabled, but if it does,
    // don't tell the client registration succeeded when there's no session.
    console.error("signUp() returned a user but no session:", data.user.id);
    return NextResponse.json(
      {
        error: {
          code: "no_session",
          message: "Account created but sign-in failed — try logging in.",
        },
      },
      { status: 500 }
    );
  }

  try {
    await createProfile(data.user.id, dailyCalorieTarget);
  } catch (profileError) {
    console.error("Failed to create profile after signup:", profileError);
    // Roll back the orphaned Auth user rather than leaving an account with
    // no profile — otherwise re-registration would permanently 409 with no
    // profile ever getting created.
    try {
      await createAdminClient().auth.admin.deleteUser(data.user.id);
    } catch (rollbackError) {
      console.error("Failed to roll back orphaned Auth user:", rollbackError);
    }
    return NextResponse.json(
      {
        error: {
          code: "profile_creation_failed",
          message: "Something went wrong creating your account — try again.",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
