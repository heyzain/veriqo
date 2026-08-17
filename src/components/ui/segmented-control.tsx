"use client";

import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SegmentedControlProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  className?: string;
};

export function SegmentedControl({
  label,
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps) {
  return (
    <RadixToggleGroup.Root
      type="single"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        // Radix returns "" when the active item is toggled again; keep the
        // current selection instead of allowing an empty segmented state.
        if (next) onValueChange(next);
      }}
      className={cn(
        "inline-flex rounded-sm border border-subtle bg-inset p-0.5",
        className,
      )}
    >
      {options.map((option) => (
        <RadixToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            "rounded-xs px-3 py-1.5 text-body-sm font-medium text-foreground-muted",
            "transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
            "data-[state=on]:bg-raised data-[state=on]:text-foreground data-[state=on]:shadow-sm",
          )}
        >
          {option.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  );
}
