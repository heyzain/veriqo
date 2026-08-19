import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { TestRunFilterBar } from "@/features/test-runs/components/test-run-filter-bar";
import { TestRunList } from "@/features/test-runs/components/test-run-list";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import { listTestRunsWithProgress, type TestRunSummary } from "@/server/services/test-run-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? await getProjectForOwner(slug, user) : null;
  return { title: project ? `${project.name} · Test Runs` : "Test Runs" };
}

function matchesQuery(summary: TestRunSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const { testRun } = summary;
  return (
    testRun.name.toLowerCase().includes(normalized) ||
    testRun.publicId.toLowerCase().includes(normalized) ||
    testRun.build.toLowerCase().includes(normalized)
  );
}

export default async function ProjectTestRunsPage({
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
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const allRuns = await listTestRunsWithProgress(project);

  const statusFilter = typeof query.status === "string" ? query.status : "";
  const searchQuery = typeof query.q === "string" ? query.q : "";
  const hasActiveFilters = Boolean(statusFilter || searchQuery);

  const filteredRuns = allRuns.filter(
    (summary) => (!statusFilter || summary.testRun.status === statusFilter) && matchesQuery(summary, searchQuery),
  );

  const needsAttentionCount = allRuns.filter((r) => r.testRun.status === "needsAttention").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Test Runs</h1>
            <span className="text-mono-sm text-foreground-muted">({allRuns.length} runs)</span>
            {needsAttentionCount > 0 ? (
              <Badge tone="fail" icon="alert">
                {needsAttentionCount} need{needsAttentionCount === 1 ? "s" : ""} attention
              </Badge>
            ) : null}
          </div>
          <p className="text-body text-foreground-secondary">
            Execution records against target builds, recording pass/fail evidence and reruns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/issues`}>
              <Icon name="issues" size={15} />
              <span>View Issues</span>
            </Link>
          </Button>
          <Button asChild intent="primary" size="md">
            <Link href={`/projects/${project.slug}/test-runs/new`}>
              <Icon name="plus" size={16} />
              <span>New test run</span>
            </Link>
          </Button>
        </div>
      </div>

      {allRuns.length > 0 ? <TestRunFilterBar /> : null}

      <TestRunList projectSlug={project.slug} runs={filteredRuns} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
