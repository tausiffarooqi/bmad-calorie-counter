import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths reachable without a session. Everything else is protected by
// default — a future authenticated route needs no proxy change to be
// covered (AD-3 / Story 1.2 Boundaries & Constraints). Trailing slash
// tolerated so "/login/" doesn't fall through to "protected".
const PUBLIC_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return PUBLIC_PATHS.includes(normalized);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set — check .env.local."
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() (not getSession()) — revalidates the JWT against the Auth
  // server rather than trusting an unverified session cookie, per
  // Supabase's own guidance for server-side auth checks.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const onPublicPath = isPublicPath(request.nextUrl.pathname);

  // getUser() may have refreshed the session and staged new cookies on
  // `response` via setAll above — a redirect branch must carry those
  // cookies forward itself, since NextResponse.redirect() builds a new
  // response object that doesn't inherit them. Skipping this drops a
  // just-rotated refresh token, bouncing the user back to /login on their
  // very next request (the documented Supabase-SSR proxy footgun).
  if (!user && !onPublicPath) {
    // Epic 1 retro action item: preserve the originally-requested
    // destination across the login bounce (Story 1.2's own deferred item
    // — "zero impact today since / is the only protected route" — whose
    // stated revisit condition, "once Epic 2+ adds real protected routes,"
    // has since happened: /trends, /preferences). Only a same-origin
    // relative path is ever written here (derived from this same request's
    // own URL, never user-supplied), so there's no open-redirect risk.
    const destination = request.nextUrl.pathname + request.nextUrl.search;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = destination === "/" ? "" : `?next=${encodeURIComponent(destination)}`;
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && onPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    const redirect = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|api/auth(?:/|$)).*)",
  ],
};
