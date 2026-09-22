import type { EstimationInput, EstimationProvider, EstimationResult } from "./types";

const GEMINI_MODEL_ENDPOINT =
  // `gemini-flash-lite-latest` (→ `gemini-3.5-flash-lite`), not the full
  // `gemini-flash-latest`/`gemini-3.8-flash` tier (AD-2, amended
  // 2026-09-21): the full tier's free-tier key hit persistent 503s and a
  // hard 20-requests/day cap during Story 2.1's live verification. The
  // lite tier was live-tested against this exact prompt/schema (correct
  // estimates, correct insufficient-detail judgment, confirmed multimodal
  // image support for Story 2.2) with zero 503s — more reliable, not just
  // higher-quota. See ARCHITECTURE-SPINE.md's Gemini model-selection
  // gotcha for the full history.
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type EstimationPayload = {
  sufficient_detail: boolean;
  description: string;
  calories: number;
};

// Postgres `integer` max — same sane real-world ceiling used elsewhere in
// this codebase for a calorie value (see lib/constants.ts). A structured
// responseSchema constrains the JSON *shape*, not its *validity* — Gemini
// can still return a missing/negative/absurd value, so this is the actual
// enforcement point before anything reaches the DB.
const MAX_PLAUSIBLE_CALORIES = 20_000;

function isValidPayload(value: unknown): value is EstimationPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  if (typeof payload.sufficient_detail !== "boolean") return false;

  // The model's own "not enough detail" judgment — calories/description
  // aren't meaningful in this branch, so they're not validated.
  if (payload.sufficient_detail === false) return true;

  return (
    typeof payload.description === "string" &&
    payload.description.trim().length > 0 &&
    typeof payload.calories === "number" &&
    Number.isFinite(payload.calories) &&
    payload.calories >= 0 &&
    payload.calories <= MAX_PLAUSIBLE_CALORIES
  );
}

// The only bound EstimationProvider implementation for MVP (AD-2). Calls
// Gemini directly via `fetch()` — no SDK dependency, matching this
// codebase's existing minimal-dependency pattern (see lib/supabase/*).
export class GeminiAdapter implements EstimationProvider {
  async estimate(input: EstimationInput): Promise<EstimationResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set — check .env.local.");
    }

    // Same responseSchema/isValidPayload validation drives both branches —
    // only the request `parts` differ (text prompt vs. vision prompt + the
    // inline image). The photo's bytes are inlined directly into this one
    // request body and never touch disk, the DB, or Supabase Storage (AD-4).
    const parts =
      input.mode === "text"
        ? [{ text: buildTextPrompt(input.description) }]
        : [
            { text: buildPhotoPrompt() },
            { inlineData: { mimeType: input.mimeType, data: input.base64 } },
          ];

    const response = await fetch(GEMINI_MODEL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          thinkingConfig: { thinkingLevel: "LOW" },
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              sufficient_detail: { type: "BOOLEAN" },
              description: { type: "STRING" },
              calories: { type: "INTEGER" },
            },
            required: ["sufficient_detail", "description", "calories"],
          },
        },
      }),
    });

    // A non-2xx response is a genuine call failure — propagates as a real
    // exception (AD-2), distinct from the model's own
    // `sufficient_detail: false` judgment below.
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `Gemini estimate() call failed: ${response.status} ${response.statusText} ${errorBody}`.trim()
      );
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini estimate() call returned no content.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("Gemini estimate() call returned malformed JSON.");
    }

    // Structural + bounds validation — a responseSchema constrains the
    // JSON shape but not the values (missing fields, NaN, negative or
    // absurd calories, an empty description on an ostensibly successful
    // result all still parse as valid JSON). Treated as a genuine call
    // failure, not silently coerced or misread as "insufficient detail".
    if (!isValidPayload(payload)) {
      throw new Error(
        `Gemini estimate() call returned an invalid payload: ${text}`
      );
    }

    // The model's own judgment on detail-sufficiency drives the
    // ok/insufficient-detail branch — never a client-side heuristic.
    if (!payload.sufficient_detail) {
      return { ok: false, reason: "insufficient_detail" };
    }

    return {
      ok: true,
      description: payload.description,
      calories: Math.round(payload.calories),
    };
  }
}

function buildTextPrompt(description: string): string {
  // Defense-in-depth against the description breaking out of the quoted
  // block via its own """ sequence and appending instructions of its own
  // — the structural payload validation above is the real backstop
  // (any resulting bad output still gets rejected by isValidPayload), but
  // there's no reason to leave the delimiter trivially spoofable too.
  const sanitizedDescription = description.replaceAll('"""', "'''");

  return `You are a nutrition estimation assistant for a calorie-tracking app. A user submitted this free-text meal description:

"""
${sanitizedDescription}
"""

Decide whether the description has enough detail (identifiable food items, and roughly how much of each) to produce a reasonable calorie estimate.

- If it does NOT have enough detail (e.g. too vague, no identifiable food, no sense of quantity), set "sufficient_detail" to false. Do not guess a calorie value in this case — set "calories" to 0 and "description" to the original text unchanged.
- If it DOES have enough detail, set "sufficient_detail" to true, set "description" to a concise, cleaned-up restatement of what was eaten, and set "calories" to your best single-integer estimate of the total calories for everything described. Never return a range — always one whole number.

Respond only via the provided JSON schema.`;
}

// Vision-branch prompt (Story 2.2). Classification (Meal vs. Snack/Beverage)
// is explicitly out of scope here — Epic 3 adds that as a separate
// downstream call; this prompt only judges food-identifiability and
// estimates calories, exactly like the text branch.
function buildPhotoPrompt(): string {
  return `You are a nutrition estimation assistant for a calorie-tracking app. A user submitted a photo of a meal they ate.

Look at the image and decide whether it clearly shows identifiable food — in focus, lit, and framed well enough — to produce a reasonable calorie estimate.

- If the image is NOT clearly food (e.g. blurry, too dark, too distant, cropped oddly, or not food at all), set "sufficient_detail" to false. Do not guess a calorie value in this case — set "calories" to 0 and "description" to a short neutral note (e.g. "photo unclear").
- If the image DOES clearly show identifiable food, set "sufficient_detail" to true, set "description" to a concise description of what's shown (identifiable items and roughly how much of each), and set "calories" to your best single-integer estimate of the total calories for everything shown. Never return a range — always one whole number.

Respond only via the provided JSON schema.`;
}
