"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const Tabs = RadixTabs.Root;

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.List>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.List>
>(({ className, ...props }, ref) => (
  <RadixTabs.List
    ref={ref}
    className={cn("flex gap-1 border-b border-subtle", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Trigger>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger>
>(({ className, ...props }, ref) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cn(
      "relative px-3 py-2.5 text-body-sm font-medium text-foreground-muted",
      "transition-fast hover:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-xs",
      "data-[state=active]:text-foreground",
      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-pill after:bg-action after:opacity-0 after:transition-fast",
      "data-[state=active]:after:opacity-100",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof RadixTabs.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTabs.Content>
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn(
      "pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:rounded-xs",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
