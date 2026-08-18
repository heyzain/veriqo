import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { EntityLink } from "@/components/shared/entity-link";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icon } from "@/components/ui/icon";
import { resultStatuses, testRunStatuses } from "@/config/status.config";
import { EvidenceGallery } from "@/components/shared/evidence-gallery";
import { CreateIssueTrigger } from "@/features/issues/components/create-issue-trigger";
import { RunLifecycleActions } from "@/features/test-runs/components/run-lifecycle-actions";
import { RunProgressBar } from "@/features/test-runs/components/run-progress-bar";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { getProjectForOwner } from "@/server/services/project-service";
import { listFeaturesForProject } from "@/server/services/feature-service";
import { listIssuesForProject } from "@/server/services/issue-service";
import { getTestRunActivity, getTestRunDetail } from "@/server/services/test-run-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; runId: string }>;
}): Promise<Metadata> {
  const [user, { slug, runId }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  const detail = project ? getTestRunDetail(project, runId) : null;
  return { title: detail ? `${detail.testRun.publicId} · ${detail.testRun.name}` : "Test Run" };
}

export default async function TestRunDetailPage({
  params,
}: {
  params: Promise<{ slug: string; runId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug, runId } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const detail = getTestRunDetail(project, runId);
  if (!detail) notFound();

  const { testRun, items, progress, nextIncompleteTestCasePublicId } = detail;
  const features = listFeaturesForProject(project);
  const activity = getTestRunActivity(project, testRun);
  const statusDef = testRunStatuses[testRun.status];
  const issueByOriginResultId = new Map(listIssuesForProject(project).map((issue) => [issue.originResultId, issue.publicId]));

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.slug}/test-runs`}
          className="flex w-fit items-center gap-1 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <Icon name="chevronLeft" size={13} />
          <span>Test Runs</span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 border-b border-subtle pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-mono-sm font-semibold text-foreground-muted">{testRun.publicId}</span>
            <h1 className="text-title-lg font-serif text-foreground">{testRun.name}</h1>
            <StatusBadge status={statusDef} />
          </div>
          <RunLifecycleActions projectSlug={project.slug} testRun={testRun} context="detail" size="md" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-body-sm text-foreground-muted">
          <span>
            Build: <span className="text-mono-sm text-foreground">{testRun.build}</span>
          </span>
          <span aria-hidden="true">•</span>
          <span>{testRun.environment}</span>
          <span aria-hidden="true">•</span>
          <span>{testRun.browser}</span>
          {testRun.assigneeName ? (
            <>
              <span aria-hidden="true">•</span>
              <span>Assigned to {testRun.assigneeName}</span>
            </>
          ) : null}
        </div>

        {testRun.notes ? <p className="max-w-2xl text-body text-foreground-secondary">{testRun.notes}</p> : null}

        <RunProgressBar progress={progress} />

        {testRun.status !== "planned" && nextIncompleteTestCasePublicId ? (
          <div className="flex items-center gap-2 rounded-md border border-progress/30 bg-progress/10 px-3 py-2 text-body-sm text-foreground">
            <Icon name="inProgress" size={15} className="shrink-0 text-progress" />
            <span>Next up: {nextIncompleteTestCasePublicId}</span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-title-md text-foreground">
            <Icon name="testCases" size={16} className="text-foreground-muted" />
            Test cases ({items.length})
          </h2>

          <div className="flex flex-col gap-3">
            {items.map(({ testCase, result }) => {
              const feature = features.find((f) => f.id === testCase.featureId);
              const resultDef = resultStatuses[result.status];

              return (
                <div key={testCase.id} className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <EntityLink
                          publicId={testCase.publicId}
                          icon="testCases"
                          title={testCase.title}
                          href={`/projects/${project.slug}/test-cases`}
                        />
                        {feature ? (
                          <EntityLink
                            publicId={feature.publicId}
                            title={feature.name}
                            icon="features"
                            href={`/projects/${project.slug}/features/${feature.publicId}`}
                          />
                        ) : null}
                      </div>
                      <p className="text-body-sm font-medium text-foreground">{testCase.title}</p>
                      <p className="text-body-sm text-foreground-muted">{testCase.expectedResult}</p>
                    </div>
                    <StatusBadge status={resultDef} />
                  </div>

                  {result.actualResult ? (
                    <div className="flex flex-col gap-1 rounded-md bg-inset/40 p-3">
                      <span className="text-label-style text-foreground-muted">Actual result</span>
                      <p className="text-body-sm text-foreground-secondary">{result.actualResult}</p>
                    </div>
                  ) : null}

                  {result.evidence.length > 0 ? <EvidenceGallery evidence={result.evidence} /> : null}

                  {result.status !== "notRun" ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-body-sm text-foreground-muted">
                        Recorded by {result.recordedByName ?? "—"} · {formatDateTime(result.recordedAt)}
                      </p>
                      {result.status === "fail" || result.status === "partial" || result.status === "blocked" ? (
                        <CreateIssueTrigger
                          projectSlug={project.slug}
                          testRunPublicId={testRun.publicId}
                          testCasePublicId={testCase.publicId}
                          defaultTitle={`${testCase.title} — failed in ${testRun.name}`}
                          defaultSeverity={feature?.risk ?? "medium"}
                          existingIssuePublicId={issueByOriginResultId.get(result.id)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="activity" size={16} className="text-foreground-muted" />
              Activity
            </h2>
            <AgentActivityStream
              activity={activity}
              emptyTitle="No activity yet"
              emptyDescription="Lifecycle and result events for this run will appear here."
            />
          </section>

          <section className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-5 text-body-sm text-foreground-muted">
            <div className="flex items-center gap-1.5 pb-1">
              <SourceBadge source={testRun.createdBySource} />
              <span>Created by {testRun.createdByName}</span>
            </div>
            <span>Created {formatDateTime(testRun.createdAt)}</span>
            {testRun.startedAt ? <span>Started {formatDateTime(testRun.startedAt)}</span> : null}
            {testRun.completedAt ? <span>Completed {formatDateTime(testRun.completedAt)}</span> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
