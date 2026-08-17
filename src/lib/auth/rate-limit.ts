import "server-only";

/**
 * In-memory sliding-window rate limiter for sign-in and password-reset
 * requests (03-CLAUDE-RULES.md, "Rate-limit authentication, key management,
 * and MCP endpoints"). Per-process only — acceptable for Phase 1's
 * single-instance in-memory backend; swap for a durable/shared store
 * (e.g. Redis) during Phase 10 production hardening.
 */
type Attempt = { count: number; windowStart: number };

const attempts = new Map<string, Attempt>();

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    attempts.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
