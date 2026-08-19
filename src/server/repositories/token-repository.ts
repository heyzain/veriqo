import "server-only";

import { randomBytes } from "node:crypto";

import { dbConnect } from "@/server/db/connection";
import { TokenModel, toAuthToken } from "@/server/db/models/token.model";
import type { AuthToken, TokenPurpose } from "@/types/auth";

const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  "email-verification": 24 * 60 * 60 * 1000,
  "password-reset": 60 * 60 * 1000,
};

export async function issueToken(userId: string, purpose: TokenPurpose): Promise<AuthToken> {
  await dbConnect();
  const token: AuthToken = {
    token: randomBytes(24).toString("base64url"),
    purpose,
    userId,
    expiresAt: Date.now() + TOKEN_TTL_MS[purpose],
  };
  await TokenModel.create(token);
  return token;
}

/** Returns the token if it exists, matches `purpose`, is unused, and unexpired — without consuming it. */
export async function peekToken(tokenValue: string, purpose: TokenPurpose): Promise<AuthToken | null> {
  await dbConnect();
  const doc = await TokenModel.findOne({ token: tokenValue }).lean();
  if (!doc || doc.purpose !== purpose) return null;
  const token = toAuthToken(doc);
  if (token.usedAt || token.expiresAt < Date.now()) return null;
  return token;
}

/** Marks a token used so it cannot be replayed. Returns false if it was already invalid. */
export async function consumeToken(tokenValue: string, purpose: TokenPurpose): Promise<AuthToken | null> {
  const token = await peekToken(tokenValue, purpose);
  if (!token) return null;
  await dbConnect();
  const usedAt = Date.now();
  await TokenModel.updateOne({ token: tokenValue }, { $set: { usedAt } });
  return { ...token, usedAt };
}

/** Part of `account-service.deleteAccount` — invalidates any outstanding verification/reset links. */
export async function deleteTokensForUser(userId: string): Promise<void> {
  await dbConnect();
  await TokenModel.deleteMany({ userId });
}
