// Story 4.1's Hero card (UX-DR29) — pure, sync budget-display math, mirroring
// this codebase's established convention for derived-display logic
// (budget-engine.ts, trends.ts, greeting.ts all get the same pure+tested
// treatment).
export interface HeroBudgetDisplay {
  // Bar width, capped [0, 100] — Over-Target State never overflows the
  // track (UX-DR29, DESIGN.md).
  barWidthPercent: number;
  // Uncapped — the caption reports a fact ("147% of target"), not a gauge.
  percentOfTarget: number;
  remainingCaption: string;
}

export function computeHeroBudgetDisplay(
  remainingBudget: number,
  dailyCalorieTarget: number
): HeroBudgetDisplay {
  const consumed = dailyCalorieTarget - remainingBudget;
  const percentOfTarget =
    dailyCalorieTarget > 0 ? Math.round((consumed / dailyCalorieTarget) * 100) : 0;
  const barWidthPercent = Math.min(100, Math.max(0, percentOfTarget));
  const remainingCaption =
    remainingBudget >= 0
      ? `${remainingBudget.toLocaleString()} kcal remaining`
      : `${Math.abs(remainingBudget).toLocaleString()} kcal over`;

  return { barWidthPercent, percentOfTarget, remainingCaption };
}
