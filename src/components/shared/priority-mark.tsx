import { Badge } from "@/components/ui/badge";
import { testCasePriorities, type TestCasePriority } from "@/config/status.config";

export type PriorityMarkProps = {
  priority: TestCasePriority;
  className?: string;
};

/** The one place test-case priority → badge tone is decided (mirrors `RiskMark`). */
export function PriorityMark({ priority, className }: PriorityMarkProps) {
  const def = testCasePriorities[priority];
  return (
    <Badge tone={def.tone} className={className}>
      {def.label}
    </Badge>
  );
}
