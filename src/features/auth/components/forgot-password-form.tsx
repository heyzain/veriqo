"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms/action-state";
import { forgotPasswordAction, type ForgotPasswordValues } from "@/features/auth/actions";
import { DevLinkPreview } from "@/features/auth/components/dev-link-preview";

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(
    forgotPasswordAction,
    idleState<ForgotPasswordValues>(),
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-md border border-subtle bg-inset px-4 py-3.5">
          <Icon name="check" size={18} className="mt-0.5 shrink-0 text-pass" />
          <p className="text-body text-foreground">
            If an account exists for <span className="font-medium">{state.values?.email}</span>,
            a reset link is on its way.
          </p>
        </div>
        {state.meta?.devToken ? (
          <DevLinkPreview
            label="Open reset-password link"
            href={`/reset-password?token=${state.meta.devToken}`}
          />
        ) : null}
        <Link href="/sign-in" className="text-center text-body-sm text-action underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        description="We'll send a link to reset your password."
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Send reset link
      </Button>

      <Link href="/sign-in" className="text-center text-body-sm text-action underline">
        Back to sign in
      </Link>
    </form>
  );
}
