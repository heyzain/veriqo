import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestCaseFilterBar } from "@/features/test-cases/components/test-case-filter-bar";
import { TestCaseGenerationPanel } from "@/features/test-cases/components/test-case-generation-panel";
import {
  TestCaseRecordTable,
  type TestCaseGrouping,
} from "@/features/test-cases/components/test-case-record-table";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";
import { listTestCasesForProject } from "@/server/services/test-case-service";
import type { TestCase } from "@/types/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Test Cases` : "Test Cases" };
}

function matchesQuery(testCase: TestCase, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    testCase.title.toLowerCase().includes(normalized) ||
    testCase.publicId.toLowerCase().includes(normalized) ||
    testCase.expectedResult.toLowerCase().includes(normalized)
  );
}

export default async function ProjectTestCasesPage({
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
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, features } = records;
  const allTestCases = listTestCasesForProject(project);
  const approvedFeatures = features.filter((f) => f.status === "approved");

  const statusFilter = typeof query.status === "string" ? query.status : "";
  const priorityFilter = typeof query.priority === "string" ? query.priority : "";
  const featureFilter = typeof query.feature === "string" ? query.feature : "";
  const searchQuery = typeof query.q === "string" ? query.q : "";
  const grouping: TestCaseGrouping =
    query.group === "status" || query.group === "priority" || query.group === "none" ? query.group : "feature";
  const hasActiveFilters = Boolean(statusFilter || priorityFilter || featureFilter || searchQuery);

  const filteredTestCases = allTestCases.filter((testCase) => {
    const feature = features.find((f) => f.id === testCase.featureId);
    return (
      (!statusFilter || testCase.status === statusFilter) &&
      (!priorityFilter || testCase.priority === priorityFilter) &&
      (!featureFilter || feature?.publicId === featureFilter) &&
      matchesQuery(testCase, searchQuery)
    );
  });

  const searchString = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  ).toString();
  const currentUrl = `/projects/${project.slug}/test-cases${searchString ? `?${searchString}` : ""}`;

  const pendingCount = allTestCases.filter((tc) => tc.status === "inReview" || tc.status === "needsUpdate").length;
  const candidateEnvironments = Array.from(
    new Set([
      project.environment.charAt(0).toUpperCase() + project.environment.slice(1),
      "Chrome",
      "Firefox",
      "Safari",
      "Mobile",
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Test Cases</h1>
            <span className="text-mono-sm text-foreground-muted">({allTestCases.length} recorded)</span>
            {pendingCount > 0 ? (
              <Badge tone="ai" icon="needsReview">
                {pendingCount} need{pendingCount === 1 ? "s" : ""} review
              </Badge>
            ) : null}
          </div>
          <p className="text-body text-foreground-secondary">
            Traceable QA specifications generated from approved features, grouped for review before execution.
          </p>
        </div>

        <Button asChild intent="primary" size="md">
          <Link href={`/projects/${project.slug}/test-runs`}>
            <Icon name="testRuns" size={16} />
            <span>Create test run</span>
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={allTestCases.length === 0 ? "generate" : "records"}>
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="generate">Generate</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="flex flex-col gap-6">
          <TestCaseFilterBar features={features.filter((f) => f.status !== "archived")} />
          <TestCaseRecordTable
            project={project}
            testCases={filteredTestCases}
            allTestCases={allTestCases}
            features={features}
            grouping={grouping}
            currentUrl={currentUrl}
            hasActiveFilters={hasActiveFilters}
          />
        </TabsContent>

        <TabsContent value="generate">
          <TestCaseGenerationPanel
            projectSlug={project.slug}
            project={{
              name: project.name,
              description: project.description,
              appUrl: project.appUrl,
              environment: project.environment,
              repository: project.repository,
            }}
            approvedFeatures={approvedFeatures.map((f) => ({
              publicId: f.publicId,
              name: f.name,
              description: f.description,
              risk: f.risk,
              roles: f.roles,
              acceptanceCriteria: f.acceptanceCriteria,
            }))}
            existingTestCases={allTestCases.map((tc) => ({
              publicId: tc.publicId,
              featureId: features.find((f) => f.id === tc.featureId)?.publicId ?? "",
              title: tc.title,
              status: tc.status,
            }))}
            environments={candidateEnvironments}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
