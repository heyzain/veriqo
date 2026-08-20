import Link from "next/link";

import { ExecutionModeBadge } from "@/components/shared/execution-mode-badge";
import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { testRunStatuses } from "@/config/status.config";
import { RunLifecycleActions } from "@/features/test-runs/components/run-lifecycle-actions";
import { RunProgressBar } from "@/features/test-runs/components/run-progress-bar";
import { formatRelativeTime } from "@/lib/format/date";
import type { TestRunSummary } from "@/server/services/test-run-service";

export type TestRunListProps = {
  projectSlug: string;
  runs: readonly TestRunSummary[];
  hasActiveFilters: boolean;
};

export function TestRunList({ projectSlug, runs, hasActiveFilters }: TestRunListProps) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon="testRuns"
        title={hasActiveFilters ? "No test runs match these filters" : "No test runs recorded"}
        description={
          hasActiveFilters
            ? "Try a different search term or clear the filters above."
            : "Create your first test run to execute test cases against a target release build."
        }
        action={
          hasActiveFilters ? undefined : (
            <Button asChild intent="primary">
              <Link href={`/projects/${projectSlug}/test-runs/new`}>
                <Icon name="plus" size={16} />
                <span>New test run</span>
              </Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {runs.map(({ testRun, progress }) => {
        const statusDef = testRunStatuses[testRun.status];

        return (
          <div
            key={testRun.id}
            className="flex flex-col gap-4 rounded-lg border border-subtle bg-surface p-5 shadow-sm transition-fast hover:border-strong"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}
                    className="text-mono-sm font-semibold text-foreground hover:underline"
                  >
                    {testRun.publicId}
                  </Link>
                  <Link
                    href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}
                    className="text-title-md text-foreground hover:underline"
                  >
                    {testRun.name}
                  </Link>
                  <StatusBadge status={statusDef} />
                  {testRun.executionMode !== "manual" ? <ExecutionModeBadge mode={testRun.executionMode} /> : null}
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-foreground-muted">
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
                      <span>{testRun.assigneeName}</span>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                {testRun.executionMode !== "manual" &&
                testRun.status !== "completed" &&
                testRun.status !== "needsAttention" ? (
                  <Button asChild intent="secondary" size="sm">
                    <Link href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}>
                      <span>View</span>
                      <Icon name="chevronRight" size={14} />
                    </Link>
                  </Button>
                ) : (
                  <RunLifecycleActions projectSlug={projectSlug} testRun={testRun} context="list" />
                )}
              </div>
            </div>

            <RunProgressBar progress={progress} />

            <div className="flex flex-wrap items-center gap-2 border-t border-subtle pt-3 text-body-sm text-foreground-muted">
              <SourceBadge source={testRun.createdBySource} />
              <span>Created by {testRun.createdByName}</span>
              <span aria-hidden="true">•</span>
              <span>{formatRelativeTime(testRun.createdAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
