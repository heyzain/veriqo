import { beforeEach, describe, expect, it } from "vitest";

import { listActivityForProject } from "@/server/repositories/activity-repository";
import { resetTestDb } from "@/test/db";
import { approveFeature, createFeatureFromDiscovery } from "@/server/services/feature-service";
import { createProjectForOwner } from "@/server/services/project-service";
import {
  archiveTestCase,
  createTestCaseFromGeneration,
  type TestCaseGenerationInput,
} from "@/server/services/test-case-service";
import type { PublicUser } from "@/types/auth";

import {
  approveClaudeResult,
  createTestRun,
  getTestRunDetail,
  listTestRunsForProject,
  pauseTestRun,
  rejectClaudeResult,
  startTestRun,
  submitTestResult,
  type CreateTestRunInput,
} from "./test-run-service";

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

function generationInput(featureId: string, overrides: Partial<TestCaseGenerationInput> = {}): TestCaseGenerationInput {
  return {
    featureId,
    title: "Sign in with valid credentials starts a session",
    priority: "high",
    steps: ["Open the sign-in form.", "Enter valid credentials.", "Submit."],
    expectedResult: "The user is signed in.",
    roles: ["Any user"],
    environments: ["Chrome"],
    ...overrides,
  };
}

/** A project with one approved feature and two ready test cases — enough to build a run. */
async function makeProjectWithReadyCases(projectName: string) {
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

  const caseOne = await createTestCaseFromGeneration(approvedFeature.data.project, generationInput(approvedFeature.data.feature.publicId));
  if (!caseOne.ok) throw new Error("setup failed");
  const caseTwo = await createTestCaseFromGeneration(
    caseOne.data.project,
    generationInput(approvedFeature.data.feature.publicId, { title: "Sign in with an invalid password fails", idempotencyKey: "b" }),
  );
  if (!caseTwo.ok) throw new Error("setup failed");

  return { project: caseTwo.data.project, feature: approvedFeature.data.feature, caseOne: caseOne.data.testCase, caseTwo: caseTwo.data.testCase };
}

function createRunInput(overrides: Partial<CreateTestRunInput> = {}): CreateTestRunInput {
  return {
    name: "Release Candidate 1",
    build: "1.0.0-rc.1",
    environment: "Staging",
    browser: "Chrome",
    testCaseIds: [],
    ...overrides,
  };
}

describe("test-run-service — creating a run", () => {
  it("creates a planned run with a notRun result pre-created for every selected case", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Alpha");

    const result = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.testRun.status).toBe("planned");
    expect(result.data.testRun.selectedTestCaseIds).toEqual([caseOne.id, caseTwo.id]);

    const detail = await getTestRunDetail(result.data.project, result.data.testRun.publicId);
    expect(detail?.items).toHaveLength(2);
    expect(detail?.items.every((item) => item.result.status === "notRun")).toBe(true);
    expect(detail?.progress.total).toBe(2);
    expect(detail?.progress.notRun).toBe(2);
  });

  it("advances the project to setup step 6 on the first created run, and no further on later ones", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Beta");
    expect(project.setupStepsCompleted).toBeLessThan(6);

    const first = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.project.setupStepsCompleted).toBe(6);

    const second = await createTestRun(first.data.project, createRunInput({ name: "Run 2", testCaseIds: [caseOne.publicId] }), owner.name);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.project.setupStepsCompleted).toBe(6);
  });

  it("rejects an unknown test case", async () => {
    const { project } = await makeProjectWithReadyCases("Gamma");
    const result = await createTestRun(project, createRunInput({ testCaseIds: ["TC-99"] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("refuses to add an archived test case to a run", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Delta");
    await archiveTestCase(project, caseOne.publicId, owner.name);

    const result = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("requires at least one test case", async () => {
    const { project } = await makeProjectWithReadyCases("Epsilon");
    const result = await createTestRun(project, createRunInput({ testCaseIds: [] }), owner.name);
    expect(result.ok).toBe(false);
  });

  it("never leaks a run across projects", async () => {
    const { project: projectA, caseOne } = await makeProjectWithReadyCases("Zeta");
    const projectB = await makeProject("Eta");
    await createTestRun(projectA, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);

    expect(await listTestRunsForProject(projectA)).toHaveLength(1);
    expect(await listTestRunsForProject(projectB)).toHaveLength(0);
  });

  it("records activity scoped to the project", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Theta");
    await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);

    const activity = await listActivityForProject(project.id);
    expect(activity.some((event) => event.action.includes("created") && event.action.includes("test case"))).toBe(true);
  });
});

describe("test-run-service — recording results", () => {
  it("refuses a fail/partial/blocked result with no explanation", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Iota");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "fail" }, owner.name);
    expect(result.ok).toBe(false);
  });

  it("accepts a pass with no notes", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Kappa");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(true);
  });

  it("starts a planned run on the first recorded result", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Lambda");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    expect(run.data.testRun.status).toBe("planned");

    const result = await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.testRun.status).toBe("inProgress");
    expect(result.data.testRun.startedAt).toBeDefined();
  });

  it("auto-completes the run once every case has a result — completed when every result passes", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Mu");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    const final = await submitTestResult(run.data.project, run.data.testRun.publicId, caseTwo.publicId, { status: "pass" }, owner.name);
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    expect(final.data.testRun.status).toBe("completed");
    expect(final.data.testRun.completedAt).toBeDefined();
  });

  it("auto-completes to needsAttention when any result fails", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Nu");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);
    const final = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseTwo.publicId,
      { status: "fail", actualResult: "Unexpected error shown." },
      owner.name,
    );
    expect(final.ok).toBe(true);
    if (!final.ok) return;
    expect(final.data.testRun.status).toBe("needsAttention");
  });

  it("rejects a result for a test case that isn't part of the run", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Xi");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = await submitTestResult(run.data.project, run.data.testRun.publicId, caseTwo.publicId, { status: "pass" }, owner.name);
    expect(result.ok).toBe(false);
  });
});

describe("test-run-service — lifecycle", () => {
  it("pauses an in-progress run and resumes it back to inProgress", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Omicron");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    const started = await startTestRun(run.data.project, run.data.testRun.publicId, owner.name);
    expect(started.ok).toBe(true);

    const paused = await pauseTestRun(project, run.data.testRun.publicId, owner.name);
    expect(paused.ok).toBe(true);
    if (!paused.ok) return;
    expect(paused.data.testRun.status).toBe("paused");

    const resumed = await startTestRun(project, run.data.testRun.publicId, owner.name);
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.data.testRun.status).toBe("inProgress");
  });

  it("refuses to pause a run that isn't in progress", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Pi");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const result = await pauseTestRun(project, run.data.testRun.publicId, owner.name);
    expect(result.ok).toBe(false);
  });

  it("never operates on a run from another project", async () => {
    const { project: projectA, caseOne } = await makeProjectWithReadyCases("Rho");
    const projectB = await makeProject("Sigma");
    const run = await createTestRun(projectA, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    expect((await startTestRun(projectB, run.data.testRun.publicId, owner.name)).ok).toBe(false);
    expect((await pauseTestRun(projectB, run.data.testRun.publicId, owner.name)).ok).toBe(false);
    expect(
      (await submitTestResult(projectB, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name)).ok,
    ).toBe(false);
    expect(await getTestRunDetail(projectB, run.data.testRun.publicId)).toBeNull();
  });
});

describe("test-run-service — Claude-assisted execution (Phase 8)", () => {
  it("defaults executionMode to manual, and honors claudeAssisted when requested", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Tau");
    const manual = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    expect(manual.ok && manual.data.testRun.executionMode).toBe("manual");

    const assisted = await createTestRun(
      project,
      createRunInput({ name: "Assisted", testCaseIds: [caseOne.publicId], executionMode: "claudeAssisted" }),
      owner.name,
    );
    expect(assisted.ok && assisted.data.testRun.executionMode).toBe("claudeAssisted");
  });

  it("is idempotent: a retried submit_test_result with the same key never reprocesses", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Upsilon");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const first = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "pass", idempotencyKey: "claude-call-1" },
      "Claude",
      "claude",
    );
    const second = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "fail", actualResult: "different outcome", idempotencyKey: "claude-call-1" },
      "Claude",
      "claude",
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    // The replay returns the original result unchanged, not the different second payload.
    expect(second.data.result.status).toBe("pass");
    expect(second.data.result.id).toBe(first.data.result.id);

    const activity = await listActivityForProject(project.id);
    expect(activity.filter((event) => event.action.includes("recorded pass"))).toHaveLength(1);
  });

  it("a different idempotencyKey on the same case is treated as a genuine new submission", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Phi");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass", idempotencyKey: "a" }, "Claude", "claude");
    const second = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "fail", actualResult: "now it fails", idempotencyKey: "b" },
      "Claude",
      "claude",
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.data.result.status).toBe("fail");
  });

  it("records needsHumanReview only for a Claude submission that sets it — a human submission always clears it", async () => {
    const { project, caseOne, caseTwo } = await makeProjectWithReadyCases("Chi");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId, caseTwo.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");

    const flagged = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "partial", actualResult: "Ambiguous.", needsHumanReview: true },
      "Claude",
      "claude",
    );
    expect(flagged.ok && flagged.data.result.needsHumanReview).toBe(true);

    const humanResult = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseTwo.publicId,
      // A human submission ignores needsHumanReview even if somehow passed.
      { status: "pass" },
      owner.name,
    );
    expect(humanResult.ok && humanResult.data.result.needsHumanReview).toBe(false);
  });

  it("Correct (a human re-submission) clears a pending review flag", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Psi");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "partial", actualResult: "Unsure.", needsHumanReview: true },
      "Claude",
      "claude",
    );

    const corrected = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "pass" },
      owner.name,
    );
    expect(corrected.ok).toBe(true);
    if (!corrected.ok) return;
    expect(corrected.data.result.needsHumanReview).toBe(false);
    expect(corrected.data.result.recordedBySource).toBe("human");
  });

  it("Approve clears the flag and stamps a reviewer without touching the recorded content", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Omega");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "pass", needsHumanReview: true },
      "Claude",
      "claude",
    );

    const approved = await approveClaudeResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, owner.name);
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.data.result.needsHumanReview).toBe(false);
    expect(approved.data.result.recordedBySource).toBe("claude"); // still Claude's content — only reviewed, not rewritten
    expect(approved.data.result.reviewedByName).toBe(owner.name);
  });

  it("refuses to approve a result that isn't from Claude", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Alpha2");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    await submitTestResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, { status: "pass" }, owner.name);

    const result = await approveClaudeResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, owner.name);
    expect(result.ok).toBe(false);
  });

  it("Reject reverts the result to notRun and reopens a completed run", async () => {
    const { project, caseOne } = await makeProjectWithReadyCases("Beta2");
    const run = await createTestRun(project, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    const submitted = await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "pass", needsHumanReview: true },
      "Claude",
      "claude",
    );
    expect(submitted.ok && submitted.data.testRun.status).toBe("completed");

    const rejected = await rejectClaudeResult(run.data.project, run.data.testRun.publicId, caseOne.publicId, owner.name);
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.data.result.status).toBe("notRun");
    expect(rejected.data.result.needsHumanReview).toBe(false);
    expect(rejected.data.testRun.status).toBe("inProgress");
    expect(rejected.data.testRun.completedAt).toBeUndefined();
  });

  it("never reviews a result across projects", async () => {
    const { project: projectA, caseOne } = await makeProjectWithReadyCases("Gamma2");
    const projectB = await makeProject("Delta2");
    const run = await createTestRun(projectA, createRunInput({ testCaseIds: [caseOne.publicId] }), owner.name);
    if (!run.ok) throw new Error("setup failed");
    await submitTestResult(
      run.data.project,
      run.data.testRun.publicId,
      caseOne.publicId,
      { status: "pass", needsHumanReview: true },
      "Claude",
      "claude",
    );

    expect((await approveClaudeResult(projectB, run.data.testRun.publicId, caseOne.publicId, owner.name)).ok).toBe(false);
    expect((await rejectClaudeResult(projectB, run.data.testRun.publicId, caseOne.publicId, owner.name)).ok).toBe(false);
  });
});
