import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { NextAction } from "@/server/services/release-confidence-service";

export type NextActionPanelProps = {
  action: NextAction;
};

const toneChrome: Record<string, string> = {
  pass: "border-pass/30 bg-pass/10",
  fail: "border-fail/30 bg-fail/10",
  partial: "border-partial/30 bg-partial/10",
  blocked: "border-blocked/30 bg-blocked/10",
  progress: "border-progress/30 bg-progress/10",
  ai: "border-ai/30 bg-ai/10",
  neutral: "border-subtle bg-inset/30",
};

/**
 * `NextActionPanel` (01-DESIGN-SYSTEM.md, "Product components") — the one
 * dominant action for this view (01-DESIGN-SYSTEM.md, "One dominant action
 * per view"), picked by `release-confidence-service.pickNextAction` from
 * the same blockers/coverage-gap data the confidence score uses.
 */
export function NextActionPanel({ action }: NextActionPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between",
        toneChrome[action.tone],
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Icon name={action.icon} size={20} className="mt-0.5 shrink-0 text-foreground" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-label-style uppercase tracking-wider text-foreground-muted">Next action</span>
          <h3 className="text-title-md text-foreground">{action.title}</h3>
          <p className="text-body-sm text-foreground-secondary">{action.description}</p>
        </div>
      </div>
      <Button asChild intent="primary" size="md" className="shrink-0 self-start sm:self-center">
        <Link href={action.href}>
          <span>Go</span>
          <Icon name="chevronRight" size={14} />
        </Link>
      </Button>
    </div>
  );
}
