import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DevLinkPreview } from "@/features/auth/components/dev-link-preview";
import { ResendVerificationButton } from "@/features/auth/components/resend-verification-button";
import { verifyEmail } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; devToken?: string }>;
}) {
  const { token, devToken } = await searchParams;

  if (token) {
    const result = verifyEmail(token);

    if (result.ok) {
      return (
        <div className="flex flex-col gap-6">
          <div className="flex size-11 items-center justify-center rounded-pill bg-pass/10 text-pass">
            <Icon name="check" size={20} />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-title-lg text-foreground">Email verified</h1>
            <p className="text-body text-foreground-secondary">
              {result.data.user.email} is confirmed. You&apos;re all set.
            </p>
          </div>
          <Button asChild size="lg" className="self-start">
            <Link href="/projects">Continue to your projects</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="flex size-11 items-center justify-center rounded-pill bg-fail/10 text-fail">
          <Icon name="alert" size={20} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title-lg text-foreground">This verification link is invalid or expired</h1>
          <p className="text-body text-foreground-secondary">{result.formError}</p>
        </div>
        <ResendVerificationButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex size-11 items-center justify-center rounded-pill bg-inset text-foreground-muted">
        <Icon name="info" size={20} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-title-lg text-foreground">Check your email</h1>
        <p className="text-body text-foreground-secondary">
          We sent a verification link. Verifying isn&apos;t required to continue, but confirms
          it&apos;s really you.
        </p>
      </div>
      {devToken ? (
        <DevLinkPreview label="Open verify-email link" href={`/verify-email?token=${devToken}`} />
      ) : null}
      <ResendVerificationButton />
      <Link href="/projects" className="text-center text-body-sm text-action underline">
        Skip for now
      </Link>
    </div>
  );
}
