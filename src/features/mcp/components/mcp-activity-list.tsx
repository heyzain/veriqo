import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatRelativeTime } from "@/lib/format/date";
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
  if (activity.length === 0) {
    return (
      <EmptyState
        icon="mcp"
        title="No MCP activity yet"
        description="Credential and connection events — issued, tested, revoked — will appear here once Claude connects."
      />
    );
  }

  return (
    <div className="flex flex-col divide-y divide-subtle">
      {activity.map((event) => (
        <div key={event.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-subtle bg-paper-2 text-foreground-muted">
              <Icon
                name={
                  event.actorType === "claude" ? "claude" : event.actorType === "system" ? "system" : "human"
                }
                size={14}
              />
            </div>
            <p className="text-body-sm text-foreground">
              <span className="font-medium text-foreground">{event.actorName}</span>{" "}
              <span className="text-foreground-secondary">{event.action}</span>
            </p>
          </div>
          <span className="shrink-0 text-mono-sm text-[11px] text-foreground-muted">
            {formatRelativeTime(event.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
