import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatRelativeTime } from "@/lib/format/date";
import { cn } from "@/lib/utils/cn";
import type { ActivityEvent } from "@/types/domain";

export type AgentActivityStreamProps = {
  activity: readonly ActivityEvent[];
  emptyIcon?: IconName;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Event IDs to animate in with a subtle fade/slide — e.g. rows a poll just discovered. */
  newEventIds?: ReadonlySet<string>;
  className?: string;
};

/**
 * The reusable ledger of Claude/human/system activity (`AgentActivityStream`
 * in 01-DESIGN-SYSTEM.md) — "meaningful incoming activity rather than a
 * generic spinner" (00-PRODUCT.md). Used both for a feature's own activity
 * trail and, wrapped by a client poller, the live discovery panel on the
 * Features page.
 */
export function AgentActivityStream({
  activity,
  emptyIcon = "activity",
  emptyTitle = "No activity yet",
  emptyDescription,
  newEventIds,
  className,
}: AgentActivityStreamProps) {
  if (activity.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("flex flex-col divide-y divide-subtle", className)}>
      {activity.map((event) => (
        <div
          key={event.id}
          className={cn(
            "flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0",
            newEventIds?.has(event.id) && "animate-activity-enter",
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-subtle bg-paper-2 text-foreground-muted">
              <Icon
                name={
                  event.actorType === "claude"
                    ? "claude"
                    : event.actorType === "system"
                      ? "system"
                      : event.actorType === "import"
                        ? "import"
                        : "human"
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
