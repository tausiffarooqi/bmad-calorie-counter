"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogEntryDialog } from "@/app/log-entry-dialog";
import { LogPhotoDialog } from "@/app/log-photo-dialog";
import { EntriesList } from "@/app/entries-list";
import { useDailyView } from "@/hooks/use-daily-view";

// Temporary foundation showcase for Epic 0 (UX Foundation). Exercises the
// Muted Earth Editorial tokens (Story 0.1) and the global focus-visible
// ring (Story 0.2) so both can be visually verified before any real screen
// is built. Replaced by the actual Daily view in Epic 3.
export default function Home() {
  // Bumped by either dialog's onSuccess so EntriesList refetches and shows
  // a just-logged Entry without a page reload (Story 2.4 Code Map).
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpRefreshKey = () => setRefreshKey((key) => key + 1);

  // Single shared fetch (Story 3.2) feeding both the Remaining Calorie
  // Budget number and the Entries list below it — same `GET /api/entries`
  // call, same day-scoped read, no second fetch for the same data.
  // `recommendations` (Story 3.3) rides along on the same fetch.
  const { entries, remainingBudget, recommendations, loadError } = useDailyView(refreshKey);

  // The first fetch hasn't resolved (success or failure) yet — EXPERIENCE.md's
  // Cold-load State Pattern: a brief skeleton matching the eventual layout
  // (budget number, entries container), resolving the instant real data
  // arrives, never a separate loading screen.
  const firstLoadPending = remainingBudget === undefined && !loadError;

  // A valid, current budget value to actually render — false both before
  // the first resolution *and* whenever the latest fetch failed, so a
  // failed refetch after a previously-successful load never leaves the old,
  // now-stale number on screen with no error indication.
  const budgetReady = remainingBudget !== undefined && !loadError;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <Button asChild variant="ghost" size="icon" className="self-end">
        <a href="/preferences" aria-label="Open account settings" title="Open account settings">
          <Settings />
        </a>
      </Button>
      <p className="text-label uppercase text-muted-foreground">Remaining calories today</p>
      {/* Remaining Calorie Budget — the Daily view's single large numeric
          focal point (`display-number` role). Real, live value from
          useDailyView() (Story 3.2), replacing the old hardcoded "1,240"
          placeholder. Unclamped — can render negative (Over-Target), never
          rounded to zero (Boundaries & Constraints). Falls back to the same
          skeleton placeholder as the cold-load case (never the stale prior
          value) whenever the latest fetch failed. */}
      {budgetReady ? (
        <p className="font-sans text-display-number text-primary">
          {remainingBudget.toLocaleString()}
        </p>
      ) : (
        <div aria-hidden="true" className="h-[52px] w-32 animate-pulse rounded-md bg-muted" />
      )}
      {firstLoadPending ? (
        <div
          aria-hidden="true"
          className="h-20 w-full max-w-sm animate-pulse rounded-md bg-muted"
        />
      ) : (
        <EntriesList entries={entries} loadError={loadError} />
      )}
      {/* 0-2 real, data-driven Recommendation cards (Story 3.3) — one per
          still-open Meal Slot, lunch then dinner, replacing the old
          hardcoded single-card placeholder. Renders nothing at all when no
          Meal Slots remain (I/O & Edge-Case Matrix: "All expected slots
          filled ... [] - no cards"), never an empty-state placeholder.
          Gated on `!loadError`, mirroring `budgetReady`'s guard above — a
          failed refetch after a previously-successful load must never leave
          stale Recommendation cards on screen with no error indication. */}
      {!loadError && recommendations.map((recommendation) => (
        <div
          key={recommendation.slot}
          className="w-full max-w-sm rounded-lg border border-accent bg-card p-4"
        >
          {/* Eyebrow "{Slot} Recommendation" in sage/accent styling, per
              mockups/daily-view.html's `.rec-eyebrow`. */}
          <p className="text-label uppercase text-accent">
            {recommendation.slot} Recommendation
          </p>
          <p className="font-[family-name:var(--font-recommendation)] text-recommendation italic text-foreground">
            &ldquo;{recommendation.text}&rdquo;
          </p>
        </div>
      ))}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex gap-3">
          <LogPhotoDialog onSuccess={bumpRefreshKey} />
          <LogEntryDialog onSuccess={bumpRefreshKey} />
        </div>
        {/* Persistent, non-dismissible notice (FR-21) — small print, no
            card/border treatment, never a dialog. Wired via aria-describedby
            on the "Add Photo" button so assistive tech hears this before the
            native picker takes over, not just sighted users reading nearby
            text. */}
        <p id="photo-only-notice" className="text-xs text-muted-foreground">
          Meal photos only, please — no other kinds of photos.
        </p>
      </div>
      {/* Plain, non-shadcn interactive element — proves the global
          :focus-visible rule (Story 0.2) applies beyond Button. */}
      <a href="#" className="text-sm text-primary underline-offset-4 hover:underline">
        Log in
      </a>
    </div>
  );
}
