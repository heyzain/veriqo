import { resultStatuses, type ResultStatus } from "@/config/status.config";
import { cn } from "@/lib/utils/cn";
import type { RunProgress } from "@/server/services/test-run-service";

const toneToBarClass: Record<string, string> = {
  pass: "bg-pass",
  fail: "bg-fail",
  partial: "bg-partial",
  blocked: "bg-blocked",
  progress: "bg-progress",
  ai: "bg-ai",
  neutral: "bg-blocked/40",
};

const orderedStatuses: readonly ResultStatus[] = ["pass", "fail", "partial", "blocked", "notRun"];

export type RunProgressBarProps = {
  progress: RunProgress;
  className?: string;
  /** Bar only, no legend — for compact contexts like a run list row. */
  compact?: boolean;
};

/**
 * A run's result mix as one segmented bar plus a compact legend — the same
 * "never a bare number" treatment `CoverageBar` gives feature coverage
 * (01-DESIGN-SYSTEM.md, "Run progress and result aggregation").
 */
export function RunProgressBar({ progress, className, compact }: RunProgressBarProps) {
  if (progress.total === 0) {
    return <p className="text-body-sm text-foreground-muted">No test cases in this run.</p>;
  }

  const segments = orderedStatuses
    .map((status) => [status, progress[status]] as const)
    .filter(([, count]) => count > 0);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className={cn("flex w-full overflow-hidden rounded-pill bg-inset", compact ? "h-1.5" : "h-2.5")}>
        {segments.map(([status, count]) => (
          <div
            key={status}
            className={toneToBarClass[resultStatuses[status].tone]}
            style={{ width: `${(count / progress.total) * 100}%` }}
            title={`${resultStatuses[status].label}: ${count}`}
          />
        ))}
      </div>
      {!compact ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {segments.map(([status, count]) => (
            <span key={status} className="flex items-center gap-1.5 text-body-sm text-foreground-muted">
              <span className={cn("h-2 w-2 rounded-pill", toneToBarClass[resultStatuses[status].tone])} />
              {resultStatuses[status].label} ({count})
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
