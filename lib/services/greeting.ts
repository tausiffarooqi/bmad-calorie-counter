// Story 4.5's Greeting header (FR-27). A greeting-specific hour boundary
// set, deliberately distinct from FR-10/FR-11's Meal Slot windows and
// day-boundary.ts's 5am Day-start (EXPERIENCE.md Component Patterns):
// 5am-12pm morning, 12pm-5pm afternoon, 5pm-5am (next day) evening.
export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function getGreetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

// Omits the name entirely (never a placeholder) when null — FR-26's
// consequence for a pre-existing account with no Name on file. Deliberately
// returns no trailing punctuation — the caller (app/page.tsx) appends its
// own separately-colored period, and baking one in here would double up
// for any name that itself ends in "." (e.g. "Jr.", "Dr. A. Smith Sr.",
// both valid under lib/constants.ts's validateName()).
export function formatGreeting(period: GreetingPeriod, name: string | null): string {
  const label = { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening" }[
    period
  ];
  return name ? `${label}, ${name}` : label;
}
