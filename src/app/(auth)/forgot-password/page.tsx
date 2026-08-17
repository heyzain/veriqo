import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Account recovery</p>
        <h1 className="font-serif text-display-md text-foreground">Reset your password</h1>
        <p className="text-body-lg text-foreground-secondary">
          Enter the email on your account and we&apos;ll send a link to choose a new password.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
