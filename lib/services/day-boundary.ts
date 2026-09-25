// AD-5's single source of truth for "which Day does this Entry belong to" —
// a Day runs 5am-to-next-5am local time in the caller's IANA timezone. No
// other file performs this date math (Boundaries & Constraints: "no inline
// date math anywhere else, including the new route/query").
const DAY_START_HOUR = 5;

// Whether `tz` is an IANA timezone string this runtime's Intl
// implementation accepts. Lives here (not in the route) so there is
// exactly one place that decides "is this timezone acceptable" — a
// separate reimplementation would risk drifting from what
// getLocalParts()/dayBoundary() itself actually relies on.
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// Reads the local wall-clock date/time `instant` represents in `tz`.
function getLocalParts(instant: Date, tz: string): LocalParts {
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
    if (!part) {
      throw new Error(`Intl.DateTimeFormat did not produce a "${type}" part.`);
    }
    // Midnight is formatted as "24" under hourCycle: "h23" by some engines —
    // normalize to 0 so it lines up with Date.UTC's 0-23 range.
    const value = parseInt(part.value, 10);
    return type === "hour" && value === 24 ? 0 : value;
  };

  return {
    year: lookup("year"),
    month: lookup("month"),
    day: lookup("day"),
    hour: lookup("hour"),
    minute: lookup("minute"),
    second: lookup("second"),
  };
}

// Converts a local wall-clock date/time in `tz` to the UTC instant it
// represents. `Intl.DateTimeFormat` only converts UTC -> local, never the
// reverse, so this guesses the instant by first treating the wall clock as
// if it were UTC, measures that guess's actual offset in `tz`, and corrects
// for it — two passes converge even across a DST transition, without
// pulling in a date library (Code Map: "no new dependency").
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  tz: string
): Date {
  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guessMs = desiredAsUtcMs;

  for (let i = 0; i < 2; i++) {
    const parts = getLocalParts(new Date(guessMs), tz);
    const guessLocalAsUtcMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const offsetMs = guessLocalAsUtcMs - guessMs;
    guessMs = desiredAsUtcMs - offsetMs;
  }

  return new Date(guessMs);
}

// Computes the UTC instants bounding the 5am-to-next-5am local Day that
// `timestamp` falls in, for the given IANA timezone.
export function dayBoundary(timestamp: Date, tz: string): { start: Date; end: Date } {
  const local = getLocalParts(timestamp, tz);

  // Anchor calendar date for the Day's 5am start: before 5am local,
  // `timestamp` belongs to the Day that opened the *previous* calendar
  // date at 5am, not one starting today (I/O matrix: "Entry logged just
  // before 5am ... attributed to the Day that's still open").
  const anchorOffsetDays = local.hour < DAY_START_HOUR ? -1 : 0;
  const anchorMs = Date.UTC(local.year, local.month - 1, local.day + anchorOffsetDays);
  const anchor = new Date(anchorMs);
  const anchorYear = anchor.getUTCFullYear();
  const anchorMonth = anchor.getUTCMonth() + 1;
  const anchorDay = anchor.getUTCDate();

  const start = zonedWallClockToUtc(
    anchorYear,
    anchorMonth,
    anchorDay,
    DAY_START_HOUR,
    0,
    0,
    tz
  );

  // Date.UTC normalizes day overflow (e.g. day 31 of a 30-day month) into
  // the correct next calendar date, so this is safe across month/year
  // boundaries too.
  const nextMs = Date.UTC(anchorYear, anchorMonth - 1, anchorDay + 1);
  const next = new Date(nextMs);

  const end = zonedWallClockToUtc(
    next.getUTCFullYear(),
    next.getUTCMonth() + 1,
    next.getUTCDate(),
    DAY_START_HOUR,
    0,
    0,
    tz
  );

  return { start, end };
}

// Derives "yesterday's" Day window from an already-computed `todayStart`
// instant (Story 4.2's tone-message lookup) — one instant before today's
// Day-start, run back through `dayBoundary()` itself rather than separate
// date math, since that's the only function allowed to decide Day
// attribution (module header above).
export function previousDayBoundary(todayStart: Date, tz: string): { start: Date; end: Date } {
  return dayBoundary(new Date(todayStart.getTime() - 1), tz);
}
