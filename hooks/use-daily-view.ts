"use client";

import { useEffect, useState } from "react";
import { getClientTimeZone } from "@/lib/get-client-timezone";
import { isUnauthenticatedErrorBody, redirectToLogin } from "@/lib/handle-session-expiry";
import type { Recommendation } from "@/lib/services/recommendation-engine";

export interface Entry {
  id: string;
  description: string;
  calories: number;
  inputMode: string;
  createdAt: string;
}

interface EntriesApiResponse {
  entries?: Entry[];
  remainingBudget?: number;
  recommendations?: Recommendation[];
  showFirstLoginPrompt?: boolean;
  // Story 4.2: omitted/undefined whenever `showFirstLoginPrompt` is false —
  // the server never computes it in that case (Boundaries & Constraints).
  toneMessage?: string;
  // Story 4.4: whether today's pre-10am breakfast offer has already been
  // accepted (active even outside the offer card's own window) and whether
  // the offer card itself should render right now.
  breakfastOfferAccepted?: boolean;
  showBreakfastOffer?: boolean;
}

// Shared fetch for the Daily view — one call to `GET /api/entries` feeding
// both the Remaining Calorie Budget number and the Entries list, instead of
// two components independently fetching the same day-scoped data (Code
// Map). Extracted from Story 2.4's EntriesList, which now becomes purely
// presentational.
//
// `refreshKey` is bumped by the host page whenever either logging dialog's
// `onSuccess` fires (Story 2.4's mechanism), so a just-logged Entry's effect
// on both the budget and the list shows up without a page reload.
export function useDailyView(refreshKey: number) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [remainingBudget, setRemainingBudget] = useState<number | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  // Epic 4 retro action item: latches "the First-Login prompt was shown
  // this session" the first time a fetch's `showFirstLoginPrompt` comes
  // back true, instead of exposing that raw one-shot server flag directly.
  // `checkAndMarkFirstLoginPrompt()` (profiles.ts) only ever returns `true`
  // on the Day's very first GET — accepting the (unrelated) breakfast offer
  // bumps `refreshKey` too, forcing a second GET that legitimately comes
  // back `false`, which was silently collapsing the still-open prompt (and
  // Story 4.2's tone message with it) in app/page.tsx even though the user
  // never touched either of the prompt's own two buttons. Set inside this
  // hook's own fetch-resolution callback below — the standard "setState in
  // response to an external system's update" data-fetching pattern, not a
  // derived effect reacting to already-rendered state — so once latched
  // `true`, only app/page.tsx's own `promptDismissed` (set by those two
  // buttons) or a real `entries.length > 0` can hide the prompt again.
  const [promptShownThisSession, setPromptShownThisSession] = useState(false);
  const [toneMessage, setToneMessage] = useState<string | undefined>(undefined);
  const [breakfastOfferAccepted, setBreakfastOfferAccepted] = useState(false);
  const [showBreakfastOffer, setShowBreakfastOffer] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Client-detected, sent per-request, never stored (FR-14 — Boundaries
      // & Constraints).
      const tz = getClientTimeZone();

      let response: Response;
      try {
        response = await fetch(`/api/entries?tz=${encodeURIComponent(tz)}`);
      } catch {
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;

      if (response.redirected) {
        // Session expired while this view was mounted — same handling as
        // the logging dialogs' POST flow (hooks/use-entry-submission.ts):
        // proxy.ts's own redirect on an expired session, followed
        // transparently by fetch(), lands here rather than a JSON body.
        redirectToLogin();
        return;
      }

      let result: EntriesApiResponse;
      try {
        result = await response.json();
      } catch {
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;

      if (!response.ok) {
        // Epic 2 retro action item: the route's own defense-in-depth 401
        // (reached only if proxy.ts's redirect is ever bypassed) gets the
        // same recovery as the response.redirected case above, instead of
        // the generic loadError state.
        if (isUnauthenticatedErrorBody(result)) {
          redirectToLogin();
          return;
        }
        setLoadError(true);
        return;
      }

      setLoadError(false);
      setEntries(result.entries ?? []);
      setRemainingBudget(result.remainingBudget);
      setRecommendations(result.recommendations ?? []);
      if (result.showFirstLoginPrompt) {
        setPromptShownThisSession(true);
      }
      setToneMessage(result.toneMessage);
      setBreakfastOfferAccepted(result.breakfastOfferAccepted ?? false);
      setShowBreakfastOffer(result.showBreakfastOffer ?? false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return {
    entries,
    remainingBudget,
    recommendations,
    promptShownThisSession,
    toneMessage,
    breakfastOfferAccepted,
    showBreakfastOffer,
    loadError,
  };
}
