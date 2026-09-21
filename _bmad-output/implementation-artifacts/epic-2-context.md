# Epic 2 Context: Meal Logging & Estimation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let a user submit an Entry — by photo or free-text description — from a single logging screen, and get it turned into a stored, timestamped record with an estimated calorie count. Photo Entries run through vision recognition first to produce a text description, then both paths estimate calories from a description. If either input lacks enough detail for a reliable estimate, the system asks for more detail rather than guessing — no Entry is ever logged without a real calorie value. Photo bytes are discarded immediately after analysis; only the generated description is kept. This epic is complete and demoable on its own: it records what was eaten and its estimated calories, without yet computing a running budget or issuing recommendations (that's Epic 3).

## Stories

- Story 2.1: Log a Meal via Text
- Story 2.2: Log a Meal via Photo
- Story 2.3: In-Progress & Failure States
- Story 2.4: View Logged Entries
- Story 2.5: Accessible In-Progress Announcement

## Requirements & Constraints

- Both photo and text submission are available from the same logging screen; exactly one of the two is used per Entry (no combined photo+text submission).
- Photo Entries: run vision recognition to identify the food, generate a text description, then estimate calories from that description. Text Entries: estimate calories directly from the user's description, no separate recognition step.
- If detail is insufficient to produce a reliable estimate, the system never guesses — it returns an "insufficient detail" outcome and prompts the user to retry with more detail, keeping their original input editable (never cleared). No Entry row is created for an insufficient-detail outcome.
- Every Entry is timestamped at submission.
- Once a photo Entry has been analyzed, the original photo is discarded; only the system-generated description is retained in the permanent record. Photo bytes must never be written to disk, the database, or object storage at any point — they exist only in request memory for the duration of the estimation call.
- A persistent, non-dismissible small-print notice near the photo-capture action instructs users to upload meal photos only.
- The combined estimation + response round trip targets under 5 seconds as a soft goal, not a hard pass/fail gate — real vision-model latency can exceed it, and the in-progress indicator must hold regardless of actual duration. Do not shortcut the insufficient-detail check or sacrifice estimate quality to chase this target.
- Calorie estimates are presented as a single integer, never a range.
- Must work from a mobile browser as well as desktop — photo capture is the primary input mode and typically happens on a phone. Tapping "Add Photo" opens the device's native camera/file picker directly; no in-app custom camera UI.
- If a device tab backgrounds mid-estimate on mobile, no special recovery is attempted — manual retry from the Log Entry flow is the accepted fallback (explicitly deferred, not a bug).
- Logging an Entry is always one screen, one action — never a multi-step wizard.

## Technical Decisions

- **EstimationProvider port**: single interface `estimate(input: Photo | Text): { ok: true, description: string, calories: number } | { ok: false, reason: 'insufficient_detail' }`. The `false` branch is the retry path — implemented as a return value, never thrown as an exception. `GeminiAdapter` (model `gemini-3.8-flash`, `thinking_level: "low"`) is the only bound implementation for MVP. Classification (Meal vs. Snack/Beverage, Epic 3) is never inside the adapter — always a separate downstream call on the `ok: true` output, so it stays identical regardless of which adapter produced the estimate.
- **No persistent photo storage**: uploaded photo bytes live only in request memory for the duration of the `estimate()` call.
- **Client-side photo compression**: before upload, compress/resize (cap longest dimension ~1600px, JPEG quality ~0.8) to stay under Vercel's 4.5MB request-body limit. If compression still leaves the file too large, reject client-side with a clear message — no request is sent.
- **Long-running calls**: the entry-submission API route must explicitly set `maxDuration` above Vercel's 10s default (up to 60s on Hobby, 300s with Fluid compute) to accommodate worst-case estimation latency.
- **Entities**: `entries` table created in this epic — `id`, `user_id` (FK), `input_mode`, `description_text`, `calories` (plain integer), `created_at` (UTC `timestamptz`). The `classification` column does not exist yet — Epic 3 adds it via `ALTER TABLE` when it's actually needed.
- **Conventions**: DB columns `snake_case`; TS `camelCase`/`PascalCase`; API route folders `kebab-case` under `app/api/`. API errors return `{ error: { code, message } }`. All writes to `entries` go through the service layer — never a direct DB call from a route handler or component. Layering is routes → services → estimation/DB; no layer skipped or reversed.
- **Source tree**: `lib/estimation/` holds the `EstimationProvider` port + `GeminiAdapter`; `app/api/entries` is the thin route handler delegating to services.

## UX & Interaction Patterns

- In-progress indicator appears the instant an Entry is submitted and persists for the full duration of the pending call, however long it takes — never a bare spinner; pairs a calm label ("Estimating…") with a subtle motion cue. Must be announced to assistive technology (e.g. via `aria-live`), not just implied visually.
- On insufficient detail, the in-progress indicator is replaced by a retry prompt stating plainly that more detail is needed, with the original input still editable. A hard estimation-call failure (network/API error) uses the same visual treatment but distinct copy ("the attempt failed, try again"); input is likewise preserved for resubmission. Both state transitions are announced to screen readers, not just visually swapped.
- Neither the retry prompt nor the failure prompt ever logs a partial or zero-calorie Entry.
- Entries list: one bordered container of rows (not per-entry cards), border dividers, chronological order (most recent last), no edit/delete affordance in MVP, no pagination or infinite scroll — the full Day's Entries load at once. Omitted entirely (not shown as an empty state) when there are zero Entries.
- Photo-only notice: small, muted text near the "Add Photo" action, no card/border treatment, persistent rather than a dismissible dialog.
- At most one primary action + one secondary action per screen; no hover-only affordances (tap-first).

## Cross-Story Dependencies

- Story 2.1 establishes the `EstimationProvider` port, `GeminiAdapter`, and the `entries` table that Stories 2.2–2.5 build on.
- Epic 3 (Story 3.1) alters the `entries` table to add `classification` once classification logic exists — Epic 2 has no use for that column and must not create it.
- Epic 3's Story 3.3 completes the full per-submission response contract (calories + budget + recommendations) that this epic only partially fulfills (calories only); this epic's estimation/storage path is a prerequisite for Epic 3's budget and recommendation computations, which read the `entries` rows this epic creates.
