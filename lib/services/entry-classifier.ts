// Relative import, not the "@/*" alias — this file is exercised directly by
// entry-classifier.test.ts under plain `node --test` (no bundler/path-alias
// resolution available there, unlike day-boundary.ts's test, which has no
// imports of its own to worry about).
import { CLASSIFICATIONS, MAX_DESCRIPTION_LENGTH, type Classification, type InputMode } from "../constants.ts";

// Word/phrase matches driving the rule-based (text-mode) path, matched on
// word boundaries (matchesAny() below) rather than plain substrings — a
// plain substring match would wrongly fire on partial words nested inside
// unrelated ones (e.g. "rice" inside "price", "sub" inside "subway", "bowl"
// inside "bowling"). Checked case-insensitively. Meal keywords are checked
// first — a description naming an actual dish classifies as `meal` even if
// it also mentions a drink (e.g. "cheeseburger and a soda") — and the
// snack/beverage list only matters when no meal keyword matched. Lowercase,
// since classifyText() lowercases the description before matching.
const MEAL_KEYWORDS = [
  "burger",
  "cheeseburger",
  "hamburger",
  "sandwich",
  "sub",
  "wrap",
  "burrito",
  "taco",
  "pizza",
  "pasta",
  "spaghetti",
  "lasagna",
  "noodles",
  "rice",
  "curry",
  "steak",
  "chicken",
  "fish",
  "salmon",
  "salad",
  "soup",
  "stew",
  "casserole",
  "fries",
  "plate",
  "bowl",
  "dinner",
  "lunch",
  "breakfast",
  "entree",
  "entrée",
  "meal",
];

const SNACK_BEVERAGE_KEYWORDS = [
  "soda",
  "cola",
  "coffee",
  "tea",
  "juice",
  "smoothie",
  "shake",
  "chips",
  "crisps",
  "candy",
  "chocolate",
  "cookie",
  "cracker",
  "popcorn",
  "granola bar",
  "protein bar",
  "snack",
  "drink",
  "beverage",
  "pretzel",
  "yogurt",
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary match, not a plain substring — see the keyword lists' own
// comment for why (avoids "rice" matching inside "price", etc.).
function matchesAny(lowerDescription: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) =>
    new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(lowerDescription)
  );
}

// Rule-based path for text-mode Entries (Boundaries & Constraints) — free,
// instant, synchronous, can't fail. Falls back to `snack_beverage` when
// nothing matches — the safer default (Design Notes): under-classifying a
// real meal only keeps a Recommendation card showing a bit longer, while
// over-classifying a snack would silently consume a Meal Slot.
export function classifyText(description: string): Classification {
  const lowerDescription = description.toLowerCase();
  if (matchesAny(lowerDescription, MEAL_KEYWORDS)) return "meal";
  if (matchesAny(lowerDescription, SNACK_BEVERAGE_KEYWORDS)) return "snack_beverage";
  return "snack_beverage";
}

const GEMINI_CLASSIFICATION_ENDPOINT =
  // Same `gemini-flash-lite-latest` model as gemini-adapter.ts's estimation
  // call (Design Notes) — but this is a wholly separate request/schema, not
  // a reuse of GeminiAdapter/EstimationProvider (AD-2, Boundaries &
  // Constraints).
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

type ClassificationPayload = {
  classification: Classification;
};

// Exported for direct unit testing (entry-classifier.test.ts) — otherwise
// only used internally by classifyViaGemini() below.
export function isValidPayload(value: unknown): value is ClassificationPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.classification === "string" &&
    (CLASSIFICATIONS as readonly string[]).includes(payload.classification)
  );
}

// Exported for direct unit testing (entry-classifier.test.ts) — otherwise
// only used internally by classifyViaGemini() below.
export function buildClassificationPrompt(description: string): string {
  // Same """ -> ''' defense-in-depth as gemini-adapter.ts's prompt builders
  // — the structural + enum validation below is the real backstop.
  const sanitizedDescription = description.replaceAll('"""', "'''");

  return `You are a food-logging classifier for a calorie-tracking app. A food description was generated for a photo of something a user ate:

"""
${sanitizedDescription}
"""

Decide whether this represents a full Meal or a Snack/Beverage.

- Classify as "meal" if it describes a substantial, sit-down-style meal (e.g. a plate of food, a sandwich/burger with sides, a bowl of a main dish, a combination of entree and sides).
- Classify as "snack_beverage" for anything smaller, or a drink (e.g. a piece of fruit, chips, candy, a cookie, coffee, soda, a light snack).

Respond only via the provided JSON schema.`;
}

// Dedicated Gemini call for the photo-mode path (Boundaries & Constraints,
// AD-2, Design Notes) — its own request/schema, never reusing
// GeminiAdapter/EstimationProvider. Classifies Gemini's own generated
// description text only — never the photo bytes themselves (Boundaries &
// Constraints, Intent). Any failure (network/API/parse/validation) throws,
// exactly like GeminiAdapter.estimate() — never guesses a classification
// (I/O & Edge-Case Matrix).
export async function classifyViaGemini(description: string): Promise<Classification> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set — check .env.local.");
  }

  // Same ceiling the user-text path enforces before its estimation call
  // (route.ts) — this path's input is Gemini's own generated description,
  // not user input, but the prompt-size/cost bound should still apply.
  const boundedDescription = description.slice(0, MAX_DESCRIPTION_LENGTH);

  const response = await fetch(GEMINI_CLASSIFICATION_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: buildClassificationPrompt(boundedDescription) }],
        },
      ],
      generationConfig: {
        thinkingConfig: { thinkingLevel: "LOW" },
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            classification: { type: "STRING", enum: [...CLASSIFICATIONS] },
          },
          required: ["classification"],
        },
      },
    }),
  });

  // A non-2xx response is a genuine call failure — propagates as a real
  // exception, matching GeminiAdapter.estimate()'s convention.
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Gemini classify() call failed: ${response.status} ${response.statusText} ${errorBody}`.trim()
    );
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini classify() call returned no content.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Gemini classify() call returned malformed JSON.");
  }

  // Structural + enum validation — a responseSchema constrains the JSON
  // shape but Gemini could still return something outside the two allowed
  // values; treated as a genuine call failure, never coerced/guessed.
  if (!isValidPayload(payload)) {
    throw new Error(`Gemini classify() call returned an invalid payload: ${text}`);
  }

  return payload.classification;
}

// Single dispatch entry point (Code Map). Text-mode Entries always use the
// rule-based path; photo-mode Entries always use the Gemini path (Boundaries
// & Constraints) — never depends on which EstimationProvider produced
// `description` (AD-2), since both paths consume plain text only.
export async function classify(
  description: string,
  inputMode: InputMode
): Promise<Classification> {
  if (inputMode === "text") {
    return classifyText(description);
  }
  return classifyViaGemini(description);
}
