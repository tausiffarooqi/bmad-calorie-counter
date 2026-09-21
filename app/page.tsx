import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

// Temporary foundation showcase for Epic 0 (UX Foundation). Exercises the
// Muted Earth Editorial tokens (Story 0.1) and the global focus-visible
// ring (Story 0.2) so both can be visually verified before any real screen
// is built. Replaced by the actual Daily view in Epic 3.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <Button asChild variant="ghost" size="icon" className="self-end">
        <a href="/preferences" aria-label="Open account settings" title="Open account settings">
          <Settings />
        </a>
      </Button>
      <p className="text-label uppercase text-muted-foreground">Design token foundation</p>
      <p className="font-sans text-display-number text-primary">1,240</p>
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-4">
        <p className="text-sm text-foreground">Breakfast &middot; Oatmeal &amp; berries</p>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-accent bg-card p-4">
        <p className="font-[family-name:var(--font-recommendation)] text-recommendation italic text-foreground">
          &ldquo;Try a grilled paneer wrap with saut&eacute;ed greens.&rdquo;
        </p>
      </div>
      <div className="flex gap-3">
        <Button>Add Photo</Button>
        <Button variant="outline">Add Text</Button>
      </div>
      {/* Plain, non-shadcn interactive element — proves the global
          :focus-visible rule (Story 0.2) applies beyond Button. */}
      <a href="#" className="text-sm text-primary underline-offset-4 hover:underline">
        Log in
      </a>
    </div>
  );
}
