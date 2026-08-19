import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { totalSetupSteps } from "@/config/setup-steps.config";
import { mcpConnectionStatuses } from "@/config/status.config";
import { NextActionPanel } from "@/features/analytics/components/next-action-panel";
import { ReleaseConfidencePanel } from "@/features/analytics/components/release-confidence-panel";
import { ProjectHealthStrip } from "@/features/projects/components/project-health-strip";
import { SetupPath } from "@/features/projects/components/setup-path";
import { formatDate } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { getMcpConnectionSnapshot } from "@/server/services/mcp-service";
import { getProjectRecords, getProjectSummary } from "@/server/services/project-service";
import { getReleaseReadiness } from "@/server/services/release-confidence-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const [user, { slug }] = await Promise.all([getCurrentUser(), params]);
  const summary = user ? await getProjectSummary(slug, user) : null;
  return { title: summary ? `${summary.project.name} · Overview` : "Project Overview" };
}

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug } = await params;
  const summary = await getProjectSummary(slug, user);
  if (!summary) notFound();

  const records = await getProjectRecords(slug, user);
  if (!records) notFound();

  const { project } = summary;
  const isFullySetUp = project.setupStepsCompleted >= totalSetupSteps;
  const mcpSnapshot = await getMcpConnectionSnapshot(project);
  const readiness = isFullySetUp ? getReleaseReadiness(records) : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-title-xl font-serif text-foreground">{project.name}</h1>
            <span className="text-mono-sm text-foreground-muted font-semibold">
              {project.publicId}
            </span>
            {project.archived && (
              <Badge tone="blocked" icon="archived">
                Archived
              </Badge>
            )}
            {isFullySetUp ? (
              <Badge tone="pass" icon="approved">
                Setup complete
              </Badge>
            ) : (
              <Badge tone="progress" icon="inProgress">
                Setup step {project.setupStepsCompleted + 1} of {totalSetupSteps}
              </Badge>
            )}
          </div>
          <p className="max-w-2xl text-body-lg text-foreground-secondary">
            {project.description}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button asChild intent="secondary" size="md">
            <Link href={`/projects/${project.slug}/settings`}>
              <Icon name="settings" size={15} />
              <span>Project settings</span>
            </Link>
          </Button>
          <Button asChild intent="primary" size="md">
            <Link
              href={
                isFullySetUp
                  ? `/projects/${project.slug}/test-runs`
                  : `/projects/${project.slug}/mcp`
              }
            >
              <Icon name={isFullySetUp ? "testRuns" : "mcp"} size={16} />
              <span>{isFullySetUp ? "Test runs" : "Continue setup"}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Working Surface: Incomplete vs Populated */}
      {!isFullySetUp ? (
        /* Incomplete state: Guided Setup Path */
        <SetupPath project={project} />
      ) : (
        /* Populated state: Release narrative + Health strip + Connected records */
        <div className="flex flex-col gap-8">
          {/* Health Strip */}
          <ProjectHealthStrip summary={summary} mcpStatus={mcpSnapshot.status} />

          {/* Next Action — the one dominant action for this view */}
          {readiness ? <NextActionPanel action={readiness.nextAction} /> : null}

          {/* Explainable Release Confidence */}
          {readiness ? <ReleaseConfidencePanel confidence={readiness.confidence} /> : null}

          {/* Recent Activity Ledger snippet & Quick links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 cols: Recent QA Activity */}
            <div className="lg:col-span-2 flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="activity" size={16} className="text-foreground-muted" />
                  <h3 className="text-title-md text-foreground">Recent Activity</h3>
                </div>
                <Link
                  href={`/projects/${project.slug}/activity`}
                  className="text-body-sm text-action hover:underline"
                >
                  View full activity log →
                </Link>
              </div>

              <div className="flex flex-col divide-y divide-subtle">
                {records.activity.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="flex items-start justify-between gap-4 py-3 first:pt-1 last:pb-1">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-paper-2 text-foreground-muted shrink-0 text-[11px] font-medium">
                        <Icon name={evt.actorType === "claude" ? "claude" : evt.actorType === "system" ? "system" : "human"} size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-body-sm text-foreground">
                          <span className="font-medium text-foreground">{evt.actorName}</span>{" "}
                          <span className="text-foreground-secondary">{evt.action}</span>
                        </p>
                      </div>
                    </div>
                    <span className="text-mono-sm text-foreground-muted text-[11px] shrink-0">
                      {formatDate(evt.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right col: Setup Checklist Accordion/Summary */}
            <div className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-6">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <div className="flex items-center gap-2">
                  <Icon name="check" size={16} className="text-pass" />
                  <h3 className="text-title-md text-foreground">Setup Status</h3>
                </div>
                <Badge tone="pass">
                  {project.setupStepsCompleted} / {totalSetupSteps}
                </Badge>
              </div>
              <p className="text-body-sm text-foreground-secondary">
                All guided setup steps have been completed for {project.name}.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href={`/projects/${project.slug}/features`}
                  className="flex items-center justify-between text-body-sm p-2 rounded hover:bg-inset text-foreground-secondary hover:text-foreground transition-fast"
                >
                  <span>
                    {summary.featuresCount} feature{summary.featuresCount === 1 ? "" : "s"}{" "}
                    discovered ({summary.approvedFeaturesCount} approved)
                  </span>
                  <Icon name="chevronRight" size={14} className="text-foreground-muted" />
                </Link>
                <Link
                  href={`/projects/${project.slug}/test-cases`}
                  className="flex items-center justify-between text-body-sm p-2 rounded hover:bg-inset text-foreground-secondary hover:text-foreground transition-fast"
                >
                  <span>
                    {summary.testCasesCount} test case{summary.testCasesCount === 1 ? "" : "s"}{" "}
                    recorded
                  </span>
                  <Icon name="chevronRight" size={14} className="text-foreground-muted" />
                </Link>
                <Link
                  href={`/projects/${project.slug}/issues`}
                  className="flex items-center justify-between text-body-sm p-2 rounded hover:bg-inset text-foreground-secondary hover:text-foreground transition-fast"
                >
                  <span>
                    {summary.verifiedIssuesCount} of {summary.issuesCount} issue
                    {summary.issuesCount === 1 ? "" : "s"} verified
                  </span>
                  <Icon name="chevronRight" size={14} className="text-foreground-muted" />
                </Link>
                <Link
                  href={`/projects/${project.slug}/mcp`}
                  className="flex items-center justify-between text-body-sm p-2 rounded hover:bg-inset text-foreground-secondary hover:text-foreground transition-fast"
                >
                  <span>Claude MCP: {mcpConnectionStatuses[mcpSnapshot.status].label}</span>
                  <Icon name="chevronRight" size={14} className="text-foreground-muted" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
