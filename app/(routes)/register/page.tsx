"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Standard adult daily intake default (PRD FR-13 [ASSUMPTION]) — the user
// can accept or change it before submitting.
const DEFAULT_DAILY_CALORIE_TARGET = 2000;
// Matches supabase/config.toml's auth.minimum_password_length.
const MIN_PASSWORD_LENGTH = 6;

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  dailyCalorieTarget?: string;
  form?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(
    String(DEFAULT_DAILY_CALORIE_TARGET)
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const target = Number(dailyCalorieTarget);
    if (!Number.isInteger(target) || target <= 0) {
      setErrors({ dailyCalorieTarget: "Enter a whole number greater than 0." });
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrors({
        password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords don't match." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, dailyCalorieTarget: target }),
      });
      const result = await response.json();

      if (!response.ok) {
        const code = result?.error?.code;
        const message = result?.error?.message ?? "Something went wrong.";
        if (code === "email_taken") {
          setErrors({ email: message });
        } else if (code === "invalid_target") {
          setErrors({ dailyCalorieTarget: message });
        } else {
          setErrors({ form: message });
        }
        return;
      }

      // The API route created the Supabase Auth session cookie via the
      // server client; the browser client just needs a session refresh
      // so client-side reads see the logged-in state.
      const supabase = createClient();
      await supabase.auth.getSession();

      router.push("/");
    } catch {
      setErrors({ form: "Couldn't reach the server — check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-8 text-foreground">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6"
        noValidate
      >
        <h1 className="text-lg font-semibold">Create your account</h1>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-primary">
              {errors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-sm text-primary">
              {errors.password}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" role="alert" className="text-sm text-primary">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dailyCalorieTarget">Daily Calorie Target</Label>
          <Input
            id="dailyCalorieTarget"
            type="number"
            min={1}
            step={1}
            required
            value={dailyCalorieTarget}
            onChange={(e) => setDailyCalorieTarget(e.target.value)}
            aria-invalid={!!errors.dailyCalorieTarget}
            aria-describedby={errors.dailyCalorieTarget ? "target-error" : undefined}
          />
          {errors.dailyCalorieTarget && (
            <p id="target-error" role="alert" className="text-sm text-primary">
              {errors.dailyCalorieTarget}
            </p>
          )}
        </div>

        {errors.form && (
          <p role="alert" className="text-sm text-primary">
            {errors.form}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <a href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Already have an account? Log in
        </a>
      </form>
    </div>
  );
}
