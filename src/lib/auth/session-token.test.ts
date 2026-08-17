import { describe, expect, it } from "vitest";

import { signSessionToken, verifySessionToken } from "./session-token";

describe("session token", () => {
  it("verifies a token it signed", async () => {
    const token = await signSessionToken({ userId: "user-1", expiresAt: Date.now() + 60_000 }, "secret-a");
    const payload = await verifySessionToken(token, "secret-a");
    expect(payload).toEqual({ userId: "user-1", expiresAt: expect.any(Number) });
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSessionToken({ userId: "user-1", expiresAt: Date.now() + 60_000 }, "secret-a");
    expect(await verifySessionToken(token, "secret-b")).toBeNull();
  });

  it("rejects a tampered payload even with a valid-looking signature", async () => {
    const token = await signSessionToken({ userId: "user-1", expiresAt: Date.now() + 60_000 }, "secret-a");
    const [, signature] = token.split(".");
    const forged = `${btoa(JSON.stringify({ userId: "user-2", expiresAt: Date.now() + 60_000 }))}.${signature}`;
    expect(await verifySessionToken(forged, "secret-a")).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signSessionToken({ userId: "user-1", expiresAt: Date.now() - 1 }, "secret-a");
    expect(await verifySessionToken(token, "secret-a")).toBeNull();
  });

  it("rejects a malformed token instead of throwing", async () => {
    expect(await verifySessionToken("not-a-token", "secret-a")).toBeNull();
  });
});
