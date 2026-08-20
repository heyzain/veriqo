import { Badge } from "@/components/ui/badge";
import { executionModes } from "@/config/status.config";
import type { TestExecutionMode } from "@/config/status.config";

export type ExecutionModeBadgeProps = {
  mode: TestExecutionMode;
  className?: string;
};

/**
 * Labels a `TestRun` by how it's executed — Manual, Claude-assisted, or
 * Veriqo Automated (`executionModes` in status.config.ts) — the same
 * config-driven pattern `SourceBadge`/`StatusBadge` use, so a new execution
 * mode never needs a new hardcoded badge scattered through run components.
 */
export function ExecutionModeBadge({ mode, className }: ExecutionModeBadgeProps) {
  const def = executionModes[mode];
  return (
    <Badge tone={def.tone} icon={def.icon} className={className}>
      {def.label}
    </Badge>
  );
}
