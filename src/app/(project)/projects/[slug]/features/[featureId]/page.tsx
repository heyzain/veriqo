import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AgentActivityStream } from "@/components/shared/agent-activity-stream";
import { CoverageBar } from "@/components/shared/coverage-bar";
import { EntityLink } from "@/components/shared/entity-link";
import { RiskMark } from "@/components/shared/risk-mark";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { featureStatuses, issueStatuses } from "@/config/status.config";
import { FeatureDetailActions } from "@/features/features/components/feature-detail-actions";
import { FeatureDiffView } from "@/features/features/components/feature-diff-view";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentUser } from "@/server/services/auth-service";
import { getFeatureDetail, listFeaturesForProject } from "@/server/services/feature-service";
import { getProjectForOwner } from "@/server/services/project-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; featureId: string }>;
}): Promise<Metadata> {
  const [user, { slug, featureId }] = await Promise.all([getCurrentUser(), params]);
  const project = user ? getProjectForOwner(slug, user) : null;
  const detail = project ? getFeatureDetail(project, featureId) : null;
  return { title: detail ? `${detail.feature.publicId} · ${detail.feature.name}` : "Feature" };
}

export default async function FeatureDetailPage({
  params,
}: {
  params: Promise<{ slug: string; featureId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const { slug, featureId } = await params;
  const project = getProjectForOwner(slug, user);
  if (!project) notFound();

  const detail = getFeatureDetail(project, featureId);
  if (!detail) notFound();

  const { feature, duplicateOf, dependencyFeatures, dependents, testCases, issues, activity } = detail;
  const allFeatures = listFeaturesForProject(project);
  const statusDef = featureStatuses[feature.status];

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href={`/projects/${project.slug}/features`}
          className="flex w-fit items-center gap-1 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <Icon name="chevronLeft" size={13} />
          <span>Features</span>
        </Link>
      </div>

      <div className="flex flex-col gap-4 border-b border-subtle pb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-mono-sm font-semibold text-foreground-muted">{feature.publicId}</span>
          <StatusBadge status={statusDef} />
          <RiskMark risk={feature.risk} />
          <SourceBadge source={feature.createdBySource} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title-lg font-serif text-foreground">{feature.name}</h1>
          <p className="max-w-2xl text-body text-foreground-secondary">{feature.description}</p>
        </div>

        {duplicateOf ? (
          <div className="flex items-center gap-2 rounded-md border border-partial/30 bg-partial/10 px-3 py-2 text-body-sm text-foreground">
            <Icon name="alert" size={15} className="text-partial shrink-0" />
            <span>
              Possibly a duplicate of{" "}
              <EntityLink publicId={duplicateOf.publicId} href={`/projects/${project.slug}/features/${duplicateOf.publicId}`} />
              . Merge them if they describe the same behavior.
            </span>
          </div>
        ) : null}

        <FeatureDetailActions project={project} feature={feature} allFeatures={allFeatures} />
      </div>

      <FeatureDiffView feature={feature} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-8 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="criteria" size={16} className="text-foreground-muted" />
              Acceptance criteria
            </h2>
            <ul className="flex flex-col gap-2">
              {feature.acceptanceCriteria.map((item, index) => (
                <li key={index} className="flex items-start gap-2.5 text-body text-foreground-secondary">
                  <Icon name="check" size={15} className="mt-0.5 shrink-0 text-foreground-muted" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="testCases" size={16} className="text-foreground-muted" />
              Test coverage
            </h2>
            <CoverageBar testCases={testCases} />
            {testCases.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {testCases.map((testCase) => (
                  <EntityLink key={testCase.id} publicId={testCase.publicId} icon="testCases" title={testCase.title} />
                ))}
              </div>
            ) : (
              <Link
                href={`/projects/${project.slug}/test-cases`}
                className="w-fit text-body-sm text-action hover:underline"
              >
                Generate test cases for this feature →
              </Link>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="issues" size={16} className="text-foreground-muted" />
              Linked issues
            </h2>
            {issues.length > 0 ? (
              <div className="flex flex-col divide-y divide-subtle rounded-md border border-subtle bg-surface">
                {issues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/projects/${project.slug}/issues`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-fast hover:bg-inset/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-mono-sm font-semibold text-foreground-muted">{issue.publicId}</span>
                      <span className="truncate text-body-sm text-foreground">{issue.title}</span>
                    </div>
                    <StatusBadge status={issueStatuses[issue.status]} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-foreground-muted">No issues linked to this feature.</p>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="activity" size={16} className="text-foreground-muted" />
              Activity
            </h2>
            <div className="rounded-md border border-subtle bg-surface p-4">
              <AgentActivityStream
                activity={activity}
                emptyTitle="No activity yet"
                emptyDescription="Discovery, review, and update events for this feature will appear here."
              />
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="roles" size={16} className="text-foreground-muted" />
              Roles
            </h2>
            {feature.roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {feature.roles.map((role) => (
                  <Badge key={role} tone="neutral">
                    {role}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-foreground-muted">Behaves the same for every role.</p>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="dependency" size={16} className="text-foreground-muted" />
              Dependencies
            </h2>
            {dependencyFeatures.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {dependencyFeatures.map((dep) => (
                  <EntityLink
                    key={dep.id}
                    publicId={dep.publicId}
                    title={dep.name}
                    href={`/projects/${project.slug}/features/${dep.publicId}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-foreground-muted">No dependencies.</p>
            )}
            {dependents.length > 0 ? (
              <>
                <span className="pt-1 text-label-style text-foreground-muted">Depended on by</span>
                <div className="flex flex-wrap gap-1.5">
                  {dependents.map((dep) => (
                    <EntityLink
                      key={dep.id}
                      publicId={dep.publicId}
                      title={dep.name}
                      href={`/projects/${project.slug}/features/${dep.publicId}`}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <section className="flex flex-col gap-3 rounded-md border border-subtle bg-surface p-5">
            <h2 className="flex items-center gap-2 text-title-md text-foreground">
              <Icon name="sourceReference" size={16} className="text-foreground-muted" />
              Source references
            </h2>
            {feature.sourceReferences.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {feature.sourceReferences.map((ref) => (
                  <li key={ref.path} className="flex flex-col gap-0.5">
                    <span className="text-mono-sm text-foreground">{ref.path}</span>
                    {ref.note ? <span className="text-body-sm text-foreground-muted">{ref.note}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-body-sm text-foreground-muted">No source references recorded.</p>
            )}
          </section>

          <section className="flex flex-col gap-1.5 rounded-md border border-subtle bg-inset/30 p-5 text-body-sm text-foreground-muted">
            <span>Created {formatDateTime(feature.createdAt)}</span>
            <span>Updated {formatDateTime(feature.updatedAt)}</span>
            {feature.promptId ? (
              <span className="text-mono-sm text-[11px]">
                {feature.promptId} v{feature.promptVersion}
              </span>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
