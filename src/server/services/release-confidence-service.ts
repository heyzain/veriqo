import "server-only";

import { releaseConfidenceConfig } from "@/config/release-confidence.config";
import type { StatusTone } from "@/config/status.config";
import type { IconName } from "@/components/ui/icon";
import type { ProjectRecords } from "@/server/services/project-service";
import type { Feature, Issue, TestResult } from "@/types/domain";

/**
 * The explainable release-confidence engine (Phase 9; 04-CONFIG-BLUEPRINT.md,
 * "Release-confidence configuration"). Every point lost is attributed to a
 * real, named factor with a deep link into the records that caused it — the
 * UI never shows the score as objective truth on its own
 * (00-PRODUCT.md, "Evidence over confidence theater").
 */

export type ConfidenceFactor = {
  key: string;
  label: string;
  detail: string;
  tone: StatusTone;
  /** Points deducted by this factor, 0 when it isn't currently a problem. */
  impact: number;
  href: string;
};

export type ConfidenceBand = "confident" | "caution" | "atRisk";

export type ReleaseConfidence = {
  score: number;
  band: ConfidenceBand;
  bandLabel: string;
  bandTone: StatusTone;
  factors: ConfidenceFactor[];
};

export type NextAction = {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  tone: StatusTone;
};

export type ReleaseReadiness = {
  confidence: ReleaseConfidence;
  nextAction: NextAction;
};

function projectPath(slug: string, suffix: string): string {
  return `/projects/${slug}${suffix}`;
}

/** The most recent recorded (non-`notRun`) result per test case — "applicable" coverage instead of every historical attempt. */
function latestResultByCase(testResults: readonly TestResult[]): Map<string, TestResult> {
  const latest = new Map<string, TestResult>();
  for (const result of testResults) {
    if (result.status === "notRun") continue;
    const existing = latest.get(result.testCaseId);
    if (!existing || new Date(result.recordedAt).getTime() > new Date(existing.recordedAt).getTime()) {
      latest.set(result.testCaseId, result);
    }
  }
  return latest;
}

function capped(count: number, perOccurrence: number, cap: number): number {
  return Math.min(count * perOccurrence, cap);
}

export function getReleaseReadiness(records: ProjectRecords): ReleaseReadiness {
  const { project, features, testCases, issues, testResults } = records;
  const { maxDeduction, perOccurrence, riskWeight, bands } = releaseConfidenceConfig;

  const activeFeatures = features.filter((f) => f.status !== "archived");
  const highRiskFeatureIds = new Set(activeFeatures.filter((f) => f.risk === "high").map((f) => f.id));
  const latestByCase = latestResultByCase(testResults);

  // ---- 1. Approved coverage, weighted by risk ----
  const totalWeight = activeFeatures.reduce((sum, f) => sum + riskWeight[f.risk], 0);
  const approvedWeight = activeFeatures
    .filter((f) => f.status === "approved")
    .reduce((sum, f) => sum + riskWeight[f.risk], 0);
  const coverageRatio = totalWeight > 0 ? approvedWeight / totalWeight : null;
  const coverageDeduction = coverageRatio === null ? 0 : Math.round((1 - coverageRatio) * maxDeduction.coverageGap);
  const unapprovedFeatures = [...activeFeatures.filter((f) => f.status !== "approved")].sort(
    (a, b) => riskWeight[b.risk] - riskWeight[a.risk],
  );

  const coverageFactor: ConfidenceFactor = {
    key: "coverage",
    label: "Approved feature coverage",
    detail:
      coverageRatio === null
        ? "No features discovered yet."
        : unapprovedFeatures.length === 0
          ? "Every active feature is approved, weighted by risk."
          : `${unapprovedFeatures.length} feature${unapprovedFeatures.length === 1 ? "" : "s"} not yet approved, including ${unapprovedFeatures
              .slice(0, 2)
              .map((f) => f.name)
              .join(", ")}.`,
    tone: coverageDeduction === 0 ? "pass" : coverageDeduction >= maxDeduction.coverageGap / 2 ? "fail" : "partial",
    impact: coverageDeduction,
    href: projectPath(project.slug, "/features?status=needsReview"),
  };

  // ---- 2. Applicable latest pass rate ----
  const readyCaseIds = new Set(testCases.filter((tc) => tc.status === "ready").map((tc) => tc.id));
  const applicableResults = Array.from(latestByCase.entries())
    .filter(([caseId]) => readyCaseIds.has(caseId))
    .map(([, result]) => result);
  const passRate = applicableResults.length > 0 ? applicableResults.filter((r) => r.status === "pass").length / applicableResults.length : null;
  const passRateDeduction = passRate === null ? 0 : Math.round((1 - passRate) * maxDeduction.passRateGap);

  const passRateFactor: ConfidenceFactor = {
    key: "passRate",
    label: "Latest applicable pass rate",
    detail:
      passRate === null
        ? "No ready test cases have been executed yet."
        : `${Math.round(passRate * 100)}% of ${applicableResults.length} ready test case${applicableResults.length === 1 ? "" : "s"} last passed.`,
    tone: passRate === null ? "neutral" : passRate === 1 ? "pass" : passRate >= 0.7 ? "partial" : "fail",
    impact: passRateDeduction,
    href: projectPath(project.slug, "/test-runs"),
  };

  // ---- 3. High-severity open issues ----
  const openHighIssues = issues.filter((i) => i.severity === "high" && i.status !== "verified");
  const highIssueDeduction = capped(openHighIssues.length, perOccurrence.highSeverityIssue.points, perOccurrence.highSeverityIssue.cap);

  const highIssueFactor: ConfidenceFactor = {
    key: "highSeverityIssues",
    label: "High-severity open issues",
    detail:
      openHighIssues.length === 0
        ? "No high-severity issues are open."
        : `${openHighIssues.map((i) => i.publicId).join(", ")} still open.`,
    tone: openHighIssues.length === 0 ? "pass" : "fail",
    impact: highIssueDeduction,
    href: projectPath(project.slug, "/issues?severity=high"),
  };

  // ---- 4. Blocked high-risk tests ----
  const blockedHighRisk = Array.from(latestByCase.entries())
    .filter(([caseId, result]) => {
      if (result.status !== "blocked") return false;
      const testCase = testCases.find((tc) => tc.id === caseId);
      return testCase && highRiskFeatureIds.has(testCase.featureId);
    })
    .map(([, result]) => result);
  const blockedRunIds = new Set(blockedHighRisk.map((r) => r.testRunId));
  const blockedHref =
    blockedRunIds.size === 1
      ? projectPath(project.slug, `/test-runs/${records.testRuns.find((r) => r.id === Array.from(blockedRunIds)[0])?.publicId ?? ""}`)
      : projectPath(project.slug, "/test-runs");
  const blockedDeduction = capped(blockedHighRisk.length, perOccurrence.blockedHighRiskTest.points, perOccurrence.blockedHighRiskTest.cap);

  const blockedFactor: ConfidenceFactor = {
    key: "blockedHighRisk",
    label: "Blocked high-risk tests",
    detail:
      blockedHighRisk.length === 0
        ? "No high-risk test case is currently blocked."
        : `${blockedHighRisk.length} high-risk test case${blockedHighRisk.length === 1 ? " is" : "s are"} blocked.`,
    tone: blockedHighRisk.length === 0 ? "pass" : "fail",
    impact: blockedDeduction,
    href: blockedHref,
  };

  // ---- 5. Changed features with stale (needs-update) coverage ----
  const staleFeatures = activeFeatures.filter(
    (f) => f.status === "changed" && testCases.some((tc) => tc.featureId === f.id && tc.status === "needsUpdate"),
  );
  const staleDeduction = capped(staleFeatures.length, perOccurrence.staleCoverageFeature.points, perOccurrence.staleCoverageFeature.cap);

  const staleFactor: ConfidenceFactor = {
    key: "staleCoverage",
    label: "Stale coverage after feature changes",
    detail:
      staleFeatures.length === 0
        ? "No approved feature has changed since its tests were last reviewed."
        : `${staleFeatures.map((f) => f.publicId).join(", ")} changed — some tests need updating.`,
    tone: staleFeatures.length === 0 ? "pass" : "partial",
    impact: staleDeduction,
    href: projectPath(project.slug, "/test-cases?status=needsUpdate"),
  };

  // ---- 6. Fixes awaiting a retest ----
  const awaitingRetest = issues.filter((i) => i.status === "readyForRetest");
  const awaitingDeduction = capped(awaitingRetest.length, perOccurrence.fixAwaitingRetest.points, perOccurrence.fixAwaitingRetest.cap);

  const awaitingFactor: ConfidenceFactor = {
    key: "awaitingRetest",
    label: "Fixes awaiting a verifying rerun",
    detail:
      awaitingRetest.length === 0
        ? "No fix is waiting on a rerun."
        : `${awaitingRetest.map((i) => i.publicId).join(", ")} ready for retest.`,
    tone: awaitingRetest.length === 0 ? "pass" : "partial",
    impact: awaitingDeduction,
    href: projectPath(project.slug, "/issues?status=readyForRetest"),
  };

  // ---- 7. Results pending human review ----
  const pendingReview = testResults.filter((r) => r.needsHumanReview);
  const pendingReviewRunIds = new Set(pendingReview.map((r) => r.testRunId));
  const pendingReviewHref =
    pendingReviewRunIds.size === 1
      ? projectPath(project.slug, `/test-runs/${records.testRuns.find((r) => r.id === Array.from(pendingReviewRunIds)[0])?.publicId ?? ""}`)
      : projectPath(project.slug, "/test-runs");
  const pendingReviewDeduction = capped(pendingReview.length, perOccurrence.pendingHumanReview.points, perOccurrence.pendingHumanReview.cap);

  const pendingReviewFactor: ConfidenceFactor = {
    key: "pendingReview",
    label: "Claude results pending review",
    detail:
      pendingReview.length === 0
        ? "No Claude-submitted result is waiting on human review."
        : `${pendingReview.length} result${pendingReview.length === 1 ? "" : "s"} flagged for review.`,
    tone: pendingReview.length === 0 ? "pass" : "partial",
    impact: pendingReviewDeduction,
    href: pendingReviewHref,
  };

  const factors = [
    coverageFactor,
    passRateFactor,
    highIssueFactor,
    blockedFactor,
    staleFactor,
    awaitingFactor,
    pendingReviewFactor,
  ];

  const totalDeduction = factors.reduce((sum, f) => sum + f.impact, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));
  const matchedBand = bands.find((b) => score >= b.min) ?? bands[bands.length - 1];

  const confidence: ReleaseConfidence = {
    score,
    band: matchedBand.key,
    bandLabel: matchedBand.label,
    bandTone: matchedBand.tone,
    factors,
  };

  // "Investigate this" only makes sense for an issue that isn't already past
  // that step — one already `readyForRetest` gets its own, more specific
  // branch below rather than being told to investigate again.
  const uninvestigatedHighIssues = openHighIssues.filter((i) => i.status !== "readyForRetest");

  const nextAction = pickNextAction(records, {
    openHighIssues: uninvestigatedHighIssues,
    awaitingRetest,
    pendingReview,
    pendingReviewHref,
    blockedHighRisk,
    blockedHref,
    staleFeatures,
    unapprovedFeatures,
  });

  return { confidence, nextAction };
}

type NextActionInputs = {
  openHighIssues: readonly Issue[];
  awaitingRetest: readonly Issue[];
  pendingReview: readonly TestResult[];
  pendingReviewHref: string;
  blockedHighRisk: readonly TestResult[];
  blockedHref: string;
  staleFeatures: readonly Feature[];
  unapprovedFeatures: readonly Feature[];
};

/**
 * The blockers-and-next-action engine (Phase 9 Build) — picks the single
 * highest-priority thing to do next from the same data the confidence score
 * is built from, in a fixed priority order: an open high-severity failure
 * outranks everything else, then a fix stalled waiting on a rerun, then
 * unreviewed AI results, then blocked coverage, then stale or missing
 * coverage. Never a fabricated recommendation — every branch names the real
 * record behind it.
 */
function pickNextAction(records: ProjectRecords, inputs: NextActionInputs): NextAction {
  const { project, testCases } = records;
  const {
    openHighIssues,
    awaitingRetest,
    pendingReview,
    pendingReviewHref,
    blockedHighRisk,
    blockedHref,
    staleFeatures,
    unapprovedFeatures,
  } = inputs;

  if (openHighIssues.length > 0) {
    const oldest = [...openHighIssues].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    return {
      title: `Investigate ${oldest.publicId}`,
      description: `"${oldest.title}" is the longest-open high-severity issue.`,
      href: projectPath(project.slug, `/issues/${oldest.publicId}`),
      icon: "issues",
      tone: "fail",
    };
  }

  if (awaitingRetest.length > 0) {
    const issue = awaitingRetest[0];
    return {
      title: `Create a focused rerun for ${issue.publicId}`,
      description: `The fix is recorded — a passing rerun is the only thing that can verify it.`,
      href: projectPath(project.slug, `/issues/${issue.publicId}`),
      icon: "testRuns",
      tone: "partial",
    };
  }

  if (pendingReview.length > 0) {
    return {
      title: `Review ${pendingReview.length} Claude-submitted result${pendingReview.length === 1 ? "" : "s"}`,
      description: "Claude flagged these as uncertain — approve, correct, or reject each one.",
      href: pendingReviewHref,
      icon: "claude",
      tone: "partial",
    };
  }

  if (blockedHighRisk.length > 0) {
    return {
      title: `Unblock ${blockedHighRisk.length} high-risk test${blockedHighRisk.length === 1 ? "" : "s"}`,
      description: "These can't confirm pass or fail until whatever is blocking them is resolved.",
      href: blockedHref,
      icon: "blocked",
      tone: "fail",
    };
  }

  if (staleFeatures.length > 0) {
    return {
      title: `Refresh coverage for ${staleFeatures.length} changed feature${staleFeatures.length === 1 ? "" : "s"}`,
      description: `${staleFeatures.map((f) => f.publicId).join(", ")} changed since their tests were last reviewed.`,
      href: projectPath(project.slug, "/test-cases?status=needsUpdate"),
      icon: "changed",
      tone: "partial",
    };
  }

  if (unapprovedFeatures.length > 0) {
    const highRiskPending = unapprovedFeatures.find((f) => f.risk === "high");
    const target = highRiskPending ?? unapprovedFeatures[0];
    return {
      title: `Review ${unapprovedFeatures.length} pending feature${unapprovedFeatures.length === 1 ? "" : "s"}`,
      description: `${target.publicId} — ${target.name} still needs a decision before coverage can be trusted.`,
      href: projectPath(project.slug, "/features?status=needsReview"),
      icon: "features",
      tone: "progress",
    };
  }

  const uncoveredHighRisk = records.features.find(
    (f) =>
      f.status === "approved" &&
      f.risk === "high" &&
      !testCases.some((tc) => tc.featureId === f.id && tc.status !== "archived"),
  );
  if (uncoveredHighRisk) {
    return {
      title: `Generate coverage for ${uncoveredHighRisk.publicId}`,
      description: `${uncoveredHighRisk.name} is approved and high-risk but has no test cases yet.`,
      href: projectPath(project.slug, "/test-cases"),
      icon: "testCases",
      tone: "progress",
    };
  }

  return {
    title: `${project.name} looks ready to release`,
    description: "No open blockers, stalled fixes, or unreviewed results right now.",
    href: projectPath(project.slug, "/analytics"),
    icon: "approved",
    tone: "pass",
  };
}
