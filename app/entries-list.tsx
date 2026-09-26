import type { Entry } from "@/hooks/use-daily-view";

interface EntriesListProps {
  entries: Entry[];
  loadError: boolean;
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
//
// Purely presentational (Story 3.2) — the fetch that produces `entries`/
// `loadError` now lives in the shared `useDailyView()` hook
// (hooks/use-daily-view.ts), alongside the Remaining Calorie Budget fetch,
// rather than duplicated here.
export function EntriesList({ entries, loadError }: EntriesListProps) {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-primary">
        Couldn&apos;t load today&apos;s entries — try reloading.
      </p>
    );
  }

  // Epic 2 retro action item: the aria-live region itself is always
  // mounted, even while `entries` is empty — only the styled `<ul>` (and
  // its "renders nothing when empty, no placeholder box" contract) is
  // conditional. Previously the whole `aria-live="polite"` node only
  // existed once `entries.length > 0`, so the very first Entry logged each
  // Day mounted the live region *with its content already set in the same
  // commit* — the exact "freshly-mounted-with-text-already-set" failure
  // mode `components/live-region.tsx` exists specifically to avoid, just
  // never applied here since this file predates that component.
  return (
    <div aria-live="polite">
      {entries.length > 0 && (
        <ul className="w-full max-w-sm list-none rounded-md border border-border bg-card">
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
      )}
    </div>
  );
}
