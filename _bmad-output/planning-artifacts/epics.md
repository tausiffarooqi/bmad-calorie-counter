---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - '_bmad-output/planning-artifacts/prds/prd-bmad-calorie-counter-2026-09-15/prd.md'
  - '_bmad-output/planning-artifacts/prds/prd-bmad-calorie-counter-2026-09-15/addendum.md'
  - '_bmad-output/planning-artifacts/architecture/architecture-bmad-calorie-counter-2026-09-16/ARCHITECTURE-SPINE.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/EXPERIENCE.md'
---

# Calorie Tracker MVP - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Calorie Tracker MVP, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-1: User can submit an Entry as either a photo upload or a free-text description, both available from the same logging screen.
FR-2: For a photo Entry, the system runs vision recognition to identify the food, generates a text description of what it found, then calculates estimated calories from that description.
FR-3: For a free-text Entry, the system calculates estimated calories directly from the user's description, without a separate recognition step.
FR-4: If a photo or text Entry does not contain enough detail to produce a reliable estimate, the system does not guess — it prompts the user to retry with more detail. No Entry is logged with a calorie value until the system has enough detail to estimate it.
FR-5: Every Entry (photo or text) is timestamped at the moment of submission.
FR-6: Once a photo Entry has been analyzed, the original photo is discarded; only the system-generated text description is retained as part of the permanent log record.
FR-7: The system automatically classifies each Entry as a Meal or a Snack/Beverage.
FR-8: A Snack/Beverage Entry reduces the Remaining Calorie Budget but does not consume a Meal Slot and never receives its own Recommendation.
FR-9: For each Entry submitted, the system returns: the estimated calories for that Entry, the updated Remaining Calorie Budget for the Day, and one Recommendation per remaining Meal Slot. While an estimate is pending, the UI shows a clear in-progress indicator.
FR-10: The number of remaining Meal Slots depends on when the Entry is submitted: 5am–12pm → 2 slots (lunch, dinner); 12pm–10pm → 1 slot (dinner).
FR-11: After 10pm, the system provides a Recommendation for the dinner Meal Slot only if the Daily Calorie Target has not yet been met; if it has, no Recommendation is given.
FR-12: At any time of day, once the user enters the Over-Target State, the system stops issuing Recommendations entirely (across FR-10, FR-11, FR-16, and FR-17) and instead reports the excess calories consumed. This rule takes precedence over all of them, without exception.
FR-13: User enters their Daily Calorie Target as a flat value when they create their account; it can be changed later on the preferences page.
FR-14: A Day runs from 5am to the next day's 5am, in the user's local timezone. An Entry logged between 12am and 5am is attributed to the Day that is still open.
FR-15: On the user's first login of a given Day, the system displays the Remaining Calorie Budget and asks whether the user wants to log a meal now.
FR-16: If the user declines to log a meal at first login, the system still displays Recommendations for the remaining Meal Slots based on current progress.
FR-17: If first login occurs before 10am, the system additionally asks whether the user wants a breakfast Recommendation — a separate, third Meal Slot on top of, not counted within, the 2 slots from the 5am–12pm window.
FR-18: First login includes a message reflecting the previous Day's performance: congratulatory/confidence-building if within target, supportive and encouraging (never shaming) if exceeded. If the previous Day had no logged Entries, the message is neutral.
FR-19: User can set a Dietary Preference (vegetarian or non-vegetarian) on the account page; this drives the content of all Recommendations.
FR-20: User can create an account and log in via email and password. (Could-have; no account recovery/forgot-password flow.)
FR-21: The system displays an in-app notice instructing users to upload meal photos only, to reduce the risk of accidentally uploading unrelated personal photos. (Could-have.)
FR-22: User can view a dashboard showing, for each day in the last 3 months, total calories consumed against that day's Daily Calorie Target. Only days with at least one logged Entry show data. (Could-have.)
FR-23: The dashboard also shows simple aggregate stats over the 3-month window: number/percentage of days within target vs. over target, and average daily calories consumed. (Could-have.)

### NonFunctional Requirements

NFR-1: Web application must work from a mobile browser as well as desktop — photo capture is the primary input mode and typically happens on a phone.
NFR-2: The combined estimation + response-composition round trip (FR-2/FR-3 + FR-8) targets under 5 seconds (SM-1) as a soft goal, not a hard pass/fail gate — real-world vision-model latency can exceed it. The UI's in-progress indicator (FR-9) must hold regardless of actual duration.
NFR-3: Classification (FR-7) and budget/recommendation logic (FR-8–FR-12) target the same soft 5-second response budget as estimation, but must not be blocked on hitting it.
NFR-4: Do not shortcut FR-4's insufficient-detail retry check, and do not sacrifice estimate quality, purely to chase the SM-1 latency target (SM-C1 counter-metric) — a fast-but-guessed estimate is worse than an honest, slower one.
NFR-5: Calorie estimates are presented as a single number, not a confidence range, for MVP.
NFR-6: Calorie estimates are directional guidance, not a clinical-grade/medical measurement — the product must not claim otherwise (industry-wide ~11–20% error is expected and accepted for MVP).
NFR-7: Timezone is auto-detected from the user's browser/device; no manual timezone override in MVP.
NFR-8: No formal WCAG level is targeted for this single-user prototype, but a reasonable accessibility baseline applies: comfortable tap targets, labeled icon-only controls, visible form labels, visible focus states, screen-reader-readable in-progress state.
NFR-9: Formal compliance/security hardening beyond FR-20/FR-21 is explicitly out of scope for MVP — flagged for revisit before any real (non-test) user data is involved, not a build requirement now.

### Additional Requirements

- **Stack (Epic 1 Story 1 scaffold)**: Next.js 16.3.5 (App Router) on Node.js 24, TypeScript 7.0.2 (requires `experimental.useTypeScriptCli: true` in `next.config` — TS7 ships without the JS Compiler API, plain `next build` fails without this flag), Tailwind CSS 4.3.3, Drizzle ORM 0.45.2. No named third-party starter template — this exact combination is the scaffold.
- **Data + Auth backend**: self-hosted Supabase (Postgres + GoTrue Auth) exclusively — no other auth library introduced (AD-3). Local dev via Supabase CLI (`supabase init` + `supabase start`, Docker-managed: Postgres, Auth, Storage, Realtime, Studio). Production points at the existing self-hosted Supabase instance on the user's Hostinger VPS. Confirm the Hostinger VPS Supabase version matches what the local CLI provisions before relying on identical GoTrue/Postgres behavior across environments (open item).
- **Deployment**: Next.js app hosted on Vercel. Environment-specific values (Postgres connection string, Supabase URL/keys, Gemini API key) injected via env vars — no other divergence between dev and prod.
- **EstimationProvider port** (AD-2): a single interface — `estimate(input: Photo | Text): { ok: true, description: string, calories: number } | { ok: false, reason: 'insufficient_detail' }`. `GeminiAdapter` (model `gemini-3.8-flash`, `thinking_level: "low"`) is the only bound implementation for MVP. Classification (FR-7) is never inside the adapter — always a downstream call to `entry-classifier` on the `ok: true` output.
- **No persistent photo storage** (AD-4): uploaded photo bytes exist only in request memory for the duration of the `estimate()` call; never written to disk, DB, or Supabase Storage.
- **Day boundary** (AD-5): a single `dayBoundary(timestamp, tz)` function (5am local-time cutoff) is the only place Day-attribution logic exists; every Day-scoped query/aggregation calls it.
- **Recommendation precedence** (AD-6): a single `recommendationEngine.forSlot()` enforces precedence Over-Target-override > after-10pm-conditional > time-of-day windows, in exactly one place.
- **Meal Slot fill state** (AD-7): derived — filled Meal Slots for a Day = count of Meal-classified Entries logged that Day. No separate persisted slot-counter field.
- **Recommendation content** (AD-8): a static, versioned lookup table keyed by (time-of-day slot, Dietary Preference, Over/Under-Target state) — no external API call for recommendation content.
- **Long-running estimation calls** (AD-9): the entry-submission API route must explicitly set `maxDuration` above Vercel's 10s default (up to 60s standard on Hobby, 300s with Fluid compute) to accommodate Gemini's worst-case latency.
- **Naming conventions**: DB tables/columns `snake_case`; TS variables/functions/types `camelCase`/`PascalCase`; API route folders `kebab-case` under `app/api/`.
- **Data & error conventions**: timestamps stored as UTC `timestamptz`; Day never its own stored column (always derived); calorie estimates are a plain integer; API errors return `{ error: { code, message } }`.
- **Auth & mutation convention**: auth via Supabase Auth session (JWT in an httpOnly cookie), verified in Next.js middleware. All writes to `entries`/`profiles` go through the service layer — never a direct DB call from a route handler or component.
- **Core entities**: `profiles` (user_id PK/FK to `auth.users`, daily_calorie_target, dietary_preference), `entries` (id, user_id FK, input_mode, classification, description_text, calories, created_at).
- **Source tree shape**: `app/api/` (thin route handlers delegating to services), `app/(routes)/` (log-entry, dashboard, trends, account pages); `lib/services/` (budget-engine, recommendation-engine, day-boundary, entry-classifier), `lib/estimation/` (EstimationProvider port + GeminiAdapter), `lib/db/` (Drizzle schema + queries).
- **Deferred (not build requirements, noted for awareness)**: mobile tab-backgrounding during a pending estimate has no queue-based mitigation (manual retry is the accepted fallback); confidence-threshold logic for the FR-4 retry trigger is an implementation detail left open; a two-stage hybrid estimation approach is a noted v2 upgrade path, not MVP scope; no dedicated logging/observability strategy chosen for MVP.

### UX Design Requirements

**Design tokens**
UX-DR1: Implement the Muted Earth Editorial color tokens as shadcn theme overrides — background `#EFEAE3`, foreground `#3A342C`, card `#F7F4EE`, card-foreground `#3A342C`, muted-foreground `#8C8272`, border `#D9D1C2`, input `#D9D1C2`, ring `#A85C42`, primary `#A85C42`, primary-foreground `#FBF3EC`, accent `#7C8B6F`, accent-foreground `#F7F4EE`. All other shadcn tokens (popover, secondary, destructive) stay at default — `destructive` is deliberately never used.
UX-DR2: Implement typography tokens and load both web fonts — Inter (body 14px/400, label 12px/600 uppercase-tracking, display-number 52px/700) and Lora italic (recommendation role, 17px/400/1.35 line-height, italic).
UX-DR3: Implement the radius scale — sm 8px (buttons, inputs), md 10px (entries list, general cards), lg 12px (Recommendation card), full 9999px (reserved for future status pills) — applied per the DESIGN.md.Components mapping.
UX-DR4: No drop shadows anywhere in the UI — depth expressed only via border hairlines, dashed rules, and the background/card value shift; overrides shadcn's default shadow-on-hover.

**Components**
UX-DR5: Button (primary) — clay fill, cream text, sm radius, no border; the single most-wanted action per screen.
UX-DR6: Button (secondary) — card fill, foreground text, border outline, sm radius; the lower-emphasis alternate action.
UX-DR7: Entries list — one bordered container of rows (not per-entry cards), border dividers, md radius, chronological (most recent last), no edit/delete affordance in MVP.
UX-DR8: Recommendation card — card background, sage border, lg radius, recommendation typography. Renders 0–3 cards depending on remaining Meal Slot count (2 stacked during 5am–12pm: lunch + dinner; 1 from 12pm–10pm: dinner; 0 or 1 after 10pm per FR-11). Never renders alongside the Over-Target banner. Recommendation text is a deterministic lookup (AD-8) — the same key returns identical text on a different day; this must not be implemented or copy-written to imply the system reasoned about the specific Entry just logged.
UX-DR9: Over-Target banner — card background, clay border and text, md radius. Replaces every Recommendation card at once when active; never shadcn's `destructive` styling.
UX-DR10: Prompt card — card background, border outline, md radius; generic container for First-login prompt question+action pairs.
UX-DR11: In-progress indicator — card background, muted-foreground label text, md radius; pairs a short calm label ("Estimating…") with a subtle motion cue; persists for the full duration of a pending estimate call, however long that takes (never a bare spinner with no text).
UX-DR12: Retry prompt — same shape as Prompt card with a clay border; covers both FR-4's insufficient-detail retry and a hard estimation-call failure (network/API error), with distinct copy per case but the same visual treatment; keeps the user's original input editable, never clears the field.
UX-DR13: Photo-only notice — small (12px) muted-foreground text near the Add Photo action, no card/border treatment, persistent (not a dismissible dialog) — FR-21.

**Screens (Information Architecture)**
UX-DR14: Login screen — email + password fields, link to Register, inline field-level failure messaging (no full-page error state).
UX-DR15: Register screen — email + password + confirm password + Daily Calorie Target (pre-filled standard-adult default, editable) fields per FR-13; creates account and logs straight in (email confirmation disabled — no "check your email" waiting state); link to Login.
UX-DR16: Daily view (home) screen — Remaining Calorie Budget in display-number style, Entries list (entirely omitted when empty, not shown as an empty state), Log buttons (Add Photo / Add Text), Recommendation card(s) or Over-Target banner as the last surface element(s). Single-column, mobile-first; layout unchanged at `≥md` (centered, no sidebar, no second column). Includes a Cold-load skeleton state while today's data loads.
UX-DR17: Log Entry flow — photo capture (native camera/file picker) or text input (single-line-to-multiline), in-progress indicator while estimating, retry prompt (insufficient detail) or hard-failure prompt (call error), photo-only notice on the photo path; returns to Daily view on success.
UX-DR18: First-login prompt — log-a-meal ask card always shown; breakfast-offer card shown as a second, separate card only before 10am (never merged into one compound question); tone-adaptive message about yesterday's performance, including the neutral-tone branch for a previous Day with zero Entries; declining any card always lands cleanly on the Daily view, never a dead end.
UX-DR19: Account/Preferences screen — Daily Calorie Target (editable) and Dietary Preference (veg/non-veg) fields; inline save confirmation; inline field-level validation error state (e.g. non-numeric or zero target).
UX-DR20: Historical Trends screen (Could-have) — 3-month day-by-day view + aggregate stats (days within/over target, average daily calories); a calm "nothing logged yet" state when there are zero Entries ever; days with no Entries omitted from the view (never shown as zero).

**Voice and tone**
UX-DR21: All user-facing copy follows the "supportive, never shaming" rule (FR-18) — no alarm/red language or exclamation-heavy phrasing for Over-Target, no gamified praise/emoji for good days, same understated tone regardless of daily outcome. Apply the Do/Don't microcopy table in `EXPERIENCE.md` as the copy-review checklist for every user-facing string.

**Accessibility floor**
UX-DR22: Tap targets (buttons, cards, prompt actions) sized comfortably for one-handed phone use.
UX-DR23: Every icon-only control (camera/photo action) carries a text label or accessible name, not icon-alone.
UX-DR24: Form inputs (Login, Register, Preferences) use visible labels, not placeholder-only text.
UX-DR25: Focus states use the ring token (clay) at visible contrast against the background.
UX-DR26: The in-progress indicator's "Estimating…" label is readable by a screen reader, not just visually implied by animation.

**Interaction primitives**
UX-DR27: Tap-first interaction model — no hover-only affordances, no required keyboard shortcuts; at most one primary + one secondary action per screen.
UX-DR28: No infinite scroll (Entries list and Trends are both bounded datasets: single-Day / 3-month); no multi-step wizard for logging an Entry — one screen, one action.

### FR Coverage Map

FR-1: Epic 2 - Dual input modes (photo/text) for an Entry
FR-2: Epic 2 - Photo estimation pipeline
FR-3: Epic 2 - Text estimation pipeline
FR-4: Epic 2 - Retry on insufficient detail
FR-5: Epic 2 - Entry timestamping
FR-6: Epic 2 - Photo discarded, description retained
FR-7: Epic 3 - Entry classification (Meal vs. Snack/Beverage)
FR-8: Epic 3 - Snack/beverage budget effect
FR-9: Epic 3 - Per-submission response (calories + budget + recommendations)
FR-10: Epic 3 - Time-of-day Meal Slot windows
FR-11: Epic 3 - After-10pm conditional recommendation
FR-12: Epic 3 - Over-Target override
FR-13: Epic 1 - Daily Calorie Target (captured at registration)
FR-14: Epic 3 - Day boundary (5am-to-next-5am attribution)
FR-15: Epic 4 - First-login prompt
FR-16: Epic 4 - Decline-path recommendations
FR-17: Epic 4 - Pre-10am breakfast offer
FR-18: Epic 4 - Tone-adaptive daily message
FR-19: Epic 1 - Dietary preference setting
FR-20: Epic 1 - Account creation and login
FR-21: Epic 2 - Meal-photo-only guidance (lives on the photo-capture screen in the Log Entry flow)
FR-22: Epic 5 - 3-month trend view
FR-23: Epic 5 - Trend summary stats

## Epic List

### Epic 0: UX Foundation
Global, feature-independent visual and interaction contracts (design tokens, cross-cutting accessibility/interaction primitives) that every later screen inherits. Not tied to any FR.
**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR25, UX-DR27, UX-DR28

### Epic 1: Account & Profile Setup
Users can create an account, log in, and have their Daily Calorie Target and Dietary Preference captured — the foundation every other epic needs to attribute data to "this user, today."
**FRs covered:** FR-13, FR-19, FR-20

### Epic 2: Meal Logging & Estimation
Users can submit an Entry by photo or text and get it estimated, classified into a stored record, timestamped, with the photo discarded after analysis. Complete and demoable on its own — it records what was eaten and its estimated calories, without yet computing a running budget or recommending anything.
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-21

### Epic 3: Calorie Budget & Recommendation Engine
Builds on Epic 2's stored Entries: classifies each as Meal vs. Snack/Beverage, computes the Remaining Calorie Budget for the Day, and returns Recommendation(s) per remaining Meal Slot — including the Over-Target override. Completes FR-9's full per-submission response (calories + budget + recommendations) promised in the PRD's Vision.
**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-14

### Epic 4: Daily Engagement
Users get a proactive first-login check-in — remaining budget, a log-a-meal prompt, a conditional breakfast offer before 10am, and a tone-adaptive message about yesterday's performance.
**FRs covered:** FR-15, FR-16, FR-17, FR-18

### Epic 5: Historical Trends
Users can view a 3-month history of their calorie tracking with simple aggregate stats. Could-have; stands alone as a reporting layer computed directly from Epic 1's Daily Calorie Target and Epic 2's stored Entries — it doesn't need Epic 3's live budget/recommendation engine, which persists nothing for Epic 5 to read.
**FRs covered:** FR-22, FR-23

## Epic 0: UX Foundation

Global, feature-independent visual and interaction contracts that every later screen inherits. Built first, before any user-facing epic, so Epic 1 onward can rely on it rather than each screen defining its own tokens/rules. Not tied to any FR — covers UX-DR1–4, 25, 27, 28.

### Story 0.1: Design Tokens & Visual Foundation

As a user,
I want the app's visual design to look calm, polished, and consistent everywhere,
So that the experience feels considered rather than generic or mismatched.

**Acceptance Criteria:**

**Given** the shadcn/ui + Tailwind foundation from Architecture
**When** the Muted Earth Editorial color tokens are applied (background `#EFEAE3`, foreground `#3A342C`, card `#F7F4EE`, card-foreground `#3A342C`, muted-foreground `#8C8272`, border `#D9D1C2`, input `#D9D1C2`, ring `#A85C42`, primary `#A85C42`, primary-foreground `#FBF3EC`, accent `#7C8B6F`, accent-foreground `#F7F4EE`)
**Then** every screen built in later epics inherits these tokens automatically rather than hardcoding its own colors (UX-DR1)

**Given** the typography tokens (Inter for body/label/display-number; Lora italic for the recommendation role)
**When** both web fonts are loaded and wired to their token roles
**Then** any component using the `recommendation` role renders in italic Lora, and everything else renders in Inter, with no per-screen font overrides (UX-DR2)

**Given** the radius scale (sm 8px, md 10px, lg 12px, full 9999px)
**When** components apply their designated radius token
**Then** buttons/inputs use sm, general cards use md, the Recommendation card uses lg — consistently across every screen (UX-DR3)

**Given** the "no drop shadows" rule
**When** any card, button, or container is styled
**Then** depth is expressed only via border/dashed-rule/background-value-shift — shadcn's default shadow-on-hover is explicitly overridden to render nothing (UX-DR4)

### Story 0.2: Cross-Cutting Interaction & Accessibility Primitives

As a user,
I want every screen in the app to behave consistently — one clear primary action, visible focus states, no dead-end interactions,
So that the app feels predictable no matter which screen I'm on.

**Acceptance Criteria:**

**Given** any screen with interactive controls
**When** it's built
**Then** it has at most one primary action (`{colors.primary}` button) and one secondary action — never more than two competing actions on a single surface (UX-DR27)

**Given** the app is used exclusively as tap-first mobile/desktop-web
**Then** no interaction anywhere depends on a hover-only affordance to be discoverable or usable (UX-DR27)

**Given** any focusable element (buttons, inputs, links)
**When** it receives keyboard focus
**Then** a visible focus ring using the `ring` token (clay, from Story 0.1) appears at visible contrast against the background (UX-DR25)

**Given** any list-based screen (Entries list, Historical Trends)
**Then** it never implements infinite scroll — both are bounded datasets (single Day / 3-month window) and load their full bounded set at once (UX-DR28)

**Given** the Log Entry flow (Epic 2)
**Then** logging an Entry is always one screen, one action — never a multi-step wizard (UX-DR28)

## Epic 1: Account & Profile Setup

Users can create an account, log in, and have their Daily Calorie Target and Dietary Preference captured — the foundation every other epic needs to attribute data to "this user, today."

### Story 1.1: User Registration

As a user,
I want to create an account with my email, password, and Daily Calorie Target,
So that the app can track my calorie budget against my own target from day one.

**Acceptance Criteria:**

**Given** I am not logged in and open the Register screen
**When** I enter a valid email, password, confirm-password, and accept or edit the pre-filled Daily Calorie Target
**Then** my account is created in Supabase Auth, a `profiles` row is created linked to my user id with the entered Daily Calorie Target
**And** I am logged in immediately — no email-confirmation step (Architecture AD-3, EXPERIENCE.md)

**Given** the Register screen loads
**When** no Daily Calorie Target has been entered yet
**Then** the field is pre-filled with a standard adult default value (e.g. ~2000 kcal) that I can accept or change (FR-13 `[ASSUMPTION]`)

**Given** I enter an email that's already registered, mismatched passwords, or a non-numeric/zero Daily Calorie Target
**When** I submit the form
**Then** I see an inline, field-level error message (UX-DR15) and no account is created

**Given** I successfully register
**Then** the screen includes a link to the Login screen, and follows UX-DR5/UX-DR6 (buttons), UX-DR22/UX-DR24 (tap targets, visible labels)

**And** this story includes the project scaffold — Next.js 16.3.5 (App Router) on Node.js 24, TypeScript 7.0.2 (`experimental.useTypeScriptCli: true`), Tailwind CSS 4.3.3, Drizzle ORM 0.45.2 — plus the self-hosted Supabase connection (local dev via Supabase CLI) and the `profiles` table (user_id PK/FK to `auth.users`, daily_calorie_target, dietary_preference defaulting to `'non_vegetarian'` until changed in Story 1.3)

### Story 1.2: User Login

As a returning user,
I want to log in with my email and password,
So that I can access my daily tracking data.

**Acceptance Criteria:**

**Given** I have a registered account
**When** I enter my correct email and password on the Login screen
**Then** I am authenticated via Supabase Auth and redirected to the Daily view

**Given** I enter an incorrect password or an unregistered email
**When** I submit the login form
**Then** I see an inline field-level error message (no full-page error state) and remain on the Login screen

**Given** I am not authenticated
**When** I try to access any authenticated route (Daily view, Log Entry, Account/Preferences)
**Then** I am redirected to the Login screen (Next.js middleware session check, AD-3)

**Given** I already have a valid session
**When** I open the app
**Then** I land directly on the Daily view without re-authenticating

**And** the Login screen includes a link to Register (UX-DR14)

### Story 1.3: Manage Daily Calorie Target & Dietary Preference

As a user,
I want to view and update my Daily Calorie Target and Dietary Preference on an Account/Preferences screen,
So that my budget and recommendations stay accurate as my needs change.

**Acceptance Criteria:**

**Given** I am logged in and navigate to Account/Preferences
**When** the screen loads
**Then** I see my current Daily Calorie Target and Dietary Preference (vegetarian/non-vegetarian) values

**Given** I change my Daily Calorie Target to a valid positive number
**When** I save
**Then** the `profiles` row is updated and I see an inline save confirmation next to the changed field (UX-DR19) — no full-page reload or modal

**Given** I enter an invalid Daily Calorie Target (non-numeric, zero, or negative)
**When** I try to save
**Then** I see an inline field-level validation error and the value is not saved

**Given** I have never explicitly changed my Dietary Preference
**When** I visit this screen
**Then** it shows non-vegetarian as the current value (the default set at registration, Story 1.1), which I can change to vegetarian — this default is what Epic 3's Recommendation lookup uses until I do (FR-19)

**Given** I change my Dietary Preference
**When** I save
**Then** the `profiles` row's `dietary_preference` is updated immediately

### Story 1.4: Accessible Navigation to Preferences

As a user relying on assistive technology,
I want icon-only navigation controls to be properly labeled,
So that I can navigate the app regardless of how I perceive it.

**Acceptance Criteria:**

**Given** the Daily view has a settings icon leading to Account/Preferences
**When** the icon is icon-only (no visible text label)
**Then** it carries a text-equivalent accessible name (e.g. "Open account settings") so it's announced correctly by assistive technology (UX-DR23)

**Given** any other icon-only control introduced by a later epic (e.g. a Trends navigation icon)
**Then** the same rule applies — no icon-only control ships without an accessible name (UX-DR23)

## Epic 2: Meal Logging & Estimation

Users can submit an Entry by photo or text and get it estimated, classified into a stored record, timestamped, with the photo discarded after analysis. Complete and demoable on its own — it records what was eaten and its estimated calories, without yet computing a running budget or recommending anything.

### Story 2.1: Log a Meal via Text

As a user,
I want to describe what I ate in plain text,
So that I get a calorie estimate without needing a photo.

**Acceptance Criteria:**

**Given** I am on the Log Entry flow and choose "Add Text"
**When** I type a natural-language description (e.g. "one double cheeseburger and medium fries with a can of diet soda") and submit
**Then** the system calls the `EstimationProvider.estimate()` port with the text input and, on `{ ok: true, description, calories }`, stores a new `entries` row (user_id, input_mode='text', description_text, calories, created_at) and returns the estimated calories (FR-3, FR-5)

**Given** my description is too vague to estimate reliably
**When** I submit it
**Then** `estimate()` returns `{ ok: false, reason: 'insufficient_detail' }`, no `entries` row is created, and I am prompted to add more detail rather than getting a guessed number (FR-4)

**Given** the `EstimationProvider` port and `GeminiAdapter` (`gemini-3.8-flash`, `thinking_level: "low"`) don't exist yet
**Then** this story establishes both, plus the `entries` table (id, user_id FK, input_mode, description_text, calories, created_at) — Epic 3's Story 3.1 will `ALTER TABLE` to add the `classification` column when it's actually needed, not before

**And** the estimation API route sets an explicit `maxDuration` above Vercel's 10s default (AD-9)

### Story 2.2: Log a Meal via Photo

As a user,
I want to snap a photo of my meal,
So that I get a calorie estimate without typing a description myself.

**Acceptance Criteria:**

**Given** I am on the Log Entry flow and choose "Add Photo"
**When** my device's native camera/file picker opens and I capture or select a photo
**Then** the client compresses/resizes the photo (cap longest dimension ~1600px, JPEG quality ~0.8) before upload, to stay safely under Vercel's 4.5MB request-body limit (AD-4)

**Given** compression still leaves the file too large
**When** I try to submit
**Then** I see a clear rejection message and am asked to pick a smaller photo — no request is sent

**Given** a valid, compressed photo is submitted
**When** the system calls `EstimationProvider.estimate()` with the photo input
**Then** on `{ ok: true, description, calories }`, the photo bytes are discarded immediately after the call, only the generated `description` and `calories` are persisted to a new `entries` row (input_mode='photo'), and the original photo is never written to disk, the database, or Supabase Storage (FR-2, FR-6, AD-4)

**Given** the photo is too ambiguous to estimate confidently
**When** I submit it
**Then** `estimate()` returns `{ ok: false, reason: 'insufficient_detail' }` and I am prompted to retry — same behavior as Story 2.1's text path (FR-4)

**Given** I am on the photo-capture path
**Then** a persistent, non-dismissible small-print notice near the "Add Photo" action instructs me to upload meal photos only (FR-21, UX-DR13)

### Story 2.3: In-Progress & Failure States

As a user,
I want clear feedback while my Entry is being estimated, and a clean way to recover if it fails,
So that the app never feels frozen or broken, however long the estimate takes.

**Acceptance Criteria:**

**Given** I submit an Entry (photo or text)
**When** the estimate is pending
**Then** an in-progress indicator appears immediately, pairing a calm label ("Estimating…") with a subtle motion cue, and persists for the full duration of the call — however long that takes (FR-9, AD-9, UX-DR11)

**Given** `estimate()` returns `{ ok: false, reason: 'insufficient_detail' }`
**When** the response arrives
**Then** the in-progress indicator is replaced by a retry prompt stating plainly that more detail is needed, with my original input still editable — never cleared (FR-4, UX-DR12)

**Given** the estimation call itself fails (network drop, the Gemini call erroring rather than returning ambiguously)
**When** this happens
**Then** I see the same visual retry-prompt treatment but with "the attempt failed, try again" copy, and my original input is preserved for resubmission (UX-DR12, State Patterns "Hard estimation failure")

**Given** I am on a mobile browser and the tab backgrounds mid-estimate
**Then** no special recovery is attempted (per Architecture's Deferred decision) — if the request is lost, I can simply retry the log from the Log Entry flow

### Story 2.4: View Logged Entries

As a user,
I want to see everything I've logged today in a simple list,
So that I can review what I've eaten without having to remember it myself.

**Acceptance Criteria:**

**Given** I have logged one or more Entries today
**When** I view the Daily view
**Then** I see them in one bordered container, as rows (not individual cards), each row showing the meal/item description and its calorie value (UX-DR7)

**Given** multiple Entries are logged
**When** the list renders
**Then** they appear in chronological order, most recent last (UX-DR7)

**Given** an Entry exists in the list
**Then** there is no edit or delete affordance for it in MVP — the list is a read-only record (UX-DR7, not in PRD scope)

**Given** the Entries list is showing real data
**Then** it never implements pagination or infinite scroll — the full Day's Entries load at once (UX-DR28, Story 0.2)

### Story 2.5: Accessible In-Progress Announcement

As a user relying on a screen reader,
I want to know when the app is working on my Entry,
So that I'm not left wondering if anything is happening.

**Acceptance Criteria:**

**Given** Story 2.3's in-progress indicator is showing ("Estimating…")
**When** a screen reader is active
**Then** the "Estimating…" label is announced to assistive technology (e.g. via an `aria-live` region), not just implied visually by a motion cue (UX-DR26)

**Given** the in-progress indicator resolves (success, retry, or hard failure)
**When** the state changes
**Then** the new state's message is likewise announced, not just visually swapped

## Epic 3: Calorie Budget & Recommendation Engine

Builds on Epic 2's stored Entries: classifies each as Meal vs. Snack/Beverage, computes the Remaining Calorie Budget for the Day, and returns Recommendation(s) per remaining Meal Slot — including the Over-Target override. Completes FR-9's full per-submission response (calories + budget + recommendations) promised in the PRD's Vision.

### Story 3.1: Classify Entries as Meal or Snack/Beverage

As a user,
I want each Entry I log to be automatically classified as a Meal or Snack/Beverage,
So that my calorie budget and meal-slot tracking behave correctly without me having to tag it myself.

**Acceptance Criteria:**

**Given** an Entry has been successfully estimated (`{ ok: true }` from Epic 2's `EstimationProvider`)
**When** the `entry-classifier` service runs on the resulting description
**Then** the `entries` row's `classification` column is set to either `meal` or `snack_beverage` — never left null

**Given** classification is a downstream service call, never inside an `EstimationProvider` adapter (AD-2)
**Then** classification behavior is identical regardless of which adapter estimated the Entry — swapping adapters later must not change classification

**Given** a text Entry like "a can of diet soda and a small bag of chips"
**When** classified
**Then** it's classified as Snack/Beverage

**Given** a text Entry like "one double cheeseburger and medium fries"
**When** classified
**Then** it's classified as Meal

**Given** classification completes
**Then** this story adds the `classification` column to the existing `entries` table via `ALTER TABLE` (Epic 2 didn't create it, since Epic 2 had no use for it) and stores the value alongside calories/description_text/created_at — no new table

### Story 3.2: Compute Remaining Calorie Budget

As a user,
I want to see my Remaining Calorie Budget update the moment I log an Entry,
So that I always know how much I have left for the day.

**Acceptance Criteria:**

**Given** my Daily Calorie Target is set (Story 1.1/1.3)
**When** I have logged one or more Entries today
**Then** Remaining Calorie Budget = Daily Calorie Target minus the sum of calories from every Entry attributed to the current Day — Meal and Snack/Beverage both count (FR-8)

**Given** a Day runs 5am to the next day's 5am in my local timezone (FR-14)
**When** an Entry is logged between 12am and 5am
**Then** it's attributed to the Day that is still open (the one that started the previous 5am) — via the single `dayBoundary(timestamp, tz)` function (AD-5), never inline date math

**Given** I have logged zero Entries today
**When** I view the Daily view
**Then** Remaining Calorie Budget equals my full Daily Calorie Target, and the Entries list is omitted entirely rather than shown empty (UX-DR16)

**Given** a Snack/Beverage Entry is logged
**Then** it reduces the Remaining Calorie Budget exactly like a Meal Entry — the Meal/Snack distinction only matters for Meal Slot consumption (Story 3.3)

### Story 3.3: Meal Slot Recommendations by Time of Day

As a user,
I want to receive a Recommendation for each meal I still have left today,
So that I know what to eat next without having to think about it myself.

**Acceptance Criteria:**

**Given** it is between 5am and 12pm local time
**When** I view the Daily view
**Then** I see 2 Recommendation cards, stacked — lunch and dinner (FR-10, UX-DR8)

**Given** it is between 12pm and 10pm local time
**When** I view the Daily view
**Then** I see exactly 1 Recommendation card — dinner (FR-10)

**Given** filled Meal Slots for the Day = count of Meal-classified Entries logged that Day, never a stored counter (AD-7)
**When** I have already logged a Meal that fills a given slot
**Then** that slot's recommendation no longer appears — only genuinely remaining slots get a card

**Given** a slot needs a Recommendation
**When** the `recommendationEngine` looks it up
**Then** it selects from the static, versioned lookup table keyed by (time-of-day slot, Dietary Preference, Over/Under-Target state) — no external API call (AD-8) — and the same key returns the identical suggestion on a different day, which is expected, not a bug

**Given** a user has never explicitly set a Dietary Preference
**Then** the lookup key still resolves — `profiles.dietary_preference` defaults to `non_vegetarian` at account creation (Story 1.1), so this lookup never hits an undefined case

**Given** I submit an Entry
**When** the response returns
**Then** it includes the estimated calories, my updated Remaining Calorie Budget, and one Recommendation per remaining Meal Slot, all in the same response (FR-9) — completing the contract Epic 2 began

### Story 3.4: After-10pm Conditional Recommendation

As a user,
I want to stop getting meal recommendations late at night once I've already hit my target,
So that the app doesn't nag me to eat more than I need.

**Acceptance Criteria:**

**Given** it is after 10pm local time and I have not yet met my Daily Calorie Target
**When** I view the Daily view
**Then** I see exactly 1 Recommendation card — dinner (FR-11)

**Given** it is after 10pm local time and I have already met my Daily Calorie Target
**When** I view the Daily view
**Then** no Recommendation card appears at all, and no Over-Target banner either — I'm not over, just done for the day (FR-11, distinct from Story 3.5)

**Given** the after-10pm rule and the 5am–12pm/12pm–10pm windows from Story 3.3
**Then** both are enforced by the same `recommendationEngine.forSlot()` function (AD-6) — no separate, divergent implementation for the after-10pm case

### Story 3.5: Over-Target Override

As a user,
I want recommendations to stop entirely once I've gone over my target, and to see plainly how far over I am,
So that the app doesn't keep suggesting more food I don't need.

**Acceptance Criteria:**

**Given** cumulative Entry calories for the Day exceed my Daily Calorie Target (Over-Target State)
**When** I view the Daily view at any time of day
**Then** every Recommendation card is replaced at once by an Over-Target banner reporting the excess calories consumed — never shown alongside any Recommendation card (FR-12)

**Given** the Over-Target State is active
**Then** it takes precedence over the time-of-day windows (Story 3.3) and the after-10pm rule (Story 3.4) without exception (FR-12, AD-6's precedence order)

**Given** the Over-Target banner is shown
**Then** its copy follows the "never shaming" voice rule (FR-18/UX-DR21) and the calm clay-toned visual treatment (UX-DR9) — never red/alarm styling

**Given** AD-6's precedence rule also covers FR-16 (decline-path recommendations) and FR-17 (breakfast offer), which belong to Epic 4
**Then** `recommendationEngine.forSlot()` is built generally enough for those future callers now — Epic 4 will call this same function, not reimplement precedence

## Epic 4: Daily Engagement

Users get a proactive first-login check-in — remaining budget, a log-a-meal prompt, a conditional breakfast offer before 10am, and a tone-adaptive message about yesterday's performance.

### Story 4.1: First-Login Prompt & Remaining Budget

As a user,
I want to see my remaining budget and be asked if I want to log a meal the first time I open the app each day,
So that I have a reason to check in even when I'm not actively logging something.

**Acceptance Criteria:**

**Given** it is my first login/app-open of a given Day (per the 5am-to-next-5am boundary, AD-5)
**When** the app loads
**Then** a First-login prompt appears showing my Remaining Calorie Budget for the new Day and asking "Log a meal now?" (FR-15)

**Given** I have already opened the app once today
**When** I open it again
**Then** the First-login prompt does not reappear — I land directly on the Daily view

**Given** the First-login prompt is shown
**Then** it follows the Prompt card visual treatment (UX-DR10) and button conventions (UX-DR5/6)

**Given** I tap "Log a meal now?" affirmatively
**When** I proceed
**Then** I am taken into the Log Entry flow (Epic 2) as if I'd tapped Add Photo/Add Text from the Daily view

### Story 4.2: Tone-Adaptive Daily Message

As a user,
I want my first login of the day to reflect how I did yesterday,
So that I feel supported rather than judged.

**Acceptance Criteria:**

**Given** I stayed within my Daily Calorie Target yesterday
**When** I see the First-login prompt
**Then** the message is congratulatory/confidence-building (e.g. "You stayed within your target yesterday — nice, steady work.") (FR-18)

**Given** I exceeded my Daily Calorie Target yesterday
**When** I see the First-login prompt
**Then** the message is supportive and encouraging — never shaming, never alarm-toned (FR-18, UX-DR21)

**Given** yesterday had zero logged Entries at all
**When** I see the First-login prompt
**Then** the message is neutral — neither congratulatory nor consoling — and does not fabricate a within-target or over-target result for a Day with no data (FR-18 consequence)

**Given** this is my very first Day ever using the app (no "yesterday" exists)
**When** I see the First-login prompt
**Then** the same neutral-message treatment applies as the zero-Entries case above

### Story 4.3: Decline-Path Recommendations

As a user,
I want to still see my meal recommendations even if I decline to log a meal at first login,
So that declining doesn't leave me with nothing useful.

**Acceptance Criteria:**

**Given** I am shown the First-login prompt and decline the log-a-meal ask ("Not now")
**When** I decline
**Then** I land on the Daily view, which already shows its normal Recommendation card(s) for the remaining Meal Slots — computed by the same `recommendationEngine.forSlot()` from Epic 3 (FR-16, AD-6)

**Given** I am in the Over-Target State
**When** I decline the log-a-meal ask
**Then** I see the Over-Target banner instead of Recommendation cards — the same precedence rule from Story 3.5 applies without a separate implementation (FR-12 over FR-16)

**Given** I decline
**Then** I am never left on a dead-end or blank screen — the Daily view underneath is always fully rendered

### Story 4.4: Pre-10am Breakfast Offer

As a user,
I want to be offered a breakfast recommendation if I check in before 10am,
So that I get guidance for a meal slot that would otherwise never get its own recommendation.

**Acceptance Criteria:**

**Given** my first login today occurs before 10am
**When** the First-login prompt is shown
**Then** a second, separate card appears below the log-a-meal ask — "Want a breakfast recommendation too?" — never merged into one compound question (FR-17, UX-DR18)

**Given** my first login occurs at or after 10am
**When** the First-login prompt is shown
**Then** no breakfast-offer card appears — only the log-a-meal ask (FR-17)

**Given** I accept the breakfast offer
**When** the recommendation is generated
**Then** breakfast is treated as a separate, third Meal Slot — on top of, not counted within, the 2 slots from the 5am–12pm window (FR-17, AD-7) — so lunch and dinner recommendations remain unaffected

**Given** I decline the breakfast offer
**When** I proceed
**Then** I land on the Daily view with its normal (non-breakfast) Recommendation cards — declining this offer is not a dead end either

**Given** I am in the Over-Target State
**When** the First-login prompt would otherwise show a breakfast offer
**Then** no breakfast offer appears — Over-Target precedence (Story 3.5) suppresses it exactly like every other recommendation path (FR-12 over FR-17)

## Epic 5: Historical Trends

Users can view a 3-month history of their calorie tracking with simple aggregate stats. Could-have; stands alone as a reporting layer computed directly from Epic 1's Daily Calorie Target and Epic 2's stored Entries — it doesn't need Epic 3's live budget/recommendation engine, which persists nothing for Epic 5 to read.

### Story 5.1: 3-Month Trend View

As a user,
I want to see a day-by-day view of my calorie tracking over the last 3 months,
So that I can spot patterns beyond today's snapshot.

**Acceptance Criteria:**

**Given** I navigate to Historical Trends
**When** the screen loads
**Then** I see, for each day in the last 3 months, total calories consumed against that day's Daily Calorie Target (FR-22)

**Given** a day in the window has at least one logged Entry
**When** the view renders
**Then** that day shows real data — Day boundary per AD-5, not calendar-date math

**Given** a day in the window has zero logged Entries
**When** the view renders
**Then** that day is omitted from the view — never shown as a zero-calorie day (FR-22 consequence)

**Given** I have never logged any Entry at all
**When** I open Historical Trends
**Then** I see a calm "Nothing logged yet — check back once you've tracked a few days" message in place of an empty chart (UX-DR20)

### Story 5.2: Trend Summary Stats

As a user,
I want simple aggregate stats alongside my 3-month history,
So that I get the headline without reading every day individually.

**Acceptance Criteria:**

**Given** Story 5.1's 3-month view has at least one day of data
**When** Historical Trends loads
**Then** I also see: the number/percentage of days within target vs. over target, and my average daily calories consumed across the window (FR-23)

**Given** a day was omitted from the view (no Entries logged)
**When** stats are computed
**Then** that day is excluded from both the within/over-target count and the average — not counted as a zero-calorie day (consistent with FR-22's no-fabrication rule)

**Given** I have never logged any Entry at all
**When** I open Historical Trends
**Then** no aggregate stats are shown — just the "nothing logged yet" state from Story 5.1

**And** this story is explicitly Could-have scope: no export, no goal-setting-over-time, no correlation analytics against other data (PRD §4.7 Out of Scope)
