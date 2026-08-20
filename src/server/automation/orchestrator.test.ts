import { beforeEach, describe, expect, it } from "vitest";

import { resetTestDb } from "@/test/db";
import { approveFeature, createFeatureFromDiscovery } from "@/server/services/feature-service";
import {
  createFocusedRerun,
  createIssueFromFailedResult,
  getIssueDetail,
  markIssueReadyForRetest,
  updateIssueStatus,
  recordIssueFix,
} from "@/server/services/issue-service";
import { createProjectForOwner } from "@/server/services/project-service";
import { createTestCaseFromGeneration } from "@/server/services/test-case-service";
import { createTestRun, getTestRunDetail, submitTestResult } from "@/server/services/test-run-service";
import type { PublicUser } from "@/types/auth";
import type { AutomationExecutionOutcome, AutomationExecutor } from "@/server/automation/types";

import { buildAutomationExecutionContext, startAutomationExecution } from "./orchestrator";

const owner: PublicUser = {
  id: "user-owner",
  name: "Priya",
  email: "owner@example.com",
  emailVerified: true,
  createdAt: new Date().toISOString(),
};

beforeEach(resetTestDb);

function makeProject(name: string) {
  return createProjectForOwner(
    { name, description: `Test project ${name}.`, appUrl: "https://example.com", environment: "development" },
    owner,
  );
}

/** A project with one approved feature and one ready test case, plus a `veriqoAutomated` run selecting it. */
async function makeProjectWithAutomatedRun(projectName: string) {
  const project = await makeProject(projectName);
  const featureResult = await createFeatureFromDiscovery(project, {
    name: "Authentication",
    description: "Sign in and sign up.",
    risk: "high",
    acceptanceCriteria: ["A user can sign in with valid credentials."],
    roles: ["Any user"],
    dependencies: [],
    sourceReferences: [{ path: "src/auth.ts" }],
  });
  if (!featureResult.ok) throw new Error("setup failed");
  const approvedFeature = await approveFeature(featureResult.data.project, featureResult.data.feature.publicId, owner.name);
  if (!approvedFeature.ok) throw new Error("setup failed");

  const caseResult = await createTestCaseFromGeneration(approvedFeature.data.project, {
    featureId: approvedFeature.data.feature.publicId,
    title: "Sign in with valid credentials starts a session",
    priority: "high",
    steps: ["Open the sign-in form.", "Enter valid credentials.", "Submit."],
    expectedResult: "The user is signed in.",
    roles: ["Any user"],
    environments: ["Chrome"],
  });
  if (!caseResult.ok) throw new Error("setup failed");
  const testCase = caseResult.data.testCase;

  const runResult = await createTestRun(
    caseResult.data.project,
    {
      name: "Automated pass",
      build: "1.0.0-rc.1",
      environment: "Staging",
      browser: "Chrome (headless)",
      testCaseIds: [testCase.publicId],
      executionMode: "veriqoAutomated",
    },
    owner.name,
  );
  if (!runResult.ok) throw new Error("setup failed");

  return { project: runResult.data.project, testCase, testRun: runResult.data.testRun };
}

const passingExecutor: AutomationExecutor = {
  async execute(): Promise<AutomationExecutionOutcome> {
    return { status: "pass", actualResult: "Session started as expected.", durationMs: 42 };
  },
};

function failingExecutor(actualResult: string): AutomationExecutor {
  return {
    async execute(): Promise<AutomationExecutionOutcome> {
      return { status: "fail", actualResult };
    },
  };
}

describe("automation orchestrator — execution context", () => {
  it("builds a context scoped to the run's project", async () => {
    const { project, testCase, testRun } = await makeProjectWithAutomatedRun("Alpha");
    const result = await buildAutomationExecutionContext(project, testRun.publicId, testCase.publicId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual({
      projectId: project.id,
      featureId: testCase.featureId,
      testCaseId: testCase.id,
      testRunId: testRun.id,
    });
  });

  it("refuses a run that isn't veriqoAutomated — execution-source safety", async () => {
    const project = await makeProject("Beta");
    const featureResult = await createFeatureFromDiscovery(project, {
      name: "F",
      description: "d",
      risk: "low",
      acceptanceCriteria: ["x"],
      roles: [],
      dependencies: [],
      sourceReferences: [],
    });
    if (!featureResult.ok) throw new Error("setup failed");
    const approved = await approveFeature(featureResult.data.project, featureResult.data.feature.publicId, owner.name);
    if (!approved.ok) throw new Error("setup failed");
    const caseResult = await createTestCaseFromGeneration(approved.data.project, {
      featureId: approved.data.feature.publicId,
      title: "Some case",
      priority: "low",
      steps: ["Do a thing."],
      expectedResult: "It works.",
      roles: [],
      environments: [],
    });
    if (!caseResult.ok) throw new Error("setup failed");

    const manualRun = await createTestRun(
      caseResult.data.project,
      { name: "Manual run", build: "1.0", environment: "Staging", browser: "Chrome", testCaseIds: [caseResult.data.testCase.publicId] },
      owner.name,
    );
    if (!manualRun.ok) throw new Error("setup failed");

    const result = await buildAutomationExecutionContext(manualRun.data.project, manualRun.data.testRun.publicId, caseResult.data.testCase.publicId);
    expect(result.ok).toBe(false);
  });

  it("never crosses project boundaries", async () => {
    const { testCase, testRun } = await makeProjectWithAutomatedRun("Gamma");
    const projectB = await makeProject("Delta");

    const result = await buildAutomationExecutionContext(projectB, testRun.publicId, testCase.publicId);
    expect(result.ok).toBe(false);
  });

  it("refuses a test case that isn't part of the run", async () => {
    const { project, testRun } = await makeProjectWithAutomatedRun("Epsilon");
    const result = await buildAutomationExecutionContext(project, testRun.publicId, "TC-999");
    expect(result.ok).toBe(false);
  });
});

describe("automation orchestrator — startAutomationExecution", () => {
  it("Phase 0 has no execution engine: the default executor refuses and nothing is mutated", async () => {
    const { project, testCase, testRun } = await makeProjectWithAutomatedRun("Zeta");

    const result = await startAutomationExecution(project, testRun.publicId, testCase.publicId);
    expect(result.ok).toBe(false);

    const detail = await getTestRunDetail(project, testRun.publicId);
    expect(detail?.testRun.status).toBe("planned");
    expect(detail?.items[0]?.result.status).toBe("notRun");
  });

  it("records a passing outcome through the real result-submission path, attributed to automation (not claude)", async () => {
    const { project, testCase, testRun } = await makeProjectWithAutomatedRun("Eta");

    const result = await startAutomationExecution(project, testRun.publicId, testCase.publicId, passingExecutor);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.result.status).toBe("pass");
    expect(result.data.result.recordedBySource).toBe("automation");
    expect(result.data.result.recordedByName).toBe("Veriqo Automation");
    expect(result.data.testRun.status).toBe("completed");
  });

  it("propagates the executor's failure result the same way a human/Claude fail would", async () => {
    const { project, testCase, testRun } = await makeProjectWithAutomatedRun("Theta");

    const result = await startAutomationExecution(project, testRun.publicId, testCase.publicId, failingExecutor("Unexpected error banner."));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.result.status).toBe("fail");
    expect(result.data.testRun.status).toBe("needsAttention");
  });

  it("never operates on a run from another project", async () => {
    const { testCase, testRun } = await makeProjectWithAutomatedRun("Iota");
    const projectB = await makeProject("Kappa");

    const result = await startAutomationExecution(projectB, testRun.publicId, testCase.publicId, passingExecutor);
    expect(result.ok).toBe(false);
  });
});

describe("automation orchestrator — rerun-gated verification still holds", () => {
  /** An issue that's Ready for retest, with a `veriqoAutomated` focused rerun tracking it. */
  async function makeReadyIssueWithAutomatedRerun(projectName: string) {
    const project = await makeProject(projectName);
    const featureResult = await createFeatureFromDiscovery(project, {
      name: "Private Vault",
      description: "PIN-locked vault.",
      risk: "high",
      acceptanceCriteria: ["The vault relocks after the session ends."],
      roles: ["Vault owner"],
      dependencies: [],
      sourceReferences: [{ path: "src/vault.ts" }],
    });
    if (!featureResult.ok) throw new Error("setup failed");
    const approvedFeature = await approveFeature(featureResult.data.project, featureResult.data.feature.publicId, owner.name);
    if (!approvedFeature.ok) throw new Error("setup failed");

    const caseResult = await createTestCaseFromGeneration(approvedFeature.data.project, {
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

    const originRun = await createTestRun(
      caseResult.data.project,
      { name: "RC1", build: "1.0.0-rc.1", environment: "Staging", browser: "Chrome", testCaseIds: [testCase.publicId] },
      owner.name,
    );
    if (!originRun.ok) throw new Error("setup failed");
    const failResult = await submitTestResult(
      originRun.data.project,
      originRun.data.testRun.publicId,
      testCase.publicId,
      { status: "fail", actualResult: "Vault stayed unlocked after a new session started." },
      owner.name,
    );
    if (!failResult.ok) throw new Error("setup failed");

    const created = await createIssueFromFailedResult(
      originRun.data.project,
      originRun.data.testRun.publicId,
      testCase.publicId,
      { title: "Vault fails to relock", severity: "high" },
      owner.name,
    );
    if (!created.ok) throw new Error("setup failed");
    await updateIssueStatus(originRun.data.project, created.data.issue.publicId, "investigating", owner.name);
    await recordIssueFix(originRun.data.project, created.data.issue.publicId, "Fixed the relock timer.", owner.name);
    const ready = await markIssueReadyForRetest(originRun.data.project, created.data.issue.publicId, owner.name);
    if (!ready.ok) throw new Error("setup failed");

    const rerun = await createFocusedRerun(
      originRun.data.project,
      [ready.data.issue.publicId],
      { build: "1.0.0-rc.2", environment: "Staging", browser: "Chrome", executionMode: "veriqoAutomated" },
      owner.name,
    );
    if (!rerun.ok) throw new Error("setup failed");
    expect(rerun.data.testRun.executionMode).toBe("veriqoAutomated");

    return { project: rerun.data.project, testCase, issue: ready.data.issue, rerun: rerun.data.testRun };
  }

  it("a passing automated rerun verifies the issue — the hard business rule still applies", async () => {
    const { project, testCase, issue, rerun } = await makeReadyIssueWithAutomatedRerun("Lambda");

    const result = await startAutomationExecution(project, rerun.publicId, testCase.publicId, passingExecutor);
    expect(result.ok).toBe(true);

    const detail = await getIssueDetail(project, issue.publicId);
    expect(detail?.issue.status).toBe("verified");
    expect(detail?.issue.rerunResultId).toBe(result.ok ? result.data.result.id : undefined);
  });

  it("a failing automated rerun reopens the issue instead of verifying it", async () => {
    const { project, testCase, issue, rerun } = await makeReadyIssueWithAutomatedRerun("Mu");

    await startAutomationExecution(project, rerun.publicId, testCase.publicId, failingExecutor("Still unlocked."));

    const detail = await getIssueDetail(project, issue.publicId);
    expect(detail?.issue.status).toBe("reopened");
  });

  it("the not-implemented default executor never verifies an issue by itself", async () => {
    const { project, testCase, issue, rerun } = await makeReadyIssueWithAutomatedRerun("Nu");

    const result = await startAutomationExecution(project, rerun.publicId, testCase.publicId);
    expect(result.ok).toBe(false);

    const detail = await getIssueDetail(project, issue.publicId);
    expect(detail?.issue.status).toBe("readyForRetest");
  });
});
