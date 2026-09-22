import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEntry } from "@/lib/services/entries";
import { GeminiAdapter } from "@/lib/estimation/gemini-adapter";
import type { EstimationInput } from "@/lib/estimation/types";
import { MAX_DESCRIPTION_LENGTH, type InputMode } from "@/lib/constants";
import { MAX_PHOTO_BYTES } from "@/lib/compress-image";

// The client (lib/compress-image.ts) only ever produces "image/jpeg" — this
// is the actual server-side enforcement point (a client is not a trusted
// boundary), so the allowlist is exactly what Gemini's vision endpoint
// supports, not an open-ended "image/*" pattern that would forward
// unsupported subtypes (e.g. image/svg+xml) straight into the estimation
// call.
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Gemini's estimation call can run long — no client-side timeout, and the
// in-progress UI holds for the full duration however long it takes
// (AD-9, Boundaries & Constraints). Vercel's default is 10s; this raises
// the ceiling to the max available on Hobby.
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: {
    descriptionText?: unknown;
    photoBase64?: unknown;
    photoMimeType?: unknown;
  };
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

  const hasDescriptionText = body.descriptionText !== undefined;
  const hasPhoto = body.photoBase64 !== undefined;

  // XOR — exactly one of text/photo per Entry, mirroring the preferences
  // route's pattern (Story 1.3) and the "no combined submission" rule.
  if (hasDescriptionText === hasPhoto) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_input",
          message: "Provide exactly one of descriptionText or photoBase64.",
        },
      },
      { status: 400 }
    );
  }

  let inputMode: InputMode;
  let estimationInput: EstimationInput;

  if (hasDescriptionText) {
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

    inputMode = "text";
    estimationInput = { mode: "text", description: descriptionText.trim() };
  } else {
    const photoBase64 = body.photoBase64;
    const photoMimeType = body.photoMimeType;

    if (typeof photoBase64 !== "string" || photoBase64.trim().length === 0) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: "Attach a photo before submitting." } },
        { status: 400 }
      );
    }

    if (typeof photoMimeType !== "string" || !SUPPORTED_IMAGE_MIME_TYPES.has(photoMimeType)) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: "Unrecognized photo format." } },
        { status: 400 }
      );
    }

    // Defense-in-depth re-check of the decoded size — the client already
    // compresses and rejects oversized photos (lib/compress-image.ts), but
    // a request is not a trusted boundary. `Buffer.byteLength(str,
    // "base64")` never throws and doesn't actually validate the encoding
    // (it estimates from character count) — a genuine round-trip decode is
    // required to catch malformed base64 here rather than forwarding it to
    // Gemini. Never logs `photoBase64` itself (AD-4) — only the computed
    // byte length, on failure.
    const decodedPhoto = Buffer.from(photoBase64, "base64");
    if (decodedPhoto.toString("base64") !== photoBase64) {
      return NextResponse.json(
        { error: { code: "invalid_input", message: "Couldn't read that photo — try again." } },
        { status: 400 }
      );
    }
    const decodedByteLength = decodedPhoto.byteLength;

    if (decodedByteLength > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_input",
            message: "That photo is too large — pick a smaller photo.",
          },
        },
        { status: 400 }
      );
    }

    inputMode = "photo";
    estimationInput = { mode: "photo", base64: photoBase64, mimeType: photoMimeType };
  }

  const provider = new GeminiAdapter();

  let result;
  try {
    result = await provider.estimate(estimationInput);
  } catch (error) {
    // Never logs `estimationInput` — only the adapter's own error, which
    // carries call-failure metadata (status/message), never photo bytes
    // (AD-4, Boundaries & Constraints).
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
    await createEntry(user.id, inputMode, result.description, result.calories);
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
