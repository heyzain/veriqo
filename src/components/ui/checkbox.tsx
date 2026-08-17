"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import * as React from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type CheckboxProps = React.ComponentPropsWithoutRef<
  typeof RadixCheckbox.Root
> & {
  label: string;
  description?: string;
  hideLabel?: boolean;
};

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof RadixCheckbox.Root>,
  CheckboxProps
>(({ id, label, description, hideLabel, className, ...props }, ref) => {
  const generatedId = React.useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description ? `${checkboxId}-description` : undefined;

  return (
    <div className="flex items-start gap-2.5">
      <RadixCheckbox.Root
        ref={ref}
        id={checkboxId}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs border border-strong bg-raised",
          "transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          "data-[state=checked]:border-action data-[state=checked]:bg-action",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        aria-describedby={descriptionId}
        {...props}
      >
        <RadixCheckbox.Indicator className="text-foreground-on-dark">
          <Icon name="check" size={13} />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={checkboxId}
          className={cn("text-body text-foreground", hideLabel && "sr-only")}
        >
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="text-body-sm text-foreground-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
});
Checkbox.displayName = "Checkbox";
