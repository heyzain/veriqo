import "server-only";

import type { StatusTone } from "@/config/status.config";
import type { ProjectRecords } from "@/server/services/project-service";
import type { RiskLevel } from "@/types/domain";

/**
 * Analytics for the release-decision picture (Phase 9 Build). Every figure
 * here is computed from real records and carries a drill-down `href` — none
 * of it is a bare number without an action (03-CLAUDE-RULES.md, "No random
 * dashboard metrics").
 */

function projectPath(slug: string, suffix: string): string {
  return `/projects/${slug}${suffix}`;
}

export type PassRateTrendPoint = {
  runPublicId: string;
  runName: string;
  dateIso: string;
  passRatePercent: number;
  totalApplicable: number;
  href: string;
};

export type ModuleFailureCount = {
  featurePublicId: string;
  featureName: string;
  failCount: number;
  href: string;
};

export type SeverityCount = {
  severity: RiskLevel;
  label: string;
  count: number;
  tone: StatusTone;
  href: string;
};

export type FixVerificationStat = {
  averageHours: number | null;
  verifiedCount: number;
  href: string;
};

export type ReopenedRateStat = {
  ratePercent: number | null;
  reopenedCount: number;
  resolvedCycleCount: number;
  href: string;
};

export type SourceBreakdown = {
  humanCount: number;
  claudeCount: number;
  humanPercent: number;
  claudePercent: number;
  href: string;
};

export type ProjectAnalytics = {
  passRateTrend: PassRateTrendPoint[];
  failuresByModule: ModuleFailureCount[];
  severityDistribution: SeverityCount[];
  fixVerification: FixVerificationStat;
  reopenedRate: ReopenedRateStat;
  sourceBreakdown: SourceBreakdown;
};

export function getProjectAnalytics(records: ProjectRecords): ProjectAnalytics {
  const { project, features, testCases, testRuns, testResults, issues, activity } = records;

  // ---- Pass-rate trend: one point per run that has at least one recorded result, in run order ----
  const passRateTrend: PassRateTrendPoint[] = [];
  for (const run of [...testRuns].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())) {
    const results = testResults.filter((r) => r.testRunId === run.id && r.status !== "notRun");
    if (results.length === 0) continue;
    const passCount = results.filter((r) => r.status === "pass").length;
    passRateTrend.push({
      runPublicId: run.publicId,
      runName: run.name,
      dateIso: run.completedAt ?? run.updatedAt,
      passRatePercent: Math.round((passCount / results.length) * 100),
      totalApplicable: results.length,
      href: projectPath(project.slug, `/test-runs/${run.publicId}`),
    });
  }

  // ---- Failure by module (feature) ----
  const failuresByFeatureId = new Map<string, number>();
  for (const result of testResults) {
    if (result.status !== "fail") continue;
    const testCase = testCases.find((tc) => tc.id === result.testCaseId);
    if (!testCase) continue;
    failuresByFeatureId.set(testCase.featureId, (failuresByFeatureId.get(testCase.featureId) ?? 0) + 1);
  }
  const failuresByModule: ModuleFailureCount[] = Array.from(failuresByFeatureId.entries())
    .map(([featureId, failCount]) => {
      const feature = features.find((f) => f.id === featureId);
      return feature
        ? {
            featurePublicId: feature.publicId,
            featureName: feature.name,
            failCount,
            href: projectPath(project.slug, `/features/${feature.publicId}`),
          }
        : null;
    })
    .filter((entry): entry is ModuleFailureCount => entry !== null)
    .sort((a, b) => b.failCount - a.failCount)
    .slice(0, 8);

  // ---- Severity distribution, among currently-open issues ----
  const openIssues = issues.filter((i) => i.status !== "verified");
  const severityTone: Record<RiskLevel, StatusTone> = { high: "fail", medium: "partial", low: "neutral" };
  const severityDistribution: SeverityCount[] = (["high", "medium", "low"] as const).map((severity) => ({
    severity,
    label: severity.charAt(0).toUpperCase() + severity.slice(1),
    count: openIssues.filter((i) => i.severity === severity).length,
    tone: severityTone[severity],
    href: projectPath(project.slug, `/issues?severity=${severity}`),
  }));

  // ---- Fix-to-verification time ----
  const verifiedIssues = issues.filter((i) => i.status === "verified");
  const verificationHours = verifiedIssues.map(
    (i) => (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60),
  );
  const fixVerification: FixVerificationStat = {
    averageHours: verificationHours.length > 0 ? verificationHours.reduce((sum, h) => sum + h, 0) / verificationHours.length : null,
    verifiedCount: verifiedIssues.length,
    href: projectPath(project.slug, "/issues?status=verified"),
  };

  // ---- Reopened issue rate — of issues that completed at least one retest cycle, how many needed more than one ----
  const reopenedIssueIds = new Set(
    activity.filter((event) => event.entityType === "issue" && event.action.includes("reopened")).map((event) => event.entityId),
  );
  const resolvedCycleIssues = issues.filter((i) => i.status === "verified" || reopenedIssueIds.has(i.id));
  const reopenedCount = resolvedCycleIssues.filter((i) => reopenedIssueIds.has(i.id)).length;
  const reopenedRate: ReopenedRateStat = {
    ratePercent: resolvedCycleIssues.length > 0 ? Math.round((reopenedCount / resolvedCycleIssues.length) * 100) : null,
    reopenedCount,
    resolvedCycleCount: resolvedCycleIssues.length,
    href: projectPath(project.slug, "/issues?status=reopened"),
  };

  // ---- Human vs Claude-assisted breakdown, of every recorded (non-placeholder) result ----
  const recordedResults = testResults.filter((r) => r.recordedBySource === "human" || r.recordedBySource === "claude");
  const humanCount = recordedResults.filter((r) => r.recordedBySource === "human").length;
  const claudeCount = recordedResults.filter((r) => r.recordedBySource === "claude").length;
  const recordedTotal = humanCount + claudeCount;
  const sourceBreakdown: SourceBreakdown = {
    humanCount,
    claudeCount,
    humanPercent: recordedTotal > 0 ? Math.round((humanCount / recordedTotal) * 100) : 0,
    claudePercent: recordedTotal > 0 ? Math.round((claudeCount / recordedTotal) * 100) : 0,
    href: projectPath(project.slug, "/test-runs"),
  };

  return { passRateTrend, failuresByModule, severityDistribution, fixVerification, reopenedRate, sourceBreakdown };
}
