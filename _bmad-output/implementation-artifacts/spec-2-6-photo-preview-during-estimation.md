---
title: 'Photo Preview During Estimation'
type: 'feature'
created: '2026-09-26'
status: 'done'
baseline_commit: '9678431'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After picking a photo, the user gets no visual confirmation of which photo they're submitting — only text status messages (Estimating…, success, retry). FR-25 (PRD) and Story 2.6 (epics.md) require a preview of the exact uploaded photo, visible continuously from the moment it's picked through preparing/estimating/success/retry, discarded when the dialog closes.

**Approach:** In `app/log-photo-dialog.tsx`, add local `previewUrl` state set via `URL.createObjectURL(file)` on the *original* picked file (before compression) inside `handleFileChange`, right after the file is obtained. Render a plain `<img src={previewUrl}>` (with a justified `@next/next/no-img-element` disable — `next/image` cannot load a `blob:` object URL) near the top of the dialog's content, above the existing status cards, so it's visible in every subsequent state without being conditionally re-mounted. Revoke the previous object URL (`URL.revokeObjectURL`) whenever a new photo is picked and when the dialog closes (`handleOpenChange`'s `!next` branch), matching the file's existing imperative-reset style (`cancelAndReset()`, `setRejection(undefined)`) rather than introducing a `useEffect`. No new endpoint, no new dependency, no change to `useEntrySubmission`'s state machine or the existing visible status cards/`LiveRegion` — purely additive, client-side-only rendering.

</frozen-after-approval>

## Implementation Notes

- `app/log-photo-dialog.tsx`: added `previewUrl` state, set via `URL.createObjectURL(file)` on the original picked `File` (not the compressed bytes), in the same synchronous batch as `setOpen(true)` inside `handleFileChange` — deliberately placed *before* the tick-delay that defers `setPreparing(true)` (Story 2.5's LiveRegion mount-timing fix), since FR-25 wants the preview visible on the dialog's very first commit, the opposite requirement from that fix. Used the functional `setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(file); })` form to correctly revoke a still-active URL from an earlier pick in the same open dialog (the "Try another photo" retry path) without reading a possibly-stale closure variable. The same revoke-on-close pattern is mirrored in `handleOpenChange`'s `!next` branch.
- Rendered as a plain `<img>` (with a scoped, justified `@next/next/no-img-element` disable — `next/image` cannot resolve a `blob:` object URL), placed above the existing status cards so it's present across every subsequent state without being conditionally re-mounted. `alt="Photo you just uploaded"`.
- No changes to `useEntrySubmission`, `EntryStatusCard`, or `LiveRegion` — purely additive.
- Live-verified via `agent-browser` against the real running dev server: uploaded a real photo file, confirmed the preview renders immediately with the correct accessible name (`image "Photo you just uploaded"`), confirmed it remains visible alongside the retry prompt when the (deliberately ambiguous) test image resolved to "insufficient detail," then confirmed "Try another photo" + a second upload replaces the preview cleanly with no console errors (checked the dev server's own log for the browser console).
- The success-state persistence (`status === "success"`) was not captured live in this pass — both test images were 1x1-pixel placeholders that correctly resolved to `insufficient_detail`, not success, and no recognizable food photo was available in this environment. Not treated as a gap, for the same reason Story 2.5's own spec accepted the equivalent limitation for its LiveRegion success text: the `<img>`'s render condition (`{previewUrl && (...)}`) has no dependency on `status` at all — it is not a per-state conditional that happens to include success, it is unconditional on every state once `previewUrl` is set, so the retry-state verification already exercises the identical code path success would use.

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, no type errors.
- `npx eslint app/log-photo-dialog.tsx` -- ran, no lint errors.
- `node --test lib/**/*.test.ts` -- ran, all 90 tests passing (no new pure logic introduced, so no new unit tests needed).
- `npx next build` -- ran, clean production build, no new warnings.

**Manual checks:**
- Live-verified in a real browser session (`agent-browser`) against the real running dev server and real local Supabase instance: preview appears immediately on upload with the correct accessible name, persists through both the "Estimating…" in-progress state and the retry state, and is cleanly replaced by "Try another photo" + a second upload, with no console errors. See Implementation Notes for the success-state reasoning. Also visually confirmed the `object-contain`/`bg-muted` letterboxing renders correctly (post-review fix).

## Review Triage Log

Blind Hunter ran (the single layer this oneshot-sized change calls for). Finding floor: ~3.28 kB changed → N = min(floor(sqrt(3.28)+1), 10) = 2; reviewer found 8.

- **[low, patch]** No cleanup if `LogPhotoDialog` itself unmounts while a preview is active — the explicit revokes in `handleFileChange`/`handleOpenChange` only cover a new pick or a user-initiated close. Fixed: added a `useEffect` cleanup as a backstop (harmlessly redundant with the existing manual revokes in the already-handled paths; `URL.revokeObjectURL` on an already-revoked URL is a documented no-op).
- **[low, patch]** `object-cover` crops the preview to fill its box, which can hide the very content (the food itself) the feature exists to let the user confirm — directly at odds with the spec's own "exact photo" framing. Fixed: switched to `object-contain` with a `bg-muted` background for the resulting letterbox space, matching this app's existing muted/card background conventions.
- **[low, rejected]** No explicit width/height reservation causes a layout shift before the image decodes. Rejected: object URLs are local (no network fetch) and decode near-instantly, making the actual shift imperceptible in practice; a fixed-aspect-ratio wrapper would add complexity disproportionate to a shift no one would notice.
- **[low, rejected]** No `onError` handler for an undecodable file (corrupt/exotic format) — the preview would silently show a broken-image icon. Rejected: `compressImage()`'s own existing catch block already surfaces "Couldn't process that photo — try a different one." for exactly this failure mode; the user still gets clear, correct feedback via the existing path.
- **[false]** Canvas `drawImage()` (used by `compressImage()`) doesn't apply EXIF orientation correction, so the preview and the actually-submitted bytes could show different orientations. Disproof: verified `lib/compress-image.ts` draws a real `Image()`/`HTMLImageElement` onto canvas — in all modern browsers, EXIF orientation correction happens at image *decode* time (before `onload` fires), not as a separate step `drawImage` would need to apply. The preview `<img>` and the compression pipeline's `Image()` object both decode through the identical auto-rotate-respecting path, so no mismatch exists.
- **[low, deferred]** `DialogContent` has no `max-h`/`overflow` of its own; stacking the preview above existing content increases overflow risk on a short viewport. Deferred (`deferred-work.md`): real, but a pre-existing gap in the *shared* dialog component (affects the Log Entry dialog too), not introduced by this story alone — the proper fix has a broader footprint than this single-file story's scope.
- **[low, rejected]** Alt text isn't tied to the adjacent status text via `aria-describedby`. Rejected: the image's identity is constant across every state (it's the same photo throughout, by design), and Story 2.5's `LiveRegion` already separately announces state changes in sequence — no established precedent in this codebase for linking a non-actionable image to adjacent live text.
- **[low, rejected]** No automated test for the preview state machine, and the success-state persistence wasn't captured live. Rejected: the "no automated tests" half is the same pre-existing, already-logged project-wide gap every prior story has deferred identically. The "success-state unverified" half was re-checked directly against the code: the `<img>`'s render condition (`{previewUrl && (...)}`) has zero dependency on `status`, matching Story 2.5's own accepted precedent for the identical class of claim.
