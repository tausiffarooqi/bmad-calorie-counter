// Epic 1 retro action item: both /preferences and /trends had no way back
// to the Daily view other than the browser's back button. One shared
// component (not two separately-maintained copies) for both pages — plain
// <a>, matching this app's established no-next/link convention everywhere
// else.
export function BackToDailyViewLink() {
  return (
    // A link back to "/" specifically trips next/next/no-html-link-for-pages
    // (every other internal link in this app points to a different page and
    // never fires it) — plain <a> stays deliberate here, matching Story
    // 1.4's own explicit "no page anywhere uses next/link" precedent.
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <a
      href="/"
      className="self-start text-sm text-primary underline-offset-4 hover:underline"
    >
      ← Back to Daily view
    </a>
  );
}
