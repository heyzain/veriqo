import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", () => {
    const hash = hashPassword("Password123");
    expect(verifyPassword("Password123", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashPassword("Password123");
    expect(verifyPassword("WrongPassword1", hash)).toBe(false);
  });

  it("salts each hash differently, even for the same password", () => {
    const first = hashPassword("Password123");
    const second = hashPassword("Password123");
    expect(first).not.toBe(second);
    expect(verifyPassword("Password123", first)).toBe(true);
    expect(verifyPassword("Password123", second)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("Password123", "not-a-valid-hash")).toBe(false);
  });
});
