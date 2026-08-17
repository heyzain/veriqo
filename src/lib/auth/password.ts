import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing using Node's built-in `scrypt` — no extra dependency for
 * something as security-sensitive as credential storage (03-CLAUDE-RULES.md,
 * "Hash credentials/tokens at rest"). Format: `salt:hash`, both hex.
 */
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
