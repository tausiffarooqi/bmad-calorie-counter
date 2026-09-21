"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";

// Only the states this story needs — a bare working state per outcome, not
// the polished treatment (Story 2.3 owns that; Story 2.5 owns AT
// announcement).
type Status = "idle" | "submitting" | "success" | "insufficient_detail" | "error";

type EntriesApiResponse =
  | { ok: true; calories: number }
  | { ok: false; reason: "insufficient_detail" }
  | { error: { code: string; message: string } };

// Time the success confirmation stays visible before the dialog
// auto-closes (Code Map: "success (shows returned calories, auto-closes)").
const SUCCESS_CLOSE_DELAY_MS = 1200;

export function LogEntryDialog() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [validationError, setValidationError] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [calories, setCalories] = useState<number | undefined>();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A submission is only allowed to update state if it's still the most
  // recent one by the time its response arrives — incremented on every new
  // submit attempt and on close, so a stale in-flight request (abandoned by
  // closing the dialog, or superseded by a second submission) can never
  // clobber a later submission's state or silently "succeed" into a closed
  // dialog. abortControllerRef additionally cancels the network request
  // itself rather than just ignoring its result.
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  function resetForNextOpen() {
    setDescription("");
    setStatus("idle");
    setValidationError(false);
    setMessage(undefined);
    setCalories(undefined);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      requestIdRef.current += 1;
      abortControllerRef.current?.abort();
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = undefined;
      }
      // Closing (whichever way) always starts the next open from a clean
      // slate — the "keep my text editable" guarantee only applies while
      // this dialog stays open across a retry.
      resetForNextOpen();
    }
    setOpen(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const trimmed = description.trim();
    if (trimmed.length === 0) {
      setMessage(undefined);
      setStatus("idle");
      setValidationError(true);
      return;
    }

    // Supersede any still-in-flight prior submission before starting this
    // one — its eventual response (if any arrives) is now stale and will
    // be ignored below.
    requestIdRef.current += 1;
    const myRequestId = requestIdRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setValidationError(false);
    setMessage(undefined);
    setStatus("submitting");

    let response: Response;
    try {
      response = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptionText: trimmed }),
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
    closeTimeoutRef.current = setTimeout(() => {
      handleOpenChange(false);
    }, SUCCESS_CLOSE_DELAY_MS);
  }

  const submitting = status === "submitting";
  const textareaDisabled = submitting || status === "success";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Text</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a meal</DialogTitle>
          <DialogDescription>
            Describe what you ate and we&apos;ll estimate the calories.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <Label htmlFor="meal-description">Description</Label>
          <textarea
            id="meal-description"
            className="min-h-24 w-full rounded-sm border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-primary aria-invalid:ring-3 aria-invalid:ring-primary/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"
            placeholder="e.g. one double cheeseburger and medium fries with a can of diet soda"
            value={description}
            disabled={textareaDisabled}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(event) => {
              setDescription(event.target.value);
              setValidationError(false);
            }}
            aria-invalid={validationError}
            aria-describedby={
              validationError
                ? "meal-description-error"
                : status !== "idle" && status !== "submitting"
                  ? "meal-description-status"
                  : undefined
            }
          />
          {validationError && (
            <p id="meal-description-error" role="alert" className="text-sm text-primary">
              Describe what you ate before submitting.
            </p>
          )}
          {status === "submitting" && (
            <p role="status" className="text-sm text-muted-foreground">
              Estimating…
            </p>
          )}
          {status === "success" && calories !== undefined && (
            <p id="meal-description-status" role="status" className="text-sm text-foreground">
              Logged — about {calories} calories.
            </p>
          )}
          {(status === "insufficient_detail" || status === "error") && message && (
            <p id="meal-description-status" role="alert" className="text-sm text-primary">
              {message}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting || status === "success"}>
              {submitting ? "Estimating…" : "Log meal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
