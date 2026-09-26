"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface BreakfastOfferCardProps {
  // Persists the acceptance server-side (`POST /api/breakfast-offer`), then
  // bumps the same refreshKey the logging dialogs already use to force a
  // fresh GET (Code Map: "no separate response-shape invention") — the
  // caller passes a function that does both, this component just awaits it.
  onAccept: () => Promise<void>;
  // Purely local — no network call (Boundaries & Constraints: "Do not
  // persist a decline"). May reappear on a same-day reload before 10am, an
  // accepted, documented tradeoff (Intent).
  onDecline: () => void;
}

// Same Prompt-card visual treatment as FirstLoginPrompt (card background,
// border outline, `md` radius) — resolves independently of that card
// (Boundaries & Constraints: "the two cards ... resolve independently").
// Both buttons use `btn-secondary` styling (mockup), unlike card 1's
// primary/secondary pairing (Code Map) — neither action is more "default"
// than the other here.
export function BreakfastOfferCard({ onAccept, onDecline }: BreakfastOfferCardProps) {
  // Mirrors log-entry-dialog.tsx's `submitting` pattern — without this, a
  // double-click on "Yes, suggest one" fires two concurrent POSTs with no
  // feedback in between. Both buttons are disabled while the accept request
  // is in flight (declining, too, is blocked mid-accept — the two are
  // mutually exclusive outcomes for the same card instance), and the accept
  // button shows a brief pending label.
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    if (accepting) return;
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-md border border-border bg-card p-4">
      <p className="text-sm text-foreground">Want a breakfast recommendation too?</p>
      <div className="mt-3 flex gap-3">
        <Button onClick={handleAccept} disabled={accepting} variant="outline" className="flex-1">
          {accepting ? "Adding…" : "Yes, suggest one"}
        </Button>
        <Button onClick={onDecline} disabled={accepting} variant="outline" className="flex-1">
          Skip
        </Button>
      </div>
    </div>
  );
}
