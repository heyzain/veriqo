"use client";

import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

export const AlertDialog = RadixAlertDialog.Root;
export const AlertDialogTrigger = RadixAlertDialog.Trigger;

function AlertDialogOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof RadixAlertDialog.Overlay>) {
  return (
    <RadixAlertDialog.Overlay
      className={cn("fixed inset-0 z-50 bg-black/40 transition-base", className)}
      {...props}
    />
  );
}

export type AlertDialogContentProps = React.ComponentPropsWithoutRef<
  typeof RadixAlertDialog.Content
> & {
  title: string;
  description: string;
};

export const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof RadixAlertDialog.Content>,
  AlertDialogContentProps
>(({ className, title, description, children, ...props }, ref) => (
  <RadixAlertDialog.Portal>
    <AlertDialogOverlay />
    <RadixAlertDialog.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
        "rounded-lg border border-subtle bg-raised p-6 shadow-lg transition-base",
        className,
      )}
      {...props}
    >
      <RadixAlertDialog.Title className="text-title-md text-foreground">
        {title}
      </RadixAlertDialog.Title>
      <RadixAlertDialog.Description className="mt-2 text-body-sm text-foreground-muted">
        {description}
      </RadixAlertDialog.Description>
      {children}
    </RadixAlertDialog.Content>
  </RadixAlertDialog.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";

export const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-6 flex justify-end gap-2.5", className)} {...props} />
);

export const AlertDialogCancel = RadixAlertDialog.Cancel;
export const AlertDialogAction = RadixAlertDialog.Action;
