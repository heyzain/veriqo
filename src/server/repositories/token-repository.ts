import "server-only";

import { randomBytes } from "node:crypto";

import { store } from "@/server/repositories/store";
import type { AuthToken, TokenPurpose } from "@/types/auth";

const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  "email-verification": 24 * 60 * 60 * 1000,
  "password-reset": 60 * 60 * 1000,
};

export function issueToken(userId: string, purpose: TokenPurpose): AuthToken {
  const token: AuthToken = {
    token: randomBytes(24).toString("base64url"),
    purpose,
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS[purpose],
  };
  store.tokens.set(token.token, token);
  return token;
}

/** Returns the token if it exists, matches `purpose`, is unused, and unexpired — without consuming it. */
export function peekToken(tokenValue: string, purpose: TokenPurpose): AuthToken | null {
  const token = store.tokens.get(tokenValue);
  if (!token || token.purpose !== purpose) return null;
  if (token.usedAt || token.expiresAt < Date.now()) return null;
  return token;
}

/** Marks a token used so it cannot be replayed. Returns false if it was already invalid. */
export function consumeToken(tokenValue: string, purpose: TokenPurpose): AuthToken | null {
  const token = peekToken(tokenValue, purpose);
  if (!token) return null;
  token.usedAt = Date.now();
  return token;
}
