"use server";

import { redirect } from "next/navigation";

import {
  acceptInviteSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/schemas";
import {
  fieldErrorsFromZod,
  formErrorState,
  successState,
  type ActionState,
} from "@/lib/forms/action-state";
import { serverEnv } from "@/lib/env/server";
import * as authService from "@/server/services/auth-service";

/**
 * Every action below follows the same shape: parse `FormData` with the
 * schema shared with the client, return field/form errors on failure, or
 * redirect on success. Next.js Server Actions verify the request `Origin`
 * against the deployment host automatically, which is this architecture's
 * CSRF protection (03-CLAUDE-RULES.md, "Apply CSRF protections appropriate
 * to the auth architecture") — no separate token is needed here.
 */

const isDev = serverEnv.NODE_ENV !== "production";

export type SignInValues = { email: string; password: string };

export async function signInAction(
  _prevState: ActionState<SignInValues>,
  formData: FormData,
): Promise<ActionState<SignInValues>> {
  const values: SignInValues = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await authService.signIn(parsed.data);
  if (!result.ok) return formErrorState(result.formError, values);

  const redirectTo = String(formData.get("redirectTo") ?? "") || "/projects";
  redirect(redirectTo);
}

export type SignUpValues = { name: string; email: string; password: string };

export async function signUpAction(
  _prevState: ActionState<SignUpValues>,
  formData: FormData,
): Promise<ActionState<SignUpValues>> {
  const values: SignUpValues = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await authService.signUp(parsed.data);
  if (!result.ok) return formErrorState(result.formError, values);

  const params = new URLSearchParams();
  if (isDev) params.set("devToken", result.data.verificationToken.token);
  redirect(`/verify-email?${params.toString()}`);
}

export type ForgotPasswordValues = { email: string };

export async function forgotPasswordAction(
  _prevState: ActionState<ForgotPasswordValues>,
  formData: FormData,
): Promise<ActionState<ForgotPasswordValues>> {
  const values: ForgotPasswordValues = { email: String(formData.get("email") ?? "") };

  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await authService.requestPasswordReset(parsed.data.email);
  if (!result.ok) return formErrorState(result.formError, values);

  const meta =
    isDev && result.data.resetToken ? { devToken: result.data.resetToken.token } : undefined;
  return successState(values, meta);
}

export type ResetPasswordValues = { password: string; confirmPassword: string };

export async function resetPasswordAction(
  token: string,
  _prevState: ActionState<ResetPasswordValues>,
  formData: FormData,
): Promise<ActionState<ResetPasswordValues>> {
  const values: ResetPasswordValues = {
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = resetPasswordSchema.safeParse({ token, ...values });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await authService.resetPassword({ token, password: parsed.data.password });
  if (!result.ok) return formErrorState(result.formError, values);

  redirect("/projects");
}

export type AcceptInviteValues = { name: string; password: string; confirmPassword: string };

export async function acceptInviteAction(
  token: string,
  _prevState: ActionState<AcceptInviteValues>,
  formData: FormData,
): Promise<ActionState<AcceptInviteValues>> {
  const values: AcceptInviteValues = {
    name: String(formData.get("name") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };

  const parsed = acceptInviteSchema.safeParse({ token, ...values });
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  const result = await authService.acceptInvite({
    token,
    name: parsed.data.name,
    password: parsed.data.password,
  });
  if (!result.ok) return formErrorState(result.formError, values);

  redirect("/projects");
}

export async function resendVerificationAction(): Promise<
  { ok: true; devToken?: string } | { ok: false; formError: string }
> {
  const user = await authService.getCurrentUser();
  if (!user) return { ok: false, formError: "Sign in again to resend a verification email." };

  const result = await authService.resendVerificationEmail(user.id);
  if (!result.ok) return { ok: false, formError: result.formError };

  return { ok: true, devToken: isDev ? result.data.verificationToken.token : undefined };
}

export async function signOutAction(): Promise<void> {
  await authService.signOut();
  redirect("/sign-in");
}
