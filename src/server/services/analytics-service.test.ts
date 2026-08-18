import { describe, expect, it } from "vitest";

import type { ProjectRecords } from "@/server/services/project-service";
import type { ActivityEvent, Feature, Issue, Project, TestCase, TestResult, TestRun } from "@/types/domain";

import { getProjectAnalytics } from "./analytics-service";

const project: Project = {
  id: "proj-1",
  publicId: "TEST",
  slug: "test-project",
  ownerId: "user-1",
  name: "Test Project",
  description: "A project for analytics tests.",
  appUrl: "https://example.com",
  environment: "staging",
  archived: false,
  setupStepsCompleted: 7,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: overrides.id ?? "feat-1",
    publicId: overrides.publicId ?? "FEAT-01",
    projectId: project.id,
    name: "Sample Feature",
    description: "Does something.",
    status: "approved",
    risk: "high",
    acceptanceCriteria: ["Works."],
    roles: [],
    dependencies: [],
    sourceReferences: [],
    createdBySource: "claude",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: overrides.id ?? "tc-1",
    publicId: overrides.publicId ?? "FEAT-01-01",
    projectId: project.id,
    featureId: "feat-1",
    title: "Sample case",
    status: "ready",
    priority: "high",
    steps: ["Do it."],
    expectedResult: "It works.",
    roles: [],
    environments: [],
    createdBySource: "claude",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeTestRun(overrides: Partial<TestRun> = {}): TestRun {
  return {
    id: overrides.id ?? "run-1",
    publicId: overrides.publicId ?? "RUN-01",
    projectId: project.id,
    name: "Run 1",
    status: "completed",
    build: "1.0.0",
    environment: "Staging",
    browser: "Chrome",
    executionMode: "manual",
    selectedTestCaseIds: ["tc-1"],
    createdBySource: "human",
    createdByName: "Tester",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    completedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeTestResult(overrides: Partial<TestResult> = {}): TestResult {
  return {
    id: overrides.id ?? "result-1",
    testRunId: "run-1",
    testCaseId: "tc-1",
    status: "pass",
    evidence: [],
    recordedBySource: "human",
    recordedByName: "Tester",
    recordedAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: overrides.id ?? "issue-1",
    publicId: overrides.publicId ?? "ISS-01",
    projectId: project.id,
    featureId: "feat-1",
    testCaseId: "tc-1",
    originResultId: "result-fail-1",
    title: "Something broke",
    status: "open",
    severity: "high",
    createdBySource: "human",
    createdByName: "Tester",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeActivity(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: overrides.id ?? "activity-1",
    projectId: project.id,
    actorType: "system",
    actorName: "Veriqo",
    action: "did something",
    entityType: "issue",
    entityId: "issue-1",
    createdAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function makeRecords(overrides: Partial<ProjectRecords> = {}): ProjectRecords {
  return {
    project,
    features: [],
    testCases: [],
    testRuns: [],
    testResults: [],
    issues: [],
    activity: [],
    ...overrides,
  };
}

describe("analytics-service — empty project", () => {
  it("returns graceful empty states rather than fabricated numbers", () => {
    const analytics = getProjectAnalytics(makeRecords());
    expect(analytics.passRateTrend).toEqual([]);
    expect(analytics.failuresByModule).toEqual([]);
    expect(analytics.severityDistribution.every((s) => s.count === 0)).toBe(true);
    expect(analytics.fixVerification.averageHours).toBeNull();
    expect(analytics.reopenedRate.ratePercent).toBeNull();
    expect(analytics.sourceBreakdown.humanCount).toBe(0);
    expect(analytics.sourceBreakdown.claudeCount).toBe(0);
  });
});

describe("analytics-service — pass rate trend", () => {
  it("computes one point per run with results, in run order, excluding notRun", () => {
    const records = makeRecords({
      testRuns: [
        makeTestRun({ id: "run-1", publicId: "RUN-01", createdAt: "2026-01-01T00:00:00.000Z", completedAt: "2026-01-01T01:00:00.000Z" }),
        makeTestRun({ id: "run-2", publicId: "RUN-02", createdAt: "2026-01-05T00:00:00.000Z", completedAt: "2026-01-05T01:00:00.000Z" }),
      ],
      testResults: [
        makeTestResult({ id: "r1", testRunId: "run-1", status: "pass" }),
        makeTestResult({ id: "r2", testRunId: "run-1", testCaseId: "tc-2", status: "fail" }),
        makeTestResult({ id: "r3", testRunId: "run-1", testCaseId: "tc-3", status: "notRun" }),
        makeTestResult({ id: "r4", testRunId: "run-2", status: "pass" }),
      ],
    });
    const { passRateTrend } = getProjectAnalytics(records);
    expect(passRateTrend).toHaveLength(2);
    expect(passRateTrend[0]).toMatchObject({ runPublicId: "RUN-01", passRatePercent: 50, totalApplicable: 2 });
    expect(passRateTrend[1]).toMatchObject({ runPublicId: "RUN-02", passRatePercent: 100, totalApplicable: 1 });
  });

  it("skips runs with no recorded (non-notRun) results", () => {
    const records = makeRecords({
      testRuns: [makeTestRun()],
      testResults: [makeTestResult({ status: "notRun" })],
    });
    expect(getProjectAnalytics(records).passRateTrend).toEqual([]);
  });
});

describe("analytics-service — failures by module", () => {
  it("groups fail results by feature and sorts by count descending", () => {
    const records = makeRecords({
      features: [makeFeature({ id: "feat-a", publicId: "FEAT-A", name: "Alpha" }), makeFeature({ id: "feat-b", publicId: "FEAT-B", name: "Beta" })],
      testCases: [
        makeTestCase({ id: "tc-a", featureId: "feat-a" }),
        makeTestCase({ id: "tc-b", featureId: "feat-b" }),
      ],
      testResults: [
        makeTestResult({ id: "r1", testCaseId: "tc-a", status: "fail" }),
        makeTestResult({ id: "r2", testCaseId: "tc-a", status: "fail" }),
        makeTestResult({ id: "r3", testCaseId: "tc-b", status: "fail" }),
        makeTestResult({ id: "r4", testCaseId: "tc-a", status: "pass" }),
      ],
    });
    const { failuresByModule } = getProjectAnalytics(records);
    expect(failuresByModule[0]).toMatchObject({ featureName: "Alpha", failCount: 2 });
    expect(failuresByModule[1]).toMatchObject({ featureName: "Beta", failCount: 1 });
  });
});

describe("analytics-service — severity distribution", () => {
  it("counts only currently-open (non-verified) issues", () => {
    const records = makeRecords({
      issues: [
        makeIssue({ id: "i1", severity: "high", status: "open" }),
        makeIssue({ id: "i2", severity: "high", status: "verified" }),
        makeIssue({ id: "i3", severity: "medium", status: "investigating" }),
      ],
    });
    const { severityDistribution } = getProjectAnalytics(records);
    expect(severityDistribution.find((s) => s.severity === "high")?.count).toBe(1);
    expect(severityDistribution.find((s) => s.severity === "medium")?.count).toBe(1);
    expect(severityDistribution.find((s) => s.severity === "low")?.count).toBe(0);
  });
});

describe("analytics-service — fix-to-verification time", () => {
  it("averages the time from created to verified across verified issues only", () => {
    const records = makeRecords({
      issues: [
        makeIssue({ id: "i1", status: "verified", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }), // 24h
        makeIssue({ id: "i2", status: "verified", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T12:00:00.000Z" }), // 12h
        makeIssue({ id: "i3", status: "open", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T01:00:00.000Z" }),
      ],
    });
    const { fixVerification } = getProjectAnalytics(records);
    expect(fixVerification.verifiedCount).toBe(2);
    expect(fixVerification.averageHours).toBe(18);
  });
});

describe("analytics-service — reopened issue rate", () => {
  it("computes the share of resolved-cycle issues that were ever reopened", () => {
    const records = makeRecords({
      issues: [
        makeIssue({ id: "i1", status: "verified" }),
        makeIssue({ id: "i2", status: "verified" }),
        makeIssue({ id: "i3", status: "reopened" }),
      ],
      activity: [makeActivity({ entityType: "issue", entityId: "i3", action: "reopened ISS-03 — the rerun did not pass" })],
    });
    const { reopenedRate } = getProjectAnalytics(records);
    expect(reopenedRate.resolvedCycleCount).toBe(3);
    expect(reopenedRate.reopenedCount).toBe(1);
    expect(reopenedRate.ratePercent).toBe(33);
  });

  it("ignores in-flight issues that never reached verified or reopened", () => {
    const records = makeRecords({ issues: [makeIssue({ id: "i1", status: "investigating" })] });
    const { reopenedRate } = getProjectAnalytics(records);
    expect(reopenedRate.resolvedCycleCount).toBe(0);
    expect(reopenedRate.ratePercent).toBeNull();
  });
});

describe("analytics-service — human vs Claude breakdown", () => {
  it("counts recorded results by source and computes percentages", () => {
    const records = makeRecords({
      testResults: [
        makeTestResult({ id: "r1", recordedBySource: "human" }),
        makeTestResult({ id: "r2", recordedBySource: "human" }),
        makeTestResult({ id: "r3", recordedBySource: "claude" }),
        makeTestResult({ id: "r4", recordedBySource: "system", status: "notRun" }),
      ],
    });
    const { sourceBreakdown } = getProjectAnalytics(records);
    expect(sourceBreakdown.humanCount).toBe(2);
    expect(sourceBreakdown.claudeCount).toBe(1);
    expect(sourceBreakdown.humanPercent).toBe(67);
    expect(sourceBreakdown.claudePercent).toBe(33);
  });
});
