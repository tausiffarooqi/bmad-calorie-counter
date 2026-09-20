---
title: Calorie Tracker MVP
status: final
created: 2026-09-15
updated: 2026-09-19
---

# PRD: Calorie Tracker MVP

## 0. Document Purpose

This PRD scopes a solo-use, web-only prototype for tracking daily calorie intake via photo or text meal logging. It's written for the builder (Tausif), who will carry this straight into architecture and epics/stories. It builds directly on the brainstorming session's intent doc (`_bmad-output/brainstorming/brainstorm-calorie-tracker-mvp-2026-09-15/brainstorm-intent.md`) — that document is not duplicated here, only distilled and made testable. Features are grouped with functional requirements (FRs) nested under them; inline `[ASSUMPTION]` tags mark places inferred without explicit confirmation, indexed in §9.

## 1. Vision

Most people trying to manage their weight are guessing — they don't know how many calories they've eaten today, or what they should eat next to hit their target. This app removes the guesswork: log a meal by snapping a photo or typing a quick description, and within seconds get an estimate of that meal's calories, your remaining budget for the day, and a concrete recommendation for what to eat for each meal still ahead.

This is a personal, private tool — no social features, no sharing, no coaching-by-committee. It's the meal-logging slice of a larger personal fitness app the user plans to build later, cut out and shipped fast as a standalone prototype to demonstrate how quickly a focused app like this can go from idea to working software.

**Platform:** web application, must work from a mobile browser as well as desktop, since meal photos are most naturally captured on a phone. `[ASSUMPTION: responsive/mobile-web support is required even though not stated explicitly — photo capture is the primary input mode and overwhelmingly happens on phones.]`

## 2. Target User

### 2.1 Jobs To Be Done
- Lose weight, by keeping actual daily intake honest against a target.
- Build a healthier eating habit day over day, without needing to do the math themselves.
- Maintain current weight — avoid slow, unnoticed calorie creep.
- Replace guessing about "how much have I eaten" and "what should I eat next" with a concrete answer, in seconds.

### 2.2 Key User Journeys
*Hobby/prototype scope — single-sentence form.*

- **UJ-1.** A user opens the app for the first time that day before 10am; sees remaining calories for the day, is asked if they want to log a meal, and is offered an optional breakfast recommendation as a third meal slot.
- **UJ-2.** A user photographs their lunch plate midday; the app recognizes the food, estimates its calories, updates their remaining budget, and returns one dinner recommendation.
- **UJ-3.** A user logs a snack via text ("a can of diet soda and a small bag of chips") in the afternoon; their remaining budget shrinks but their dinner recommendation stays exactly one slot, unchanged in count.
- **UJ-4.** A user has already exceeded their daily calorie target and logs another meal in the evening; instead of a recommendation, the app reports how far over budget they now are.

## 3. Glossary

- **Entry** — A single logged item submitted by the user, via photo or free text, timestamped at submission.
- **Meal** — An Entry classified as a full meal (breakfast, lunch, or dinner); consumes a Meal Slot.
- **Snack/Beverage** — An Entry classified as not a full meal (e.g. a snack, tea, coffee); reduces the Remaining Calorie Budget but does not consume a Meal Slot.
- **Meal Slot** — One of the day's expected meal-recommendation opportunities (breakfast, lunch, dinner), whose count and timing depend on time-of-day rules.
- **Daily Calorie Target** — The user's self-set (or defaulted) total calorie goal for one Day.
- **Remaining Calorie Budget** — Daily Calorie Target minus calories from all Entries logged so far in the current Day.
- **Day** — The tracking period from 5am to the next day's 5am, in the user's local timezone. Entries logged between 12am and 5am are attributed to the Day that is still open (the one that started the previous 5am), not a new Day.
- **Over-Target State** — The condition where cumulative Entry calories exceed the Daily Calorie Target for the current Day; suppresses further recommendations in favor of reporting excess calories.
- **Recommendation** — A suggested meal for a given Meal Slot, generated according to the user's Dietary Preference.
- **Dietary Preference** — The user's account-level setting (vegetarian or non-vegetarian) that drives Recommendation content.
- **Estimation Pipeline** — The process that converts an Entry (photo or text) into an estimated calorie count.

## 4. Features

### 4.1 Meal Logging & Calorie Estimation
**Description:** The core input surface. A user submits an Entry as a photo or free text; the system runs it through the Estimation Pipeline to produce a calorie estimate, or asks the user to retry if the input is too vague to estimate honestly. Realizes UJ-1, UJ-2, UJ-3.

**Functional Requirements:**

#### FR-1: Dual input modes
User can submit an Entry as either a photo upload or a free-text description.

**Consequences (testable):**
- Both input modes are available from the same logging screen.
- A free-text Entry accepts natural-language descriptions (e.g. "one double cheeseburger and medium fries with a can of diet soda").

#### FR-2: Photo estimation pipeline
For a photo Entry, system runs vision recognition to identify the food, generates a text description of what it found, then calculates estimated calories from that description.

**Consequences (testable):**
- The generated text description is stored alongside the Entry (see FR-6).
- `[ASSUMPTION: estimates are presented as a single number, not a confidence range, for MVP — full uncertainty display deferred.]`

#### FR-3: Text estimation pipeline
For a free-text Entry, system calculates estimated calories directly from the user's description, without a separate recognition step.

#### FR-4: Retry on insufficient detail
If a photo or text Entry does not contain enough detail to produce a reliable estimate, system does not guess — it prompts the user to retry with more detail.

**Consequences (testable):**
- No Entry is logged with a calorie value until the system has enough detail to estimate it.
- The retry prompt indicates that more detail is needed (not a generic error).

#### FR-5: Entry timestamping
Every Entry (photo or text) is timestamped at the moment of submission.

#### FR-6: Photo discarded, description retained
Once a photo Entry has been analyzed, the original photo is discarded; only the system-generated text description is retained as part of the permanent log record.

**Feature-specific NFRs:**
- Combined FR-2/FR-3 + FR-8 (response composition) round trip targets under 5 seconds (see SM-1) — a soft goal; see FR-9 for the in-progress-indicator requirement if it runs longer.

**Notes:**
- `[NOTE FOR PM]` Photo-based calorie estimation, industry-wide, typically runs ~11–20% error even for leading apps and tends to underestimate mixed/complex meals. This PRD treats estimates as directional, not clinical-grade (see §5 Non-Goals).

### 4.2 Calorie Budget & Recommendation Engine
**Description:** Once an Entry is estimated, the system classifies it, updates the day's running budget, and decides what (if anything) to recommend for the meals still ahead. Realizes UJ-2, UJ-3, UJ-4.

**Functional Requirements:**

#### FR-7: Entry classification
System automatically classifies each Entry as a Meal or a Snack/Beverage.

#### FR-8: Snack/beverage budget effect
A Snack/Beverage Entry reduces the Remaining Calorie Budget but does not consume a Meal Slot and never receives its own Recommendation.

#### FR-9: Per-submission response
For each Entry submitted, system returns: the estimated calories for that Entry, the updated Remaining Calorie Budget for the Day, and one Recommendation per remaining Meal Slot.

**Consequences (testable):**
- While an estimate is pending, the UI shows a clear in-progress indicator — it never appears frozen or unresponsive, regardless of how long estimation takes (see SM-1).

#### FR-10: Time-of-day Meal Slot windows
The number of remaining Meal Slots depends on when the Entry is submitted: 5am–12pm → 2 slots (lunch, dinner); 12pm–10pm → 1 slot (dinner).

#### FR-11: After-10pm conditional recommendation
After 10pm, system provides a Recommendation for the dinner Meal Slot only if the Daily Calorie Target has not yet been met; if it has, no Recommendation is given.

#### FR-12: Over-Target override
At any time of day, once the user enters the Over-Target State, system stops issuing Recommendations entirely — across every path that would otherwise produce one (FR-10's time-of-day windows, FR-11's after-10pm check, FR-16's decline-path recommendations, and FR-17's breakfast offer) — and instead reports the excess calories consumed. This rule takes precedence over all of them, without exception.

**Feature-specific NFRs:**
- Classification (FR-7) and budget/recommendation logic (FR-8–FR-12) target the same soft 5-second response budget as estimation (see SM-1), but are not blocked on hitting it.

### 4.3 Daily Target & Day Boundary
**Description:** Defines what a "Day" is and where the Daily Calorie Target comes from.

**Functional Requirements:**

#### FR-13: Daily Calorie Target
User enters their Daily Calorie Target as a flat value when they create their account. It can be changed later on the preferences page.

**Consequences (testable):**
- The target is a single number the user enters directly — not computed from age, sex, height, or weight.
- `[ASSUMPTION: the account-creation screen suggests a standard adult daily intake value (e.g. ~2000 kcal) as a pre-filled starting point, which the user can accept or change.]`

#### FR-14: Day boundary
A Day runs from 5am to the next day's 5am, in the user's local timezone. An Entry logged between 12am and 5am is attributed to the Day that is still open (the one that started the previous 5am), not a new Day.

**Consequences (testable):**
- `[ASSUMPTION: timezone is auto-detected from the user's browser/device at login; no manual timezone override in MVP.]`

### 4.4 First-Login Daily Engagement *(Should-have)*
**Description:** A lightweight daily check-in that gives the user a reason to open the app even when they aren't actively logging a meal, and sets a supportive tone for the day. Realizes UJ-1.

**Functional Requirements:**

#### FR-15: First-login prompt
On the user's first login of a given Day, system displays the Remaining Calorie Budget and asks whether the user wants to log a meal now.

#### FR-16: Decline-path recommendations
If the user declines to log a meal at first login, system still displays Recommendations for the remaining Meal Slots based on current progress.

#### FR-17: Pre-10am breakfast offer
If first login occurs before 10am, system additionally asks whether the user wants a breakfast Recommendation. Breakfast is a separate, third Meal Slot — on top of, not counted within, the 2 slots from the 5am–12pm window.

#### FR-18: Tone-adaptive daily message
First login includes a message reflecting the previous Day's performance: congratulatory/confidence-building if the user stayed within their Daily Calorie Target, supportive and encouraging (never shaming) if they exceeded it.

**Consequences (testable):**
- If the previous Day had no logged Entries at all, the message is neutral — neither congratulatory nor consoling — it does not fabricate a within-target or over-target result for a Day with no data.

### 4.5 Dietary Preference & Recommendation Content
**Description:** Drives what a Recommendation actually suggests. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-19: Dietary preference setting
User can set a Dietary Preference (vegetarian or non-vegetarian) on the account page; this drives the content of all Recommendations.

**Consequences (testable):**
- `[ASSUMPTION: until the user explicitly sets a Dietary Preference, it defaults to non-vegetarian, so Recommendation content always has a defined value to look up — not left undefined for a new user who hasn't visited the account page yet.]`

**Out of Scope:**
- Finer-grained preferences (macros, cuisine, allergies, etc.) — deferred, see §5.

### 4.6 Account & Security *(Could-have — prototype stage; include if low-friction)*
**Description:** Baseline account creation so calorie data is tied to a single private user. Flagged as Could-have because this is a prototype, but not silently dropped — see `[NOTE FOR PM]` below.

**Functional Requirements:**

#### FR-20: Account creation and login
User can create an account and log in via email and password.

**Out of Scope:**
- Account recovery / forgot-password flow — not needed for this prototype.

#### FR-21: Meal-photo-only guidance
System displays an in-app notice instructing users to upload meal photos only, to reduce the risk of accidentally uploading unrelated personal photos.

**Notes:**
- `[NOTE FOR PM]` Daily Calorie Target and actual intake are personal, sensitive-feeling data even though not classic PII, and the credential system protecting them is squarely a target for data harvesting aimed at ad-targeting/marketing (the stated threat model), not just account takeover. Deprioritized to Could-have for this prototype, but should be revisited before any real users' data is involved. See §6.2 Out of Scope.

### 4.7 Historical Trends Dashboard *(Could-have)*
**Description:** A simple rolling 3-month view so the user can see how they're doing over time, beyond the current Day's snapshot.

**Functional Requirements:**

#### FR-22: 3-month trend view
User can view a dashboard showing, for each day in the last 3 months, total calories consumed against that day's Daily Calorie Target.

**Consequences (testable):**
- Only days with at least one logged Entry show data; days with no Entries are not fabricated as zero.

#### FR-23: Trend summary stats
The dashboard also shows simple aggregate stats over the 3-month window: the number/percentage of days within target vs. over target, and the average daily calories consumed.

**Out of Scope:**
- No export, no goal-setting-over-time, no correlation analytics (e.g. against weight or activity) — a plain historical view only.

## 5. Non-Goals (Explicit)

- **Not clinical-grade accuracy.** Calorie estimates — especially from photos — are directional guidance, not a medical-grade measurement. Industry-wide, even leading photo-based calorie apps run ~11–20% error and systematically underestimate mixed/complex meals; this product will not claim otherwise.
- **Not multi-channel (yet).** Telegram/WhatsApp intake is explicitly deferred; web is the only surface in this build.
- **Not fine-grained nutrition.** No macro tracking, cuisine filtering, or allergy handling in this MVP — only the single veg/non-veg Dietary Preference.
- **Not social.** No sharing, accountability partners, leaderboards, or any feature that exposes a user's data to another person.
- **Not monetized.** No pricing, ads, or paid tiers in this build.
- **Not a deep analytics platform.** The 3-month trends dashboard (§4.7) is a plain history view with simple aggregate stats — no export, no goal-setting-over-time, no correlation against other data (weight, activity, etc.).

## 6. MVP Scope

### 6.1 In Scope
**Must-have**
- Meal input & Estimation Pipeline (photo + text, retry-on-insufficient-detail, timestamping, photo discard).
- Calorie Budget & Recommendation Engine (classification, time-of-day windows, Over-Target override).
- Daily Target & Day Boundary (user-set target with default, 5am-to-next-5am local-timezone Day per FR-14).
- Dietary Preference driving Recommendation content.

**Should-have**
- First-Login Daily Engagement flow (remaining-budget prompt, decline-path recommendations, pre-10am breakfast offer, tone-adaptive message).

**Could-have** *(include only if it doesn't add much build friction)*
- Account creation & login (email/password).
- Meal-photo-only in-app guidance.
- Historical Trends Dashboard (3-month view + summary stats).

### 6.2 Out of Scope for MVP
- Telegram/WhatsApp channels — deferred to a later, separate build.
- Fine-grained dietary preferences (macros, cuisine, allergies) — deferred to v2+.
- Social/accountability features — not planned at all for this product direction as currently scoped.
- Formal compliance/security hardening beyond FR-20/FR-21 — `[NOTE FOR PM]` revisit before any real (non-test) user data is involved.

## 7. Success Metrics

**Primary**
- **SM-1**: Time from Entry submission to receiving a calorie estimate + Recommendation(s) targets under 5 seconds as an aspiration, not a pass/fail gate — real-world vision-model latency can exceed it. What must actually hold is FR-9's in-progress indicator: the user is never left staring at an unresponsive screen. Validates FR-2, FR-3, FR-9.

**Counter-metrics (do not optimize)**
- **SM-C1**: Do not shortcut the insufficient-detail retry check (FR-4), and do not sacrifice estimate quality, purely to chase the SM-1 target — a fast-but-guessed estimate erodes trust faster than an honest, slower retry prompt or response. Counterbalances SM-1.

## 8. Open Questions

*(none outstanding — see Assumptions Index for remaining inferred choices)*

**Resolved:**
1. ~~What is the actual vision-recognition/food-estimation technical approach (build vs. third-party API)?~~ Resolved in architecture: Gemini Flash (`gemini-3.8-flash`) is the chosen `EstimationProvider` adapter. See `_bmad-output/planning-artifacts/architecture/architecture-bmad-calorie-counter-2026-09-16/ARCHITECTURE-SPINE.md`, AD-2.

## 9. Assumptions Index

- §1 — Web app must support mobile browsers, since photo capture is the primary input mode and typically happens on a phone.
- §4.1 FR-2 — Estimates are shown as a single number, not a confidence range, for MVP.
- §4.3 FR-13 — Account-creation screen suggests a standard adult daily intake value as a pre-filled starting point for the Daily Calorie Target, which the user can accept or change.
- §4.3 FR-14 — Timezone is auto-detected from the browser/device; no manual override in MVP.
- §4.5 FR-19 — Dietary Preference defaults to non-vegetarian until the user explicitly changes it.
