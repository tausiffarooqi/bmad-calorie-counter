# Version-Verification Review — Calorie Tracker MVP Architecture Spine

Reviewed: `ARCHITECTURE-SPINE.md` against `.memlog.md`, 2026-09-16.

## Verdict

Mostly solid — 5 of 8 stack entries carry an explicit web-verified version/date in the memlog. Three gaps: two unpinned "latest at scaffold" entries that were never actually checked, and one very-recent model pin whose fit wasn't stress-tested beyond "it shipped."

## Findings

### 1. Drizzle ORM — no version ever verified (only a recommendation was)
The memlog entry (line 13) verifies *that Drizzle is the more common 2026 recommendation* vs. Prisma, but never looks up an actual current Drizzle version number. The spine (line 91) then writes "latest (pin at scaffold)" — which reads as a deliberate seed decision, but is actually just an unverified gap. Every other stack row that says a real version (Next.js, Node, TypeScript, Tailwind, Gemini) was confirmed by a web search; Drizzle wasn't. Cheap to close: one search for "Drizzle ORM latest version 2026" before this spine is treated as final.

### 2. Self-hosted Supabase — version claim is asserted, not checked
Spine line 92: "matching the version already running on the Hostinger VPS" implies someone looked at what's running there — nobody did. The memlog only confirms the *local Supabase CLI workflow* (line 17), never the actual Supabase version on the VPS, nor a current self-hosted Supabase release number. Given AD-3 makes Supabase the sole data+auth backend and the whole dev/prod parity argument (Option B, chosen by the user) rests on both environments running compatible versions, this is more than cosmetic — a version mismatch between local `supabase start` and the Hostinger install could break migrations or auth session compatibility. Should be closed by literally asking the user to check the VPS's Supabase version (`supabase --version` / their docker-compose image tags) before scaffolding.

### 3. TypeScript 7.0.2 — freshness confirmed, fit not
TypeScript 7 is the Go-native rewrite (typescript-go), a materially different toolchain from TS 5/6, not just a version bump. The memlog verified it's the current stable release (line 23) but never checked whether it's fully compatible with Next.js 16.3.5's build pipeline, Drizzle's type inference/codegen, or the broader plugin ecosystem (ESLint TS plugins, etc.) at this early stage of the TS7 rollout. Worth a fit check, not just a freshness check, before binding it as the pinned language version.

### 4. `gemini-3.8-flash` — 2 weeks old at authoring time, cost figures not reverified against it
The model shipped 2026-09-02, only ~2 weeks before this spine (2026-09-16). The memlog correctly notes it supersedes the addendum's older "Gemini Flash" reference (line 23), but the addendum's actual cost numbers (~$0.04–0.15/image) and the SM-1 <5s latency assumption were never re-verified specifically against `gemini-3.8-flash`'s current pricing/latency/quota — they're carried over from research on the prior model. Low risk (same product line, same vendor), but worth a fast pricing-page check before the cost-conscious framing is treated as still accurate.

## Not flagged (verified cleanly)

Next.js 16.3.5, Node.js 24, Tailwind CSS 4.3.3 all have an explicit web-verified memlog entry with a date, matching what's in the spine.
