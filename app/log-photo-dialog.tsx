"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { EntryStatusCard } from "@/components/entry-status-card";
import { LiveRegion } from "@/components/live-region";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compressImage } from "@/lib/compress-image";
import { useEntrySubmission } from "@/hooks/use-entry-submission";

// "Add Photo" opens the native camera/file picker directly — no custom
// in-app camera UI (Boundaries & Constraints). The status dialog below is
// opened programmatically once a photo has been picked, not via a
// DialogTrigger, since the picker itself is the entry point.
interface LogPhotoDialogProps {
  // Called once a submission succeeds (after the dialog's own auto-close) —
  // the host page uses this to refresh the Entries list (Story 2.4 Code
  // Map).
  onSuccess?: () => void;
}

export function LogPhotoDialog({ onSuccess }: LogPhotoDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [rejection, setRejection] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { status, message, calories, submit, cancelAndReset } = useEntrySubmission();

  // Guards the compression phase, which sits *before* useEntrySubmission's
  // own requestId/AbortController machinery ever engages (that only covers
  // the network leg). Bumped on every new pick and on close, so a stale
  // compressImage() result — from a photo the user abandoned by closing the
  // dialog, or superseded by picking a second photo before the first
  // finished compressing — can never take any user-visible action (no
  // phantom rejection message, and critically, no phantom submit()).
  const pickIdRef = useRef(0);

  function handleOpenChange(next: boolean) {
    if (!next) {
      pickIdRef.current += 1;
      cancelAndReset();
      setPreparing(false);
      setRejection(undefined);
    }
    setOpen(next);
  }

  function openPicker() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so re-picking the same file still fires a change
    // event next time.
    event.target.value = "";
    if (!file) return;

    const myPickId = (pickIdRef.current += 1);

    // A new pick supersedes any stale retry state from a previous one —
    // without this, picking an oversized photo B after an earlier
    // insufficient-detail/error result for photo A left both the new
    // rejection message and the old retry card rendered at once (two
    // contradictory role="alert" regions).
    cancelAndReset();
    setRejection(undefined);
    setOpen(true);

    // Yield a tick before setting `preparing` so this dialog's first-ever
    // open commits with LiveRegion mounted empty, then mutates to
    // "Preparing photo…" as a separate React commit — batching both state
    // updates into one commit (as a bare synchronous setOpen+setPreparing
    // would) reproduces the exact freshly-mounted-with-text-already-set bug
    // this story exists to fix (review finding, first-pick timing).
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (pickIdRef.current !== myPickId) return;
    setPreparing(true);

    let compressed;
    try {
      compressed = await compressImage(file);
    } catch {
      if (pickIdRef.current !== myPickId) return;
      setPreparing(false);
      setRejection("Couldn't process that photo — try a different one.");
      return;
    }

    if (pickIdRef.current !== myPickId) return;
    setPreparing(false);

    if (!compressed.ok) {
      // Still too large after compression — no request sent (Boundaries &
      // Constraints, I/O matrix).
      setRejection("That photo is still too large — pick a smaller photo.");
      return;
    }

    await submit(
      { photoBase64: compressed.base64, photoMimeType: compressed.mimeType },
      () => {
        handleOpenChange(false);
        onSuccess?.();
      }
    );
  }

  const submitting = status === "submitting";
  const busy = preparing || submitting;
  const retryable = Boolean(rejection) || status === "insufficient_detail" || status === "error";

  // Mirrors only the pending/success text — role="status" content, which
  // (unlike role="alert") is commonly missed by screen readers when it
  // arrives on a freshly-mounted node. The rejection/insufficient-detail/
  // error messages already use role="alert", which AT reliably announces
  // on insertion without this mechanism — mirroring that text here too
  // would risk a double announcement or an assertive/polite race against
  // the identical string.
  const announcement = preparing
    ? "Preparing photo…"
    : submitting
      ? "Estimating…"
      : status === "success" && calories !== undefined
        ? `Logged — about ${calories} calories.`
        : "";

  return (
    <>
      {/* Hidden native picker — visually hidden but still a real, focusable
          file input isn't needed since the visible button below drives it;
          it's excluded from the tab order and AT tree entirely. No
          `capture` attribute: some mobile browsers treat `capture` as
          camera-only, blocking the "pick an existing photo" path that
          EXPERIENCE.md's IA explicitly calls for alongside camera capture.
          `accept="image/*"` alone still opens the native chooser (camera or
          gallery) on every mainstream mobile browser. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
      <Button
        variant="outline"
        onClick={openPicker}
        disabled={busy}
        aria-describedby="photo-only-notice"
      >
        Add Photo
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log a meal</DialogTitle>
            <DialogDescription>
              We&apos;ll estimate the calories from your photo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {preparing && (
              <EntryStatusCard variant="pending" role="status">
                Preparing photo…
              </EntryStatusCard>
            )}
            {rejection && (
              <EntryStatusCard variant="retry" role="alert" id="photo-status-message">
                {rejection}
              </EntryStatusCard>
            )}
            {submitting && (
              <EntryStatusCard variant="pending" role="status">
                Estimating…
              </EntryStatusCard>
            )}
            {status === "success" && calories !== undefined && (
              <p role="status" className="text-sm text-foreground">
                Logged — about {calories} calories.
              </p>
            )}
            {(status === "insufficient_detail" || status === "error") && message && (
              <EntryStatusCard variant="retry" role="alert" id="photo-status-message">
                {message}
              </EntryStatusCard>
            )}
            {retryable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={openPicker}
                aria-describedby="photo-status-message"
              >
                Try another photo
              </Button>
            )}
            <LiveRegion message={announcement} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
