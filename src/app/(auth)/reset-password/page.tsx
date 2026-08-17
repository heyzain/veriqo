import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { peekPasswordResetToken } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validToken = token ? peekPasswordResetToken(token) : null;

  if (!token || !validToken) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex size-11 items-center justify-center rounded-pill bg-fail/10 text-fail">
          <Icon name="alert" size={20} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title-lg text-foreground">This reset link is invalid or expired</h1>
          <p className="text-body text-foreground-secondary">
            Reset links work once and expire after an hour. Request a new one to continue.
          </p>
        </div>
        <Button asChild size="lg" className="self-start">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">Account recovery</p>
        <h1 className="font-serif text-display-md text-foreground">Choose a new password</h1>
        <p className="text-body-lg text-foreground-secondary">
          You&apos;ll be signed in on this device once it&apos;s set.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
