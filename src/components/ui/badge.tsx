import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { StatusTone } from "@/config/status.config";

const badgeStyles = cva(
  "inline-flex items-center whitespace-nowrap gap-1.5 rounded-pill px-2.5 py-0.5 text-[11px] font-medium leading-relaxed tracking-normal",
  {
    variants: {
      tone: {
        pass: "bg-pass/12 text-pass border border-pass/25",
        fail: "bg-fail/12 text-fail border border-fail/25",
        partial: "bg-partial/12 text-partial border border-partial/25",
        blocked: "bg-blocked/12 text-blocked border border-blocked/25",
        progress: "bg-progress/12 text-progress border border-progress/25",
        ai: "bg-ai/12 text-ai border border-ai/25",
        neutral: "bg-inset text-foreground-muted border border-subtle",
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
  const isSpinning = icon === "inProgress" || icon === "spinner";
  return (
    <span className={cn(badgeStyles({ tone }), className)} {...props}>
      {icon ? (
        <Icon
          name={icon}
          size={12}
          className={cn("shrink-0", isSpinning && "animate-spin")}
        />
      ) : null}
      {children}
    </span>
  );
}
