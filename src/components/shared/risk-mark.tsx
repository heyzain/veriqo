import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "@/types/domain";

const riskTone = {
  high: "fail",
  medium: "partial",
  low: "neutral",
} as const;

export type RiskMarkProps = {
  risk: RiskLevel;
  className?: string;
};

/** The one place risk-level → badge tone is decided (`RiskMark` in 01-DESIGN-SYSTEM.md). */
export function RiskMark({ risk, className }: RiskMarkProps) {
  return (
    <Badge tone={riskTone[risk]} className={className}>
      {risk} risk
    </Badge>
  );
}
