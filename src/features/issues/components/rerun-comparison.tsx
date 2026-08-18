import Link from "next/link";

import { EvidenceGallery } from "@/components/shared/evidence-gallery";
import { StatusBadge } from "@/components/shared/status-badge";
import { Icon } from "@/components/ui/icon";
import { resultStatuses } from "@/config/status.config";
import { formatDateTime } from "@/lib/format/date";
import type { TestResult, TestRun } from "@/types/domain";

export type RerunComparisonProps = {
  projectSlug: string;
  originResult: TestResult;
  originTestRun: TestRun | null;
  rerunResult: TestResult | null;
  rerunTestRun: TestRun | null;
};

function ResultColumn({
  label,
  icon,
  testRun,
  result,
  projectSlug,
  emptyMessage,
}: {
  label: string;
  icon: "fail" | "approved";
  testRun: TestRun | null;
  result: TestResult | null;
  projectSlug: string;
  emptyMessage: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-md border border-subtle bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-label-style text-foreground-muted">
          <Icon name={icon} size={13} />
          {label}
        </span>
        {result ? <StatusBadge status={resultStatuses[result.status]} /> : null}
      </div>

      {testRun ? (
        <Link
          href={`/projects/${projectSlug}/test-runs/${testRun.publicId}`}
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-body-sm text-foreground-muted hover:text-foreground"
        >
          <span className="text-mono-sm font-semibold">{testRun.publicId}</span>
          <span>{testRun.build}</span>
          <span aria-hidden="true">·</span>
          <span>{testRun.environment}</span>
          <span aria-hidden="true">·</span>
          <span>{testRun.browser}</span>
        </Link>
      ) : null}

      {result ? (
        <>
          {result.actualResult ? (
            <p className="text-body-sm text-foreground-secondary">{result.actualResult}</p>
          ) : (
            <p className="text-body-sm text-foreground-muted">No notes recorded.</p>
          )}
          <EvidenceGallery evidence={result.evidence} emptyMessage="No evidence attached." />
          <p className="text-body-sm text-[12px] text-foreground-muted">{formatDateTime(result.recordedAt)}</p>
        </>
      ) : (
        <p className="text-body-sm text-foreground-muted">{emptyMessage}</p>
      )}
    </div>
  );
}

/**
 * `RerunComparison` (01-DESIGN-SYSTEM.md, "Product components") — the
 * original failure and the rerun side by side in one view, per "Display
 * original failure and rerun comparison in the same view" (Phase 7's Issues
 * screen spec).
 */
export function RerunComparison({ projectSlug, originResult, originTestRun, rerunResult, rerunTestRun }: RerunComparisonProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <ResultColumn
        label="Original failure"
        icon="fail"
        testRun={originTestRun}
        result={originResult}
        projectSlug={projectSlug}
        emptyMessage="No origin result recorded."
      />
      <div className="flex items-center justify-center px-1 text-foreground-muted">
        <Icon name="chevronRight" size={16} className="hidden sm:block" />
      </div>
      <ResultColumn
        label="Rerun"
        icon="approved"
        testRun={rerunTestRun}
        result={rerunResult}
        projectSlug={projectSlug}
        emptyMessage={rerunTestRun ? "Rerun created — no result recorded yet." : "No rerun created yet."}
      />
    </div>
  );
}
