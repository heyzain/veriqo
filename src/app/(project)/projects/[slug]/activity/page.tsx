import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatDate } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Activity` : "Activity" };
}

export default async function ProjectActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, activity } = records;

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Activity Ledger</h1>
            <span className="text-mono-sm text-foreground-muted">({activity.length} events)</span>
          </div>
          <p className="text-body text-foreground-secondary">
            Immutable audit record of all human, Claude, and system actions in {project.name}.
          </p>
        </div>
      </div>

      {/* Main Surface */}
      {activity.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No activity recorded yet"
          description="Actions performed by team members and Claude will appear here in chronological order."
        />
      ) : (
        <div className="rounded-lg border border-subtle bg-surface p-6 shadow-sm">
          <div className="flex flex-col divide-y divide-subtle">
            {activity.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-paper-2 text-foreground-muted shrink-0 text-body-sm font-medium border border-subtle">
                    <Icon
                      name={
                        evt.actorType === "claude"
                          ? "claude"
                          : evt.actorType === "system"
                            ? "system"
                            : "human"
                      }
                      size={15}
                    />
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-body text-foreground">
                      <strong className="font-semibold text-foreground">{evt.actorName}</strong>{" "}
                      <span className="text-foreground-secondary">{evt.action}</span>
                    </p>
                    <span className="text-mono-sm text-foreground-muted text-[11px] uppercase tracking-wider">
                      {evt.entityType} • {evt.actorType}
                    </span>
                  </div>
                </div>

                <time className="text-mono-sm text-foreground-muted text-[12px] shrink-0">
                  {formatDate(evt.createdAt)}
                </time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
