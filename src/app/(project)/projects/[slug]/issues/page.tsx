import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { issueStatuses } from "@/config/status.config";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Issues` : "Issues" };
}

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, issues, testCases } = records;

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Issues</h1>
            <span className="text-mono-sm text-foreground-muted">({issues.length} records)</span>
          </div>
          <p className="text-body text-foreground-secondary">
            Defects linked directly to failed test results, recorded fixes, and verified reruns.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/test-runs`}>
              <Icon name="testRuns" size={15} />
              <span>Test Runs</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Surface */}
      {issues.length === 0 ? (
        <EmptyState
          icon="issues"
          title="No open issues"
          description="Issues are created directly from failed test results and closed only upon passing reruns."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {issues.map((issue) => {
            const statusDef = issueStatuses[issue.status];
            const originTestCase = testCases.find((tc) => tc.id === issue.testCaseId);

            return (
              <div
                key={issue.id}
                className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-mono-sm font-bold text-foreground px-2 py-0.5 rounded bg-inset border border-subtle">
                      {issue.publicId}
                    </span>
                    <h2 className="text-title-md text-foreground font-medium">{issue.title}</h2>
                    <Badge tone={statusDef.tone} icon={statusDef.icon}>
                      {statusDef.label}
                    </Badge>
                    <Badge tone={issue.severity === "high" ? "fail" : "neutral"}>
                      {issue.severity} severity
                    </Badge>
                  </div>

                  {originTestCase && (
                    <div className="flex items-center gap-1.5 text-body-sm text-foreground-secondary">
                      <span className="text-foreground-muted">Origin Test:</span>
                      <Link
                        href={`/projects/${project.slug}/test-cases`}
                        className="font-mono text-foreground font-medium hover:underline"
                      >
                        {originTestCase.publicId}
                      </Link>
                    </div>
                  )}
                </div>

                {issue.fixNote && (
                  <div className="flex flex-col gap-1.5 rounded-md border border-pass/30 bg-pass/5 p-4">
                    <div className="flex items-center gap-2 text-pass font-medium text-body-sm">
                      <Icon name="check" size={15} />
                      <span>Fix Verified by Rerun</span>
                    </div>
                    <p className="text-body-sm text-foreground-secondary leading-relaxed">
                      {issue.fixNote}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
