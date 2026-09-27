"use client";

import { useSyncExternalStore } from "react";
import { getGreetingPeriod, type GreetingPeriod } from "@/lib/services/greeting";

// Story 4.5's Greeting header (FR-27). `new Date().getHours()` reflects the
// browser's local clock — reading it directly in a render body would also
// run during this page's initial server render (it's a client component,
// but still SSR'd on first request), and the server's local hour can
// legitimately disagree with the visitor's (different OS/timezone),
// producing a hydration mismatch. `useSyncExternalStore`'s dedicated
// server-snapshot argument is the sanctioned way to give the server render
// a fixed value (`null` — nothing renders yet) while the client's first
// post-hydration read reflects the real local time, without the
// setState-in-effect anti-pattern an effect + useState would need instead.
// No subscription needed — the value only needs to be right per-mount, not
// live-ticking across a period boundary while the tab stays open (accepted
// limitation for a cosmetic header at this hobby-scale, single-user app).
const noopSubscribe = () => () => {};
const getServerSnapshot = () => null;

export function useGreetingPeriod(): GreetingPeriod | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => getGreetingPeriod(new Date().getHours()),
    getServerSnapshot
  );
}
