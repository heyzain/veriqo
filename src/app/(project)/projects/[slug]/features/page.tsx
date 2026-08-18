import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { featureStatuses } from "@/config/status.config";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Features` : "Features" };
}

export default async function ProjectFeaturesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, features, testCases, issues } = records;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Features</h1>
            <span className="text-mono-sm text-foreground-muted">({features.length} records)</span>
          </div>
          <p className="text-body text-foreground-secondary">
            Structured feature inventory discovered from the codebase and classified by risk.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/mcp`}>
              <Icon name="mcp" size={15} />
              <span>Prompt Claude</span>
            </Link>
          </Button>
          <Button asChild intent="primary" size="md">
            <Link href={`/projects/${project.slug}/test-cases`}>
              <Icon name="testCases" size={16} />
              <span>Generate test cases</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Surface: Table or Empty State */}
      {features.length === 0 ? (
        <EmptyState
          icon="features"
          title="No features discovered yet"
          description="Connect Claude Code through MCP to analyze your codebase and generate a structured feature inventory."
          action={
            <Button asChild intent="primary">
              <Link href={`/projects/${project.slug}/mcp`}>
                <Icon name="mcp" size={16} />
                <span>Connect Claude MCP</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-subtle bg-surface overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-subtle bg-inset/40 text-label-style text-foreground-muted">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Feature</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Review State</th>
                  <th className="px-4 py-3">Connected Tests</th>
                  <th className="px-4 py-3">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {features.map((feature) => {
                  const statusDef = featureStatuses[feature.status];
                  const linkedCases = testCases.filter((tc) => tc.featureId === feature.id);
                  const linkedIssues = issues.filter((iss) => iss.featureId === feature.id);

                  return (
                    <tr key={feature.id} className="transition-fast hover:bg-inset/30">
                      <td className="px-4 py-3.5 text-mono-sm font-semibold text-foreground-muted">
                        {feature.publicId}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-body-sm font-medium text-foreground">
                            {feature.name}
                          </span>
                          <span className="text-body-sm text-foreground-muted line-clamp-1">
                            {feature.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          tone={
                            feature.risk === "high"
                              ? "fail"
                              : feature.risk === "medium"
                                ? "partial"
                                : "neutral"
                          }
                        >
                          {feature.risk} risk
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={statusDef.tone} icon={statusDef.icon}>
                          {statusDef.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-body-sm text-foreground-secondary">
                        {linkedCases.length > 0 ? (
                          <span className="text-mono-sm text-foreground font-medium">
                            {linkedCases.map((c) => c.publicId).join(", ")}
                          </span>
                        ) : (
                          <span className="text-foreground-muted text-body-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-body-sm">
                        {linkedIssues.length > 0 ? (
                          <Link
                            href={`/projects/${project.slug}/issues`}
                            className="text-mono-sm text-pass font-medium hover:underline"
                          >
                            {linkedIssues.map((i) => i.publicId).join(", ")}
                          </Link>
                        ) : (
                          <span className="text-foreground-muted text-body-sm">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
