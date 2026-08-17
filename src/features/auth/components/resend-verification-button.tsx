"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { resendVerificationAction } from "@/features/auth/actions";
import { DevLinkPreview } from "@/features/auth/components/dev-link-preview";

export function ResendVerificationButton() {
  const [isPending, startTransition] = React.useTransition();
  const [devToken, setDevToken] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        intent="secondary"
        loading={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await resendVerificationAction();
            if (!result.ok) {
              toast({ title: "Couldn't resend email", description: result.formError, variant: "fail" });
              return;
            }
            toast({ title: "Verification email sent", variant: "pass" });
            if (result.devToken) setDevToken(result.devToken);
          });
        }}
      >
        Resend verification email
      </Button>
      {devToken ? (
        <DevLinkPreview label="Open verify-email link" href={`/verify-email?token=${devToken}`} />
      ) : null}
    </div>
  );
}
