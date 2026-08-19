import { z } from "zod";

/**
 * Account deletion requires typing the exact email back — the same
 * precise-confirmation bar as any other irreversible action
 * (03-CLAUDE-RULES.md, "Destructive actions require precise confirmation"),
 * just stronger than a plain confirm button since this one destroys every
 * project the account owns, not a single record.
 */
export const deleteAccountFormSchema = z.object({
  confirmEmail: z.string().trim().min(1, "Type your email to confirm."),
});
export type DeleteAccountFormValues = z.infer<typeof deleteAccountFormSchema>;
