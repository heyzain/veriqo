import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDb } from "@/test/db";
import { __resetCookieJarForTests } from "@/test/mocks/next-headers";

import {
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from "./auth-service";

beforeEach(async () => {
  await resetTestDb();
  __resetCookieJarForTests();
});

describe("auth-service — sign up", () => {
  it("rejects a duplicate email", async () => {
    const first = await signUp({ name: "First", email: "dup@example.com", password: "Password123" });
    expect(first.ok).toBe(true);

    const second = await signUp({ name: "Second", email: "dup@example.com", password: "Password123" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.formError).toMatch(/already exists/i);
  });

  it("creates an unverified account and signs the user in", async () => {
    const result = await signUp({ name: "New User", email: "new@example.com", password: "Password123" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.user.emailVerified).toBe(false);
    const current = await getCurrentUser();
    expect(current?.email).toBe("new@example.com");
  });
});

describe("auth-service — sign in", () => {
  it("rejects an unknown email and a wrong password with the same message", async () => {
    await signUp({ name: "Known", email: "known@example.com", password: "Password123" });
    await signOut();

    const unknownEmail = await signIn({ email: "unknown@example.com", password: "Password123" });
    const wrongPassword = await signIn({ email: "known@example.com", password: "WrongPassword1" });

    expect(unknownEmail.ok).toBe(false);
    expect(wrongPassword.ok).toBe(false);
    if (!unknownEmail.ok && !wrongPassword.ok) {
      expect(unknownEmail.formError).toBe(wrongPassword.formError);
    }
  });

  it("signs in with the correct credentials", async () => {
    await signUp({ name: "Known", email: "known2@example.com", password: "Password123" });
    await signOut();

    const result = await signIn({ email: "known2@example.com", password: "Password123" });
    expect(result.ok).toBe(true);
    expect((await getCurrentUser())?.email).toBe("known2@example.com");
  });
});

describe("auth-service — password reset", () => {
  it("never reveals whether an email is registered", async () => {
    await signUp({ name: "Registered", email: "registered@example.com", password: "Password123" });

    const registered = await requestPasswordReset("registered@example.com");
    const unregistered = await requestPasswordReset("nobody@example.com");

    expect(registered.ok).toBe(true);
    expect(unregistered.ok).toBe(true);
    if (registered.ok) expect(registered.data.resetToken).not.toBeNull();
    if (unregistered.ok) expect(unregistered.data.resetToken).toBeNull();
  });

  it("a reset token can only be used once", async () => {
    await signUp({ name: "Resetter", email: "resetter@example.com", password: "Password123" });
    const requested = await requestPasswordReset("resetter@example.com");
    if (!requested.ok || !requested.data.resetToken) throw new Error("expected a reset token");

    const token = requested.data.resetToken.token;
    const first = await resetPassword({ token, password: "NewPassword123" });
    expect(first.ok).toBe(true);

    const replay = await resetPassword({ token, password: "AnotherPassword1" });
    expect(replay.ok).toBe(false);
  });

  it("signing in with the old password fails after a reset", async () => {
    await signUp({ name: "Resetter", email: "resetter2@example.com", password: "Password123" });
    const requested = await requestPasswordReset("resetter2@example.com");
    if (!requested.ok || !requested.data.resetToken) throw new Error("expected a reset token");

    await resetPassword({ token: requested.data.resetToken.token, password: "NewPassword123" });
    await signOut();

    const oldPassword = await signIn({ email: "resetter2@example.com", password: "Password123" });
    const newPassword = await signIn({ email: "resetter2@example.com", password: "NewPassword123" });

    expect(oldPassword.ok).toBe(false);
    expect(newPassword.ok).toBe(true);
  });
});
