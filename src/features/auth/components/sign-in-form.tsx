"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { idleState } from "@/lib/forms/action-state";
import { signInAction, type SignInValues } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    idleState<SignInValues>(),
  );

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

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
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="password" className="text-label-style text-foreground-secondary">
            Password
          </label>
          <Link href="/forgot-password" className="text-body-sm text-action underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          label="Password"
          hideLabel
          name="password"
          autoComplete="current-password"
          required
          defaultValue={state.values?.password}
          error={state.fieldErrors?.password}
        />
      </div>

      <Button type="submit" size="lg" loading={isPending}>
        Sign in
      </Button>

      <p className="text-center text-body-sm text-foreground-muted">
        New to this workspace?{" "}
        <Link href="/sign-up" className="text-action underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
