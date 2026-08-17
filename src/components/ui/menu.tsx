"use client";

import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export const Menu = RadixDropdownMenu.Root;
export const MenuTrigger = RadixDropdownMenu.Trigger;
export const MenuGroup = RadixDropdownMenu.Group;
export const MenuLabel = RadixDropdownMenu.Label;

export const MenuContent = React.forwardRef<
  React.ComponentRef<typeof RadixDropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <RadixDropdownMenu.Portal>
    <RadixDropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-48 overflow-hidden rounded-md border border-subtle bg-raised p-1 shadow-md",
        className,
      )}
      {...props}
    />
  </RadixDropdownMenu.Portal>
));
MenuContent.displayName = "MenuContent";

export type MenuItemProps = React.ComponentPropsWithoutRef<
  typeof RadixDropdownMenu.Item
> & {
  icon?: IconName;
  destructive?: boolean;
};

export const MenuItem = React.forwardRef<
  React.ComponentRef<typeof RadixDropdownMenu.Item>,
  MenuItemProps
>(({ className, icon, destructive, children, ...props }, ref) => (
  <RadixDropdownMenu.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer items-center gap-2 rounded-xs px-2.5 py-2 text-body outline-none",
      destructive ? "text-fail" : "text-foreground",
      "data-[highlighted]:bg-inset",
      "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60",
      className,
    )}
    {...props}
  >
    {icon ? <Icon name={icon} size={16} /> : null}
    {children}
  </RadixDropdownMenu.Item>
));
MenuItem.displayName = "MenuItem";

export const MenuSeparator = React.forwardRef<
  React.ComponentRef<typeof RadixDropdownMenu.Separator>,
  React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Separator>
>(({ className, ...props }, ref) => (
  <RadixDropdownMenu.Separator
    ref={ref}
    className={cn("my-1 h-px bg-subtle", className)}
    {...props}
  />
));
MenuSeparator.displayName = "MenuSeparator";
