# Calorie Tracker MVP — Intent

Solo, private, web-only calorie-tracking app. MVP is scoped as a fast-build demonstration. Core value: replace guesswork about calories/meals with a concrete estimate + an actionable recommendation.

## Core Functional Flow

**Meal input**
- Two input modes: photo upload, or free-text description (e.g. "one double cheeseburger and medium fries with a can of diet soda").
- Estimation pipeline:
  - Photo -> vision recognition -> generated text description -> calorie calculation.
  - Text -> direct calorie calculation.
  - Insufficient detail in either mode -> re-prompt user to retry (do not guess).
- Each submission returns: estimated calories for the meal just logged, total calories remaining for the day, and a recommendation for each remaining meal slot.

**Entry classification (meal vs. snack/beverage)**
- Auto-detect whether an entry is a full meal or a snack/tea/coffee.
- Snacks/beverages reduce the remaining daily calorie budget but do NOT consume a meal-recommendation slot and never get their own recommendation.

**Meal recommendations — time-of-day windows**
- 5am–12pm: 2 recommendations (lunch + dinner).
- 12pm–10pm: 1 recommendation (dinner).
- After 10pm: give a recommendation only if the user has not yet met their daily calorie target; if target is already met, no recommendation.
- Any time of day: once the user has exceeded their daily calorie target, stop giving meal recommendations entirely and instead report the excess calories consumed. This override takes precedence over the time-window rules above.

**Daily target & day boundary**
- Daily calorie target is user-set on a preferences page, defaulting to a standard adult daily intake.
- Day runs on the user's local timezone, from 5am to 12am (midnight) — a full day, not a partial window.

## First-Login Daily Engagement Flow (Should-have)

- On first login each day: show remaining calories for the day and ask if the user wants to log a meal now.
- If the user declines to log: still show recommendations for the remaining meals of the day based on current progress.
- If first login is before 10am: additionally ask if the user wants a breakfast recommendation. Breakfast is a separate third meal slot, on top of (not counted within) the 2 recommendations from the 5am–12pm window.
- Include a tone-adaptive message based on prior day's performance: congratulatory/confidence-building if the user stayed within their daily target, supportive/encouraging (never shaming) if they exceeded it.

## Recommendation Content Driver

- MVP: single account-level dietary preference (vegetarian vs. non-vegetarian), set on the account page, drives recommendation content.
- Deferred: finer-grained preferences (macros, cuisine, allergies, etc.).

## MVP Scope (MoSCoW)

**Must-have**
- Meal input & recognition (photo + free-text, estimation pipeline with retry-on-insufficient-detail).
- Calorie tracking & per-submission response (estimate, remaining budget).
- Recommendation logic (time windows, snack-vs-meal classification, over-target override).
- Daily target & day boundary (user-set target with default, 5am–12am local-timezone day).

**Should-have**
- First-login daily engagement flow (remaining-calories prompt, decline-path recommendations, pre-10am breakfast slot, tone-adaptive message).

**Could-have** (account & security — prototype stage; include if low-friction)
- Credential protection (email/password login).
- In-app warning to only upload meal photos (mitigate accidental upload of personal/non-meal photos).
- Sensitive-data handling for daily target and actual intake (personal/sensitive even if not classic PII).
- Awareness of threat model: primary concern is bad actors harvesting personal data for ad-targeting/marketing, not just generic account takeover.

**Explicitly deferred (Won't-this-time)**
- Telegram/WhatsApp channels (web-only for this build).
- Fine-grained dietary preferences (macros, cuisine, allergies, etc.).
- Social/accountability features.

## Flag for Downstream Planning

Security/PII handling (credentials, sensitive daily-intake data, photo-content risk, ad-targeting threat model) is a real concern but lower priority given prototype stage. It is bucketed under Could-have, not dropped — downstream planning should retain it as a known, deferred-priority item rather than silently omitting it.
