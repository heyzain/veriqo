import type { z } from "zod";

/**
 * The shape every auth server action resolves to. Client forms bind this
 * via `useActionState`: `fieldErrors` render inline next to each field,
 * `formError` renders once as a banner, and `values` re-populate the form so
 * a recoverable failure never loses what the user typed
 * (03-CLAUDE-RULES.md, "Preserve user input after recoverable failure").
 */
export type ActionState<TValues extends Record<string, string> = Record<string, string>> = {
  status: "idle" | "error" | "success";
  fieldErrors?: Partial<Record<keyof TValues, string>>;
  formError?: string;
  values?: TValues;
  /** Non-field metadata for a success state, e.g. a dev-preview token. */
  meta?: Record<string, string>;
};

export function idleState<TValues extends Record<string, string>>(): ActionState<TValues> {
  return { status: "idle" };
}

export function fieldErrorsFromZod<TValues extends Record<string, string>>(
  error: z.ZodError,
  values: TValues,
): ActionState<TValues> {
  const flattened = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const fieldErrors: Partial<Record<keyof TValues, string>> = {};
  for (const [key, messages] of Object.entries(flattened)) {
    if (messages?.[0]) fieldErrors[key as keyof TValues] = messages[0];
  }
  return { status: "error", fieldErrors, values };
}

export function formErrorState<TValues extends Record<string, string>>(
  formError: string,
  values: TValues,
): ActionState<TValues> {
  return { status: "error", formError, values };
}

export function successState<TValues extends Record<string, string>>(
  values: TValues,
  meta?: Record<string, string>,
): ActionState<TValues> {
  return { status: "success", values, meta };
}
