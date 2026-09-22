import type { ReactNode } from "react";
import { cn } from "cn";

type EntryStatusCardProps = {
  // "pending": DESIGN.md's In-progress indicator — card background, a
  // subtle motion cue (Tailwind's built-in animate-pulse: a calm opacity
  // fade, never a bare spinner and never so much motion it reads as an
  // error/alarm state), plus a neutral border (DESIGN.md's Prompt-card
  // outline) — the dialog it sits inside uses shadcn's stock bg-popover
  // (#FFFFFF), which computes to a ~1.1:1 contrast against {colors.card}
  // (#F7F4EE); a border is what makes the card shape actually legible
  // there rather than reading as unboxed text.
  // "retry": DESIGN.md's Retry prompt — same card shape, a clay/primary
  // border instead of the neutral one, shared by both the
  // insufficient-detail and hard-failure cases (different copy, identical
  // visual treatment). Never shadcn's destructive/red styling for either.
  variant: "pending" | "retry";
  // Passed straight through so callers keep their existing role="status" /
  // role="alert" and aria-describedby wiring untouched — aria-live is
  // explicitly Story 2.5's job, not this component's.
  role?: "status" | "alert";
  id?: string;
  className?: string;
  children: ReactNode;
};

export function EntryStatusCard({
  variant,
  role,
  id,
  className,
  children,
}: EntryStatusCardProps) {
  return (
    <div
      data-slot="entry-status-card"
      role={role}
      id={id}
      className={cn(
        // text-foreground (not muted-foreground): DESIGN.md's own contrast
        // guidance reserves muted-foreground for secondary/decorative
        // labels, "never to text a user must read to understand their
        // state" — this label is the only visible indication a submission
        // is running, so it must not be the muted color.
        "rounded-md border bg-card px-3 py-2 text-sm text-foreground",
        variant === "pending" && "border-border motion-safe:animate-pulse",
        // text-primary on the message itself (not just the border):
        // matches the clay emphasis Stories 2.1/2.2 already shipped on
        // this exact text before this story's refactor — preserved rather
        // than silently dropped.
        variant === "retry" && "border-primary text-primary",
        className
      )}
    >
      {children}
    </div>
  );
}
