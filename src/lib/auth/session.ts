import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/lib/env/server";
import { signSessionToken, verifySessionToken } from "@/lib/auth/session-token";

/**
 * The Node-side half of the session mechanism — cookie storage on top of
 * `session-token.ts`'s pure sign/verify. `src/proxy.ts` verifies the same
 * token format independently (it can't import `next/headers`).
 */
export const SESSION_COOKIE_NAME = "veriqo_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string): Promise<void> {
  const token = await signSessionToken(
    { userId, expiresAt: Date.now() + SESSION_TTL_MS },
    serverEnv.AUTH_SECRET,
  );
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token, serverEnv.AUTH_SECRET);
  return payload?.userId ?? null;
}
