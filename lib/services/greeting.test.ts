// Unit coverage for greeting.ts's getGreetingPeriod()/formatGreeting() -- pure
// and sync, exhaustively testable (mirrors tone-message.test.ts's approach).
// Uses Node's built-in test runner (node:test/node:assert), same as every
// other *.test.ts in this directory.
//
// Run with: node --test lib/services/greeting.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { getGreetingPeriod, formatGreeting } from "./greeting.ts";

// I/O & Edge-Case Matrix: boundary hours for each period.
test("hour 4 classifies as evening (the previous day's late-night tail)", () => {
  assert.equal(getGreetingPeriod(4), "evening");
});

test("hour 5 classifies as morning (the boundary itself)", () => {
  assert.equal(getGreetingPeriod(5), "morning");
});

test("hour 11 classifies as morning (last morning hour)", () => {
  assert.equal(getGreetingPeriod(11), "morning");
});

test("hour 12 classifies as afternoon (the boundary itself)", () => {
  assert.equal(getGreetingPeriod(12), "afternoon");
});

test("hour 16 classifies as afternoon (last afternoon hour)", () => {
  assert.equal(getGreetingPeriod(16), "afternoon");
});

test("hour 17 classifies as evening (the boundary itself)", () => {
  assert.equal(getGreetingPeriod(17), "evening");
});

test("hour 23 classifies as evening", () => {
  assert.equal(getGreetingPeriod(23), "evening");
});

test("hour 0 (midnight) classifies as evening", () => {
  assert.equal(getGreetingPeriod(0), "evening");
});

// FR-27: name present, every period.
test("formats a morning greeting with the user's name", () => {
  assert.equal(formatGreeting("morning", "Alex"), "Good morning, Alex");
});

test("formats an afternoon greeting with the user's name", () => {
  assert.equal(formatGreeting("afternoon", "Alex"), "Good afternoon, Alex");
});

test("formats an evening greeting with the user's name", () => {
  assert.equal(formatGreeting("evening", "Alex"), "Good evening, Alex");
});

// FR-27 consequence: no Name on file omits the name entirely, never a
// placeholder or blank space -- every period.
test("omits the name entirely when null (morning)", () => {
  assert.equal(formatGreeting("morning", null), "Good morning");
});

test("omits the name entirely when null (afternoon)", () => {
  assert.equal(formatGreeting("afternoon", null), "Good afternoon");
});

test("omits the name entirely when null (evening)", () => {
  assert.equal(formatGreeting("evening", null), "Good evening");
});

// No trailing punctuation baked in -- the caller (app/page.tsx) appends its
// own colored period. A name ending in "." (e.g. "Jr.", valid under
// validateName()) must never produce a doubled "..".
test("never appends its own trailing period, even for a name ending in one", () => {
  assert.equal(formatGreeting("morning", "Jr."), "Good morning, Jr.");
});
