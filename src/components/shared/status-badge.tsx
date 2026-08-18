import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/config/status.config";
import type { IconName } from "@/components/ui/icon";

export type StatusBadgeProps = {
  status: { label: string; tone: StatusTone; icon: IconName };
  className?: string;
};

/**
 * Renders any `status.config.ts` status map entry as a `Badge` — one place
 * doing `<Badge tone={def.tone} icon={def.icon}>{def.label}</Badge>` instead
 * of that triple repeated at every call site (03-CLAUDE-RULES.md, "No
 * duplicated status maps in multiple files"). Works for feature, test-case,
 * run, result, and issue statuses alike since they all share `StatusMap`'s
 * shape.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge tone={status.tone} icon={status.icon} className={className}>
      {status.label}
    </Badge>
  );
}
