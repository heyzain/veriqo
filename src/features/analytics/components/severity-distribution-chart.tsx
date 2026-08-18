import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import type { SeverityCount } from "@/server/services/analytics-service";

export type SeverityDistributionChartProps = {
  severities: readonly SeverityCount[];
};

const toneBarClass: Record<string, string> = {
  fail: "bg-fail",
  partial: "bg-partial",
  neutral: "bg-blocked/40",
};

/**
 * Severity mix of currently-open issues — status colors already reserved
 * for risk level (`RiskMark`), reused here rather than a fresh palette
 * (01-DESIGN-SYSTEM.md, "Status colors are reserved").
 */
export function SeverityDistributionChart({ severities }: SeverityDistributionChartProps) {
  const total = severities.reduce((sum, s) => sum + s.count, 0);

  if (total === 0) {
    return <p className="text-body-sm text-foreground-muted">No open issues right now.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-2.5 w-full overflow-hidden rounded-pill bg-inset">
        {severities
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.severity}
              className={toneBarClass[s.tone]}
              style={{ width: `${(s.count / total) * 100}%` }}
              title={`${s.label}: ${s.count}`}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {severities.map((s) => (
          <Link
            key={s.severity}
            href={s.href}
            className="flex items-center gap-1.5 text-body-sm text-foreground-muted hover:text-foreground hover:underline"
          >
            <span className={cn("h-2 w-2 rounded-pill", toneBarClass[s.tone])} />
            {s.label} ({s.count})
          </Link>
        ))}
      </div>
    </div>
  );
}
