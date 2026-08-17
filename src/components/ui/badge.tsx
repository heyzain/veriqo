import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { StatusTone } from "@/config/status.config";

const badgeStyles = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-label-style",
  {
    variants: {
      tone: {
        pass: "bg-pass/10 text-pass",
        fail: "bg-fail/10 text-fail",
        partial: "bg-partial/10 text-partial",
        blocked: "bg-blocked/10 text-blocked",
        progress: "bg-progress/10 text-progress",
        ai: "bg-ai/10 text-ai",
        neutral: "bg-inset text-foreground-muted",
      } satisfies Record<StatusTone, string>,
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeStyles> & {
    icon?: IconName;
  };

/**
 * Status is never communicated by color alone — every badge pairs its tone
 * with a text label and, typically, an icon (01-DESIGN-SYSTEM.md, "Status
 * design"). Domain status wording/tone/icon comes from status.config.ts.
 */
export function Badge({ className, tone, icon, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeStyles({ tone }), className)} {...props}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}
