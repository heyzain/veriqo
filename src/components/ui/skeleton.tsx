import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * A pulse placeholder shaped like the content it stands in for. Skeletons
 * should resemble the final layout — compose several of these rather than
 * showing a full-page spinner (03-CLAUDE-RULES.md, "UI state contract").
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-inset", className)}
      {...props}
    />
  );
}
