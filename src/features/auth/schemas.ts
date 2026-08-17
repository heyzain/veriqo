import { z } from "zod";

/**
 * Shared client/server validation (03-CLAUDE-RULES.md, "Forms" — "Shared Zod
 * schema where client/server validation align"). Server actions in
 * `actions.ts` are the authority; the same schemas back client-side field
 * hints via `Input`'s `error` prop once a server action responds.
 */
const emailField = z.email("Enter a valid email address.");

const passwordField = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your name."),
  email: emailField,
  password: passwordField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    name: z.string().trim().min(1, "Enter your name."),
    password: passwordField,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
