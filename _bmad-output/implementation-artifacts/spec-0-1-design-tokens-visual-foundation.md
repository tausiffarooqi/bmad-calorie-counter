---
title: 'Design Tokens & Visual Foundation'
type: 'feature'
created: '2026-09-19'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No project exists yet, and there is no shared visual foundation (color tokens, typography, radius scale, shadow-free elevation) for later screens to build on — without it, each screen would invent its own styling, guaranteeing visual inconsistency across the app.

**Approach:** Scaffold a Next.js 16.3.5 (App Router) project on Node.js 24 / TypeScript 6.0.3 / Tailwind CSS 4.3.3, initialize shadcn/ui as the component foundation, and configure the Muted Earth Editorial design tokens — 12 shadcn color-token overrides, Inter + italic-Lora typography roles, the sm/md/lg/full radius scale, and the no-drop-shadow elevation rule — as global theme values every later screen inherits automatically rather than hardcoding its own.

**Decision (resolved 2026-09-19):** TypeScript downgraded from Architecture's original 7.0.2 pin to 6.0.3, because `typescript-eslint` doesn't support TS7 yet (upstream fix expected in typescript-eslint's TS 7.1+ support, not yet released) and lint must work for every story going forward. `next.config.ts`'s `experimental.useTypeScriptCli` flag is removed — it was only needed for TS7. `ARCHITECTURE-SPINE.md` is being updated to match. Revisit upgrading back to TS7 once typescript-eslint ships support.

</frozen-after-approval>

## Code Map

- `package.json` -- scaffolded by `create-next-app@16.3.5`, then pinned to exact Architecture versions (typescript 7.0.2, tailwindcss/@tailwindcss/postcss 4.3.3); shadcn init added class-variance-authority, cn, lucide-react, radix-ui, shadcn, tw-animate-css
- `next.config.ts` -- added `experimental.useTypeScriptCli: true` (required for TS7 + Next 16, per Architecture's documented setup gotcha)
- `app/layout.tsx` -- swapped the scaffold's default Geist fonts for Inter (`--font-sans`) and italic Lora (`--font-recommendation`) via `next/font/google`
- `app/globals.css` -- shadcn Nova preset's default oklch neutrals overridden with the Muted Earth Editorial hex tokens (background/foreground/card/card-foreground/muted-foreground/border/input/ring/primary/primary-foreground/accent/accent-foreground); `--radius-sm/md/lg` changed from the preset's proportional `calc(var(--radius) * n)` formula to literal 8px/10px/12px since DESIGN.md's scale isn't a clean multiplier; popover/secondary/destructive left at preset defaults (per DESIGN.md, destructive is deliberately unused)
- `components/ui/button.tsx` -- shadcn-generated Button; fixed two mismatches against DESIGN.md's Button component spec: base radius was hardcoded `rounded-lg` (now `rounded-sm`, since DESIGN.md reserves `lg` for the Recommendation card only), and the `outline` variant used `bg-background` (now `bg-card`, matching DESIGN.md's Button (secondary) fill)
- `components.json`, `lib/utils.ts` -- shadcn init output, untouched
- `app/page.tsx` -- replaced the create-next-app marketing boilerplate with a minimal token-showcase page (budget number, entry row, recommendation card, both buttons) to visually verify the foundation; this is temporary and gets replaced by the real Daily view in Epic 3

## Implementation Notes

- Build (`npm run build`) succeeds cleanly: TypeScript 7.0.2 resolves and runs via `experimental.useTypeScriptCli` (Next.js 16.3.5 + Turbopack), Tailwind CSS 4.3.3 compiles the Muted Earth Editorial tokens correctly.
- Discovered `npm run lint` hard-fails on `typescript-eslint does not support TS 7.0` while implementing — not anticipated by the original Intent/Approach, and it's a project-wide tooling gap (not scoped to this one story), so stopping here per the "stop and replan" rule rather than picking a fix unilaterally. See Open Questions.
