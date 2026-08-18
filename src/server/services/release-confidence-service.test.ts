import { describe, expect, it } from "vitest";

import type { ProjectRecords } from "@/server/services/project-service";
import type { Feature, Issue, Project, TestCase, TestResult, TestRun } from "@/types/domain";

import { getReleaseReadiness } from "./release-confidence-service";

const project: Project = {
  id: "proj-1",
  publicId: "TEST",
  slug: "test-project",
  ownerId: "user-1",
  name: "Test Project",
  description: "A project for release-confidence tests.",
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

describe("release-confidence-service — score and factors", () => {
  it("scores a project with nothing recorded as confident, with no fabricated impact", () => {
    const { confidence } = getReleaseReadiness(makeRecords());
    expect(confidence.score).toBe(100);
    expect(confidence.band).toBe("confident");
    expect(confidence.factors.every((f) => f.impact === 0)).toBe(true);
  });

  it("scores a fully covered, fully passing, issue-free project as confident", () => {
    const records = makeRecords({
      features: [makeFeature({ status: "approved" })],
      testCases: [makeTestCase({ status: "ready" })],
      testRuns: [makeTestRun()],
      testResults: [makeTestResult({ status: "pass" })],
    });
    const { confidence } = getReleaseReadiness(records);
    expect(confidence.score).toBe(100);
    expect(confidence.band).toBe("confident");
  });

  it("deducts for an unapproved high-risk feature and links to the features review filter", () => {
    const records = makeRecords({ features: [makeFeature({ status: "needsReview", risk: "high" })] });
    const { confidence } = getReleaseReadiness(records);
    const coverage = confidence.factors.find((f) => f.key === "coverage");
    expect(coverage?.impact).toBeGreaterThan(0);
    expect(coverage?.href).toBe("/projects/test-project/features?status=needsReview");
  });

  it("deducts for each open high-severity issue, capped rather than unbounded", () => {
    const manyIssues = Array.from({ length: 10 }, (_, i) => makeIssue({ id: `iss-${i}`, publicId: `ISS-${i}`, status: "open" }));
    const records = makeRecords({ issues: manyIssues });
    const { confidence } = getReleaseReadiness(records);
    const factor = confidence.factors.find((f) => f.key === "highSeverityIssues");
    expect(factor?.impact).toBe(32); // 10 * 8, capped at 32
    expect(confidence.score).toBeGreaterThanOrEqual(0);
  });

  it("never drops the score below 0 even with overwhelming blockers", () => {
    const manyIssues = Array.from({ length: 50 }, (_, i) => makeIssue({ id: `iss-${i}`, publicId: `ISS-${i}`, status: "open" }));
    const records = makeRecords({
      features: [makeFeature({ status: "needsReview" })],
      issues: manyIssues,
    });
    const { confidence } = getReleaseReadiness(records);
    expect(confidence.score).toBeGreaterThanOrEqual(0);
    expect(confidence.band).toBe("atRisk");
  });

  it("improves after the seeded rerun verification — the PV-07 / ISS-14 story", () => {
    const before = makeRecords({
      features: [makeFeature({ status: "approved", risk: "high" })],
      testCases: [makeTestCase({ status: "ready" })],
      testRuns: [makeTestRun()],
      testResults: [makeTestResult({ status: "fail" })],
      issues: [makeIssue({ status: "open", severity: "high" })],
    });
    const after = makeRecords({
      ...before,
      testResults: [makeTestResult({ status: "pass" })],
      issues: [makeIssue({ status: "verified", severity: "high" })],
    });

    const beforeReadiness = getReleaseReadiness(before);
    const afterReadiness = getReleaseReadiness(after);

    expect(afterReadiness.confidence.score).toBeGreaterThan(beforeReadiness.confidence.score);
    expect(beforeReadiness.nextAction.title).toContain("ISS-01");
    expect(afterReadiness.confidence.factors.find((f) => f.key === "highSeverityIssues")?.impact).toBe(0);
  });
});

describe("release-confidence-service — next action priority", () => {
  it("prioritizes an open high-severity issue over everything else", () => {
    const records = makeRecords({
      issues: [
        makeIssue({ id: "iss-old", publicId: "ISS-OLD", status: "open", createdAt: "2026-01-01T00:00:00.000Z" }),
        makeIssue({ id: "iss-retest", publicId: "ISS-RETEST", status: "readyForRetest", createdAt: "2026-01-05T00:00:00.000Z" }),
      ],
    });
    const { nextAction } = getReleaseReadiness(records);
    expect(nextAction.title).toContain("ISS-OLD");
  });

  it("picks the oldest open high-severity issue when there are several", () => {
    const records = makeRecords({
      issues: [
        makeIssue({ id: "iss-newer", publicId: "ISS-NEW", status: "open", createdAt: "2026-01-05T00:00:00.000Z" }),
        makeIssue({ id: "iss-older", publicId: "ISS-OLDER", status: "open", createdAt: "2026-01-01T00:00:00.000Z" }),
      ],
    });
    const { nextAction } = getReleaseReadiness(records);
    expect(nextAction.title).toContain("ISS-OLDER");
  });

  it("falls back to a fix awaiting retest when there's no open high-severity issue", () => {
    const records = makeRecords({ issues: [makeIssue({ status: "readyForRetest" })] });
    const { nextAction } = getReleaseReadiness(records);
    expect(nextAction.title).toContain("rerun");
  });

  it("falls back to reviewing pending Claude results next", () => {
    const records = makeRecords({
      testRuns: [makeTestRun()],
      testResults: [makeTestResult({ recordedBySource: "claude", needsHumanReview: true })],
    });
    const { nextAction } = getReleaseReadiness(records);
    expect(nextAction.title.toLowerCase()).toContain("review");
  });

  it("reports all-clear when nothing is blocking", () => {
    const { nextAction } = getReleaseReadiness(makeRecords());
    expect(nextAction.tone).toBe("pass");
    expect(nextAction.title).toContain("ready to release");
  });
});
