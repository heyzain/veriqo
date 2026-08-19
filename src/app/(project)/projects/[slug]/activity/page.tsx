import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ActivityFilterBar } from "@/features/activity/components/activity-filter-bar";
import { ActivityLedger } from "@/features/activity/components/activity-ledger";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";
import type { ActivityEvent } from "@/types/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? await getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Activity` : "Activity" };
}

function matchesQuery(event: ActivityEvent, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return event.actorName.toLowerCase().includes(normalized) || event.action.toLowerCase().includes(normalized);
}

export default async function ProjectActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const query = await searchParams;
  const records = await getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, activity } = records;

  const actorFilter = typeof query.actor === "string" ? query.actor : "";
  const entityTypeFilter = typeof query.entityType === "string" ? query.entityType : "";
  const searchQuery = typeof query.q === "string" ? query.q : "";
  const hasActiveFilters = Boolean(actorFilter || entityTypeFilter || searchQuery);

  const filteredActivity = activity.filter(
    (event) =>
      (!actorFilter || event.actorType === actorFilter) &&
      (!entityTypeFilter || event.entityType === entityTypeFilter) &&
      matchesQuery(event, searchQuery),
  );

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
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

      {activity.length > 0 ? <ActivityFilterBar /> : null}

      <ActivityLedger project={project} activity={filteredActivity} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
