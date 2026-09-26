"use client";

import { useEffect, useState } from "react";
import { getClientTimeZone } from "@/lib/get-client-timezone";
import { computeTrendSummaryStats, type TrendDay } from "@/lib/services/trends";
import { BackToDailyViewLink } from "@/app/back-to-daily-view-link";

interface TrendsApiResponse {
  days?: TrendDay[];
}

// Client component (needs the browser's tz, same reason the Daily view is a
// client component rather than a server component, Code Map). Fetches on
// mount via `fetch('/api/trends?tz=...')`, same per-request client-detected
// tz convention as every other tz-consuming route (Boundaries &
// Constraints) — never stored, never a cookie/server component.
export default function TrendsPage() {
  const [days, setDays] = useState<TrendDay[] | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const tz = getClientTimeZone();

      let response: Response;
      try {
        response = await fetch(`/api/trends?tz=${encodeURIComponent(tz)}`);
      } catch {
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;

      if (response.redirected) {
        // Session expired while this view was mounted — same handling as
        // useDailyView()'s identical fetch (proxy.ts's redirect on an
        // expired session, followed transparently by fetch()).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        setLoadError(true);
        return;
      }

      let result: TrendsApiResponse;
      try {
        result = await response.json();
      } catch {
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;

      setLoadError(false);
      setDays(result.days ?? []);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Cold-load skeleton (EXPERIENCE.md's Cold-load State Pattern, same
  // `animate-pulse` placeholder pattern as app/page.tsx) — the first fetch
  // hasn't resolved (success or failure) yet.
  const firstLoadPending = days === undefined && !loadError;

  // Story 5.2's aggregate stats, computed from the same `days` array the
  // day-by-day list below already renders — reusing Story 5.1's "omit days
  // with no Entries" guarantee for free (an omitted day was never in `days`
  // to begin with, Intent). Only computed once there's a non-empty window to
  // summarize: reusing this exact `days.length > 0` condition (rather than a
  // separate check) is what ties "no stats block at all when the window is
  // empty" to the identical condition gating the day list itself, so the two
  // can never disagree — Story 5.1's existing empty state covers
  // `days.length === 0` unchanged, no separate empty state for stats
  // (epic-5-context.md, Cross-Story Dependencies).
  const stats = days && days.length > 0 ? computeTrendSummaryStats(days) : undefined;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-background p-8 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-2">
        <BackToDailyViewLink />
      </div>
      <h1 className="text-lg font-semibold">Historical Trends</h1>

      {firstLoadPending && (
        <div
          aria-hidden="true"
          className="h-20 w-full max-w-sm animate-pulse rounded-md bg-muted"
        />
      )}

      {/* A fetch failure is a distinct case from "genuinely zero days in the
          window" — silently showing the empty-state message for both would
          make a real load error indistinguishable from an empty window
          (I/O & Edge-Case Matrix), so a failed load gets its own line,
          same distinct-line pattern as EntriesList's loadError case. */}
      {loadError && (
        <p role="alert" className="text-sm text-primary">
          Couldn&apos;t load your trends — try reloading.
        </p>
      )}

      {!firstLoadPending && !loadError && days && days.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing logged yet — check back once you&apos;ve tracked a few days.
        </p>
      )}

      {/* Story 5.2: aggregate summary above the day list (Approach) — plain
          text, no widget/tile/card treatment (epic-5-context.md UX &
          Interaction Patterns: "one linear reporting surface, not a widget
          dashboard"), and no color-coding for over-target (same "no
          alarm treatment" rule as the day list's own plain-text figures). */}
      {!firstLoadPending && !loadError && stats && days && days.length > 0 && (
        <div
          aria-live="polite"
          aria-label="Trend summary"
          className="w-full max-w-sm text-sm text-muted-foreground"
        >
          {/* Date range covered (Review finding) — `totalDays` counts only
              days with logged Entries, not the full calendar window, so
              stating the actual span avoids "M" being misread as "every day
              in the last 3 months." `days` is most-recent-first (Story 5.1),
              so the earliest day is the last element. */}
          <p className="text-label uppercase text-muted-foreground">
            {formatDayLabel(days[days.length - 1].dayStart)} – {formatDayLabel(days[0].dayStart)}
          </p>
          <p>
            {stats.daysWithinTarget} of {stats.totalDays} {stats.totalDays === 1 ? "day" : "days"}{" "}
            within target ({stats.percentWithinTarget}%), {stats.daysOverTarget} over target (
            {stats.percentOverTarget}%)
          </p>
          {/* "days with entries only" (Review finding) — the average silently
              excludes days with no logged Entries (inherited from
              computeTrendDays()'s omission); without this qualifier the
              figure could be misread as an average over every calendar day
              in the window. */}
          <p>Average {stats.averageCalories.toLocaleString()} cal/day (days with entries only)</p>
        </div>
      )}

      {!firstLoadPending && !loadError && days && days.length > 0 && (
        <ul
          aria-live="polite"
          className="w-full max-w-sm list-none rounded-md border border-border bg-card"
        >
          {days.map((day, index) => (
            <li
              key={day.dayStart}
              className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-foreground ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <span className="min-w-0 truncate">{formatDayLabel(day.dayStart)}</span>
              {/* Plain text, no color-coding for within/over-target — the
                  "no alarm treatment" rule (Boundaries & Constraints,
                  Design Notes). */}
              <span className="shrink-0 text-muted-foreground">
                {day.totalCalories.toLocaleString()} / {day.dailyCalorieTarget.toLocaleString()} cal
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// `dayStart` is the Day-window's start instant (an ISO string) — formatted
// in the viewer's own local timezone via the browser's own Intl defaults,
// consistent with every other user-facing date/time rendering in this app
// (no separate calendar-date math here, just display formatting of an
// already-Day-attributed instant).
function formatDayLabel(dayStart: string): string {
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
