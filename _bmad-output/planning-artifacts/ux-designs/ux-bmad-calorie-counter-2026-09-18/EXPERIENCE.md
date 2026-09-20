---
name: 'Calorie Tracker MVP'
status: final
created: '2026-09-18'
updated: '2026-09-19'
sources:
  - '_bmad-output/planning-artifacts/prds/prd-bmad-calorie-counter-2026-09-15/prd.md'
  - '_bmad-output/planning-artifacts/prds/prd-bmad-calorie-counter-2026-09-15/addendum.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-bmad-calorie-counter-2026-09-16/ARCHITECTURE-SPINE.md'
---

# Calorie Tracker MVP — Experience Spine

## Foundation

Mobile-first responsive web — the primary input (a meal photo) is captured on a phone, but the product must work from a desktop browser too (PRD §1). shadcn/ui on Next.js + Tailwind (per `ARCHITECTURE-SPINE.md`); `DESIGN.md` is the visual identity reference, this spine is the behavior. Single-tenant, single-user-per-account — there is no sharing, no team surface, no multi-user concept anywhere in this product (PRD Non-Goals). Light mode only for this build.

## Information Architecture

| Surface | Reached from | Purpose |
| --- | --- | --- |
| Login | App open, not authenticated | Email + password sign-in. Link to Register. |
| Register | Login screen link | Email + password + confirm, **plus Daily Calorie Target** (pre-filled with a standard adult default, editable) — collected at account creation per FR-13, not deferred to Preferences. Creates account, logs straight in (email confirmation disabled on the self-hosted Supabase instance for this prototype). Link to Login. |
| Daily view (home) | App open, authenticated | Remaining Calorie Budget, today's logged Entries, log actions, Recommendation(s) for remaining Meal Slots. The default landing surface after login. |
| Log Entry flow | Daily view — Add Photo / Add Text | Capture a photo or type a description; in-progress indicator while estimating; retry prompt on insufficient detail (FR-4). Returns to Daily view on success. |
| First-login prompt | Daily view, first open of a new Day | Remaining budget + "log a meal?" ask, conditional pre-10am breakfast offer, tone-adaptive message about yesterday (FR-15–FR-18). |
| Account / Preferences | Daily view — settings icon | Daily Calorie Target (set at Register, changeable here per FR-13), Dietary Preference (veg / non-veg). |
| Historical Trends | Daily view — nav link | 3-month day-by-day view + aggregate stats (Could-have, FR-22/FR-23). |

Single-column throughout; no sidebar, no multi-panel dashboard (see `DESIGN.md.Layout & Spacing`). Modal/sheet stacks one level deep — the Log Entry flow and First-login prompt are the only overlay-style surfaces, and neither ever opens on top of the other.

→ Composition reference: `mockups/daily-view.html` (Daily view — primary, Over-Target, and First-login states). Spine wins on conflict.

## Voice and Tone

Microcopy only — brand voice and aesthetic posture live in `DESIGN.md.Brand & Style`. The governing rule, direct from PRD FR-18: supportive and encouraging, **never shaming**, even when the news is "over target." No exclamation-point enthusiasm, no gamified praise.

| Do | Don't |
| --- | --- |
| "180 calories over target today. No recommendation for now — tomorrow's a fresh start." | "You've blown your calorie budget! ⚠️" |
| "You stayed within your target yesterday — nice, steady work." | "Amazing job! You crushed your goal! 🎉" |
| "Try a grilled paneer wrap with sautéed greens." | "AI Recommendation: Grilled Paneer Wrap (95% match)" |
| "Log a meal now?" | "Ready to log your food intake?" |
| "Need a bit more detail to estimate this one." | "Error: insufficient input for calorie estimation." |
| Same understated tone whether the day went well or poorly. | A cheerier voice on good days, a clinical/cold voice on bad days. |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`. Every button across every surface (Log buttons, Login/Register submit, First-login prompt actions, Preferences save) is one of DESIGN.md's two Button components (`button-primary` / `button-secondary`) — surfaces differ only in label and count, never in a new button treatment.

| Component | Use | Behavioral rules |
| --- | --- | --- |
| Log buttons (Add Photo / Add Text) | Daily view | Two equal-weight entry points into the Log Entry flow. Photo opens the device camera/file picker; Text opens a single-line-to-multiline input. Exactly one of the two is used per Entry — there's no combined photo+text submission in MVP. |
| Entries list | Daily view | One bordered container, entries as rows (not individual cards — see `DESIGN.md`). Each row: meal/item description + calorie value. Chronological, most recent last. No edit/delete in MVP (not in PRD scope). |
| Recommendation card | Daily view | **One card per remaining Meal Slot** — 2, stacked, during the 5am–12pm window (lunch + dinner, FR-10); 1 (dinner only) from 12pm–10pm; 0 or 1 after 10pm per FR-11. Cards stack in the same bordered-container register as the Entries list, always the last element(s) on the surface. Shows nothing if the Over-Target State is active (FR-12) — the Over-Target banner replaces all of them at once, never alongside any card. Recommendation text is a deterministic lookup (`ARCHITECTURE-SPINE.md` AD-8, keyed on slot × Dietary Preference × budget state) — the same key returns the same suggestion verbatim on a different day; this is expected, not a bug, and nothing in the copy implies the system is reasoning about what was actually eaten. |
| Over-Target banner | Daily view | Replaces the Recommendation card when active. States excess calories plainly, in `{colors.primary}` (clay) — never a red/alarm treatment (FR-12, FR-18). |
| First-login prompt cards | First-login prompt | Sequential, not simultaneous: the "log a meal?" ask always appears; the breakfast offer (if before 10am) appears as a second card below it, never merged into one compound question. |
| In-progress indicator | Log Entry flow | Appears the instant a photo/text Entry is submitted; persists until the estimate returns — however long that takes (`ARCHITECTURE-SPINE.md` AD-9). Never a spinner alone — pairs with a short calm label ("Estimating…"), not a bare progress animation, so a long wait still reads as "working," not "stuck." |
| Retry prompt | Log Entry flow | Replaces the in-progress indicator when FR-4 triggers. States plainly that more detail is needed (not a generic error) and keeps the user's original input editable rather than clearing the field. Same `retry-prompt` treatment (DESIGN.md) also covers a hard estimation failure (network drop, the Gemini call erroring rather than returning ambiguously) — see State Patterns. |
| Hard estimation failure | Log Entry flow | Distinct from FR-4's retry: the estimation call itself failed rather than returning an "insufficient detail" result. Same visual treatment as the Retry prompt (`retry-prompt` component), but the copy says the attempt failed and offers a plain "Try again" — the user's input is preserved, resubmission re-runs the same call. |
| Photo-only notice | Log Entry flow (photo path) | A short standing in-app notice near the Add Photo action instructing users to upload meal photos only, to reduce the risk of accidentally uploading unrelated personal photos (FR-21). Not a dismissible dialog the user must acknowledge — a persistent small-print line, consistent with the calm/low-friction register. |

## State Patterns

| State | Surface | Treatment |
| --- | --- | --- |
| Cold load | Daily view | Brief skeleton placeholder matching the eventual layout (budget number, entries container) while today's data loads from Supabase — resolves the instant data arrives, no separate "loading screen." |
| No entries yet today | Daily view | Entries list is omitted entirely (not shown empty) — Remaining Calorie Budget and log actions are the whole surface until the first Entry lands. |
| Estimating (in progress) | Log Entry flow | In-progress indicator per Component Patterns above. No timeout-driven error — the request is allowed to run long (soft SM-1 target, not a hard ceiling). |
| Insufficient detail (retry) | Log Entry flow | Retry prompt per Component Patterns above. Not logged as a failed Entry — no partial/zero-calorie row appears in the list. |
| Hard estimation failure | Log Entry flow | Distinct from the row above — the call itself failed rather than returning ambiguously. Same `retry-prompt` visual treatment, "Try again" copy, input preserved. See Component Patterns. |
| Over-Target | Daily view | Over-Target banner replaces every Recommendation card at once. Takes precedence over every other recommendation-producing state, including the first-login breakfast offer and any decline-path recommendations (`prd.md` FR-12). |
| 2 Meal Slots remaining (5am–12pm) | Daily view | Two Recommendation cards stack, lunch then dinner (FR-10). Not merged into one card — each slot's suggestion is independently readable. |
| 1 Meal Slot remaining (12pm–10pm) | Daily view | One Recommendation card (dinner) — same as depicted in `mockups/daily-view.html`. |
| After 10pm, target not yet met | Daily view | One Recommendation card (dinner) per FR-11. |
| After 10pm, target already met | Daily view | No Recommendation card at all — not an Over-Target banner either, simply nothing recommended (FR-11 is distinct from FR-12: this is "done for the day," not "over budget"). |
| First login, before 10am | First-login prompt | Both cards shown: log-a-meal ask + breakfast offer. Declining the log-a-meal ask (FR-16) still surfaces the Daily view underneath with its normal Recommendation card(s) for the remaining Meal Slots — decline is never a dead end into an empty screen. |
| First login, after 10am | First-login prompt | Log-a-meal ask only — no breakfast card. Same decline behavior as above. |
| First login, previous Day had no Entries | First-login prompt | Tone-adaptive message is neutral — neither congratulatory nor consoling (`prd.md` FR-18 consequence). |
| Login/Register failure | Login, Register | Inline field-level message (wrong password, email already registered) — no full-page error state. |
| Preferences saved | Account / Preferences | Brief inline confirmation next to the changed field (e.g. Daily Calorie Target) — no full-page reload, no modal. |
| Preferences validation error | Account / Preferences | Inline, field-level (e.g. a non-numeric or zero Daily Calorie Target) — same pattern as Login/Register failure. |
| Trends: no Entries at all yet | Historical Trends | A short calm statement ("Nothing logged yet — check back once you've tracked a few days.") in place of an empty chart, not a bare blank view. |
| Trends: day with no logged Entries | Historical Trends | That day is omitted from the view, not shown as a zero-calorie day (`prd.md` FR-22 consequence — no fabricated zero days). |

## Interaction Primitives

**Tap-first.** This is a phone-in-hand product; there are no keyboard shortcuts or power-user affordances (contrast with a keyboard-first desktop tool). Every screen has exactly one primary action (`{colors.primary}` button) and, where relevant, one secondary action (`{colors.card}`/outline button) — never more than two competing actions on a surface.

- Photo capture: tapping "Add Photo" opens the device's native camera/file picker directly — no in-app custom camera UI for MVP.
- Text entry: single tap into a plain text field, free-form natural language (no structured fields for food name/quantity).
- Retry: editing the same input field and resubmitting — never a "start over" action that discards what was typed.
- Dismissing the first-login prompt ("Not now" / "Skip") always lands on the same Daily view, just without having logged anything — declining is never a dead end (FR-16).

**Banned:** hover-only affordances (no hover state exists on mobile — every interactive element must be tap-legible on its own), infinite scroll (Entries list and Trends are both bounded, single-Day / 3-month datasets), multi-step wizards for logging an Entry (it's one screen, one action).

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md` (Muted Earth palette checked for readable contrast between `{colors.foreground}`/`{colors.muted-foreground}` and their backgrounds). Reasonable baseline for a single-user prototype — no formal WCAG level targeted.

- Tap targets (buttons, cards, prompt actions) sized comfortably for one-handed phone use — no fine-motor-dependent small controls.
- Every icon-only control (camera/photo action) carries a text label or accessible name, not icon-alone.
- Form inputs (Login, Register, Preferences) have visible labels, not placeholder-only text.
- Focus states use `{colors.ring}` (clay) at a visible contrast against `{colors.background}`.
- The in-progress indicator's "Estimating…" label is readable by a screen reader, not just visually implied by animation.

## Responsive & Platform

| Breakpoint | Behavior |
| --- | --- |
| `< md` (phone) | The primary target — camera capture happens here. |
| `≥ md` (tablet/desktop) | This is a mobile-web product that also works on desktop, not a desktop product that shrinks. Layout unchanged from phone — see `DESIGN.md.Layout & Spacing`. |

## Inspiration & Anti-patterns

- **Lifted from personal journaling/notebook apps:** the calm, low-chrome register — one thing on the page at a time, generous whitespace, no dashboard widgets competing for attention.
- **Lifted from shadcn:** the entire structural/interaction vocabulary (forms, dialogs, buttons). The brand layer is what's added on top, not a from-scratch system.
- **Rejected — streaks, badges, gamified progress bars:** this product is explicitly not a habit-gamification app (PRD Non-Goals: "not social," and FR-18's anti-shaming stance rules out guilt-driven mechanics too).
- **Rejected — red/alarm treatment for going over target:** directly contradicts FR-18. The Over-Target state is informational, not punitive.
- **Rejected — multi-widget dashboard home screen:** the Daily view is one linear column (budget → entries → log actions → recommendation), not a grid of stat tiles.
- **Rejected — AI-confidence scores or percentage-match labels on Recommendations:** the addendum's own research flags that overpromising accuracy erodes trust; the Recommendation reads as a plain suggestion, not a scored AI output.

## Key Flows

### Flow 1 — First login of the day (Tausif, weekday, 7:40am) — realizes UJ-1

1. Tausif opens the app before work. He's authenticated already (session persists from GoTrue).
2. First-login prompt appears: "Good morning." followed by yesterday's tone-adaptive message — "You stayed within your target yesterday — nice, steady work."
3. First card: "Remaining budget today: 2,000 calories. Log a meal now?" He hasn't eaten yet, so he taps "Not now."
4. Declining doesn't dead-end him (FR-16): the Daily view underneath is already showing its normal state for this time of day — two Recommendation cards stacked, lunch and dinner, since it's before noon.
5. Second card (it's before 10am): "Want a breakfast recommendation too?" He taps "Yes, suggest one." A third card appears above the other two — breakfast, a separate slot on top of the 2 from the 5am–12pm window (FR-17), never replacing them.
6. **Climax:** Three Recommendation cards now sit stacked on the Daily view — breakfast, lunch, dinner — the whole rest of his day laid out at a glance, in the same calm register whether he asked for one card or three. No separate celebratory flow for "you engaged with the app." He reads them, decides what to make first, and moves on with his morning.

Failure: none of the surfaces here modally require an answer — every card has a decline path (FR-16) that lands cleanly back on the Daily view, recommendations and all.

### Flow 2 — Logging lunch by photo (Tausif, midday, 1:15pm) — realizes UJ-2

1. Tausif has just finished a paneer tikka bowl. He opens the Daily view — Remaining budget shows 1,680 (target 2,000, minus his 320-calorie breakfast).
2. He taps "Add Photo," his phone's camera opens, he snaps the plate.
3. In-progress indicator appears immediately: "Estimating…" — it stays up for however long the vision call takes.
4. Estimate returns: the photo is discarded per FR-6; only "Paneer tikka bowl" and its calorie value are added to the Entries list. Remaining budget updates to 1,240.
5. **Climax:** Below the updated entries, a single Dinner Recommendation appears (only one slot remains — it's past noon) — "Try a grilled paneer wrap with sautéed greens" — set in the italic Lora treatment that marks it as the one considered suggestion on the page, not another data row. He didn't have to ask for it; it was just there. (The suggestion comes from a fixed vegetarian-dinner rotation keyed to the slot and his Dietary Preference, not from reasoning about the paneer tikka bowl he just logged — the same dinner slot on a similar day would suggest the same thing.)

Failure: the photo is too ambiguous to estimate confidently (FR-4) — the in-progress indicator is replaced by a retry prompt: "Need a bit more detail to estimate this one." He retakes the photo from the same screen; nothing he already did is lost.

### Flow 3 — Logging a snack by text (Tausif, afternoon, 4:30pm) — realizes UJ-3

1. Tausif has a can of diet soda and a small bag of chips at his desk. He taps "Add Text" and types exactly that.
2. In-progress indicator, then the estimate lands: classified as a Snack/Beverage (FR-7), not a Meal.
3. **Climax:** Remaining budget shrinks by the snack's calories, but the Dinner Recommendation directly below stays exactly as it was before he logged it — same slot count, same suggestion. The distinction between "this affects my budget" and "this doesn't cost me a meal slot" is legible just from what does and doesn't change on the screen, with no explanatory copy needed.

Failure: none specific to this flow beyond the shared FR-4 retry path.

### Flow 4 — Already over target (Tausif, evening, 9:00pm) — realizes UJ-4

1. Tausif logs a large thali platter for dinner, already having eaten more than planned earlier.
2. In-progress indicator, then the estimate lands and pushes him into the Over-Target State.
3. **Climax:** The Recommendation card that would normally appear here is simply not present. In its place: an Over-Target banner, in the same clay tone as every other primary element on the page — "180 calories over target today. No recommendation for now — tomorrow's a fresh start." Nothing flashes red, nothing scolds. The app just stops suggesting more food and says plainly where things stand.

Failure: none — this state has no failure branch, only the one deliberate behavior change (recommendations stop, excess is reported).
