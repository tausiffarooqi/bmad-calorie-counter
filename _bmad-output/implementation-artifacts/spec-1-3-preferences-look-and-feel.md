---
title: 'Account & Preferences — Match Dashboard Look/Feel, Fix Alignment'
type: 'bugfix'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/DESIGN.md'
  - '_bmad-output/planning-artifacts/ux-designs/ux-bmad-calorie-counter-2026-09-18/mockups/preferences-refresh.html'
baseline_commit: '292322688575867ee39b4a5f337f7c0238be39c6'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Direct user request: "make the account preferences page match the overall look and feel of the dashboard and fix the alignment of the elements on that page." The Preferences card had no shadow and a `rounded-md` (10px) radius — its own approved mockup shows `border-radius: 16px` and `box-shadow: 0 10px 28px rgba(39,48,46,0.08)` (an exact match to the existing `--shadow-soft` token), never applied. Separately, the page's outer container still used `justify-center` — the same pattern just fixed on the Daily view (which now uses `justify-start`) — and since this page's content is short, the centering was clearly visible (unlike the Daily view's usually-overflowing content), reading as inconsistent with the dashboard's newly top-aligned convention.

**Approach:** Add a new `--radius-card: 16px` token (`app/globals.css`, `@theme inline`) — shared potential for Login/Register later, applied to Preferences now. Change the Preferences card's className from `rounded-md ...` to `rounded-card ... shadow-soft`. Change the page's outer container from `justify-center` to `justify-start`, matching the Daily view. Documented the new radius token and both decisions in DESIGN.md/EXPERIENCE.md/epics.md.

**Always:** Reuse the existing `shadow-soft` token (its value already matches the mockup's shadow exactly) — no new shadow token needed.

**Never:** Touch Login or Register — same underlying gap, but out of scope for this direct request (tracked in `deferred-work.md`, narrowed to just those two now).

</frozen-after-approval>

## Implementation Notes

Added `--radius-card` (16px) to `globals.css`, applied `rounded-card shadow-soft` to the Preferences card, and switched the page's outer container to `justify-start`. Verified visually via `agent-browser` — card now shows the soft shadow and larger radius, page starts flush at the top instead of visibly centering its short content. Blind Hunter caught two real citation/documentation errors: a stale comment in `app/page.tsx` claiming Preferences still uses `justify-center` (now false, fixed in the same change), and a false "(Story 0.1)" attribution in the new Preferences comment (Story 0.1 is unrelated — Design Tokens & Visual Foundation). Also caught a real error in my own forward guidance: `deferred-work.md`/DESIGN.md told whoever implements Login/Register next to reuse `shadow-soft` as-is, but their own mockup uses a different shadow opacity (0.10, not 0.08) — corrected both. Attempted to also recapture the stale `docs/screenshots/03-account-preferences-page.jpg`, but reverted it on realizing all 7 README screenshots predate the entire redesign (still show the original Muted Earth Editorial palette) — swapping just one would make the set internally inconsistent; logged as its own, properly-scoped deferred item instead.

## Review Triage Log

- **medium** — `app/page.tsx`'s comment (and a `.memlog.md` entry) claimed "Login/Register/Preferences keep justify-center unchanged" — false the moment this same change landed, since Preferences was just switched to `justify-start`. Fixed: updated the code comment; appended a correcting memlog entry (memlogs are append-only, never edited).
- **medium** — The new Preferences comment cited "(Story 0.1)" for the Daily view's top-alignment fix — Story 0.1 is "Design Tokens & Visual Foundation," an unrelated earlier story; the actual fix has no story number, just a direct-user-request citation in its own file. Fixed: removed the false citation, pointed to `app/page.tsx`'s own comment instead.
- **medium** — `deferred-work.md`/DESIGN.md's guidance for the still-pending Login/Register shadow told a future implementer to reuse `shadow-soft` (0.08 opacity) — but `auth-refresh.html`'s own approved mockup uses 0.10 opacity, a real 25% under-shoot if followed as written. Verified directly against the mockup file. Fixed: corrected both documents to flag the discrepancy and the correct value.
- **low** — `docs/screenshots/03-account-preferences-page.jpg` still shows the pre-fix look (10px radius, no shadow, centered) and is now stale. Attempted a recapture, but reverted: all 7 README screenshots predate the entire Warm Editorial Refresh redesign (confirmed — `01-login-page.jpg` still shows the original Muted Earth Editorial palette), so fixing only this one would make the set inconsistent rather than more accurate. Logged as a properly-scoped "recapture all 7 together" deferred item instead.
- **low, rejected** — The rationale for this change is spelled out independently in three places (`globals.css`, `preferences/page.tsx`, DESIGN.md) with no cross-reference between them. Fixed the most duplicative one (`globals.css`'s comment now points to DESIGN.md as the single detailed source instead of restating it) — the other two already carried pointers, not full independent restatements, so left as-is.
- **low, rejected** — No test coverage exists for the card's radius/shadow classes or the container's justify value. Consistent with this codebase's established convention — no component-rendering or visual-regression tests exist anywhere in this project.
