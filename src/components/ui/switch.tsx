"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SwitchProps = React.ComponentPropsWithoutRef<
  typeof RadixSwitch.Root
> & {
  label: string;
  description?: string;
  hideLabel?: boolean;
};

export const Switch = React.forwardRef<
  React.ComponentRef<typeof RadixSwitch.Root>,
  SwitchProps
>(({ id, label, description, hideLabel, className, ...props }, ref) => {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={switchId}
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
      <RadixSwitch.Root
        ref={ref}
        id={switchId}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-pill bg-inset transition-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          "data-[state=checked]:bg-action",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        aria-describedby={descriptionId}
        {...props}
      >
        <RadixSwitch.Thumb
          className={cn(
            "block size-5 translate-x-0.5 rounded-pill bg-raised shadow-sm transition-fast",
            "data-[state=checked]:translate-x-[18px]",
          )}
        />
      </RadixSwitch.Root>
    </div>
  );
});
Switch.displayName = "Switch";
