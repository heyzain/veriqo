import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { mcpConnectionStatuses, type McpConnectionStatus } from "@/config/status.config";
import { formatRelativeTime } from "@/lib/format/date";

export type McpConnectionSummaryProps = {
  status: McpConnectionStatus;
  lastAttemptAt?: string;
  lastAttemptError?: string;
  lastSuccessAt?: string;
};

const explanationByStatus: Record<McpConnectionStatus, string> = {
  notConfigured:
    "Generate a project credential below, then connect Claude Code or Claude Desktop using the instructions underneath.",
  pendingFirstConnection:
    "A credential exists, but Claude hasn't connected with it yet. Follow the setup instructions below, or use “Test connection now” from the credential dialog.",
  connected: "Claude can read this project's QA context and verify requests through MCP.",
  error:
    "The most recent connection attempt failed. Check the value was copied correctly, or regenerate the credential below.",
};

/**
 * The page's connection-state strip — one badge, one explanatory sentence,
 * and (only in the error state) a concrete recovery path, per
 * 02-BUILD-PHASES.md Phase 3 acceptance: "Incorrect configuration gives a
 * recovery path."
 */
export function McpConnectionSummary({
  status,
  lastAttemptAt,
  lastAttemptError,
  lastSuccessAt,
}: McpConnectionSummaryProps) {
  const definition = mcpConnectionStatuses[status];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-strong bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <Badge tone={definition.tone} icon={definition.icon}>
          {definition.label}
        </Badge>
        {status === "connected" && lastSuccessAt ? (
          <span className="text-body-sm text-foreground-muted">
            Last verified {formatRelativeTime(lastSuccessAt)}
          </span>
        ) : null}
        {status === "error" && lastAttemptAt ? (
          <span className="text-body-sm text-foreground-muted">
            Last attempt {formatRelativeTime(lastAttemptAt)}
          </span>
        ) : null}
      </div>

      <p className="text-body-sm text-foreground-secondary">{explanationByStatus[status]}</p>

      {status === "error" ? (
        <div className="flex items-start gap-2 rounded-md border border-fail/30 bg-fail/10 p-3 text-body-sm text-fail">
          <Icon name="warning" size={15} className="mt-0.5 shrink-0" />
          <span>
            {lastAttemptError ?? "The connection attempt was rejected."} Regenerate the credential
            below and reconnect with the new value.
          </span>
        </div>
      ) : null}
    </div>
  );
}
