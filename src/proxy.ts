import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_SECRET_DEV_FALLBACK } from "@/lib/env/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/session-token";

/**
 * Route protection (03-CLAUDE-RULES.md, "Authentication and security").
 * Runs on the Edge runtime by default, so it verifies the session token
 * directly via `session-token.ts` rather than the Node-only `session.ts`
 * cookie helpers, and reads `AUTH_SECRET` from `process.env` instead of the
 * `server-only`-guarded validated env module.
 */
const AUTH_ROUTES = ["/sign-in", "/sign-up"];
const PROTECTED_PREFIXES = ["/projects"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = process.env.AUTH_SECRET || AUTH_SECRET_DEV_FALLBACK;
  const session = token ? await verifySessionToken(token, secret) : null;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !session) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  if (AUTH_ROUTES.includes(pathname) && session) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/projects/:path*", "/sign-in", "/sign-up"],
};
