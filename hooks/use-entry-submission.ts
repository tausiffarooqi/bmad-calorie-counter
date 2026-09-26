"use client";

import { useEffect, useRef, useState } from "react";

// Shared Entry-submission state machine, extracted from Story 2.1's
// LogEntryDialog (whose review flagged and fixed a close-mid-flight bug) so
// Story 2.2's photo dialog gets the same hardened staleness/abort handling
// instead of a re-derived, possibly-inconsistent copy.
//
// Only the states this story needs — a bare working state per outcome, not
// the polished treatment (Story 2.3 owns that; Story 2.5 owns AT
// announcement).
export type EntrySubmissionStatus =
  | "idle"
  | "submitting"
  | "success"
  | "insufficient_detail"
  | "error";

type EntriesApiResponse =
  | { ok: true; calories: number }
  | { ok: false; reason: "insufficient_detail" }
  | { error: { code: string; message: string } };

// Time the success confirmation stays visible before the caller's
// `onSuccess` fires (used by both dialogs to auto-close).
const SUCCESS_CLOSE_DELAY_MS = 1200;

export function useEntrySubmission() {
  const [status, setStatus] = useState<EntrySubmissionStatus>("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [calories, setCalories] = useState<number | undefined>();

  // A submission is only allowed to update state if it's still the most
  // recent one by the time its response arrives — incremented on every new
  // submit attempt and on cancelAndReset, so a stale in-flight request
  // (abandoned by closing the dialog, or superseded by a second submission)
  // can never clobber a later submission's state or silently "succeed" into
  // a closed dialog. abortControllerRef additionally cancels the network
  // request itself rather than just ignoring its result.
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Epic 2 retro action item: the callback `submit()`'s success-close timer
  // is about to invoke, stashed so `cancelAndReset()` can still run it
  // immediately if the dialog closes during the brief success-confirmation
  // window — the write already durably happened by that point, so skipping
  // the *timer* must not also skip the refresh it would have triggered.
  const pendingSuccessCallbackRef = useRef<(() => void) | undefined>(undefined);

  function reset() {
    setStatus("idle");
    setMessage(undefined);
    setCalories(undefined);
  }

  // The dialogs only call cancelAndReset() from their own onOpenChange(false)
  // handler — if the host page unmounts/navigates away without that ever
  // firing (e.g. a client-side route change while a submission or the
  // success auto-close timer is pending), this ensures the in-flight fetch
  // is still aborted and the timer still cleared rather than left running
  // past the point anything can use their result.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        pendingSuccessCallbackRef.current?.();
        pendingSuccessCallbackRef.current = undefined;
      }
    };
  }, []);

  // Call this when the host dialog closes, whichever way (Escape, overlay
  // click, close button, or a programmatic close). Supersedes any in-flight
  // request, cancels a pending success auto-close, and returns the state
  // machine to idle for the next open.
  function cancelAndReset() {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = undefined;
      // The POST already succeeded by the time this timer was scheduled —
      // closing the dialog mid-confirmation is the user dismissing an
      // already-true "Logged" message, not cancelling anything. Skipping
      // the callback here would silently drop the list refresh for an
      // Entry that was already durably created.
      pendingSuccessCallbackRef.current?.();
      pendingSuccessCallbackRef.current = undefined;
    }
    reset();
  }

  // `body` is the full JSON request body to POST to /api/entries — the text
  // dialog sends `{ descriptionText }`, the photo dialog sends
  // `{ photoBase64, photoMimeType }`; this hook only cares about the
  // response. `onSuccess` fires once the success confirmation has been
  // visible for SUCCESS_CLOSE_DELAY_MS — callers use it to close their
  // dialog.
  async function submit(body: Record<string, unknown>, onSuccess: () => void) {
    if (status === "submitting") return;

    // Supersede any still-in-flight prior submission before starting this
    // one — its eventual response (if any arrives) is now stale and will be
    // ignored below.
    requestIdRef.current += 1;
    const myRequestId = requestIdRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessage(undefined);
    setStatus("submitting");

    let response: Response;
    try {
      response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      if (requestIdRef.current !== myRequestId) return;
      setStatus("error");
      setMessage("The attempt failed, try again.");
      return;
    }

    if (requestIdRef.current !== myRequestId) return;

    if (response.redirected) {
      // Session expired mid-dialog — same handling as preferences-form.tsx.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
      return;
    }

    let result: EntriesApiResponse;
    try {
      result = await response.json();
    } catch {
      if (requestIdRef.current !== myRequestId) return;
      setStatus("error");
      setMessage("The attempt failed, try again.");
      return;
    }

    if (requestIdRef.current !== myRequestId) return;

    if (!response.ok || "error" in result) {
      setStatus("error");
      setMessage(
        "error" in result ? result.error.message : "The attempt failed, try again."
      );
      return;
    }

    if (!result.ok) {
      setStatus("insufficient_detail");
      setMessage("Add a bit more detail and try again.");
      return;
    }

    setStatus("success");
    setCalories(result.calories);
    pendingSuccessCallbackRef.current = onSuccess;
    closeTimeoutRef.current = setTimeout(() => {
      closeTimeoutRef.current = undefined;
      pendingSuccessCallbackRef.current = undefined;
      onSuccess();
    }, SUCCESS_CLOSE_DELAY_MS);
  }

  return { status, message, calories, submit, cancelAndReset };
}
