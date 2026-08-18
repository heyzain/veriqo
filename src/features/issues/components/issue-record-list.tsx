"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EntityLink } from "@/components/shared/entity-link";
import { RiskMark } from "@/components/shared/risk-mark";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { issueStatuses } from "@/config/status.config";
import { CreateFocusedRerunForm } from "@/features/issues/components/create-focused-rerun-form";
import { formatRelativeTime } from "@/lib/format/date";
import type { Feature, Issue, Project, TestCase } from "@/types/domain";

export type IssueRecordListProps = {
  project: Project;
  issues: readonly Issue[];
  features: readonly Feature[];
  testCases: readonly TestCase[];
  hasActiveFilters: boolean;
};

export function IssueRecordList({ project, issues, features, testCases, hasActiveFilters }: IssueRecordListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [rerunDialogOpen, setRerunDialogOpen] = useState(false);

  function toggle(publicId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(publicId);
      else next.delete(publicId);
      return next;
    });
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        icon="issues"
        title={hasActiveFilters ? "No issues match these filters" : "No issues recorded"}
        description={
          hasActiveFilters
            ? "Try a different search term or clear the filters above."
            : "Issues are created directly from failed test results and closed only upon passing reruns."
        }
        action={
          hasActiveFilters ? (
            <Button intent="secondary" onClick={() => router.replace(window.location.pathname)}>
              Clear filters
            </Button>
          ) : (
            <Button asChild intent="primary">
              <Link href={`/projects/${project.slug}/test-runs`}>
                <Icon name="testRuns" size={16} />
                <span>Go to test runs</span>
              </Link>
            </Button>
          )
        }
      />
    );
  }

  const readyIds = Array.from(selected).filter((publicId) => {
    const issue = issues.find((i) => i.publicId === publicId);
    return issue?.status === "readyForRetest";
  });

  return (
    <div className="flex flex-col gap-4">
      {readyIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-strong bg-inset/50 px-4 py-2.5">
          <span className="text-body-sm font-medium text-foreground">
            {readyIds.length} ready for retest selected
          </span>
          <Button type="button" intent="secondary" size="sm" onClick={() => setRerunDialogOpen(true)}>
            <Icon name="testRuns" size={14} />
            <span>Create focused rerun</span>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col divide-y divide-subtle rounded-lg border border-subtle bg-surface shadow-sm">
        {issues.map((issue) => {
          const statusDef = issueStatuses[issue.status];
          const feature = features.find((f) => f.id === issue.featureId);
          const testCase = testCases.find((tc) => tc.id === issue.testCaseId);
          const canSelect = issue.status === "readyForRetest";

          return (
            <div key={issue.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-start gap-3 sm:pt-0.5">
                <Checkbox
                  label={`Select ${issue.publicId}`}
                  hideLabel
                  checked={selected.has(issue.publicId)}
                  disabled={!canSelect}
                  onCheckedChange={(checked) => toggle(issue.publicId, checked === true)}
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/projects/${project.slug}/issues/${issue.publicId}`}
                    className="text-mono-sm font-semibold text-foreground-muted hover:text-foreground"
                  >
                    {issue.publicId}
                  </Link>
                  <Link
                    href={`/projects/${project.slug}/issues/${issue.publicId}`}
                    className="text-body font-medium text-foreground hover:underline"
                  >
                    {issue.title}
                  </Link>
                  <StatusBadge status={statusDef} />
                  <RiskMark risk={issue.severity} />
                  <SourceBadge source={issue.createdBySource} />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {feature ? (
                    <EntityLink
                      publicId={feature.publicId}
                      title={feature.name}
                      icon="features"
                      href={`/projects/${project.slug}/features/${feature.publicId}`}
                    />
                  ) : null}
                  {testCase ? <EntityLink publicId={testCase.publicId} icon="testCases" title={testCase.title} /> : null}
                </div>

                <p className="text-body-sm text-foreground-muted">
                  Opened by {issue.createdByName} · {formatRelativeTime(issue.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                <Button asChild intent="secondary" size="sm">
                  <Link href={`/projects/${project.slug}/issues/${issue.publicId}`}>
                    <span>View</span>
                    <Icon name="chevronRight" size={14} />
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={rerunDialogOpen} onOpenChange={setRerunDialogOpen}>
        <DialogContent title="Create focused rerun" description={`${readyIds.length} issue${readyIds.length === 1 ? "" : "s"} selected`}>
          <CreateFocusedRerunForm
            projectSlug={project.slug}
            projectEnvironment={project.environment}
            issuePublicIds={readyIds}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
