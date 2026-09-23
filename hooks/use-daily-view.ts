"use client";

import { useEffect, useState } from "react";

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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Client-detected, sent per-request, never stored (FR-14 — Boundaries
      // & Constraints).
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setLoadError(true);
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

      setLoadError(false);
      setEntries(result.entries ?? []);
      setRemainingBudget(result.remainingBudget);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { entries, remainingBudget, loadError };
}
