// Story 2.5: always-mounted accessible-technology-only announcement channel.
// Callers must render this unconditionally for the dialog's entire lifetime
// (even when `message` is empty) — only its text content should ever change
// across state transitions, never its mount/unmount status, since screen
// readers reliably announce only text changes inside a live region that was
// already present before the mutation. The existing visible
// `EntryStatusCard`/success `<p>` elements are untouched by this component;
// it's an addition alongside them, not a replacement.
type LiveRegionProps = {
  message: string;
};

export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
