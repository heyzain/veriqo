import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { EntityLink } from "@/components/shared/entity-link";
import { PriorityMark } from "@/components/shared/priority-mark";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { resultStatuses, testCaseStatuses } from "@/config/status.config";
import { TestCaseDetailActions } from "@/features/test-cases/components/test-case-detail-actions";
import { TestCaseDiffView } from "@/features/test-cases/components/test-case-diff-view";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { getTestCaseDetail } from "@/server/services/test-case-service";
import { getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; testCaseId: string }>;
}): Promise<Metadata> {
  const [user, { slug, testCaseId }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? await getProjectForOwner(slug, user) : null;
  const detail = project ? await getTestCaseDetail(project, testCaseId) : null;
  return { title: detail ? `${detail.testCase.publicId} · ${detail.testCase.title}` : "Test Case" };
}

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; testCaseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug, testCaseId } = await params;
  const project = await getProjectForOwner(slug, user);
  if (!project) notFound();

  const detail = await getTestCaseDetail(project, testCaseId);
  if (!detail) notFound();

  const { testCase, feature, duplicateOf, runs, issues, activity } = detail;
  const statusDef = testCaseStatuses[testCase.status];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.slug}/test-cases`}
          className="flex w-fit items-center gap-1 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <Icon name="chevronLeft" size={13} />
          <span>Test Cases</span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 border-b border-subtle pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-mono-sm font-semibold text-foreground-muted">{testCase.publicId}</span>
          <StatusBadge status={statusDef} />
          <PriorityMark priority={testCase.priority} />
          <SourceBadge source={testCase.createdBySource} />
          {feature ? (
            <EntityLink
              publicId={feature.publicId}
              title={feature.name}
              icon="features"
              href={`/projects/${project.slug}/features/${feature.publicId}`}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-title-lg font-serif text-foreground">{testCase.title}</h1>
        </div>

        {duplicateOf ? (
          <div className="flex items-center gap-2 rounded-md border border-partial/30 bg-partial/10 px-3 py-2 text-body-sm text-foreground">
            <Icon name="alert" size={15} className="text-partial shrink-0" />
            <span>
              Possibly a duplicate of{" "}
              <EntityLink
                publicId={duplicateOf.publicId}
                href={`/projects/${project.slug}/test-cases/${duplicateOf.publicId}`}
              />
              . Review to ensure coverage is distinct.
            </span>
          </div>
        ) : null}

        <TestCaseDetailActions project={project} testCase={testCase} />
      </div>

      <TestCaseDiffView testCase={testCase} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          {testCase.preconditions ? (
            <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-title-md text-foreground">
                <Icon name="info" size={16} className="text-foreground-muted" />
                Preconditions
              </h2>
              <p className="text-body text-foreground-secondary whitespace-pre-wrap">{testCase.preconditions}</p>
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="criteria" size={16} className="text-foreground-muted" />
              Step-by-step instructions ({testCase.steps.length})
            </h2>
            {testCase.steps.length > 0 ? (
              <ol className="flex flex-col gap-3">
                {testCase.steps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 rounded-md border border-subtle bg-inset/30 p-3.5 text-body text-foreground"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised text-mono-sm font-semibold text-foreground-secondary">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-body-sm text-foreground-muted">No explicit steps specified for this test case.</p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="approved" size={16} className="text-foreground-muted" />
              Expected result
            </h2>
            <div className="rounded-md border border-subtle bg-inset/40 p-4 text-body text-foreground">
              {testCase.expectedResult}
            </div>
          </section>

          {runs.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-title-md text-foreground">
                <Icon name="testRuns" size={16} className="text-foreground-muted" />
                Execution history ({runs.length})
              </h2>
              <div className="flex flex-col divide-y divide-subtle">
                {runs.map(({ testRun, result }) => {
                  const resDef = resultStatuses[result.status];
                  return (
                    <div key={testRun.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Link
                          href={`/projects/${project.slug}/test-runs/${testRun.publicId}`}
                          className="text-body-sm font-medium text-foreground hover:underline"
                        >
                          {testRun.publicId} — {testRun.name}
                        </Link>
                        <span className="text-body-sm text-foreground-muted">
                          {testRun.environment} · {testRun.browser} · {formatDateTime(result.recordedAt)}
                        </span>
                      </div>
                      <StatusBadge status={resDef} />
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {issues.length > 0 ? (
            <section className="flex flex-col gap-3 rounded-lg border border-subtle bg-surface p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-title-md text-foreground">
                <Icon name="issues" size={16} className="text-foreground-muted" />
                Related issues ({issues.length})
              </h2>
              <div className="flex flex-col gap-2">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-subtle bg-inset/30 p-3"
                  >
                    <EntityLink
                      publicId={issue.publicId}
                      title={issue.title}
                      icon="issues"
                      href={`/projects/${project.slug}/issues/${issue.publicId}`}
                    />
                    <span className="text-body-sm text-foreground-muted line-clamp-1">{issue.title}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          {feature ? (
            <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
              <h2 className="flex items-center gap-2 text-title-md text-foreground">
                <Icon name="features" size={16} className="text-foreground-muted" />
                Parent feature
              </h2>
              <div className="flex flex-col gap-2">
                <EntityLink
                  publicId={feature.publicId}
                  title={feature.name}
                  icon="features"
                  href={`/projects/${project.slug}/features/${feature.publicId}`}
                />
                <Link
                  href={`/projects/${project.slug}/features/${feature.publicId}`}
                  className="text-body-sm font-medium text-foreground hover:underline"
                >
                  {feature.name}
                </Link>
                <p className="line-clamp-3 text-body-sm text-foreground-muted">{feature.description}</p>
              </div>
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="text-title-md text-foreground">Scope & Environment</h2>
            <div className="flex flex-col gap-3 text-body-sm">
              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Roles</span>
                {testCase.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {testCase.roles.map((role) => (
                      <Badge key={role} tone="neutral">
                        {role}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-foreground-muted">Any user</span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-label-style text-foreground-muted">Target environments</span>
                {testCase.environments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {testCase.environments.map((env) => (
                      <Badge key={env} tone="neutral">
                        {env}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-foreground-muted">All environments</span>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="activity" size={16} className="text-foreground-muted" />
              Activity
            </h2>
            <AgentActivityStream
              activity={activity}
              emptyTitle="No activity yet"
              emptyDescription="Audit events for this test case will appear here."
            />
          </section>

          <section className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-5 text-body-sm text-foreground-muted">
            <span>Created {formatDateTime(testCase.createdAt)}</span>
            <span>Last updated {formatDateTime(testCase.updatedAt)}</span>
          </section>
        </div>
      </div>
    </div>
  );
}
