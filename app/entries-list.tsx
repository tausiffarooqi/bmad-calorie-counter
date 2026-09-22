"use client";

import { useEffect, useState } from "react";

interface Entry {
  id: string;
  description: string;
  calories: number;
  inputMode: string;
  createdAt: string;
}

interface EntriesListProps {
  // Bumped by the host page whenever either logging dialog's `onSuccess`
  // fires, so a just-logged Entry shows up without a page reload (Code Map,
  // I/O matrix).
  refreshKey: number;
}

// Renders today's Entries as one bordered container of rows — never
// per-entry cards (DESIGN.md's Entries-list token: `{colors.card}`
// background, `{colors.border}` row dividers, `{rounded.md}`). Renders
// nothing at all when the list is empty — no empty-state placeholder
// (Boundaries & Constraints, I/O matrix). A fetch failure is a distinct
// case from "genuinely zero Entries today" — silently rendering nothing
// for both would make a real load error indistinguishable from an empty
// day, so a failed load gets its own small, plain error line instead
// (and, since it replaces rather than joins the list render, a refresh
// that fails after a successful log never leaves a stale list looking
// authoritative).
export function EntriesList({ refreshKey }: EntriesListProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
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
        // Session expired while this list was mounted — same handling as
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

      let result: { entries?: Entry[] };
      try {
        result = await response.json();
      } catch {
        if (!cancelled) setLoadError(true);
        return;
      }
      if (cancelled) return;

      setLoadError(false);
      setEntries(result.entries ?? []);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loadError) {
    return (
      <p role="alert" className="text-sm text-primary">
        Couldn&apos;t load today&apos;s entries — try reloading.
      </p>
    );
  }

  if (entries.length === 0) return null;

  return (
    <ul
      aria-live="polite"
      className="w-full max-w-sm list-none rounded-md border border-border bg-card"
    >
      {entries.map((entry, index) => (
        <li
          key={entry.id}
          className={`flex items-center justify-between gap-4 px-4 py-2.5 text-sm text-foreground ${
            index > 0 ? "border-t border-border" : ""
          }`}
        >
          <span className="min-w-0 truncate">{entry.description}</span>
          <span className="shrink-0 text-muted-foreground">{entry.calories} cal</span>
        </li>
      ))}
    </ul>
  );
}
