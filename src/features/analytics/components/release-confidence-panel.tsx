import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";
import type { ReleaseConfidence } from "@/server/services/release-confidence-service";

export type ReleaseConfidencePanelProps = {
  confidence: ReleaseConfidence;
};

const toneDotClass: Record<string, string> = {
  pass: "bg-pass",
  fail: "bg-fail",
  partial: "bg-partial",
  blocked: "bg-blocked",
  progress: "bg-progress",
  ai: "bg-ai",
  neutral: "bg-blocked/40",
};

/**
 * `ReleaseConfidence` (01-DESIGN-SYSTEM.md, "Product components") — the
 * score is never shown as objective truth alone (00-PRODUCT.md, "Evidence
 * over confidence theater"): every factor beneath it is a real, clickable
 * record set, not a fabricated sub-metric (Phase 9 acceptance: "Confidence
 * explanation lists contributing factors").
 */
export function ReleaseConfidencePanel({ confidence }: ReleaseConfidencePanelProps) {
  const { score, bandLabel, bandTone, factors } = confidence;

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-strong bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-eyebrow uppercase tracking-wider text-foreground-muted">Release confidence</span>
        <div className="flex items-baseline gap-3">
          <span className="text-display-md font-serif text-foreground">{score}</span>
          <Badge tone={bandTone}>{bandLabel}</Badge>
        </div>
        <p className="max-w-md text-body-sm text-foreground-muted">
          Weighted from approved coverage, latest results, and open work below — every point traces to a real record.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-subtle border-t border-subtle">
        {factors.map((factor) => (
          <Link
            key={factor.key}
            href={factor.href}
            className="flex items-center justify-between gap-4 py-3 transition-fast hover:bg-inset/30"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-pill", toneDotClass[factor.tone])} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-body-sm font-medium text-foreground">{factor.label}</span>
                <span className="text-body-sm text-foreground-muted">{factor.detail}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="text-mono-sm text-foreground-muted">{factor.impact > 0 ? `-${factor.impact}` : "—"}</span>
              <Icon name="chevronRight" size={14} className="text-foreground-muted" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
