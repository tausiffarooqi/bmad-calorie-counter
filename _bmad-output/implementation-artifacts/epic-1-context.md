# Epic 1 Context: Account & Profile Setup

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Users can create an account, log in, and have their Daily Calorie Target and Dietary Preference captured. This is the foundation every other epic depends on: every downstream feature (budget calculation, recommendations, entries, trends) attributes data to "this user, today," and the Recommendation engine (Epic 3) reads `daily_calorie_target` and `dietary_preference` directly from what this epic establishes. Account recovery / forgot-password is explicitly out of scope. Note: FR-21 (meal-photo-only notice) was moved out of this epic during planning and belongs to Epic 2 — do not implement it here.

## Stories

- Story 1.1: User Registration
- Story 1.2: User Login
- Story 1.3: Manage Daily Calorie Target & Dietary Preference
- Story 1.4: Accessible Navigation to Preferences

## Requirements & Constraints

- Daily Calorie Target is entered once, at registration, as a flat numeric value, and is editable later on the Preferences screen (FR-13). The registration field is pre-filled with a standard-adult default (~2000 kcal) that the user can accept or change — never left blank.
- Dietary Preference is vegetarian or non-vegetarian, set on the Preferences screen (FR-19). Until explicitly changed, it defaults to non-vegetarian so the Recommendation lookup (Epic 3) always has a defined value — never null or undefined.
- Account creation and login are via email + password only (FR-20). This is Could-have scope: no account recovery / forgot-password flow in MVP.
- Registration logs the user in immediately — no email-confirmation waiting step (email confirmation is disabled on the self-hosted Supabase instance for this prototype).
- Validation: registration rejects an already-registered email, mismatched passwords, or a non-numeric/zero Daily Calorie Target, each with an inline field-level error — no account is created on failure. Preferences rejects non-numeric, zero, or negative Daily Calorie Target the same way.
- Unauthenticated access to any authenticated route (Daily view, Log Entry, Account/Preferences) redirects to Login. A valid existing session lands the user directly on the Daily view, no re-authentication.
- No formal WCAG level is targeted (single-user prototype), but a baseline applies: comfortable tap targets, visible form labels (not placeholder-only), visible focus states, and text-equivalent accessible names on icon-only controls.

## Technical Decisions

- Auth and data both go through self-hosted Supabase exclusively (Postgres + GoTrue Auth) — no other auth library is introduced (AD-3). Auth session is a JWT in an httpOnly cookie, verified in Next.js middleware; this is what protects authenticated routes.
- All writes to `profiles` go through the service layer — never a direct DB call from a route handler or component (layered architecture, AD-1).
- `profiles` table: `user_id` (PK/FK to `auth.users`), `daily_calorie_target` (int), `dietary_preference` (string, defaults to `'non_vegetarian'` at row creation — must never be null, since Epic 3's recommendation lookup is keyed on it).
- Naming conventions: DB tables/columns `snake_case`; TS variables/functions/types `camelCase`/`PascalCase`; API route folders `kebab-case` under `app/api/`.
- Timestamps (where applicable) are stored as UTC `timestamptz`. API errors return the shape `{ error: { code, message } }`.
- This story establishes Drizzle ORM 0.45.2 and the Supabase connection (local dev via Supabase CLI: `supabase init` + `supabase start`, Docker-managed) on top of the Epic 0 project scaffold — Next.js 16.3.5 (App Router), Node.js 24, TypeScript 6.0.3, Tailwind CSS 4.3.3. TypeScript is 6.0.3, not the originally-planned 7.0.2 — it was downgraded during Story 0.1 because `typescript-eslint` doesn't yet support TS7; there is no `useTypeScriptCli` flag in this project. Don't assume TS7-only syntax/tooling.
- Design tokens (colors, typography, radius scale), shadcn/ui foundation, and global focus-visible / interaction primitives (one primary + one secondary action per screen, visible clay focus ring, no hover-only affordances) already exist from Epic 0 — this epic builds screens on top of them, it does not define or re-establish them.
- Confirm the Hostinger VPS Supabase version matches what the local Supabase CLI provisions before relying on identical GoTrue/Postgres behavior across dev and prod (open item, not blocking).

## UX & Interaction Patterns

- **Login screen**: email + password fields, inline field-level failure messaging (no full-page error state), link to Register.
- **Register screen**: email + password + confirm password + Daily Calorie Target (pre-filled default, editable). Creates the account and logs the user straight in — no "check your email" state. Link to Login.
- **Account/Preferences screen**: shows current Daily Calorie Target and Dietary Preference (vegetarian/non-vegetarian). Saving shows an inline confirmation next to the changed field — no full-page reload or modal. Invalid input shows an inline field-level validation error.
- All buttons use the shared primary/secondary button components (clay fill / card-with-border outline, sm radius, no drop shadow) — no new button treatment is introduced for these screens.
- Form inputs use visible labels, not placeholder-only text; focus states use the clay ring token at visible contrast.
- The Daily view's settings icon (leading to Preferences) is icon-only and must carry a text-equivalent accessible name (e.g. "Open account settings"); this same rule applies to any other icon-only control introduced by later epics.
- Voice/tone: copy follows the "supportive, never shaming" register even in error states — plain, calm language (e.g. inline validation messages should state the problem plainly, not alarm-toned); no red/alarm styling is used anywhere, including for form errors.

## Cross-Story Dependencies

- Story 1.1 establishes the `profiles` table (with the `dietary_preference` default) and the Supabase connection that Stories 1.2 and 1.3 depend on.
- Story 1.3's Dietary Preference default value traces back to what Story 1.1 sets at registration — don't reintroduce a separate default in 1.3.
- Story 1.4 depends on the Daily view already having a settings icon pointing at the Preferences screen built in 1.3.
- Downstream: Epic 2 (Entries) and Epic 3 (Budget/Recommendation engine) both read `profiles.daily_calorie_target` and `profiles.dietary_preference` established here; Epic 3's recommendation lookup relies on `dietary_preference` never being undefined.
