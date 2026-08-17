import { cva } from "class-variance-authority";

/**
 * Shared chrome for form controls (Input, Textarea, Select trigger,
 * Combobox trigger) so every field looks and behaves the same way instead
 * of each primitive redefining its own border/radius/focus treatment.
 */
export const fieldStyles = cva(
  [
    "w-full rounded-sm border bg-raised px-3 text-body text-foreground",
    "transition-fast placeholder:text-foreground-muted",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    variants: {
      state: {
        default: "border-subtle",
        invalid: "border-fail",
      },
      size: {
        sm: "h-9",
        md: "h-10",
      },
    },
    defaultVariants: {
      state: "default",
      size: "md",
    },
  },
);
