import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEntry } from "@/lib/services/entries";
import { GeminiAdapter } from "@/lib/estimation/gemini-adapter";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";

// Gemini's estimation call can run long — no client-side timeout, and the
// in-progress UI holds for the full duration however long it takes
// (AD-9, Boundaries & Constraints). Vercel's default is 10s; this raises
// the ceiling to the max available on Hobby.
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { descriptionText?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "Invalid request body." } },
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

  const descriptionText = body.descriptionText;
  if (typeof descriptionText !== "string" || descriptionText.trim().length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "Describe what you ate before submitting.",
        },
      },
      { status: 400 }
    );
  }

  if (descriptionText.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: `Description must be ${MAX_DESCRIPTION_LENGTH.toLocaleString()} characters or less.`,
        },
      },
      { status: 400 }
    );
  }

  const provider = new GeminiAdapter();

  let result;
  try {
    result = await provider.estimate({ mode: "text", description: descriptionText.trim() });
  } catch (error) {
    console.error("Estimation call failed:", error);
    return NextResponse.json(
      {
        error: {
          code: "estimation_failed",
          message: "The attempt failed, try again.",
        },
      },
      { status: 500 }
    );
  }

  if (!result.ok) {
    // Expected outcome, not an error — 200, no `entries` row created.
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  try {
    await createEntry(user.id, "text", result.description, result.calories);
  } catch (error) {
    console.error("Failed to create entry after successful estimation:", error);
    return NextResponse.json(
      {
        error: {
          code: "entry_creation_failed",
          message: "The attempt failed, try again.",
        },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, calories: result.calories });
}
