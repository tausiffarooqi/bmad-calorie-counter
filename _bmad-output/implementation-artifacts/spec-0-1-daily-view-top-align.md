---
title: 'Daily View — Top-Align Content Instead of Vertical-Center'
type: 'bugfix'
created: '2026-09-27'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
baseline_commit: '518dadb5dfa4912098d2e33535043d7d144fc792'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** User asked whether the Hero card was top- or center-aligned. `app/page.tsx`'s outer container used `justify-center`, coding the whole content column (greeting, Hero card, entries, recommendations, buttons) as vertically centered — but in practice it almost always renders top-anchored anyway, since the column's content height typically exceeds the viewport (confirmed: 694px content vs. 568px viewport in a live check), leaving no free space for centering to act on. The user asked to make it explicitly, reliably top-aligned instead of nominally-centered-but-usually-overflowing.

**Approach:** Change `app/page.tsx`'s outer container from `justify-center` to `justify-start`. The rest of the column already flows naturally top-to-bottom via `flex-col` — this one class is the only thing determining where the group starts.

**Always:** Keep every other class on that container unchanged (`items-center` still horizontally centers the single-column layout, per DESIGN.md's Layout & Spacing).

**Never:** Touch any other page's layout (Login, Register, Preferences, Trends) — the user's question and request were specifically about the Daily view / Hero card.

</frozen-after-approval>

## Implementation Notes

Changed `justify-center` → `justify-start` on the Daily view's outer container. Verified via `agent-browser` against a freshly-registered account with zero Entries logged (a genuinely short-content render, structurally the same low-height case as the First-Login prompt and loadError branches) — confirmed the content renders flush at the top with calm, comfortable whitespace below, not vertically centered mid-page. Cleaned up the temporary test account afterward. Blind Hunter's review correctly pointed out my original stated rationale ("rarely had visible effect") doesn't hold for the app's shorter-content states — this is exactly where the fix matters, not the already-overflowing common case — so I verified that specific claim directly rather than assuming it. Added a code comment explaining the change and its scope, and documented the decision in EXPERIENCE.md's Foundation section.

## Review Triage Log

- **medium** — The stated rationale didn't account for the First-Login prompt and loadError branches, which render far less content and are plausibly shorter than the viewport — exactly where `justify-start` vs. `justify-center` visibly differs, unlike the common long-content case. Verified directly: registered a temporary zero-Entries test account, confirmed the shorter render displays top-aligned with calm whitespace below, not centered or awkward. (The First-Login prompt card itself couldn't be independently screenshotted due to a pre-existing, unrelated dev-mode Strict-Mode double-fetch quirk that consumes the one-shot "show it" flag before the visible render — but it shares the exact same outer container and content height class as the zero-Entries case verified, so the same conclusion applies structurally.)
- **low** — No code comment explained the change, breaking this file's dense convention of citing a rationale for layout decisions. Fixed: added one explaining what changed, why, and its intentionally narrow scope.
- **low** — Neither DESIGN.md nor EXPERIENCE.md documented vertical alignment as a decided point, even though the approved mockup's own `.screen` CSS already assumed top-alignment (no `justify-content` rule). Fixed: added a note to EXPERIENCE.md's Foundation section.
- **low, rejected** — Sibling pages (Login, Register, Preferences) still use `justify-center` with nothing recording that the divergence is intentional. Addressed via the same code comment and EXPERIENCE.md note above ("scoped to the Daily view only") — the user's request was specifically about the Daily view/Hero card; changing the other three pages is out of scope without a separate request.
