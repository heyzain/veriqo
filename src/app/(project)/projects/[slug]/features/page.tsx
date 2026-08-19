import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { featureStatuses } from "@/config/status.config";
import { FeatureDiscoveryPanel } from "@/features/features/components/feature-discovery-panel";
import { FeatureFilterBar } from "@/features/features/components/feature-filter-bar";
import { FeatureRecordTable, type FeatureGrouping } from "@/features/features/components/feature-record-table";
import { getCurrentUser } from "@/server/services/auth-service";
import { listFeaturesForProject } from "@/server/services/feature-service";
import { getProjectRecords } from "@/server/services/project-service";
import type { Feature, Issue, TestCase } from "@/types/domain";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? await getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Features` : "Features" };
}

function matchesQuery(feature: Feature, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    feature.name.toLowerCase().includes(normalized) ||
    feature.description.toLowerCase().includes(normalized) ||
    feature.publicId.toLowerCase().includes(normalized)
  );
}

export default async function ProjectFeaturesPage({
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

  const { project, testCases, issues } = records;
  const allFeatures = await listFeaturesForProject(project);

  const statusFilter = typeof query.status === "string" ? query.status : "";
  const riskFilter = typeof query.risk === "string" ? query.risk : "";
  const searchQuery = typeof query.q === "string" ? query.q : "";
  const grouping: FeatureGrouping = query.group === "status" || query.group === "risk" ? query.group : "none";
  const hasActiveFilters = Boolean(statusFilter || riskFilter || searchQuery);

  const filteredFeatures = allFeatures.filter(
    (feature) =>
      (!statusFilter || feature.status === statusFilter) &&
      (!riskFilter || feature.risk === riskFilter) &&
      matchesQuery(feature, searchQuery),
  );

  const testCasesByFeature: Record<string, TestCase[]> = {};
  for (const testCase of testCases) {
    (testCasesByFeature[testCase.featureId] ??= []).push(testCase);
  }
  const issuesByFeature: Record<string, Issue[]> = {};
  for (const issue of issues) {
    (issuesByFeature[issue.featureId] ??= []).push(issue);
  }

  const searchString = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  ).toString();
  const currentUrl = `/projects/${project.slug}/features${searchString ? `?${searchString}` : ""}`;

  const pendingCount = allFeatures.filter((f) => f.status === "needsReview" || f.status === "changed").length;
  const allReviewed = allFeatures.length > 0 && allFeatures.every((f) => f.status === "approved" || f.status === "archived");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-subtle pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Features</h1>
            <span className="text-mono-sm text-foreground-muted">({allFeatures.length} discovered)</span>
            {pendingCount > 0 ? (
              <Badge tone="ai" icon="needsReview">
                {pendingCount} need{pendingCount === 1 ? "s" : ""} review
              </Badge>
            ) : null}
          </div>
          <p className="text-body text-foreground-secondary">
            Structured feature inventory discovered from the codebase and classified by risk.
          </p>
        </div>

        <Button asChild intent={allReviewed ? "primary" : "secondary"} size="md">
          <Link href={`/projects/${project.slug}/test-cases`}>
            <Icon name="testCases" size={16} />
            <span>Generate test cases</span>
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={allFeatures.length === 0 ? "discover" : "records"}>
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="flex flex-col gap-6">
          <FeatureFilterBar />
          <FeatureRecordTable
            project={project}
            features={filteredFeatures}
            allFeatures={allFeatures}
            testCasesByFeature={testCasesByFeature}
            issuesByFeature={issuesByFeature}
            grouping={grouping}
            currentUrl={currentUrl}
            hasActiveFilters={hasActiveFilters}
          />
        </TabsContent>

        <TabsContent value="discover">
          <FeatureDiscoveryPanel
            projectSlug={project.slug}
            context={{
              project: {
                name: project.name,
                description: project.description,
                appUrl: project.appUrl,
                environment: project.environment,
                repository: project.repository,
              },
              existingFeatures: allFeatures.map((f) => ({
                publicId: f.publicId,
                name: f.name,
                status: featureStatuses[f.status].label,
              })),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
