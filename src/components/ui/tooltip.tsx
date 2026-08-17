"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const TooltipProvider = RadixTooltip.Provider;

export type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: RadixTooltip.TooltipContentProps["side"];
};

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <RadixTooltip.Root delayDuration={250}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-50 rounded-xs bg-sidebar px-2.5 py-1.5 text-body-sm text-foreground-on-dark shadow-sm",
            "transition-fast",
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-sidebar" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
