import type * as React from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

export type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

/**
 * The deliberate "nothing here yet" state — distinct from loading and from
 * error. Always names what's missing and, where there's a next step, gives
 * one action rather than leaving the user at a dead end.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-pill bg-inset text-foreground-muted">
        <Icon name={icon} size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-title-md text-foreground">{title}</p>
        {description ? (
          <p className="max-w-sm text-body-sm text-foreground-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
