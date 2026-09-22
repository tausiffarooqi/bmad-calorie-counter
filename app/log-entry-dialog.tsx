"use client";

import { useState, type FormEvent } from "react";
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
import { useEntrySubmission } from "@/hooks/use-entry-submission";

export function LogEntryDialog() {
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

    const trimmed = description.trim();
    if (trimmed.length === 0) {
      setValidationError(true);
      return;
    }
    setValidationError(false);

    await submit({ descriptionText: trimmed }, () => handleOpenChange(false));
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
