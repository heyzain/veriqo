"use client";

import { useActionState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { deleteAccountAction, type DeleteAccountValues } from "@/features/account/actions";
import { idleState } from "@/lib/forms/action-state";

export type DeleteAccountDialogProps = {
  email: string;
};

/**
 * Account deletion — the most severe destructive action in the product,
 * so it gets the strongest confirmation bar: typing the account's own
 * email, not just a confirm button (03-CLAUDE-RULES.md, "Destructive
 * actions require precise confirmation").
 */
export function DeleteAccountDialog({ email }: DeleteAccountDialogProps) {
  const [state, formAction, isPending] = useActionState(deleteAccountAction, idleState<DeleteAccountValues>());

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" intent="danger" size="md">
          <Icon name="revoke" size={15} />
          <span>Delete account</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Delete your account?"
        description="This permanently deletes your account and every project you own — features, test cases, runs, results, and issues. This can't be undone."
      >
        <form action={formAction} className="flex flex-col gap-4">
          {state.status === "error" && state.formError ? (
            <div className="rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">{state.formError}</div>
          ) : null}
          <Input
            name="confirmEmail"
            label={`Type "${email}" to confirm`}
            required
            placeholder={email}
            defaultValue={state.values?.confirmEmail}
            error={state.fieldErrors?.confirmEmail}
          />
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" intent="secondary">
                Cancel
              </Button>
            </AlertDialogCancel>
            <Button type="submit" intent="danger" disabled={isPending}>
              {isPending ? "Deleting…" : "Permanently delete my account"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
