import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { IssueFilterBar } from "@/features/issues/components/issue-filter-bar";
import { IssueRecordList } from "@/features/issues/components/issue-record-list";
import { getCurrentUser } from "@/server/services/auth-service";
import { listFeaturesForProject } from "@/server/services/feature-service";
import { listIssuesForProject } from "@/server/services/issue-service";
import { getProjectForOwner } from "@/server/services/project-service";
import { listTestCasesForProject } from "@/server/services/test-case-service";
import type { Issue } from "@/types/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  return { title: project ? `${project.name} · Issues` : "Issues" };
}

function matchesQuery(issue: Issue, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return issue.title.toLowerCase().includes(normalized) || issue.publicId.toLowerCase().includes(normalized);
}

export default async function ProjectIssuesPage({
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
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const allIssues = listIssuesForProject(project);
  const features = listFeaturesForProject(project);
  const testCases = listTestCasesForProject(project);

  const statusFilter = typeof query.status === "string" ? query.status : "";
  const severityFilter = typeof query.severity === "string" ? query.severity : "";
  const searchQuery = typeof query.q === "string" ? query.q : "";
  const hasActiveFilters = Boolean(statusFilter || severityFilter || searchQuery);

  const filteredIssues = allIssues.filter(
    (issue) =>
      (!statusFilter || issue.status === statusFilter) &&
      (!severityFilter || issue.severity === severityFilter) &&
      matchesQuery(issue, searchQuery),
  );

  const openCount = allIssues.filter((i) => i.status !== "verified").length;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Issues</h1>
            <span className="text-mono-sm text-foreground-muted">({allIssues.length} records)</span>
            {openCount > 0 ? (
              <Badge tone="fail" icon="fail">
                {openCount} open
              </Badge>
            ) : null}
          </div>
          <p className="text-body text-foreground-secondary">
            Defects linked directly to failed test results, recorded fixes, and verified reruns.
          </p>
        </div>
      </div>

      {allIssues.length > 0 ? <IssueFilterBar /> : null}

      <IssueRecordList
        project={project}
        issues={filteredIssues}
        features={features}
        testCases={testCases}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}
