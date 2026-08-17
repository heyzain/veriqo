"use client";

import * as RadixAvatar from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

const avatarStyles = cva(
  "flex shrink-0 items-center justify-center overflow-hidden rounded-pill font-medium",
  {
    variants: {
      variant: {
        person: "bg-sidebar text-foreground-on-dark",
        agent: "bg-ai/15 text-ai",
        system: "bg-inset text-foreground-muted",
      },
      size: {
        sm: "size-6 text-body-sm",
        md: "size-8 text-body",
        lg: "size-10 text-body-lg",
      },
    },
    defaultVariants: {
      variant: "person",
      size: "md",
    },
  },
);

export type AvatarProps = VariantProps<typeof avatarStyles> & {
  name: string;
  src?: string;
  className?: string;
  icon?: IconName;
};

/**
 * Generic avatar / actor mark. Domain provenance (human vs Claude vs system
 * vs import) is decided by the calling feature; this primitive only knows
 * about the visual `variant`.
 */
export function Avatar({ name, src, variant, size, className, icon }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <RadixAvatar.Root className={cn(avatarStyles({ variant, size }), className)}>
      {src ? (
        <RadixAvatar.Image src={src} alt={name} className="size-full object-cover" />
      ) : null}
      <RadixAvatar.Fallback className="flex items-center justify-center" delayMs={src ? 400 : 0}>
        {icon ? <Icon name={icon} size={16} label={name} /> : initials}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
