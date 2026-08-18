import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import type { ActivityEvent } from "@/types/domain";

export type McpActivityListProps = {
  activity: ActivityEvent[];
};

/**
 * The audit trail for credential and connection events specifically
 * (`entityType === "mcpConnection"`), separate from the project's general
 * activity ledger — 02-BUILD-PHASES.md Phase 3, "Last-seen and recent MCP
 * activity".
 */
export function McpActivityList({ activity }: McpActivityListProps) {
  return (
    <AgentActivityStream
      activity={activity}
      emptyIcon="mcp"
      emptyTitle="No MCP activity yet"
      emptyDescription="Credential and connection events — issued, tested, revoked — will appear here once Claude connects."
    />
  );
}
