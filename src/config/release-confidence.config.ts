/**
 * Weights for the explainable release-confidence score
 * (04-CONFIG-BLUEPRINT.md, "Release-confidence configuration"). Kept here so
 * tuning the model doesn't mean hunting through
 * `release-confidence-service.ts` — the service still owns the calculation
 * and, per the blueprint, the UI must always show the contributing reasons
 * rather than the number alone.
 */
export const releaseConfidenceConfig = {
  /** How much a fully-missing factor can cost, in points out of 100. */
  maxDeduction: {
    coverageGap: 25,
    passRateGap: 25,
  },
  /** Points deducted per occurrence, and the ceiling on that running total. */
  perOccurrence: {
    highSeverityIssue: { points: 8, cap: 32 },
    blockedHighRiskTest: { points: 6, cap: 24 },
    staleCoverageFeature: { points: 4, cap: 16 },
    fixAwaitingRetest: { points: 3, cap: 15 },
    pendingHumanReview: { points: 2, cap: 10 },
  },
  /** A high-risk feature counts 3x as much as low risk toward coverage — losing it costs more. */
  riskWeight: {
    high: 3,
    medium: 2,
    low: 1,
  },
  /** Score bands — a calm three-way read, never a bare number alone. */
  bands: [
    { key: "confident", min: 80, label: "Confident", tone: "pass" },
    { key: "caution", min: 55, label: "Needs caution", tone: "partial" },
    { key: "atRisk", min: 0, label: "At risk", tone: "fail" },
  ],
} as const;
