"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms/action-state";
import { acceptInviteAction, type AcceptInviteValues } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, isPending] = useActionState(
    acceptInviteAction.bind(null, token),
    idleState<AcceptInviteValues>(),
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <Input label="Email" value={email} disabled readOnly />

      <Input
        label="Your name"
        name="name"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />

      <PasswordInput
        label="Create a password"
        name="password"
        autoComplete="new-password"
        required
        description="At least 8 characters, with a letter and a number."
        defaultValue={state.values?.password}
        error={state.fieldErrors?.password}
      />

      <PasswordInput
        label="Confirm password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        defaultValue={state.values?.confirmPassword}
        error={state.fieldErrors?.confirmPassword}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Accept invite
      </Button>
    </form>
  );
}
