"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms/action-state";
import { signUpAction, type SignUpValues } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";

export function SignUpForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    idleState<SignUpValues>(),
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {state.formError ? (
        <p role="alert" className="rounded-sm border border-fail/30 bg-fail/10 px-3.5 py-2.5 text-body-sm text-fail">
          {state.formError}
        </p>
      ) : null}

      <Input
        label="Name"
        name="name"
        autoComplete="name"
        required
        defaultValue={state.values?.name}
        error={state.fieldErrors?.name}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />

      <PasswordInput
        label="Password"
        name="password"
        autoComplete="new-password"
        required
        description="At least 8 characters, with a letter and a number."
        defaultValue={state.values?.password}
        error={state.fieldErrors?.password}
      />

      <Button type="submit" size="lg" loading={isPending}>
        Create account
      </Button>

      <p className="text-center text-body-sm text-foreground-muted">
        Already have a workspace?{" "}
        <Link href="/sign-in" className="text-action underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
