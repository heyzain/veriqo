"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import * as React from "react";

import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

function DialogOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>) {
  return (
    <RadixDialog.Overlay
      className={cn("fixed inset-0 z-50 bg-black/40 transition-base", className)}
      {...props}
    />
  );
}

export type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof RadixDialog.Content
> & {
  title: string;
  description?: string;
};

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof RadixDialog.Content>,
  DialogContentProps
>(({ className, title, description, children, ...props }, ref) => (
  <RadixDialog.Portal>
    <DialogOverlay />
    <RadixDialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2",
        "rounded-lg border border-subtle bg-raised p-6 shadow-lg transition-base",
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <RadixDialog.Title className="text-title-md text-foreground">
            {title}
          </RadixDialog.Title>
          <RadixDialog.Description
            className={cn("text-body-sm text-foreground-muted", !description && "sr-only")}
          >
            {description ?? `${title} dialog`}
          </RadixDialog.Description>
        </div>
        <RadixDialog.Close asChild>
          <IconButton icon="close" label="Close dialog" intent="ghost" size="sm" />
        </RadixDialog.Close>
      </div>
      {children}
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
DialogContent.displayName = "DialogContent";

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex justify-end gap-2.5", className)} {...props} />
);
