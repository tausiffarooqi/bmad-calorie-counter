// Tiny shared client-side helper — extracted from hooks/use-daily-view.ts
// now that the same one-liner is needed in 3 client files (that hook, plus
// log-entry-dialog.tsx and log-photo-dialog.tsx sending `tz` on POST, Story
// 3.3 Code Map) instead of duplicated a third time. Client-detected, sent
// per-request, never stored (FR-14's "no manual override" consequence).
export function getClientTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
