---
title: 'User Logout'
type: 'feature'
created: '2026-09-25'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The app has no way to log out. FR-24 (PRD) and Story 1.5 (epics.md) require a logout affordance that ends the Supabase Auth session, after which every authenticated route is unreachable until the user logs back in.

**Approach:** Add a third icon-only control (`LogOut` from lucide-react) to the Daily view's existing header row (`app/page.tsx`), alongside the Trends and Settings icons already there — same `Button variant="ghost" size="icon"` treatment, but a real `<button>` with an `onClick` handler (not `asChild`/`<a>`, since this triggers an action, not a navigation to a static URL). On click, call the browser Supabase client's `auth.signOut()`, then hard-navigate to `/login` via the existing `redirectToLogin()` helper in `lib/handle-session-expiry.ts` — the same hard-navigation approach the Login page already uses for its own post-auth redirect, and for the same reason (a soft/RSC navigation can race ahead of the session cookie actually clearing). No new backend route: `proxy.ts`'s existing middleware session check (Story 1.2) already guards every authenticated route once the session is gone, so logout adds no new route-guard logic.

</frozen-after-approval>

## Implementation Notes

- `app/page.tsx`: added a third icon-only header control (lucide `LogOut`), same `Button variant="ghost" size="icon"` treatment as the existing Trends/Settings icons — but a real `<button onClick={handleLogout}>`, not `asChild`/`<a>`, since it triggers an action rather than a navigation. `handleLogout()` calls the browser Supabase client's `auth.signOut()` (wrapped in try/catch, logging any failure) then always calls the existing `redirectToLogin()` helper from `lib/handle-session-expiry.ts` — reused as-is rather than duplicating its hard-navigation logic.
- No new backend route, no changes to `proxy.ts` — the existing middleware session check already guards every authenticated route once the session cookie is gone.
- Live-verified end-to-end via `agent-browser`: logged in, confirmed the header's third icon has accessible name "Log out," clicked it, confirmed redirect to `/login`; then confirmed both `/` and `/preferences` redirect back to `/login` (the latter with `?next=` preserved) while logged out; then logged back in and confirmed the Daily view loads normally (remaining budget + Recommendation card), with no other lasting effect on the account.
- Review pass (Blind Hunter) surfaced two real, patch-worthy findings, both fixed:
  - Extracted the three near-identical `Button`/`aria-label`/`title` header-icon blocks (Trends, Settings, and this story's new Logout) into one shared `app/header-icon-button.tsx` component (`HeaderIconButton`, supporting both `href` for a link and `onClick` for an action) — matches this app's established "one shared component, not separately-maintained copies" precedent (`back-to-daily-view-link.tsx`). `app/page.tsx` no longer imports `Button` directly for these three controls.
  - Added a hairline divider (`<div aria-hidden="true" className="mx-1 h-5 w-px self-center bg-border" />`) between the two navigation icons and Logout — same size/spacing/`ghost` treatment as Settings made a mis-tap easy, and unlike confusing Settings with Trends, an accidental Logout tap ends the session. Matches DESIGN.md's "depth via border hairlines, not shadows" convention.
- Re-ran the full verification sweep and a second live-browser pass after both patches — see Verification below.

## Verification

**Commands:**
- `npx tsc --noEmit` -- ran, no type errors.
- `npx eslint app/page.tsx app/header-icon-button.tsx` -- ran, no lint errors.
- `node --test lib/**/*.test.ts` -- ran, all 90 tests passing (no new pure logic introduced, so no new unit tests needed).
- `npx next build` -- ran, clean production build, no new warnings.

**Manual checks:**
- Live-verified in a real browser session (`agent-browser`), both before and after the review patches: logout icon's accessible name, session end + redirect, protected-route guarding while logged out, clean re-login, and (post-patch) a screenshot confirming the divider renders correctly and the accessibility tree is unchanged by the `HeaderIconButton` refactor.

## Review Triage Log

Blind Hunter ran (the single layer this oneshot-sized change calls for). Finding floor: ~3.16 kB changed → N = min(floor(sqrt(3.16)+1), 10) = 2; reviewer found 8.

- **[medium, patch]** The new Logout icon sits directly beside Settings — same size, spacing, and `ghost` visual treatment, no separator — making a mis-tap easy; unlike confusing Settings with Trends, an accidental Logout tap ends the session. Fixed: added a hairline divider between the navigation icons and Logout (DESIGN.md's border-hairline-not-shadow convention).
- **[low, patch]** Three near-identical `Button`/`aria-label`/`title` header-icon blocks (Trends, Settings, and this story's new Logout) existed with no shared component, risking future drift (e.g. a later edit forgetting `title` or mismatching it against `aria-label`). Fixed: extracted `app/header-icon-button.tsx`'s `HeaderIconButton`, matching the app's established `back-to-daily-view-link.tsx` precedent.
- **[low, rejected]** Logout is only reachable from the Daily view header, not `/trends` or `/preferences` — in tension with the PRD's own FR-24 assumption that logout is "reachable from every authenticated page." Rejected: this was an explicit, recorded human decision (the epics-and-stories session's own placement question was answered "icon in the Daily view header," not "both"), and both other pages already have a "Back to Daily view" link — one extra tap, not a dead end.
- **[low, rejected]** No loading/pending feedback while `signOut()` is in flight, so a slow connection gives no visual sign anything happened. Rejected: matches this exact codebase's existing precedent (`handleAcceptBreakfastOffer` has the identical no-loading-state shape, already shipped in Epic 4) — not a new inconsistency this story introduces.
- **[low, rejected]** No timeout/`AbortController` guards `supabase.auth.signOut()`; an indefinitely-hung call would never redirect. Rejected: `LoginPage`'s own `signInWithPassword` call has the identical characteristic and was never flagged there either; an indefinite hang is an exceedingly rare failure mode for a local, single-user app, and adding timeout-handling would be more than a simple correction.
- **[false]** No confirmation/undo before logging out, given how easy the icon is to reach. Disproof: this app has zero confirmation modals anywhere (Add Photo, Add Text, Accept breakfast offer are all one-tap, matching EXPERIENCE.md's "one screen, one action" rule), and logout is fully reversible via re-login with no other lasting effect — adding a confirmation dialog here would be the actual inconsistency with the rest of the app.
- **[low, deferred]** Logging out in one tab doesn't immediately propagate to other open tabs of the same app. Deferred (`deferred-work.md`): an inherent property of the cookie-based session model established since Story 1.2 (a revoked/expired session already has the identical staleness), not something this story introduces; fixing it needs new push-based auth-sync infrastructure disproportionate to this hobby-scale app.
- **[low, rejected]** No automated test covers `handleLogout`'s failure branch (`signOut()` throwing, catch still redirecting). Rejected: this is the exact same pre-existing, already-logged "no automated tests exist anywhere in this repo" systemic gap from Story 1.1, handled identically in Story 1.4's own review — not a new gap this story introduces, and introducing component-test infrastructure is a project-wide decision bigger than this story.

