import { cva } from "class-variance-authority";

/**
 * Shared chrome for form controls (Input, Textarea, Select trigger,
 * Combobox trigger) so every field looks and behaves the same way instead
 * of each primitive redefining its own border/radius/focus treatment.
 */
export const fieldStyles = cva(
  [
    "w-full rounded-md border border-subtle bg-surface px-3 text-body-sm text-foreground shadow-xs",
    "transition-fast placeholder:text-foreground-muted",
    "hover:border-strong hover:bg-surface",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:border-strong",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      state: {
        default: "border-subtle",
        invalid: "border-fail focus-visible:ring-fail",
      },
      size: {
        sm: "h-9 text-[13px] py-1.5",
        md: "h-10 text-body-sm py-2",
      },
    },
    defaultVariants: {
      state: "default",
      size: "md",
    },
  },
);
