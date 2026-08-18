import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { EntityLink } from "@/components/shared/entity-link";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { resultStatuses, testRunStatuses } from "@/config/status.config";
import { EvidenceGallery } from "@/components/shared/evidence-gallery";
import { CreateIssueTrigger } from "@/features/issues/components/create-issue-trigger";
import { ClaudeAssistedExecutionPanel } from "@/features/test-runs/components/claude-assisted-execution-panel";
import { ResultReviewControls } from "@/features/test-runs/components/result-review-controls";
import { RunLifecycleActions } from "@/features/test-runs/components/run-lifecycle-actions";
import { RunProgressBar } from "@/features/test-runs/components/run-progress-bar";
import { formatDateTime } from "@/lib/format/date";
import type { ExecutionContext } from "@/prompts/execution/prompt";
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

  const needsReviewCount = items.filter((item) => item.result.needsHumanReview).length;
  const isClaudeAssistedInProgress =
    testRun.executionMode === "claudeAssisted" && testRun.status !== "completed" && testRun.status !== "needsAttention";

  const executionContext: ExecutionContext = {
    project: {
      name: project.name,
      description: project.description,
      appUrl: project.appUrl,
      environment: project.environment,
      repository: project.repository,
    },
    testRun: {
      publicId: testRun.publicId,
      name: testRun.name,
      build: testRun.build,
      environment: testRun.environment,
      browser: testRun.browser,
    },
    testCases: items.map(({ testCase }) => ({
      publicId: testCase.publicId,
      title: testCase.title,
      preconditions: testCase.preconditions,
      steps: testCase.steps,
      expectedResult: testCase.expectedResult,
      roles: testCase.roles,
    })),
  };

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
            {testRun.executionMode === "claudeAssisted" ? (
              <Badge tone="ai" icon="claude">
                Claude-assisted
              </Badge>
            ) : null}
            {needsReviewCount > 0 ? (
              <Badge tone="partial" icon="alert">
                {needsReviewCount} need{needsReviewCount === 1 ? "s" : ""} review
              </Badge>
            ) : null}
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

        {!isClaudeAssistedInProgress ? <RunProgressBar progress={progress} /> : null}

        {!isClaudeAssistedInProgress && testRun.status !== "planned" && nextIncompleteTestCasePublicId ? (
          <div className="flex items-center gap-2 rounded-md border border-progress/30 bg-progress/10 px-3 py-2 text-body-sm text-foreground">
            <Icon name="inProgress" size={15} className="shrink-0 text-progress" />
            <span>Next up: {nextIncompleteTestCasePublicId}</span>
          </div>
        ) : null}
      </div>

      {isClaudeAssistedInProgress ? (
        <ClaudeAssistedExecutionPanel
          projectSlug={project.slug}
          runPublicId={testRun.publicId}
          progress={progress}
          needsReviewCount={needsReviewCount}
          context={executionContext}
        />
      ) : null}

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

              const flaggedForReview = Boolean(result.needsHumanReview) && result.recordedBySource === "claude";

              return (
                <div
                  key={testCase.id}
                  className={
                    "flex flex-col gap-3 rounded-lg border bg-surface p-5" +
                    (flaggedForReview ? " border-partial/50" : " border-subtle")
                  }
                >
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

                  {flaggedForReview ? (
                    <div className="flex items-center gap-2 rounded-md border border-partial/30 bg-partial/10 px-3 py-2">
                      <Icon name="alert" size={14} className="shrink-0 text-partial" />
                      <span className="text-body-sm text-foreground">Claude flagged this result for review.</span>
                    </div>
                  ) : null}

                  {result.status !== "notRun" ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-body-sm text-foreground-muted">
                          <SourceBadge source={result.recordedBySource} />
                          <span>
                            {result.recordedByName ? `Recorded by ${result.recordedByName}` : "Recorded"} ·{" "}
                            {formatDateTime(result.recordedAt)}
                          </span>
                        </div>
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

                      {result.reviewedByName && result.reviewedAt ? (
                        <p className="text-body-sm text-foreground-muted">
                          Reviewed by {result.reviewedByName} · {formatDateTime(result.reviewedAt)}
                        </p>
                      ) : null}

                      {flaggedForReview ? (
                        <ResultReviewControls
                          projectSlug={project.slug}
                          runPublicId={testRun.publicId}
                          testCasePublicId={testCase.publicId}
                          currentStatus={result.status}
                          currentActualResult={result.actualResult}
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
