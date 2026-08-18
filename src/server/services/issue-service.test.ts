import { beforeEach, describe, expect, it } from "vitest";

import { listActivityForProject } from "@/server/repositories/activity-repository";
import { store } from "@/server/repositories/store";
import { approveFeature, createFeatureFromDiscovery } from "@/server/services/feature-service";
import { createProjectForOwner } from "@/server/services/project-service";
import { createTestCaseFromGeneration } from "@/server/services/test-case-service";
import { createTestRun, submitTestResult } from "@/server/services/test-run-service";
import type { PublicUser } from "@/types/auth";

import {
  applyRerunResultToIssues,
  createFocusedRerun,
  createIssueFromFailedResult,
  getIssueDetail,
  listIssuesForProject,
  markIssueReadyForRetest,
  recordIssueFix,
  updateIssueStatus,
} from "./issue-service";

function resetStore() {
  store.users.clear();
  store.usersByEmail.clear();
  store.tokens.clear();
  store.invites.clear();
  store.projects.clear();
  store.features.clear();
  store.testCases.clear();
  store.testRuns.clear();
  store.testResults.clear();
  store.issues.clear();
  store.mcpCredentials.clear();
  store.mcpConnectionStates.clear();
  store.activity.length = 0;
  store.seeded = true; // Skip demo seeding — these tests own their own fixtures.
}

const owner: PublicUser = {
  id: "user-owner",
  name: "Priya",
  email: "owner@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

beforeEach(resetStore);

function makeProject(name: string) {
  return createProjectForOwner(
    { name, description: `Test project ${name}.`, appUrl: "https://example.com", environment: "development" },
    owner,
  );
}

/** A project with a run containing one test case that already failed — enough to open an issue from. */
function makeProjectWithFailure(projectName: string) {
  const project = makeProject(projectName);
  const featureResult = createFeatureFromDiscovery(project, {
    name: "Private Vault",
    description: "PIN-locked vault.",
    risk: "high",
    acceptanceCriteria: ["The vault relocks after the session ends."],
    roles: ["Vault owner"],
    dependencies: [],
    sourceReferences: [{ path: "src/vault.ts" }],
  });
  if (!featureResult.ok) throw new Error("setup failed");
  const approvedFeature = approveFeature(featureResult.data.project, featureResult.data.feature.publicId, owner.name);
  if (!approvedFeature.ok) throw new Error("setup failed");

  const caseResult = createTestCaseFromGeneration(approvedFeature.data.project, {
    featureId: approvedFeature.data.feature.publicId,
    title: "Vault locks after session end",
    priority: "critical",
    steps: ["Unlock the vault.", "End the session.", "Start a new session."],
    expectedResult: "The vault requires the PIN again.",
    roles: ["Vault owner"],
    environments: ["Chrome"],
  });
  if (!caseResult.ok) throw new Error("setup failed");
  const testCase = caseResult.data.testCase;

  const runResult = createTestRun(
    caseResult.data.project,
    { name: "RC1", build: "1.0.0-rc.1", environment: "Staging", browser: "Chrome", testCaseIds: [testCase.publicId] },
    owner.name,
  );
  if (!runResult.ok) throw new Error("setup failed");

  const failResult = submitTestResult(
    runResult.data.project,
    runResult.data.testRun.publicId,
    testCase.publicId,
    { status: "fail", actualResult: "Vault stayed unlocked after a new session started." },
    owner.name,
  );
  if (!failResult.ok) throw new Error("setup failed");

  return { project: runResult.data.project, testCase, testRun: failResult.data.testRun };
}

describe("issue-service — creating from a failed result", () => {
  it("opens an issue in the Open state", () => {
    const { project, testRun, testCase } = makeProjectWithFailure("Alpha");
    const result = createIssueFromFailedResult(
      project,
      testRun.publicId,
      testCase.publicId,
      { title: "Vault stays unlocked", severity: "high" },
      owner.name,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.issue.status).toBe("open");
    expect(result.data.issue.createdBySource).toBe("human");
  });

  it("is idempotent per origin result — never opens a duplicate for the same failure", () => {
    const { project, testRun, testCase } = makeProjectWithFailure("Beta");
    const first = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "A", severity: "high" }, owner.name);
    const second = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "B", severity: "low" }, owner.name);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.data.issue.id).toBe(first.data.issue.id);
    expect(listIssuesForProject(project)).toHaveLength(1);
  });

  it("refuses to open an issue from a passing result", () => {
    const { project, testRun, testCase } = makeProjectWithFailure("Gamma");
    submitTestResult(project, testRun.publicId, testCase.publicId, { status: "pass" }, owner.name);

    const result = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "X", severity: "low" }, owner.name);
    expect(result.ok).toBe(false);
  });

  it("never leaks an issue across projects", () => {
    const { project: projectA, testRun, testCase } = makeProjectWithFailure("Delta");
    const projectB = makeProject("Epsilon");
    createIssueFromFailedResult(projectA, testRun.publicId, testCase.publicId, { title: "X", severity: "high" }, owner.name);

    expect(listIssuesForProject(projectA)).toHaveLength(1);
    expect(listIssuesForProject(projectB)).toHaveLength(0);
  });
});

describe("issue-service — manual lifecycle", () => {
  function makeOpenIssue(projectName: string) {
    const { project, testRun, testCase } = makeProjectWithFailure(projectName);
    const created = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "X", severity: "high" }, owner.name);
    if (!created.ok) throw new Error("setup failed");
    return { project, testRun, testCase, issue: created.data.issue };
  }

  it("moves Open to Investigating, but refuses to skip straight to Fix in progress", () => {
    const { project, issue } = makeOpenIssue("Zeta");

    const skip = updateIssueStatus(project, issue.publicId, "fixInProgress", owner.name);
    expect(skip.ok).toBe(false);

    const investigate = updateIssueStatus(project, issue.publicId, "investigating", owner.name);
    expect(investigate.ok).toBe(true);
    if (!investigate.ok) return;
    expect(investigate.data.issue.status).toBe("investigating");
  });

  it("refuses to record a fix before investigation starts", () => {
    const { project, issue } = makeOpenIssue("Eta");
    const result = recordIssueFix(project, issue.publicId, "Root cause found.", owner.name);
    expect(result.ok).toBe(false);
  });

  it("records a fix once investigating, landing on Fix in progress", () => {
    const { project, issue } = makeOpenIssue("Theta");
    updateIssueStatus(project, issue.publicId, "investigating", owner.name);

    const fixed = recordIssueFix(project, issue.publicId, "Moved the flag to sessionStorage.", owner.name);
    expect(fixed.ok).toBe(true);
    if (!fixed.ok) return;
    expect(fixed.data.issue.status).toBe("fixInProgress");
    expect(fixed.data.issue.fixNote).toBe("Moved the flag to sessionStorage.");
  });

  it("refuses to mark ready for retest without a recorded fix", () => {
    const { project, issue } = makeOpenIssue("Iota");
    updateIssueStatus(project, issue.publicId, "investigating", owner.name);

    const result = markIssueReadyForRetest(project, issue.publicId, owner.name);
    expect(result.ok).toBe(false);
  });

  it("marks ready for retest once a fix is recorded", () => {
    const { project, issue } = makeOpenIssue("Kappa");
    updateIssueStatus(project, issue.publicId, "investigating", owner.name);
    recordIssueFix(project, issue.publicId, "Fixed it.", owner.name);

    const ready = markIssueReadyForRetest(project, issue.publicId, owner.name);
    expect(ready.ok).toBe(true);
    if (!ready.ok) return;
    expect(ready.data.issue.status).toBe("readyForRetest");
  });
});

describe("issue-service — focused rerun and the hard verification rule", () => {
  function makeReadyIssue(projectName: string) {
    const { project, testRun, testCase } = makeProjectWithFailure(projectName);
    const created = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "X", severity: "high" }, owner.name);
    if (!created.ok) throw new Error("setup failed");
    updateIssueStatus(project, created.data.issue.publicId, "investigating", owner.name);
    recordIssueFix(project, created.data.issue.publicId, "Fixed it.", owner.name);
    const ready = markIssueReadyForRetest(project, created.data.issue.publicId, owner.name);
    if (!ready.ok) throw new Error("setup failed");
    return { project, testCase, issue: ready.data.issue };
  }

  it("creates a rerun scoped to the origin test case and tracks it on the issue", () => {
    const { project, testCase, issue } = makeReadyIssue("Lambda");

    const rerun = createFocusedRerun(project, [issue.publicId], { build: "1.0.0-rc.2", environment: "Staging", browser: "Chrome" }, owner.name);
    expect(rerun.ok).toBe(true);
    if (!rerun.ok) return;
    expect(rerun.data.testRun.selectedTestCaseIds).toEqual([testCase.id]);
    expect(rerun.data.testRun.publicId).toMatch(/^RERUN-/);
    expect(rerun.data.issues[0].rerunTestRunId).toBe(rerun.data.testRun.id);
  });

  it("skips issues that aren't ready for retest and fails if none qualify", () => {
    const { project, testRun, testCase } = makeProjectWithFailure("Mu");
    const openIssue = createIssueFromFailedResult(project, testRun.publicId, testCase.publicId, { title: "X", severity: "high" }, owner.name);
    if (!openIssue.ok) throw new Error("setup failed");

    const result = createFocusedRerun(project, [openIssue.data.issue.publicId], { build: "1.0.0", environment: "Staging", browser: "Chrome" }, owner.name);
    expect(result.ok).toBe(false);
  });

  it("verifies the issue when the tracked rerun passes — the hard business rule", () => {
    const { project, testCase, issue } = makeReadyIssue("Nu");
    const rerun = createFocusedRerun(project, [issue.publicId], { build: "1.0.0-rc.2", environment: "Staging", browser: "Chrome" }, owner.name);
    if (!rerun.ok) throw new Error("setup failed");

    const passResult = submitTestResult(rerun.data.project, rerun.data.testRun.publicId, testCase.publicId, { status: "pass" }, owner.name);
    expect(passResult.ok).toBe(true);
    if (!passResult.ok) return;

    const updated = applyRerunResultToIssues(rerun.data.project, passResult.data.testRun, testCase, passResult.data.result);
    expect(updated?.status).toBe("verified");
    expect(updated?.rerunResultId).toBe(passResult.data.result.id);
    expect(updated?.rerunTestRunId).toBeUndefined();

    const detail = getIssueDetail(rerun.data.project, issue.publicId);
    expect(detail?.issue.status).toBe("verified");
  });

  it("reopens the issue when the tracked rerun fails, preserving history", () => {
    const { project, testCase, issue } = makeReadyIssue("Xi");
    const rerun = createFocusedRerun(project, [issue.publicId], { build: "1.0.0-rc.2", environment: "Staging", browser: "Chrome" }, owner.name);
    if (!rerun.ok) throw new Error("setup failed");

    const failResult = submitTestResult(
      rerun.data.project,
      rerun.data.testRun.publicId,
      testCase.publicId,
      { status: "fail", actualResult: "Still broken." },
      owner.name,
    );
    if (!failResult.ok) throw new Error("setup failed");

    const updated = applyRerunResultToIssues(rerun.data.project, failResult.data.testRun, testCase, failResult.data.result);
    expect(updated?.status).toBe("reopened");
    expect(updated?.fixNote).toBe("Fixed it."); // the original fix note is preserved, not erased
  });

  it("does nothing when a result isn't for a tracked rerun", () => {
    const { project, testRun, testCase } = makeProjectWithFailure("Omicron");
    const result = submitTestResult(project, testRun.publicId, testCase.publicId, { status: "pass" }, owner.name);
    if (!result.ok) throw new Error("setup failed");

    const updated = applyRerunResultToIssues(project, result.data.testRun, testCase, result.data.result);
    expect(updated).toBeNull();
  });

  it("never operates on an issue from another project", () => {
    const { issue } = makeReadyIssue("Pi");
    const projectB = makeProject("Rho");

    expect(updateIssueStatus(projectB, issue.publicId, "investigating", owner.name).ok).toBe(false);
    expect(recordIssueFix(projectB, issue.publicId, "note", owner.name).ok).toBe(false);
    expect(markIssueReadyForRetest(projectB, issue.publicId, owner.name).ok).toBe(false);
    expect(createFocusedRerun(projectB, [issue.publicId], { build: "1.0", environment: "Staging", browser: "Chrome" }, owner.name).ok).toBe(false);
    expect(getIssueDetail(projectB, issue.publicId)).toBeNull();
  });

  it("records activity scoped to the project throughout the lifecycle", () => {
    const { project, issue } = makeReadyIssue("Sigma");
    const activity = listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("opened"))).toBe(true);
    expect(activity.some((event) => event.action.includes("recorded a fix"))).toBe(true);
    expect(activity.some((event) => event.action.includes("ready for retest"))).toBe(true);
    expect(issue.status).toBe("readyForRetest");
  });
});
