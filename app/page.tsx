"use client";

import { useState } from "react";
import { Settings, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogEntryDialog } from "@/app/log-entry-dialog";
import { LogPhotoDialog } from "@/app/log-photo-dialog";
import { EntriesList } from "@/app/entries-list";
import { FirstLoginPrompt } from "@/app/first-login-prompt";
import { BreakfastOfferCard } from "@/app/breakfast-offer-card";
import { useDailyView } from "@/hooks/use-daily-view";
import { getClientTimeZone } from "@/lib/get-client-timezone";

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
  // `showFirstLoginPrompt` (Story 4.1) tells this load "the server just
  // marked today's First-Login prompt shown" — the server-side write
  // already happened by the time this resolves (Boundaries & Constraints),
  // so nothing here writes anything back.
  const {
    entries,
    remainingBudget,
    recommendations,
    showFirstLoginPrompt,
    toneMessage,
    showBreakfastOffer,
    loadError,
  } = useDailyView(refreshKey);

  // Local-only "the user already tapped one of the prompt's two buttons
  // this render" flag (Story 4.1 Code Map) — resolving is purely a
  // client-side state change; the server already marked the prompt shown
  // at load time, so there's no second round-trip to await here. Reset
  // implicitly on remount/reload (a fresh fetch after that would come back
  // with `showFirstLoginPrompt: false` anyway, since the server already
  // marked it shown).
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Story 4.4: the breakfast-offer card's own local "declined this page
  // session" flag — client-only, no persistence for decline (Boundaries &
  // Constraints: "Do not persist a decline"), same reset-on-remount shape as
  // `promptDismissed` above. Resolves independently of `promptDismissed` —
  // accepting/declining one never depends on or blocks the other (Boundaries
  // & Constraints).
  const [breakfastOfferDismissed, setBreakfastOfferDismissed] = useState(false);

  // Persists the acceptance server-side, then bumps `refreshKey` the same
  // way the logging dialogs already do (Code Map: "no separate
  // response-shape invention") so the next GET picks up the newly-active
  // breakfast slot. A failed POST still resolves the card locally (falls
  // through to bumpRefreshKey either way) — accepting is never a dead end,
  // it just won't have persisted this time.
  async function handleAcceptBreakfastOffer() {
    try {
      await fetch("/api/breakfast-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tz: getClientTimeZone() }),
      });
    } catch (error) {
      console.error("Failed to accept breakfast offer:", error);
    }
    bumpRefreshKey();
  }

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

  // Over-Target State (Story 3.5) — derived client-side from the same
  // `remainingBudget` sign the API already returns, no new response field.
  // Strictly negative only ("exceeding," not "meeting exactly" — that's
  // Story 3.4's unchanged "done for the day" case). Mutually exclusive with
  // the Recommendation cards below: exactly one of the two ever renders.
  const isOverTarget = remainingBudget !== undefined && remainingBudget < 0;

  // Story 4.1: the very first Daily view load of a new Day (per the server's
  // `showFirstLoginPrompt`) renders the First-Login prompt instead of the
  // normal Daily view content below the budget number, until resolved
  // (Approach) — gated on `budgetReady` the same way every other
  // `remainingBudget`-dependent branch above already is, so a failed fetch
  // (`loadError`) never shows the prompt with a stale/undefined budget.
  // Also requires `entries.length === 0` (amended Boundaries & Constraints)
  // — already-logged Entries for today (e.g. from another device/tab)
  // must never be hidden behind the prompt.
  const showPrompt =
    budgetReady && showFirstLoginPrompt && entries.length === 0 && !promptDismissed;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <div className="flex w-full justify-end gap-1">
        {/* Story 5.1: nav link to the new Historical Trends view (Code Map)
            — same icon-only `Button asChild variant="ghost" size="icon"`
            treatment as the existing Settings control right beside it,
            with its own accessible name. */}
        <Button asChild variant="ghost" size="icon">
          <a href="/trends" aria-label="View historical trends" title="View historical trends">
            <TrendingUp />
          </a>
        </Button>
        <Button asChild variant="ghost" size="icon">
          <a href="/preferences" aria-label="Open account settings" title="Open account settings">
            <Settings />
          </a>
        </Button>
      </div>
      {/* Story 4.1: this top-level header duplicates the same figure the
          First-Login prompt card's own "Remaining budget today: N calories"
          text already shows — hidden whenever the prompt is showing so the
          prompt card is the sole place the budget figure appears in that
          state (matches the mockup's single-mention design). */}
      {!showPrompt && (
        <>
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
        </>
      )}
      {showPrompt ? (
        // Story 4.1: replaces the entries list, Recommendation cards/
        // Over-Target banner, and the Add Photo/Add Text buttons all at
        // once — "instead of the normal Daily view ... until the user
        // resolves it" (Approach). Both buttons resolve to the same next
        // state (Boundaries & Constraints), so `onResolve` is the same
        // callback either way.
        <>
          {/* Story 4.2: its own small text line above the existing prompt
              card (Approach) — never inside FirstLoginPrompt, which stays
              frozen to budget + question (Boundaries & Constraints: "Do not
              touch Story 4.1's FirstLoginPrompt component itself"). Only
              ever present alongside `showFirstLoginPrompt` (the server never
              computes it otherwise), so no separate gating is needed here.
              Wrapped with FirstLoginPrompt in its own tight-gap column
              rather than left as bare Fragment children of the page's outer
              `gap-6` flex-col — that would space the message from the card
              exactly as far apart as unrelated major page sections,
              contradicting "immediately above". */}
          <div className="flex w-full max-w-sm flex-col items-center gap-2">
            {toneMessage && (
              <p className="w-full text-sm text-muted-foreground">{toneMessage}</p>
            )}
            <FirstLoginPrompt
              remainingBudget={remainingBudget}
              onResolve={() => setPromptDismissed(true)}
            />
          </div>
          {/* Story 4.4: card 2, stacked below card 1 (mockup) — resolves
              independently of the log-a-meal ask above (Boundaries &
              Constraints: "the two cards ... resolve independently"), never
              merged into one compound question. Same conditional expression
              as the second render position below, just a different position
              in the tree (Code Map). */}
          {showBreakfastOffer && !breakfastOfferDismissed && (
            <BreakfastOfferCard
              onAccept={handleAcceptBreakfastOffer}
              onDecline={() => setBreakfastOfferDismissed(true)}
            />
          )}
        </>
      ) : (
        <>
          {firstLoadPending ? (
            <div
              aria-hidden="true"
              className="h-20 w-full max-w-sm animate-pulse rounded-md bg-muted"
            />
          ) : (
            <EntriesList entries={entries} loadError={loadError} />
          )}
          {/* Story 4.4: second render position — the log-a-meal prompt has
              already been dismissed (Key Flow: "a third card appears above
              the other two"), so this is the same conditional expression as
              the first position above, immediately before the Over-Target
              banner/Recommendation-cards block (Code Map). */}
          {showBreakfastOffer && !breakfastOfferDismissed && (
            <BreakfastOfferCard
              onAccept={handleAcceptBreakfastOffer}
              onDecline={() => setBreakfastOfferDismissed(true)}
            />
          )}
          {/* 0-2 real, data-driven Recommendation cards (Story 3.3) — one per
              still-open Meal Slot, lunch then dinner, replacing the old
              hardcoded single-card placeholder. Renders nothing at all when no
              Meal Slots remain (I/O & Edge-Case Matrix: "All expected slots
              filled ... [] - no cards"), never an empty-state placeholder.
              Gated on `!loadError`, mirroring `budgetReady`'s guard above — a
              failed refetch after a previously-successful load must never leave
              stale Recommendation cards on screen with no error indication. */}
          {/* Over-Target banner (Story 3.5) — replaces every Recommendation
              card at once, whenever `remainingBudget < 0`, at any time of day;
              never rendered together with a Recommendation card (mutually
              exclusive with the `!isOverTarget` branch below). Same clay/
              `primary` tone as the budget number and primary actions — never
              shadcn's `destructive`/red (DESIGN.md, FR-18) — per the
              "supportive, never shaming" rule. Gated on `!loadError` the same
              way Recommendation cards already are, so a failed refetch after a
              prior over-target load never leaves a stale banner on screen. */}
          {!loadError && isOverTarget && (
            <div className="w-full max-w-sm rounded-md border border-primary bg-card p-4">
              {/* Plain body text (no `{typography.recommendation}`/italic Lora —
                  DESIGN.md reserves that role for the Recommendation card only;
                  the Over-Target banner's own component entry specifies just
                  background/border/foreground/radius). */}
              <p className="text-sm text-primary">
                {Math.abs(remainingBudget).toLocaleString()} calories over target today. No
                recommendation for now — tomorrow&apos;s a fresh start.
              </p>
            </div>
          )}
          {!loadError && !isOverTarget && recommendations.map((recommendation) => (
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
        </>
      )}
      {/* Plain, non-shadcn interactive element — proves the global
          :focus-visible rule (Story 0.2) applies beyond Button. */}
      <a href="#" className="text-sm text-primary underline-offset-4 hover:underline">
        Log in
      </a>
    </div>
  );
}
