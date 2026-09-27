"use client";

import { useEffect, useState } from "react";
import { getClientTimeZone } from "@/lib/get-client-timezone";
import { isUnauthenticatedErrorBody, redirectToLogin } from "@/lib/handle-session-expiry";
import {
  computeTrendSummaryStats,
  computeTrendBarHeightPercent,
  TARGET_LINE_TOP_PERCENT,
  trendDateRange,
  type TrendDay,
} from "@/lib/services/trends";
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
        redirectToLogin();
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

      if (!response.ok) {
        // Epic 2 retro action item: the route's own defense-in-depth 401
        // (reached only if proxy.ts's redirect is ever bypassed) gets the
        // same recovery as the response.redirected case above.
        if (isUnauthenticatedErrorBody(result)) {
          redirectToLogin();
          return;
        }
        setLoadError(true);
        return;
      }

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

  // Epic 5 retro action item: the single computation the stats block, the
  // day list, and their shared visibility gate all derive from — previously
  // two independently hand-written boolean expressions
  // (`!firstLoadPending && !loadError && stats && days && days.length > 0`
  // vs. the same without `stats`) that happened to agree only coincidentally.
  // Deriving both from this one `nonEmptyDays` value makes the epic's own
  // "no stats block at all when the window is empty" rule structurally
  // guaranteed rather than merely currently true (epic-5-context.md,
  // Cross-Story Dependencies). Story 5.1's existing empty state below still
  // covers `days.length === 0` unchanged.
  const nonEmptyDays: TrendDay[] | undefined =
    !firstLoadPending && !loadError && days && days.length > 0 ? days : undefined;

  // Story 5.2's aggregate stats, computed from the same `nonEmptyDays` the
  // day-by-day list below already renders — reusing Story 5.1's "omit days
  // with no Entries" guarantee for free (an omitted day was never in `days`
  // to begin with, Intent).
  const stats = nonEmptyDays ? computeTrendSummaryStats(nonEmptyDays) : undefined;

  // Epic 5 retro action item: derived by value (trendDateRange()), not by
  // trusting `days[0]`/`days[days.length-1]`'s positional meaning across a
  // file/story boundary with nothing enforcing it.
  const dateRange = nonEmptyDays ? trendDateRange(nonEmptyDays) : undefined;

  // A 3-month window spanning a calendar-year boundary would otherwise show
  // a range like "Dec 28 – Feb 3" with no year on either end, ambiguous
  // which year each date belongs to (Epic 5 retro action item; not yet
  // reachable — this project's history starts September 2026 — but cheap to
  // guard against while this code is already being touched). Applied to
  // every `formatDayLabel()` call below, including each day-list row, so the
  // header and the list never disagree about whether a year is shown.
  const spansYearBoundary =
    dateRange !== undefined &&
    new Date(dateRange.earliest).getFullYear() !== new Date(dateRange.latest).getFullYear();

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

      {/* Story 5.2: aggregate summary above the chart (Approach) — plain
          text, no widget/tile/card treatment (epic-5-context.md UX &
          Interaction Patterns: "one linear reporting surface, not a widget
          dashboard"). This block itself never color-codes over-target (the
          "no alarm treatment" rule) — the bar chart below it is UX-DR31's
          own explicit, narrower exception (over-target bars use the same
          terracotta as everywhere else Over-Target is reported), not a
          contradiction of this rule. */}
      {nonEmptyDays && stats && dateRange && (
        <div
          aria-live="polite"
          aria-label="Trend summary"
          className="w-full max-w-sm text-sm text-muted-foreground"
        >
          {/* Date range covered (Review finding) — `totalDays` counts only
              days with logged Entries, not the full calendar window, so
              stating the actual span avoids "M" being misread as "every day
              in the last 3 months." Epic 5 retro action item: a single-day
              window shows one date instead of a duplicated range, and the
              range reads latest-to-earliest (left to right) to match the
              day list's own most-recent-first (top to bottom) direction,
              instead of silently conflicting with it. */}
          <p className="text-label uppercase text-muted-foreground">
            {dateRange.earliest === dateRange.latest
              ? formatDayLabel(dateRange.latest, spansYearBoundary)
              : `${formatDayLabel(dateRange.latest, spansYearBoundary)} – ${formatDayLabel(dateRange.earliest, spansYearBoundary)}`}
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

      {/* Story 5.1: bar-chart histogram (UX-DR31, 2026-09-26) — supersedes
          the original plain day-by-day text list. Chart-only render order is
          oldest-to-newest, left-to-right (a bar chart's usual reading
          convention, matching the mockup's own day-label sequence) — a
          reversed copy of `nonEmptyDays`, which stays most-recent-first for
          Story 5.2's stats computation above (order-independent there).
          Horizontally scrollable, never paginated/infinite-loaded — the full
          up-to-~90-day window is already in `nonEmptyDays` (UX-DR28). The
          dashed target line/label live in the outer (non-scrolling)
          `relative` wrapper, not inside the `overflow-x-auto` bars row —
          keeping them there would anchor `right-0` to the full scrollable
          content's edge rather than the visible viewport, pinning the label
          off-screen until scrolled all the way to the newest-day end
          (review finding). */}
      {nonEmptyDays && (
        <div className="w-full max-w-sm rounded-lg border border-border bg-card px-4 pt-4 pb-3 shadow-soft">
          <div className="relative h-[160px]">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-border"
              style={{ top: `${TARGET_LINE_TOP_PERCENT}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute right-0 bg-card pl-1 text-[9px] text-muted-foreground"
              style={{ top: `calc(${TARGET_LINE_TOP_PERCENT}% - 14px)` }}
            >
              target
            </span>
            <div
              role="group"
              aria-label={`Daily calories for ${nonEmptyDays.length} ${nonEmptyDays.length === 1 ? "day" : "days"}`}
              aria-live="polite"
              className="flex h-full items-end gap-1.5 overflow-x-auto"
            >
              {[...nonEmptyDays].reverse().map((day) => {
                const heightPercent = computeTrendBarHeightPercent(
                  day.totalCalories,
                  day.dailyCalorieTarget
                );
                const overTarget = day.totalCalories > day.dailyCalorieTarget;
                const dayLabel = formatDayLabel(day.dayStart, spansYearBoundary);
                return (
                  <div
                    key={day.dayStart}
                    className="flex h-full w-6 shrink-0 flex-col items-center justify-end gap-1"
                  >
                    <div
                      role="img"
                      aria-label={`${dayLabel}: ${day.totalCalories.toLocaleString()} of ${day.dailyCalorieTarget.toLocaleString()} cal`}
                      title={`${dayLabel}: ${day.totalCalories.toLocaleString()} / ${day.dailyCalorieTarget.toLocaleString()} cal`}
                      className={`w-full rounded-t-[4px] rounded-b-[2px] ${
                        overTarget ? "bg-primary" : "bg-tint-neutral-bar"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(day.dayStart).toLocaleDateString(undefined, { weekday: "narrow" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Color legend (review finding) — the dashed line's "target"
              caption explains itself, but nothing otherwise says what the
              two bar colors mean without hovering an over-target bar first. */}
          <div className="mt-2 flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-tint-neutral-bar" />
              within target
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="inline-block size-2 rounded-full bg-primary" />
              over target
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// `dayStart` is the Day-window's start instant (an ISO string) — formatted
// in the viewer's own local timezone via the browser's own Intl defaults,
// consistent with every other user-facing date/time rendering in this app
// (no separate calendar-date math here, just display formatting of an
// already-Day-attributed instant). `includeYear` (Epic 5 retro action item)
// disambiguates a window that spans a calendar-year boundary — applied
// uniformly to the range label and every day-list row so they never
// disagree about whether a year is shown.
function formatDayLabel(dayStart: string, includeYear: boolean): string {
  return new Date(dayStart).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  });
}
