// Regression coverage for dayBoundary() — AD-5's sole Day-attribution
// authority, and the single most correctness-critical piece of date math
// in this codebase (Epic 3's budget/recommendation engine and Epic 5's
// trends both depend on it being right). Uses Node's built-in test runner
// (node:test/node:assert) rather than introducing a test framework — that
// decision is explicitly deferred project-wide (see deferred-work.md);
// this is scoped narrowly to one function via what Node already ships.
//
// Run with: node --test lib/services/day-boundary.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayBoundary, isValidTimeZone } from "./day-boundary.ts";

function localParts(instant: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const lookup = (type: Intl.DateTimeFormatPartTypes) => {
    const part = formatter.formatToParts(instant).find((p) => p.type === type);
    const value = parseInt(part!.value, 10);
    return type === "hour" && value === 24 ? 0 : value;
  };
  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
  };
}

test("a timestamp just before 5am is attributed to the still-open previous Day", () => {
  const t = new Date("2026-01-15T09:59:00Z"); // 04:59 America/New_York (EST)
  const { start, end } = dayBoundary(t, "America/New_York");
  const startLocal = localParts(start, "America/New_York");
  assert.equal(startLocal.day, 14);
  assert.equal(startLocal.hour, 5);
  assert.ok(t.getTime() >= start.getTime() && t.getTime() < end.getTime());
});

test("a timestamp just after 5am starts a new Day", () => {
  const t = new Date("2026-01-15T10:01:00Z"); // 05:01 America/New_York (EST)
  const { start } = dayBoundary(t, "America/New_York");
  const startLocal = localParts(start, "America/New_York");
  assert.equal(startLocal.day, 15);
  assert.equal(startLocal.hour, 5);
});

test("exactly 5:00:00 local is the inclusive start of the new Day", () => {
  const t = new Date("2026-01-15T10:00:00Z"); // exactly 05:00 EST
  const { start } = dayBoundary(t, "America/New_York");
  assert.equal(start.getTime(), t.getTime());
});

test("a half-hour-offset timezone (Asia/Kolkata) is handled correctly", () => {
  const t = new Date("2026-06-09T23:29:00Z"); // 04:59 Asia/Kolkata (June 10)
  const { start, end } = dayBoundary(t, "Asia/Kolkata");
  const startLocal = localParts(start, "Asia/Kolkata");
  assert.equal(startLocal.day, 9);
  assert.equal(startLocal.hour, 5);
  assert.ok(t.getTime() >= start.getTime() && t.getTime() < end.getTime());
});

test("a Day with no DST transition is exactly 24 hours", () => {
  const t = new Date("2026-01-15T15:00:00Z");
  const { start, end } = dayBoundary(t, "America/New_York");
  assert.equal((end.getTime() - start.getTime()) / 3600000, 24);
});

test("a Day spanning a DST spring-forward transition is 23 real-elapsed hours", () => {
  // 2026 US spring-forward: clocks jump 2am -> 3am on March 8. 10:00 local
  // on March 7 falls inside the Day window (Mar 7 05:00 -> Mar 8 05:00
  // local) that contains that transition.
  const t = new Date("2026-03-07T15:00:00Z"); // 10:00 America/New_York
  const { start, end } = dayBoundary(t, "America/New_York");
  const startLocal = localParts(start, "America/New_York");
  const endLocal = localParts(end, "America/New_York");
  assert.equal(startLocal.day, 7);
  assert.equal(startLocal.hour, 5);
  assert.equal(endLocal.day, 8);
  assert.equal(endLocal.hour, 5);
  assert.equal((end.getTime() - start.getTime()) / 3600000, 23);
});

test("isValidTimeZone accepts real IANA zones and rejects nonsense", () => {
  assert.equal(isValidTimeZone("America/New_York"), true);
  assert.equal(isValidTimeZone("Asia/Kolkata"), true);
  assert.equal(isValidTimeZone("UTC"), true);
  assert.equal(isValidTimeZone("Foo/Bar"), false);
  assert.equal(isValidTimeZone(""), false);
});

// KNOWN LIMITATION, not asserted correct here: a DST "fall back" (clocks
// repeat an hour) creates two valid UTC instants for the same local
// wall-clock time. zonedWallClockToUtc()'s two-pass correction picks
// *some* consistent instant, but which side of the fold isn't a
// deliberate, tested choice. This only matters if a region's fall-back
// transition hour coincides with the app's fixed 05:00 boundary, which no
// common timezone does (most transition between midnight and ~4am) — see
// deferred-work.md for the full reasoning. No test asserts a specific
// outcome for this case because none is currently guaranteed.
