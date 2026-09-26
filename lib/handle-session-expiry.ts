"use client";

// Epic 2 retro action item: consolidates what were two independently
// duplicated "session expired mid-request" checks (originally
// preferences-form.tsx and use-daily-view.ts, now also trends/page.tsx)
// into one shared predicate + action. Each call site already checked
// `response.redirected` for the case proxy.ts's own redirect fires (its
// login-page HTML body would otherwise throw if parsed as JSON) — this
// adds the case that was missing everywhere: a route's own defense-in-depth
// `{ error: { code: "unauthenticated" } }` JSON body (reached only if
// proxy.ts's redirect is ever bypassed or its matcher narrowed), which
// previously surfaced as a generic inline error instead of the same
// recovery `response.redirected` already gets.
export function isUnauthenticatedErrorBody(body: unknown): boolean {
  const error = (body as { error?: { code?: string } } | null | undefined)?.error;
  return error?.code === "unauthenticated";
}

export function redirectToLogin(): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = "/login";
}
