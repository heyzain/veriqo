import { testCaseStatuses, type TestCaseStatus } from "@/config/status.config";
import { cn } from "@/lib/utils/cn";
import type { TestCase } from "@/types/domain";

const toneToBarClass: Record<string, string> = {
  pass: "bg-pass",
  fail: "bg-fail",
  partial: "bg-partial",
  blocked: "bg-blocked",
  progress: "bg-progress",
  ai: "bg-ai",
  neutral: "bg-blocked/40",
};

export type CoverageBarProps = {
  testCases: readonly TestCase[];
  className?: string;
};

/**
 * A feature's test-case coverage as one segmented bar plus a compact legend
 * — never a bare number (`CoverageBar` in 01-DESIGN-SYSTEM.md). Segment
 * widths are proportional to each test-case status's share of the total.
 */
export function CoverageBar({ testCases, className }: CoverageBarProps) {
  if (testCases.length === 0) {
    return <p className="text-body-sm text-foreground-muted">No test cases yet.</p>;
  }

  const counts = new Map<TestCaseStatus, number>();
  for (const testCase of testCases) {
    counts.set(testCase.status, (counts.get(testCase.status) ?? 0) + 1);
  }

  const segments = Array.from(counts.entries()).filter(([, count]) => count > 0);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-pill bg-inset">
        {segments.map(([status, count]) => (
          <div
            key={status}
            className={toneToBarClass[testCaseStatuses[status].tone]}
            style={{ width: `${(count / testCases.length) * 100}%` }}
            title={`${testCaseStatuses[status].label}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {segments.map(([status, count]) => (
          <span key={status} className="flex items-center gap-1.5 text-body-sm text-foreground-muted">
            <span className={cn("h-2 w-2 rounded-pill", toneToBarClass[testCaseStatuses[status].tone])} />
            {testCaseStatuses[status].label} ({count})
          </span>
        ))}
      </div>
    </div>
  );
}
