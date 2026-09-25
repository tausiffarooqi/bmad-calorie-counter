// AD-1's single source of truth for "how did yesterday go, and what does the
// First-Login prompt say about it" (Story 4.2, Epic 4 Technical Decisions:
// "a distinct query shape from anything else in this epic"). Pure and sync —
// callers own fetching yesterday's Entries (already `dayBoundary()`-filtered,
// one instant before today's Day-start — never separate date math) and the
// current `dailyCalorieTarget`; this never queries the DB itself, mirroring
// budget-engine.ts's "one function, one call site" pattern.
export type ToneMessageOutcome = "within_target" | "over_target" | "neutral";

// Static, versioned lookup (Epic 4 Technical Decisions: "Recommendation
// content stays a static, versioned lookup" — same pattern applied here) —
// no per-user personalization, no external API/LLM call. Copy follows the
// approved "supportive, never shaming" rule (FR-18):
// - within_target: the one pre-approved example, reused verbatim (Boundaries
//   & Constraints).
// - over_target: authored copy reusing the "fresh start" framing already
//   approved for the Over-Target banner (Story 3.5), for tonal consistency,
//   while staying past-tense/reflective (Design Notes).
// - neutral: authored copy that deliberately never mentions "yesterday" —
//   it must read naturally both for a returning user who logged nothing
//   yesterday and for a brand-new user for whom "yesterday" doesn't exist
//   (Design Notes).
export const TONE_MESSAGES: Record<ToneMessageOutcome, string> = {
  within_target: "You stayed within your target yesterday — nice, steady work.",
  over_target: "Yesterday went over target — today's a fresh start.",
  neutral: "Here's to a good day of tracking.",
};

// Classifies yesterday's outcome from yesterday's summed Entry calories vs.
// the *current* `dailyCalorieTarget` (this app has no historized/versioned
// target-per-Day — an acceptable simplification, not a new gap this story
// introduces, per Boundaries & Constraints). Zero Entries yesterday —
// including a brand-new account with no prior Day at all, which looks
// identical to the caller (Approach) — always produces `"neutral"`, never a
// fabricated within/over-target result. "Within target" means
// `consumed <= target` (exactly-at-target counts as within, not over — same
// precedent as Story 3.4's "met exactly" treatment).
export function getToneMessageOutcome(
  yesterdayEntries: { calories: number }[],
  dailyCalorieTarget: number
): ToneMessageOutcome {
  if (yesterdayEntries.length === 0) {
    return "neutral";
  }

  const consumed = yesterdayEntries.reduce((sum, entry) => sum + entry.calories, 0);
  return consumed <= dailyCalorieTarget ? "within_target" : "over_target";
}
