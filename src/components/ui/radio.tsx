"use client";

import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadixRadioGroup.Root>,
  React.ComponentPropsWithoutRef<typeof RadixRadioGroup.Root>
>(({ className, ...props }, ref) => (
  <RadixRadioGroup.Root
    ref={ref}
    className={cn("flex flex-col gap-2.5", className)}
    {...props}
  />
));
RadioGroup.displayName = "RadioGroup";

export type RadioProps = React.ComponentPropsWithoutRef<
  typeof RadixRadioGroup.Item
> & {
  label: string;
  description?: string;
};

export const Radio = React.forwardRef<
  React.ComponentRef<typeof RadixRadioGroup.Item>,
  RadioProps
>(({ id, label, description, className, ...props }, ref) => {
  const generatedId = React.useId();
  const radioId = id ?? generatedId;
  const descriptionId = description ? `${radioId}-description` : undefined;

  return (
    <div className="flex items-start gap-2.5">
      <RadixRadioGroup.Item
        ref={ref}
        id={radioId}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-pill border border-strong bg-raised",
          "transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          "data-[state=checked]:border-action",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        aria-describedby={descriptionId}
        {...props}
      >
        <RadixRadioGroup.Indicator className="size-2.5 rounded-pill bg-action" />
      </RadixRadioGroup.Item>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={radioId} className="text-body text-foreground">
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
Radio.displayName = "Radio";
