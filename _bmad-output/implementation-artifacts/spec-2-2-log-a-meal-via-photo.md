---
title: 'Log a Meal via Photo'
type: 'feature'
created: '2026-09-21'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
baseline_commit: 'ca3ca77477ffb12b9a4f7ba9f97720a119fb9645'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `EstimationProvider` and the Log Entry flow only handle text today (Story 2.1); the placeholder's "Add Photo" button is inert, and nothing compresses, uploads, or estimates from a photo.

**Approach:** Broaden `EstimationInput` to a photo variant, add a vision branch to `GeminiAdapter`, extend `POST /api/entries` to accept a compressed photo instead of text, and wire "Add Photo" to the device's native picker with client-side compression before upload (AD-4). Extract the submission state machine Story 2.1 built (staleness tracking, abort-on-close, status states) into a shared hook so the photo dialog gets the same hardened behavior instead of a re-derived, possibly-inconsistent copy.

</frozen-after-approval>

## Boundaries & Constraints

**Always:** Photo bytes live only in the request body for the duration of the `estimate()` call — never written to disk, the DB, or Supabase Storage; only the resulting `description`/`calories` persist (AD-4). Client compresses before upload (cap longest dimension ~1600px, JPEG quality ~0.8, no new dependency — Canvas API); if still too large after compression, reject client-side with no request sent. "Add Photo" opens the native camera/file picker directly — no custom in-app camera UI. The photo-only notice (FR-21) is persistent, non-dismissible, small-print — not a dialog.

**Never:** Do not implement classification (Epic 3). Do not add the `classification` column. Do not log/print raw photo bytes anywhere (including error logs) — a stray `console.error` of the request body would be a de facto storage violation of AD-4.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Happy path | Compressed photo of a clearly identifiable meal | `estimate()` returns `{ ok: true, description, calories }`; new `entries` row (`input_mode='photo'`, no photo bytes persisted); dialog shows calories and closes | N/A |
| Still too large after compression | A photo that stays oversized post-compression | No request sent | Clear client-side rejection message, "pick a smaller photo" |
| Insufficient detail | Ambiguous/blurry/non-food photo | `estimate()` returns `{ ok: false, reason: 'insufficient_detail' }`; no `entries` row; retry prompt, same as Story 2.1's text path | N/A |
| Hard estimation failure | Gemini call throws | No `entries` row; plain failure message | Caught in route, `{ error: { code: 'estimation_failed', message } }`, 500 |

</frozen-after-approval>

## Code Map

- `lib/estimation/types.ts` (existing) -- broaden `EstimationInput` to `{ mode: 'text'; description: string } | { mode: 'photo'; base64: string; mimeType: string }`
- `lib/estimation/gemini-adapter.ts` (existing) -- add a photo branch: multimodal request (`inline_data: { mime_type, data }` + a vision prompt asking the model to identify the food and judge whether it's clear enough to estimate — explicitly false for non-food/too-ambiguous images), same `responseSchema`/`isValidPayload` validation as the text path
- `app/api/entries/route.ts` (existing) -- accept `photoBase64`/`photoMimeType` as an alternative to `descriptionText` (XOR validation, mirroring Story 1.3's preferences route pattern); never `console.error` the raw payload, only error metadata
- `hooks/use-entry-submission.ts` (new) -- extracted from `app/log-entry-dialog.tsx`: the status state machine (idle/submitting/success/insufficient_detail/error), `requestIdRef`/`AbortController` staleness handling, and the POST/redirect/error-parsing logic, parameterized by the request body to send. Both dialogs consume this hook so the hardened close-mid-flight fix from Story 2.1's review isn't re-derived
- `app/log-entry-dialog.tsx` (existing) -- refactored to use `useEntrySubmission()`; no behavior change
- `lib/compress-image.ts` (new) -- Canvas-based client-side compression: draw the selected file at capped ~1600px longest dimension, export JPEG at ~0.8 quality, return a base64 string; a `MAX_PHOTO_BYTES` ceiling (~3MB raw, safely under Vercel's 4.5MB after base64 inflation) checked post-compression
- `app/log-photo-dialog.tsx` (new) -- hidden `<input type="file" accept="image/*" capture="environment">` triggered by the visible "Add Photo" button; on file select, compress client-side, reject with a clear message if still oversized, else reuse `useEntrySubmission()` and the same idle/submitting/success/insufficient_detail/error UI shape as the text dialog (minimal, not the Story 2.3 polish)
- `app/page.tsx` (existing) -- wire "Add Photo" to `LogPhotoDialog`; add the persistent photo-only notice (small, muted-foreground, no card/border) near it

## Tasks & Acceptance

**Execution:**
- [x] `lib/estimation/types.ts` + `gemini-adapter.ts` -- photo input variant + vision branch
- [x] `app/api/entries/route.ts` -- accept photo payload, XOR-validated
- [x] `hooks/use-entry-submission.ts` -- extracted shared submission state machine
- [x] `app/log-entry-dialog.tsx` -- refactored onto the shared hook, no behavior change
- [x] `lib/compress-image.ts` -- client-side compression + oversize rejection
- [x] `app/log-photo-dialog.tsx` + `app/page.tsx` wiring -- functional photo-entry flow + photo-only notice

**Acceptance Criteria:**
- [x] Given a real photo of food, when I submit it via "Add Photo", then it's compressed client-side, a new `entries` row is created with the estimated calories, and I see that calorie count — live-verified through the real browser UI (`agent-browser`, file upload on the actual hidden input) with a real downloaded cheeseburger photo against the real local Supabase instance and the real Gemini API: `entries` row created (`input_mode='photo'`, "Cheeseburger with a sesame seed bun, beef patty, slice of American cheese, and lettuce.", 530 calories), dialog auto-closed
- [x] Given the compressed photo is still too large, when I try to submit, then no request is sent and I see a clear rejection message — server-side backstop (same `MAX_PHOTO_BYTES` constant) live-verified via a direct oversized request (400, correct message); client-side branch confirmed via code review as simple/deterministic (see note below on why a real photo defeating JPEG compression wasn't practical to produce)
- [x] Given an ambiguous or non-food photo, when I submit it, then no `entries` row is created and I see the same retry prompt as Story 2.1's insufficient-detail case — live-verified through the real browser UI with a real cat photo: "Add a bit more detail and try again.", `entries` row count unchanged
- [x] Given the Gemini call itself fails, when I submit a photo, then no `entries` row is created and I see the same plain failure message as Story 2.1 — verified by mechanism-sharing: photo and text both go through the identical `useEntrySubmission()`/route.ts error-handling code, already live-verified against genuine Gemini 503/429 failures in Story 2.1
- [x] Given I'm on the photo-capture path, then a persistent small-print notice near "Add Photo" instructs meal-photos-only, with no dialog to dismiss — live-verified (`text-xs text-muted-foreground`, no card/border, always rendered)

## Implementation Notes

- Verified live against the real Gemini API (no mocking): `GeminiAdapter.estimate()` called directly with `{ mode: "photo", ... }` for (a) a real cheeseburger photo → `{ ok: true, description, calories: 530 }`, and (b) a clearly non-food photo (a cat) → `{ ok: false, reason: "insufficient_detail" }`. The pre-existing text path was re-run as a regression check and still returns `{ ok: true, ... }` unchanged.
- **Full browser-to-DB round trip completed after the implementation subagent's report** (its sandbox had no Docker on PATH; Docker Desktop is installed on this machine, its CLI just wasn't on that fresh shell's PATH — same situation as prior stories). Confirmed via `agent-browser`: uploading a real cheeseburger photo through the actual "Add Photo" hidden file input → compression → `POST /api/entries` → a genuine `entries` row (photo mode, 530 calories) → dialog auto-close. Uploading a real cat photo → correct insufficient-detail retry message, no row created. Text path re-tested post-refactor and still creates correct rows.
- **Oversize-rejection test note:** attempted to produce a real photo that survives Canvas compression (1600px cap, JPEG quality 0.8) while staying over the 3MB ceiling, using a synthetic high-entropy noise image (3000×3000 random pixels) as the adversarial case most likely to defeat JPEG's compression. It didn't — JPEG's DCT-based encoding still compressed it under the threshold, and Gemini correctly judged the noise as `insufficient_detail` (not food) when submitted. The server-side backstop (identical `MAX_PHOTO_BYTES` threshold, independently live-verified via a direct oversized request bypassing the client) and a code-review confirmation of the simple, deterministic client-side branch (`blob.size > MAX_PHOTO_BYTES`) together give sufficient confidence in this path without a naturally-occurring failing photo.
- `app/api/entries/route.ts` adds a server-side re-check of the decoded photo size (`Buffer.byteLength(photoBase64, "base64")` against the same `MAX_PHOTO_BYTES` exported from `lib/compress-image.ts`) beyond what the spec's Code Map literally called for — judged necessary since a client request is never a trusted boundary, matching this codebase's established defense-in-depth pattern (e.g., Preferences' server-side revalidation of client-checked values).
- Kept the implementation subagent's small "Try another photo" retry button in the photo dialog's retryable states — not explicitly spec'd, but mirrors the text dialog's "edit and resubmit" affordance so a user isn't forced to close-and-reopen to retry; minor, low-risk, consistent with the story's own retry requirement.

## Review Triage Log

Three reviewers ran (Blind Hunter, Edge Case Hunter, Verification Gap). Several converged on the same root causes; grouped below by cause, not by reviewer.

- **[high, patch]** Closing the photo dialog (or picking a second photo) while `compressImage()` was still running left the pending compression's continuation unguarded — `useEntrySubmission`'s staleness machinery only covers the network leg (`submit()`), not this new pre-submit async phase, so a user who closed the dialog believing they'd cancelled could still have a real `entries` row created once compression finally resolved, and a rapid double-pick could submit the wrong (earlier, abandoned) photo. Flagged independently by all three reviewers as the single most-converged finding. Fixed: added `pickIdRef`, a staleness counter local to `app/log-photo-dialog.tsx`, bumped on every new pick and on close, checked before any user-visible action (`setPreparing`, `setRejection`, or `submit()`) runs. Also disabled the "Add Photo" button while `preparing`/`submitting` so a second pick can't even start mid-flight under normal use. Live-verified: single-pick happy path and insufficient-detail paths still work correctly after the fix, and a rapid double-pick test produced exactly one correct, uncorrupted `entries` row with no duplicate/mismatched data — the exact narrow race window (compress in progress, then close before it resolves) could not be reliably reproduced via browser automation, since real compression on this hardware consistently finishes faster than a scripted "close" action; logged as a residual verification gap in `deferred-work.md`.
- **[medium, patch]** `loadImage()`'s object URL was only revoked in a `finally` block that started *after* the image had already loaded — so a corrupt/unsupported file selection (which rejects during load) never revoked its object URL, leaking one blob URL per failed pick. Flagged independently by Blind Hunter and Edge Case Hunter. Fixed: the object URL is now created before entering the try/finally, so it's revoked on every path, including a load failure.
- **[medium, patch]** The Gemini vision request used snake_case `inline_data`/`mime_type` for the image part while every other field in the same request body is camelCase — a real convention break, though not a "silently degrades to a guess" bug in practice: the story's own live testing already showed the model producing image-specific, accurate content (distinguishing a real cheeseburger from a real cat), which wouldn't happen if the image bytes were being dropped. Flagged by Blind Hunter. Fixed anyway for consistency with the documented API convention and to remove the theoretical risk if the endpoint's JSON parser ever tightens: renamed to `inlineData`/`mimeType`, re-verified live via a direct API call that it still correctly identifies a real photo ("Cheeseburger").
- **[medium, patch]** The server's "defense-in-depth" base64 validation (`Buffer.byteLength(photoBase64, "base64")` wrapped in try/catch) never actually validates anything — that call doesn't throw for malformed base64, so the catch branch was dead code and garbage input would have sailed through to the Gemini call instead of getting a clean 400. Flagged independently by Blind Hunter and Verification Gap. Fixed: genuine round-trip validation (`Buffer.from(...).toString("base64") !== photoBase64`) that actually rejects malformed input. Live-verified: a deliberately garbled base64 string now correctly returns `400 invalid_input` / "Couldn't read that photo — try again."
- **[low, patch]** The server's photo mime-type check accepted any `image/*` subtype (including ones the client never produces and Gemini may not support, like `image/svg+xml`). Flagged by Blind Hunter. Fixed: replaced the open-ended regex with an explicit allowlist (`image/jpeg`, `image/png`, `image/webp`) matching what the client can ever legitimately send. Live-verified: `image/svg+xml` now correctly returns `400`/"Unrecognized photo format."
- **[low, patch]** The persistent photo-only notice (FR-21) sat visually near the "Add Photo" button but wasn't programmatically associated with it, breaking with this codebase's own established `aria-describedby` pattern (used throughout Preferences) for exactly this kind of adjacent-hint-text association. Flagged by Blind Hunter. Fixed: gave the notice `id="photo-only-notice"` and wired `aria-describedby` on the "Add Photo" button.
- **[low, patch]** `capture="environment"` on the hidden file input risks forcing camera-only behavior on some mobile browsers/WebViews, blocking the "pick an existing photo" path that EXPERIENCE.md's IA explicitly calls for alongside camera capture. Flagged independently by Blind Hunter and Edge Case Hunter. Fixed: removed `capture`, keeping only `accept="image/*"`, which still opens the native chooser (camera or gallery) on every mainstream mobile browser without the same risk.
- **[low, patch]** `useEntrySubmission`'s abort controller and success-close timer were only ever cleaned up via the dialogs' own `onOpenChange(false)` handler — nothing ran if the host page unmounted while a submission or the auto-close timer was pending (e.g. a client-side route change). Flagged by Blind Hunter. Fixed: added an unmount effect that performs the same abort/clear.
- **[low, deferred]** Canvas-based compression doesn't read/normalize EXIF orientation before drawing, so a portrait phone photo could theoretically compress sideways on browser engines that don't auto-correct during canvas draw. Flagged independently by Blind Hunter and Edge Case Hunter. Deferred: browser behavior here is genuinely inconsistent rather than a clear bug, a proper fix needs real EXIF-parsing complexity, and the failure mode degrades estimate quality rather than causing a hard failure. Logged in `deferred-work.md`.
