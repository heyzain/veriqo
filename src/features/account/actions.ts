"use server";

import { redirect } from "next/navigation";

import { deleteAccountFormSchema } from "@/features/account/schemas";
import { fieldErrorsFromZod, formErrorState, type ActionState } from "@/lib/forms/action-state";
import { deleteAccount } from "@/server/services/account-service";
import { getCurrentUser } from "@/server/services/auth-service";
import { resetDemoDataForDev } from "@/server/services/dev-service";

export type DeleteAccountValues = { confirmEmail: string };

export async function deleteAccountAction(
  _prevState: ActionState<DeleteAccountValues>,
  formData: FormData,
): Promise<ActionState<DeleteAccountValues>> {
  const values: DeleteAccountValues = { confirmEmail: String(formData.get("confirmEmail") ?? "") };

  const user = await getCurrentUser();
  if (!user) return formErrorState("Your session expired. Sign in again.", values);

  const parsed = deleteAccountFormSchema.safeParse(values);
  if (!parsed.success) return fieldErrorsFromZod(parsed.error, values);

  if (parsed.data.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return formErrorState("That doesn't match your account email.", values);
  }

  await deleteAccount(user);
  redirect("/sign-in");
}

/** Demo/staging convenience — see `dev-service.resetDemoDataForDev` for the production guard. */
export async function resetDemoDataAction(): Promise<void> {
  await resetDemoDataForDev();
  redirect("/sign-in");
}
