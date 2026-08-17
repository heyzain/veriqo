/**
 * Auth/workspace-entry types (Phase 1). Kept separate from `domain.ts`,
 * which is reserved for the QA lifecycle chain
 * (`Project → Feature → Test case → …`).
 */

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export type TokenPurpose = "email-verification" | "password-reset";

export type AuthToken = {
  token: string;
  purpose: TokenPurpose;
  userId: string;
  expiresAt: number;
  usedAt?: number;
};

export type Invite = {
  token: string;
  email: string;
  inviterName: string;
  projectName: string;
  role: string;
  expiresAt: number;
  acceptedAt?: number;
};
