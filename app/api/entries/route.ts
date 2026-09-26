import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEntry, getEntriesForDay } from "@/lib/services/entries";
import { classify } from "@/lib/services/entry-classifier";
import { dayBoundary, isValidTimeZone, previousDayBoundary } from "@/lib/services/day-boundary";
import {
  getProfile,
  checkAndMarkFirstLoginPrompt,
  breakfastOfferAcceptedToday,
} from "@/lib/services/profiles";
import { computeRemainingBudget } from "@/lib/services/budget-engine";
import { getRecommendations, isBreakfastOfferWindow } from "@/lib/services/recommendation-engine";
import { getToneMessageOutcome, TONE_MESSAGES } from "@/lib/services/tone-message";
import { GeminiAdapter } from "@/lib/estimation/gemini-adapter";
import type { EstimationInput } from "@/lib/estimation/types";
import {
  MAX_DESCRIPTION_LENGTH,
  type Classification,
  type DietaryPreference,
  type InputMode,
} from "@/lib/constants";
import { MAX_PHOTO_BYTES } from "@/lib/compress-image";

// `profiles.dietary_preference` is a plain `text` column (schema.ts), not a
// DB-level enum — every write path already validates against
// DIETARY_PREFERENCES before it lands (preferences route, registration's
// DB default), so this narrows the read side the same way
// preferences/preferences-form.tsx already does for its own untrusted-string
// prop, rather than trusting the column's static type. `profiles.dietary_
// preference` always resolves (defaults to `non_vegetarian`, Story 1.1) —
// this never hits an undefined case (Boundaries & Constraints).
function toDietaryPreference(value: string): DietaryPreference {
  return value === "vegetarian" ? "vegetarian" : "non_vegetarian";
}

// `entries.classification` is likewise a plain `text` column — narrowed the
// same explicit, defensive way as toDietaryPreference() above, for
// getRecommendations()'s input. Every write path (createEntry(), called
// only with entry-classifier.ts's Classification output — AD-1) already
// guarantees only "meal"/"snack_beverage" ever lands there, so this is a
// type-level narrowing of an already-guaranteed value, not new runtime
// validation.
function toRecommendationEntries(
  rows: { classification: string }[]
): { classification: Classification }[] {
  return rows.map((row) => ({
    classification: row.classification === "meal" ? "meal" : "snack_beverage",
  }));
}

// The client (lib/compress-image.ts) only ever produces "image/jpeg" — this
// is the actual server-side enforcement point (a client is not a trusted
// boundary), so the allowlist is exactly what Gemini's vision endpoint
// supports, not an open-ended "image/*" pattern that would forward
// unsupported subtypes (e.g. image/svg+xml) straight into the estimation
// call.
const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Gemini's estimation call can run long — no client-side timeout, and the
// in-progress UI holds for the full duration however long it takes
// (AD-9, Boundaries & Constraints). Photo-mode Entries make a second,
// sequential Gemini call after estimation (Story 3.1's classification path,
// entry-classifier.ts), so this budget covers both calls together, not just
// estimation. Vercel's default is 10s; this raises the ceiling to the max
// available on Hobby.
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: {
    descriptionText?: unknown;
    photoBase64?: unknown;
    photoMimeType?: unknown;
    tz?: unknown;
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

  // New in this story (Code Map: "mirroring GET's query param") — needed to
  // compute this response's remainingBudget/recommendations (FR-9) against
  // the correct local day/hour. Validated up front, before the Gemini call,
  // the same 400 pattern as the XOR check right below (I/O & Edge-Case
  // Matrix: "missing/invalid tz ... 400, same error shape").
  const tz = body.tz;
  if (typeof tz !== "string" || !isValidTimeZone(tz)) {
    return NextResponse.json(
      { error: { code: "invalid_input", message: "A valid tz field is required." } },
      { status: 400 }
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
    result = await provider.estimate(estimationInput, request.signal);
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

  // Epic 2 retro action item: the client already believes this submission
  // was cancelled (it closed the dialog, which aborts its own fetch) — the
  // Gemini call above may have already been in flight and completed
  // regardless (fetch()'s AbortSignal only rejects the *client's* promise,
  // it doesn't retroactively undo billed work), but nothing downstream of
  // this point (classification, the DB write) should still happen for a
  // request nobody is waiting on anymore.
  if (request.signal.aborted) {
    console.error("Submission aborted by client after estimation succeeded — skipping entry creation.");
    return NextResponse.json(
      { error: { code: "aborted", message: "Request was cancelled." } },
      { status: 499 }
    );
  }

  // Epic 2 retro action item: MAX_DESCRIPTION_LENGTH's own comment
  // documents it as bounding `entries.description_text`, but the check
  // above only ever applied to the user-typed input on the text path
  // (`body.descriptionText`) — `result.description` (Gemini's own cleaned
  // restatement on the text path, or an entirely model-generated
  // description with no user-typed input to bound at all on the photo
  // path) is what's actually persisted via `createEntry()` below, and had
  // no cap anywhere.
  if (result.description.length > MAX_DESCRIPTION_LENGTH) {
    result = { ...result, description: result.description.slice(0, MAX_DESCRIPTION_LENGTH) };
  }

  // Classification runs as a downstream step right after a successful
  // estimation, never inside the EstimationProvider adapter (AD-2, Story
  // 3.1). A classifier failure (Gemini path, photo mode) returns the same
  // error envelope as a createEntry() failure below — no entries row is
  // written, and a classification is never guessed (I/O & Edge-Case
  // Matrix) — but each stage logs its own distinct message so the two
  // failure modes stay distinguishable server-side.
  let classification;
  try {
    classification = await classify(result.description, inputMode);
  } catch (error) {
    console.error("Classification failed after successful estimation:", error);
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

  try {
    await createEntry(user.id, inputMode, result.description, result.calories, classification);
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

  // FR-9's response contract: every successful submission returns the
  // estimated calories, the updated Remaining Calorie Budget, and one
  // Recommendation per remaining Meal Slot, all together — never just the
  // calories alone. `recommendations` can come back `[]` for two distinct
  // reasons: every expected Meal Slot is already filled by an earlier Meal
  // (Story 3.3), or — after 10pm/before 5am (Story 3.4) — the Daily Calorie
  // Target has already been met or exceeded, which suppresses the window's
  // one expected slot entirely; `getRecommendations()` is the single place
  // both are decided. Re-fetches today's Entries + profile fresh (a second
  // read, not the pre-submission `rows`/`profile` from anywhere else in
  // this handler — there isn't one, since POST never fetched them before
  // now) so the just-created Entry above is itself included in both the
  // budget subtraction and the filled-slot count (Code Map).
  //
  // The Entry itself is already durably created above by this point — a
  // failure in this follow-up read/compute step must never be reported as
  // an `entry_creation_failed` error, since that message tells the user to
  // retry and a retry would create a duplicate Entry. Instead this falls
  // back to the pre-Story-3.3 success shape (`{ ok: true, calories }`,
  // omitting remainingBudget/recommendations) — still a genuine success
  // response, just without the enrichment this story adds.
  const now = new Date();
  let remainingBudget: number | undefined;
  let recommendations: ReturnType<typeof getRecommendations> | undefined;
  try {
    const { start, end } = dayBoundary(now, tz);
    const [freshRows, freshProfile] = await Promise.all([
      getEntriesForDay(user.id, start, end),
      getProfile(user.id),
    ]);

    // Mirrors GET's identical guard — a missing profile row for an
    // authenticated user indicates data corruption, not a normal state
    // (Code Map / Boundaries & Constraints).
    if (!freshProfile) {
      console.error(`No profile found for authenticated user ${user.id}`);
    } else {
      remainingBudget = computeRemainingBudget(freshProfile.dailyCalorieTarget, freshRows);
      // Story 4.4: threads the same 6th argument POST's recompute would
      // otherwise omit — using the just-fetched `freshProfile` above, no
      // extra query (Code Map).
      recommendations = getRecommendations(
        now,
        tz,
        toRecommendationEntries(freshRows),
        toDietaryPreference(freshProfile.dietaryPreference),
        remainingBudget,
        breakfastOfferAcceptedToday(freshProfile.breakfastOfferAcceptedAt, now, tz)
      );
    }
  } catch (error) {
    // Logged with its own distinct message so it's not confused with the
    // createEntry() failure above.
    console.error(
      "Failed to compute post-submission remainingBudget/recommendations:",
      error
    );
  }

  if (remainingBudget === undefined || recommendations === undefined) {
    return NextResponse.json({ ok: true, calories: result.calories });
  }

  return NextResponse.json({
    ok: true,
    calories: result.calories,
    remainingBudget,
    recommendations,
  });
}

// Returns the signed-in user's Entries for "today" — the 5am-to-next-5am
// local Day the caller's browser is currently in (AD-5). Reads go through
// `lib/services/entries.ts` alongside `createEntry` — still the sole code
// path touching `entries` (AD-1).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 401 if absent, matching POST's pattern (Code Map).
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthenticated", message: "You must be logged in." } },
      { status: 401 }
    );
  }

  const tz = new URL(request.url).searchParams.get("tz");
  if (!tz || !isValidTimeZone(tz)) {
    // Logged (the client also now surfaces a distinct load-error state —
    // see entries-list.tsx) so a systematic tz-validation failure (e.g. a
    // client/server ICU version mismatch on an IANA zone one side
    // recognizes and the other doesn't) is diagnosable server-side rather
    // than only visible as an unexplained user-facing error.
    console.error("Rejected GET /api/entries: invalid tz query param:", tz);
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

  // Timezone is client-detected and sent per-request, never stored (FR-14's
  // "no manual override" consequence — nothing to persist, Boundaries &
  // Constraints) — "today" is always computed fresh, from the server's own
  // current time, not a client-supplied timestamp. Wrapped in the same
  // try/catch as the DB read below — every fallible call in this handler
  // returns the app's `{ error: { code, message } }` envelope, never an
  // unhandled exception.
  const entriesFetchFailedResponse = () =>
    NextResponse.json(
      {
        error: {
          code: "entries_fetch_failed",
          message: "Couldn't load your entries — try again.",
        },
      },
      { status: 500 }
    );

  const now = new Date();

  let rows;
  let profile;
  // Hoisted out of the try block below (Story 4.2 Code Map: "reusing the
  // already-computed todayStart") — the tone-message computation further
  // down needs today's Day-start instant to derive yesterday's window, and
  // it runs after this whole block has already succeeded.
  let todayStart: Date;
  try {
    const { start, end } = dayBoundary(now, tz);
    todayStart = start;
    // Independent lookups against different tables (`entries`/`profiles`),
    // run concurrently — no second DB query against `entries` (Code Map),
    // just the one extra `profiles` lookup needed to compute
    // `remainingBudget` alongside it. Each has its own `.catch()` so a
    // failure is attributed to its actual source in the logs rather than
    // folded into one generic message (mirrors POST's classify-vs-
    // createEntry distinct-logging split, Story 3.1).
    [rows, profile] = await Promise.all([
      getEntriesForDay(user.id, start, end).catch((error) => {
        console.error("Failed to load today's entries:", error);
        throw error;
      }),
      getProfile(user.id).catch((error) => {
        console.error("Failed to load profile for remaining-budget computation:", error);
        throw error;
      }),
    ]);
  } catch {
    return entriesFetchFailedResponse();
  }

  // profiles.user_id is created at registration (Story 1.1) and never
  // deleted independently, so a missing row here would indicate data
  // corruption rather than a normal state to design around (mirrors
  // preferences/page.tsx's identical guard) — logged with its own distinct
  // message rather than folded into either query-failure catch above.
  if (!profile) {
    console.error(`No profile found for authenticated user ${user.id}`);
    return entriesFetchFailedResponse();
  }

  // Story 4.1: reads + (if needed) marks `lastFirstLoginPromptAt`, using the
  // `profile` this handler already fetched above (no redundant re-fetch)
  // and the same `now` the rest of this request is computed against (no
  // second, slightly-later instant). Deliberately run only *after* the
  // primary entries/profile reads above have already succeeded — never
  // inside that `Promise.all` — so a failure in either of those reads can
  // never leave this write committed for a Day the user was actually shown
  // an error instead of the prompt. Its own `.catch()` still falls back to
  // `false` rather than rethrowing — this signal is an enrichment on top of
  // the now-guaranteed-successful reads above, so a failure here must not
  // fail the whole response (mirrors POST's "enrichment failure falls back,
  // never fails the primary response" pattern).
  const showFirstLoginPrompt = await checkAndMarkFirstLoginPrompt(
    user.id,
    profile.lastFirstLoginPromptAt,
    now,
    tz
  ).catch((error) => {
    console.error("Failed to check/mark first-login prompt:", error);
    return false;
  });

  // `computeRemainingBudget()` is the single place this subtraction
  // happens (budget-engine.ts) — both Meal and Snack/Beverage Entries
  // count identically (FR-8), and the result is returned unclamped, even
  // when negative (Over-Target, Story 3.5's concern to detect/style).
  const remainingBudget = computeRemainingBudget(profile.dailyCalorieTarget, rows);

  // Story 4.4: computed from the already-fetched `profile.breakfastOfferAcceptedAt`
  // + `now`/`tz` (no extra query) — used both to decide the offer card's own
  // visibility below and as getRecommendations()'s new 6th argument (Code
  // Map).
  const breakfastAccepted = breakfastOfferAcceptedToday(
    profile.breakfastOfferAcceptedAt,
    now,
    tz
  );

  // Same `rows`/`profile` this handler already fetched above — no second
  // `entries` query (Code Map: "using the already-fetched rows/profile").
  // Wrapped in its own try/catch, same as every other fallible call in this
  // handler (getRecommendations() is pure/sync and shouldn't throw given
  // valid inputs, but this keeps the handler's own stated invariant true
  // regardless — "every fallible call ... returns the app's envelope,
  // never an unhandled exception").
  let recommendations: ReturnType<typeof getRecommendations>;
  try {
    recommendations = getRecommendations(
      now,
      tz,
      toRecommendationEntries(rows),
      toDietaryPreference(profile.dietaryPreference),
      remainingBudget,
      breakfastAccepted
    );
  } catch (error) {
    console.error("Failed to compute recommendations:", error);
    return entriesFetchFailedResponse();
  }

  // Story 4.4 (amended — see spec's Spec Change Log): deliberately excludes
  // `showFirstLoginPrompt` from this condition. That flag is one-shot-per-Day
  // (`checkAndMarkFirstLoginPrompt` sets it `true` only on the Day's very
  // first GET, `false` on every subsequent load), so ANDing on it made the
  // offer card structurally unable to ever reappear on a reload — contradicting
  // the frozen I/O matrix's "Decline, then reload same day before 10am ->
  // Offer card may reappear" row and the frozen Boundaries' "the two cards
  // ... resolve independently" clause (gating the second card on the first
  // card's own one-shot marker is itself a form of coupling the Boundaries
  // forbid). `entries.length === 0` alone is what actually persists correctly
  // across reloads within the same Day — never shown once a Meal/Snack is
  // logged, never during Over-Target State (`remainingBudget >= 0`, Story
  // 3.5's suppression reused as-is), and only before 10am
  // (`isBreakfastOfferWindow`, recommendation-engine.ts's own centralized
  // time-window decision, AD-6), and never once already accepted today
  // (`!breakfastAccepted`).
  const showBreakfastOffer =
    rows.length === 0 &&
    remainingBudget >= 0 &&
    isBreakfastOfferWindow(now, tz) &&
    !breakfastAccepted;

  // Story 4.2: computed only when the First-Login prompt is already showing
  // (Boundaries & Constraints: "Do not compute or return this message when
  // the First-Login prompt isn't showing") — avoids an unnecessary query
  // otherwise (Code Map). "Yesterday" is derived via `dayBoundary()` applied
  // one instant before today's Day-start — reusing the already-computed
  // `todayStart`, never separate date math (Approach) — and compared
  // against the *current* `profile.dailyCalorieTarget` (this app has no
  // historized/versioned target-per-Day, Boundaries & Constraints).
  let toneMessage: string | undefined;
  if (showFirstLoginPrompt) {
    // Enrichment on top of the now-guaranteed-successful reads above — a
    // failure here must not fail the whole response (mirrors this file's
    // own "enrichment failure falls back, never fails the primary
    // response" pattern used for checkAndMarkFirstLoginPrompt()/POST's
    // post-submission recompute above). Falls back to `undefined`, which
    // the response below omits — the First-Login prompt itself still
    // renders, just without its tone-message line. Split into two
    // try/catches (the DB read vs. the pure classify+lookup) so a failure
    // is attributed to the step that actually failed, matching the
    // Promise.all block above giving entries/profile their own distinct
    // log messages.
    let yesterdayRows: Awaited<ReturnType<typeof getEntriesForDay>> | undefined;
    try {
      const { start: yesterdayStart, end: yesterdayEnd } = previousDayBoundary(todayStart, tz);
      yesterdayRows = await getEntriesForDay(user.id, yesterdayStart, yesterdayEnd);
    } catch (error) {
      console.error("Failed to fetch yesterday's entries for tone message:", error);
    }

    if (yesterdayRows) {
      try {
        const outcome = getToneMessageOutcome(yesterdayRows, profile.dailyCalorieTarget);
        toneMessage = TONE_MESSAGES[outcome];
      } catch (error) {
        console.error("Failed to compute tone-adaptive message outcome:", error);
      }
    }
  }

  return NextResponse.json({
    entries: rows.map((row) => ({
      id: row.id,
      description: row.descriptionText,
      calories: row.calories,
      inputMode: row.inputMode,
      createdAt: row.createdAt,
    })),
    remainingBudget,
    recommendations,
    showFirstLoginPrompt,
    toneMessage,
    // Story 4.4: `breakfastOfferAccepted` lets the client know the slot is
    // active even outside the offer-card's own before-10am window (e.g. a
    // reload at 11am the same Day, still within the 5am-12pm Recommendation
    // window) — `showBreakfastOffer` is the card's own, narrower visibility
    // decision (Code Map).
    breakfastOfferAccepted: breakfastAccepted,
    showBreakfastOffer,
  });
}
