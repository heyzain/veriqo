import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AcceptInviteForm } from "@/features/auth/components/accept-invite-form";
import { getInvite } from "@/server/services/auth-service";

export const metadata: Metadata = { title: "Accept invite" };

export default async function InviteAcceptancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = getInvite(token);

  if (!invite) {
    return (
      <InviteNotice
        icon="alert"
        tone="fail"
        title="This invite doesn't exist"
        description="Check the link, or ask whoever invited you to send a new one."
      />
    );
  }

  if (invite.status === "expired") {
    return (
      <InviteNotice
        icon="alert"
        tone="fail"
        title="This invite has expired"
        description={`Ask ${invite.inviterName} to send a new invite to ${invite.projectName}.`}
      />
    );
  }

  if (invite.status === "accepted") {
    return (
      <InviteNotice
        icon="check"
        tone="pass"
        title="This invite was already accepted"
        description="Sign in with the account you created."
        action={
          <Button asChild size="lg" className="self-start">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-eyebrow-style text-foreground-muted">You&apos;re invited</p>
        <h1 className="font-serif text-display-md text-foreground">
          Join {invite.projectName} on Veriqo
        </h1>
        <p className="text-body-lg text-foreground-secondary">
          {invite.inviterName} invited you as a {invite.role}. Set a password to accept.
        </p>
      </div>
      <AcceptInviteForm token={token} email={invite.email} />
    </div>
  );
}

function InviteNotice({
  icon,
  tone,
  title,
  description,
  action,
}: {
  icon: "alert" | "check";
  tone: "fail" | "pass";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className={
          tone === "fail"
            ? "flex size-11 items-center justify-center rounded-pill bg-fail/10 text-fail"
            : "flex size-11 items-center justify-center rounded-pill bg-pass/10 text-pass"
        }
      >
        <Icon name={icon} size={20} />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-title-lg text-foreground">{title}</h1>
        <p className="text-body text-foreground-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}
