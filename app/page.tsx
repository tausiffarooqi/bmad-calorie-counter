import { Button } from "@/components/ui/button";

// Temporary foundation showcase for Story 0.1 (Design Tokens & Visual
// Foundation). Exercises the Muted Earth Editorial tokens end to end so the
// theme can be visually verified before any real screen is built. Replaced
// by the actual Daily view in Epic 3.
export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <p className="text-sm text-muted-foreground">Design token foundation</p>
      <p className="font-sans text-[52px] font-bold leading-none text-primary">
        1,240
      </p>
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-4">
        <p className="text-sm text-foreground">Breakfast &middot; Oatmeal &amp; berries</p>
      </div>
      <div className="w-full max-w-sm rounded-lg border border-accent bg-card p-4">
        <p className="font-[family-name:var(--font-recommendation)] text-[17px] italic text-foreground">
          &ldquo;Try a grilled paneer wrap with saut&eacute;ed greens.&rdquo;
        </p>
      </div>
      <div className="flex gap-3">
        <Button>Add Photo</Button>
        <Button variant="outline">Add Text</Button>
      </div>
    </div>
  );
}
