"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Only the documented anti-enumeration message is safe to show
        // verbatim — Supabase returns the same generic text for both
        // "wrong password" and "no such account" by design. Any other
        // error code (rate limiting, disabled account, etc.) could leak
        // account state, so it gets logged, not displayed, matching the
        // registration route's never-forward-raw-provider-text rule.
        if (signInError.message === "Invalid login credentials") {
          setError(signInError.message);
        } else {
          console.error("Supabase signInWithPassword failed:", signInError.message);
          setError("Something went wrong logging in — try again.");
        }
        return;
      }

      // Hard navigation, not router.push(): the browser client just set
      // the Supabase session cookie, and a soft (RSC) navigation can race
      // ahead of that cookie actually being sent with the next request —
      // a well-documented Supabase+Next.js footgun, confirmed live in this
      // story (router.push() bounced back to /login). A full reload
      // guarantees the proxy sees the new session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch {
      setError("Couldn't reach the server — check your connection and try again.");
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
        <h1 className="text-lg font-semibold">Log in</h1>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>

        {error && (
          <p id="login-error" role="alert" className="text-sm text-primary">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} aria-busy={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>

        <a href="/register" className="text-sm text-primary underline-offset-4 hover:underline">
          Don&apos;t have an account? Register
        </a>
      </form>
    </div>
  );
}
