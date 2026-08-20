import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { actorTypes } from "@/config/status.config";
import { formatDateTime } from "@/lib/format/date";
import { resolveActivityEntity } from "@/server/services/activity-service";
import type { ActivityEvent, Project } from "@/types/domain";

export type ActivityLedgerProps = {
  project: Project;
  activity: readonly ActivityEvent[];
  hasActiveFilters: boolean;
};

const entityTypeLabel: Record<string, string> = {
  project: "Project",
  feature: "Feature",
  testCase: "Test case",
  testRun: "Test run",
  testResult: "Result",
  issue: "Issue",
  mcpConnection: "Claude MCP",
};

/**
 * The chronological ledger itself (Phase 9 Build) — each row's entity
 * reference is a real deep link when the record still resolves
 * (`resolveActivityEntity`), never a bare label pretending to be clickable.
 */
export async function ActivityLedger({ project, activity, hasActiveFilters }: ActivityLedgerProps) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title={hasActiveFilters ? "No activity matches these filters" : "No activity recorded yet"}
        description={
          hasActiveFilters
            ? "Try a different search term or clear the filters above."
            : "Actions performed by team members and Claude will appear here in chronological order."
        }
      />
    );
  }

  const entities = await Promise.all(
    activity.map((event) => resolveActivityEntity(project, event.entityType, event.entityId)),
  );

  return (
    <div className="rounded-lg border border-subtle bg-surface p-6 shadow-sm">
      <div className="flex flex-col divide-y divide-subtle">
        {activity.map((event, index) => {
          const entity = entities[index];

          return (
            <div key={event.id} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-subtle bg-paper-2 text-body-sm font-medium text-foreground-muted">
                  <Icon name={actorTypes[event.actorType].icon} size={15} />
                </div>

                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-body text-foreground">
                    <strong className="font-semibold text-foreground">{event.actorName}</strong>{" "}
                    <span className="text-foreground-secondary">{event.action}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-mono-sm text-[11px] uppercase tracking-wider text-foreground-muted">
                    <span>{entityTypeLabel[event.entityType] ?? event.entityType}</span>
                    {entity ? (
                      <>
                        <span aria-hidden="true">•</span>
                        <Link href={entity.href} className="normal-case text-action hover:underline">
                          {entity.label}
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <time className="shrink-0 text-mono-sm text-[12px] text-foreground-muted" dateTime={event.createdAt}>
                {formatDateTime(event.createdAt)}
              </time>
            </div>
          );
        })}
      </div>
    </div>
  );
}
