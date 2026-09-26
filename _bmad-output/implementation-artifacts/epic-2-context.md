# Epic 2 Context: Meal Logging & Estimation

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Users can submit an Entry — by photo or free-text description, from the same logging screen — and receive a calorie estimate that gets stored as a permanent log record. The system runs vision recognition on photos (generating a text description first, then estimating from that), or estimates directly from typed text. If input is too vague to estimate reliably, the system never guesses — it asks the user to retry with more detail. Every Entry is timestamped on submission, and for photos, only the generated description is retained; the photo itself is discarded right after analysis. For a photo Entry, the user also sees a live preview of the exact photo they uploaded, staying visible continuously across the preparing, estimating, success, and retry states of the same Log Photo dialog, and discarded (never persisted or sent anywhere new) the moment that dialog closes. This epic is complete and demoable on its own: it records what was eaten and its estimated calories, without yet computing a running budget or issuing recommendations (that's Epic 3).

## Stories

- Story 2.1: Log a Meal via Text
- Story 2.2: Log a Meal via Photo
- Story 2.3: In-Progress & Failure States
- Story 2.4: View Logged Entries
- Story 2.5: Accessible In-Progress Announcement
- Story 2.6: Photo Preview During Estimation

## Requirements & Constraints

- Logging an Entry is one screen, one action — never a multi-step wizard — with exactly one of Add Photo / Add Text used per Entry (no combined submission).
- Photo path: client compresses/resizes the image (cap longest dimension ~1600px, JPEG quality ~0.8) before upload to stay safely under the platform's 4.5MB request-body ceiling; if still too large after compression, reject client-side with a clear message and send no request.
- If a photo or text Entry lacks enough detail for a reliable estimate, no Entry is logged — the user is prompted to retry, never given a guessed number.
- Once a photo is analyzed, its bytes are discarded immediately; they must never be written to disk, the database, or object storage — only the generated description and calorie value persist.
- For a photo Entry, a preview of the exact uploaded photo must appear the moment it's picked and remain visible, without disappearing and reappearing, through every state of that same submission attempt: client-side preparing/compressing, the "Estimating…" in-progress state, the success confirmation (shown alongside the resulting calorie estimate), and any retry prompt (insufficient detail, hard call failure, or a client-side "too large" rejection) — since it's the same photo that would be resubmitted.
- The photo preview is scoped strictly to the current submission attempt: never persisted, never sent to any new server endpoint, and discarded along with the rest of the dialog's local state as soon as the dialog closes (success auto-close or user-initiated). It must never surface in the Entries list, after a reload, or on another device. This is purely an additive client-side UX behavior — it does not change FR-6/AD-4's rule that the photo is discarded server-side after analysis and never persisted.
- The full estimate + response round trip targets under 5 seconds as a soft goal, not a hard gate — real-world vision-model latency can exceed it, and that must not be treated as a failure.
- Never shortcut the insufficient-detail check or degrade estimate quality just to hit the latency target — a fast, guessed number is worse than an honest, slower retry prompt.
- The in-progress indicator must appear immediately on submission and persist for the entire wait, however long it runs — never a frozen or unresponsive-looking UI.
- A hard call failure (network/API error) is distinct from an insufficient-detail response but gets the same visual retry treatment, with different copy; the user's original input is always preserved and editable, never cleared, in both cases.
- If a mobile tab backgrounds mid-estimate, no special recovery is attempted — manual retry from the Log Entry flow is the accepted fallback.
- Calorie estimates are a single integer, never a range, and are framed as directional guidance, not a clinical-grade measurement.
- Must work correctly from a mobile browser as well as desktop, since photo capture is the primary input and typically happens on a phone.
- The Entries list is read-only in MVP (no edit/delete), bounded and fully loaded at once (no pagination or infinite scroll), shown chronologically with the most recent last, and omitted entirely from the view when there are zero Entries (never rendered as an empty state).
- A persistent, non-dismissible notice near the photo-capture action tells users to upload meal photos only.
- Accessibility floor: icon-only controls need a real accessible name; the in-progress "Estimating…" state and its subsequent resolution must be announced to assistive technology, not just implied visually.

## Technical Decisions

- All estimation goes through one `EstimationProvider` port: `estimate(input: Photo | Text): { ok: true, description, calories } | { ok: false, reason: 'insufficient_detail' }`. The failure case is a normal return value, never a thrown exception.
- `GeminiAdapter` is the only bound implementation for MVP, using model `gemini-3.5-flash-lite` via the `gemini-flash-lite-latest` alias, with `thinking_level: "low"` as the default (revisit only if real-world estimation quality warrants a higher tier). This supersedes an earlier bind to `gemini-3.8-flash`, which was dropped after hitting persistent transient errors and a hard daily quota ceiling on live testing.
- Classification of an Entry as Meal vs. Snack/Beverage is never performed inside the estimation adapter — it is always a separate downstream call (added in Epic 3), so it must not be implemented here. The `entries` table this epic creates does not yet have a classification column; Epic 3 adds it later via `ALTER TABLE`.
- The `entries` table (created in this epic) holds: id, user_id (FK), input_mode, description_text, calories, created_at. Timestamps are stored as UTC `timestamptz`; calorie values are plain integers.
- The entry-submission API route must set an explicit `maxDuration` above the platform's 10s default (headroom up to 60s/300s depending on plan tier) so slow estimation calls aren't truncated.
- All writes to `entries` go through the service layer — never a direct DB call from a route handler or component — and routes call services only, never the DB or estimation layers directly.
- The photo preview requires no new API route, endpoint, or storage mechanism: it is rendered entirely client-side from the photo file object already held in the browser's memory (e.g. an object URL / data URL generated locally), independent of the compress-and-upload pipeline that sends bytes to `estimate()`. It is local UI state owned by the Log Photo dialog, not server or persisted state, and must be released/discarded when that dialog's state is torn down.
- Naming conventions: DB tables/columns `snake_case`; TS variables/functions/types `camelCase`/`PascalCase`; API route folders `kebab-case` under `app/api/`. API errors return `{ error: { code, message } }`.
- Source tree: the estimation port and adapter live under `lib/estimation/`; the entry-submission route lives under `app/api/`; DB schema/queries live under `lib/db/`.

## UX & Interaction Patterns

- In-progress indicator: card background, muted-foreground label reading "Estimating…" paired with a subtle motion cue — never a bare spinner — shown the instant submission happens and held until the call resolves.
- Retry prompt: shares the Prompt-card shape with a clay-colored border; used for both the insufficient-detail case and the hard-failure case, with different copy for each, and never clears the user's original input.
- Photo preview: lives inside the same Log Photo dialog surface across all of its states (preparing, estimating, success, retry) rather than a separate screen or step — one continuous view of the photo the user picked, with no dedicated card/border treatment specified beyond fitting naturally alongside the in-progress indicator, success confirmation, or retry prompt it's paired with.
- Entries list: rendered as one bordered container of rows (not individual cards), with border dividers between rows, each showing description and calorie value, most recent at the bottom.
- Photo-only notice: small (12px), muted-foreground, no card/border treatment — a persistent line, not a dialog to dismiss.
- All retry/failure copy follows the supportive, never-shaming tone used everywhere else in the product.
- Focus states use the visible clay ring token; tap targets are sized for comfortable one-handed phone use; the "Estimating…" state is exposed via something like an `aria-live` region so it's read aloud, not just animated.

## Cross-Story Dependencies

- Builds on Epic 0's shared visual tokens and interaction primitives (in-progress indicator styling, retry-prompt styling, one-primary/one-secondary-action rule, no-infinite-scroll rule, one-screen logging).
- Story 2.6's photo preview is layered onto the same Log Photo dialog and state machine that Stories 2.2 (photo capture/compression) and 2.3 (in-progress/retry/failure states) establish — it does not introduce a separate flow or screen, and must track whichever state those stories are already in (preparing, estimating, success, retry).
- Epic 3's classification work alters the `entries` table this epic creates (adds a classification column) and reads its `description_text`/`calories` output — don't pre-add that column or attempt classification here.
- Epic 4's first-login "log a meal now?" acceptance path re-enters this same Log Entry flow rather than a separate one.
- Epic 5's historical trends read directly from the `entries` rows this epic produces, independent of Epic 3.
