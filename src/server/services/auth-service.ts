import "server-only";

import { randomUUID } from "node:crypto";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { createSession, destroySession, getSessionUserId } from "@/lib/auth/session";
import { findInviteByToken, saveInvite } from "@/server/repositories/invite-repository";
import { ensureSeeded } from "@/server/repositories/seed";
import {
  consumeToken,
  issueToken,
  peekToken,
} from "@/server/repositories/token-repository";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
} from "@/server/repositories/user-repository";
import type { AuthToken, PublicUser, User } from "@/types/auth";
import { toPublicUser } from "@/types/auth";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; formError: string };

function fail<T>(formError: string): ServiceResult<T> {
  return { ok: false, formError };
}

function ok<T>(data: T): ServiceResult<T> {
  return { ok: true, data };
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<ServiceResult<{ user: PublicUser; verificationToken: AuthToken }>> {
  ensureSeeded();

  if (findUserByEmail(input.email)) {
    return fail("An account with this email already exists. Try signing in instead.");
  }

  const user: User = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    passwordHash: hashPassword(input.password),
    emailVerified: false,
    createdAt: new Date().toISOString(),
  };
  createUser(user);
  await createSession(user.id);

  const verificationToken = issueToken(user.id, "email-verification");
  return ok({ user: toPublicUser(user), verificationToken });
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ServiceResult<{ user: PublicUser }>> {
  ensureSeeded();

  const rateLimitKey = `sign-in:${input.email.toLowerCase()}`;
  const rateLimit = checkRateLimit(rateLimitKey, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return fail(
      `Too many sign-in attempts. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
    );
  }

  const user = findUserByEmail(input.email);
  const passwordMatches = user ? verifyPassword(input.password, user.passwordHash) : false;

  // Deliberately identical messaging whether the email is unknown or the
  // password is wrong — avoids confirming which accounts exist.
  if (!user || !passwordMatches) {
    return fail("That email and password combination doesn't match an account.");
  }

  await createSession(user.id);
  return ok({ user: toPublicUser(user) });
}

export async function signOut(): Promise<void> {
  await destroySession();
}

export async function requestPasswordReset(
  email: string,
): Promise<ServiceResult<{ resetToken: AuthToken | null }>> {
  ensureSeeded();

  const rateLimitKey = `reset-request:${email.toLowerCase()}`;
  const rateLimit = checkRateLimit(rateLimitKey, { limit: 3, windowMs: 15 * 60 * 1000 });
  if (!rateLimit.allowed) {
    return fail(
      `Too many reset requests. Try again in ${Math.ceil(rateLimit.retryAfterSeconds / 60)} minute(s).`,
    );
  }

  const user = findUserByEmail(email);
  // Always succeed from the caller's point of view — never reveal whether
  // the email is registered.
  if (!user) return ok({ resetToken: null });

  const resetToken = issueToken(user.id, "password-reset");
  return ok({ resetToken });
}

export function peekPasswordResetToken(token: string): AuthToken | null {
  ensureSeeded();
  return peekToken(token, "password-reset");
}

export async function resetPassword(input: {
  token: string;
  password: string;
}): Promise<ServiceResult<{ user: PublicUser }>> {
  ensureSeeded();

  const token = consumeToken(input.token, "password-reset");
  if (!token) {
    return fail("This reset link is invalid or has expired. Request a new one.");
  }

  const user = findUserById(token.userId);
  if (!user) return fail("This reset link is invalid or has expired. Request a new one.");

  const updated: User = { ...user, passwordHash: hashPassword(input.password) };
  updateUser(updated);
  await createSession(updated.id);

  return ok({ user: toPublicUser(updated) });
}

export function verifyEmail(token: string): ServiceResult<{ user: PublicUser }> {
  ensureSeeded();

  const consumed = consumeToken(token, "email-verification");
  if (!consumed) {
    return fail("This verification link is invalid or has expired.");
  }

  const user = findUserById(consumed.userId);
  if (!user) return fail("This verification link is invalid or has expired.");

  const updated: User = { ...user, emailVerified: true };
  updateUser(updated);
  return ok({ user: toPublicUser(updated) });
}

export async function resendVerificationEmail(
  userId: string,
): Promise<ServiceResult<{ verificationToken: AuthToken }>> {
  ensureSeeded();

  const user = findUserById(userId);
  if (!user) return fail("Sign in again to resend a verification email.");
  if (user.emailVerified) return fail("This email is already verified.");

  return ok({ verificationToken: issueToken(user.id, "email-verification") });
}

export function getInvite(token: string) {
  ensureSeeded();
  const invite = findInviteByToken(token);
  if (!invite) return null;
  if (invite.acceptedAt) return { ...invite, status: "accepted" as const };
  if (invite.expiresAt < Date.now()) return { ...invite, status: "expired" as const };
  return { ...invite, status: "pending" as const };
}

export async function acceptInvite(input: {
  token: string;
  name: string;
  password: string;
}): Promise<ServiceResult<{ user: PublicUser }>> {
  ensureSeeded();

  const invite = findInviteByToken(input.token);
  if (!invite || invite.acceptedAt || invite.expiresAt < Date.now()) {
    return fail("This invite is invalid or has expired. Ask for a new one.");
  }

  if (findUserByEmail(invite.email)) {
    return fail("An account with this email already exists. Try signing in instead.");
  }

  const user: User = {
    id: randomUUID(),
    name: input.name.trim(),
    email: invite.email,
    passwordHash: hashPassword(input.password),
    emailVerified: true, // Accepting an emailed invite is itself a proof of email ownership.
    createdAt: new Date().toISOString(),
  };
  createUser(user);
  saveInvite({ ...invite, acceptedAt: Date.now() });
  await createSession(user.id);

  return ok({ user: toPublicUser(user) });
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  ensureSeeded();
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = findUserById(userId);
  return user ? toPublicUser(user) : null;
}
