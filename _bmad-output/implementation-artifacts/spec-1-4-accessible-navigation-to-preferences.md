---
title: 'Accessible Navigation to Preferences'
type: 'feature'
created: '2026-09-20'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
baseline_commit: 'd53f292acee7b2c0d9460ec67ac2c8548622bc6c'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Daily view (`app/page.tsx`, the Epic 0 placeholder) has no way to reach `/preferences` (Story 1.3), and the icon-only settings control this needs carries no accessible name — a screen reader would announce it as nothing meaningful.

**Approach:** Add an icon-only settings link (lucide `Settings` icon, no visible text) to `app/page.tsx` pointing at `/preferences`, with `aria-label="Open account settings"` so assistive technology announces it correctly (UX-DR23). This also establishes the standing rule for later epics: no icon-only control ships without an accessible name.

</frozen-after-approval>

## Implementation Notes

- `app/page.tsx`: added an icon-only settings link using the shadcn `Button` (`asChild`, `variant="ghost"`, `size="icon"`) wrapping a plain `<a href="/preferences">` with `aria-label`/`title="Open account settings"` and lucide-react's `Settings` icon. `asChild`/`Slot` renders the anchor directly with the button's classes, so it's a real link (not a JS-driven button). Uses a plain `<a>`, matching this codebase's existing convention (Login/Register/Preferences never use `next/link` either) — not for the same session-cookie-race reason Login's hard-navigation comment documents (that reasoning is specific to post-auth-mutation navigation and doesn't apply to a plain same-origin link), just consistency with how every other internal link in this codebase is currently written.
- Chose `variant="ghost"` (no border/fill) rather than `outline` — this is a passive utility control in the corner, not a competing action alongside the page's two primary CTAs ("Add Photo"/"Add Text"), matching EXPERIENCE.md's "never more than two competing actions on a surface" rule.
- `self-end` on the Button, inside the parent's `items-center` column, places it at the top-right of the viewport — a conventional settings-icon position. This placement is inside the Epic 0 placeholder page (`app/page.tsx`), which Epic 3 fully replaces with the real Daily view; exact layout here is not meant to be durable.
- Live-verified: the accessibility tree reports the link's accessible name as exactly "Open account settings" (confirmed via `agent-browser snapshot`), and clicking it navigates to `/preferences`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, no type errors.
- `npx eslint app/page.tsx` -- ran, no lint errors.
- `npm run build` -- ran, clean production build, no new warnings.

**Manual checks:**
- Loaded `/` in a real browser session (`agent-browser`) — the accessibility tree reports `link "Open account settings"`, confirming the accessible name is exactly what UX-DR23 requires, not just visually present.
- Clicked the settings link — navigated to `/preferences` (Story 1.3's screen) successfully.

## Review Triage Log

Blind Hunter ran (the single layer this oneshot-sized change calls for). Finding floor: ~3.83 kB changed → N = min(floor(sqrt(3.83)+1), 10) = 2; reviewer found 8.

- **[medium, patch]** `## Verification` section was missing from the spec, unlike every other Epic 1 story, even though build/lint/test commands clearly apply to a `.tsx` change. Fixed: added, recording the `tsc`/`eslint`/`build` runs plus the live accessibility-tree and navigation checks already performed but not yet written down.
- **[low, patch]** No `title` attribute for sighted mouse users hovering the icon — only `aria-label` covered assistive tech. Fixed: added `title="Open account settings"` alongside the existing `aria-label`, a one-line addition.
- **[low, patch — documentation only]** Implementation Notes justified the plain `<a>` choice by pointing at Login's session-cookie-race rationale, which doesn't actually apply here (this link follows no auth mutation). The underlying code choice is correct and consistent with the rest of the codebase (no page anywhere uses `next/link`); only the stated reasoning was imprecise. Fixed: reworded to cite consistency with the existing convention directly, not Login's unrelated race-condition fix.
- **[medium, real but pre-existing, fixed anyway]** `sprint-status.yaml`'s `epic-1` was still `backlog` despite four of its stories being `in-progress`/`review`, contradicting the file's own documented rule ("Epic transitions to 'in-progress' automatically... via build's sprint sync"). Not caused by this story specifically — the cascade should have fired when Story 1.1 started, via `sync-sprint-status.md`'s instruction to flip the parent epic, which calling `sprint_plan.py --set` directly (rather than following that file's instruction by hand) skipped across all of Stories 1.1–1.3. Fixed now via an explicit `--set epic-1=in-progress` call; worth remembering that `--set` on a story key alone does not cascade to the epic.
- **[low, rejected]** `size="icon"` (32×32px) is below the ~44px target some accessibility guidelines recommend, and this is the first use of any icon-size Button variant in the codebase. Rejected: NFR-8/UX-DR22 explicitly disclaim a formal WCAG level for this single-user prototype ("reasonable baseline," "comfortable... no fine-motor-dependent small controls") rather than requiring AAA-level 44px targets; 32px clears WCAG 2.5.8 AA's 24px minimum comfortably. A real gap would need more than the simple correction this rule allows for a `low` finding.
- **[low, deferred]** No automated regression coverage (unit/e2e/lint rule) would catch a future edit dropping the accessible name this story establishes as a standing rule. Deferred: this is the codebase's pre-existing, already-logged systemic gap (`deferred-work.md`: "No automated tests exist anywhere in this repo," from Story 1.1) — not a new gap this story introduces, and introducing test infrastructure is a project-wide decision bigger than this story.
- **[false]** Spec frontmatter still `in-progress`, no Review Triage Log yet, and the change uncommitted. Disproof: this is exactly the workflow's own designed sequence (`step-oneshot.md`: Implement → Review → Classify → **then** Finalize Spec sets `status: 'done'` → Commit) — the reviewer ran mid-flight, before those steps executed, which is expected, not a defect. Both now resolved by the Finalize/Commit steps that follow this triage.
