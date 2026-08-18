import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { testCaseStatuses } from "@/config/status.config";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Test Cases` : "Test Cases" };
}

export default async function ProjectTestCasesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, testCases, features } = records;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Test Cases</h1>
            <span className="text-mono-sm text-foreground-muted">({testCases.length} records)</span>
          </div>
          <p className="text-body text-foreground-secondary">
            Traceable QA test specifications linked to parent features and execution history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/features`}>
              <Icon name="features" size={15} />
              <span>View Features</span>
            </Link>
          </Button>
          <Button asChild intent="primary" size="md">
            <Link href={`/projects/${project.slug}/test-runs`}>
              <Icon name="testRuns" size={16} />
              <span>Create test run</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Surface: Table or Empty State */}
      {testCases.length === 0 ? (
        <EmptyState
          icon="testCases"
          title="No test cases generated yet"
          description="Generate test cases from approved features to establish disciplined coverage for this project."
          action={
            <Button asChild intent="primary">
              <Link href={`/projects/${project.slug}/features`}>
                <Icon name="features" size={16} />
                <span>Review Features</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {testCases.map((tc) => {
            const parentFeature = features.find((f) => f.id === tc.featureId);
            const statusDef = testCaseStatuses[tc.status];

            return (
              <div
                key={tc.id}
                className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-mono-sm font-bold text-foreground px-2 py-0.5 rounded bg-inset border border-subtle">
                      {tc.publicId}
                    </span>
                    <h2 className="text-title-md text-foreground font-medium">{tc.title}</h2>
                    <Badge tone={statusDef.tone} icon={statusDef.icon}>
                      {statusDef.label}
                    </Badge>
                  </div>

                  {parentFeature && (
                    <div className="flex items-center gap-1.5 text-body-sm text-foreground-secondary">
                      <span className="text-foreground-muted">Feature:</span>
                      <span className="font-medium text-foreground">{parentFeature.name}</span>
                      <span className="text-mono-sm text-foreground-muted">({parentFeature.publicId})</span>
                    </div>
                  )}
                </div>

                {/* Steps */}
                <div className="flex flex-col gap-2">
                  <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
                    Execution Steps
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-body-sm text-foreground-secondary">
                    {tc.steps.map((step, idx) => (
                      <li key={idx} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Expected Result */}
                <div className="flex flex-col gap-1 rounded-md border border-subtle bg-inset/30 p-3">
                  <span className="text-eyebrow text-foreground-muted uppercase tracking-wider">
                    Expected Result
                  </span>
                  <p className="text-body-sm text-foreground">{tc.expectedResult}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
