"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MAX_DAILY_CALORIE_TARGET, type DietaryPreference } from "@/lib/constants";

type PatchResult = { ok: true } | { ok: false; message: string };

// proxy.ts protects /api/preferences like every other route — if the
// session expires while this page is open, fetch() transparently follows
// the resulting redirect to /login and resolves with its HTML, status 200.
// response.ok would be true but response.json() would throw on that HTML
// body. Detecting `response.redirected` here (before ever parsing the
// body) lets a stale session bounce the user to /login with a real reload
// instead of surfacing a misleading "couldn't reach the server" error.
async function patchPreferences(body: Record<string, unknown>): Promise<PatchResult> {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.redirected) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
    // Navigation is async; keep the caller's UI in a submitting state
    // until the reload actually happens rather than flashing an error.
    return new Promise(() => {});
  }

  const result = await response.json();
  if (!response.ok) {
    return { ok: false, message: result?.error?.message ?? "Something went wrong." };
  }
  return { ok: true };
}

type Props = {
  initialDailyCalorieTarget: number;
  initialDietaryPreference: string;
};

export function PreferencesForm({
  initialDailyCalorieTarget,
  initialDietaryPreference,
}: Props) {
  return (
    <div className="flex flex-col gap-6">
      <DailyCalorieTargetField initialValue={initialDailyCalorieTarget} />
      <DietaryPreferenceField
        // The DB default (Story 1.1) is 'non_vegetarian' — any unexpected
        // value falls back to it rather than rendering neither option
        // selected.
        initialValue={initialDietaryPreference === "vegetarian" ? "vegetarian" : "non_vegetarian"}
      />
    </div>
  );
}

function DailyCalorieTargetField({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(String(initialValue));
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(undefined);
    setSaved(false);

    const target = Number(value);
    if (!Number.isInteger(target) || target <= 0) {
      setError("Enter a whole number greater than 0.");
      return;
    }
    if (target > MAX_DAILY_CALORIE_TARGET) {
      setError(
        `Daily Calorie Target must be ${MAX_DAILY_CALORIE_TARGET.toLocaleString()} or less.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await patchPreferences({ dailyCalorieTarget: target });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(true);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5" noValidate>
      <Label htmlFor="dailyCalorieTarget">Daily Calorie Target</Label>
      <div className="flex items-center gap-2">
        <Input
          id="dailyCalorieTarget"
          type="number"
          min={1}
          step={1}
          required
          disabled={submitting}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "target-error" : saved ? "target-saved" : undefined}
        />
        <Button type="submit" variant="outline" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <p id="target-error" role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
      {saved && !error && (
        <p id="target-saved" role="status" className="text-sm text-foreground">
          Saved.
        </p>
      )}
    </form>
  );
}

function DietaryPreferenceField({ initialValue }: { initialValue: DietaryPreference }) {
  const [value, setValue] = useState<DietaryPreference>(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (submitting) return;
    setError(undefined);
    setSaved(false);
    setSubmitting(true);
    try {
      const result = await patchPreferences({ dietaryPreference: value });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(true);
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label id="dietaryPreference-label">Dietary Preference</Label>
      <RadioGroup
        aria-labelledby="dietaryPreference-label"
        aria-describedby={error ? "preference-error" : saved ? "preference-saved" : undefined}
        value={value}
        disabled={submitting}
        onValueChange={(next) => {
          setValue(next as DietaryPreference);
          setSaved(false);
        }}
        className="flex flex-row gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="vegetarian" id="pref-vegetarian" />
          <Label htmlFor="pref-vegetarian" className="font-normal">
            Vegetarian
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="non_vegetarian" id="pref-non-vegetarian" />
          <Label htmlFor="pref-non-vegetarian" className="font-normal">
            Non-vegetarian
          </Label>
        </div>
      </RadioGroup>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={submitting}
        onClick={handleSave}
      >
        {submitting ? "Saving…" : "Save"}
      </Button>
      {error && (
        <p id="preference-error" role="alert" className="text-sm text-primary">
          {error}
        </p>
      )}
      {saved && !error && (
        <p id="preference-saved" role="status" className="text-sm text-foreground">
          Saved.
        </p>
      )}
    </div>
  );
}
