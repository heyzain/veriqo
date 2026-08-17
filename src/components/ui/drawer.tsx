"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import * as React from "react";

import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;

export type DrawerContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
> & {
  title: string;
  description?: string;
};

/**
 * The optional contextual drawer from 01-DESIGN-SYSTEM.md (400-480px,
 * right-aligned). Built on Radix Dialog rather than a separate primitive —
 * same focus trap and dismissal behavior, different placement.
 */
export const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  DrawerContentProps
>(({ className, title, description, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/40 transition-base" />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col",
        "border-l border-subtle bg-raised shadow-lg transition-base",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-subtle px-6 py-5">
        <div className="flex flex-col gap-1">
          <RadixDialog.Title className="text-title-md text-foreground">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            className={cn("text-body-sm text-foreground-muted", !description && "sr-only")}
          >
            {description ?? `${title} panel`}
          </RadixDialog.Description>
        </div>
        <RadixDialog.Close asChild>
          <IconButton icon="close" label="Close panel" intent="ghost" size="sm" />
        </RadixDialog.Close>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
DrawerContent.displayName = "DrawerContent";
