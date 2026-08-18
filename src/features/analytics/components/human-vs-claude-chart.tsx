import Link from "next/link";

import type { SourceBreakdown } from "@/server/services/analytics-service";

export type HumanVsClaudeChartProps = {
  breakdown: SourceBreakdown;
};

/**
 * Human- versus Claude-recorded results — identity, not magnitude, so each
 * side keeps a fixed, reserved tone: `progress` for human, `ai` for Claude
 * (the same violet `SourceBadge` uses for Claude everywhere else).
 */
export function HumanVsClaudeChart({ breakdown }: HumanVsClaudeChartProps) {
  const total = breakdown.humanCount + breakdown.claudeCount;

  if (total === 0) {
    return <p className="text-body-sm text-foreground-muted">No results recorded yet.</p>;
  }

  return (
    <Link href={breakdown.href} className="group flex flex-col gap-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-pill bg-inset">
        {breakdown.humanCount > 0 ? (
          <div className="bg-progress" style={{ width: `${breakdown.humanPercent}%` }} title={`Human: ${breakdown.humanCount}`} />
        ) : null}
        {breakdown.claudeCount > 0 ? (
          <div className="bg-ai" style={{ width: `${breakdown.claudePercent}%` }} title={`Claude: ${breakdown.claudeCount}`} />
        ) : null}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-body-sm text-foreground-muted group-hover:text-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-pill bg-progress" />
          Human ({breakdown.humanCount} · {breakdown.humanPercent}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-pill bg-ai" />
          Claude ({breakdown.claudeCount} · {breakdown.claudePercent}%)
        </span>
      </div>
    </Link>
  );
}
