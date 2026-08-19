import { describe, expect, it } from "vitest";

import { checkRateLimit } from "./rate-limit";

/**
 * Phase 10 hardening: the sliding-window limiter itself, tested in
 * isolation from any one endpoint (03-CLAUDE-RULES.md, "Rate-limit
 * authentication, key management, and MCP endpoints"). Each test uses its
 * own key — the limiter's state is module-level and shared across the
 * whole process, so a shared key would make tests order-dependent.
 */
describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = `test-${crypto.randomUUID()}`;
    const opts = { limit: 3, windowMs: 60_000 };

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);

    const blocked = checkRateLimit(key, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;

    expect(checkRateLimit(keyA, opts).allowed).toBe(true);
    expect(checkRateLimit(keyA, opts).allowed).toBe(false);
    // keyB has never been used — its own window starts fresh.
    expect(checkRateLimit(keyB, opts).allowed).toBe(true);
  });

  it("resets the window once it elapses", () => {
    const key = `test-${crypto.randomUUID()}`;
    const opts = { limit: 1, windowMs: 10 };

    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(false);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(checkRateLimit(key, opts).allowed).toBe(true);
        resolve();
      }, 20);
    });
  });
});
