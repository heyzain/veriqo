import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { testRunStatuses } from "@/config/status.config";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectRecords } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const records = user ? getProjectRecords(slug, user) : null;
  return { title: records ? `${records.project.name} · Test Runs` : "Test Runs" };
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
  const records = getProjectRecords(slug, user);
  if (!records) notFound();

  const { project, testRuns } = records;
  const handedOffTestCaseIds =
    typeof query.testCaseIds === "string" ? query.testCaseIds.split(",").filter(Boolean) : [];

  return (
    <div className="flex flex-col gap-8">
      {handedOffTestCaseIds.length > 0 ? (
        <div className="flex items-start gap-3 rounded-md border border-progress/30 bg-progress/10 p-4 text-body-sm text-foreground">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-progress" />
          <p>
            {handedOffTestCaseIds.length} test case{handedOffTestCaseIds.length === 1 ? "" : "s"} selected from{" "}
            <Link href={`/projects/${project.slug}/test-cases`} className="underline hover:no-underline">
              Test Cases
            </Link>{" "}
            ({handedOffTestCaseIds.join(", ")}). Run creation from a selection arrives in the next phase.
          </p>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-title-lg font-serif text-foreground">Test Runs</h1>
            <span className="text-mono-sm text-foreground-muted">({testRuns.length} runs)</span>
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
            <Link href={`/projects/${project.slug}/test-runs`}>
              <Icon name="plus" size={16} />
              <span>New test run</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Surface */}
      {testRuns.length === 0 ? (
        <EmptyState
          icon="testRuns"
          title="No test runs recorded"
          description="Create your first test run to execute test cases against a target release build."
          action={
            <Button asChild intent="primary">
              <Link href={`/projects/${project.slug}/test-cases`}>
                <Icon name="testCases" size={16} />
                <span>Select Test Cases</span>
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {testRuns.map((run) => {
            const statusDef = testRunStatuses[run.status];

            return (
              <div
                key={run.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-subtle bg-surface p-5 shadow-sm transition-fast hover:border-strong"
              >
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-mono-sm font-semibold text-foreground px-2 py-0.5 rounded bg-inset border border-subtle">
                      {run.publicId}
                    </span>
                    <h2 className="text-title-md text-foreground font-medium">{run.name}</h2>
                    <Badge tone={statusDef.tone} icon={statusDef.icon}>
                      {statusDef.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-mono-sm text-foreground-muted text-[12px]">
                    <span>Build: <strong className="text-foreground">{run.build}</strong></span>
                    <span>•</span>
                    <span>Env: <strong className="text-foreground">{run.environment}</strong></span>
                    <span>•</span>
                    <span>Browser: <strong className="text-foreground">{run.browser}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button asChild intent="secondary" size="sm">
                    <Link href={`/projects/${project.slug}/test-runs`}>
                      <span>View details</span>
                      <Icon name="chevronRight" size={14} />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
