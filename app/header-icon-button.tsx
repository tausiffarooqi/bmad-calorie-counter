import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

// Story 1.5 review finding: the Daily view header had two near-identical
// Button/aria-label/title blocks (Trends, Settings) before this story added
// a third (Logout) — each hand-repeated the icon/aria-label/title triple,
// with nothing structural stopping a future edit from letting one drift out
// of sync (e.g. forgetting `title`, or mismatching it against `aria-label`).
// One shared component for all three, matching this app's established
// "one shared component, not separately-maintained copies" precedent
// (back-to-daily-view-link.tsx). Supports both a link (`href`, `asChild`)
// and an action (`onClick`) since the three existing controls need both
// shapes — Trends/Settings navigate, Logout performs a side effect.
interface HeaderIconButtonProps {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export function HeaderIconButton({ icon, label, href, onClick }: HeaderIconButtonProps) {
  if (href) {
    return (
      <Button asChild variant="ghost" size="icon">
        <a href={href} aria-label={label} title={label}>
          {icon}
        </a>
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" onClick={onClick} aria-label={label} title={label}>
      {icon}
    </Button>
  );
}
