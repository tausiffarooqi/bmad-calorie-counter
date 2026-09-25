"use client";

import { Button } from "@/components/ui/button";

interface FirstLoginPromptProps {
  // Same value the Daily view already computed for this load (Approach:
  // "the prompt shows the same remainingBudget value the Daily view already
  // computes — no separate budget calculation") — passed straight through
  // from useDailyView(), never recomputed here.
  remainingBudget: number;
  // Both buttons call this — resolving is a client-side-only state change
  // (Boundaries & Constraints): the server already marked the prompt shown
  // at Daily-view-load time (checkAndMarkFirstLoginPrompt()), so neither
  // button makes a second round-trip, and both lead to the exact same next
  // state (the normal Daily view). They differ only in copy/engagement
  // framing, never in what renders next — the copy difference is not "log a
  // meal" actually opening a logging dialog (that's a human decision, out
  // of this story's scope); it just dismisses the prompt and reveals the
  // Daily view's own Add Photo/Add Text buttons, same as "Not now".
  onResolve: () => void;
}

// DESIGN.md's Prompt card treatment (`{colors.card}` background,
// `{colors.border}` outline, `{rounded.md}`) — same visual family as the
// Entries list and Over-Target banner, no new visual pattern introduced
// (Acceptance Criteria). Deliberately excludes Story 4.2's greeting/
// tone-adaptive "yesterday" message and Story 4.4's breakfast-offer card
// (Boundaries & Constraints) — this card shows only the budget and the
// log-a-meal question.
export function FirstLoginPrompt({ remainingBudget, onResolve }: FirstLoginPromptProps) {
  return (
    <div className="w-full max-w-sm rounded-md border border-border bg-card p-4">
      <p className="text-sm text-foreground">
        Remaining budget today:{" "}
        <strong className="text-primary">{remainingBudget.toLocaleString()} calories</strong>.
        Log a meal now?
      </p>
      <div className="mt-3 flex gap-3">
        <Button onClick={onResolve} className="flex-1">
          Log a meal
        </Button>
        <Button onClick={onResolve} variant="outline" className="flex-1">
          Not now
        </Button>
      </div>
    </div>
  );
}
