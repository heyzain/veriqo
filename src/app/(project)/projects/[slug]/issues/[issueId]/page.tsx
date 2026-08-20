import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { EntityLink } from "@/components/shared/entity-link";
import { RiskMark } from "@/components/shared/risk-mark";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icon } from "@/components/ui/icon";
import { issueStatuses } from "@/config/status.config";
import { CreateFocusedRerunForm } from "@/features/issues/components/create-focused-rerun-form";
import { IssueInvestigationPanel } from "@/features/issues/components/issue-investigation-panel";
import { IssueLifecycle } from "@/features/issues/components/issue-lifecycle";
import { RerunComparison } from "@/features/issues/components/rerun-comparison";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { buildIssueInvestigationContext, getIssueDetail } from "@/server/services/issue-service";
import { getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; issueId: string }>;
}): Promise<Metadata> {
  const [user, { slug, issueId }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? await getProjectForOwner(slug, user) : null;
  const detail = project ? await getIssueDetail(project, issueId) : null;
  return { title: detail ? `${detail.issue.publicId} · ${detail.issue.title}` : "Issue" };
}

const investigationActiveStatuses = new Set(["open", "investigating", "fixInProgress", "reopened"]);

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; issueId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug, issueId } = await params;
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const detail = await getIssueDetail(project, issueId);
  if (!detail) notFound();

  const { issue, feature, testCase, originResult, originTestRun, rerunTestRun, rerunResult, activity } = detail;
  const statusDef = issueStatuses[issue.status];
  const showInvestigationPanel = investigationActiveStatuses.has(issue.status);

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.slug}/issues`}
          className="flex w-fit items-center gap-1 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <Icon name="chevronLeft" size={13} />
          <span>Issues</span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 border-b border-subtle pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-mono-sm font-semibold text-foreground-muted">{issue.publicId}</span>
          <StatusBadge status={statusDef} />
          <RiskMark risk={issue.severity} />
          <SourceBadge source={issue.createdBySource} />
        </div>
        <h1 className="text-title-lg font-serif text-foreground">{issue.title}</h1>

        <IssueLifecycle status={issue.status} className="pt-2" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="testRuns" size={16} className="text-foreground-muted" />
              Failure and rerun
            </h2>
            {originResult ? (
              <RerunComparison
                projectSlug={project.slug}
                originResult={originResult}
                originTestRun={originTestRun}
                rerunResult={rerunResult}
                rerunTestRun={rerunTestRun}
              />
            ) : (
              <p className="text-body-sm text-foreground-muted">The origin result could not be found.</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="claude" size={16} className="text-foreground-muted" />
              {issue.status === "readyForRetest" ? "Retest" : "Investigation and fix"}
            </h2>

            {showInvestigationPanel ? (
              <IssueInvestigationPanel
                projectSlug={project.slug}
                issuePublicId={issue.publicId}
                status={issue.status}
                fixNote={issue.fixNote}
                context={buildIssueInvestigationContext(project, detail)}
              />
            ) : issue.status === "readyForRetest" ? (
              rerunTestRun ? (
                <div className="flex items-center gap-3 rounded-md border border-progress/30 bg-progress/10 p-4 text-body-sm text-foreground">
                  <Icon name="inProgress" size={16} className="shrink-0 text-progress" />
                  <span>
                    Rerun {rerunTestRun.publicId} was created — record its result from{" "}
                    <Link href={`/projects/${project.slug}/test-runs/${rerunTestRun.publicId}`} className="underline hover:no-underline">
                      the test run
                    </Link>
                    . This issue verifies automatically if it passes, or reopens if it doesn&apos;t.
                  </span>
                </div>
              ) : (
                <CreateFocusedRerunForm
                  projectSlug={project.slug}
                  projectEnvironment={project.environment}
                  issuePublicIds={[issue.publicId]}
                  defaultBuild={originTestRun?.build}
                  defaultBrowser={originTestRun?.browser}
                />
              )
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-pass/30 bg-pass/10 p-4 text-body-sm text-foreground">
                <Icon name="approved" size={16} className="shrink-0 text-pass" />
                <span>Verified — the fix was confirmed by a passing rerun.</span>
              </div>
            )}
          </section>

          {!showInvestigationPanel ? (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-title-md text-foreground">
                <Icon name="activity" size={16} className="text-foreground-muted" />
                Activity
              </h2>
              <div className="rounded-md border border-subtle bg-surface p-4">
                <AgentActivityStream activity={activity} emptyTitle="No activity yet" />
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="dependency" size={16} className="text-foreground-muted" />
              Related records
            </h2>
            {feature ? (
              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Feature</span>
                <EntityLink
                  publicId={feature.publicId}
                  title={feature.name}
                  icon="features"
                  href={`/projects/${project.slug}/features/${feature.publicId}`}
                />
              </div>
            ) : null}
            {testCase ? (
              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Test case</span>
                <EntityLink
                  publicId={testCase.publicId}
                  icon="testCases"
                  title={testCase.title}
                  href={`/projects/${project.slug}/test-cases/${testCase.publicId}`}
                />
                <p className="text-body-sm text-foreground-muted">{testCase.title}</p>
              </div>
            ) : null}
            {originTestRun ? (
              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Origin run</span>
                <EntityLink
                  publicId={originTestRun.publicId}
                  title={originTestRun.name}
                  icon="testRuns"
                  href={`/projects/${project.slug}/test-runs/${originTestRun.publicId}`}
                />
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-5 text-body-sm text-foreground-muted">
            <span>Opened by {issue.createdByName}</span>
            <span>Created {formatDateTime(issue.createdAt)}</span>
            <span>Updated {formatDateTime(issue.updatedAt)}</span>
          </section>
        </div>
      </div>
    </div>
  );
}
