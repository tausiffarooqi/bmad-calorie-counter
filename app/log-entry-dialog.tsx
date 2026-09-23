"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { EntryStatusCard } from "@/components/entry-status-card";
import { LiveRegion } from "@/components/live-region";
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
import { getClientTimeZone } from "@/lib/get-client-timezone";
import { useEntrySubmission } from "@/hooks/use-entry-submission";

interface LogEntryDialogProps {
  // Called once a submission succeeds (after the dialog's own auto-close) —
  // the host page uses this to refresh the Entries list (Story 2.4 Code
  // Map).
  onSuccess?: () => void;
}

export function LogEntryDialog({ onSuccess }: LogEntryDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState(false);
  const { status, message, calories, submit, cancelAndReset } = useEntrySubmission();

  function resetForNextOpen() {
    setDescription("");
    setValidationError(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Closing (whichever way) always starts the next open from a clean
      // slate — the "keep my text editable" guarantee only applies while
      // this dialog stays open across a retry.
      cancelAndReset();
      resetForNextOpen();
    }
    setOpen(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    // A new attempt supersedes any stale retry/error state from a previous
    // one — without this, resubmitting blank text after an earlier
    // insufficient-detail/error response left both the validation alert and
    // the stale retry card rendered at once (two contradictory role="alert"
    // regions).
    cancelAndReset();

    const trimmed = description.trim();
    if (trimmed.length === 0) {
      setValidationError(true);
      return;
    }
    setValidationError(false);

    await submit({ descriptionText: trimmed, tz: getClientTimeZone() }, () => {
      handleOpenChange(false);
      onSuccess?.();
    });
  }

  const submitting = status === "submitting";
  const textareaDisabled = submitting || status === "success";

  // Mirrors only the pending/success text — role="status" content, which
  // (unlike role="alert") is commonly missed by screen readers when it
  // arrives on a freshly-mounted node. The insufficient-detail/error
  // messages and the blank-field validation message already use
  // role="alert", which AT reliably announces on insertion without this
  // mechanism (the same reason the validation message below has never
  // needed one) — mirroring that text here too would risk a double
  // announcement or an assertive/polite race against the identical string.
  const announcement = submitting
    ? "Estimating…"
    : status === "success" && calories !== undefined
      ? `Logged — about ${calories} calories.`
      : "";

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
            <EntryStatusCard variant="pending" role="status">
              Estimating…
            </EntryStatusCard>
          )}
          {status === "success" && calories !== undefined && (
            <p id="meal-description-status" role="status" className="text-sm text-foreground">
              Logged — about {calories} calories.
            </p>
          )}
          {(status === "insufficient_detail" || status === "error") && message && (
            <EntryStatusCard variant="retry" role="alert" id="meal-description-status">
              {message}
            </EntryStatusCard>
          )}
          <LiveRegion message={announcement} />
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
