"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/forms/action-state";
import { resetPasswordAction, type ResetPasswordValues } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPasswordAction.bind(null, token),
    idleState<ResetPasswordValues>(),
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <PasswordInput
        label="New password"
        name="password"
        autoComplete="new-password"
        required
        description="At least 8 characters, with a letter and a number."
        defaultValue={state.values?.password}
        error={state.fieldErrors?.password}
      />

      <PasswordInput
        label="Confirm new password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        defaultValue={state.values?.confirmPassword}
        error={state.fieldErrors?.confirmPassword}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Reset password
      </Button>
    </form>
  );
}
