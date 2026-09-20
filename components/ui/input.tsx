import * as React from "react"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // rounded-sm (not shadcn-default rounded-lg): DESIGN.md specifies
        // {rounded.sm} (8px) for inputs — {rounded.lg} is reserved for the
        // Recommendation card only. aria-invalid uses {colors.primary}
        // (clay), not shadcn's default destructive/red — DESIGN.md never
        // uses red/alarm styling, including for form errors.
        "h-8 w-full min-w-0 rounded-sm border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-primary aria-invalid:ring-3 aria-invalid:ring-primary/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}

export { Input }
